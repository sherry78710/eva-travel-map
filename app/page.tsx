'use client'
import { useState, useRef, useEffect } from "react";
import { supabase, Place } from '@/lib/supabase';

// ── Geo data ──────────────────────────────────────────────────────────────────
const GEO: Record<string, Record<string, Record<string, string[]>>> = {
  "韓國": {
    "首爾": {
      "麻浦區": ["弘大","延南","望遠","合井","麻浦","上水"],
      "龍山區": ["梨泰院","漢南","解放村","龍山"],
      "中區":   ["明洞","乙支路","南大門"],
      "鐘路區": ["鐘路","仁寺洞","益善洞","三清洞","北村"],
      "城東區": ["聖水","纛島","往十里"],
      "廣津區": ["建大","紫陽洞"],
      "江南區": ["江南","狎鷗亭","清潭","新沙","林蔭道","三成"],
      "松坡區": ["蠶室","石村湖"],
      "瑞草區": ["瑞草","教大"],
      "東大門區":["東大門","廣藏市場"],
    },
    "釜山": {
      "海雲台區":["海雲台","廣安里","APEC路"],
      "中區":    ["南浦洞","札嘎其"],
      "釜山鎮區":["西面","田浦"],
      "影島區":  ["影島"],
    },
    "濟州": {
      "濟州市":  ["濟州舊市區","涯月","翰林"],
      "西歸浦市":["中文","西歸浦舊市區","城山"],
    },
  },
  "日本": {
    "東京": {
      "新宿區":  ["新宿","下北澤","代代木"],
      "涉谷區":  ["涉谷","原宿","表參道","代官山","中目黑","惠比壽"],
      "中央區":  ["銀座","築地","日本橋"],
      "台東區":  ["淺草","上野","藏前"],
      "千代田區":["秋葉原","神保町","丸之內"],
      "豐島區":  ["池袋","巢鴨"],
      "港區":    ["六本木","麻布十番","台場","赤坂"],
    },
    "大阪": {
      "中央區":  ["道頓堀","心齋橋","難波","黑門市場"],
      "北區":    ["梅田","中崎町","天滿"],
    },
    "京都": {
      "東山區":  ["祇園","清水","八坂"],
      "中京區":  ["河原町","錦市場","四條"],
      "右京區":  ["嵐山","嵯峨"],
    },
    "福岡": {
      "中央區":  ["天神","大名","薬院"],
      "博多區":  ["博多","中洲"],
    },
    "北海道": {
      "札幌市":  ["大通","薄野","円山"],
    },
    "沖繩": {
      "那霸市":  ["國際通","牧志","首里"],
    },
  },
  "台灣": {
    "台北": {
      "信義區":  ["信義","象山","市政府"],
      "大安區":  ["東區","永康街","師大","公館"],
      "中山區":  ["中山","赤峰街","行天宮"],
      "萬華區":  ["西門","龍山寺"],
      "士林區":  ["士林夜市","天母"],
    },
    "台南": {
      "中西區":  ["赤崁樓","神農街","正興街"],
      "安平區":  ["安平","漁光島"],
    },
    "高雄": {
      "鹽埕區":  ["鹽埕","駁二"],
      "苓雅區":  ["瑞豐夜市"],
    },
    "台中": {
      "西區":    ["審計新村","草悟道","勤美"],
      "南屯區":  ["逢甲"],
    },
  },
  "泰國": {
    "曼谷": {
      "素坤逸":  ["素坤逸","通羅","艾卡邁"],
      "是隆":    ["是隆","沙吞","Asok"],
      "考山路":  ["考山路"],
      "察圖察":  ["察圖察週末市場"],
    },
    "清邁": {
      "古城區":  ["古城","三王紀念碑"],
      "尼曼區":  ["尼曼路","Maya商場"],
    },
    "普吉": {
      "芭東":    ["芭東海灘","Bangla Road"],
    },
  },
  "越南": {
    "河內": {
      "還劍區":  ["還劍湖","36條街","老城區"],
    },
    "胡志明市": {
      "第一郡":  ["濱城市場","同起街","西貢"],
      "第三郡":  ["范五老街"],
    },
    "峴港": {
      "海洲郡":  ["美溪海灘","古城區"],
    },
  },
  "新加坡": {
    "新加坡": {
      "烏節路":  ["烏節路","ION","義安城"],
      "濱海灣":  ["濱海灣花園","金沙","魚尾獅"],
      "克拉碼頭":["克拉碼頭","駁船碼頭"],
      "牛車水":  ["牛車水"],
      "聖淘沙":  ["聖淘沙","環球影城"],
    },
  },
  "法國": {
    "巴黎": {
      "第三區":  ["瑪黑區"],
      "第六區":  ["聖日耳曼","盧森堡公園"],
      "第十八區":["蒙馬特","聖心堂"],
      "第八區":  ["香榭麗舍"],
      "第七區":  ["艾菲爾鐵塔周邊"],
    },
  },
  "英國": {
    "倫敦": {
      "西敏市":  ["蘇活","科芬園","牛津街"],
      "肖爾迪奇":["肖爾迪奇","布里克巷"],
      "諾丁山":  ["諾丁山","波多貝羅市場"],
      "南岸":    ["南岸","泰特現代"],
    },
  },
  "義大利": {
    "羅馬": {
      "古羅馬":  ["科洛塞奧","羅馬廣場"],
      "中心":    ["納沃納廣場","萬神殿","西班牙廣場"],
      "梵蒂岡":  ["梵蒂岡","聖彼得廣場"],
    },
    "米蘭": {
      "大教堂":  ["大教堂廣場","艾曼紐二世長廊"],
      "納維利":  ["納維利運河"],
    },
    "威尼斯": {
      "聖馬可":  ["聖馬可廣場","嘆息橋"],
      "里亞托":  ["里亞托橋","魚市場"],
    },
  },
  "香港": {
    "香港島": {
      "中環":    ["中環","蘭桂坊","石板街"],
      "灣仔":    ["灣仔","跑馬地"],
      "銅鑼灣":  ["銅鑼灣","時代廣場"],
      "上環":    ["上環","荷李活道"],
    },
    "九龍": {
      "尖沙咀":  ["尖沙咀","星光大道","廟街"],
      "旺角":    ["旺角","女人街"],
    },
  },
};

const NB_TO_DISTRICT: Record<string, string> = {};
Object.values(GEO).forEach(cities => {
  Object.values(cities).forEach(districts => {
    Object.entries(districts).forEach(([district, nbs]) => {
      nbs.forEach(nb => { NB_TO_DISTRICT[nb] = district; });
    });
  });
});

const COUNTRY_FLAGS: Record<string, string> = {
  "韓國":"🇰🇷","日本":"🇯🇵","台灣":"🇹🇼","法國":"🇫🇷","英國":"🇬🇧",
  "泰國":"🇹🇭","義大利":"🇮🇹","美國":"🇺🇸","新加坡":"🇸🇬","德國":"🇩🇪",
  "越南":"🇻🇳","印尼":"🇮🇩","馬來西亞":"🇲🇾","澳洲":"🇦🇺","香港":"🇭🇰",
  "中國":"🇨🇳","西班牙":"🇪🇸","荷蘭":"🇳🇱","希臘":"🇬🇷","土耳其":"🇹🇷",
};

const INIT_TYPES = ["餐廳","咖啡廳","景點","市場","百貨","購物","酒吧","住宿","其他"];

const STATUS_CFG: Record<string, {label:string,mark:string,iconBg:string,iconColor:string}> = {
  wishlist: { label:"想去", mark:"○", iconBg:"#F2F2F7", iconColor:"#3C3C43" },
  visited:  { label:"去過", mark:"●", iconBg:"#3C3C43", iconColor:"#FFF" },
  favorite: { label:"最愛", mark:"♡", iconBg:"#1C1C1E", iconColor:"#FFF" },
};

function getCities(country: string) { return Object.keys(GEO[country] || {}); }
function getDistricts(country: string, city: string) { return Object.keys((GEO[country] || {})[city] || {}); }
function getNeighborhoods(country: string, city: string, district: string) { return ((GEO[country] || {})[city] || {})[district] || []; }

function PlaceIcon({ status }: { status: string }) {
  const s = STATUS_CFG[status];
  return <div style={{ width:44, height:44, borderRadius:12, background:s.iconBg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, color:s.iconColor, flexShrink:0 }}>{s.mark}</div>;
}

function PlaceRow({ place, onClick }: { place: any, onClick: () => void }) {
  return (
    <button onClick={onClick} style={{ width:"100%", display:"flex", alignItems:"center", gap:14, padding:"14px 16px", background:"none", border:"none", cursor:"pointer", textAlign:"left" }}>
      <PlaceIcon status={place.status} />
      <div style={{ flex:1 }}>
        <div style={{ fontSize:15, fontWeight:600, color:"#000", marginBottom:2 }}>{place.name}</div>
        <div style={{ fontSize:12, color:"#8E8E93" }}>{place.neighborhood} · {(place.types||[])[0]}</div>
        {place.note && <div style={{ fontSize:11, color:"#C7C7CC", marginTop:2, fontStyle:"italic" }}>{place.note}</div>}
        {(place.rating||0) > 0 && (
          <div style={{ fontSize:11, color:"#FF9500", marginTop:2 }}>{"♥".repeat(place.rating)}{"♡".repeat(5-place.rating)}</div>
        )}
      </div>
      <div style={{ fontSize:18, color:"#C7C7CC" }}>›</div>
    </button>
  );
}

function Row({ label, children, last }: { label:string, children:React.ReactNode, last?:boolean }) {
  return (
    <div style={{ display:"flex", alignItems:"center", padding:"14px 16px", borderBottom:last?"none":"1px solid #F2F2F7" }}>
      <span style={{ fontSize:15, color:"#000", width:56, flexShrink:0 }}>{label}</span>
      {children}
      <span style={{ color:"#C7C7CC", fontSize:12, marginLeft:4 }}>›</span>
    </div>
  );
}

function LocationSelector({ country, city, district, neighborhood, countries, onChange }: any) {
  const cities = getCities(country);
  const districts = getDistricts(country, city);
  const neighborhoods = getNeighborhoods(country, city, district);
  const sel: any = { flex:1, border:"none", outline:"none", fontSize:15, color:"#3C3C43", background:"none", fontFamily:"inherit", appearance:"none", cursor:"pointer", textAlign:"right" };
  return (
    <div style={{ background:"#FFF", borderRadius:16, overflow:"hidden", marginBottom:12 }}>
      <Row label="國家">
        <select value={country} onChange={e => {
          const c = e.target.value;
          const fc = getCities(c)[0]||"";
          const fd = getDistricts(c,fc)[0]||"";
          const fn = getNeighborhoods(c,fc,fd)[0]||"";
          onChange({ country:c, city:fc, district:fd, neighborhood:fn });
        }} style={sel}>
          {countries.map((c:string) => <option key={c} value={c}>{c}</option>)}
        </select>
      </Row>
      <Row label="城市">
        {cities.length > 0 ? (
          <select value={city} onChange={e => {
            const c = e.target.value;
            const fd = getDistricts(country,c)[0]||"";
            const fn = getNeighborhoods(country,c,fd)[0]||"";
            onChange({ country, city:c, district:fd, neighborhood:fn });
          }} style={sel}>
            {cities.map((c:string) => <option key={c} value={c}>{c}</option>)}
          </select>
        ) : (
          <input value={city} onChange={e=>onChange({country,city:e.target.value,district,neighborhood})} style={{...sel,border:"none",outline:"none"}} />
        )}
      </Row>
      <Row label="商圈">
        {neighborhoods.length > 0 ? (
          <select value={neighborhood} onChange={e => {
            const nb = e.target.value;
            const auto = NB_TO_DISTRICT[nb] || district;
            onChange({ country, city, district:auto, neighborhood:nb });
          }} style={sel}>
            {neighborhoods.map((n:string) => <option key={n} value={n}>{n}</option>)}
          </select>
        ) : (
          <input value={neighborhood} onChange={e => {
            const nb = e.target.value;
            const auto = NB_TO_DISTRICT[nb] || district;
            onChange({ country, city, district:auto, neighborhood:nb });
          }} style={{...sel,border:"none",outline:"none"}} />
        )}
      </Row>
      <Row label="行政區" last>
        <input value={district} onChange={e=>onChange({country,city,district:e.target.value,neighborhood})}
          style={{...sel,border:"none",outline:"none",color:NB_TO_DISTRICT[neighborhood]?"#8E8E93":"#3C3C43"}} />
        {NB_TO_DISTRICT[neighborhood] && <span style={{ fontSize:10, color:"#C7C7CC", marginLeft:4 }}>自動</span>}
      </Row>
    </div>
  );
}

function Home({ places, countries, countryOrder, onNav, onCountry }: any) {
  const byCountry: Record<string,number> = {};
  places.forEach((p:any) => { byCountry[p.country]=(byCountry[p.country]||0)+1; });
  const orderedActive = countryOrder.filter((c:string) => byCountry[c]);
  const recent = [...places].slice(0,5);
  const total = places.length;
  const visited = places.filter((p:any) => p.status==="visited"||p.status==="favorite").length;
  const wishlist = places.filter((p:any) => p.status==="wishlist").length;

  return (
    <div style={{ minHeight:"100vh", background:"#F2F2F7", animation:"fadeIn 0.2s ease-out" }}>
      <div style={{ background:"#FFF", padding:"52px 20px 16px" }}>
        <div style={{ fontSize:28, fontWeight:700, color:"#000", marginBottom:4 }}>EVA 的旅遊收藏</div>
        <div style={{ fontSize:13, color:"#8E8E93", marginBottom:16 }}>{total} 個收藏・{visited} 去過・{wishlist} 想去</div>
        <div style={{ display:"flex", gap:8, marginBottom:4 }}>
          <button onClick={()=>onNav("add")} style={{ padding:"10px 20px", background:"#000", borderRadius:22, fontSize:14, fontWeight:600, color:"white", border:"none", cursor:"pointer" }}>+ 新增收藏</button>
          <button onClick={()=>onNav("search")} style={{ padding:"10px 18px", background:"#F2F2F7", borderRadius:22, fontSize:14, color:"#000", border:"none", cursor:"pointer" }}>搜尋</button>
          <button onClick={()=>onNav("notes")} style={{ padding:"10px 18px", background:"#F2F2F7", borderRadius:22, fontSize:14, color:"#000", border:"none", cursor:"pointer" }}>備忘錄</button>
          <button onClick={()=>onNav("settings")} style={{ background:"#F2F2F7", border:"none", borderRadius:12, width:38, height:38, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", fontSize:17, flexShrink:0 }}>⚙️</button>
        </div>
      </div>
      <div style={{ padding:"14px 20px 0" }}>
        {orderedActive.length>0 && (
          <>
            <div style={{ fontSize:12, fontWeight:600, color:"#8E8E93", marginBottom:8 }}>國家</div>
            <div style={{ display:"flex", gap:8, overflowX:"auto", marginBottom:16, paddingBottom:2 }}>
              {orderedActive.map((c:string) => (
                <button key={c} onClick={()=>onCountry(c)} style={{ flexShrink:0, background:"#FFF", border:"none", borderRadius:22, padding:"9px 16px", display:"flex", alignItems:"center", gap:7, cursor:"pointer" }}>
                  <span style={{ fontSize:20 }}>{COUNTRY_FLAGS[c]||"🌍"}</span>
                  <span style={{ fontSize:14, fontWeight:600, color:"#000" }}>{c}</span>
                  <span style={{ fontSize:11, color:"#8E8E93" }}>{byCountry[c]}</span>
                </button>
              ))}
            </div>
          </>
        )}
        <div style={{ fontSize:12, fontWeight:600, color:"#8E8E93", marginBottom:8 }}>最近收藏</div>
        <div style={{ background:"#FFF", borderRadius:16, overflow:"hidden" }}>
          {recent.length===0 && <div style={{ padding:"30px 16px", textAlign:"center", color:"#8E8E93", fontSize:14 }}>還沒有收藏，點上方「+ 新增收藏」開始！</div>}
          {recent.map((p:any,i:number) => (
            <div key={p.id} style={{ borderBottom:i<recent.length-1?"1px solid #F2F2F7":"none" }}>
              <PlaceRow place={p} onClick={()=>onNav("detail",p)} />
            </div>
          ))}
        </div>
      </div>
      <div style={{ height:40 }} />
    </div>
  );
}

function CountryPage({ country, places, onBack, onSelect }: any) {
  const [q, setQ] = useState("");
  const [collapsed, setCollapsed] = useState<Record<string,boolean>>({});
  const list = places.filter((p:any) => p.country === country);
  const filtered = q.trim() === "" ? list : list.filter((p:any) => {
    const lq = q.toLowerCase();
    return [p.name, p.neighborhood, p.note||"", ...(p.recommendations||[])].some((s:string) => s.toLowerCase().includes(lq));
  });
  const grouped: Record<string,any[]> = {};
  filtered.forEach((p:any) => {
    const key = p.neighborhood || "其他";
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(p);
  });
  return (
    <div style={{ minHeight:"100vh", background:"#F2F2F7", animation:"fadeIn 0.2s ease-out" }}>
      <div style={{ background:"#FFF", padding:"52px 20px 12px" }}>
        <button onClick={onBack} style={{ background:"none", border:"none", color:"#007AFF", fontSize:16, cursor:"pointer", padding:0, marginBottom:12 }}>‹ 返回</button>
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14 }}>
          <span style={{ fontSize:28 }}>{COUNTRY_FLAGS[country]||"🌍"}</span>
          <div>
            <div style={{ fontSize:22, fontWeight:700, color:"#000" }}>{country}</div>
            <div style={{ fontSize:12, color:"#8E8E93" }}>{list.length} 個收藏</div>
          </div>
        </div>
        <div style={{ display:"flex", gap:8, marginBottom:14 }}>
          {Object.entries(STATUS_CFG).map(([k,s]) => (
            <div key={k} style={{ flex:1, background:"#F2F2F7", borderRadius:12, padding:"10px 0", textAlign:"center" }}>
              <div style={{ fontSize:20, fontWeight:700, color:"#000", lineHeight:1 }}>{list.filter((p:any)=>p.status===k).length}</div>
              <div style={{ fontSize:10, color:"#8E8E93", marginTop:3 }}>{s.mark} {s.label}</div>
            </div>
          ))}
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:10, background:"#F2F2F7", borderRadius:12, padding:"10px 14px" }}>
          <span style={{ fontSize:14, color:"#8E8E93" }}>🔍</span>
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder="搜尋地點、備註..."
            style={{ flex:1, border:"none", outline:"none", fontSize:15, background:"none", color:"#000", fontFamily:"inherit" }} />
          {q && <button onClick={()=>setQ("")} style={{ background:"none", border:"none", color:"#8E8E93", fontSize:16, cursor:"pointer", padding:0 }}>✕</button>}
        </div>
      </div>
      <div style={{ padding:"16px 20px 40px" }}>
        {Object.entries(grouped).map(([nb, nbPlaces]) => {
          const isCollapsed = collapsed[nb];
          return (
            <div key={nb} style={{ marginBottom:16 }}>
              <button onClick={() => setCollapsed(c=>({...c,[nb]:!c[nb]}))} style={{ width:"100%", display:"flex", alignItems:"center", justifyContent:"space-between", background:"none", border:"none", cursor:"pointer", padding:"0 0 8px 0", textAlign:"left" }}>
                <div style={{ fontSize:12, fontWeight:600, color:"#8E8E93" }}>
                  {nb}{nbPlaces[0]?.district ? ` · ${nbPlaces[0].district}` : ""} <span style={{ fontWeight:400 }}>({nbPlaces.length})</span>
                </div>
                <span style={{ fontSize:12, color:"#C7C7CC", transform:isCollapsed?"rotate(-90deg)":"rotate(0deg)", transition:"transform 0.2s" }}>▼</span>
              </button>
              {!isCollapsed && (
                <div style={{ background:"#FFF", borderRadius:16, overflow:"hidden" }}>
                  {nbPlaces.map((p:any,i:number) => (
                    <div key={p.id} style={{ borderBottom:i<nbPlaces.length-1?"1px solid #F2F2F7":"none" }}>
                      <PlaceRow place={p} onClick={()=>onSelect(p)} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        {filtered.length===0 && <div style={{ textAlign:"center", padding:"60px 0", color:"#8E8E93", fontSize:15 }}>沒有符合的地點</div>}
      </div>
    </div>
  );
}

function Add({ onBack, onAdd, countries, types }: any) {
  const firstC = countries[0]||"韓國";
  const firstCity = getCities(firstC)[0]||"";
  const firstDist = getDistricts(firstC,firstCity)[0]||"";
  const firstNb = getNeighborhoods(firstC,firstCity,firstDist)[0]||"";
  const [f,setF] = useState({ name:"",country:firstC,city:firstCity,district:firstDist,neighborhood:firstNb,types:[] as string[],note:"",address:"",recommendations:[] as string[],source_url:"",rating:0,review:"" });
  const [saving, setSaving] = useState(false);
  const set = (k:string,v:any) => setF(x=>({...x,[k]:v}));

  async function handleSave() {
    if (!f.name.trim()) return;
    setSaving(true);
    const { data, error } = await supabase.from('places').insert([{
      name: f.name, country: f.country, city: f.city, district: f.district,
      neighborhood: f.neighborhood, types: f.types, status: 'wishlist',
      note: f.note, address: f.address, recommendations: f.recommendations,
      source_url: f.source_url, rating: f.rating, review: f.review,
    }]).select().single();
    setSaving(false);
    if (!error && data) { onAdd(data); onBack(); }
  }

  return (
    <div style={{ minHeight:"100vh", background:"#F2F2F7", animation:"fadeIn 0.2s ease-out" }}>
      <div style={{ background:"#FFF", padding:"52px 20px 16px", display:"flex", alignItems:"flex-end", justifyContent:"space-between" }}>
        <button onClick={onBack} style={{ background:"none", border:"none", color:"#007AFF", fontSize:16, cursor:"pointer", padding:0 }}>取消</button>
        <div style={{ fontSize:17, fontWeight:600 }}>新增收藏</div>
        <button onClick={handleSave} disabled={saving} style={{ background:"none", border:"none", color:f.name.trim()?"#007AFF":"#C7C7CC", fontSize:16, fontWeight:600, cursor:"pointer", padding:0 }}>{saving?"儲存中...":"儲存"}</button>
      </div>
      <div style={{ padding:"16px 20px 40px" }}>
        <div style={{ background:"#FFF", borderRadius:16, overflow:"hidden", marginBottom:12 }}>
          <div style={{ padding:"14px 16px", borderBottom:"1px solid #F2F2F7" }}>
            <div style={{ fontSize:11, color:"#8E8E93", marginBottom:5, textTransform:"uppercase" as const, letterSpacing:0.5 }}>地點名稱</div>
            <input value={f.name} onChange={e=>set("name",e.target.value)} style={{ width:"100%", border:"none", outline:"none", fontSize:16, color:"#000", background:"none", fontFamily:"inherit" }} />
          </div>
          <div style={{ padding:"14px 16px" }}>
            <div style={{ fontSize:11, color:"#8E8E93", marginBottom:5, textTransform:"uppercase" as const, letterSpacing:0.5 }}>收藏原因</div>
            <input value={f.note} onChange={e=>set("note",e.target.value)} style={{ width:"100%", border:"none", outline:"none", fontSize:16, color:"#000", background:"none", fontFamily:"inherit" }} />
          </div>
        </div>
        <LocationSelector country={f.country} city={f.city} district={f.district} neighborhood={f.neighborhood}
          countries={countries} onChange={({country,city,district,neighborhood}:any)=>setF(x=>({...x,country,city,district,neighborhood}))} />
        <div style={{ background:"#FFF", borderRadius:16, padding:16, marginBottom:12 }}>
          <div style={{ fontSize:11, color:"#8E8E93", marginBottom:10, textTransform:"uppercase" as const, letterSpacing:0.5 }}>類型</div>
          <div style={{ display:"flex", flexWrap:"wrap" as const, gap:8 }}>
            {types.map((t:string) => { const a=f.types.includes(t); return <button key={t} onClick={()=>set("types",a?f.types.filter((x:string)=>x!==t):[...f.types,t])} style={{ padding:"7px 16px", borderRadius:20, border:"none", background:a?"#000":"#F2F2F7", color:a?"white":"#3C3C43", fontSize:14, cursor:"pointer" }}>{t}</button>; })}
          </div>
        </div>
        <div style={{ background:"#FFF", borderRadius:16, overflow:"hidden" }}>
          {[["來源連結","source_url"],["推薦品項","recommendations"],["地址","address"]].map(([label,key],i,arr) => (
            <div key={key} style={{ padding:"14px 16px", borderBottom:i<arr.length-1?"1px solid #F2F2F7":"none" }}>
              <div style={{ fontSize:11, color:"#8E8E93", marginBottom:5, textTransform:"uppercase" as const }}>{label}</div>
              <input value={key==="recommendations"?(f as any)[key].join("、"):(f as any)[key]}
                onChange={e=>set(key,key==="recommendations"?e.target.value.split(/[、,，]/).map((s:string)=>s.trim()).filter(Boolean):e.target.value)}
                style={{ width:"100%", border:"none", outline:"none", fontSize:15, color:"#000", background:"none", fontFamily:"inherit" }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Detail({ place, onBack, onStatusChange, onDelete, onEdit, countries, types }: any) {
  const [editing, setEditing] = useState(false);
  const [f, setF] = useState({...place});
  const [saving, setSaving] = useState(false);
  const q = encodeURIComponent(place.name+" "+(place.address||""));

  async function handleEdit() {
    setSaving(true);
    const { error } = await supabase.from('places').update({
      name:f.name, country:f.country, city:f.city, district:f.district,
      neighborhood:f.neighborhood, types:f.types, note:f.note,
      address:f.address, recommendations:f.recommendations,
      source_url:f.source_url, rating:f.rating, review:f.review,
    }).eq('id', f.id);
    setSaving(false);
    if (!error) { onEdit(f); setEditing(false); }
  }

  if (editing) {
    return (
      <div style={{ minHeight:"100vh", background:"#F2F2F7", animation:"fadeIn 0.2s ease-out" }}>
        <div style={{ background:"#FFF", padding:"52px 20px 16px", display:"flex", alignItems:"flex-end", justifyContent:"space-between" }}>
          <button onClick={()=>{ setF({...place}); setEditing(false); }} style={{ background:"none", border:"none", color:"#007AFF", fontSize:16, cursor:"pointer", padding:0 }}>取消</button>
          <div style={{ fontSize:17, fontWeight:600 }}>編輯</div>
          <button onClick={handleEdit} disabled={saving} style={{ background:"none", border:"none", color:"#007AFF", fontSize:16, fontWeight:600, cursor:"pointer", padding:0 }}>{saving?"儲存中...":"儲存"}</button>
        </div>
        <div style={{ padding:"16px 20px 40px" }}>
          <div style={{ background:"#FFF", borderRadius:16, overflow:"hidden", marginBottom:12 }}>
            <div style={{ padding:"14px 16px", borderBottom:"1px solid #F2F2F7" }}>
              <div style={{ fontSize:11, color:"#8E8E93", marginBottom:5 }}>地點名稱</div>
              <input value={f.name} onChange={e=>setF((x:any)=>({...x,name:e.target.value}))} style={{ width:"100%", border:"none", outline:"none", fontSize:16, color:"#000", background:"none", fontFamily:"inherit" }} />
            </div>
            <div style={{ padding:"14px 16px" }}>
              <div style={{ fontSize:11, color:"#8E8E93", marginBottom:5 }}>收藏原因 / 備註</div>
              <input value={f.note||""} onChange={e=>setF((x:any)=>({...x,note:e.target.value}))} style={{ width:"100%", border:"none", outline:"none", fontSize:16, color:"#000", background:"none", fontFamily:"inherit" }} />
            </div>
          </div>
          <LocationSelector country={f.country} city={f.city} district={f.district||""} neighborhood={f.neighborhood}
            countries={countries} onChange={({country,city,district,neighborhood}:any)=>setF((x:any)=>({...x,country,city,district,neighborhood}))} />
          <div style={{ background:"#FFF", borderRadius:16, padding:16, marginBottom:12 }}>
            <div style={{ fontSize:11, color:"#8E8E93", marginBottom:10 }}>類型</div>
            <div style={{ display:"flex", flexWrap:"wrap" as const, gap:8 }}>
              {types.map((t:string) => { const a=f.types?.includes(t); return <button key={t} onClick={()=>setF((x:any)=>({...x,types:a?x.types.filter((v:string)=>v!==t):[...(x.types||[]),t]}))} style={{ padding:"7px 16px", borderRadius:20, border:"none", background:a?"#000":"#F2F2F7", color:a?"white":"#3C3C43", fontSize:14, cursor:"pointer" }}>{t}</button>; })}
            </div>
          </div>
          <div style={{ background:"#FFF", borderRadius:16, overflow:"hidden", marginBottom:12 }}>
            {[["來源連結","source_url"],["推薦品項","recommendations"],["地址","address"]].map(([label,key],i,arr) => (
              <div key={key} style={{ padding:"14px 16px", borderBottom:i<arr.length-1?"1px solid #F2F2F7":"none" }}>
                <div style={{ fontSize:11, color:"#8E8E93", marginBottom:5 }}>{label}</div>
                <input value={key==="recommendations"?(f[key]||[]).join("、"):f[key]||""}
                  onChange={e=>setF((x:any)=>({...x,[key]:key==="recommendations"?e.target.value.split(/[、,，]/).map((s:string)=>s.trim()).filter(Boolean):e.target.value}))}
                  style={{ width:"100%", border:"none", outline:"none", fontSize:15, color:"#000", background:"none", fontFamily:"inherit" }} />
              </div>
            ))}
          </div>
          <div style={{ background:"#FFF", borderRadius:16, padding:16, marginBottom:12 }}>
            <div style={{ fontSize:11, color:"#8E8E93", marginBottom:10 }}>去過評價</div>
            <div style={{ display:"flex", gap:8, marginBottom:10 }}>
              {[1,2,3,4,5].map(n => (
                <button key={n} onClick={() => setF((x:any)=>({...x,rating:x.rating===n?0:n}))}
                  style={{ fontSize:24, background:"none", border:"none", cursor:"pointer", padding:0, color:n<=(f.rating||0)?"#FF2D55":"#E5E5EA" }}>
                  {n<=(f.rating||0)?"♥":"♡"}
                </button>
              ))}
            </div>
            <textarea value={f.review||""} onChange={e=>setF((x:any)=>({...x,review:e.target.value}))} placeholder="寫下評語..."
              style={{ width:"100%", border:"none", outline:"none", fontSize:15, color:"#000", background:"#F2F2F7", borderRadius:10, padding:"10px 12px", fontFamily:"inherit", resize:"none" as const, minHeight:60, boxSizing:"border-box" as const }} />
          </div>
          <button onClick={async ()=>{ if(window.confirm("確定刪除？")){ await supabase.from('places').delete().eq('id',place.id); onDelete(place.id); } }}
            style={{ width:"100%", padding:15, border:"none", borderRadius:14, background:"#FFF", color:"#FF3B30", fontSize:15, fontWeight:600, cursor:"pointer" }}>
            刪除這筆收藏
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight:"100vh", background:"#F2F2F7", animation:"fadeIn 0.2s ease-out" }}>
      <div style={{ background:"#FFF", padding:"52px 20px 16px", display:"flex", alignItems:"flex-end", justifyContent:"space-between" }}>
        <button onClick={onBack} style={{ background:"none", border:"none", color:"#007AFF", fontSize:16, cursor:"pointer", padding:0 }}>‹ 返回</button>
        <button onClick={()=>setEditing(true)} style={{ background:"none", border:"none", color:"#007AFF", fontSize:15, fontWeight:600, cursor:"pointer", padding:0 }}>編輯</button>
      </div>
      <div style={{ padding:"16px 20px 40px" }}>
        <div style={{ marginBottom:16 }}>
          <div style={{ fontSize:26, fontWeight:700, color:"#000", letterSpacing:-0.5, marginBottom:4 }}>{place.name}</div>
          <div style={{ fontSize:13, color:"#8E8E93" }}>{[place.country,place.city,place.district,place.neighborhood].filter(Boolean).join(" · ")}</div>
          {(place.rating||0)>0 && (
            <div style={{ marginTop:6, display:"flex", alignItems:"center", gap:8 }}>
              <span style={{ fontSize:18, color:"#FF2D55" }}>{"♥".repeat(place.rating)}{"♡".repeat(5-place.rating)}</span>
              <span style={{ fontSize:12, color:"#8E8E93" }}>{["","不推","普通","還好","不錯","超推"][place.rating]}</span>
            </div>
          )}
        </div>
        <div style={{ background:"#FFF", borderRadius:16, padding:8, marginBottom:12, display:"flex", gap:6 }}>
          {Object.entries(STATUS_CFG).map(([k,s]) => (
            <button key={k} onClick={async ()=>{
              await supabase.from('places').update({status:k}).eq('id',place.id);
              onStatusChange(place.id,k);
            }} style={{ flex:1, padding:"10px 0", borderRadius:12, border:"none", background:place.status===k?"#000":"none", color:place.status===k?"white":"#8E8E93", fontSize:13, fontWeight:place.status===k?700:400, cursor:"pointer" }}>{s.mark} {s.label}</button>
          ))}
        </div>
        {(place.status==="visited"||place.status==="favorite") && (
          <div style={{ background:"#FFF", borderRadius:16, padding:"16px", marginBottom:12 }}>
            <div style={{ fontSize:11, color:"#8E8E93", marginBottom:10 }}>去過評價</div>
            <div style={{ display:"flex", gap:8, marginBottom:place.review?10:0 }}>
              {[1,2,3,4,5].map(n => (
                <button key={n} onClick={async ()=>{
                  const newRating = place.rating===n?0:n;
                  await supabase.from('places').update({rating:newRating}).eq('id',place.id);
                  onEdit({...place,rating:newRating});
                }} style={{ fontSize:24, background:"none", border:"none", cursor:"pointer", padding:0, color:n<=(place.rating||0)?"#FF2D55":"#E5E5EA" }}>
                  {n<=(place.rating||0)?"♥":"♡"}
                </button>
              ))}
              {(place.rating||0)>0 && <span style={{ fontSize:12, color:"#8E8E93", alignSelf:"center", marginLeft:4 }}>{["","不推","普通","還好","不錯","超推"][place.rating]}</span>}
            </div>
            {place.review && <div style={{ fontSize:15, color:"#000", lineHeight:1.5 }}>{place.review}</div>}
          </div>
        )}
        <div style={{ background:"#FFF", borderRadius:16, overflow:"hidden", marginBottom:12 }}>
          {(place.types||[]).length>0 && <div style={{ display:"flex", justifyContent:"space-between", padding:"14px 16px", borderBottom:"1px solid #F2F2F7" }}><span style={{ fontSize:15, color:"#000" }}>類型</span><span style={{ fontSize:15, color:"#8E8E93" }}>{place.types.join("・")}</span></div>}
          {(place.recommendations||[]).length>0 && (
            <div style={{ padding:"14px 16px" }}>
              <div style={{ fontSize:13, color:"#8E8E93", marginBottom:8 }}>推薦品項</div>
              <div style={{ display:"flex", gap:6, flexWrap:"wrap" as const }}>
                {place.recommendations.map((r:string) => <span key={r} style={{ fontSize:13, background:"#F2F2F7", borderRadius:8, padding:"4px 12px", color:"#3C3C43" }}>{r}</span>)}
              </div>
            </div>
          )}
        </div>
        {place.note && <div style={{ background:"#FFF", borderRadius:16, padding:"14px 16px", marginBottom:12 }}>
          <div style={{ fontSize:11, color:"#8E8E93", marginBottom:6 }}>收藏原因 / 備註</div>
          <div style={{ fontSize:15, color:"#000", lineHeight:1.5 }}>{place.note}</div>
        </div>}
        {place.source_url && (
          <a href={place.source_url} target="_blank" rel="noreferrer" style={{ display:"block", background:"#FFF", borderRadius:16, overflow:"hidden", marginBottom:12, textDecoration:"none" }}>
            <div style={{ display:"flex", alignItems:"stretch" }}>
              <div style={{ width:80, background:"linear-gradient(135deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, minHeight:70 }}>
                <span style={{ fontSize:28 }}>{place.source_url.includes("instagram")?"📷":place.source_url.includes("youtube")?"▶️":place.source_url.includes("threads")?"🧵":"🔗"}</span>
              </div>
              <div style={{ padding:"12px 14px", flex:1, minWidth:0 }}>
                <div style={{ fontSize:13, fontWeight:600, color:"#000", marginBottom:3 }}>{place.source_url.includes("instagram")?"Instagram":place.source_url.includes("youtube")?"YouTube":place.source_url.includes("threads")?"Threads":"連結"}</div>
                <div style={{ fontSize:11, color:"#007AFF", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{place.source_url}</div>
              </div>
              <div style={{ display:"flex", alignItems:"center", paddingRight:14 }}><span style={{ fontSize:16, color:"#C7C7CC" }}>›</span></div>
            </div>
          </a>
        )}
        <div style={{ background:"#FFF", borderRadius:16, overflow:"hidden", marginBottom:12 }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"14px 16px" }}>
            <div>
              <div style={{ fontSize:11, color:"#8E8E93", marginBottom:3 }}>地址</div>
              <div style={{ fontSize:14, color:"#000" }}>{place.address || "未填寫"}</div>
            </div>
            <div style={{ display:"flex", gap:8 }}>
              <a href={`https://maps.google.com/?q=${q}`} target="_blank" rel="noreferrer"
                style={{ width:36, height:36, borderRadius:10, background:"#fff", display:"flex", alignItems:"center", justifyContent:"center", textDecoration:"none", boxShadow:"0 1px 4px rgba(0,0,0,0.12)", fontSize:20 }}>🗺️</a>
              {place.country==="韓國" && (
                <a href={`https://map.naver.com/v5/search/${q}`} target="_blank" rel="noreferrer"
                  style={{ width:36, height:36, borderRadius:10, background:"#03C75A", display:"flex", alignItems:"center", justifyContent:"center", textDecoration:"none", fontSize:16, color:"white", fontWeight:700 }}>N</a>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Search({ places, onBack, onSelect }: any) {
  const [q,setQ]=useState(""); const [fS,setFS]=useState(""); const [fT,setFT]=useState("");
  const filtered=places.filter((p:any)=>{ const lq=q.toLowerCase(); const mQ=!q||[p.name,p.neighborhood,p.city,p.country,p.note||"",...(p.recommendations||[])].some((s:string)=>s.toLowerCase().includes(lq)); return mQ&&(!fS||p.status===fS)&&(!fT||p.types?.includes(fT)); });
  return (
    <div style={{ minHeight:"100vh", background:"#F2F2F7", animation:"fadeIn 0.2s ease-out" }}>
      <div style={{ background:"#FFF", padding:"52px 16px 12px" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, background:"#F2F2F7", borderRadius:12, padding:"10px 14px", marginBottom:10 }}>
          <span style={{ fontSize:14, color:"#8E8E93" }}>🔍</span>
          <input value={q} onChange={e=>setQ(e.target.value)} autoFocus style={{ flex:1, border:"none", outline:"none", fontSize:16, background:"none", color:"#000", fontFamily:"inherit" }} />
          <button onClick={onBack} style={{ background:"none", border:"none", color:"#007AFF", fontSize:14, cursor:"pointer", padding:0 }}>取消</button>
        </div>
        <div style={{ display:"flex", gap:6, overflowX:"auto" }}>
          {Object.entries(STATUS_CFG).map(([k,s]) => (
            <button key={k} onClick={()=>setFS(fS===k?"":k)} style={{ flexShrink:0, padding:"6px 14px", borderRadius:20, border:"none", background:fS===k?"#000":"#F2F2F7", color:fS===k?"white":"#3C3C43", fontSize:13, cursor:"pointer" }}>{s.mark} {s.label}</button>
          ))}
          {["餐廳","咖啡廳","景點","市場"].map(t => (
            <button key={t} onClick={()=>setFT(fT===t?"":t)} style={{ flexShrink:0, padding:"6px 14px", borderRadius:20, border:"none", background:fT===t?"#000":"#F2F2F7", color:fT===t?"white":"#3C3C43", fontSize:13, cursor:"pointer" }}>{t}</button>
          ))}
        </div>
      </div>
      <div style={{ padding:"12px 20px 0" }}>
        <div style={{ fontSize:12, color:"#8E8E93", marginBottom:8 }}>{filtered.length} 個地點</div>
        <div style={{ background:"#FFF", borderRadius:16, overflow:"hidden" }}>
          {filtered.map((p:any,i:number) => (
            <div key={p.id} style={{ borderBottom:i<filtered.length-1?"1px solid #F2F2F7":"none" }}>
              <PlaceRow place={p} onClick={()=>onSelect(p)} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Notes({ onBack, countries }: any) {
  const [country,setCountry]=useState(countries[0]||"韓國");
  const [notes,setNotes]=useState([
    {id:"1",country:"韓國",category:"交通",content:"T-money 卡在便利商店購買，可搭地鐵和公車"},
    {id:"2",country:"韓國",category:"退稅",content:"消費滿 30,000 韓元可退稅，出境前在機場辦理"},
  ]);
  const [adding,setAdding]=useState(false); const [newCat,setNewCat]=useState("入境"); const [newContent,setNewContent]=useState("");
  const CATS=["入境","交通","退稅","禮儀","緊急聯絡","其他"];
  const filtered=notes.filter((n:any)=>n.country===country);
  const grouped: Record<string,any[]>={};
  filtered.forEach((n:any)=>{ if(!grouped[n.category]) grouped[n.category]=[]; grouped[n.category].push(n); });
  return (
    <div style={{ minHeight:"100vh", background:"#F2F2F7", animation:"fadeIn 0.2s ease-out" }}>
      <div style={{ background:"#FFF", padding:"52px 20px 0" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
          <button onClick={onBack} style={{ background:"none", border:"none", color:"#007AFF", fontSize:16, cursor:"pointer", padding:0 }}>‹ 返回</button>
          <div style={{ fontSize:17, fontWeight:600 }}>國家備忘錄</div>
          <button onClick={()=>setAdding(!adding)} style={{ background:"none", border:"none", color:"#007AFF", fontSize:24, cursor:"pointer", padding:0, lineHeight:1 }}>+</button>
        </div>
        <div style={{ display:"flex", overflowX:"auto" }}>
          {countries.map((c:string) => (
            <button key={c} onClick={()=>setCountry(c)} style={{ flexShrink:0, padding:"10px 16px", border:"none", background:"none", borderBottom:country===c?"2px solid #000":"2px solid transparent", color:country===c?"#000":"#8E8E93", fontSize:14, fontWeight:country===c?600:400, cursor:"pointer" }}>{c}</button>
          ))}
        </div>
      </div>
      {adding && (
        <div style={{ background:"#FFF", margin:"12px 20px 0", borderRadius:16, padding:14 }}>
          <div style={{ display:"flex", gap:6, flexWrap:"wrap" as const, marginBottom:10 }}>
            {CATS.map((c:string) => <button key={c} onClick={()=>setNewCat(c)} style={{ padding:"5px 12px", borderRadius:20, border:"none", background:newCat===c?"#000":"#F2F2F7", color:newCat===c?"white":"#3C3C43", fontSize:13, cursor:"pointer" }}>{c}</button>)}
          </div>
          <textarea value={newContent} onChange={e=>setNewContent(e.target.value)} rows={3}
            style={{ width:"100%", border:"none", borderRadius:10, padding:"10px 12px", fontSize:15, color:"#000", outline:"none", background:"#F2F2F7", resize:"none" as const, fontFamily:"inherit", boxSizing:"border-box" as const, marginBottom:10 }} />
          <div style={{ display:"flex", gap:8 }}>
            <button onClick={()=>setAdding(false)} style={{ flex:1, padding:11, border:"none", borderRadius:12, background:"#F2F2F7", color:"#3C3C43", fontSize:14, cursor:"pointer" }}>取消</button>
            <button onClick={()=>{ if(newContent.trim()){ setNotes((ns:any[])=>[...ns,{id:String(Date.now()),country,category:newCat,content:newContent.trim()}]); setNewContent(""); setAdding(false); }}}
              style={{ flex:2, padding:11, border:"none", borderRadius:12, background:"#000", color:"white", fontSize:14, fontWeight:600, cursor:"pointer" }}>儲存</button>
          </div>
        </div>
      )}
      <div style={{ padding:"12px 20px" }}>
        {filtered.length===0&&<div style={{ textAlign:"center", padding:"60px 0", color:"#8E8E93", fontSize:15 }}>還沒有 {country} 的備忘錄</div>}
        {Object.entries(grouped).map(([cat,catNotes]) => (
          <div key={cat} style={{ marginBottom:14 }}>
            <div style={{ fontSize:11, color:"#8E8E93", letterSpacing:1, textTransform:"uppercase" as const, marginBottom:6 }}>{cat}</div>
            <div style={{ background:"#FFF", borderRadius:16, overflow:"hidden" }}>
              {catNotes.map((n:any,i:number) => (
                <div key={n.id} style={{ display:"flex", alignItems:"flex-start", gap:12, padding:"14px 16px", borderBottom:i<catNotes.length-1?"1px solid #F2F2F7":"none" }}>
                  <div style={{ flex:1, fontSize:15, color:"#000", lineHeight:1.5 }}>{n.content}</div>
                  <button onClick={()=>setNotes((ns:any[])=>ns.filter((x:any)=>x.id!==n.id))} style={{ background:"none", border:"none", cursor:"pointer", color:"#C7C7CC", fontSize:18, padding:0, flexShrink:0 }}>×</button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Settings({ countries, types, countryOrder, onBack, onUpdateCountries, onUpdateTypes, onUpdateOrder }: any) {
  const [tab, setTab] = useState("countries");
  const [newCountry, setNewCountry] = useState("");
  const [newType, setNewType] = useState("");
  const list = countryOrder.filter((c:string) => countries.includes(c));
  return (
    <div style={{ minHeight:"100vh", background:"#F2F2F7", animation:"fadeIn 0.2s ease-out" }}>
      <div style={{ background:"#FFF", padding:"52px 20px 0" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
          <button onClick={onBack} style={{ background:"none", border:"none", color:"#007AFF", fontSize:16, cursor:"pointer", padding:0 }}>‹ 返回</button>
          <div style={{ fontSize:17, fontWeight:600 }}>設定</div>
          <div style={{ width:40 }} />
        </div>
        <div style={{ display:"flex" }}>
          {[["countries","國家"],["types","類別"]].map(([k,l]) => (
            <button key={k} onClick={()=>setTab(k)} style={{ flex:1, padding:"10px 0", border:"none", background:"none", borderBottom:tab===k?"2px solid #000":"2px solid transparent", color:tab===k?"#000":"#8E8E93", fontSize:14, fontWeight:tab===k?600:400, cursor:"pointer" }}>{l}</button>
          ))}
        </div>
      </div>
      <div style={{ padding:"16px 20px 40px" }}>
        {tab==="countries" && (
          <>
            <div style={{ background:"#FFF", borderRadius:16, overflow:"hidden", marginBottom:12 }}>
              {list.map((c:string,i:number) => (
                <div key={c} style={{ display:"flex", alignItems:"center", padding:"14px 16px", borderBottom:i<list.length-1?"1px solid #F2F2F7":"none" }}>
                  <span style={{ fontSize:20, marginRight:10 }}>{COUNTRY_FLAGS[c]||"🌍"}</span>
                  <span style={{ fontSize:15, color:"#000", flex:1 }}>{c}</span>
                  <button onClick={()=>{ onUpdateCountries(countries.filter((x:string)=>x!==c)); onUpdateOrder(countryOrder.filter((x:string)=>x!==c)); }}
                    style={{ background:"none", border:"none", color:"#FF3B30", fontSize:13, cursor:"pointer", padding:0 }}>刪除</button>
                </div>
              ))}
            </div>
            <div style={{ background:"#FFF", borderRadius:16, padding:"12px 16px", display:"flex", gap:10, alignItems:"center" }}>
              <input value={newCountry} onChange={e=>setNewCountry(e.target.value)} placeholder="新增國家"
                style={{ flex:1, border:"none", outline:"none", fontSize:15, color:"#000", background:"none", fontFamily:"inherit" }} />
              <button onClick={()=>{ const c=newCountry.trim(); if(c&&!countries.includes(c)){ onUpdateCountries([...countries,c]); onUpdateOrder([...countryOrder,c]); setNewCountry(""); }}}
                style={{ background:"#000", border:"none", borderRadius:10, padding:"6px 14px", color:"white", fontSize:13, fontWeight:600, cursor:"pointer" }}>新增</button>
            </div>
          </>
        )}
        {tab==="types" && (
          <>
            <div style={{ background:"#FFF", borderRadius:16, overflow:"hidden", marginBottom:12 }}>
              {types.map((t:string,i:number) => (
                <div key={t} style={{ display:"flex", alignItems:"center", padding:"14px 16px", borderBottom:i<types.length-1?"1px solid #F2F2F7":"none" }}>
                  <span style={{ fontSize:15, color:"#000", flex:1 }}>{t}</span>
                  <button onClick={()=>onUpdateTypes(types.filter((x:string)=>x!==t))} style={{ background:"none", border:"none", color:"#FF3B30", fontSize:13, cursor:"pointer", padding:0 }}>刪除</button>
                </div>
              ))}
            </div>
            <div style={{ background:"#FFF", borderRadius:16, padding:"12px 16px", display:"flex", gap:10, alignItems:"center" }}>
              <input value={newType} onChange={e=>setNewType(e.target.value)} placeholder="新增類別"
                style={{ flex:1, border:"none", outline:"none", fontSize:15, color:"#000", background:"none", fontFamily:"inherit" }} />
              <button onClick={()=>{ if(newType.trim()&&!types.includes(newType.trim())){ onUpdateTypes([...types,newType.trim()]); setNewType(""); }}}
                style={{ background:"#000", border:"none", borderRadius:10, padding:"6px 14px", color:"white", fontSize:13, fontWeight:600, cursor:"pointer" }}>新增</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function App() {
  const [places, setPlaces] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [countries, setCountries] = useState(Object.keys(GEO));
  const [countryOrder, setCountryOrder] = useState(Object.keys(GEO));
  const [types, setTypes] = useState(INIT_TYPES);
  const [history, setHistory] = useState(["home"]);
  const [selected, setSelected] = useState<any>(null);
  const [selectedCountry, setSelectedCountry] = useState<string|null>(null);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const isSwiping = useRef(false);
  const [slideX, setSlideX] = useState(0);

  useEffect(() => {
    supabase.from('places').select('*').order('created_at', { ascending: false })
      .then(({ data }) => { if (data) setPlaces(data); setLoading(false); });
  }, []);

  const page = history[history.length-1];

  function nav(dest: string, data?: any) {
    if (data) setSelected(data);
    setHistory(h => [...h, dest]);
  }

  function goBack() {
    setHistory(h => h.length > 1 ? h.slice(0,-1) : h);
  }

  function onTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    isSwiping.current = false;
  }

  function onTouchMove(e: React.TouchEvent) {
    const dx = e.touches[0].clientX - touchStartX.current;
    const dy = e.touches[0].clientY - touchStartY.current;
    if (touchStartX.current < 40 && Math.abs(dx) > Math.abs(dy) && dx > 0) {
      isSwiping.current = true;
      setSlideX(Math.min(dx, 300));
    }
  }

  function onTouchEnd() {
    if (isSwiping.current && slideX > 80 && page !== "home") goBack();
    setSlideX(0);
    isSwiping.current = false;
  }

  if (loading) return (
    <div style={{ maxWidth:430, margin:"0 auto", height:"100vh", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"-apple-system,sans-serif", color:"#8E8E93" }}>
      載入中...
    </div>
  );

  return (
    <div onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
      style={{ maxWidth:430, margin:"0 auto", fontFamily:"-apple-system,'SF Pro Text',sans-serif", background:"#F2F2F7", minHeight:"100vh", position:"relative", overflow:"hidden" }}>
      <style>{`@keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}} *{box-sizing:border-box} ::-webkit-scrollbar{display:none} a{text-decoration:none} button{font-family:inherit} select{-webkit-appearance:none;appearance:none}`}</style>
      <div style={{ transform:slideX>0?`translateX(${slideX}px)`:"none", transition:slideX===0?"transform 0.25s ease":"none" }}>
        {page==="home"&&<Home places={places} countries={countries} countryOrder={countryOrder} onNav={nav} onCountry={(c:string)=>{setSelectedCountry(c);setHistory(h=>[...h,"country"]);}} />}
        {page==="add"&&<Add onBack={goBack} onAdd={(p:any)=>setPlaces(ps=>[p,...ps])} countries={countries} types={types} />}
        {page==="country"&&<CountryPage country={selectedCountry} places={places} onBack={goBack} onSelect={(p:any)=>{setSelected(p);setHistory(h=>[...h,"detail"]);}} />}
        {page==="search"&&<Search places={places} onBack={goBack} onSelect={(p:any)=>{setSelected(p);setHistory(h=>[...h,"detail"]);}} />}
        {page==="notes"&&<Notes onBack={goBack} countries={countries} />}
        {page==="settings"&&<Settings countries={countries} types={types} countryOrder={countryOrder} onBack={goBack} onUpdateCountries={setCountries} onUpdateTypes={setTypes} onUpdateOrder={setCountryOrder} />}
        {page==="detail"&&selected&&(
          <Detail place={selected} onBack={goBack} countries={countries} types={types}
            onStatusChange={(id:string,s:string)=>{setPlaces(ps=>ps.map(p=>p.id===id?{...p,status:s}:p));setSelected((prev:any)=>({...prev,status:s}));}}
            onEdit={(u:any)=>{setPlaces(ps=>ps.map(p=>p.id===u.id?u:p));setSelected(u);}}
            onDelete={(id:string)=>{setPlaces(ps=>ps.filter(p=>p.id!==id));setHistory(["home"]);}} />
        )}
      </div>
    </div>
  );
}
