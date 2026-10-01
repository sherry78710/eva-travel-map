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
      try { const u = new URL(decodeEntities(m[1].replace(/\\\//g, '/')), base).toString(); if (u !== base) return u; } catch {}
    }
  }
  return '';
}

async function readPost(url: string) {
  const tries: Record<string, string>[] = [
    { 'User-Agent': 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)' },
    {},
    { 'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' },
  ];
  const isThreads = /threads\.(com|net)/i.test(url);
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

async function askClaude(post: { title: string; desc: string }, ctx: any) {
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
- 所有說明文字用繁體中文。查不到就照貼文內容填，不要編造。`;
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
貼文內容: ${post.desc}${targetNote}`;
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001', max_tokens: 2500, system,
      // 店名已確定（照片讀到、使用者指定、多間店模式）→ 不用再搜「是哪間店」，上限 2 次；要用猜的 → 上限 4 次
      tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: target ? 2 : 4 }],
      messages: [{ role: 'user', content: user }],
    }),
    signal: AbortSignal.timeout(50000),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || 'AI 呼叫失敗');
  // 只看最後一次搜尋結果之後的文字，JSON 在那裡
  const blocks: any[] = data.content || [];
  let lastTool = -1;
  blocks.forEach((b, i) => { if (b.type === 'web_search_tool_result' || b.type === 'server_tool_use') lastTool = i; });
  const text = blocks.slice(lastTool + 1).map((c: any) => c.type === 'text' ? c.text : '').join('').replace(/```json|```/g, '').trim();
  const start = text.indexOf('{'), end = text.lastIndexOf('}');
  if (start < 0 || end <= start) throw new Error('AI 沒有回傳可用的資料');
  try { return JSON.parse(text.slice(start, end + 1)); }
  catch { throw new Error('AI 回傳格式錯誤'); }
}

// ── 看照片＋內文：這篇介紹了幾間店？每張照片屬於哪一間？ ──
// 店名常常印在照片上（不在內文），所以要讓 AI 看圖
const OWN_PHOTO_RE = /^https:\/\/[^/]+\/storage\/v1\/object\/public\/photos\//;
async function scanPlaces(caption: string, photos: string[]) {
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
  const system = `你是旅遊美食收藏助理。判斷這則 IG / Threads 貼文介紹了哪些實體店家或景點。店名常常印在照片上的小字（例如「📍店名」），也可能寫在內文。
只輸出一個 JSON 物件，不要任何其他文字、不要 Markdown：
{"places":[{"name":"店名，照照片或內文上的寫法","hint":"照片上或內文對這間的說明（推薦什麼、特色、分店），照原文，60 字內","photos":[這間店的照片編號，從 1 開始]}]}
規則：
- 依貼文出現的順序列出，最多 20 間。只列實體店家或景點，不要列城市、商圈、品牌總稱。
- 每張照片最多屬於一間店。照片上沒寫店名時，依前後照片和畫面判斷屬於哪一間；判斷不出來就不要放進任何一間。
- 封面、總覽、拼貼圖這類不屬於單一間店的照片，不要放進任何一間。
- 同一間店出現多次（例如照片 3、4、5 都是同一間），合併成一筆，photos 列出全部。
- 整篇只介紹一間店，就只回傳一筆。
- name 一定是店家本身的名稱。人名（藝人、網紅、貼文作者）不是店名；「員瑛同款燒肉」「銀座的燒肉店」這種描述也不是店名。照片和內文都看不到真正的店名時，name 填空字串。
- 照片裡有 Google 地圖、Naver 地圖、Tabelog 這類「店家卡片截圖」時，以卡片上的店名為準（最可靠）。卡片同時有外文和當地語言店名時，name 用當地語言的寫法（日本用日文、韓國用韓文），例如「近江うし焼肉 にくTATSU 銀座店」。`;
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 2000, system, messages: [{ role: 'user', content }] }),
    signal: AbortSignal.timeout(40000),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || 'AI 呼叫失敗');
  const text = (data.content || []).map((c: any) => c.type === 'text' ? c.text : '').join('').replace(/```json|```/g, '').trim();
  const a = text.indexOf('{'), b = text.lastIndexOf('}');
  if (a < 0 || b <= a) throw new Error('AI 沒有回傳可用的資料');
  const j = JSON.parse(text.slice(a, b + 1));
  const used = new Set<number>();
  return (Array.isArray(j.places) ? j.places : []).slice(0, 20).map((p: any) => {
    const idx = (Array.isArray(p.photos) ? p.photos : []).map((n: any) => Math.round(Number(n))).filter((n: number) => n >= 1 && n <= photos.length && !used.has(n));
    idx.forEach((n: number) => used.add(n));
    return { name: String(p.name || '').trim().slice(0, 80), hint: String(p.hint || '').trim().slice(0, 120), photos: idx };
  }).filter((p: any) => p.name);
}

async function searchGoogle(query: string, country: string) {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key || !query) return [];
  const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'X-Goog-Api-Key': key,
      'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress',
    },
    body: JSON.stringify({ textQuery: query, languageCode: langFor(country), pageSize: 3 }),
    signal: AbortSignal.timeout(12000),
  });
  const data = await res.json();
  if (!res.ok) { console.error('searchText', data); return []; }
  return (data.places || []).map((p: any) => ({ id: p.id, name: p.displayName?.text || '', address: p.formattedAddress || '' }));
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
    const post = await readPost(url);
    const caption = post ? [post.title, post.desc].filter(Boolean).join('\n') : '';
    if (!photos.length && !caption) return NextResponse.json({ places: [], caption: '' });
    const r = await bump('scan', LIMIT_SCAN);
    if (r !== 'ok') return NextResponse.json({ places: [], caption: post?.desc || '', note: r === 'limit' ? '今日多間判斷次數已用完，先當成一間整理' : r });
    try {
      const places = await scanPlaces(caption, photos);
      console.log('scan', JSON.stringify({ photos: photos.length, places: places.length }));
      return NextResponse.json({ places, caption: post?.desc || '' });
    } catch (e: any) {
      console.error('scan', e);
      await refund('scan', LIMIT_SCAN);
      return NextResponse.json({ places: [], caption: post?.desc || '', note: '照片判斷失敗：' + String(e?.message || e).slice(0, 80) });
    }
  }

  const post = await readPost(url);
  if (!post) {
    const site = /threads\./i.test(host) ? 'Threads' : 'IG';
    return NextResponse.json({ error: `讀不到這則 ${site} 貼文，可能暫時被擋住，等幾分鐘再按重試；私人帳號的貼文也讀不到` }, { status: 422 });
  }

  // 捷徑已經在手機上抓好原圖時，就不用再抓預覽圖
  const skipImages = body.skipImages === true;
  // 貼文頁只拿到預覽卡時，改去嵌入頁找原始照片
  let picked: string[] = skipImages ? [] : (post.images || []);
  if (!skipImages && (!picked.length || (picked.length === 1 && picked[0] === post.og))) {
    const better = await embedImages(url, post.final || '');
    if (better.length) picked = better;
  }
  console.log('cover final:', skipImages ? 'skipped (shortcut photos)' : picked.length && picked[0] !== post.og ? `embed/html (${picked.length})` : 'og:image');
  const images = (await Promise.all(picked.map(saveCover))).filter(Boolean);
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
    });
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

  return NextResponse.json({ cover, images, caption: post.desc, fields, candidates, searchNote });
}
