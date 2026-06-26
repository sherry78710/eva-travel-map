'use client'
import { useState, useRef, useEffect } from "react";
import { createClient } from '@supabase/supabase-js';

// ── Supabase client ───────────────────────────────────────────────────────────
const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

// ── Geo data with district mapping ────────────────────────────────────────────
const GEO = {
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
      "世田谷區":["下北澤","三軒茶屋","自由之丘"],
      "杉並區":  ["吉祥寺","荻窪"],
    },
    "大阪": {
      "中央區":  ["道頓堀","心齋橋","難波","黑門市場"],
      "北區":    ["梅田","中崎町","天滿"],
      "天王寺區":["天王寺","新世界"],
      "福島區":  ["福島"],
    },
    "京都": {
      "東山區":  ["祇園","清水","八坂"],
      "中京區":  ["河原町","錦市場","四條"],
      "右京區":  ["嵐山","嵯峨"],
      "伏見區":  ["伏見稻荷","伏見桃山"],
      "上京區":  ["北野","西陣"],
    },
    "福岡": {
      "中央區":  ["天神","大名","薬院"],
      "博多區":  ["博多","中洲"],
    },
    "北海道": {
      "札幌市":  ["大通","薄野","円山"],
      "函館市":  ["元町","灣區"],
      "小樽市":  ["小樽運河"],
    },
    "沖繩": {
      "那霸市":  ["國際通","牧志","首里"],
      "北部":    ["美麗海水族館周邊","名護"],
    },
    "奈良": {
      "奈良市":  ["奈良公園","東大寺周邊","近鐵奈良"],
    },
    "神戶": {
      "中央區":  ["三宮","北野","元町","南京町"],
    },
  },
  "台灣": {
    "台北": {
      "信義區":  ["信義","象山","市政府","微風廣場"],
      "大安區":  ["東區","永康街","師大","公館","敦化"],
      "中山區":  ["中山","赤峰街","行天宮","林森"],
      "萬華區":  ["西門","龍山寺","剝皮寮"],
      "松山區":  ["饒河","南京","五分埔","東區"],
      "士林區":  ["士林夜市","天母","陽明山"],
      "北投區":  ["北投","新北投溫泉"],
      "內湖區":  ["內湖","大湖"],
    },
    "台南": {
      "中西區":  ["赤崁樓","神農街","正興街","海安路"],
      "東區":    ["大東夜市","崇善路"],
      "安平區":  ["安平","漁光島"],
      "北區":    ["花園夜市"],
    },
    "高雄": {
      "鹽埕區":  ["鹽埕","駁二"],
      "前金區":  ["六合夜市"],
      "苓雅區":  ["瑞豐夜市"],
      "左營區":  ["左營","蓮池潭"],
      "前鎮區":  ["夢時代","高雄展覽館"],
    },
    "台中": {
      "西區":    ["審計新村","草悟道","勤美"],
      "北區":    ["一中街"],
      "南屯區":  ["逢甲"],
      "西屯區":  ["七期","大遠百"],
    },
    "花蓮": {
      "花蓮市":  ["東大門夜市","自強夜市"],
      "壽豐鄉":  ["鯉魚潭","雲山水"],
    },
    "宜蘭": {
      "羅東鎮":  ["羅東夜市","羅東林業文化園區"],
      "礁溪鄉":  ["礁溪溫泉"],
    },
  },
  "中國": {
    "上海": {
      "黃浦區":  ["外灘","南京路","豫園","新天地"],
      "靜安區":  ["南京西路","靜安寺","梅泰恒"],
      "徐匯區":  ["衡山路","田子坊","徐家匯"],
      "長寧區":  ["古北","中山公園"],
      "浦東新區":["陸家嘴","張江","世紀公園"],
    },
    "北京": {
      "東城區":  ["天安門","王府井","南鑼鼓巷","故宮周邊"],
      "西城區":  ["西單","什剎海","大柵欄"],
      "朝陽區":  ["三里屯","國貿","望京","798"],
      "海淀區":  ["中關村","圓明園周邊","頤和園周邊"],
    },
    "成都": {
      "錦江區":  ["春熙路","太古里","東大街"],
      "武侯區":  ["寬窄巷子","錦里","玉林"],
      "青羊區":  ["文殊院","琴台路"],
    },
    "廣州": {
      "越秀區":  ["北京路","上下九"],
      "天河區":  ["天河城","珠江新城"],
      "荔灣區":  ["沙面","陳家祠"],
    },
    "深圳": {
      "南山區":  ["海岸城","蛇口"],
      "福田區":  ["華強北","益田假日廣場"],
      "羅湖區":  ["東門","羅湖商業城"],
    },
    "杭州": {
      "上城區":  ["西湖","河坊街","清河坊"],
      "拱墅區":  ["大運河","小河直街"],
      "西湖區":  ["靈隱寺","龍井"],
    },
  },
  "泰國": {
    "曼谷": {
      "巴吞旺縣":["暹羅","奇隆","Central World"],
      "是隆":    ["是隆","沙吞","Asok"],
      "考山路":  ["考山路","拉差達門"],
      "素坤逸":  ["素坤逸","通羅","艾卡邁","On Nut"],
      "察圖察":  ["察圖察週末市場"],
      "唐人街":  ["耀華力路"],
    },
    "清邁": {
      "古城區":  ["古城","三王紀念碑","週日夜市"],
      "尼曼區":  ["尼曼路","Maya商場"],
      "夜市區":  ["週六夜市","週日夜市"],
    },
    "芭達雅": {
      "中天區":  ["中天海灘","步行街"],
      "芭達雅":  ["芭達雅海灘","Second Road"],
    },
    "普吉": {
      "芭東":    ["芭東海灘","Bangla Road"],
      "卡隆":    ["卡隆海灘"],
      "奈漢":    ["奈漢海灘"],
    },
    "蘇梅島": {
      "蘇梅":    ["查汶海灘","拉邁海灘","納通"],
    },
  },
  "越南": {
    "河內": {
      "還劍區":  ["還劍湖","36條街","老城區"],
      "西湖區":  ["西湖","鎮國寺"],
      "巴廷區":  ["胡志明陵寢","文廟"],
    },
    "胡志明市": {
      "第一郡":  ["濱城市場","同起街","西貢"],
      "第三郡":  ["范五老街"],
      "第七郡":  ["富美興"],
      "平盛郡":  ["潮州街"],
    },
    "峴港": {
      "海洲郡":  ["美溪海灘","古城區"],
      "山茶半島":["巴拿山","靈應寺"],
    },
    "會安": {
      "會安古城":["古城","來遠橋","夜市"],
    },
    "芽莊": {
      "芽莊市":  ["芽莊海灘","珍珠島"],
    },
  },
  "柬埔寨": {
    "暹粒": {
      "吳哥窟周邊":["吳哥窟","巴戎廟","女王宮"],
      "市區":    ["夜市","酒吧街","老市場"],
    },
    "金邊": {
      "金邊市區":["獨立紀念碑","王宮","中央市場"],
      "河岸區":  ["西薩瓦特碼頭"],
    },
  },
  "新加坡": {
    "新加坡": {
      "烏節路":  ["烏節路","ION","義安城"],
      "濱海灣":  ["濱海灣花園","金沙","魚尾獅"],
      "克拉碼頭":["克拉碼頭","駁船碼頭","河岸"],
      "牛車水":  ["牛車水","麥士威熟食中心"],
      "小印度":  ["小印度","慕達發購物中心"],
      "甘榜格南":["阿拉伯街","蘇丹回教堂"],
      "聖淘沙":  ["聖淘沙","環球影城","名勝世界"],
    },
  },
  "馬來西亞": {
    "吉隆坡": {
      "武吉免登":["武吉免登","Pavilion","星光大道"],
      "KLCC":    ["雙峰塔","KLCC公園","蘇里亞"],
      "茨廠街":  ["茨廠街","中央市場"],
      "孟沙":    ["孟沙","Bangsar Village"],
    },
    "檳城": {
      "喬治市":  ["喬治市古城","牛干冬","亞美尼亞街"],
      "峇都丁宜":["峇都丁宜海灘"],
    },
  },
  "印尼": {
    "峇里島": {
      "庫塔":    ["庫塔海灘","雷根","水明漾"],
      "烏布":    ["烏布皇宮","猴子森林","烏布市場"],
      "水明漾":  ["水明漾","雙子湖"],
      "金巴蘭":  ["金巴蘭海灘","夕陽餐廳"],
      "努沙杜瓦":["努沙杜瓦海灘","水上運動"],
    },
    "雅加達": {
      "中央雅加達":["莫納斯","科塔"],
      "南雅加達": ["Kemang","Senopati","SCBD"],
    },
  },
  "法國": {
    "巴黎": {
      "第三區":  ["瑪黑區"],
      "第六區":  ["聖日耳曼","盧森堡公園"],
      "第十八區":["蒙馬特","聖心堂"],
      "第八區":  ["香榭麗舍","奧斯曼","Grand Palais"],
      "第七區":  ["艾菲爾鐵塔周邊","奧賽博物館"],
      "第一區":  ["盧浮宮周邊","杜樂麗花園"],
      "第四區":  ["瑪黑","西堤島","巴黎聖母院"],
    },
    "尼斯": {
      "老城":    ["老城","英國人散步大道"],
      "尼斯市區":["花市","現代藝術博物館"],
    },
    "里昂": {
      "老里昂":  ["老城","富維耶山"],
      "貝魯斯":  ["貝魯斯半島","共和廣場"],
    },
  },
  "英國": {
    "倫敦": {
      "西敏市":  ["蘇活","科芬園","騎士橋","牛津街"],
      "肖爾迪奇":["肖爾迪奇","布里克巷","老街"],
      "諾丁山":  ["諾丁山","波多貝羅市場"],
      "切爾西":  ["切爾西","國王路","斯隆廣場"],
      "南岸":    ["南岸","泰特現代","波羅市場"],
      "格林威治":["格林威治","天文台"],
      "坎登":    ["坎登市場","坎登鎖"],
    },
    "愛丁堡": {
      "老城":    ["皇家一英里","愛丁堡城堡"],
      "新城":    ["王子街","喬治街"],
    },
  },
  "義大利": {
    "羅馬": {
      "特拉斯提弗列":["特拉斯提弗列"],
      "古羅馬":  ["科洛塞奧","羅馬廣場","帕拉蒂尼山"],
      "中心":    ["納沃納廣場","萬神殿","西班牙廣場"],
      "梵蒂岡":  ["梵蒂岡","聖彼得廣場"],
    },
    "米蘭": {
      "布雷拉":  ["布雷拉","斯卡拉廣場"],
      "納維利":  ["納維利運河"],
      "大教堂":  ["大教堂廣場","艾曼紐二世長廊"],
    },
    "佛羅倫斯": {
      "市中心":  ["主教座堂廣場","舊宮","老橋"],
      "奧爾特":  ["奧爾特阿諾","彼蒂宮"],
    },
    "威尼斯": {
      "聖馬可":  ["聖馬可廣場","嘆息橋"],
      "里亞托":  ["里亞托橋","魚市場"],
      "多爾索杜羅":["學院橋","佩姬古根漢"],
    },
  },
  "西班牙": {
    "巴塞隆納": {
      "哥德區":  ["哥德區","蘭布拉大道","波蓋利亞市場"],
      "格拉西亞":["格拉西亞大道","聖家堂周邊"],
      "波布雷諾":["波布雷諾","22@科技區"],
      "海濱":    ["巴塞羅內塔海灘","奧林匹克港"],
    },
    "馬德里": {
      "中心":    ["太陽門廣場","馬約爾廣場","普拉多博物館"],
      "馬拉薩尼亞":["馬拉薩尼亞","胡諾塔"],
      "切胡埃卡":["切胡埃卡","富恩卡拉爾街"],
    },
  },
  "德國": {
    "柏林": {
      "米特區":  ["博物館島","亞歷山大廣場","御林廣場"],
      "普倫茨勞貝格":["普倫茨勞貝格","博克斯哈根廣場"],
      "克羅伊茨貝格":["克羅伊茨貝格","土耳其市場"],
      "夏洛滕堡":["選帝侯大街","夏洛滕堡宮"],
    },
    "慕尼黑": {
      "市中心":  ["瑪利亞廣場","維克圖阿連市場","英國花園"],
      "施瓦賓":  ["施瓦賓","大學區"],
    },
  },
  "美國": {
    "紐約": {
      "曼哈頓":  ["時代廣場","SOHO","下東城","上西城","哈林區"],
      "布魯克林":["威廉斯堡","DUMBO","公園坡"],
      "皇后區":  ["法拉盛","阿斯托利亞"],
    },
    "洛杉磯": {
      "好萊塢":  ["好萊塢大道","日落大道"],
      "聖塔莫尼卡":["聖塔莫尼卡海灘","主街"],
      "威尼斯":  ["威尼斯海灘","阿伯特金尼大道"],
      "市中心":  ["市中心","小東京","藝術區"],
    },
    "拉斯維加斯": {
      "拉斯維加斯大道":["賭城大道","弗里蒙特街"],
    },
  },
  "澳洲": {
    "雪梨": {
      "市中心":  ["歌劇院周邊","岩石區","達令港"],
      "邦迪":    ["邦迪海灘","邦迪到庫吉步道"],
      "牛津街":  ["牛津街","帕丁頓"],
    },
    "墨爾本": {
      "市中心":  ["聯合廣場","弗林德斯街站","皇家拱廊"],
      "菲茨羅伊":["菲茨羅伊","史密斯街"],
      "聖基爾達":["聖基爾達海灘","埃克萊斯頓街"],
    },
  },
  "香港": {
    "香港島": {
      "中環":    ["中環","蘭桂坊","石板街"],
      "灣仔":    ["灣仔","跑馬地"],
      "銅鑼灣":  ["銅鑼灣","時代廣場","維多利亞公園"],
      "上環":    ["上環","荷李活道","西營盤"],
      "赤柱":    ["赤柱海灘","赤柱市場"],
    },
    "九龍": {
      "尖沙咀":  ["尖沙咀","星光大道","廟街"],
      "旺角":    ["旺角","女人街","花園街"],
      "深水埗":  ["深水埗","鴨寮街"],
    },
    "新界": {
      "沙田":    ["沙田","沙田市集"],
      "大嶼山":  ["東涌","昂坪"],
    },
  },
};


// Build neighborhood→district lookup
const NB_TO_DISTRICT = {};
Object.values(GEO).forEach(cities => {
  Object.values(cities).forEach(districts => {
    Object.entries(districts).forEach(([district, nbs]) => {
      nbs.forEach(nb => { NB_TO_DISTRICT[nb] = district; });
    });
  });
});

const COUNTRY_FLAGS = {
  "韓國":"🇰🇷","日本":"🇯🇵","台灣":"🇹🇼","法國":"🇫🇷","英國":"🇬🇧",
  "泰國":"🇹🇭","義大利":"🇮🇹","美國":"🇺🇸","新加坡":"🇸🇬","德國":"🇩🇪",
  "柬埔寨":"🇰🇭","越南":"🇻🇳","印尼":"🇮🇩","馬來西亞":"🇲🇾","菲律賓":"🇵🇭",
  "澳洲":"🇦🇺","紐西蘭":"🇳🇿","加拿大":"🇨🇦","墨西哥":"🇲🇽","巴西":"🇧🇷",
  "西班牙":"🇪🇸","葡萄牙":"🇵🇹","荷蘭":"🇳🇱","瑞士":"🇨🇭","瑞典":"🇸🇪",
  "捷克":"🇨🇿","奧地利":"🇦🇹","希臘":"🇬🇷","土耳其":"🇹🇷","埃及":"🇪🇬",
  "印度":"🇮🇳","中國":"🇨🇳","香港":"🇭🇰","澳門":"🇲🇴","蒙古":"🇲🇳",
};

const INIT_TYPES = ["餐廳","咖啡廳","景點","市場","百貨","購物","酒吧","住宿","其他"];

const PLACES_INIT = [
  { id:"1", name:"麵首爾 Myeon Seoul", country:"韓國", city:"首爾", district:"江南區", neighborhood:"狎鷗亭", types:["餐廳"], status:"favorite", note:"金度潤開的", recommendations:["招牌麵"], address:"首爾市江南區狎鷗亭", source_url:"", rating:5, review:"湯頭清爽，麵條彈牙，舒服又莫名好吃", photos:[] },
  { id:"2", name:"Cafe Layered", country:"韓國", city:"首爾", district:"麻浦區", neighborhood:"望遠洞", types:["咖啡廳"], status:"visited", note:"已去過，超好吃", recommendations:["草莓千層"], address:"", source_url:"", rating:4, review:"草莓千層超好吃，空間也很舒服", photos:[] },
  { id:"3", name:"望遠市場", country:"韓國", city:"首爾", district:"麻浦區", neighborhood:"望遠洞", types:["市場"], status:"wishlist", note:"七月水蜜桃季節", recommendations:["水蜜桃","醬蟹"], address:"", source_url:"", rating:0, review:"", photos:[] },
  { id:"4", name:"道頓堀", country:"日本", city:"大阪", district:"中央區", neighborhood:"道頓堀", types:["景點","餐廳"], status:"visited", note:"晚上最美", recommendations:["章魚燒"], address:"", source_url:"", rating:4, review:"晚上的霓虹燈超美，章魚燒好吃", photos:[] },
  { id:"5", name:"清水寺", country:"日本", city:"京都", district:"東山區", neighborhood:"清水", types:["景點"], status:"wishlist", note:"", recommendations:[], address:"", source_url:"", rating:0, review:"", photos:[] },
  { id:"6", name:"台南11", country:"台灣", city:"台南", district:"中西區", neighborhood:"赤崁樓", types:["餐廳"], status:"wishlist", note:"朋友推薦", recommendations:[], address:"", source_url:"", rating:0, review:"", photos:[] },
];

const STATUS_CFG = {
  wishlist: { label:"想去", mark:"○", iconBg:"#EDE8E2", iconColor:"#3C3C43" },
  visited:  { label:"去過", mark:"●", iconBg:"#3C3C43", iconColor:"#FFF" },
  favorite: { label:"最愛", mark:"♡", iconBg:"#1C1C1E", iconColor:"#FFF" },
};

function getCities(country) { return Object.keys(GEO[country] || {}); }
function getDistricts(country, city) { return Object.keys((GEO[country] || {})[city] || {}); }
function getNeighborhoods(country, city, district) { return ((GEO[country] || {})[city] || {})[district] || []; }

function PlaceIcon({ status }) {
  const s = STATUS_CFG[status];
  return <div style={{ width:44, height:44, borderRadius:12, background:s.iconBg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, color:s.iconColor, flexShrink:0 }}>{s.mark}</div>;
}

function PlaceRow({ place, onClick }) {
  const coverPhoto = place.photos?.[0];
  return (
    <button onClick={onClick} style={{ width:"100%", display:"flex", alignItems:"center", gap:14, padding:"14px 16px", background:"none", border:"none", cursor:"pointer", textAlign:"left" }}>
      {coverPhoto ? (
        <div style={{ width:44, height:44, borderRadius:12, overflow:"hidden", flexShrink:0 }}>
          <img src={coverPhoto} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
        </div>
      ) : (
        <PlaceIcon status={place.status} />
      )}
      <div style={{ flex:1 }}>
        <div style={{ fontSize:15, fontWeight:600, color:"#000", marginBottom:2 }}>{place.name}</div>
        <div style={{ fontSize:12, color:"#8E8E93" }}>{place.neighborhood} · {place.types[0]}</div>
        {place.note && <div style={{ fontSize:11, color:"#C7C7CC", marginTop:2, fontStyle:"italic" }}>{place.note}</div>}
        {place.rating > 0 && (
          <div style={{ fontSize:11, color:"#FF9500", marginTop:2 }}>{"\u2665".repeat(place.rating)}{"\u2661".repeat(5-place.rating)}</div>
        )}
      </div>
      <div style={{ fontSize:18, color:"#C7C7CC" }}>›</div>
    </button>
  );
}

// ── Location Selector ─────────────────────────────────────────────────────────
function LocationSelector({ country, city, district, neighborhood, countries, geoData, onChange }) {
  const cities = getCities(country);
  const districts = getDistricts(country, city);
  const neighborhoods = getNeighborhoods(country, city, district);

  const sel = { flex:1, border:"none", outline:"none", fontSize:15, color:"#3C3C43", background:"none", fontFamily:"inherit", appearance:"none", cursor:"pointer", textAlign:"right" };

  return (
    <div style={{ background:"#FDF8F3", borderRadius:16, overflow:"hidden", marginBottom:12 }}>
      {/* Country */}
      <Row label="國家">
        <select value={country} onChange={e => {
          const c = e.target.value;
          const firstCity = getCities(c)[0]||"";
          const firstDist = getDistricts(c, firstCity)[0]||"";
          const firstNb = getNeighborhoods(c, firstCity, firstDist)[0]||"";
          onChange({ country:c, city:firstCity, district:firstDist, neighborhood:firstNb });
        }} style={sel}>
          {countries.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </Row>
      {/* City */}
      <Row label="城市">
        {cities.length > 0 ? (
          <select value={city} onChange={e => {
            const c = e.target.value;
            const firstDist = getDistricts(country, c)[0]||"";
            const firstNb = getNeighborhoods(country, c, firstDist)[0]||"";
            onChange({ country, city:c, district:firstDist, neighborhood:firstNb });
          }} style={sel}>
            {cities.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        ) : (
          <input value={city} onChange={e=>onChange({country,city:e.target.value,district,neighborhood})} style={{ ...sel, border:"none", outline:"none" }} />
        )}
      </Row>
      {/* Neighborhood — auto-fills district */}
      <Row label="商圈">
        {neighborhoods.length > 0 ? (
          <select value={neighborhood} onChange={e => {
            const nb = e.target.value;
            const auto = NB_TO_DISTRICT[nb] || district;
            onChange({ country, city, district:auto, neighborhood:nb });
          }} style={sel}>
            {neighborhoods.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        ) : (
          <input value={neighborhood} onChange={e => {
            const nb = e.target.value;
            const auto = NB_TO_DISTRICT[nb] || district;
            onChange({ country, city, district:auto, neighborhood:nb });
          }} style={{ ...sel, border:"none", outline:"none" }} />
        )}
      </Row>
      {/* District — auto-filled, but editable */}
      <Row label="行政區" last>
        <input value={district} onChange={e=>onChange({country,city,district:e.target.value,neighborhood})}
          style={{ ...sel, border:"none", outline:"none", color: NB_TO_DISTRICT[neighborhood] ? "#8E8E93" : "#3C3C43" }} />
        {NB_TO_DISTRICT[neighborhood] && <span style={{ fontSize:10, color:"#C7C7CC", marginLeft:4 }}>自動</span>}
      </Row>
    </div>
  );
}

function Row({ label, children, last }) {
  return (
    <div style={{ display:"flex", alignItems:"center", padding:"14px 16px", borderBottom:last?"none":"1px solid #EDE8E2" }}>
      <span style={{ fontSize:15, color:"#000", width:56, flexShrink:0 }}>{label}</span>
      {children}
      <span style={{ color:"#C7C7CC", fontSize:12, marginLeft:4 }}>›</span>
    </div>
  );
}

// ── Rating component ──────────────────────────────────────────────────────────
function RatingRow({ rating, review, onChange }) {
  return (
    <div style={{ background:"#FDF8F3", borderRadius:16, padding:"16px", marginBottom:12 }}>
      <div style={{ fontSize:11, color:"#8E8E93", marginBottom:10, textTransform:"uppercase", letterSpacing:0.5 }}>去過評價</div>
      <div style={{ display:"flex", gap:8, marginBottom:12 }}>
        {[1,2,3,4,5].map(n => (
          <button key={n} onClick={() => onChange({ rating: rating===n ? 0 : n, review })}
            style={{ fontSize:24, background:"none", border:"none", cursor:"pointer", padding:0, color: n<=rating ? "#FF2D55" : "#E5E5EA" }}>
            {n<=rating ? "♥" : "♡"}
          </button>
        ))}
        {rating > 0 && <span style={{ fontSize:12, color:"#8E8E93", alignSelf:"center", marginLeft:4 }}>{["","不推","普通","還好","不錯","超推"][rating]}</span>}
      </div>
      <textarea value={review} onChange={e=>onChange({rating,review:e.target.value})} placeholder="寫下你的評語..."
        style={{ width:"100%", border:"none", outline:"none", fontSize:15, color:"#000", background:"#F5F0EB", borderRadius:10, padding:"10px 12px", fontFamily:"inherit", resize:"none", minHeight:60, boxSizing:"border-box" }} />
    </div>
  );
}

// ── Settings ──────────────────────────────────────────────────────────────────
// ── Geo Editor ───────────────────────────────────────────────────────────────
function GeoEditor({ countries, geoData, onUpdateGeo }) {
  const [expandedCountry, setExpandedCountry] = useState(null);
  const [expandedCity, setExpandedCity] = useState(null);
  const [newCity, setNewCity] = useState("");
  const [newNb, setNewNb] = useState("");
  const [newDist, setNewDist] = useState("");

  function addCity(country) {
    const city = newCity.trim();
    if (!city) return;
    const updated = { ...geoData, [country]: { ...(geoData[country]||{}), [city]: {} } };
    onUpdateGeo(updated);
    setNewCity("");
  }

  function deleteCity(country, city) {
    const updated = { ...geoData, [country]: { ...(geoData[country]||{}) } };
    delete updated[country][city];
    onUpdateGeo(updated);
    setExpandedCity(null);
  }

  function addNb(country, city) {
    const nb = newNb.trim();
    const dist = newDist.trim() || "其他";
    if (!nb) return;
    const cityData = geoData[country]?.[city] || {};
    const distNbs = cityData[dist] || [];
    if (distNbs.includes(nb)) return;
    const updated = { ...geoData, [country]: { ...(geoData[country]||{}), [city]: { ...cityData, [dist]: [...distNbs, nb] } } };
    onUpdateGeo(updated);
    setNewNb("");
  }

  function deleteNb(country, city, dist, nb) {
    const cityData = geoData[country]?.[city] || {};
    const updated = { ...geoData, [country]: { ...(geoData[country]||{}), [city]: { ...cityData, [dist]: (cityData[dist]||[]).filter(x=>x!==nb) } } };
    onUpdateGeo(updated);
  }

  return (
    <>
      <div style={{ fontSize:12, color:"#8E8E93", marginBottom:8 }}>點選國家展開，可新增或刪除城市和商圈</div>
      {countries.map(c => {
        const cityData = geoData[c] || {};
        const cities = Object.keys(cityData);
        return (
          <div key={c} style={{ marginBottom:10 }}>
            <button onClick={() => setExpandedCountry(expandedCountry===c?null:c)}
              style={{ width:"100%", background:"#FDF8F3", border:"none", borderRadius:16, padding:"14px 16px", display:"flex", alignItems:"center", justifyContent:"space-between", cursor:"pointer" }}>
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <span style={{ fontSize:20 }}>{COUNTRY_FLAGS[c]||"🌍"}</span>
                <span style={{ fontSize:15, fontWeight:600, color:"#000" }}>{c}</span>
              </div>
              <span style={{ fontSize:12, color:"#C7C7CC" }}>{cities.length} 個城市 {expandedCountry===c?"▲":"▼"}</span>
            </button>

            {expandedCountry===c && (
              <div style={{ background:"#FDF8F3", borderRadius:16, marginTop:6, overflow:"hidden" }}>
                {/* Add city row */}
                <div style={{ display:"flex", gap:8, padding:"12px 16px", borderBottom:"1px solid #EDE8E2" }}>
                  <input value={newCity} onChange={e=>setNewCity(e.target.value)} placeholder="新增城市"
                    style={{ flex:1, border:"none", outline:"none", fontSize:14, color:"#000", background:"#F5F0EB", borderRadius:8, padding:"6px 10px", fontFamily:"inherit" }} />
                  <button onClick={()=>addCity(c)} style={{ background:"#000", border:"none", borderRadius:8, padding:"6px 12px", color:"white", fontSize:13, fontWeight:600, cursor:"pointer" }}>+ 城市</button>
                </div>

                {cities.map((city, ci) => (
                  <div key={city} style={{ borderBottom:ci<cities.length-1?"1px solid #EDE8E2":"none" }}>
                    <div style={{ display:"flex", alignItems:"center", padding:"12px 16px" }}>
                      <button onClick={() => setExpandedCity(expandedCity===`${c}:${city}`?null:`${c}:${city}`)}
                        style={{ flex:1, background:"none", border:"none", textAlign:"left", cursor:"pointer", fontSize:14, color:"#000" }}>
                        {city} <span style={{ fontSize:11, color:"#C7C7CC" }}>({Object.values(cityData[city]||{}).flat().length} 商圈)</span>
                      </button>
                      <button onClick={()=>deleteCity(c,city)} style={{ background:"none", border:"none", color:"#FF3B30", fontSize:12, cursor:"pointer", padding:0 }}>刪除</button>
                    </div>

                    {expandedCity===`${c}:${city}` && (
                      <div style={{ background:"#F9F9F9", padding:"10px 16px 14px 20px", borderTop:"1px solid #EDE8E2" }}>
                        {Object.entries(cityData[city]||{}).map(([dist, nbs]) => (
                          <div key={dist} style={{ marginBottom:8 }}>
                            <div style={{ fontSize:11, color:"#8E8E93", marginBottom:4 }}>{dist}</div>
                            <div style={{ display:"flex", flexWrap:"wrap", gap:4 }}>
                              {nbs.map(nb => (
                                <div key={nb} style={{ display:"flex", alignItems:"center", gap:3, background:"#FDF8F3", borderRadius:8, padding:"3px 8px" }}>
                                  <span style={{ fontSize:12, color:"#3C3C43" }}>{nb}</span>
                                  <button onClick={()=>deleteNb(c,city,dist,nb)} style={{ background:"none", border:"none", color:"#C7C7CC", fontSize:11, cursor:"pointer", padding:0, lineHeight:1 }}>×</button>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                        {/* Add neighborhood */}
                        <div style={{ display:"flex", gap:6, marginTop:8 }}>
                          <input value={newDist} onChange={e=>setNewDist(e.target.value)} placeholder="行政區（選填）"
                            style={{ width:100, border:"none", outline:"none", fontSize:12, color:"#000", background:"#FDF8F3", borderRadius:8, padding:"5px 8px", fontFamily:"inherit" }} />
                          <input value={newNb} onChange={e=>setNewNb(e.target.value)} placeholder="新增商圈"
                            style={{ flex:1, border:"none", outline:"none", fontSize:12, color:"#000", background:"#FDF8F3", borderRadius:8, padding:"5px 8px", fontFamily:"inherit" }} />
                          <button onClick={()=>addNb(c,city)} style={{ background:"#000", border:"none", borderRadius:8, padding:"5px 10px", color:"white", fontSize:12, fontWeight:600, cursor:"pointer" }}>+</button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}

function Settings({ countries, types, countryOrder, geoData, onBack, onUpdateCountries, onUpdateTypes, onUpdateOrder, onUpdateGeo }) {
  const [tab, setTab] = useState("countries");
  const [expandedCountry, setExpandedCountry] = useState(null);
  const [expandedCity, setExpandedCity] = useState(null);
  const [newCountry, setNewCountry] = useState("");
  const [newType, setNewType] = useState("");
  const [dragIdx, setDragIdx] = useState(null);
  const [dragY, setDragY] = useState(0);
  const [overIdx, setOverIdx] = useState(null);
  const [dragIdxT, setDragIdxT] = useState(null);
  const [dragYT, setDragYT] = useState(0);
  const [overIdxT, setOverIdxT] = useState(null);
  const touchStartY = useRef(0);
  const touchStartYT = useRef(0);
  const ITEM_H = 52;

  function onTouchStartT(e, i) {
    e.preventDefault();
    touchStartYT.current = e.touches[0].clientY;
    setDragIdxT(i); setDragYT(0); setOverIdxT(i);
  }
  function onTouchMoveT(e) {
    if (dragIdxT===null) return;
    e.preventDefault();
    const dy = e.touches[0].clientY - touchStartYT.current;
    setDragYT(dy);
    setOverIdxT(Math.max(0, Math.min(types.length-1, dragIdxT+Math.round(dy/ITEM_H))));
  }
  function onTouchEndT() {
    if (dragIdxT!==null && overIdxT!==null && dragIdxT!==overIdxT) {
      const newTypes=[...types]; const [m]=newTypes.splice(dragIdxT,1); newTypes.splice(overIdxT,0,m);
      onUpdateTypes(newTypes);
    }
    setDragIdxT(null); setDragYT(0); setOverIdxT(null);
  }

  const list = countryOrder.filter(c=>countries.includes(c));

  function onTouchStart(e, i) {
    e.preventDefault();
    touchStartY.current = e.touches[0].clientY;
    setDragIdx(i); setDragY(0); setOverIdx(i);
  }
  function onTouchMove(e) {
    if (dragIdx===null) return;
    e.preventDefault();
    const dy = e.touches[0].clientY - touchStartY.current;
    setDragY(dy);
    setOverIdx(Math.max(0, Math.min(list.length-1, dragIdx+Math.round(dy/ITEM_H))));
  }
  function onTouchEnd() {
    if (dragIdx!==null && overIdx!==null && dragIdx!==overIdx) {
      const newOrder=[...list]; const [m]=newOrder.splice(dragIdx,1); newOrder.splice(overIdx,0,m);
      onUpdateOrder(newOrder);
    }
    setDragIdx(null); setDragY(0); setOverIdx(null);
  }

  return (
    <div style={{ minHeight:"100vh", background:"#F5F0EB", animation:"fadeIn 0.2s ease-out" }}>
      <div style={{ background:"#FDF8F3", paddingTop:"calc(env(safe-area-inset-top) + 16px)", paddingBottom:"0", paddingLeft:"20px", paddingRight:"20px" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
          <button onClick={onBack} style={{ background:"none", border:"none", color:"#007AFF", fontSize:16, cursor:"pointer", padding:0 }}>‹ 返回</button>
          <div style={{ fontSize:17, fontWeight:600 }}>設定</div>
          <div style={{ width:40 }} />
        </div>
        <div style={{ display:"flex" }}>
          {[["countries","國家"],["types","類別"],["geo","城市商圈"]].map(([k,l]) => (
            <button key={k} onClick={()=>setTab(k)} style={{ flex:1, padding:"10px 0", border:"none", background:"none", borderBottom:tab===k?"2px solid #000":"2px solid transparent", color:tab===k?"#000":"#8E8E93", fontSize:14, fontWeight:tab===k?600:400, cursor:"pointer" }}>{l}</button>
          ))}
        </div>
      </div>

      <div style={{ padding:"16px 20px 40px" }}>
        {tab==="countries" && (
          <>
            <div style={{ fontSize:12, color:"#8E8E93", marginBottom:8 }}>按住 ⠿ 拖拉調整首頁順序</div>
            <div style={{ background:"#FDF8F3", borderRadius:16, overflow:"hidden", marginBottom:12 }}>
              {list.map((c,i) => {
                const isDragging = dragIdx===i;
                let ty = 0;
                if (dragIdx!==null && !isDragging) {
                  if (dragIdx<overIdx && i>dragIdx && i<=overIdx) ty=-ITEM_H;
                  else if (dragIdx>overIdx && i<dragIdx && i>=overIdx) ty=ITEM_H;
                }
                return (
                  <div key={c} style={{ display:"flex", alignItems:"center", padding:"14px 16px", borderBottom:i<list.length-1?"1px solid #EDE8E2":"none", background:isDragging?"#F0F7FF":"#FFF", transform:isDragging?`translateY(${dragY}px) scale(1.02)`:`translateY(${ty}px)`, transition:isDragging?"none":"transform 0.2s ease", boxShadow:isDragging?"0 4px 16px rgba(0,0,0,0.1)":"none", position:"relative", zIndex:isDragging?10:1, userSelect:"none" }}>
                    <span style={{ fontSize:20, marginRight:10 }}>{COUNTRY_FLAGS[c]||"🌍"}</span>
                    <span style={{ fontSize:15, color:"#000", flex:1 }}>{c}</span>
                    <span onTouchStart={e=>onTouchStart(e,i)} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
                      style={{ fontSize:18, color:"#C7C7CC", marginRight:14, padding:"0 6px", touchAction:"none" }}>⠿</span>
                    <button onClick={()=>{ onUpdateCountries(countries.filter(x=>x!==c)); onUpdateOrder(countryOrder.filter(x=>x!==c)); }}
                      style={{ background:"none", border:"none", color:"#FF3B30", fontSize:13, cursor:"pointer", padding:0 }}>刪除</button>
                  </div>
                );
              })}
            </div>
            <div style={{ background:"#FDF8F3", borderRadius:16, overflow:"hidden" }}>
              <div style={{ display:"flex", padding:"12px 16px", gap:10, alignItems:"center", borderBottom:"1px solid #EDE8E2" }}>
                <input value={newCountry} onChange={e=>setNewCountry(e.target.value)} placeholder=""
                  style={{ flex:1, border:"none", outline:"none", fontSize:15, color:"#000", background:"none", fontFamily:"inherit" }} />
                <button onClick={()=>{ const c=newCountry.trim(); if(c&&!countries.includes(c)){ onUpdateCountries([...countries,c]); onUpdateOrder([...countryOrder,c]); setNewCountry(""); }}}
                  style={{ background:"#000", border:"none", borderRadius:10, padding:"6px 14px", color:"white", fontSize:13, fontWeight:600, cursor:"pointer" }}>新增</button>
              </div>
              <div style={{ padding:"10px 16px", fontSize:12, color:"#8E8E93" }}>
                {newCountry && !COUNTRY_FLAGS[newCountry.trim()] && (
                  <span>💡 若無預設旗幟，可輸入 emoji 旗幟加在國家名稱後，例：「寮國🇱🇦」</span>
                )}
                {newCountry && COUNTRY_FLAGS[newCountry.trim()] && (
                  <span>旗幟預覽：{COUNTRY_FLAGS[newCountry.trim()]} {newCountry}</span>
                )}
              </div>
            </div>
          </>
        )}

        {tab==="types" && (
          <>
            <div style={{ fontSize:12, color:"#8E8E93", marginBottom:8 }}>按住 ⠿ 拖拉調整順序</div>
            <div style={{ background:"#FDF8F3", borderRadius:16, overflow:"hidden", marginBottom:12 }}>
              {types.map((t, i) => {
                const isDraggingT = dragIdxT===i;
                let tyT = 0;
                if (dragIdxT!==null && !isDraggingT) {
                  if (dragIdxT<overIdxT && i>dragIdxT && i<=overIdxT) tyT=-ITEM_H;
                  else if (dragIdxT>overIdxT && i<dragIdxT && i>=overIdxT) tyT=ITEM_H;
                }
                return (
                  <div key={t} style={{ display:"flex", alignItems:"center", padding:"14px 16px", borderBottom:i<types.length-1?"1px solid #EDE8E2":"none", background:isDraggingT?"#F0F7FF":"#FFF", transform:isDraggingT?`translateY(${dragYT}px) scale(1.02)`:`translateY(${tyT}px)`, transition:isDraggingT?"none":"transform 0.2s ease", boxShadow:isDraggingT?"0 4px 16px rgba(0,0,0,0.1)":"none", position:"relative", zIndex:isDraggingT?10:1, userSelect:"none" }}>
                    <span style={{ fontSize:15, color:"#000", flex:1 }}>{t}</span>
                    <span
                      onTouchStart={e=>onTouchStartT(e,i)}
                      onTouchMove={onTouchMoveT}
                      onTouchEnd={onTouchEndT}
                      style={{ fontSize:18, color:"#C7C7CC", marginRight:14, padding:"0 6px", touchAction:"none" }}>⠿</span>
                    <button onClick={()=>onUpdateTypes(types.filter(x=>x!==t))} style={{ background:"none", border:"none", color:"#FF3B30", fontSize:13, cursor:"pointer", padding:0 }}>刪除</button>
                  </div>
                );
              })}
            </div>
            <div style={{ background:"#FDF8F3", borderRadius:16, padding:"12px 16px", display:"flex", gap:10, alignItems:"center" }}>
              <input value={newType} onChange={e=>setNewType(e.target.value)} placeholder="新增類別"
                style={{ flex:1, border:"none", outline:"none", fontSize:15, color:"#000", background:"none", fontFamily:"inherit" }} />
              <button onClick={()=>{ if(newType.trim()&&!types.includes(newType.trim())){ onUpdateTypes([...types,newType.trim()]); setNewType(""); }}}
                style={{ background:"#000", border:"none", borderRadius:10, padding:"6px 14px", color:"white", fontSize:13, fontWeight:600, cursor:"pointer" }}>新增</button>
            </div>
          </>
        )}
        {tab==="geo" && (
          <GeoEditor countries={countries} geoData={GEO} onUpdateGeo={onUpdateGeo} />
        )}
      </div>
    </div>
  );
}

// ── Home ──────────────────────────────────────────────────────────────────────
function Home({ places, countries, countryOrder, onNav, onCountry }) {
  const byCountry = {};
  places.forEach(p=>{ byCountry[p.country]=(byCountry[p.country]||0)+1; });
  const orderedActive = countryOrder.filter(c=>byCountry[c]);

  return (
    <div style={{ display:"flex", flexDirection:"column", width:"100%", height:"100%", background:"#F5F0EB" }}>
      {/* 固定頂部 */}
      <div style={{ flexShrink:0, background:"#F5F0EB", paddingTop:"env(safe-area-inset-top)" }}>
        {/* 按鈕列 — 白底卡片 */}
        <div style={{ background:"#FDF8F3", padding:"12px 20px 14px" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div style={{ display:"flex", gap:8 }}>
              <button onClick={()=>onNav("add")} style={{ padding:"10px 20px", background:"#000", borderRadius:22, fontSize:14, fontWeight:600, color:"white", border:"none", cursor:"pointer" }}>+ 新增收藏</button>
              <button onClick={()=>onNav("search")} style={{ padding:"10px 18px", background:"#F5F0EB", borderRadius:22, fontSize:14, color:"#000", border:"none", cursor:"pointer" }}>搜尋</button>
              <button onClick={()=>onNav("notes")} style={{ padding:"10px 18px", background:"#F5F0EB", borderRadius:22, fontSize:14, color:"#000", border:"none", cursor:"pointer" }}>備忘錄</button>
            </div>
            <button onClick={()=>onNav("settings")} style={{ background:"#F5F0EB", border:"none", borderRadius:12, width:38, height:38, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", fontSize:17, flexShrink:0 }}>⚙️</button>
          </div>
        </div>

        {/* 國家列 — 獨立區塊，中間有間距 */}
        {orderedActive.length>0 && (
          <div style={{ padding:"10px 20px 0" }}>
            <div style={{ fontSize:12, fontWeight:600, color:"#8E8E93", marginBottom:8 }}>國家</div>
            <div style={{ display:"flex", gap:8, overflowX:"auto", paddingBottom:10, WebkitOverflowScrolling:"touch" }}>
              {orderedActive.map(c=>(
                <button key={c} onClick={()=>onCountry(c)} style={{ flexShrink:0, background:"#FDF8F3", border:"none", borderRadius:22, padding:"9px 16px", display:"flex", alignItems:"center", gap:7, cursor:"pointer" }}>
                  <span style={{ fontSize:20 }}>{COUNTRY_FLAGS[c]||"🌍"}</span>
                  <span style={{ fontSize:14, fontWeight:600, color:"#000" }}>{c}</span>
                </button>
              ))}
            </div>
          </div>
        )}
        {/* 所有收藏標題 */}
        <div style={{ padding:"8px 20px 6px" }}>
          <div style={{ fontSize:12, fontWeight:600, color:"#8E8E93" }}>所有收藏</div>
        </div>
      </div>

      {/* 滾動區域 */}
      <div style={{ flex:1, overflowY:"auto", WebkitOverflowScrolling:"touch", padding:"0 20px 40px" }}>
        <div style={{ background:"#FDF8F3", borderRadius:16, overflow:"hidden" }}>
          {places.length===0 && <div style={{ padding:"30px 16px", textAlign:"center", color:"#8E8E93", fontSize:14 }}>還沒有收藏</div>}
          {places.map((p,i)=>(
            <div key={p.id} style={{ borderBottom:i<places.length-1?"1px solid #EDE8E2":"none" }}>
              <PlaceRow place={p} onClick={()=>onNav("detail",p)} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Country ───────────────────────────────────────────────────────────────────
function CountryPage({ country, places, onBack, onSelect }) {
  const [q, setQ] = useState("");
  const [collapsed, setCollapsed] = useState({});
  const [filterStatus, setFilterStatus] = useState("");

  const list = places.filter(p => p.country === country);

  // Filter by search + status
  const filtered = list.filter(p => {
    const lq = q.toLowerCase();
    const mQ = !q.trim() || [p.name, p.neighborhood, p.note||"", p.review||"", ...(p.recommendations||[]), ...(p.types||[])].some(s => s.toLowerCase().includes(lq));
    const mS = !filterStatus || p.status === filterStatus;
    return mQ && mS;
  });

  // Group by neighborhood
  const grouped = {};
  filtered.forEach(p => {
    const key = p.neighborhood || "其他";
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(p);
  });

  function toggleCollapse(nb) {
    setCollapsed(c => ({ ...c, [nb]: !c[nb] }));
  }

  return (
    <div style={{ minHeight:"100vh", background:"#F5F0EB", animation:"fadeIn 0.2s ease-out" }}>
      <div style={{ background:"#FDF8F3", paddingTop:"calc(env(safe-area-inset-top) + 12px)", paddingBottom:"12px", paddingLeft:"20px", paddingRight:"20px" }}>
        <button onClick={onBack} style={{ background:"none", border:"none", color:"#007AFF", fontSize:16, cursor:"pointer", padding:0, marginBottom:12 }}>‹ 返回</button>
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14 }}>
          <span style={{ fontSize:28 }}>{COUNTRY_FLAGS[country]||"🌍"}</span>
          <div>
            <div style={{ fontSize:22, fontWeight:700, color:"#000", letterSpacing:-0.5 }}>{country}</div>
            <div style={{ fontSize:12, color:"#8E8E93" }}>{list.length} 個收藏 · {Object.keys(grouped).length} 個商圈</div>
          </div>
        </div>
        {/* Status filter buttons */}
        <div style={{ display:"flex", gap:8, marginBottom:14 }}>
          {Object.entries(STATUS_CFG).map(([k,s])=>{
            const count = list.filter(p=>p.status===k).length;
            const active = filterStatus === k;
            return (
              <button key={k} onClick={()=>setFilterStatus(active?"":k)}
                style={{ flex:1, background:active?"#3C3C3C":"#F5F0EB", borderRadius:12, padding:"10px 0", textAlign:"center", border:"none", cursor:"pointer", transition:"all 0.15s" }}>
                <div style={{ fontSize:20, fontWeight:700, color:active?"white":"#000", lineHeight:1 }}>{count}</div>
                <div style={{ fontSize:10, color:active?"rgba(255,255,255,0.7)":"#8E8E93", marginTop:3 }}>{s.mark} {s.label}</div>
              </button>
            );
          })}
        </div>
        {/* Search */}
        <div style={{ display:"flex", alignItems:"center", gap:10, background:"#F5F0EB", borderRadius:12, padding:"10px 14px" }}>
          <span style={{ fontSize:14, color:"#8E8E93" }}>🔍</span>
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder="搜尋地點、推薦品項、備註..."
            style={{ flex:1, border:"none", outline:"none", fontSize:15, background:"none", color:"#000", fontFamily:"inherit" }} />
          {(q||filterStatus) && <button onClick={()=>{setQ("");setFilterStatus("");}} style={{ background:"none", border:"none", color:"#8E8E93", fontSize:16, cursor:"pointer", padding:0 }}>✕</button>}
        </div>
      </div>

      <div style={{ padding:"16px 20px 40px" }}>
        {filtered.length === 0 && (
          <div style={{ textAlign:"center", padding:"60px 0", color:"#8E8E93", fontSize:15 }}>{q||filterStatus ? "沒有符合的地點" : "還沒有收藏"}</div>
        )}
        {Object.entries(grouped).map(([nb, nbPlaces]) => {
          const isCollapsed = collapsed[nb];
          return (
            <div key={nb} style={{ marginBottom:16 }}>
              <button onClick={() => toggleCollapse(nb)} style={{ width:"100%", display:"flex", alignItems:"center", justifyContent:"space-between", background:"none", border:"none", cursor:"pointer", padding:"0 0 8px 0", textAlign:"left" }}>
                <div style={{ fontSize:12, fontWeight:600, color:"#8E8E93", letterSpacing:0.3 }}>
                  {nb}{nbPlaces[0]?.district ? ` · ${nbPlaces[0].district}` : ""} <span style={{ fontWeight:400 }}>({nbPlaces.length})</span>
                </div>
                <span style={{ fontSize:12, color:"#C7C7CC", transform:isCollapsed?"rotate(-90deg)":"rotate(0deg)", transition:"transform 0.2s" }}>▼</span>
              </button>
              {!isCollapsed && (
                <div style={{ background:"#FDF8F3", borderRadius:16, overflow:"hidden" }}>
                  {nbPlaces.map((p,i)=>(
                    <div key={p.id} style={{ borderBottom:i<nbPlaces.length-1?"1px solid #EDE8E2":"none" }}>
                      <PlaceRow place={p} onClick={()=>onSelect(p)} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Add ───────────────────────────────────────────────────────────────────────
// ── Address Parser ────────────────────────────────────────────────────────────
// Simplified→Traditional Chinese mapping for common address terms
const SIMP_TO_TRAD = {
  "韩国":"韓國","首尔":"首爾","釜山":"釜山","济州":"濟州",
  "龙山区":"龍山區","麻浦区":"麻浦區","江南区":"江南區","城东区":"城東區",
  "汉南洞":"漢南洞","弘大":"弘大","望远洞":"望遠洞","圣水":"聖水",
  "东京":"東京","大阪":"大阪","京都":"京都","福冈":"福岡","札幌":"札幌",
  "台湾":"台灣","台北":"台北","台南":"台南","高雄":"高雄",
  "巴黎":"巴黎","伦敦":"倫敦","曼谷":"曼谷","清迈":"清邁",
  "特别市":"特別市","特別市":"特別市",
};

function normalizeAddr(addr) {
  let result = addr;
  for (const [simp, trad] of Object.entries(SIMP_TO_TRAD)) {
    result = result.replace(new RegExp(simp, "g"), trad);
  }
  return result;
}

function parseAddress(addr, geoData) {
  if (!addr.trim()) return null;
  const normalized = normalizeAddr(addr);

  // Country keywords
  const countryMap = {
    "韓國": ["韓國","首爾","釜山","濟州","大邱","仁川","서울","부산","特別市"],
    "日本": ["日本","東京","大阪","京都","福岡","札幌","名古屋","奈良","神戶"],
    "台灣": ["台灣","台北","台南","高雄","台中","花蓮","宜蘭"],
    "法國": ["法國","巴黎","Paris","France"],
    "英國": ["英國","倫敦","London"],
    "泰國": ["泰國","曼谷","Bangkok","清邁"],
  };

  let detectedCountry = null;
  let detectedCity = null;
  let detectedDistrict = null;
  let detectedNb = null;

  // Detect country
  for (const [country, keywords] of Object.entries(countryMap)) {
    if (keywords.some(k => normalized.includes(k))) {
      detectedCountry = country;
      break;
    }
  }

  if (!detectedCountry || !geoData[detectedCountry]) return { country: detectedCountry };

  // Detect city
  const cities = Object.keys(geoData[detectedCountry]);
  for (const city of cities) {
    if (normalized.includes(city)) {
      detectedCity = city;
      break;
    }
  }

  if (!detectedCity) return { country: detectedCountry };

  // Detect district
  const districts = Object.keys(geoData[detectedCountry][detectedCity] || {});
  for (const dist of districts) {
    if (normalized.includes(dist)) {
      detectedDistrict = dist;
      break;
    }
  }

  // Detect neighborhood
  if (detectedDistrict) {
    const nbs = geoData[detectedCountry][detectedCity][detectedDistrict] || [];
    for (const nb of nbs) {
      if (normalized.includes(nb)) {
        detectedNb = nb;
        break;
      }
    }
  } else {
    // Try all neighborhoods
    for (const [dist, nbs] of Object.entries(geoData[detectedCountry][detectedCity] || {})) {
      for (const nb of nbs) {
        if (normalized.includes(nb)) {
          detectedDistrict = dist;
          detectedNb = nb;
          break;
        }
      }
      if (detectedNb) break;
    }
  }

  return {
    country: detectedCountry,
    city: detectedCity,
    district: detectedDistrict,
    neighborhood: detectedNb,
  };
}

function Add({ onBack, onAdd, countries, types, geoData: geoDataProp }) {
  const firstC = countries[0]||"韓國";
  const firstCity = getCities(firstC)[0]||"";
  const firstDist = getDistricts(firstC,firstCity)[0]||"";
  const firstNb = getNeighborhoods(firstC,firstCity,firstDist)[0]||"";
  const [f,setF] = useState({ name:"",country:firstC,city:firstCity,district:firstDist,neighborhood:firstNb,types:[],note:"",address:"",recommendations:[],source_url:"",rating:0,review:"",photos:[] });
  const [saving,setSaving] = useState(false);
  const photoInputRef = useRef(null);
  const set=(k,v)=>setF(x=>({...x,[k]:v}));

  function handleAddressChange(addr) {
    setF(x => ({ ...x, address: addr }));
    if (addr.length > 5) {
      const parsed = parseAddress(addr, GEO);
      if (parsed) {
        setF(x => ({
          ...x, address: addr,
          ...(parsed.country && { country: parsed.country }),
          ...(parsed.city && { city: parsed.city }),
          ...(parsed.district && { district: parsed.district }),
          ...(parsed.neighborhood && { neighborhood: parsed.neighborhood }),
        }));
      }
    }
  }

  async function handlePhotoAdd(e:any) {
    const files = Array.from(e.target.files||[]);
    for(const file of files as File[]){
      const ext = (file as File).name.split('.').pop() || 'jpg';
      const path = `places/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await sb.storage.from('photos').upload(path, file as File, { upsert: true });
      if(!error){
        const { data } = sb.storage.from('photos').getPublicUrl(path);
        setF((x:any) => ({ ...x, photos: [...(x.photos||[]), data.publicUrl] }));
      }
    }
    e.target.value = "";
  }

  function handleSave() {
    if (!f.name.trim() || saving) return;
    setSaving(true);
    onAdd({...f, id:String(Date.now()), status:"wishlist"});
    onBack();
  }

  return (
    <div style={{ minHeight:"100vh", background:"#F5F0EB", animation:"fadeIn 0.2s ease-out" }}>
      <div style={{ background:"#FDF8F3", paddingTop:"calc(env(safe-area-inset-top) + 16px)", paddingBottom:"16px", paddingLeft:"20px", paddingRight:"20px", display:"flex", alignItems:"flex-end", justifyContent:"space-between" }}>
        <button onClick={onBack} style={{ background:"none", border:"none", color:"#007AFF", fontSize:16, cursor:"pointer", padding:0 }}>取消</button>
        <div style={{ fontSize:17, fontWeight:600 }}>新增收藏</div>
        <button onClick={handleSave} disabled={!f.name.trim()||saving}
          style={{ background:"none", border:"none", color:f.name.trim()&&!saving?"#007AFF":"#C7C7CC", fontSize:16, fontWeight:600, cursor:f.name.trim()?"pointer":"default", padding:0 }}>
          {saving?"儲存中...":"儲存"}
        </button>
      </div>
      <div style={{ padding:"16px 20px 40px" }}>
        <div style={{ background:"#FDF8F3", borderRadius:16, overflow:"hidden", marginBottom:12 }}>
          <div style={{ padding:"14px 16px", borderBottom:"1px solid #EDE8E2" }}>
            <div style={{ fontSize:11, color:"#8E8E93", marginBottom:5, textTransform:"uppercase", letterSpacing:0.5 }}>地點名稱</div>
            <input value={f.name} onChange={e=>set("name",e.target.value)} placeholder="例：麵首爾 Myeon Seoul" style={{ width:"100%", border:"none", outline:"none", fontSize:16, color:"#000", background:"none", fontFamily:"inherit" }} />
          </div>
          <div style={{ padding:"14px 16px" }}>
            <div style={{ fontSize:11, color:"#8E8E93", marginBottom:5, textTransform:"uppercase", letterSpacing:0.5 }}>收藏原因</div>
            <input value={f.note} onChange={e=>set("note",e.target.value)} placeholder="例：朋友推薦 / 七月要去" style={{ width:"100%", border:"none", outline:"none", fontSize:16, color:"#000", background:"none", fontFamily:"inherit" }} />
          </div>
        </div>

        {/* 照片上傳 */}
        <div style={{ background:"#FDF8F3", borderRadius:16, padding:16, marginBottom:12 }}>
          <div style={{ fontSize:11, color:"#8E8E93", marginBottom:10, textTransform:"uppercase", letterSpacing:0.5 }}>照片（選填）</div>
          <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
            {(f.photos||[]).map((photo,i)=>(
              <div key={i} style={{ position:"relative", width:72, height:72, borderRadius:10, overflow:"hidden", flexShrink:0 }}>
                <img src={photo} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                <button onClick={()=>set("photos",(f.photos||[]).filter((_,idx)=>idx!==i))}
                  style={{ position:"absolute", top:2, right:2, width:18, height:18, borderRadius:"50%", background:"rgba(0,0,0,0.6)", border:"none", color:"white", fontSize:11, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>✕</button>
              </div>
            ))}
            <button onClick={()=>photoInputRef.current&&photoInputRef.current.click()}
              style={{ width:72, height:72, borderRadius:10, border:"1.5px dashed #C9C4BE", background:"none", cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:3, color:"#8E8E93", flexShrink:0 }}>
              <span style={{ fontSize:22, lineHeight:1 }}>+</span>
              <span style={{ fontSize:10 }}>加照片</span>
            </button>
            <input ref={photoInputRef} type="file" accept="image/*" multiple style={{ display:"none" }} onChange={handlePhotoAdd} />
          </div>
        </div>

        <LocationSelector country={f.country} city={f.city} district={f.district} neighborhood={f.neighborhood}
          countries={countries} geoData={geoDataProp||GEO}
          onChange={({country,city,district,neighborhood})=>setF(x=>({...x,country,city,district,neighborhood}))} />

        <div style={{ background:"#FDF8F3", borderRadius:16, padding:16, marginBottom:12 }}>
          <div style={{ fontSize:11, color:"#8E8E93", marginBottom:10, textTransform:"uppercase", letterSpacing:0.5 }}>類型</div>
          <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
            {types.map(t=>{ const a=f.types.includes(t); return <button key={t} onClick={()=>set("types",a?f.types.filter(x=>x!==t):[...f.types,t])} style={{ padding:"7px 16px", borderRadius:20, border:"none", background:a?"#3C3C3C":"#EDE8E2", color:a?"white":"#3C3C43", fontSize:14, cursor:"pointer", fontWeight:a?600:400 }}>{t}</button>; })}
          </div>
        </div>

        <div style={{ background:"#FDF8F3", borderRadius:16, overflow:"hidden" }}>
          {[["推薦品項","recommendations"],["地址","address"],["來源連結","source_url"]].map(([label,key],i,arr)=>(
            <div key={key} style={{ padding:"14px 16px", borderBottom:i<arr.length-1?"1px solid #EDE8E2":"none" }}>
              <div style={{ fontSize:11, color:"#8E8E93", marginBottom:5, textTransform:"uppercase", letterSpacing:0.5 }}>
                {label}{key==="address" && <span style={{ color:"#C7C7CC", fontWeight:400 }}> · 貼上可自動帶入位置</span>}
              </div>
              <input value={key==="recommendations"?f[key].join("、"):f[key]}
                onChange={e => key==="address" ? handleAddressChange(e.target.value) : set(key,key==="recommendations"?e.target.value.split(/[、,，]/).map(s=>s.trim()).filter(Boolean):e.target.value)}
                style={{ width:"100%", border:"none", outline:"none", fontSize:15, color:"#000", background:"none", fontFamily:"inherit" }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Detail ────────────────────────────────────────────────────────────────────
function Detail({ place, onBack, onStatusChange, onDelete, onEdit, countries, types }) {
  const [editing, setEditing] = useState(false);
  const [f, setF] = useState({...place});
  const q = encodeURIComponent(place.name+" "+(place.address||""));

  if (editing) {
    return (
      <div style={{ minHeight:"100vh", background:"#F5F0EB", animation:"fadeIn 0.2s ease-out" }}>
        <div style={{ background:"#FDF8F3", paddingTop:"calc(env(safe-area-inset-top) + 16px)", paddingBottom:"16px", paddingLeft:"20px", paddingRight:"20px", display:"flex", alignItems:"flex-end", justifyContent:"space-between" }}>
          <button onClick={()=>{ setF({...place}); setEditing(false); }} style={{ background:"none", border:"none", color:"#007AFF", fontSize:16, cursor:"pointer", padding:0 }}>取消</button>
          <div style={{ fontSize:17, fontWeight:600 }}>編輯</div>
          <button onClick={()=>{ onEdit(f); setEditing(false); }} style={{ background:"none", border:"none", color:"#007AFF", fontSize:16, fontWeight:600, cursor:"pointer", padding:0 }}>儲存</button>
        </div>
        <div style={{ padding:"16px 20px 40px" }}>
          <div style={{ background:"#FDF8F3", borderRadius:16, overflow:"hidden", marginBottom:12 }}>
            <div style={{ padding:"14px 16px", borderBottom:"1px solid #EDE8E2" }}>
              <div style={{ fontSize:11, color:"#8E8E93", marginBottom:5, textTransform:"uppercase", letterSpacing:0.5 }}>地點名稱</div>
              <input value={f.name} onChange={e=>setF(x=>({...x,name:e.target.value}))} style={{ width:"100%", border:"none", outline:"none", fontSize:16, color:"#000", background:"none", fontFamily:"inherit" }} />
            </div>
            <div style={{ padding:"14px 16px" }}>
              <div style={{ fontSize:11, color:"#8E8E93", marginBottom:5, textTransform:"uppercase", letterSpacing:0.5 }}>收藏原因 / 備註</div>
              <input value={f.note||""} onChange={e=>setF(x=>({...x,note:e.target.value}))} style={{ width:"100%", border:"none", outline:"none", fontSize:16, color:"#000", background:"none", fontFamily:"inherit" }} />
            </div>
          </div>

          <LocationSelector country={f.country} city={f.city} district={f.district||""} neighborhood={f.neighborhood}
            countries={countries} geoData={GEO}
            onChange={({country,city,district,neighborhood})=>setF(x=>({...x,country,city,district,neighborhood}))} />

          <div style={{ background:"#FDF8F3", borderRadius:16, padding:16, marginBottom:12 }}>
            <div style={{ fontSize:11, color:"#8E8E93", marginBottom:10, textTransform:"uppercase", letterSpacing:0.5 }}>類型</div>
            <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
              {types.map(t=>{ const a=f.types?.includes(t); return <button key={t} onClick={()=>setF(x=>({...x,types:a?x.types.filter(v=>v!==t):[...(x.types||[]),t]}))} style={{ padding:"7px 16px", borderRadius:20, border:"none", background:a?"#000":"#EDE8E2", color:a?"white":"#3C3C43", fontSize:14, cursor:"pointer", fontWeight:a?600:400 }}>{t}</button>; })}
            </div>
          </div>

          <div style={{ background:"#FDF8F3", borderRadius:16, overflow:"hidden", marginBottom:12 }}>
            {[["推薦品項","recommendations"],["地址","address"],["來源連結","source_url"]].map(([label,key],i,arr)=>(
              <div key={key} style={{ padding:"14px 16px", borderBottom:i<arr.length-1?"1px solid #EDE8E2":"none" }}>
                <div style={{ fontSize:11, color:"#8E8E93", marginBottom:5, textTransform:"uppercase", letterSpacing:0.5 }}>{label}</div>
                <input value={key==="recommendations"?(f[key]||[]).join("、"):f[key]||""}
                  onChange={e=>setF(x=>({...x,[key]:key==="recommendations"?e.target.value.split(/[、,，]/).map(s=>s.trim()).filter(Boolean):e.target.value}))}
                  style={{ width:"100%", border:"none", outline:"none", fontSize:15, color:"#000", background:"none", fontFamily:"inherit" }} />
              </div>
            ))}
          </div>

          <RatingRow rating={f.rating||0} review={f.review||""} onChange={({rating,review})=>setF(x=>({...x,rating,review}))} />

          <button onClick={()=>{ if(window.confirm("確定刪除？")) onDelete(place.id); }}
            style={{ width:"100%", padding:15, border:"none", borderRadius:14, background:"#FDF8F3", color:"#FF3B30", fontSize:15, fontWeight:600, cursor:"pointer" }}>
            刪除這筆收藏
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display:"flex", flexDirection:"column", width:"100%", height:"100%", background:"#F5F0EB" }}>
      {/* 固定頂部 */}
      <div style={{ flexShrink:0, background:"#FDF8F3", paddingTop:"calc(env(safe-area-inset-top) + 12px)", paddingBottom:"12px", paddingLeft:"20px", paddingRight:"20px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <button onClick={onBack} style={{ background:"none", border:"none", color:"#007AFF", fontSize:16, cursor:"pointer", padding:0 }}>‹ 返回</button>
        <button onClick={()=>setEditing(true)} style={{ background:"none", border:"none", color:"#007AFF", fontSize:15, fontWeight:600, cursor:"pointer", padding:0 }}>編輯</button>
      </div>
      {/* 滾動區域 */}
      <div style={{ flex:1, overflowY:"auto", WebkitOverflowScrolling:"touch", padding:"16px 20px 40px" }}>
        <div style={{ marginBottom:16 }}>
          <div style={{ fontSize:26, fontWeight:700, color:"#000", letterSpacing:-0.5, marginBottom:4 }}>{place.name}</div>
          <div style={{ fontSize:13, color:"#8E8E93" }}>{[place.country,place.city,place.district,place.neighborhood].filter(Boolean).join(" · ")}</div>
          {(place.status==="visited"||place.status==="favorite") && place.rating>0 && (
            <div style={{ marginTop:6, display:"flex", alignItems:"center", gap:8 }}>
              <span style={{ fontSize:18, color:"#FF2D55" }}>{"♥".repeat(place.rating)}{"♡".repeat(5-place.rating)}</span>
              <span style={{ fontSize:12, color:"#8E8E93" }}>{["","不推","普通","還好","不錯","超推"][place.rating]}</span>
            </div>
          )}
        </div>

        <div style={{ background:"#FDF8F3", borderRadius:16, padding:8, marginBottom:12, display:"flex", gap:6 }}>
          {Object.entries(STATUS_CFG).map(([k,s])=>(
            <button key={k} onClick={()=>onStatusChange(place.id,k)} style={{ flex:1, padding:"10px 0", borderRadius:12, border:"none", background:place.status===k?"#000":"none", color:place.status===k?"white":"#8E8E93", fontSize:13, fontWeight:place.status===k?700:400, cursor:"pointer", transition:"all 0.15s" }}>{s.mark} {s.label}</button>
          ))}
        </div>

        {(place.status==="visited"||place.status==="favorite") && (
          <div style={{ background:"#FDF8F3", borderRadius:16, padding:"16px", marginBottom:12 }}>
            <div style={{ fontSize:11, color:"#8E8E93", marginBottom:10, textTransform:"uppercase", letterSpacing:0.5 }}>去過評價</div>
            <div style={{ display:"flex", gap:8, marginBottom: place.review ? 10 : 0 }}>
              {[1,2,3,4,5].map(n => (
                <button key={n} onClick={() => onEdit({...place, rating: place.rating===n?0:n})}
                  style={{ fontSize:24, background:"none", border:"none", cursor:"pointer", padding:0, color:n<=(place.rating||0)?"#FF2D55":"#E5E5EA" }}>
                  {n<=(place.rating||0)?"♥":"♡"}
                </button>
              ))}
              {(place.rating||0)>0 && <span style={{ fontSize:12, color:"#8E8E93", alignSelf:"center", marginLeft:4 }}>{["","不推","普通","還好","不錯","超推"][place.rating]}</span>}
            </div>
            {place.review && <div style={{ fontSize:15, color:"#000", lineHeight:1.5 }}>{place.review}</div>}
          </div>
        )}

        <div style={{ background:"#FDF8F3", borderRadius:16, overflow:"hidden", marginBottom:12 }}>
          {place.types?.length>0 && <DRow label="類型" value={place.types.join("・")} />}
          {place.recommendations?.length>0 && (
            <div style={{ padding:"14px 16px" }}>
              <div style={{ fontSize:13, color:"#8E8E93", marginBottom:8 }}>推薦品項</div>
              <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                {place.recommendations.map(r=><span key={r} style={{ fontSize:13, background:"#F5F0EB", borderRadius:8, padding:"4px 12px", color:"#3C3C43" }}>{r}</span>)}
              </div>
            </div>
          )}
        </div>

        {place.note && <div style={{ background:"#FDF8F3", borderRadius:16, padding:"14px 16px", marginBottom:12 }}>
          <div style={{ fontSize:11, color:"#8E8E93", marginBottom:6, textTransform:"uppercase", letterSpacing:0.5 }}>收藏原因 / 備註</div>
          <div style={{ fontSize:15, color:"#000", lineHeight:1.5 }}>{place.note}</div>
        </div>}

        {place.source_url && (
          <a href={place.source_url} target="_blank" rel="noreferrer" style={{ display:"block", background:"#FDF8F3", borderRadius:16, overflow:"hidden", marginBottom:12, textDecoration:"none" }}>
            <div style={{ display:"flex", alignItems:"stretch" }}>
              <div style={{ width:80, background:"linear-gradient(135deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, minHeight:70 }}>
                <span style={{ fontSize:28 }}>
                  {place.source_url.includes("instagram") ? "📷" : place.source_url.includes("youtube") ? "▶️" : place.source_url.includes("threads") ? "🧵" : "🔗"}
                </span>
              </div>
              <div style={{ padding:"12px 14px", flex:1, minWidth:0 }}>
                <div style={{ fontSize:13, fontWeight:600, color:"#000", marginBottom:3 }}>
                  {place.source_url.includes("instagram") ? "Instagram" : place.source_url.includes("youtube") ? "YouTube" : place.source_url.includes("threads") ? "Threads" : "連結"}
                </div>
                <div style={{ fontSize:11, color:"#007AFF", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{place.source_url}</div>
              </div>
              <div style={{ display:"flex", alignItems:"center", paddingRight:14 }}>
                <span style={{ fontSize:16, color:"#C7C7CC" }}>›</span>
              </div>
            </div>
          </a>
        )}

        {/* Photos */}
        <div style={{ background:"#FDF8F3", borderRadius:16, padding:"16px", marginBottom:12 }}>
          <div style={{ fontSize:11, color:"#8E8E93", marginBottom:10, textTransform:"uppercase", letterSpacing:0.5 }}>照片</div>
          <div style={{ display:"flex", gap:8, overflowX:"auto", paddingBottom:2 }}>
            {(place.photos||[]).map((photo, i) => (
              <div key={i} style={{ flexShrink:0, width:120, height:120, borderRadius:10, overflow:"hidden", position:"relative" }}>
                <img src={photo} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                <button onClick={() => onEdit({...place, photos:(place.photos||[]).filter((_,idx)=>idx!==i)})}
                  style={{ position:"absolute", top:4, right:4, background:"rgba(0,0,0,0.5)", border:"none", borderRadius:"50%", width:22, height:22, color:"white", fontSize:12, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>✕</button>
              </div>
            ))}
            <label style={{ flexShrink:0, width:120, height:120, borderRadius:10, background:"#F5F0EB", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", cursor:"pointer", gap:4 }}>
              <span style={{ fontSize:28, color:"#C7C7CC" }}>+</span>
              <span style={{ fontSize:11, color:"#8E8E93" }}>新增照片</span>
              <input type="file" accept="image/*" multiple style={{ display:"none" }} onChange={async e => {
                const files = Array.from(e.target.files||[]);
                const urls:string[] = [];
                for(const file of files as File[]){
                  const ext = file.name.split('.').pop() || 'jpg';
                  const path = `places/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
                  const { error } = await sb.storage.from('photos').upload(path, file, { upsert: true });
                  if(!error){
                    const { data } = sb.storage.from('photos').getPublicUrl(path);
                    urls.push(data.publicUrl);
                  }
                }
                if(urls.length>0) onEdit({...place, photos:[...(place.photos||[]), ...urls]});
              }} />
            </label>
          </div>
        </div>

        <div style={{ background:"#FDF8F3", borderRadius:16, overflow:"hidden", marginBottom:12 }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"14px 16px" }}>
            <div>
              <div style={{ fontSize:11, color:"#8E8E93", marginBottom:3, textTransform:"uppercase", letterSpacing:0.5 }}>地址</div>
              <div style={{ fontSize:14, color:"#000" }}>{place.address || "未填寫"}</div>
            </div>
            <div style={{ display:"flex", gap:8 }}>
              <a href={`https://maps.google.com/?q=${q}`} target="_blank" rel="noreferrer"
                style={{ width:36, height:36, borderRadius:10, background:"#fff", display:"flex", alignItems:"center", justifyContent:"center", textDecoration:"none", boxShadow:"0 1px 4px rgba(0,0,0,0.12)" }} title="Google Maps">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="#EA4335"/>
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 1.93.78 3.68 2.04 4.96L12 2z" fill="#FBBC04"/>
                  <path d="M12 2l4.96 11.96C18.22 12.68 19 10.93 19 9c0-3.87-3.13-7-7-7z" fill="#4285F4"/>
                  <circle cx="12" cy="9" r="2.5" fill="white"/>
                </svg>
              </a>
              {place.country==="韓國" && (
                <a href={`https://map.naver.com/v5/search/${q}`} target="_blank" rel="noreferrer"
                  style={{ width:36, height:36, borderRadius:10, background:"#03C75A", display:"flex", alignItems:"center", justifyContent:"center", textDecoration:"none" }} title="Naver Maps">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M13.4 12.2L10.4 7H7v10h3.6v-5.2l3.1 5.2H17V7h-3.6v5.2z" fill="white"/>
                  </svg>
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DRow({ label, value }) {
  return (
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"14px 16px", borderBottom:"1px solid #EDE8E2" }}>
      <span style={{ fontSize:15, color:"#000" }}>{label}</span>
      <span style={{ fontSize:15, color:"#8E8E93", maxWidth:"60%", textAlign:"right" }}>{value}</span>
    </div>
  );
}

// ── Search ────────────────────────────────────────────────────────────────────
function Search({ places, onBack, onSelect }) {
  const [q,setQ]=useState(""); const [fS,setFS]=useState(""); const [fT,setFT]=useState("");
  const filtered=places.filter(p=>{ const lq=q.toLowerCase(); const mQ=!q||[p.name,p.neighborhood,p.city,p.country,p.note||"",...(p.recommendations||[])].some(s=>s.toLowerCase().includes(lq)); return mQ&&(!fS||p.status===fS)&&(!fT||p.types?.includes(fT)); });
  return (
    <div style={{ minHeight:"100vh", background:"#F5F0EB", animation:"fadeIn 0.2s ease-out" }}>
      <div style={{ background:"#FDF8F3", paddingTop:"calc(env(safe-area-inset-top) + 12px)", paddingBottom:"12px", paddingLeft:"16px", paddingRight:"16px" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, background:"#F5F0EB", borderRadius:12, padding:"10px 14px", marginBottom:10 }}>
          <span style={{ fontSize:14, color:"#8E8E93" }}>🔍</span>
          <input value={q} onChange={e=>setQ(e.target.value)} autoFocus style={{ flex:1, border:"none", outline:"none", fontSize:16, background:"none", color:"#000", fontFamily:"inherit" }} />
          <button onClick={onBack} style={{ background:"none", border:"none", color:"#007AFF", fontSize:14, cursor:"pointer", padding:0 }}>取消</button>
        </div>
        <div style={{ display:"flex", gap:6, overflowX:"auto" }}>
          {Object.entries(STATUS_CFG).map(([k,s])=>(
            <button key={k} onClick={()=>setFS(fS===k?"":k)} style={{ flexShrink:0, padding:"6px 14px", borderRadius:20, border:"none", background:fS===k?"#000":"#EDE8E2", color:fS===k?"white":"#3C3C43", fontSize:13, cursor:"pointer" }}>{s.mark} {s.label}</button>
          ))}
          {["餐廳","咖啡廳","景點","市場"].map(t=>(
            <button key={t} onClick={()=>setFT(fT===t?"":t)} style={{ flexShrink:0, padding:"6px 14px", borderRadius:20, border:"none", background:fT===t?"#000":"#EDE8E2", color:fT===t?"white":"#3C3C43", fontSize:13, cursor:"pointer" }}>{t}</button>
          ))}
        </div>
      </div>
      <div style={{ padding:"12px 20px 0" }}>
        <div style={{ fontSize:12, color:"#8E8E93", marginBottom:8 }}>{filtered.length} 個地點</div>
        <div style={{ background:"#FDF8F3", borderRadius:16, overflow:"hidden" }}>
          {filtered.map((p,i)=>(
            <div key={p.id} style={{ borderBottom:i<filtered.length-1?"1px solid #EDE8E2":"none" }}>
              <PlaceRow place={p} onClick={()=>onSelect(p)} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Notes ─────────────────────────────────────────────────────────────────────
function Notes({ onBack, countries }) {
  const [country,setCountry]=useState(countries[0]||"韓國");
  const [notes,setNotes]=useState<any[]>([]);
  const [loading,setLoading]=useState(true);
  const [cats,setCats]=useState(["入境","交通","退稅","禮儀","緊急聯絡","其他"]);
  const [adding,setAdding]=useState(false);
  const [newCat,setNewCat]=useState("入境");
  const [newContent,setNewContent]=useState("");
  const [newPhotos,setNewPhotos]=useState<string[]>([]);
  const [editingNote,setEditingNote]=useState<any>(null);
  const [newCatInput,setNewCatInput]=useState("");
  const [showCatInput,setShowCatInput]=useState(false);
  const [saving,setSaving]=useState(false);
  const [editSaving,setEditSaving]=useState(false);
  const [lightbox,setLightbox]=useState<{photos:string[],index:number}|null>(null);
  const photoInputRef=useRef<HTMLInputElement>(null);
  const editPhotoInputRef=useRef<HTMLInputElement>(null);
  const lightboxStartX=useRef(0);

  // 載入備忘錄
  useEffect(()=>{
    sb.from('country_notes').select('*').order('created_at',{ascending:false})
      .then(({data})=>{ if(data) setNotes(data); setLoading(false); });
  },[]);

  const filtered=notes.filter(n=>n.country===country);
  const grouped:any={};
  filtered.forEach(n=>{ if(!grouped[n.category]) grouped[n.category]=[]; grouped[n.category].push(n); });

  async function handlePhotoAdd(e:any, setter:any) {
    const files=Array.from(e.target.files||[]);
    for(const file of files as File[]){
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `notes/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await sb.storage.from('photos').upload(path, file, { upsert: true });
      if(!error){
        const { data } = sb.storage.from('photos').getPublicUrl(path);
        setter((prev:any)=>[...prev, data.publicUrl]);
      }
    }
    e.target.value="";
  }

  async function handleSave() {
    if((!newContent.trim() && newPhotos.length===0) || saving) return;
    setSaving(true);
    const payload={country, category:newCat, content:newContent.trim(), photos:newPhotos};
    const {data,error}=await sb.from('country_notes').insert([payload]).select().single();
    if(!error&&data){ setNotes(ns=>[data,...ns]); }
    setNewContent(""); setNewPhotos([]); setAdding(false);
    setSaving(false);
  }

  async function handleDelete(id:string) {
    await sb.from('country_notes').delete().eq('id',id);
    setNotes(ns=>ns.filter(n=>n.id!==id));
  }

  async function handleEditSave() {
    if(!editingNote || editSaving) return;
    setEditSaving(true);
    const {error}=await sb.from('country_notes').update({
      content:editingNote.content, category:editingNote.category, photos:editingNote.photos||[]
    }).eq('id',editingNote.id);
    if(!error){ setNotes(ns=>ns.map(n=>n.id===editingNote.id?editingNote:n)); }
    setEditingNote(null);
    setEditSaving(false);
  }

  function addCat() {
    const c=newCatInput.trim();
    if(c&&!cats.includes(c)){ setCats(prev=>[...prev,c]); setNewCat(c); }
    setNewCatInput(""); setShowCatInput(false);
  }

  return (
    <div style={{display:"flex",flexDirection:"column",width:"100%",height:"100%",background:"#F5F0EB"}}>
      {/* 固定頂部 */}
      <div style={{flexShrink:0,background:"#FDF8F3",paddingTop:"calc(env(safe-area-inset-top) + 12px)"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"0 20px 12px"}}>
          <button onClick={onBack} style={{background:"none",border:"none",color:"#007AFF",fontSize:16,cursor:"pointer",padding:0}}>‹ 返回</button>
          <div style={{fontSize:17,fontWeight:600}}>國家備忘錄</div>
          <button onClick={()=>{setAdding(a=>!a);setNewContent("");setNewPhotos([]);}} style={{background:"none",border:"none",color:"#007AFF",fontSize:24,cursor:"pointer",padding:0,lineHeight:1}}>+</button>
        </div>
        <div style={{display:"flex",overflowX:"auto",borderTop:"1px solid #EDE8E2"}}>
          {countries.map(c=>(
            <button key={c} onClick={()=>setCountry(c)} style={{flexShrink:0,padding:"10px 16px",border:"none",background:"none",borderBottom:country===c?"2px solid #000":"2px solid transparent",color:country===c?"#000":"#8E8E93",fontSize:14,fontWeight:country===c?600:400,cursor:"pointer"}}>{c}</button>
          ))}
        </div>
      </div>

      {/* 滾動區域 */}
      <div style={{flex:1,overflowY:"auto",WebkitOverflowScrolling:"touch",padding:"12px 20px 40px"}}>

        {/* 新增表單 */}
        {adding && (
          <div style={{background:"#FDF8F3",borderRadius:16,padding:14,marginBottom:12}}>
            {/* 類別選擇 */}
            <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:10}}>
              {cats.map(c=>(
                <button key={c} onClick={()=>setNewCat(c)} style={{padding:"5px 12px",borderRadius:20,border:"none",background:newCat===c?"#000":"#EDE8E2",color:newCat===c?"white":"#3C3C43",fontSize:13,cursor:"pointer"}}>{c}</button>
              ))}
              <button onClick={()=>setShowCatInput(v=>!v)} style={{padding:"5px 12px",borderRadius:20,border:"1.5px dashed #C9C4BE",background:"none",color:"#8E8E93",fontSize:13,cursor:"pointer"}}>+ 新增類別</button>
            </div>
            {showCatInput && (
              <div style={{display:"flex",gap:8,marginBottom:10}}>
                <input value={newCatInput} onChange={e=>setNewCatInput(e.target.value)} placeholder="類別名稱" style={{flex:1,border:"1px solid #EDE8E2",borderRadius:8,padding:"7px 10px",fontSize:14,outline:"none",background:"#F5F0EB",fontFamily:"inherit"}} />
                <button onClick={addCat} style={{padding:"7px 14px",border:"none",borderRadius:8,background:"#000",color:"white",fontSize:13,cursor:"pointer"}}>新增</button>
              </div>
            )}
            {/* 內容 */}
            <textarea value={newContent} onChange={e=>setNewContent(e.target.value)} placeholder="寫下備忘事項..." rows={3}
              style={{width:"100%",border:"none",borderRadius:10,padding:"10px 12px",fontSize:15,color:"#000",outline:"none",background:"#F5F0EB",resize:"none",fontFamily:"inherit",boxSizing:"border-box",marginBottom:10}} />
            {/* 照片 */}
            <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:10}}>
              {newPhotos.map((p,i)=>(
                <div key={i} style={{position:"relative",width:64,height:64,borderRadius:8,overflow:"hidden",flexShrink:0}}>
                  <img src={p} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}} />
                  <button onClick={()=>setNewPhotos(ps=>ps.filter((_,idx)=>idx!==i))} style={{position:"absolute",top:2,right:2,width:16,height:16,borderRadius:"50%",background:"rgba(0,0,0,0.6)",border:"none",color:"white",fontSize:10,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
                </div>
              ))}
              <button onClick={()=>photoInputRef.current?.click()} style={{width:64,height:64,borderRadius:8,border:"1.5px dashed #C9C4BE",background:"none",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:2,color:"#8E8E93",flexShrink:0}}>
                <span style={{fontSize:20}}>+</span>
                <span style={{fontSize:9}}>加照片</span>
              </button>
              <input ref={photoInputRef} type="file" accept="image/*" multiple style={{display:"none"}} onChange={e=>handlePhotoAdd(e,setNewPhotos)} />
            </div>
            <div style={{display:"flex",gap:8}}>
              <button onClick={()=>setAdding(false)} style={{flex:1,padding:11,border:"none",borderRadius:12,background:"#F5F0EB",color:"#3C3C43",fontSize:14,cursor:"pointer"}}>取消</button>
              <button onClick={handleSave} disabled={saving} style={{flex:2,padding:11,border:"none",borderRadius:12,background:saving?"#C7C7CC":"#000",color:"white",fontSize:14,fontWeight:600,cursor:saving?"default":"pointer"}}>{saving?"儲存中...":"儲存"}</button>
            </div>
          </div>
        )}

        {/* 編輯 Modal */}
        {editingNote && (
          <div onClick={()=>setEditingNote(null)} style={{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(0,0,0,0.5)",zIndex:100,display:"flex",alignItems:"flex-end"}}>
            <div onClick={e=>e.stopPropagation()} style={{background:"#FDF8F3",borderRadius:"16px 16px 0 0",padding:"20px 20px 40px",width:"100%"}}>
              <div style={{fontSize:16,fontWeight:600,marginBottom:12}}>編輯備忘錄</div>
              <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:10}}>
                {cats.map(c=>(
                  <button key={c} onClick={()=>setEditingNote((n:any)=>({...n,category:c}))} style={{padding:"5px 12px",borderRadius:20,border:"none",background:editingNote.category===c?"#000":"#EDE8E2",color:editingNote.category===c?"white":"#3C3C43",fontSize:13,cursor:"pointer"}}>{c}</button>
                ))}
              </div>
              <textarea value={editingNote.content} onChange={e=>setEditingNote((n:any)=>({...n,content:e.target.value}))} rows={4}
                style={{width:"100%",border:"none",borderRadius:10,padding:"10px 12px",fontSize:15,color:"#000",outline:"none",background:"#F5F0EB",resize:"none",fontFamily:"inherit",boxSizing:"border-box",marginBottom:10}} />
              <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:10}}>
                {(editingNote.photos||[]).map((p:string,i:number)=>(
                  <div key={i} style={{position:"relative",width:64,height:64,borderRadius:8,overflow:"hidden",flexShrink:0}}>
                    <img src={p} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}} />
                    <button onClick={()=>setEditingNote((n:any)=>({...n,photos:n.photos.filter((_:any,idx:number)=>idx!==i)}))} style={{position:"absolute",top:2,right:2,width:16,height:16,borderRadius:"50%",background:"rgba(0,0,0,0.6)",border:"none",color:"white",fontSize:10,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
                  </div>
                ))}
                <button onClick={()=>editPhotoInputRef.current?.click()} style={{width:64,height:64,borderRadius:8,border:"1.5px dashed #C9C4BE",background:"none",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:2,color:"#8E8E93",flexShrink:0}}>
                  <span style={{fontSize:20}}>+</span>
                  <span style={{fontSize:9}}>加照片</span>
                </button>
                <input ref={editPhotoInputRef} type="file" accept="image/*" multiple style={{display:"none"}} onChange={e=>handlePhotoAdd(e,(photos:string[])=>setEditingNote((n:any)=>({...n,photos:[...(n.photos||[]),...photos]})))} />
              </div>
              <div style={{display:"flex",gap:8}}>
                <button onClick={()=>setEditingNote(null)} style={{flex:1,padding:12,border:"none",borderRadius:12,background:"#F5F0EB",color:"#3C3C43",fontSize:14,cursor:"pointer"}}>取消</button>
                <button onClick={handleEditSave} disabled={editSaving} style={{flex:2,padding:12,border:"none",borderRadius:12,background:editSaving?"#C7C7CC":"#000",color:"white",fontSize:14,fontWeight:600,cursor:editSaving?"default":"pointer"}}>{editSaving?"儲存中...":"儲存"}</button>
              </div>
            </div>
          </div>
        )}

        {/* 備忘錄列表 */}
        {loading && <div style={{textAlign:"center",padding:"40px 0",color:"#8E8E93"}}>載入中...</div>}
        {!loading && filtered.length===0 && <div style={{textAlign:"center",padding:"60px 0",color:"#8E8E93",fontSize:15}}>還沒有 {country} 的備忘錄</div>}
        {Object.entries(grouped).map(([cat,catNotes]:any)=>(
          <div key={cat} style={{marginBottom:14}}>
            <div style={{fontSize:11,color:"#8E8E93",letterSpacing:1,textTransform:"uppercase",marginBottom:6}}>{cat}</div>
            <div style={{background:"#FDF8F3",borderRadius:16,overflow:"hidden"}}>
              {catNotes.map((n:any,i:number)=>(
                <div key={n.id} style={{padding:"14px 16px",borderBottom:i<catNotes.length-1?"1px solid #EDE8E2":"none"}}>
                  <div style={{display:"flex",alignItems:"flex-start",gap:12}}>
                    <div style={{flex:1,fontSize:15,color:"#000",lineHeight:1.5}}>{n.content}</div>
                    <div style={{display:"flex",gap:8,flexShrink:0}}>
                      <button onClick={()=>setEditingNote({...n,photos:n.photos||[]})} style={{background:"none",border:"none",color:"#007AFF",fontSize:13,cursor:"pointer",padding:0}}>編輯</button>
                      <button onClick={()=>handleDelete(n.id)} style={{background:"none",border:"none",color:"#C7C7CC",fontSize:18,cursor:"pointer",padding:0}}>×</button>
                    </div>
                  </div>
                  {(n.photos||[]).length>0 && (
                    <div style={{display:"flex",gap:6,flexWrap:"wrap",marginTop:8}}>
                      {(n.photos||[]).map((p:string,pi:number)=>(
                        <div key={pi} onClick={()=>setLightbox({photos:n.photos,index:pi})} style={{width:64,height:64,borderRadius:8,overflow:"hidden",cursor:"pointer",flexShrink:0}}>
                          <img src={p} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* 照片放大 — 左右滑動 */}
      {lightbox && (
        <div
          onClick={()=>setLightbox(null)}
          onTouchStart={e=>{ lightboxStartX.current=e.touches[0].clientX; }}
          onTouchEnd={e=>{
            const dx=e.changedTouches[0].clientX-lightboxStartX.current;
            if(Math.abs(dx)>50){
              const newIdx=dx<0
                ? Math.min(lightbox.index+1, lightbox.photos.length-1)
                : Math.max(lightbox.index-1, 0);
              setLightbox({...lightbox,index:newIdx});
            } else {
              setLightbox(null);
            }
          }}
          style={{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(0,0,0,0.95)",zIndex:200,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
          <img src={lightbox.photos[lightbox.index]} alt="" style={{maxWidth:"100%",maxHeight:"85%",objectFit:"contain"}} />
          {lightbox.photos.length>1 && (
            <div style={{display:"flex",gap:6,marginTop:12}}>
              {lightbox.photos.map((_:string,i:number)=>(
                <div key={i} onClick={e=>{e.stopPropagation();setLightbox({...lightbox,index:i});}} style={{width:8,height:8,borderRadius:"50%",background:i===lightbox.index?"white":"rgba(255,255,255,0.4)",cursor:"pointer"}} />
              ))}
            </div>
          )}
          <div style={{position:"absolute",top:20,right:20,color:"white",fontSize:14,opacity:0.7}}>{lightbox.index+1} / {lightbox.photos.length}</div>
        </div>
      )}
    </div>
  );
}

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  const [places,setPlaces]=useState<any[]>([]);
  const [loading,setLoading]=useState(true);
  const [countries,setCountries]=useState(Object.keys(GEO));
  const [countryOrder,setCountryOrder]=useState(Object.keys(GEO));
  const [types,setTypes]=useState(INIT_TYPES);
  const [geoData,setGeoData]=useState(GEO);
  const [history,setHistory]=useState(["home"]);
  const [selected,setSelected]=useState<any>(null);
  const [selectedCountry,setSelectedCountry]=useState<string|null>(null);
  const [slideX,setSlideX]=useState(0);
  const touchStartX=useRef(0);
  const touchStartY=useRef(0);
  const isSwiping=useRef(false);

  // ── 載入資料 ──
  useEffect(()=>{
    sb.from('places').select('*').order('created_at',{ascending:false})
      .then(({data, error})=>{
        if(data) setPlaces(data);
        else setPlaces([]);
        setLoading(false);
      })
      .catch(()=>{ setPlaces([]); setLoading(false); });
  },[]);

  const page = history[history.length-1];

  function nav(dest:string,data?:any){
    if(data) setSelected(data);
    setHistory(h=>[...h, dest]);
  }
  function goBack(){ setHistory(h=>h.length>1?h.slice(0,-1):h); }

  // ── 新增 ──
  async function handleAdd(p:any){
    const payload = {
      name:p.name, country:p.country, city:p.city||'',
      district:p.district||'', neighborhood:p.neighborhood||'',
      types:p.types||[], status:'wishlist',
      note:p.note||'', address:p.address||'',
      recommendations:p.recommendations||[],
      source_url:p.source_url||'',
      rating:0, review:'', photos:p.photos||[],
      summary:'', tags:[],
    };
    const {data,error}=await sb.from('places').insert([payload]).select().single();
    if(!error&&data) setPlaces(ps=>[data,...ps]);
    else console.error('handleAdd error:', error);
  }

  // ── 改狀態 ──
  async function handleStatusChange(id:string,s:string){
    await sb.from('places').update({status:s}).eq('id',id);
    setPlaces(ps=>ps.map(p=>p.id===id?{...p,status:s}:p));
    setSelected((prev:any)=>({...prev,status:s}));
  }

  // ── 編輯 ──
  async function handleEdit(u:any){
    const {error}=await sb.from('places').update({
      name:u.name, country:u.country, city:u.city,
      district:u.district||'', neighborhood:u.neighborhood,
      types:u.types||[], note:u.note||'', address:u.address||'',
      recommendations:u.recommendations||[], source_url:u.source_url||'',
      rating:u.rating||0, review:u.review||'', photos:u.photos||[],
      status:u.status, summary:u.summary||'', tags:u.tags||[],
    }).eq('id',u.id);
    if(!error){ setPlaces(ps=>ps.map(p=>p.id===u.id?u:p)); setSelected(u); }
    else console.error('handleEdit error:', error);
  }

  // ── 刪除 ──
  async function handleDelete(id:string){
    await sb.from('places').delete().eq('id',id);
    setPlaces(ps=>ps.filter(p=>p.id!==id));
    setHistory(["home"]);
  }

  function onTouchStart(e:React.TouchEvent){
    touchStartX.current=e.touches[0].clientX;
    touchStartY.current=e.touches[0].clientY;
    isSwiping.current=false;
  }
  function onTouchMove(e:React.TouchEvent){
    const dx=e.touches[0].clientX-touchStartX.current;
    const dy=e.touches[0].clientY-touchStartY.current;
    if(touchStartX.current<60&&Math.abs(dx)>Math.abs(dy)&&dx>0){
      isSwiping.current=true;
      setSlideX(Math.min(dx, window.innerWidth));
    }
  }
  function onTouchEnd(){
    if(isSwiping.current&&slideX>60&&page!=="home") goBack();
    setSlideX(0); isSwiping.current=false;
  }

  if(loading) return (
    <div style={{width:"100%",height:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#F5F0EB",fontFamily:"-apple-system,sans-serif",color:"#8E8E93",fontSize:15}}>
      載入中...
    </div>
  );

  return (
    <div onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
      style={{width:"100vw",height:"100dvh",fontFamily:"-apple-system,'SF Pro Text',sans-serif",background:"#F5F0EB",position:"fixed",top:0,left:0,right:0,bottom:0,overflow:"hidden"}}>
      <style>{`
        @keyframes slideIn{from{transform:translateX(100%)}to{transform:translateX(0)}}
        *{box-sizing:border-box;margin:0;padding:0}
        html,body{width:100%;height:100%;overflow:hidden;overscroll-behavior:none;-webkit-overflow-scrolling:touch}
        ::-webkit-scrollbar{display:none}
        a{text-decoration:none}
        button{font-family:inherit}
        select{-webkit-appearance:none;appearance:none}
      `}</style>

      {/* 底層：Home 永遠存在 */}
      <div style={{position:"absolute",top:0,left:0,right:0,bottom:0,display:"flex",flexDirection:"column"}}>
        <Home places={places} countries={countries} countryOrder={countryOrder} onNav={nav} onCountry={c=>{setSelectedCountry(c);setHistory(h=>[...h,"country"]);}} />
      </div>

      {/* 上層頁面：疊在 Home 上面，右滑時往右移動 */}
      {page!=="home" && (
        <div key={page} style={{
          position:"absolute", top:0, left:0, right:0, bottom:0,
          transform:slideX>0?`translateX(${slideX}px)`:"translateX(0)",
          transition:slideX===0?"transform 0.35s cubic-bezier(0.4,0,0.2,1)":"none",
          willChange:"transform",
          overflowY:"auto", overflowX:"hidden",
          WebkitOverflowScrolling:"touch",
          background:"#F5F0EB",
        }}>
          {page==="add"&&<Add onBack={goBack} onAdd={handleAdd} countries={countries} types={types} geoData={geoData} />}
          {page==="country"&&<CountryPage country={selectedCountry!} places={places} onBack={goBack} onSelect={p=>{setSelected(p);setHistory(h=>[...h,"detail"]);}} />}
          {page==="search"&&<Search places={places} onBack={goBack} onSelect={p=>{setSelected(p);setHistory(h=>[...h,"detail"]);}} />}
          {page==="notes"&&<Notes onBack={goBack} countries={countries} />}
          {page==="settings"&&<Settings countries={countries} types={types} countryOrder={countryOrder} geoData={geoData} onBack={goBack} onUpdateCountries={setCountries} onUpdateTypes={setTypes} onUpdateOrder={setCountryOrder} onUpdateGeo={setGeoData} />}
          {page==="detail"&&selected&&(
            <Detail place={selected} onBack={goBack} countries={countries} types={types}
              onStatusChange={handleStatusChange} onEdit={handleEdit} onDelete={handleDelete} />
          )}
        </div>
      )}
    </div>
  );
}
