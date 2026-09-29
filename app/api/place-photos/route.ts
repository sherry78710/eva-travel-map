// 詳情頁「更多 Google 照片」：依 Google 規定不存照片，每次即時查詢
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
const LIMIT_PHOTO = 40;
const COUNT = 4;

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id') || '';
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!/^[A-Za-z0-9_-]+$/.test(id) || !key) return NextResponse.json({ error: '參數錯誤' }, { status: 400 });

  const r1 = await bump('place', LIMIT_PLACE, 1);
  if (r1 !== 'ok') return bumpFail(r1, ' Google 查詢');

  const res = await fetch(`https://places.googleapis.com/v1/places/${id}`, {
    headers: { 'X-Goog-Api-Key': key, 'X-Goog-FieldMask': 'id,photos' }, cache: 'no-store',
  });
  const data = await res.json();
  if (!res.ok) { console.error('place-photos', data); return NextResponse.json({ error: data?.error?.message || '查詢失敗' }, { status: 502 }); }
  const list = (data.photos || []).slice(0, COUNT);
  if (!list.length) return NextResponse.json({ photos: [] });

  const r2 = await bump('photo', LIMIT_PHOTO, list.length);
  if (r2 !== 'ok') return bumpFail(r2, ' Google 照片');

  const photos = await Promise.all(list.map(async (p: any) => {
    try {
      const r = await fetch(`https://places.googleapis.com/v1/${p.name}/media?maxWidthPx=1000&skipHttpRedirect=true`, {
        headers: { 'X-Goog-Api-Key': key }, cache: 'no-store',
      });
      const j = await r.json();
      const author = (p.authorAttributions || [])[0] || {};
      return j.photoUri ? { uri: j.photoUri, author: author.displayName || '', authorUri: author.uri || '' } : null;
    } catch { return null; }
  }));
  return NextResponse.json({ photos: photos.filter(Boolean) });
}
