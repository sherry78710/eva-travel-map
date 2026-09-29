// 詳情頁「更多 Google 照片」：依 Google 規定不存照片，每次即時查詢
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);
const LIMIT_PLACE = 100;
const LIMIT_PHOTO = 40;
const COUNT = 4;

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id') || '';
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!/^[A-Za-z0-9_-]+$/.test(id) || !key) return NextResponse.json({ error: '參數錯誤' }, { status: 400 });

  const { data: okPlace } = await sb.rpc('bump_usage', { p_kind: 'place', p_limit: LIMIT_PLACE, p_n: 1 });
  if (okPlace !== true) return NextResponse.json({ error: '今日 Google 查詢次數已用完，明天再試' }, { status: 429 });

  const res = await fetch(`https://places.googleapis.com/v1/places/${id}`, {
    headers: { 'X-Goog-Api-Key': key, 'X-Goog-FieldMask': 'id,photos' }, cache: 'no-store',
  });
  const data = await res.json();
  if (!res.ok) return NextResponse.json({ error: data?.error?.message || '查詢失敗' }, { status: 502 });
  const list = (data.photos || []).slice(0, COUNT);
  if (!list.length) return NextResponse.json({ photos: [] });

  const { data: okPhoto } = await sb.rpc('bump_usage', { p_kind: 'photo', p_limit: LIMIT_PHOTO, p_n: list.length });
  if (okPhoto !== true) return NextResponse.json({ error: '今日 Google 照片次數已用完，明天再試' }, { status: 429 });

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
