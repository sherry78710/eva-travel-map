// 設定 → 資料整理：幫沒有 Google 編號的舊收藏補上編號
// 用店名＋地址去 Google 找；地址和店名都對得上 → 自動補上；其他列出來讓使用者確認
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
  { global: { fetch: (input: any, init?: any) => fetch(input, { ...init, cache: 'no-store' }) } }
);
const LIMIT_BACKFILL = 120; // 每天最多搜尋幾次（獨立計數）
const PER_RUN = 40;         // 一次最多處理幾筆，避免超過 60 秒

function langFor(country: string) {
  if (country === '韓國') return 'ko';
  if (country === '日本') return 'ja';
  if (country === '中國') return 'zh-CN';
  if (country === '台灣' || country === '香港' || country === '澳門') return 'zh-TW';
  return 'en';
}
// ── 重複收藏判斷：店名、地址整理後再比對（韓國、台灣的舊資料大多沒有 Google 編號）──
function normName(s:any){
  return String(s||'').replace(/[（(][^）)]*[）)]/g,'').replace(/[\s・·\-–—_.,，。、'"「」『』!！?？]/g,'').toLowerCase();
}
function normAddr(s:any){
  let t = String(s||'').toLowerCase();
  t = t.replace(/[０-９]/g,(c:string)=>String.fromCharCode(c.charCodeAt(0)-0xFEE0)).replace(/[－ー−‐―–—]/g,'-');
  t = t.replace(/日本|韓國|韓国|대한민국|台灣|台湾|臺灣|taiwan|japan|south korea|korea/g,'');
  t = t.replace(/〒?\d{3}-\d{4}/g,'');
  // 樓層先拿掉（要在去空格之前，不然「123 1층」會黏成「1231층」）
  t = t.replace(/(^|[\s号號,，])b?\d+\s*(f|階|층|樓|楼)(?=$|[\s,，])/g,'$1');
  t = t.replace(/丁目|番地|番/g,'-').replace(/[号號]/g,'');
  t = t.replace(/[\s,，、]/g,'').replace(/-+/g,'-').replace(/-$/,'');
  return t;
}
// 地址的「核心」：韓國取道路名＋門牌，其他取最後一組門牌號碼和它前面兩個字
function addrKey(s:any){
  const t = normAddr(s);
  if(/[가-힣]/.test(t)){
    // 韓國：去掉「市／區（구、군）」前面的部分，只留「道路名＋門牌」
    let r = t.replace(/^.*(구|군)(?=[가-힣])/,'');
    if(r===t) r = t.replace(/^.*시(?=[가-힣])/,'');
    const kr = r.match(/^([가-힣0-9]+?(?:로|길)(?:\d+번?길)?)(\d+(?:-\d+)?)/);
    if(kr) return 'kr:'+kr[1]+kr[2];
  }
  const m = t.match(/([^\d-]{2})(\d+(?:-\d+){1,3})(?!.*\d+-\d)/);
  return m ? m[1]+m[2] : '';
}
function addrMatch(a:any, b:any){
  const A = normAddr(a), B = normAddr(b);
  if(!A || !B) return false;
  const [s,l] = A.length<=B.length ? [A,B] : [B,A];
  if(s.length>=10 && /\d/.test(s) && l.includes(s)) return true;
  const ka = addrKey(a), kb = addrKey(b);
  return !!ka && ka===kb;
}
function nameSim(a:any, b:any){
  const A = normName(a), B = normName(b);
  if(!A || !B) return false;
  if(A===B) return true;
  return Math.min(A.length,B.length)>=2 && (A.includes(B) || B.includes(A));
}

async function searchGoogle(query: string, country: string) {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key || !query) return [];
  const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'X-Goog-Api-Key': key, 'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.businessStatus,places.location' },
    body: JSON.stringify({ textQuery: query, languageCode: langFor(country), pageSize: 3 }),
    signal: AbortSignal.timeout(12000),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) { console.error('backfill searchText', data); return []; }
  return (data.places || []).map((p: any) => ({ id: p.id, name: p.displayName?.text || '', address: p.formattedAddress || '', status: p.businessStatus || '', lat: p.location?.latitude, lng: p.location?.longitude }));
}

// 兩個座標的距離（公尺）
function distM(a: any, b: any) {
  if (a?.lat == null || b?.lat == null) return null;
  const R = 6371000, toR = (x: number) => x * Math.PI / 180;
  const dLat = toR(b.lat - a.lat), dLng = toR(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toR(a.lat)) * Math.cos(toR(b.lat)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)));
}

// ── 檢查歇業：重新查一次所有有 Google 編號的收藏（含分店）的營業狀態 ──
const LIMIT_STATUS = 200;
async function checkStatus() {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) return NextResponse.json({ error: '缺少 GOOGLE_PLACES_API_KEY' }, { status: 500 });
  const { data: all, error } = await sb.from('places').select('id,name,google_place_id,branches,business_status');
  if (error) return NextResponse.json({ error: '讀取收藏失敗：' + error.message }, { status: 500 });
  const rows = (all || []).filter((p: any) => p.google_place_id);
  const closed: any[] = [], reopened: any[] = [];
  let checked = 0, stoppedByLimit = false;
  async function one(p: any) {
    const { data: ok } = await sb.rpc('bump_usage', { p_kind: 'statuscheck', p_limit: LIMIT_STATUS, p_n: 1 });
    if (ok !== true) { stoppedByLimit = true; return; }
    try {
      const res = await fetch(`https://places.googleapis.com/v1/places/${p.google_place_id}`, {
        headers: { 'X-Goog-Api-Key': key as string, 'X-Goog-FieldMask': 'id,businessStatus,location' }, cache: 'no-store', signal: AbortSignal.timeout(12000),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { console.error('status check', p.id, d?.error?.message); return; }
      const st = d.businessStatus || '';
      checked++;
      const upd: any = { business_status: st || null, status_checked_at: new Date().toISOString() };
      if (d.location?.latitude != null) { upd.lat = d.location.latitude; upd.lng = d.location.longitude; } // 順便存座標（之後排行程用）
      await sb.from('places').update(upd).eq('id', p.id);
      if (st === 'CLOSED_PERMANENTLY' || st === 'CLOSED_TEMPORARILY') closed.push({ id: p.id, name: p.name, status: st });
      else if (p.business_status && p.business_status !== 'OPERATIONAL' && st === 'OPERATIONAL') reopened.push({ id: p.id, name: p.name });
    } catch (e) { console.error('status check', p.id, e); }
  }
  for (let i = 0; i < rows.length && !stoppedByLimit; i += 5) await Promise.all(rows.slice(i, i + 5).map(one));
  console.log('status check', JSON.stringify({ total: rows.length, checked, closed: closed.length }));
  return NextResponse.json({ checked, total: rows.length, noId: (all || []).length - rows.length, closed, reopened, more: stoppedByLimit });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  if (body?.mode === 'status') return checkStatus();
  const { data: all, error } = await sb.from('places').select('id,name,summary,country,city,address,google_place_id');
  if (error) return NextResponse.json({ error: '讀取收藏失敗：' + error.message }, { status: 500 });
  const usedIds = new Set((all || []).map((p: any) => p.google_place_id).filter(Boolean));
  const todo = (all || []).filter((p: any) => !p.google_place_id && String(p.name || '').trim());
  const batch = todo.slice(0, PER_RUN);

  const applied: any[] = [], review: any[] = [], notFound: any[] = [];
  let stoppedByLimit = false;

  async function one(p: any) {
    const { data: ok } = await sb.rpc('bump_usage', { p_kind: 'backfill', p_limit: LIMIT_BACKFILL, p_n: 1 });
    if (ok !== true) { stoppedByLimit = true; return; }
    const nm = String(p.summary || p.name || '').trim();
    const q = [nm, p.address || p.city || ''].filter(Boolean).join(' ').slice(0, 120);
    const cands = await searchGoogle(q, p.country || '');
    if (!cands.length) { notFound.push({ id: p.id, name: p.name }); return; }
    // 用「你存的地址」找出它在地圖上的位置，再跟候選店家比距離
    // （韓國有道路名、地號兩種地址，字面對不上，但位置一樣）
    let here: any = null;
    if (p.address && (await sb.rpc('bump_usage', { p_kind: 'backfill', p_limit: LIMIT_BACKFILL, p_n: 1 })).data === true) {
      const g = await searchGoogle(String(p.address).slice(0, 120), p.country || '');
      if (g[0]?.lat != null) here = { lat: g[0].lat, lng: g[0].lng };
    }
    cands.forEach((c: any) => { c.dist = distM(here, c); });
    const nameOk = (c: any) => nameSim(p.name, c.name) || nameSim(nm, c.name);
    const near = (c: any) => c.dist != null && c.dist <= 150;
    const sure = cands.find((c: any) => !usedIds.has(c.id) && (
      (p.address && addrMatch(p.address, c.address) && nameOk(c)) ||   // 地址一樣＋店名像
      (near(c) && nameOk(c)) ||                                       // 150 公尺內＋店名像
      (near(c) && c === cands[0] && cands.filter(near).length === 1)    // 150 公尺內只有這一間，而且是第一筆
    ));
    if (sure) {
      const { error: e } = await sb.from('places').update({ google_place_id: sure.id, business_status: sure.status || null, status_checked_at: new Date().toISOString(), lat: sure.lat ?? null, lng: sure.lng ?? null }).eq('id', p.id);
      if (!e) { usedIds.add(sure.id); applied.push({ id: p.id, name: p.name, cand: sure }); return; }
    }
    // 需要確認的：近的排前面
    cands.sort((a: any, b: any) => (a.dist ?? 1e9) - (b.dist ?? 1e9));
    review.push({ id: p.id, name: p.name, address: p.address || '', cands });
  }
  // 5 筆一組同時查
  for (let i = 0; i < batch.length && !stoppedByLimit; i += 5) {
    await Promise.all(batch.slice(i, i + 5).map(one));
  }
  console.log('backfill', JSON.stringify({ todo: todo.length, applied: applied.length, review: review.length, notFound: notFound.length }));
  return NextResponse.json({ applied, review, notFound, more: stoppedByLimit || todo.length > batch.length });
}
