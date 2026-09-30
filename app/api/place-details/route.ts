// 使用者確認「用這間」後，用 Google 店家編號查地址、營業時間、商圈，並整理「網友怎麼說」
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const maxDuration = 30;

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
const LIMIT_PLACE = 100;
const LIMIT_SUMMARY = 50; // 「網友怎麼說」整理，獨立計數，不佔 AI 30 次

function langFor(country: string) {
  if (country === '韓國') return 'ko';
  if (country === '日本') return 'ja';
  if (country === '中國') return 'zh-CN';
  if (country === '台灣' || country === '香港' || country === '澳門') return 'zh-TW';
  return 'en';
}

// 從 Google 地址元件挑出「商圈」候選（AI 沒判斷出商圈時才用）
function pickArea(components: any[], country: string) {
  const find = (t: string) => (components || []).find((c: any) => (c.types || []).includes(t))?.longText || '';
  let v = find('neighborhood');
  if (!v && country === '韓國') v = find('sublocality_level_2');   // 韓國：洞
  if (!v) v = find('sublocality_level_1');                           // 日本：町名（例：白金）
  return v.replace(/[0-9０-９一二三四五六七八九十]+丁目.*$/, '').replace(/\s+/g, ' ').trim();
}

type HL = { good: { text: string; src: string[] }[]; caution: { text: string; src: string[] }[] };

// 把 Google 評論 + 先前 AI 從貼文／網路整理的重點，合併成「網友怎麼說」
async function summarize(name: string, reviews: any[], hints: HL | null): Promise<HL | null> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;
  const revText = reviews.map((r: any, i: number) => `${i + 1}. （${r.rating || '?'} 星）${(r.text?.text || r.originalText?.text || '').slice(0, 600)}`).join('\n');
  const system = `你是整理店家評價的助理。根據 Google 評論和先前整理的重點，整理出「網友怎麼說」。
只輸出一個 JSON 物件，不要任何其他文字、不要 Markdown：
{"good":[{"text":"20 字內繁中","src":["Google","網路","貼文"]}],"caution":[{"text":"20 字內繁中","src":["Google"]}]}
規則：
- good 3 到 5 條、caution 0 到 3 條，只寫多個人都提到的共通點；只有一個人講的不要寫。
- 意思相同的合併成一條，src 列出所有提到的來源（只能用 Google、網路、貼文）。
- caution 只寫營業時間看不出來的事（排隊、只收現金、要預約、限時用餐、座位少、價位偏高、服務等）。不要寫營業時間、公休日、地址。
- 用繁體中文，不要編造。`;
  const user = `店名：${name}
先前整理的重點：${JSON.stringify(hints || { good: [], caution: [] })}
Google 評論：
${revText || '（沒有）'}`;
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 800, system, messages: [{ role: 'user', content: user }] }),
      signal: AbortSignal.timeout(20000),
    });
    const data = await res.json();
    if (!res.ok) { console.error('summarize', data); return null; }
    const text = (data.content || []).map((c: any) => c.type === 'text' ? c.text : '').join('').replace(/```json|```/g, '').trim();
    const s = text.indexOf('{'), e = text.lastIndexOf('}');
    if (s < 0 || e <= s) return null;
    const j = JSON.parse(text.slice(s, e + 1));
    return { good: Array.isArray(j.good) ? j.good : [], caution: Array.isArray(j.caution) ? j.caution : [] };
  } catch (err) { console.error('summarize', err); return null; }
}

async function lookup(id: string, country: string, name: string, hints: HL | null, withSummary: boolean) {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!/^[A-Za-z0-9_-]+$/.test(id) || !key) return NextResponse.json({ error: '參數錯誤' }, { status: 400 });

  const r = await bump('place', LIMIT_PLACE, 2);
  if (r !== 'ok') return bumpFail(r, ' Google 查詢');

  // 地址用當地語言（地址解析與 Naver 地圖用得到），營業時間、評論、商圈用繁中
  const zhMask = withSummary ? 'id,regularOpeningHours,reviews,addressComponents' : 'id,regularOpeningHours,addressComponents';
  const [addrRes, zhRes] = await Promise.all([
    fetch(`https://places.googleapis.com/v1/places/${id}?languageCode=${langFor(country)}`, {
      headers: { 'X-Goog-Api-Key': key, 'X-Goog-FieldMask': 'id,formattedAddress' }, cache: 'no-store',
    }),
    fetch(`https://places.googleapis.com/v1/places/${id}?languageCode=zh-TW`, {
      headers: { 'X-Goog-Api-Key': key, 'X-Goog-FieldMask': zhMask }, cache: 'no-store',
    }),
  ]);
  const a = await addrRes.json();
  const h = await zhRes.json();
  if (!addrRes.ok) { console.error('place-details', a); }
  if (!addrRes.ok) return NextResponse.json({ error: a?.error?.message || '查詢失敗' }, { status: 502 });
  if (!zhRes.ok) console.error('place-details zh', h);

  const hours: string[] = h?.regularOpeningHours?.weekdayDescriptions || [];
  const area = pickArea(h?.addressComponents || [], country);

  let highlights: HL | null = null;
  let summaryNote = '';
  if (withSummary) {
    const reviews: any[] = h?.reviews || [];
    const hasHints = !!(hints && ((hints.good || []).length || (hints.caution || []).length));
    if (reviews.length || hasHints) {
      const rs = await bump('summary', LIMIT_SUMMARY);
      if (rs === 'ok') {
        highlights = await summarize(name, reviews, hints);
        if (!highlights) summaryNote = '「網友怎麼說」整理失敗，先保留網路找到的重點';
      } else summaryNote = rs === 'limit' ? '今日「網友怎麼說」整理次數已用完，先保留網路找到的重點' : rs;
    }
  }

  return NextResponse.json({ address: a.formattedAddress || '', opening_hours: hours.join('\n'), area, highlights, summaryNote });
}

// 舊版呼叫方式（只查地址與營業時間）
export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id') || '';
  const country = req.nextUrl.searchParams.get('country') || '';
  return lookup(id, country, '', null, false);
}

// 新增頁「用這間」：多整理「網友怎麼說」
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  return lookup(String(body.id || ''), String(body.country || ''), String(body.name || '').slice(0, 100), body.hints || null, true);
}
