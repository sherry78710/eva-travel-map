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
// AI 呼叫失敗（例如額度不足）時把次數退回，只有成功的才算
async function refund(kind: string, limit: number) {
  try { await sb.rpc('bump_usage', { p_kind: kind, p_limit: limit, p_n: -1 }); } catch {}
}
function bumpFail(r: string, what: string) {
  return r === 'limit'
    ? NextResponse.json({ error: `今日${what}次數已用完，明天再試` }, { status: 429 })
    : NextResponse.json({ error: r }, { status: 500 });
}

// 每日上限（台灣時間每天 0 點重置）
const LIMIT_AI = 30;
const LIMIT_SEARCH = 50;
const LIMIT_SCAN = 60; // 「這篇介紹了幾間」看照片判斷，很便宜，獨立計數

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

// 從原始碼收集貼文照片（IG / Threads 的圖都放在 cdninstagram / fbcdn）
// og:image 在 Reels 會疊播放鍵、在 Threads 是拼貼預覽卡，所以優先用這裡找到的原圖
function collectImages(html: string, og: string) {
  // 網址可能被跳脫一層（https:\/\/）或好幾層（https:\\\/\\\/），先全部還原
  const clean = html.replace(/\\+\//g, '/').replace(/\\+u0026/gi, '&').replace(/\\+u003d/gi, '=');
  const re = /https?:\/\/[^"'\s<>\\]*?(?:cdninstagram\.com|fbcdn\.net)[^"'\s<>\\]*/g;
  const seen = new Set<string>();
  const out: string[] = [];
  const raw: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(clean)) !== null) {
    const u = decodeEntities(m[0]).replace(/[,;)]+$/, '');
    raw.push(u);
    if (!/\.(jpg|jpeg|webp|png|heic)/i.test(u)) continue;
    // 只收貼文照片：主機是 scontent 開頭、路徑是 /v/t51.xxx-15 這種格式（static.cdninstagram.com 是 logo 等網頁素材）
    let host = '', path = '';
    try { const x = new URL(u); host = x.hostname; path = x.pathname; } catch { continue; }
    if (!/^scontent/i.test(host)) continue;
    if (!/\/t\d+\.\d+-15\//.test(path)) continue;
    if (/s150x150|p150x150|s320x320|p320x320|_s\.jpg/i.test(u)) continue; // 小縮圖
    const key = path.split('/').pop() || u;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(u);
  }
  const ogKey = (() => { try { return new URL(og).pathname.split('/').pop() || og; } catch { return og; } })();
  const others = out.filter(u => { try { return new URL(u).pathname.split('/').pop() !== ogKey; } catch { return true; } });
  // 篩選前的原始網址也記下來，找不到照片時才知道是哪一條規則擋掉
  const rawHosts = Array.from(new Set(raw.map(u => { try { const x = new URL(u); return x.hostname + x.pathname.slice(0, 28); } catch { return u.slice(0, 50); } }))).slice(0, 8);
  console.log('images found', JSON.stringify({ htmlLen: html.length, raw: raw.length, total: out.length, others: others.length, embedImg: /EmbeddedMediaImage/.test(html), rawSample: rawHosts }));
  const list = (others.length ? others : [og]).filter(Boolean).slice(0, 6);
  console.log('cover source:', others.length ? `html (${list.length})` : 'og:image');
  return list;
}

// 官方嵌入頁（給其他網站嵌入貼文用，不用登入）通常放的是原始照片，不是預覽卡
const BROWSER_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36';
async function embedImages(url: string, finalUrl: string) {
  const pages: string[] = [];
  const ig = url.match(/instagram\.com\/(?:[^/?#]+\/)?(?:p|reel|reels|tv)\/([A-Za-z0-9_-]+)/i);
  if (ig) pages.push(`https://www.instagram.com/p/${ig[1]}/embed/captioned/`);
  const th = (finalUrl || '').match(/threads\.(?:com|net)\/(@[^/?#]+)\/post\/([A-Za-z0-9_-]+)/i) || url.match(/threads\.(?:com|net)\/(@[^/?#]+)\/post\/([A-Za-z0-9_-]+)/i);
  if (th) pages.push(`https://www.threads.com/${th[1]}/post/${th[2]}/embed`);
  pages.push(finalUrl || url);
  for (const page of pages) {
    try {
      const res = await fetch(page, { headers: { 'User-Agent': BROWSER_UA, 'Accept-Language': 'zh-TW,zh;q=0.9,en;q=0.8' }, cache: 'no-store', redirect: 'follow', signal: AbortSignal.timeout(10000) });
      const html = await res.text();
      const list = collectImages(html, '').filter(Boolean);
      console.log('embed try', JSON.stringify({ page: page.replace(/^https:\/\/www\./, '').slice(0, 70), status: res.status, found: list.length }));
      if (list.length) return list;
    } catch (e) { console.error('embed try failed', page, e); }
  }
  return [];
}

// 從轉址頁找出真正的貼文網址（Threads 分享短連結常用 JS 或 meta 轉址）
function findRedirect(html: string, base: string) {
  const pats = [
    /<meta[^>]+http-equiv=["']refresh["'][^>]+content=["'][^"']*url=([^"']+)["']/i,
    /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i,
    /<meta[^>]+property=["']og:url["'][^>]+content=["']([^"']+)["']/i,
    /(?:location\.href|location\.replace\(|window\.location)\s*=?\s*["'](https?:\/\/[^"']+)["']/i,
    /"(https:\\?\/\\?\/www\.threads\.(?:com|net)\\?\/@[^"]+?\\?\/post\\?\/[A-Za-z0-9_-]+)/,
  ];
  for (const re of pats) {
    const m = html.match(re);
    if (m && m[1]) {
      try {
        const u = new URL(decodeEntities(m[1].replace(/\\\//g, '/')), base).toString();
        // 只接受網頁網址（barcelona:// 這種是叫 App 打開的，伺服器讀不了）；也不要 /@/post/ 這種沒有帳號名稱的
        if (!/^https?:\/\//i.test(u) || /threads\.(?:com|net)\/@\/post\//i.test(u)) continue;
        if (u !== base) return u;
      } catch {}
    }
  }
  return '';
}

// Threads 有時回傳沒有貼文資訊的空殼頁面（標題、內文都是空的）→ 改讀「嵌入頁」（給其他網站嵌入貼文用，不用登入）
function threadsPostUrl(u: string) {
  const m = (u || '').match(/threads\.(?:com|net)\/(@[^/?#]+)\/post\/([A-Za-z0-9_-]+)/i);
  return m && m[1] !== '@' ? `https://www.threads.com/${m[1]}/post/${m[2]}` : '';
}
function htmlToText(html: string) {
  return decodeEntities(html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|div|span|li|h\d)>/gi, '\n').replace(/<[^>]+>/g, ' '))
    .split('\n').map(x => x.replace(/\s+/g, ' ').trim()).filter(Boolean).join('\n');
}
// 從頁面裡的 JSON 資料挖出貼文文字（Threads 把內文放在 script 裡的資料，不在畫面 HTML）
function jsonStr(raw: string) { try { return JSON.parse('"' + raw + '"'); } catch { return raw.replace(/\\n/g, '\n').replace(/\\"/g, '"'); } }
function captionFromJson(html: string) {
  const out: string[] = [];
  const push = (t: string) => { const x = String(t || '').trim(); if (x.length > 1 && !out.includes(x)) out.push(x); };
  let m: RegExpExecArray | null;
  const reCap = /"caption"\s*:\s*\{[^{}]*?"text"\s*:\s*"((?:\\.|[^"\\])*)"/g;
  while ((m = reCap.exec(html)) && out.length < 5) push(jsonStr(m[1]));
  if (!out.length) {
    const reFrag = /"plaintext"\s*:\s*"((?:\\.|[^"\\])*)"/g;
    const frags: string[] = [];
    while ((m = reFrag.exec(html)) && frags.length < 40) frags.push(jsonStr(m[1]));
    if (frags.length) push(frags.join(''));
  }
  return out[0] || '';
}
// 頁面裡的照片：image_versions2 → candidates → url（Threads 的照片網址格式跟 IG 不一樣，所以另外找）
function imagesFromJson(html: string) {
  const clean = html.replace(/\\+\//g, '/').replace(/\\+u0026/gi, '&');
  const out: string[] = []; const seen = new Set<string>();
  const re = /"image_versions2"\s*:\s*\{\s*"candidates"\s*:\s*\[\s*\{[^{}]*?"url"\s*:\s*"(https:[^"]+)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(clean)) && out.length < 20) {
    const u = decodeEntities(m[1]);
    let key = u; try { key = new URL(u).pathname.split('/').pop() || u; } catch {}
    if (seen.has(key)) continue; seen.add(key); out.push(u);
  }
  return out;
}
async function readThreadsEmbed(postUrl: string) {
  if (!postUrl) return null;
  const page = postUrl + '/embed';
  try {
    const res = await fetch(page, { headers: { 'User-Agent': BROWSER_UA, 'Accept-Language': 'zh-TW,zh;q=0.9,en;q=0.8' }, cache: 'no-store', redirect: 'follow', signal: AbortSignal.timeout(10000) });
    const html = await res.text();
    const ogDesc = readOg(html, 'og:description');
    // 1) og 標籤 2) 頁面 JSON 資料裡的 caption 3) 畫面上的文字區塊
    let text = ogDesc || captionFromJson(html);
    if (!text) {
      const block = html.match(/class="[^"]*(?:BodyTextContainer|TextContentContainer|PostText)[^"]*"[^>]*>([\s\S]{0,6000}?)<\/(?:div|span)>/i);
      if (block) text = htmlToText(block[1]);
    }
    text = text.slice(0, 2000).trim();
    let images = imagesFromJson(html);
    if (!images.length) images = collectImages(html, '');
    // 診斷用：還是抓不到時，記下頁面裡相關關鍵字附近的內容，方便下次調整
    const probe = (k: string) => { const i = html.indexOf(k); return i < 0 ? '' : html.slice(Math.max(0, i - 60), i + 160).replace(/\s+/g, ' '); };
    console.log('readThreadsEmbed', JSON.stringify({ status: res.status, htmlLen: html.length, textLen: text.length, images: images.length,
      ...(text ? {} : { hasCaption: html.includes('"caption"'), hasPlain: html.includes('"plaintext"'), hasIV2: html.includes('image_versions2'), title: (html.match(/<title>([^<]{0,80})/i) || [])[1] || '', probeCaption: probe('"caption"'), probeText: probe('"text":"') }) }));
    if (text.length < 4 || looksBlocked('', text, '')) return null;
    return { title: '', desc: text, images, og: images[0] || '', final: postUrl };
  } catch (e) { console.error('readThreadsEmbed', e); return null; }
}

// 捷徑在手機上讀到的 Threads 貼文文字（伺服器被擋時用）
async function storedThreadsText(postUrl: string) {
  const id = (postUrl.match(/\/post\/([A-Za-z0-9_-]+)/) || [])[1];
  if (!id) return null;
  try {
    let { data, error } = await sb.from('post_texts').select('text, images').eq('post_id', id).maybeSingle();
    if (error) ({ data } = await sb.from('post_texts').select('text').eq('post_id', id).maybeSingle()); // 還沒有照片欄位
    const text = String(data?.text || '').trim();
    const saved: string[] = (Array.isArray((data as any)?.images) ? (data as any).images : []).filter((u: any) => typeof u === 'string' && OWN_PHOTO_RE.test(u));
    console.log('storedThreadsText', JSON.stringify({ id, found: !!text, len: text.length }));
    // 舊版存到的錯誤畫面文字（例如「Threads 無法顯示串文」）不能用
    if (text.length < 4 || (text.length < 80 && /無法顯示|无法显示|can.t display|not available|log ?in|登入/i.test(text))) return null;
    return { title: '', desc: text.slice(0, 3000), images: [] as string[], og: '', final: threadsPostUrl(postUrl) || postUrl, saved };
  } catch (e) { console.error('storedThreadsText', e); return null; }
}

async function readPost(url: string) {
  // 網址本身就有貼文編號 → 先看捷徑有沒有存好文字（最快也最可靠）
  if (/threads\.(com|net)/i.test(url) && /\/post\//.test(url)) { const st = await storedThreadsText(url); if (st) return st; }
  const tries: Record<string, string>[] = [
    { 'User-Agent': 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)' },
    {},
    { 'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' },
  ];
  const isThreads = /threads\.(com|net)/i.test(url);
  const triedEmbed = new Set<string>();
  for (const headers of tries) {
    let target = url;
    for (let hop = 0; hop < 3; hop++) {
      try {
        const res = await fetch(target, { headers, cache: 'no-store', redirect: 'follow', signal: AbortSignal.timeout(10000) });
        const html = await res.text();
        const title = readOg(html, 'og:title');
        const desc = readOg(html, 'og:description');
        const og = readOg(html, 'og:image');
        console.log('readPost', JSON.stringify({ ua: headers['User-Agent']?.slice(0, 20) || 'default', status: res.status, final: res.url, titleLen: title.length, descLen: desc.length, hasImg: !!og }));
        // Threads 有時只有標題、沒有內文
        const text = desc || (isThreads && title && !/^threads$/i.test(title.trim()) ? title : '');
        if (!looksBlocked(title, text, og)) return { title, desc: text, images: collectImages(html, og), og, final: readOg(html, 'og:url') || res.url || target };
        // Threads 空殼頁面：知道真正的貼文網址（含帳號名稱）就改讀嵌入頁
        if (isThreads) {
          const pu = threadsPostUrl(res.url) || threadsPostUrl(target);
          if (pu && !triedEmbed.has(pu)) { triedEmbed.add(pu); const st = await storedThreadsText(pu); if (st) return st; const em = await readThreadsEmbed(pu); if (em) return em; }
        }
        // 拿不到內容：可能是轉址頁，找真正的網址再試
        const next = findRedirect(html, res.url || target);
        if (!next || next === target) break;
        console.log('readPost redirect →', next);
        target = next;
      } catch (e) { console.error('readPost', e); break; }
    }
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

// 類型定義：避免「豬排」被分到「燒肉、烤肉」這種錯誤。只列出使用者目前有的類型
const TYPE_HINTS: Record<string, string> = {
  '餐廳': '所有吃正餐的店都要選（大類）',
  '燒肉、烤肉': '客人在桌邊自己烤肉的店（韓式烤肉、日式燒肉）。炸豬排、串燒、牛排、烤雞都不算',
  '火鍋/壽喜燒': '火鍋、涮涮鍋、壽喜燒、部隊鍋等鍋物',
  '早午餐/咖啡廳': '以咖啡、飲品、早午餐為主的店',
  '咖啡廳': '以咖啡、飲品為主的店',
  '甜點/麵包店': '甜點、蛋糕、麵包、冰品為主的店',
  '購物': '服飾、雜貨、選物店等商店',
  '景點': '觀光景點、公園、寺廟、展覽',
  '市場': '傳統市場、夜市',
  '百貨': '百貨公司、大型購物中心',
  '飯店': '住宿',
  '住宿': '住宿',
  '酒吧': '以喝酒為主的店',
};

async function askClaude(post: { title: string; desc: string }, ctx: any, photos: string[] = []) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error('缺少 ANTHROPIC_API_KEY');
  const typeRules = (ctx.types || []).filter((t: string) => TYPE_HINTS[t]).map((t: string) => `- ${t}：${TYPE_HINTS[t]}`).join('\n');
  const system = `你是旅遊美食收藏助理。使用者給你一則 IG 或 Threads 貼文，請找出貼文介紹的「一間」店家（有多間時取最主要那間）。
步驟：
1. 先讀貼文，推測店名、城市、商圈。
2. 一定要用 web_search 上網搜尋（例如「店名 城市」「店名 評價」「店名 必點」），確認正式店名、分店、所在商圈，找出菜單上的具體品名，並看看網路上的評價（部落格、Tabelog、Naver 等）大家常提到什麼優點和要注意的地方。貼文資訊很少時，用貼文裡的線索（暱稱、菜色、地區）去找出真正的店。
3. 最後只輸出一個 JSON 物件，不要任何其他文字、不要 Markdown：
{
 "is_place": true/false（是否在介紹實體店家或景點）,
 "name": "店名，用正式名稱，可中外文並列",
 "map_query": "店名的當地語言寫法（韓國用韓文、日本用日文），含分店名；不確定就空字串",
 "search_query": "在 Google 地圖最可能找到這間店的字串：當地語言正式店名 + 分店或地區",
 "country": "必須是 countries 清單中的一個，無法判斷就空字串",
 "city": "優先使用 cities 清單中的名稱，無法判斷就空字串",
 "neighborhood": "商圈（例：白金高輪、弘大、中山）。優先從 areas 裡該城市的清單挑；清單沒有合適的，就填當地人常用的商圈或最近車站名，用繁體中文；判斷不出來就空字串",
 "types": ["只能從 types 清單挑，0 到 2 個"],
 "recommendations": [
   {"name": "品名，照店家菜單上的原文寫（日本店用日文、韓國店用韓文）", "zh": "繁體中文翻譯；原文本來就是繁體中文就空字串", "desc": "一句 25 字內繁中說明：口味特色、份量或價格（例：約 ¥2,500，油花多、外皮酥）", "source": "post（貼文提到的）或 web（網路上常被推薦的）"}
 ],
 "note": "一句 40 字內的繁體中文收藏原因，根據貼文內容寫",
 "highlights": {
   "good": [{"text": "網友常提到的優點，20 字內繁中", "src": ["貼文" 或 "網路"]}],
   "caution": [{"text": "要注意的地方，20 字內繁中", "src": ["網路"]}]
 },
 "branches_in_post": [{"name": "分店名稱（照貼文寫法）", "address": "貼文寫的這間分店地址"}]（貼文列出這間店的好幾間分店或好幾個地址時才填，每間一筆；只有一個地點就給空陣列 []）,
 "confidence": "high 或 low。只有貼文文字明確寫出店名或地址時才填 high；店名是你根據菜色、地區等線索上網推測出來的，一律填 low"
}
規則：
- name 一定是店家本身的名稱：人名（藝人、網紅、貼文作者，例如「員瑛」）不是店名；「員瑛同款燒肉」「銀座燒肉店」這種描述也不是店名。上網也查不到確定的店名時，name 填空字串、confidence 填 low，不要拿人名或描述充數。
- recommendations 最多 6 項，貼文提到的放前面。品名一定要具體：不可以只寫「豬排」「咖啡」「拉麵」這種類別詞；貼文只寫類別詞時，上網找出這間店對應的具體品名（例：特上ロースとんかつ定食）。
- types：只有完全符合才選子類型；沒有完全符合的子類型，就只選「餐廳」這類大類。定義如下：
${typeRules || '（無）'}
- highlights.good 3 到 5 條、caution 0 到 3 條。只寫多個來源重複提到的共通點，不要編造。
- caution 只寫營業時間看不出來的事，例如：排隊很久、只收現金、要預約、限時用餐、座位少、價位偏高。不要寫營業時間、公休日、地址。
- 語言：除了 recommendations 的 name 和 map_query、search_query 用原文以外，其他所有文字（note、recommendations 的 desc、highlights 的 text）一律用繁體中文（台灣用語）。網路資料是日文、韓文、英文時要翻譯成繁體中文，不可以直接貼原文句子。
- 查不到就照貼文內容填，不要編造。
- is_place 只有在貼文明顯不是介紹店家或景點（例如心情、新聞、問問題）時才填 false。貼文很短時（例如「第一餐直奔桐麵 爽哭」），裡面的專有名詞多半就是店名，一定要上網搜尋確認，不可以因為資訊少就填 false 或把 name 留空。
- 有附貼文照片時一起看：碗、招牌、菜單、包裝、地圖卡片上常印有店名，可以當作找店的線索。`;
  const target = ctx.target && ctx.target.name ? ctx.target : null;
  const targetNote = target ? `

★ 這次要整理的店已經確定是：「${target.name}」${target.hint ? `（貼文對這間的說明：${target.hint}）` : ''}。這是從貼文照片（例如地圖店家卡片）讀到、或使用者指定的正確店名，請用這個名稱上網搜尋，不要改猜別間。
店名已經確定，最多只能搜尋 2 次，不用再確認是哪間店：第 1 次查菜單和必點品項（例如「店名 メニュー」「店名 必點」），第 2 次查網友評價（例如「店名 口コミ」「店名 評價」）。
貼文如果介紹了好幾間，name、recommendations、note、highlights 都只寫這一間，其他店完全不要管。search_query 要包含這個店名。` : '';
  const user = `countries: ${JSON.stringify(ctx.countries)}
cities: ${JSON.stringify(ctx.cities)}
areas（各城市已有的商圈）: ${JSON.stringify(ctx.areas || {})}
types: ${JSON.stringify(ctx.types)}
使用者已選的國家: ${ctx.country || '（未選）'}

貼文標題: ${post.title}
貼文內容: ${post.desc}${targetNote}

（提醒：note、desc、highlights 一律用繁體中文寫）`;
  // 店名已確定（照片讀到、使用者指定、多間店模式）→ 不用再搜「是哪間店」，上限 2 次；要用猜的 → 上限 4 次
  const tools = [{ type: 'web_search_20250305', name: 'web_search', max_uses: target ? 2 : 4 }];
  const call = async (messages: any[], withTools: boolean, timeoutMs: number) => {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 2500, system, ...(withTools ? { tools } : {}), messages }),
      signal: AbortSignal.timeout(timeoutMs),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error?.message || 'AI 呼叫失敗');
    return data;
  };
  // 只看最後一次搜尋結果之後的文字，JSON 在那裡
  const parse = (blocks: any[]) => {
    let lastTool = -1;
    blocks.forEach((b, i) => { if (b.type === 'web_search_tool_result' || b.type === 'server_tool_use') lastTool = i; });
    const text = blocks.slice(lastTool + 1).map((c: any) => c.type === 'text' ? c.text : '').join('').replace(/```json|```/g, '').trim();
    const st = text.indexOf('{'), en = text.lastIndexOf('}');
    if (st < 0 || en <= st) return null;
    try { return JSON.parse(text.slice(st, en + 1)); } catch { return null; }
  };

  const started = Date.now();
  // 貼文照片（最多 3 張）一起給 AI 看：店名常印在碗、招牌上
  const imgBlocks: any[] = [];
  for (const u of photos.slice(0, 3)) {
    try {
      const r = await fetch(u, { cache: 'no-store', signal: AbortSignal.timeout(8000) });
      let type = (r.headers.get('content-type') || '').split(';')[0].toLowerCase();
      if (type === 'image/jpg') type = 'image/jpeg';
      if (!r.ok || !['image/jpeg', 'image/png', 'image/webp'].includes(type)) continue;
      const buf = Buffer.from(await r.arrayBuffer());
      if (!buf.length || buf.length > 4.5 * 1024 * 1024) continue;
      imgBlocks.push({ type: 'image', source: { type: 'base64', media_type: type, data: buf.toString('base64') } });
    } catch {}
  }
  const firstContent: any = imgBlocks.length ? [...imgBlocks, { type: 'text', text: user + `\n\n（上面附了 ${imgBlocks.length} 張貼文照片）` }] : user;
  const messages: any[] = [{ role: 'user', content: firstContent }];
  let data = await call(messages, true, 40000);
  // AI 搜尋比較久時會先暫停（pause_turn），把它的進度送回去讓它繼續，最多 2 次
  for (let i = 0; i < 2 && data.stop_reason === 'pause_turn' && Date.now() - started < 35000; i++) {
    console.log('askClaude pause_turn → continue', i + 1);
    messages.push({ role: 'assistant', content: data.content });
    data = await call(messages, true, Math.max(10000, 45000 - (Date.now() - started)));
  }
  const first = parse(data.content || []);
  if (first) return first;

  // 還是沒有結果：用已經搜到的資料，請它直接整理成 JSON（不再上網）
  console.log('askClaude fallback, stop_reason=', data.stop_reason);
  const notes = (data.content || []).map((c: any) => c.type === 'text' ? c.text : '').join('').slice(0, 4000);
  // 伺服器最多跑 60 秒，時間不夠就不再補救
  if (Date.now() - started > 42000) throw new Error('AI 查太久了，請按重試');
  const fb = await call([{ role: 'user', content: user + (notes ? `\n\n先前查到的資料：\n${notes}` : '') + '\n\n請不要再搜尋，直接用以上資料輸出規定的 JSON。' }], false, 15000);
  const second = parse(fb.content || []);
  if (second) return second;
  throw new Error('AI 沒有回傳可用的資料');
}

// ── 看照片＋內文：這篇介紹了幾間店？每張照片屬於哪一間？ ──
// 店名常常印在照片上（不在內文），所以要讓 AI 看圖
const OWN_PHOTO_RE = /^https:\/\/[^/]+\/storage\/v1\/object\/public\/photos\//;
async function scanPlaces(caption: string, photos: string[], readText = false): Promise<{ places: any[]; text: string }> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error('缺少 ANTHROPIC_API_KEY');
  // 伺服器先把照片下載下來再直接交給 AI（不讓 AI 自己去網址抓，比較不會失敗）
  const OK_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  const imgs = await Promise.all(photos.map(async (u) => {
    try {
      const r = await fetch(u, { cache: 'no-store', signal: AbortSignal.timeout(15000) });
      if (!r.ok) return null;
      let type = (r.headers.get('content-type') || '').split(';')[0].toLowerCase();
      if (type === 'image/jpg') type = 'image/jpeg';
      if (!OK_TYPES.includes(type)) return null;
      const buf = Buffer.from(await r.arrayBuffer());
      if (!buf.length || buf.length > 4.5 * 1024 * 1024) return null;
      return { type, data: buf.toString('base64') };
    } catch { return null; }
  }));
  const content: any[] = [];
  let sent = 0;
  imgs.forEach((im, i) => {
    if (!im) return;
    sent++;
    content.push({ type: 'text', text: `照片 ${i + 1}：` });
    content.push({ type: 'image', source: { type: 'base64', media_type: im.type, data: im.data } });
  });
  console.log('scan photos', JSON.stringify({ total: photos.length, sent }));
  content.push({ type: 'text', text: `貼文內容：\n${caption || '（沒有文字）'}\n\n照片共 ${photos.length} 張。` });
  // 截圖模式：貼文讀不到，照片裡有使用者截的貼文畫面 → 順便把截圖上的文字抄下來
  const textRule = readText ? `
- 這次的照片裡有使用者在 Threads / IG App 截的貼文畫面。請另外輸出 "text"：把截圖上「貼文作者寫的內文」完整照抄（保留原文、換行，多張截圖依序接起來，重複的部分只抄一次）；留言裡有提到店名、地址、推薦品項的，也抄進來，前面加「留言：」。不要抄按讚數、時間、按鈕、帳號推薦這類介面文字。截圖上沒有文字就填空字串。
- 截圖畫面本身也算一張照片：如果截圖裡主要是某間店的食物或店面照片，可以放進那間店的 photos。` : '';
  const system = `你是旅遊美食收藏助理。判斷這則 IG / Threads 貼文介紹了哪些實體店家或景點。店名常常印在照片上的小字（例如「📍店名」），也可能寫在內文。
只輸出一個 JSON 物件，不要任何其他文字、不要 Markdown：
{"places":[{"name":"店名，照照片或內文上的寫法","hint":"照片上或內文對這間的說明（推薦什麼、特色、分店），照原文，60 字內","photos":[這間店的照片編號，從 1 開始]}]${readText ? ',"text":"截圖上的貼文文字"' : ''}}
規則：
- 依貼文出現的順序列出，最多 20 間。只列實體店家或景點，不要列城市、商圈、品牌總稱。
- 每張照片最多屬於一間店。照片上沒寫店名時，依前後照片和畫面判斷屬於哪一間；判斷不出來就不要放進任何一間。
- 封面、總覽、拼貼圖這類不屬於單一間店的照片，不要放進任何一間。
- 同一間店出現多次（例如照片 3、4、5 都是同一間），合併成一筆，photos 列出全部。
- 整篇只介紹一間店，就只回傳一筆。
- name 一定是店家本身的名稱。人名（藝人、網紅、貼文作者）不是店名；「員瑛同款燒肉」「銀座的燒肉店」這種描述也不是店名。照片和內文都看不到真正的店名時，name 填空字串。
- 照片裡有 Google 地圖、Naver 地圖、Tabelog 這類「店家卡片截圖」時，以卡片上的店名為準（最可靠）。卡片同時有外文和當地語言店名時，name 用當地語言的寫法（日本用日文、韓國用韓文），例如「近江うし焼肉 にくTATSU 銀座店」。${textRule}`;
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: readText ? 4000 : 2000, system, messages: [{ role: 'user', content }] }),
    signal: AbortSignal.timeout(readText ? 50000 : 40000),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || 'AI 呼叫失敗');
  const text = (data.content || []).map((c: any) => c.type === 'text' ? c.text : '').join('').replace(/```json|```/g, '').trim();
  const a = text.indexOf('{'), b = text.lastIndexOf('}');
  if (a < 0 || b <= a) throw new Error('AI 沒有回傳可用的資料');
  const j = JSON.parse(text.slice(a, b + 1));
  const used = new Set<number>();
  const places = (Array.isArray(j.places) ? j.places : []).slice(0, 20).map((p: any) => {
    const idx = (Array.isArray(p.photos) ? p.photos : []).map((n: any) => Math.round(Number(n))).filter((n: number) => n >= 1 && n <= photos.length && !used.has(n));
    idx.forEach((n: number) => used.add(n));
    return { name: String(p.name || '').trim().slice(0, 80), hint: String(p.hint || '').trim().slice(0, 120), photos: idx };
  }).filter((p: any) => p.name);
  return { places, text: readText ? String(j.text || '').trim().slice(0, 4000) : '' };
}

async function searchGoogle(query: string, country: string) {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key || !query) return [];
  const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'X-Goog-Api-Key': key,
      'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.businessStatus',
    },
    body: JSON.stringify({ textQuery: query, languageCode: langFor(country), pageSize: 3 }),
    signal: AbortSignal.timeout(12000),
  });
  const data = await res.json();
  if (!res.ok) { console.error('searchText', data); return []; }
  const list = (data.places || []).map((p: any) => ({ id: p.id, name: p.displayName?.text || '', address: p.formattedAddress || '', status: p.businessStatus || '' }));
  // 營業中的排前面，歇業／暫停營業的排後面
  const rank = (s: string) => (s === 'CLOSED_PERMANENTLY' ? 2 : s === 'CLOSED_TEMPORARILY' ? 1 : 0);
  return list.map((c: any, i: number) => ({ c, i })).sort((a: any, b: any) => rank(a.c.status) - rank(b.c.status) || a.i - b.i).map((x: any) => x.c);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));

  // 重新搜尋：使用者改好店名後只查 Google，不讀貼文、不跑 AI
  if (typeof body.query === 'string') {
    const q = body.query.trim().slice(0, 100);
    if (!q) return NextResponse.json({ error: '請先填地點名稱' }, { status: 400 });
    const r = await bump('search', LIMIT_SEARCH);
    if (r !== 'ok') return NextResponse.json({ error: r === 'limit' ? '今日 Google 搜尋次數已用完，明天再試' : r }, { status: r === 'limit' ? 429 : 500 });
    const candidates = await searchGoogle(q, body.country || '');
    return NextResponse.json({ candidates });
  }

  const url = String(body.url || '').trim();
  let host = '';
  try { host = new URL(url).hostname.toLowerCase(); } catch {}
  if (!ALLOWED.includes(host)) return NextResponse.json({ error: '只支援 Instagram / Threads 連結' }, { status: 400 });

  // 掃描模式：只判斷這篇介紹了幾間、每張照片屬於哪一間（不上網搜尋）
  if (body.mode === 'scan') {
    const photos: string[] = (Array.isArray(body.photos) ? body.photos : []).filter((u: any) => typeof u === 'string' && OWN_PHOTO_RE.test(u)).slice(0, 20);
    const readText = body.readText === true;
    const post = await readPost(url);
    const caption = post ? [post.title, post.desc].filter(Boolean).join('\n') : '';
    if (!photos.length && !caption) return NextResponse.json({ places: [], caption: '' });
    const r = await bump('scan', LIMIT_SCAN);
    if (r !== 'ok') return NextResponse.json({ places: [], caption: post?.desc || '', note: r === 'limit' ? '今日多間判斷次數已用完，先當成一間整理' : r });
    try {
      const { places, text } = await scanPlaces(caption, photos, readText);
      console.log('scan', JSON.stringify({ photos: photos.length, places: places.length, readText, textLen: text.length }));
      // 截圖模式：貼文讀得到就用貼文，讀不到就用截圖上抄下來的文字
      return NextResponse.json({ places, caption: post?.desc || text || '', fromShots: !post?.desc && !!text });
    } catch (e: any) {
      console.error('scan', e);
      await refund('scan', LIMIT_SCAN);
      return NextResponse.json({ places: [], caption: post?.desc || '', note: '照片判斷失敗：' + String(e?.message || e).slice(0, 80) });
    }
  }

  let post: any = await readPost(url);
  // 截圖上抄下來的貼文文字（貼文讀不到時用）
  const shotText = typeof body.postText === 'string' ? body.postText.trim().slice(0, 4000) : '';
  const fromShots = !post && !!shotText;
  if (fromShots) post = { title: '', desc: shotText, images: [], og: '', final: url };
  const site = /threads\./i.test(host) ? 'Threads' : 'IG';
  const hasTarget = !!(body.target && typeof body.target.name === 'string' && body.target.name.trim());
  if (!post && !hasTarget) {
    return NextResponse.json({ error: `讀不到這則 ${site} 貼文，可能暫時被擋住，等幾分鐘再按重試；私人帳號的貼文也讀不到` }, { status: 422 });
  }
  // 讀不到貼文、但使用者已經輸入店名 → 跳過貼文，只用店名讓 AI 上網查
  const postMissing = !post;
  if (!post) post = { title: '', desc: `（讀不到這則 ${site} 貼文的內容，請只根據店名上網查資料；recommendations 的 source 一律填 web，note 根據網路上的介紹寫）`, images: [], og: '', final: url };

  // 捷徑已經在手機上抓好原圖時，就不用再抓預覽圖
  const skipImages = body.skipImages === true;
  // 貼文頁只拿到預覽卡時，改去嵌入頁找原始照片
  let picked: string[] = skipImages ? [] : (post.images || []);
  if (!skipImages && (!picked.length || (picked.length === 1 && picked[0] === post.og))) {
    const better = await embedImages(url, post.final || '');
    if (better.length) picked = better;
  }
  console.log('cover final:', skipImages ? 'skipped (shortcut photos)' : picked.length && picked[0] !== post.og ? `embed/html (${picked.length})` : 'og:image');
  // 捷徑在手機上讀貼文時已經存好的照片（Threads 擋伺服器時）直接用
  const saved: string[] = Array.isArray(post.saved) ? post.saved : [];
  const images = Array.from(new Set([...saved, ...(await Promise.all(picked.filter((u: string) => !saved.length || !skipImages).map(saveCover))).filter(Boolean)]));
  const cover = images[0] || '';

  const rAi = await bump('ai', LIMIT_AI);
  if (rAi !== 'ok') {
    return NextResponse.json({ cover, caption: post.desc, error: rAi === 'limit' ? '今日 AI 整理次數已用完，明天再試' : rAi }, { status: rAi === 'limit' ? 429 : 500 });
  }
  let fields: any = {};
  try {
    fields = await askClaude(post, {
      countries: body.countries || [], cities: body.cities || {}, areas: body.areas || {}, types: body.types || [], country: body.country || '',
      target: body.target && typeof body.target.name === 'string' ? { name: body.target.name.slice(0, 80), hint: String(body.target.hint || '').slice(0, 120) } : null,
    }, saved.length ? saved : (String(post.desc || '').length < 200 ? images : []));
  } catch (e: any) {
    await refund('ai', LIMIT_AI);
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
      // 貼文列了好幾間分店：每間分店各搜一次，讓所有分店都出現在候選清單
      const brs: any[] = (Array.isArray(fields.branches_in_post) ? fields.branches_in_post : []).slice(0, 4);
      if (brs.length >= 2) {
        const seen = new Set(candidates.map((c: any) => c.id));
        for (const b of brs) {
          const q = [String(b?.name || ''), String(b?.address || '')].map(x => x.trim()).filter(Boolean).join(' ');
          if (!q || (await bump('search', LIMIT_SEARCH)) !== 'ok') continue;
          const found = await searchGoogle(q, country);
          // 每個分店地址只取最相符的第一筆
          const top = found.find((c: any) => !seen.has(c.id));
          if (top) { seen.add(top.id); candidates.push(top); }
        }
        candidates = candidates.slice(0, 6);
      }
    } else searchNote = rS === 'limit' ? '今日 Google 搜尋次數已用完，地址請手動填寫' : rS;
  }

  return NextResponse.json({ cover, images, caption: postMissing ? '' : post.desc, fields, candidates, searchNote: searchNote || (postMissing ? `讀不到 ${site} 貼文，已改用你輸入的店名查資料` : '') || (fromShots ? '已用截圖上的文字整理' : '') });
}
