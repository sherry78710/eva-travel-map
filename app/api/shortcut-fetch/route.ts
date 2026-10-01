// iPhone 捷徑用：IG 多張照片貼文
// 捷徑在手機上讀 IG 嵌入頁（伺服器讀會被 Meta 擋），把整頁文字傳來這裡；
// 伺服器從裡面挖出所有 display_url，還原成正常網址，下載原圖存進照片區。
// （捷徑自己下載會改動網址，IG 的簽章會對不上 → Bad URL hash，所以改由伺服器下載）
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
  { global: { fetch: (input: any, init?: any) => fetch(input, { ...init, cache: 'no-store' }) } }
);
const LIMIT_UPLOAD = 200;          // 跟 shortcut-upload 共用每日上限
const MAX_BYTES = 10 * 1024 * 1024; // 單張最大 10 MB
const MAX_PAGE = 5 * 1024 * 1024;   // 嵌入頁文字最大 5 MB
const MAX_PHOTOS = 20;              // IG 一篇最多 20 張（一篇介紹多間店時照片會比較多）

// 只允許 IG / FB 的圖片伺服器，避免被拿去下載任意網址
function allowedHost(u: URL) {
  const h = u.hostname.toLowerCase();
  return u.protocol === 'https:' && (h.endsWith('.fbcdn.net') || h.endsWith('.cdninstagram.com'));
}

// 還原多層跳脫：\\\/ → /、\\u0026 → &、\\u00253D → %3D ……
function unescapeUrl(raw: string) {
  let s = raw.replace(/\\+u([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
  s = s.replace(/\\+/g, '');
  s = s.replace(/&amp;/g, '&');
  return s.trim();
}

function extractUrls(page: string) {
  const out: string[] = [];
  const seen = new Set<string>();
  // display_url\":\"https:\\\/\\\/....\"（跳脫層數不固定）
  const re = /display_url\\*"\s*:\s*\\*"(.*?)\\*"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(page)) && out.length < MAX_PHOTOS) {
    const url = unescapeUrl(m[1]);
    let u: URL;
    try { u = new URL(url); } catch { continue; }
    if (!allowedHost(u)) continue;
    const key = u.pathname.split('/').pop() || u.pathname; // 同一張圖（封面＝第一張）只留一次
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(url);
  }
  return out;
}

async function readPage(req: NextRequest): Promise<string> {
  const ctype = req.headers.get('content-type') || '';
  if (ctype.includes('multipart/form-data') || ctype.includes('application/x-www-form-urlencoded')) {
    const form = await req.formData();
    const v = form.get('page');
    if (typeof v === 'string') return v;
    if (v) return await v.text(); // 捷徑把文字當檔案送也可以
    return '';
  }
  if (ctype.includes('application/json')) {
    const j = await req.json().catch(() => ({}));
    return typeof j?.page === 'string' ? j.page : '';
  }
  return await req.text();
}

export async function POST(req: NextRequest) {
  let page = '';
  try {
    page = await readPage(req);
  } catch (e) {
    console.error('shortcut-fetch parse', e);
    return NextResponse.json({ error: '讀不到傳來的內容' }, { status: 400 });
  }
  if (!page) return NextResponse.json({ error: '沒有收到嵌入頁內容' }, { status: 400 });
  if (page.length > MAX_PAGE) return NextResponse.json({ error: '內容太大' }, { status: 413 });

  const srcs = extractUrls(page);
  if (!srcs.length) return NextResponse.json({ error: '頁面裡找不到照片網址' }, { status: 404 });

  const { data: ok, error: bumpErr } = await sb.rpc('bump_usage', { p_kind: 'upload', p_limit: LIMIT_UPLOAD, p_n: srcs.length });
  if (bumpErr) return NextResponse.json({ error: '計數功能出錯：' + bumpErr.message }, { status: 500 });
  if (ok !== true) return NextResponse.json({ error: '今日上傳次數已用完' }, { status: 429 });

  // 20 張一張一張下載太慢，改成 4 張一組同時下載（順序不變）
  async function saveOne(src: string): Promise<string> {
    try {
      const r = await fetch(src, {
        cache: 'no-store',
        headers: {
          'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
          'Referer': 'https://www.instagram.com/',
        },
      });
      const type = (r.headers.get('content-type') || '').split(';')[0];
      if (!r.ok || !type.startsWith('image/')) {
        console.error('shortcut-fetch download', r.status, type, src.slice(0, 120));
        return '';
      }
      const buf = Buffer.from(await r.arrayBuffer());
      if (!buf.length || buf.length > MAX_BYTES) return '';
      const ext = type.includes('png') ? 'png' : type.includes('webp') ? 'webp' : type.includes('heic') ? 'heic' : 'jpg';
      const path = `places/ig_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await sb.storage.from('photos').upload(path, buf, { contentType: type, upsert: true });
      if (error) { console.error('shortcut-fetch upload', error); return ''; }
      return sb.storage.from('photos').getPublicUrl(path).data.publicUrl;
    } catch (e) {
      console.error('shortcut-fetch', e);
      return '';
    }
  }
  const urls: string[] = [];
  for (let i = 0; i < srcs.length; i += 4) {
    const batch = await Promise.all(srcs.slice(i, i + 4).map(saveOne));
    batch.forEach(u => { if (u) urls.push(u); });
  }
  console.log('shortcut-fetch', JSON.stringify({ found: srcs.length, saved: urls.length }));
  if (!urls.length) return NextResponse.json({ error: '照片下載失敗' }, { status: 502 });
  return NextResponse.json({ url: urls[0], urls });
}
