// 貼上 IG / Threads 連結 → 讀貼文文字與封面 → AI 整理欄位 → Google 找候選店家
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const maxDuration = 45;

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

// 每日上限（台灣時間每天 0 點重置）
const LIMIT_AI = 30;
const LIMIT_SEARCH = 50;

const ALLOWED = ['instagram.com', 'www.instagram.com', 'threads.com', 'www.threads.com', 'threads.net', 'www.threads.net'];

async function bump(kind: string, limit: number, n = 1) {
  const { data, error } = await sb.rpc('bump_usage', { p_kind: kind, p_limit: limit, p_n: n });
  if (error) { console.error('bump_usage error', error); return false; }
  return data === true;
}

function decodeEntities(s: string) {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
}

function readOg(html: string, key: string) {
  const m =
    html.match(new RegExp(`<meta[^>]+property=["']${key}["'][^>]+content=["']([^"']*)["']`, 'i')) ||
    html.match(new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+property=["']${key}["']`, 'i'));
  return m ? decodeEntities(m[1]) : '';
}

// IG 擋住時會回傳登入頁：沒有貼文文字，封面是 IG logo
function looksBlocked(title: string, desc: string, image: string) {
  if (!desc.trim()) return true;
  if (/log ?in|sign ?up|create an account|登入|註冊/i.test(desc) && desc.length < 200) return true;
  if (/static\.cdninstagram\.com\/rsrc|instagram\.com\/static/i.test(image)) return true;
  return false;
}

async function readPost(url: string) {
  const tries: Record<string, string>[] = [
    { 'User-Agent': 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)' },
    {},
    { 'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' },
  ];
  for (const headers of tries) {
    try {
      const res = await fetch(url, { headers, cache: 'no-store', redirect: 'follow', signal: AbortSignal.timeout(10000) });
      const html = await res.text();
      const title = readOg(html, 'og:title');
      const desc = readOg(html, 'og:description');
      const image = readOg(html, 'og:image');
      if (!looksBlocked(title, desc, image)) return { title, desc, image };
    } catch (e) { console.error('readPost', e); }
  }
  return null;
}

async function saveCover(imageUrl: string) {
  if (!imageUrl) return '';
  try {
    const res = await fetch(imageUrl, { cache: 'no-store', signal: AbortSignal.timeout(12000) });
    if (!res.ok) return '';
    const type = res.headers.get('content-type') || 'image/jpeg';
    const buf = Buffer.from(await res.arrayBuffer());
    const ext = type.includes('png') ? 'png' : type.includes('webp') ? 'webp' : 'jpg';
    const path = `places/post_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await sb.storage.from('photos').upload(path, buf, { contentType: type, upsert: true });
    if (error) { console.error('saveCover upload', error); return ''; }
    return sb.storage.from('photos').getPublicUrl(path).data.publicUrl;
  } catch (e) { console.error('saveCover', e); return ''; }
}

function langFor(country: string) {
  if (country === '韓國') return 'ko';
  if (country === '日本') return 'ja';
  if (country === '中國') return 'zh-CN';
  if (country === '台灣' || country === '香港' || country === '澳門') return 'zh-TW';
  return 'en';
}

async function askClaude(post: { title: string; desc: string }, ctx: any) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error('缺少 ANTHROPIC_API_KEY');
  const system = `你是旅遊美食收藏助理。使用者給你一則 IG 或 Threads 貼文，請抽出貼文介紹的「一間」店家資料（有多間時取最主要那間）。
只回傳一個 JSON 物件，不要任何其他文字、不要 Markdown。欄位：
{
 "is_place": true/false（貼文是否在介紹實體店家或景點）,
 "name": "店名，照貼文常用寫法，可中外文並列",
 "map_query": "店名的當地語言寫法（韓國用韓文、日本用日文），含分店名；不確定就空字串",
 "search_query": "在 Google 地圖搜尋這間店最可能找到的字串：當地語言店名 + 分店或地區",
 "country": "必須是 countries 清單中的一個，無法判斷就空字串",
 "city": "優先使用 cities 清單中的名稱，無法判斷就空字串",
 "types": ["只能從 types 清單挑，0 到 2 個"],
 "recommendations": ["推薦品項，每項一行，有價格就寫在後面，例：鹽麵包 ₩3,500"],
 "note": "一句 20 字內的繁體中文收藏原因"
}
所有說明文字用繁體中文。`;
  const user = `countries: ${JSON.stringify(ctx.countries)}
cities: ${JSON.stringify(ctx.cities)}
types: ${JSON.stringify(ctx.types)}
使用者已選的國家: ${ctx.country || '（未選）'}

貼文標題: ${post.title}
貼文內容: ${post.desc}`;
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 800, system, messages: [{ role: 'user', content: user }] }),
    signal: AbortSignal.timeout(25000),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || 'AI 呼叫失敗');
  const text = (data.content || []).map((c: any) => c.text || '').join('').replace(/```json|```/g, '').trim();
  const start = text.indexOf('{'), end = text.lastIndexOf('}');
  if (start < 0 || end <= start) throw new Error('AI 沒有回傳可用的資料');
  try { return JSON.parse(text.slice(start, end + 1)); }
  catch { throw new Error('AI 回傳格式錯誤'); }
}

async function searchGoogle(query: string, country: string) {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key || !query) return [];
  const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'X-Goog-Api-Key': key,
      'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress',
    },
    body: JSON.stringify({ textQuery: query, languageCode: langFor(country), pageSize: 3 }),
    signal: AbortSignal.timeout(12000),
  });
  const data = await res.json();
  if (!res.ok) { console.error('searchText', data); return []; }
  return (data.places || []).map((p: any) => ({ id: p.id, name: p.displayName?.text || '', address: p.formattedAddress || '' }));
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const url = String(body.url || '').trim();
  let host = '';
  try { host = new URL(url).hostname.toLowerCase(); } catch {}
  if (!ALLOWED.includes(host)) return NextResponse.json({ error: '只支援 Instagram / Threads 連結' }, { status: 400 });

  const post = await readPost(url);
  if (!post) return NextResponse.json({ error: 'IG 暫時擋住讀取，等幾分鐘再按重試；私人帳號的貼文也讀不到' }, { status: 422 });

  const cover = await saveCover(post.image);

  if (!(await bump('ai', LIMIT_AI))) {
    return NextResponse.json({ cover, caption: post.desc, error: '今日 AI 整理次數已用完，明天再試' }, { status: 429 });
  }
  let fields: any = {};
  try {
    fields = await askClaude(post, {
      countries: body.countries || [], cities: body.cities || {}, types: body.types || [], country: body.country || '',
    });
  } catch (e: any) {
    return NextResponse.json({ cover, caption: post.desc, error: 'AI 整理失敗：' + (e?.message || e) }, { status: 502 });
  }

  const country = body.country || fields.country || '';
  let candidates: any[] = [];
  let searchNote = '';
  if (fields.is_place !== false) {
    if (await bump('search', LIMIT_SEARCH)) {
      candidates = await searchGoogle(fields.search_query || fields.map_query || fields.name, country);
    } else searchNote = '今日 Google 搜尋次數已用完，地址請手動填寫';
  }

  return NextResponse.json({ cover, caption: post.desc, fields, candidates, searchNote });
}
