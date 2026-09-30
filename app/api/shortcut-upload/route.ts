// iPhone 捷徑上傳照片用：捷徑在手機上抓到 IG / Threads 原圖後，一張一張傳到這裡存進照片區
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
  { global: { fetch: (input: any, init?: any) => fetch(input, { ...init, cache: 'no-store' }) } }
);
const LIMIT_UPLOAD = 200; // 每天最多 200 張，避免被濫用
const MAX_BYTES = 10 * 1024 * 1024;

export async function POST(req: NextRequest) {
  let files: File[] = [];
  const ctype = req.headers.get('content-type') || '';
  try {
    if (ctype.includes('multipart/form-data')) {
      const form = await req.formData();
      files = form.getAll('file').filter((f): f is File => typeof f !== 'string');
    } else if (ctype.startsWith('image/')) {
      // 捷徑也可以直接把圖片當本文送過來
      const buf = await req.arrayBuffer();
      files = [new File([buf], 'upload', { type: ctype })];
    }
  } catch (e) {
    console.error('shortcut-upload parse', e);
    return NextResponse.json({ error: '讀不到上傳的檔案' }, { status: 400 });
  }
  files = files.filter(f => f.size > 0 && f.size <= MAX_BYTES && (!f.type || f.type.startsWith('image/')));
  if (!files.length) return NextResponse.json({ error: '沒有收到圖片' }, { status: 400 });

  const { data: ok, error: bumpErr } = await sb.rpc('bump_usage', { p_kind: 'upload', p_limit: LIMIT_UPLOAD, p_n: files.length });
  if (bumpErr) return NextResponse.json({ error: '計數功能出錯：' + bumpErr.message }, { status: 500 });
  if (ok !== true) return NextResponse.json({ error: '今日上傳次數已用完' }, { status: 429 });

  const urls: string[] = [];
  for (const f of files) {
    const type = f.type || 'image/jpeg';
    const ext = type.includes('png') ? 'png' : type.includes('webp') ? 'webp' : type.includes('heic') ? 'heic' : 'jpg';
    const path = `places/sc_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await sb.storage.from('photos').upload(path, Buffer.from(await f.arrayBuffer()), { contentType: type, upsert: true });
    if (error) { console.error('shortcut-upload', error); continue; }
    urls.push(sb.storage.from('photos').getPublicUrl(path).data.publicUrl);
  }
  console.log('shortcut-upload', JSON.stringify({ received: files.length, saved: urls.length }));
  if (!urls.length) return NextResponse.json({ error: '上傳失敗' }, { status: 500 });
  return NextResponse.json({ url: urls[0], urls });
}
