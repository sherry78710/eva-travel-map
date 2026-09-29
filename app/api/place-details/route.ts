// 使用者確認「用這間」後，用 Google 店家編號查地址與營業時間
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

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

function langFor(country: string) {
  if (country === '韓國') return 'ko';
  if (country === '日本') return 'ja';
  if (country === '中國') return 'zh-CN';
  if (country === '台灣' || country === '香港' || country === '澳門') return 'zh-TW';
  return 'en';
}

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id') || '';
  const country = req.nextUrl.searchParams.get('country') || '';
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!/^[A-Za-z0-9_-]+$/.test(id) || !key) return NextResponse.json({ error: '參數錯誤' }, { status: 400 });

  const r = await bump('place', LIMIT_PLACE, 2);
  if (r !== 'ok') return bumpFail(r, ' Google 查詢');

  // 地址用當地語言（地址解析與 Naver 地圖用得到），營業時間用繁中
  const [addrRes, hoursRes] = await Promise.all([
    fetch(`https://places.googleapis.com/v1/places/${id}?languageCode=${langFor(country)}`, {
      headers: { 'X-Goog-Api-Key': key, 'X-Goog-FieldMask': 'id,formattedAddress' }, cache: 'no-store',
    }),
    fetch(`https://places.googleapis.com/v1/places/${id}?languageCode=zh-TW`, {
      headers: { 'X-Goog-Api-Key': key, 'X-Goog-FieldMask': 'id,regularOpeningHours' }, cache: 'no-store',
    }),
  ]);
  const a = await addrRes.json();
  const h = await hoursRes.json();
  if (!addrRes.ok) { console.error('place-details', a); }
  if (!addrRes.ok) return NextResponse.json({ error: a?.error?.message || '查詢失敗' }, { status: 502 });

  const hours: string[] = h?.regularOpeningHours?.weekdayDescriptions || [];
  return NextResponse.json({ address: a.formattedAddress || '', opening_hours: hours.join('\n') });
}
