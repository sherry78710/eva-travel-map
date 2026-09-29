// 使用者確認「用這間」後，用 Google 店家編號查地址與營業時間
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);
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

  const { data: ok } = await sb.rpc('bump_usage', { p_kind: 'place', p_limit: LIMIT_PLACE, p_n: 2 });
  if (ok !== true) return NextResponse.json({ error: '今日 Google 查詢次數已用完，明天再試' }, { status: 429 });

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
  if (!addrRes.ok) return NextResponse.json({ error: a?.error?.message || '查詢失敗' }, { status: 502 });

  const hours: string[] = h?.regularOpeningHours?.weekdayDescriptions || [];
  return NextResponse.json({ address: a.formattedAddress || '', opening_hours: hours.join('\n') });
}
