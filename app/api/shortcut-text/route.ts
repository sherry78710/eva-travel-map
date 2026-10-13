// iPhone 捷徑用：Threads 貼文文字
// Threads 會擋 Vercel 伺服器（只給沒有內容的空殼頁），但手機讀得到。
// 捷徑在手機上讀嵌入頁後，把整頁內容傳來這裡；伺服器挖出貼文文字，存進 post_texts，
// 之後 AI 整理（autofill）讀不到貼文時，就改用這裡存的文字。
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
const LIMIT_TEXT = 200;
const MAX_PAGE = 5 * 1024 * 1024;

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
function htmlToText(html: string) {
  return decodeEntities(html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|div|span|li|h\d)>/gi, '\n').replace(/<[^>]+>/g, ' '))
    .split('\n').map(x => x.replace(/\s+/g, ' ').trim()).filter(Boolean).join('\n');
}
function jsonStr(raw: string) { try { return JSON.parse('"' + raw + '"'); } catch { return raw.replace(/\\n/g, '\n').replace(/\\"/g, '"'); } }
function captionFromJson(html: string) {
  let m: RegExpExecArray | null;
  const reCap = /"caption"\s*:\s*\{[^{}]*?"text"\s*:\s*"((?:\\.|[^"\\])*)"/g;
  while ((m = reCap.exec(html))) { const t = String(jsonStr(m[1]) || '').trim(); if (t.length > 1) return t; }
  const reFrag = /"plaintext"\s*:\s*"((?:\\.|[^"\\])*)"/g;
  const frags: string[] = [];
  while ((m = reFrag.exec(html)) && frags.length < 40) frags.push(jsonStr(m[1]));
  return frags.join('').trim();
}
// 依序嘗試：og 描述 → 頁面資料裡的 caption → 貼文文字區塊 → 整頁文字（最後手段）
function extractText(page: string): { text: string; how: string } {
  const isHtml = /<html|<body|<div|<meta/i.test(page);
  if (!isHtml) return { text: page.trim(), how: 'plain' }; // 捷徑已經轉成純文字
  const og = readOg(page, 'og:description');
  if (og.trim().length > 3) return { text: og.trim(), how: 'og' };
  const cap = captionFromJson(page);
  if (cap.length > 3) return { text: cap, how: 'json' };
  const blocks: string[] = [];
  const re = /class="[^"]*(?:BodyTextContainer|TextContentContainer|PostText)[^"]*"[^>]*>([\s\S]{0,8000}?)<\/(?:div|span)>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(page)) && blocks.length < 5) { const t = htmlToText(m[1]); if (t && !blocks.includes(t)) blocks.push(t); }
  if (blocks.join('').length > 3) return { text: blocks.join('\n'), how: 'block' };
  const body = (page.match(/<body[\s\S]*<\/body>/i) || [page])[0];
  return { text: htmlToText(body), how: 'page' };
}

async function readForm(req: NextRequest): Promise<{ page: string; post: string }> {
  const ctype = req.headers.get('content-type') || '';
  if (ctype.includes('multipart/form-data') || ctype.includes('application/x-www-form-urlencoded')) {
    const form = await req.formData();
    const get = async (k: string) => { const v = form.get(k); if (typeof v === 'string') return v; if (v) return await v.text(); return ''; };
    return { page: await get('page'), post: await get('post') };
  }
  const j = await req.json().catch(() => ({}));
  return { page: String(j?.page || ''), post: String(j?.post || '') };
}

export async function POST(req: NextRequest) {
  let page = '', post = '';
  try { ({ page, post } = await readForm(req)); } catch (e) {
    console.error('shortcut-text parse', e);
    return NextResponse.json({ error: '讀不到傳來的內容' }, { status: 400 });
  }
  // 貼文編號：@帳號/post/編號 或完整網址都可以
  const id = (post.match(/\/post\/([A-Za-z0-9_-]+)/) || [])[1] || '';
  if (!id) return NextResponse.json({ error: '沒有收到貼文編號' }, { status: 400 });
  if (!page) return NextResponse.json({ error: '沒有收到貼文內容' }, { status: 400 });
  if (page.length > MAX_PAGE) return NextResponse.json({ error: '內容太大' }, { status: 413 });

  const { text: raw, how } = extractText(page);
  const text = raw.slice(0, 4000).trim();
  console.log('shortcut-text', JSON.stringify({ id, pageLen: page.length, how, textLen: text.length, preview: text.slice(0, 80) }));
  if (text.length < 4) return NextResponse.json({ error: '頁面裡找不到貼文文字' }, { status: 404 });

  const { data: ok, error: bumpErr } = await sb.rpc('bump_usage', { p_kind: 'posttext', p_limit: LIMIT_TEXT, p_n: 1 });
  if (bumpErr) return NextResponse.json({ error: '計數功能出錯：' + bumpErr.message }, { status: 500 });
  if (ok !== true) return NextResponse.json({ error: '今日次數已用完' }, { status: 429 });

  const { error } = await sb.from('post_texts').upsert({ post_id: id, text, how, updated_at: new Date().toISOString() }, { onConflict: 'post_id' });
  if (error) { console.error('shortcut-text save', error); return NextResponse.json({ error: '存檔失敗：' + error.message }, { status: 500 }); }
  return NextResponse.json({ ok: true, how, length: text.length });
}
