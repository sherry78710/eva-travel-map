// 貼上 IG / Threads 連結 → 讀貼文文字與封面 → AI 整理欄位 → Google 找候選店家
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const maxDuration = 60;

export const dynamic = 'force-dynamic';

// 關閉 Next.js 的請求快取，每次都真的去 Supabase 計數
const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
  { global: { fetch: (input: any, init?: any) => fetch(input, { ...init, cache: 'no-store' }) } }
);

// 回傳 'ok' / 'limit' / 錯誤訊息
async function bump(kind: string, limit: number, n = 1): Promise<string> {
  const { data, error } = await sb.rpc('bump_usage', { p_kind: kind, p_limit: limit, p_n: n });
  if (error) { console.error('bump_usage error', kind, error); return '計數功能出錯：' + (error.message || JSON.stringify(error)); }
  return data === true ? 'ok' : 'limit';
}
function bumpFail(r: string, what: string) {
  return r === 'limit'
    ? NextResponse.json({ error: `今日${what}次數已用完，明天再試` }, { status: 429 })
    : NextResponse.json({ error: r }, { status: 500 });
}

// 每日上限（台灣時間每天 0 點重置）
const LIMIT_AI = 30;
const LIMIT_SEARCH = 50;

const ALLOWED = ['instagram.com', 'www.instagram.com', 'threads.com', 'www.threads.com', 'threads.net', 'www.threads.net'];

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
  const system = `你是旅遊美食收藏助理。使用者給你一則 IG 或 Threads 貼文，請找出貼文介紹的「一間」店家（有多間時取最主要那間）。
步驟：
1. 先讀貼文，推測店名、城市。
2. 一定要用 web_search 上網搜尋（例如「店名 城市」），確認正式店名、分店、所在地區，並找出網路上常被推薦的必點品項。貼文資訊很少時，用貼文裡的線索（暱稱、菜色、地區）去找出真正的店。
3. 最後只輸出一個 JSON 物件，不要任何其他文字、不要 Markdown：
{
 "is_place": true/false（是否在介紹實體店家或景點）,
 "name": "店名，用正式名稱，可中外文並列",
 "map_query": "店名的當地語言寫法（韓國用韓文、日本用日文），含分店名；不確定就空字串",
 "search_query": "在 Google 地圖最可能找到這間店的字串：當地語言正式店名 + 分店或地區",
 "country": "必須是 countries 清單中的一個，無法判斷就空字串",
 "city": "優先使用 cities 清單中的名稱，無法判斷就空字串",
 "types": ["只能從 types 清單挑，0 到 2 個"],
 "recommendations": ["貼文裡提到的品項，有價格就寫在後面，例：鹽麵包 ₩3,500"],
 "recommendations_web": ["網路上常被推薦、但貼文沒提到的必點，最多 4 項，不要跟上面重複"],
 "note": "一句 20 字內的繁體中文收藏原因，根據貼文內容寫"
}
所有說明文字用繁體中文。查不到就照貼文內容填，不要編造。`;
  const user = `countries: ${JSON.stringify(ctx.countries)}
cities: ${JSON.stringify(ctx.cities)}
types: ${JSON.stringify(ctx.types)}
使用者已選的國家: ${ctx.country || '（未選）'}

貼文標題: ${post.title}
貼文內容: ${post.desc}`;
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001', max_tokens: 1500, system,
      tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 3 }],
      messages: [{ role: 'user', content: user }],
    }),
    signal: AbortSignal.timeout(45000),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || 'AI 呼叫失敗');
  // 只看最後一次搜尋結果之後的文字，JSON 在那裡
  const blocks: any[] = data.content || [];
  let lastTool = -1;
  blocks.forEach((b, i) => { if (b.type === 'web_search_tool_result' || b.type === 'server_tool_use') lastTool = i; });
  const text = blocks.slice(lastTool + 1).map((c: any) => c.type === 'text' ? c.text : '').join('').replace(/```json|```/g, '').trim();
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

  const rAi = await bump('ai', LIMIT_AI);
  if (rAi !== 'ok') {
    return NextResponse.json({ cover, caption: post.desc, error: rAi === 'limit' ? '今日 AI 整理次數已用完，明天再試' : rAi }, { status: rAi === 'limit' ? 429 : 500 });
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
    const rS = await bump('search', LIMIT_SEARCH);
    if (rS === 'ok') {
      candidates = await searchGoogle(fields.search_query || fields.map_query || fields.name, country);
      const retry = [fields.name, fields.city].filter(Boolean).join(' ');
      if (!candidates.length && retry && retry !== fields.search_query && (await bump('search', LIMIT_SEARCH)) === 'ok') {
        candidates = await searchGoogle(retry, country);
      }
    } else searchNote = rS === 'limit' ? '今日 Google 搜尋次數已用完，地址請手動填寫' : rS;
  }

  return NextResponse.json({ cover, caption: post.desc, fields, candidates, searchNote });
}
