// 暫時測試用：查 Instagram / Threads 貼文的嵌入資料能拿到什麼
// 測完請刪除這個檔案
import { NextRequest, NextResponse } from 'next/server';

const ALLOWED = [
  'instagram.com', 'www.instagram.com',
  'threads.com', 'www.threads.com',
  'threads.net', 'www.threads.net',
];

async function tryOembed(endpoint: string, target: string) {
  const url = `https://graph.facebook.com/v26.0/${endpoint}?url=${encodeURIComponent(target)}`;
  try {
    const res = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(10000) });
    const text = await res.text();
    let json: any = null;
    try { json = JSON.parse(text); } catch {}
    return {
      label: `oembed:${endpoint}`,
      status: res.status,
      fields: json ? Object.keys(json) : null,
      preview: text.slice(0, 1500),
    };
  } catch (e: any) {
    return { label: `oembed:${endpoint}`, error: String(e?.message || e) };
  }
}

async function tryPage(target: string) {
  try {
    const res = await fetch(target, { cache: 'no-store', signal: AbortSignal.timeout(10000) });
    const html = await res.text();
    const og: Record<string, string> = {};
    for (const key of ['og:title', 'og:description', 'og:image']) {
      const m =
        html.match(new RegExp(`<meta[^>]+property=["']${key}["'][^>]+content=["']([^"']*)["']`, 'i')) ||
        html.match(new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+property=["']${key}["']`, 'i'));
      if (m) og[key] = m[1].slice(0, 500);
    }
    return { label: 'page-html', status: res.status, og, htmlLength: html.length };
  } catch (e: any) {
    return { label: 'page-html', error: String(e?.message || e) };
  }
}

export async function GET(req: NextRequest) {
  const target = req.nextUrl.searchParams.get('url') || '';
  let host = '';
  try { host = new URL(target).hostname.toLowerCase(); } catch {}
  if (!ALLOWED.includes(host)) {
    return NextResponse.json({ error: '只支援 Instagram / Threads 連結' }, { status: 400 });
  }
  const endpoints = host.includes('threads')
    ? ['threads_oembed', 'oembed_post']
    : ['instagram_oembed', 'oembed_post'];
  const results: any[] = [];
  for (const ep of endpoints) results.push(await tryOembed(ep, target));
  results.push(await tryPage(target));
  return NextResponse.json({ target, results }, { status: 200 });
}
