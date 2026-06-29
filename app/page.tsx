'use client'
import { useState, useRef, useEffect } from "react";
import { createClient } from '@supabase/supabase-js';

// ── 壓縮圖片：最大寬度 1200px，品質 75% ─────────────────────────────────────
async function compressImage(file: File): Promise<Blob> {
  return new Promise((resolve) => {
    const img = new window.Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const maxW = 1200;
      let w = img.width, h = img.height;
      if (w > maxW) { h = Math.round(h * maxW / w); w = maxW; }
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      canvas.toBlob(blob => resolve(blob || file), 'image/jpeg', 0.75);
    };
    img.src = url;
  });
}

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
      "松山區":  ["饒河","五分埔"],
      "士林區":  ["士林夜市","天母","陽明山"],
      "北投區":  ["北投","新北投溫泉"],
      "內湖區":  ["內湖","大湖"],
      "南港區":  ["南港"],
      "文山區":  ["木柵","政大"],
      "大同區":  ["迪化街"],
      "中正區":  ["台北車站","台大"],
    },
    "新北": {
      "淡水區":  ["淡水"],
      "板橋區":  ["板橋"],
      "新店區":  ["新店","碧潭"],
      "三重區":  ["三重"],
      "中和區":  ["中和"],
      "永和區":  ["永和"],
      "新莊區":  ["新莊"],
      "土城區":  ["土城"],
      "樹林區":  ["樹林"],
      "鶯歌區":  ["鶯歌老街"],
      "三峽區":  ["三峽老街"],
      "瑞芳區":  ["九份","金瓜石","瑞芳"],
      "汐止區":  ["汐止"],
      "深坑區":  ["深坑老街"],
      "石碇區":  ["石碇"],
      "坪林區":  ["坪林"],
      "烏來區":  ["烏來老街"],
      "平溪區":  ["平溪老街","十分"],
      "林口區":  ["林口"],
      "五股區":  ["五股"],
      "蘆洲區":  ["蘆洲"],
      "八里區":  ["八里"],
      "金山區":  ["金山"],
      "萬里區":  ["萬里"],
    },
    "桃園": {
      "桃園區":  ["桃園"],
      "中壢區":  ["中壢"],
      "平鎮區":  ["平鎮"],
      "八德區":  ["八德"],
      "大溪區":  ["大溪老街"],
      "龍潭區":  ["龍潭"],
      "楊梅區":  ["楊梅"],
      "蘆竹區":  ["蘆竹"],
      "大園區":  ["大園"],
      "觀音區":  ["觀音"],
      "新屋區":  ["新屋"],
      "龜山區":  ["龜山"],
      "復興區":  ["復興"],
    },
    "台中": {
      "西區":    ["審計新村","草悟道","勤美"],
      "北區":    ["一中街"],
      "南屯區":  ["逢甲"],
      "西屯區":  ["七期","大遠百"],
      "豐原區":  ["豐原"],
      "大甲區":  ["大甲"],
      "清水區":  ["清水"],
      "沙鹿區":  ["沙鹿"],
      "梧棲區":  ["梧棲"],
      "大里區":  ["大里"],
      "霧峰區":  ["霧峰"],
      "烏日區":  ["烏日"],
      "東勢區":  ["東勢"],
      "和平區":  ["和平"],
    },
    "台南": {
      "中西區":  ["赤崁樓","神農街","正興街","海安路"],
      "東區":    ["大東夜市"],
      "安平區":  ["安平","漁光島"],
      "北區":    ["花園夜市"],
      "永康區":  ["永康"],
      "歸仁區":  ["歸仁"],
      "新化區":  ["新化老街"],
      "麻豆區":  ["麻豆"],
      "佳里區":  ["佳里"],
      "七股區":  ["七股"],
      "將軍區":  ["將軍"],
    },
    "高雄": {
      "鹽埕區":  ["鹽埕","駁二"],
      "前金區":  ["六合夜市"],
      "苓雅區":  ["瑞豐夜市"],
      "左營區":  ["左營","蓮池潭"],
      "前鎮區":  ["夢時代","高雄展覽館"],
      "鳳山區":  ["鳳山"],
      "三民區":  ["三民"],
      "楠梓區":  ["楠梓"],
      "大社區":  ["大社"],
      "岡山區":  ["岡山"],
      "旗山區":  ["旗山老街"],
      "美濃區":  ["美濃"],
      "茂林區":  ["茂林"],
      "那瑪夏區":["那瑪夏"],
    },
    "基隆": {
      "仁愛區":  ["廟口夜市"],
      "中正區":  ["正濱漁港"],
      "七堵區":  ["七堵"],
    },
    "新竹市": {
      "東區":    ["城隍廟","新竹市區"],
      "北區":    ["新竹北區"],
      "香山區":  ["香山"],
    },
    "嘉義市": {
      "東區":    ["文化路夜市","嘉義市區"],
      "西區":    ["嘉義西區"],
    },
    "新竹縣": {
      "竹北市":  ["竹北"],
      "竹東鎮":  ["竹東"],
      "關西鎮":  ["關西老街"],
      "尖石鄉":  ["尖石"],
      "五峰鄉":  ["五峰"],
    },
    "苗栗": {
      "苗栗市":  ["苗栗市區"],
      "頭份市":  ["頭份"],
      "竹南鎮":  ["竹南"],
      "後龍鎮":  ["後龍"],
      "通霄鎮":  ["通霄"],
      "南庄鄉":  ["南庄老街"],
      "三義鄉":  ["三義"],
    },
    "彰化": {
      "彰化市":  ["彰化市區"],
      "員林市":  ["員林"],
      "鹿港鎮":  ["鹿港老街"],
      "溪湖鎮":  ["溪湖"],
      "二林鎮":  ["二林"],
      "北斗鎮":  ["北斗"],
    },
    "南投": {
      "南投市":  ["南投市區"],
      "埔里鎮":  ["埔里"],
      "魚池鄉":  ["日月潭"],
      "集集鎮":  ["集集"],
      "竹山鎮":  ["竹山"],
      "鹿谷鄉":  ["鹿谷"],
      "草屯鎮":  ["草屯"],
      "仁愛鄉":  ["清境農場"],
    },
    "雲林": {
      "斗六市":  ["斗六"],
      "斗南鎮":  ["斗南"],
      "虎尾鎮":  ["虎尾"],
      "西螺鎮":  ["西螺老街"],
      "北港鎮":  ["北港"],
      "古坑鄉":  ["古坑"],
    },
    "嘉義縣": {
      "太保市":  ["太保"],
      "朴子市":  ["朴子"],
      "布袋鎮":  ["布袋"],
      "大林鎮":  ["大林"],
      "民雄鄉":  ["民雄"],
      "阿里山鄉":["阿里山"],
    },
    "屏東": {
      "屏東市":  ["屏東市區"],
      "潮州鎮":  ["潮州"],
      "東港鎮":  ["東港"],
      "恆春鎮":  ["恆春古城","墾丁"],
      "三地門鄉":["三地門"],
      "霧台鄉":  ["霧台"],
      "琉球鄉":  ["小琉球"],
    },
    "台東": {
      "台東市":  ["台東市區"],
      "綠島鄉":  ["綠島"],
      "蘭嶼鄉":  ["蘭嶼"],
      "鹿野鄉":  ["鹿野"],
      "關山鎮":  ["關山"],
      "成功鎮":  ["成功"],
      "池上鄉":  ["池上"],
      "卑南鄉":  ["卑南"],
    },
    "花蓮": {
      "花蓮市":  ["東大門夜市","自強夜市"],
      "壽豐鄉":  ["鯉魚潭","雲山水"],
      "光復鄉":  ["光復"],
      "瑞穗鄉":  ["瑞穗"],
      "玉里鎮":  ["玉里"],
      "富里鄉":  ["富里"],
      "秀林鄉":  ["太魯閣"],
    },
    "宜蘭": {
      "宜蘭市":  ["宜蘭市區"],
      "羅東鎮":  ["羅東夜市","羅東林業文化園區"],
      "礁溪鄉":  ["礁溪溫泉"],
      "頭城鎮":  ["頭城"],
      "壯圍鄉":  ["壯圍"],
      "員山鄉":  ["員山"],
      "三星鄉":  ["三星"],
      "冬山鄉":  ["冬山"],
      "蘇澳鎮":  ["蘇澳"],
      "南澳鄉":  ["南澳"],
    },
    "澎湖": {
      "馬公市":  ["馬公市區"],
      "西嶼鄉":  ["西嶼"],
      "望安鄉":  ["望安"],
      "七美鄉":  ["七美"],
      "白沙鄉":  ["白沙"],
      "湖西鄉":  ["湖西"],
    },
    "金門": {
      "金城鎮":  ["金城"],
      "金湖鎮":  ["金湖"],
      "金沙鎮":  ["金沙"],
      "金寧鄉":  ["金寧"],
      "烈嶼鄉":  ["烈嶼"],
    },
    "馬祖": {
      "南竿鄉":  ["南竿"],
      "北竿鄉":  ["北竿"],
      "莒光鄉":  ["莒光"],
      "東引鄉":  ["東引"],
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
        <div style={{ fontSize:12, color:"#8E8E93" }}>{[place.district, place.neighborhood].filter(Boolean).join(" ")}{place.types?.[0] ? ` · ${place.types[0]}` : ""}</div>
        {place.note && <div style={{ fontSize:11, color:"#636366", marginTop:2, fontStyle:"italic" }}>{place.note}</div>}
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
  const g = geoData || GEO;
  let cities = Object.keys((g && g[country]) || {});
  let districts = Object.keys((g && g[country] && g[country][city]) || {});
  let neighborhoods = ((g && g[country] && g[country][city] && g[country][city][district]) || []);
  // 顯示目前的值，即使它還沒被加進清單（例如剛從地址解析帶入的新行政區）
  if(city && !cities.includes(city)) cities = [city, ...cities];
  if(district && !districts.includes(district)) districts = [district, ...districts];
  if(neighborhood && !neighborhoods.includes(neighborhood)) neighborhoods = [neighborhood, ...neighborhoods];

  const sel: React.CSSProperties = { flex:1, border:"none", outline:"none", fontSize:15, color:"#3C3C43", background:"none", fontFamily:"inherit", appearance:"none", cursor:"pointer", textAlign:"right" };

  return (
    <div style={{ background:"#FDF8F3", borderRadius:16, overflow:"hidden", marginBottom:12 }}>
      {/* 國家 */}
      <Row label="國家">
        <select value={country} onChange={e => {
          const c = e.target.value;
          onChange({ country:c, city:"", district:"", neighborhood:"" });
        }} style={sel}>
          <option value="">請選擇</option>
          {countries.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </Row>
      {/* 城市 */}
      <Row label="城市">
        {cities.length > 0 ? (
          <select value={city} onChange={e => {
            onChange({ country, city:e.target.value, district:"", neighborhood:"" });
          }} style={sel}>
            <option value="">請選擇</option>
            {cities.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        ) : (
          <input value={city} onChange={e=>onChange({country,city:e.target.value,district,neighborhood})} style={{ ...sel, border:"none", outline:"none" }} />
        )}
      </Row>
      {/* 行政區 */}
      <Row label="行政區">
        {districts.length > 0 ? (
          <select value={district} onChange={e => {
            onChange({ country, city, district:e.target.value, neighborhood:"" });
          }} style={sel}>
            <option value="">請選擇</option>
            {districts.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        ) : (
          <input value={district} onChange={e=>onChange({country,city,district:e.target.value,neighborhood})}
            style={{ ...sel, border:"none", outline:"none" }} />
        )}
      </Row>
      {/* 商圈 — 可選可清空 */}
      <Row label="商圈" last>
        {neighborhoods.length > 0 ? (
          <select value={neighborhood} onChange={e => {
            onChange({ country, city, district, neighborhood:e.target.value });
          }} style={sel}>
            <option value="">不填</option>
            {neighborhoods.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        ) : (
          <input value={neighborhood} onChange={e =>
            onChange({ country, city, district, neighborhood:e.target.value })
          } placeholder="選填" style={{ ...sel, border:"none", outline:"none" }} />
        )}
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
  const [expandedCountry, setExpandedCountry] = useState<string|null>(null);
  const [expandedCity, setExpandedCity] = useState<string|null>(null);
  const [newCountry, setNewCountry] = useState("");
  const [newType, setNewType] = useState("");
  const [newCity, setNewCity] = useState("");
  const [newNb, setNewNb] = useState("");
  const [newDist, setNewDist] = useState("");
  const [dragIdx, setDragIdx] = useState<number|null>(null);
  const [dragY, setDragY] = useState(0);
  const [overIdx, setOverIdx] = useState<number|null>(null);
  const [dragIdxT, setDragIdxT] = useState<number|null>(null);
  const [dragYT, setDragYT] = useState(0);
  const [overIdxT, setOverIdxT] = useState<number|null>(null);
  const touchStartY = useRef(0);
  const touchStartYT = useRef(0);
  const ITEM_H = 52;

  function onTouchStartT(e:any, i:number) {
    e.preventDefault();
    touchStartYT.current = e.touches[0].clientY;
    setDragIdxT(i); setDragYT(0); setOverIdxT(i);
  }
  function onTouchMoveT(e:any) {
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

  const list = countryOrder.filter((c:string)=>countries.includes(c));

  function onTouchStart(e:any, i:number) {
    e.preventDefault();
    touchStartY.current = e.touches[0].clientY;
    setDragIdx(i); setDragY(0); setOverIdx(i);
  }
  function onTouchMove(e:any) {
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

  function addCity(country:string) {
    const city = newCity.trim();
    if (!city) return;
    const updated = { ...geoData, [country]: { ...(geoData[country]||{}), [city]: {} } };
    onUpdateGeo(updated);
    setNewCity("");
  }

  function deleteCity(country:string, city:string) {
    const updated = { ...geoData, [country]: { ...(geoData[country]||{}) } };
    delete updated[country][city];
    onUpdateGeo(updated);
    setExpandedCity(null);
  }

  function addNb(country:string, city:string) {
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

  function deleteNb(country:string, city:string, dist:string, nb:string) {
    const cityData = geoData[country]?.[city] || {};
    const updated = { ...geoData, [country]: { ...(geoData[country]||{}), [city]: { ...cityData, [dist]: (cityData[dist]||[]).filter((x:string)=>x!==nb) } } };
    onUpdateGeo(updated);
  }

  return (
    <div style={{ display:"flex", flexDirection:"column", width:"100%", height:"100%", background:"#F5F0EB" }}>
      <div style={{ flexShrink:0, background:"#FDF8F3", paddingTop:"calc(env(safe-area-inset-top) + 16px)", paddingBottom:0, paddingLeft:20, paddingRight:20 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
          <button onClick={onBack} style={{ background:"none", border:"none", color:"#007AFF", fontSize:16, cursor:"pointer", padding:0 }}>‹ 返回</button>
          <div style={{ fontSize:17, fontWeight:600 }}>設定</div>
          <div style={{ width:40 }} />
        </div>
        <div style={{ display:"flex" }}>
          {[["countries","國家與商圈"],["types","類別"]].map(([k,l]) => (
            <button key={k} onClick={()=>setTab(k)} style={{ flex:1, padding:"10px 0", border:"none", background:"none", borderBottom:tab===k?"2px solid #000":"2px solid transparent", color:tab===k?"#000":"#8E8E93", fontSize:14, fontWeight:tab===k?600:400, cursor:"pointer" }}>{l}</button>
          ))}
        </div>
      </div>

      <div style={{ flex:1, overflowY:"auto", WebkitOverflowScrolling:"touch", padding:"16px 20px 40px" }}>
        {/* ── 國家與商圈 ── */}
        {tab==="countries" && (
          <>
            <div style={{ fontSize:12, color:"#8E8E93", marginBottom:8 }}>按住 ⠿ 拖拉調整首頁順序，點開可管理城市和商圈</div>
            <div style={{ background:"#FDF8F3", borderRadius:16, overflow:"hidden", marginBottom:12 }}>
              {list.map((c:string,i:number) => {
                const isDragging = dragIdx===i;
                const isExpanded = expandedCountry===c;
                let ty = 0;
                if (dragIdx!==null && !isDragging) {
                  if (dragIdx<(overIdx||0) && i>dragIdx && i<=(overIdx||0)) ty=-ITEM_H;
                  else if (dragIdx>(overIdx||0) && i<dragIdx && i>=(overIdx||0)) ty=ITEM_H;
                }
                const cityData = geoData[c] || {};
                const cities = Object.keys(cityData);
                return (
                  <div key={c} style={{ borderBottom:i<list.length-1?"1px solid #EDE8E2":"none" }}>
                    {/* 國家列 */}
                    <div style={{ display:"flex", alignItems:"center", padding:"14px 16px", background:isDragging?"#EEF4FF":"#FDF8F3", transform:isDragging?`translateY(${dragY}px) scale(1.02)`:`translateY(${ty}px)`, transition:isDragging?"none":"transform 0.2s ease", position:"relative", zIndex:isDragging?10:1, userSelect:"none" }}>
                      <button onClick={()=>setExpandedCountry(isExpanded?null:c)} style={{ background:"none", border:"none", cursor:"pointer", display:"flex", alignItems:"center", flex:1, padding:0 }}>
                        <span style={{ fontSize:20, marginRight:10 }}>{COUNTRY_FLAGS[c]||"🌍"}</span>
                        <span style={{ fontSize:15, color:"#000", flex:1, textAlign:"left" }}>{c}</span>
                        <span style={{ fontSize:11, color:"#C7C7CC", marginRight:8 }}>{cities.length}個城市 {isExpanded?"▲":"▼"}</span>
                      </button>
                      <span onTouchStart={e=>onTouchStart(e,i)} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
                        style={{ fontSize:18, color:"#C7C7CC", marginRight:12, padding:"0 6px", touchAction:"none" }}>⠿</span>
                      <button onClick={()=>{ onUpdateCountries(countries.filter((x:string)=>x!==c)); onUpdateOrder(countryOrder.filter((x:string)=>x!==c)); }}
                        style={{ background:"none", border:"none", color:"#FF3B30", fontSize:13, cursor:"pointer", padding:0 }}>刪除</button>
                    </div>

                    {/* 展開：城市列表 */}
                    {isExpanded && (
                      <div style={{ background:"#F5F0EB", padding:"8px 16px 12px 16px" }}>
                        {/* 新增城市 */}
                        <div style={{ display:"flex", gap:8, marginBottom:10 }}>
                          <input value={newCity} onChange={e=>setNewCity(e.target.value)} placeholder="新增城市"
                            style={{ flex:1, border:"none", outline:"none", fontSize:13, background:"#FDF8F3", borderRadius:8, padding:"7px 10px", fontFamily:"inherit" }} />
                          <button onClick={()=>addCity(c)} style={{ background:"#000", border:"none", borderRadius:8, padding:"7px 12px", color:"white", fontSize:13, cursor:"pointer" }}>+</button>
                        </div>
                        {cities.map(city=>{
                          const cityKey = `${c}:${city}`;
                          const isCityExpanded = expandedCity===cityKey;
                          const districts = cityData[city] || {};
                          return (
                            <div key={city} style={{ background:"#FDF8F3", borderRadius:10, marginBottom:6, overflow:"hidden" }}>
                              <div style={{ display:"flex", alignItems:"center", padding:"10px 12px" }}>
                                <button onClick={()=>setExpandedCity(isCityExpanded?null:cityKey)} style={{ flex:1, background:"none", border:"none", textAlign:"left", cursor:"pointer", fontSize:14, color:"#000" }}>
                                  {city} <span style={{ fontSize:11, color:"#C7C7CC" }}>({Object.values(districts).flat().length} 商圈)</span>
                                </button>
                                <button onClick={()=>deleteCity(c,city)} style={{ background:"none", border:"none", color:"#FF3B30", fontSize:12, cursor:"pointer" }}>刪除</button>
                              </div>
                              {isCityExpanded && (
                                <div style={{ borderTop:"1px solid #EDE8E2", padding:"10px 12px" }}>
                                  {Object.entries(districts).map(([dist, nbs]:any)=>(
                                    <div key={dist} style={{ marginBottom:8 }}>
                                      <div style={{ fontSize:11, color:"#8E8E93", marginBottom:4 }}>{dist}</div>
                                      <div style={{ display:"flex", flexWrap:"wrap", gap:4 }}>
                                        {nbs.map((nb:string)=>(
                                          <div key={nb} style={{ display:"flex", alignItems:"center", gap:3, background:"#F5F0EB", borderRadius:8, padding:"3px 8px" }}>
                                            <span style={{ fontSize:12 }}>{nb}</span>
                                            <button onClick={()=>deleteNb(c,city,dist,nb)} style={{ background:"none", border:"none", color:"#C7C7CC", fontSize:11, cursor:"pointer", padding:0 }}>×</button>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  ))}
                                  <div style={{ display:"flex", gap:6, marginTop:6 }}>
                                    <input value={newDist} onChange={e=>setNewDist(e.target.value)} placeholder="行政區（選填）"
                                      style={{ width:100, border:"none", outline:"none", fontSize:12, background:"#F5F0EB", borderRadius:8, padding:"5px 8px", fontFamily:"inherit" }} />
                                    <input value={newNb} onChange={e=>setNewNb(e.target.value)} placeholder="新增商圈"
                                      style={{ flex:1, border:"none", outline:"none", fontSize:12, background:"#F5F0EB", borderRadius:8, padding:"5px 8px", fontFamily:"inherit" }} />
                                    <button onClick={()=>addNb(c,city)} style={{ background:"#000", border:"none", borderRadius:8, padding:"5px 10px", color:"white", fontSize:12, cursor:"pointer" }}>+</button>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {/* 新增國家 */}
            <div style={{ background:"#FDF8F3", borderRadius:16, overflow:"hidden" }}>
              <div style={{ display:"flex", padding:"12px 16px", gap:10, alignItems:"center", borderBottom:"1px solid #EDE8E2" }}>
                <input value={newCountry} onChange={e=>setNewCountry(e.target.value)} placeholder="新增國家"
                  style={{ flex:1, border:"none", outline:"none", fontSize:15, color:"#000", background:"none", fontFamily:"inherit" }} />
                <button onClick={()=>{ const c=newCountry.trim(); if(c&&!countries.includes(c)){ onUpdateCountries([...countries,c]); onUpdateOrder([...countryOrder,c]); setNewCountry(""); }}}
                  style={{ background:"#000", border:"none", borderRadius:10, padding:"6px 14px", color:"white", fontSize:13, fontWeight:600, cursor:"pointer" }}>新增</button>
              </div>
              <div style={{ padding:"10px 16px", fontSize:12, color:"#8E8E93" }}>
                {newCountry && COUNTRY_FLAGS[newCountry.trim()] && <span>旗幟預覽：{COUNTRY_FLAGS[newCountry.trim()]} {newCountry}</span>}
                {newCountry && !COUNTRY_FLAGS[newCountry.trim()] && <span>💡 若無預設旗幟，可在名稱後加 emoji，例：「寮國🇱🇦」</span>}
              </div>
            </div>
          </>
        )}

        {/* ── 類別 ── */}
        {tab==="types" && (
          <>
            <div style={{ fontSize:12, color:"#8E8E93", marginBottom:8 }}>按住 ⠿ 拖拉調整順序</div>
            <div style={{ background:"#FDF8F3", borderRadius:16, overflow:"hidden", marginBottom:12 }}>
              {types.map((t:string, i:number) => {
                const isDraggingT = dragIdxT===i;
                let tyT = 0;
                if (dragIdxT!==null && !isDraggingT) {
                  if (dragIdxT<(overIdxT||0) && i>dragIdxT && i<=(overIdxT||0)) tyT=-ITEM_H;
                  else if (dragIdxT>(overIdxT||0) && i<dragIdxT && i>=(overIdxT||0)) tyT=ITEM_H;
                }
                return (
                  <div key={t} style={{ display:"flex", alignItems:"center", padding:"14px 16px", borderBottom:i<types.length-1?"1px solid #EDE8E2":"none", background:isDraggingT?"#EEF4FF":"#FDF8F3", transform:isDraggingT?`translateY(${dragYT}px) scale(1.02)`:`translateY(${tyT}px)`, transition:isDraggingT?"none":"transform 0.2s ease", position:"relative", zIndex:isDraggingT?10:1, userSelect:"none" }}>
                    <span style={{ fontSize:15, color:"#000", flex:1 }}>{t}</span>
                    <span onTouchStart={e=>onTouchStartT(e,i)} onTouchMove={onTouchMoveT} onTouchEnd={onTouchEndT}
                      style={{ fontSize:18, color:"#C7C7CC", marginRight:14, padding:"0 6px", touchAction:"none" }}>⠿</span>
                    <button onClick={()=>onUpdateTypes(types.filter((x:string)=>x!==t))} style={{ background:"none", border:"none", color:"#FF3B30", fontSize:13, cursor:"pointer", padding:0 }}>刪除</button>
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
      </div>
    </div>
  );
}

// ── Home ──────────────────────────────────────────────────────────────────────
function Home({ places, countries, countryOrder, onNav, onCountry }) {
  const [viewMode, setViewMode] = useState<'list'|'grid'>('list');
  const byCountry:any = {};
  places.forEach((p:any)=>{ byCountry[p.country]=(byCountry[p.country]||0)+1; });
  const orderedActive = countryOrder.filter(c=>byCountry[c]);

  return (
    <div style={{ display:"flex", flexDirection:"column", width:"100%", height:"100%", background:"#F5F0EB" }}>
      {/* 固定頂部 */}
      <div style={{ flexShrink:0, background:"#F5F0EB", paddingTop:"env(safe-area-inset-top)" }}>
        {/* 按鈕列 */}
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
        {/* 國家列 */}
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
        {/* 所有收藏標題 + 切換按鈕 */}
        <div style={{ padding:"8px 20px 6px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div style={{ fontSize:12, fontWeight:600, color:"#8E8E93" }}>所有收藏</div>
          <div style={{ display:"flex", gap:4 }}>
            <button onClick={()=>setViewMode('list')} style={{ background:viewMode==='list'?"#3C3C3C":"none", border:"none", borderRadius:6, padding:"4px 7px", cursor:"pointer", display:"flex", alignItems:"center", gap:1.5, flexDirection:"column" }}>
              {[0,1,2].map(i=><div key={i} style={{ width:12, height:2, background:viewMode==='list'?"white":"#8E8E93", borderRadius:1 }} />)}
            </button>
            <button onClick={()=>setViewMode('grid')} style={{ background:viewMode==='grid'?"#3C3C3C":"none", border:"none", borderRadius:6, padding:"4px 7px", cursor:"pointer", display:"grid", gridTemplateColumns:"1fr 1fr", gap:2 }}>
              {[0,1,2,3].map(i=><div key={i} style={{ width:6, height:6, background:viewMode==='grid'?"white":"#8E8E93", borderRadius:1 }} />)}
            </button>
          </div>
        </div>
      </div>

      {/* 滾動區域 */}
      <div style={{ flex:1, overflowY:"auto", WebkitOverflowScrolling:"touch", padding:"0 20px 40px" }}>
        {places.length===0 && <div style={{ padding:"30px 16px", textAlign:"center", color:"#8E8E93", fontSize:14 }}>還沒有收藏</div>}

        {viewMode==='list' && (
          <div style={{ background:"#FDF8F3", borderRadius:16, overflow:"hidden" }}>
            {places.map((p:any,i:number)=>(
              <div key={p.id} style={{ borderBottom:i<places.length-1?"1px solid #EDE8E2":"none" }}>
                <PlaceRow place={p} onClick={()=>onNav("detail",p)} />
              </div>
            ))}
          </div>
        )}

        {viewMode==='grid' && (
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, paddingTop:4 }}>
            {places.map((p:any)=>(
              <button key={p.id} onClick={()=>onNav("detail",p)} style={{ background:"#FDF8F3", borderRadius:12, overflow:"hidden", border:"none", cursor:"pointer", textAlign:"left" }}>
                <div style={{ height:110, background:p.photos?.[0]?"none":"#EDE8E2", position:"relative", overflow:"hidden" }}>
                  {p.photos?.[0]
                    ? <img src={p.photos[0]} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                    : <div style={{ width:"100%", height:"100%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:28 }}>{p.types?.[0]==="餐廳"?"🍽️":p.types?.[0]==="咖啡廳"?"☕":p.types?.[0]==="景點"?"🌸":p.types?.[0]==="市場"?"🛒":"📍"}</div>
                  }
                </div>
                <div style={{ padding:"8px 10px 10px" }}>
                  <div style={{ fontSize:13, fontWeight:600, color:"#000", marginBottom:2, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{p.name}</div>
                  <div style={{ fontSize:11, color:"#8E8E93" }}>{p.neighborhood||p.city}</div>
                  {p.note && <div style={{ fontSize:10, color:"#636366", marginTop:2, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{p.note}</div>}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Country ───────────────────────────────────────────────────────────────────
function CountryPage({ country, places, onBack, onSelect }) {
  const [q, setQ] = useState("");
  const [collapsed, setCollapsed] = useState<any>({});
  const [filterStatus, setFilterStatus] = useState("");
  const [filterCity, setFilterCity] = useState("");
  const [viewMode, setViewMode] = useState<'list'|'grid'>('list');

  const cities = ["全部", ...Array.from(new Set((places||[]).filter((p:any)=>p.country===country).map((p:any)=>p.city).filter(Boolean)))];

  const list = (places||[]).filter((p:any) => p.country === country);

  const filtered = list.filter((p:any) => {
    const lq = q.toLowerCase();
    const mQ = !q.trim() || [p.name, p.neighborhood, p.note||"", p.review||"", ...(p.recommendations||[]), ...(p.types||[])].some((s:string) => s.toLowerCase().includes(lq));
    const mS = !filterStatus || p.status === filterStatus;
    const mC = !filterCity || filterCity === "全部" || p.city === filterCity;
    return mQ && mS && mC;
  });

  const grouped:any = {};
  filtered.forEach((p:any) => {
    const key = p.neighborhood || p.district || "其他";
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(p);
  });

  function toggleCollapse(nb:string) {
    setCollapsed((c:any) => ({ ...c, [nb]: !c[nb] }));
  }

  return (
    <div style={{ display:"flex", flexDirection:"column", width:"100%", height:"100%", background:"#F5F0EB" }}>
      {/* 固定頂部 */}
      <div style={{ flexShrink:0, background:"#FDF8F3", paddingTop:"calc(env(safe-area-inset-top) + 12px)", paddingBottom:12, paddingLeft:20, paddingRight:20 }}>
        <button onClick={onBack} style={{ background:"none", border:"none", color:"#007AFF", fontSize:16, cursor:"pointer", padding:0, marginBottom:12 }}>‹ 返回</button>
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14 }}>
          <span style={{ fontSize:28 }}>{COUNTRY_FLAGS[country]||"🌍"}</span>
          <div>
            <div style={{ fontSize:22, fontWeight:700, color:"#000", letterSpacing:-0.5 }}>{country}</div>
            <div style={{ fontSize:12, color:"#8E8E93" }}>{list.length} 個收藏 · {Object.keys(grouped).length} 個區域</div>
          </div>
        </div>
        {/* 狀態篩選 */}
        <div style={{ display:"flex", gap:8, marginBottom:14 }}>
          {Object.entries(STATUS_CFG).map(([k,s])=>{
            const count = list.filter((p:any)=>p.status===k).length;
            const active = filterStatus === k;
            return (
              <button key={k} onClick={()=>setFilterStatus(active?"":k)}
                style={{ flex:1, background:active?"#3C3C3C":"#F5F0EB", borderRadius:12, padding:"10px 0", textAlign:"center", border:"none", cursor:"pointer" }}>
                <div style={{ fontSize:20, fontWeight:700, color:active?"white":"#000", lineHeight:1 }}>{count}</div>
                <div style={{ fontSize:10, color:active?"rgba(255,255,255,0.7)":"#8E8E93", marginTop:3 }}>{s.mark} {s.label}</div>
              </button>
            );
          })}
        </div>
        {/* 搜尋 */}
        <div style={{ display:"flex", alignItems:"center", gap:10, background:"#F5F0EB", borderRadius:12, padding:"10px 14px", marginBottom:10 }}>
          <span style={{ fontSize:14, color:"#8E8E93" }}>🔍</span>
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder="搜尋地點、推薦品項、備註..."
            style={{ flex:1, border:"none", outline:"none", fontSize:15, background:"none", color:"#000", fontFamily:"inherit" }} />
          {(q||filterStatus) && <button onClick={()=>{setQ("");setFilterStatus("");}} style={{ background:"none", border:"none", color:"#8E8E93", fontSize:16, cursor:"pointer", padding:0 }}>✕</button>}
        </div>
        {/* 城市篩選膠囊 + 切換按鈕 同一排 */}
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <div style={{ flex:1, overflowX:"auto", display:"flex", gap:6, scrollbarWidth:"none", WebkitOverflowScrolling:"touch" }}>
            {cities.map(c => {
              const active = c === "全部" ? !filterCity || filterCity === "全部" : filterCity === c;
              return (
                <button key={c} onClick={()=>setFilterCity(c==="全部"?"":c)}
                  style={{ flexShrink:0, padding:"4px 12px", borderRadius:20, border:"none", fontSize:12, fontWeight:active?600:400, background:active?"#3C3C3C":"#EDE8E2", color:active?"white":"#3C3C43", cursor:"pointer", whiteSpace:"nowrap" }}>
                  {c}
                </button>
              );
            })}
          </div>
          <div style={{ display:"flex", gap:4, flexShrink:0 }}>
            <button onClick={()=>setViewMode('list')} style={{ background:viewMode==='list'?"#3C3C3C":"none", border:"none", borderRadius:6, padding:"4px 7px", cursor:"pointer", display:"flex", alignItems:"center", gap:1.5, flexDirection:"column" }}>
              {[0,1,2].map(i=><div key={i} style={{ width:12, height:2, background:viewMode==='list'?"white":"#8E8E93", borderRadius:1 }} />)}
            </button>
            <button onClick={()=>setViewMode('grid')} style={{ background:viewMode==='grid'?"#3C3C3C":"none", border:"none", borderRadius:6, padding:"4px 7px", cursor:"pointer", display:"grid", gridTemplateColumns:"1fr 1fr", gap:2 }}>
              {[0,1,2,3].map(i=><div key={i} style={{ width:6, height:6, background:viewMode==='grid'?"white":"#8E8E93", borderRadius:1 }} />)}
            </button>
          </div>
        </div>
      </div>

      {/* 滾動區域 */}
      <div style={{ flex:1, overflowY:"auto", WebkitOverflowScrolling:"touch", padding:"12px 20px 40px" }}>
        {filtered.length === 0 && (
          <div style={{ textAlign:"center", padding:"60px 0", color:"#8E8E93", fontSize:15 }}>{q||filterStatus ? "沒有符合的地點" : "還沒有收藏"}</div>
        )}

        {Object.entries(grouped).map(([nb, nbPlaces]:any) => {
          const isCollapsed = collapsed[nb];
          return (
            <div key={nb} style={{ marginBottom:16 }}>
              {/* 商圈標題 — 可收合 */}
              <button onClick={() => toggleCollapse(nb)} style={{ width:"100%", display:"flex", alignItems:"center", justifyContent:"space-between", background:"none", border:"none", cursor:"pointer", padding:"0 0 8px 0", textAlign:"left" }}>
                <div style={{ fontSize:12, fontWeight:600, color:"#8E8E93", letterSpacing:0.3 }}>
                  {[...new Set([nbPlaces[0]?.city, nbPlaces[0]?.district, nbPlaces[0]?.neighborhood].filter(Boolean))].join(" · ") || "其他"} <span style={{ fontWeight:400 }}>({nbPlaces.length})</span>
                </div>
                <span style={{ fontSize:12, color:"#C7C7CC", transform:isCollapsed?"rotate(-90deg)":"rotate(0deg)", transition:"transform 0.2s" }}>▼</span>
              </button>

              {!isCollapsed && viewMode==='list' && (
                <div style={{ background:"#FDF8F3", borderRadius:16, overflow:"hidden" }}>
                  {nbPlaces.map((p:any,i:number)=>(
                    <div key={p.id} style={{ borderBottom:i<nbPlaces.length-1?"1px solid #EDE8E2":"none" }}>
                      <PlaceRow place={p} onClick={()=>onSelect(p)} />
                    </div>
                  ))}
                </div>
              )}

              {!isCollapsed && viewMode==='grid' && (
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                  {nbPlaces.map((p:any)=>(
                    <button key={p.id} onClick={()=>onSelect(p)} style={{ background:"#FDF8F3", borderRadius:12, overflow:"hidden", border:"none", cursor:"pointer", textAlign:"left" }}>
                      <div style={{ height:110, background:"#EDE8E2", position:"relative", overflow:"hidden" }}>
                        {p.photos?.[0]
                          ? <img src={p.photos[0]} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                          : <div style={{ width:"100%", height:"100%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:28 }}>{p.types?.[0]==="餐廳"?"🍽️":p.types?.[0]==="咖啡廳"?"☕":p.types?.[0]==="景點"?"🌸":p.types?.[0]==="市場"?"🛒":"📍"}</div>
                        }
                      </div>
                      <div style={{ padding:"8px 10px 10px" }}>
                        <div style={{ fontSize:13, fontWeight:600, color:"#000", marginBottom:2, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{p.name}</div>
                        <div style={{ fontSize:11, color:"#8E8E93" }}>{p.neighborhood||p.city}</div>
                        {p.note && <div style={{ fontSize:10, color:"#636366", marginTop:2, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{p.note}</div>}
                      </div>
                    </button>
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
// ── 多國地址關鍵字對應表 ─────────────────────────────────────────────────────
const ADDRESS_MAP: Array<{key:string, country:string, city:string, district:string, neighborhood:string}> = [

  // ── 韓國 ──────────────────────────────────────────────────────────────────
  // 首爾 麻浦區
  {key:"홍대",      country:"韓國", city:"首爾", district:"麻浦區", neighborhood:"弘大"},
  {key:"홍익",      country:"韓國", city:"首爾", district:"麻浦區", neighborhood:"弘大"},
  {key:"연남",      country:"韓國", city:"首爾", district:"麻浦區", neighborhood:"延南"},
  {key:"망원",      country:"韓國", city:"首爾", district:"麻浦區", neighborhood:"望遠"},
  {key:"합정",      country:"韓國", city:"首爾", district:"麻浦區", neighborhood:"合井"},
  {key:"상수",      country:"韓國", city:"首爾", district:"麻浦區", neighborhood:"上水"},
  {key:"마포구",    country:"韓國", city:"首爾", district:"麻浦區", neighborhood:""},
  // 首爾 龍山區
  {key:"이태원",    country:"韓國", city:"首爾", district:"龍山區", neighborhood:"梨泰院"},
  {key:"한남",      country:"韓國", city:"首爾", district:"龍山區", neighborhood:"漢南"},
  {key:"해방촌",    country:"韓國", city:"首爾", district:"龍山區", neighborhood:"解放村"},
  {key:"용산구",    country:"韓國", city:"首爾", district:"龍山區", neighborhood:""},
  // 首爾 城東區
  {key:"성수",      country:"韓國", city:"首爾", district:"城東區", neighborhood:"聖水"},
  {key:"뚝섬",      country:"韓國", city:"首爾", district:"城東區", neighborhood:"纛島"},
  {key:"왕십리",    country:"韓國", city:"首爾", district:"城東區", neighborhood:"往十里"},
  {key:"성동구",    country:"韓國", city:"首爾", district:"城東區", neighborhood:""},
  // 首爾 江南區
  {key:"압구정",    country:"韓國", city:"首爾", district:"江南區", neighborhood:"狎鷗亭"},
  {key:"청담",      country:"韓國", city:"首爾", district:"江南區", neighborhood:"清潭"},
  {key:"신사",      country:"韓國", city:"首爾", district:"江南區", neighborhood:"新沙"},
  {key:"가로수길",  country:"韓國", city:"首爾", district:"江南區", neighborhood:"林蔭道"},
  {key:"삼성동",    country:"韓國", city:"首爾", district:"江南區", neighborhood:"三成"},
  {key:"강남구",    country:"韓國", city:"首爾", district:"江南區", neighborhood:""},
  // 首爾 鐘路區
  {key:"인사동",    country:"韓國", city:"首爾", district:"鐘路區", neighborhood:"仁寺洞"},
  {key:"익선동",    country:"韓國", city:"首爾", district:"鐘路區", neighborhood:"益善洞"},
  {key:"삼청",      country:"韓國", city:"首爾", district:"鐘路區", neighborhood:"三清洞"},
  {key:"북촌",      country:"韓國", city:"首爾", district:"鐘路區", neighborhood:"北村"},
  {key:"종로구",    country:"韓國", city:"首爾", district:"鐘路區", neighborhood:""},
  // 首爾 中區
  {key:"명동",      country:"韓國", city:"首爾", district:"中區",   neighborhood:"明洞"},
  {key:"을지로",    country:"韓國", city:"首爾", district:"中區",   neighborhood:"乙支路"},
  {key:"남대문",    country:"韓國", city:"首爾", district:"中區",   neighborhood:"南大門"},
  // 首爾 廣津區
  {key:"건대",      country:"韓國", city:"首爾", district:"廣津區", neighborhood:"建大"},
  {key:"자양",      country:"韓國", city:"首爾", district:"廣津區", neighborhood:"紫陽洞"},
  // 首爾 松坡區
  {key:"잠실",      country:"韓國", city:"首爾", district:"松坡區", neighborhood:"蠶室"},
  {key:"석촌",      country:"韓國", city:"首爾", district:"松坡區", neighborhood:"石村湖"},
  // 首爾 瑞草區
  {key:"교대",      country:"韓國", city:"首爾", district:"瑞草區", neighborhood:"教大"},
  // 首爾 東大門區
  {key:"동대문",    country:"韓國", city:"首爾", district:"東大門區", neighborhood:"東大門"},
  {key:"광장시장",  country:"韓國", city:"首爾", district:"東大門區", neighborhood:"廣藏市場"},
  // 釜山
  {key:"해운대",    country:"韓國", city:"釜山", district:"海雲台區", neighborhood:"海雲台"},
  {key:"광안리",    country:"韓國", city:"釜山", district:"海雲台區", neighborhood:"廣安里"},
  {key:"서면",      country:"韓國", city:"釜山", district:"釜山鎮區", neighborhood:"西面"},
  {key:"남포동",    country:"韓國", city:"釜山", district:"中區",     neighborhood:"南浦洞"},
  // 首爾城市關鍵字
  {key:"서울",      country:"韓國", city:"首爾", district:"", neighborhood:""},
  {key:"seoul",     country:"韓國", city:"首爾", district:"", neighborhood:""},
  {key:"부산",      country:"韓國", city:"釜山", district:"", neighborhood:""},
  {key:"busan",     country:"韓國", city:"釜山", district:"", neighborhood:""},
  {key:"제주",      country:"韓國", city:"濟州", district:"", neighborhood:""},

  // ── 日本 ──────────────────────────────────────────────────────────────────
  // 東京 涉谷區
  {key:"渋谷",      country:"日本", city:"東京", district:"涉谷區", neighborhood:"涉谷"},
  {key:"shibuya",   country:"日本", city:"東京", district:"涉谷區", neighborhood:"涉谷"},
  {key:"原宿",      country:"日本", city:"東京", district:"涉谷區", neighborhood:"原宿"},
  {key:"harajuku",  country:"日本", city:"東京", district:"涉谷區", neighborhood:"原宿"},
  {key:"表参道",    country:"日本", city:"東京", district:"涉谷區", neighborhood:"表參道"},
  {key:"omotesando",country:"日本", city:"東京", district:"涉谷區", neighborhood:"表參道"},
  {key:"代官山",    country:"日本", city:"東京", district:"涉谷區", neighborhood:"代官山"},
  {key:"daikanyama",country:"日本", city:"東京", district:"涉谷區", neighborhood:"代官山"},
  {key:"中目黒",    country:"日本", city:"東京", district:"涉谷區", neighborhood:"中目黒"},
  {key:"nakameguro",country:"日本", city:"東京", district:"涉谷區", neighborhood:"中目黒"},
  {key:"恵比寿",    country:"日本", city:"東京", district:"涉谷區", neighborhood:"惠比壽"},
  {key:"ebisu",     country:"日本", city:"東京", district:"涉谷區", neighborhood:"惠比壽"},
  // 東京 新宿區
  {key:"新宿",      country:"日本", city:"東京", district:"新宿區", neighborhood:"新宿"},
  {key:"shinjuku",  country:"日本", city:"東京", district:"新宿區", neighborhood:"新宿"},
  {key:"下北沢",    country:"日本", city:"東京", district:"新宿區", neighborhood:"下北澤"},
  {key:"shimokitazawa",country:"日本",city:"東京",district:"新宿區",neighborhood:"下北澤"},
  // 東京 中央區
  {key:"銀座",      country:"日本", city:"東京", district:"中央區", neighborhood:"銀座"},
  {key:"ginza",     country:"日本", city:"東京", district:"中央區", neighborhood:"銀座"},
  {key:"築地",      country:"日本", city:"東京", district:"中央區", neighborhood:"築地"},
  {key:"tsukiji",   country:"日本", city:"東京", district:"中央區", neighborhood:"築地"},
  {key:"日本橋",    country:"日本", city:"東京", district:"中央區", neighborhood:"日本橋"},
  // 東京 台東區
  {key:"浅草",      country:"日本", city:"東京", district:"台東區", neighborhood:"淺草"},
  {key:"asakusa",   country:"日本", city:"東京", district:"台東區", neighborhood:"淺草"},
  {key:"上野",      country:"日本", city:"東京", district:"台東區", neighborhood:"上野"},
  {key:"ueno",      country:"日本", city:"東京", district:"台東區", neighborhood:"上野"},
  {key:"蔵前",      country:"日本", city:"東京", district:"台東區", neighborhood:"藏前"},
  // 東京 千代田區
  {key:"秋葉原",    country:"日本", city:"東京", district:"千代田區", neighborhood:"秋葉原"},
  {key:"akihabara", country:"日本", city:"東京", district:"千代田區", neighborhood:"秋葉原"},
  {key:"神保町",    country:"日本", city:"東京", district:"千代田區", neighborhood:"神保町"},
  // 東京 豐島區
  {key:"池袋",      country:"日本", city:"東京", district:"豐島區", neighborhood:"池袋"},
  {key:"ikebukuro", country:"日本", city:"東京", district:"豐島區", neighborhood:"池袋"},
  // 東京 港區
  {key:"六本木",    country:"日本", city:"東京", district:"港區", neighborhood:"六本木"},
  {key:"roppongi",  country:"日本", city:"東京", district:"港區", neighborhood:"六本木"},
  {key:"麻布台",    country:"日本", city:"東京", district:"港區", neighborhood:"麻布十番"},
  {key:"麻布十番",  country:"日本", city:"東京", district:"港區", neighborhood:"麻布十番"},
  {key:"azabu",     country:"日本", city:"東京", district:"港區", neighborhood:"麻布十番"},
  {key:"赤坂",      country:"日本", city:"東京", district:"港區", neighborhood:"赤坂"},
  {key:"台場",      country:"日本", city:"東京", district:"港區", neighborhood:"台場"},
  {key:"odaiba",    country:"日本", city:"東京", district:"港區", neighborhood:"台場"},
  // 東京 世田谷區
  {key:"三軒茶屋",  country:"日本", city:"東京", district:"世田谷區", neighborhood:"三軒茶屋"},
  {key:"自由が丘",  country:"日本", city:"東京", district:"世田谷區", neighborhood:"自由之丘"},
  {key:"jiyugaoka", country:"日本", city:"東京", district:"世田谷區", neighborhood:"自由之丘"},
  // 東京 杉並區
  {key:"吉祥寺",    country:"日本", city:"東京", district:"杉並區", neighborhood:"吉祥寺"},
  {key:"kichijoji", country:"日本", city:"東京", district:"杉並區", neighborhood:"吉祥寺"},
  // 東京城市
  {key:"東京都",    country:"日本", city:"東京", district:"", neighborhood:""},
  {key:"tokyo",     country:"日本", city:"東京", district:"", neighborhood:""},
  // 大阪
  {key:"道頓堀",    country:"日本", city:"大阪", district:"中央區", neighborhood:"道頓堀"},
  {key:"dotonbori", country:"日本", city:"大阪", district:"中央區", neighborhood:"道頓堀"},
  {key:"心斎橋",    country:"日本", city:"大阪", district:"中央區", neighborhood:"心齋橋"},
  {key:"shinsaibashi",country:"日本",city:"大阪",district:"中央區",neighborhood:"心齋橋"},
  {key:"難波",      country:"日本", city:"大阪", district:"中央區", neighborhood:"難波"},
  {key:"namba",     country:"日本", city:"大阪", district:"中央區", neighborhood:"難波"},
  {key:"なんば",    country:"日本", city:"大阪", district:"中央區", neighborhood:"難波"},
  {key:"梅田",      country:"日本", city:"大阪", district:"北區",   neighborhood:"梅田"},
  {key:"umeda",     country:"日本", city:"大阪", district:"北區",   neighborhood:"梅田"},
  {key:"中崎町",    country:"日本", city:"大阪", district:"北區",   neighborhood:"中崎町"},
  {key:"新世界",    country:"日本", city:"大阪", district:"浪速區", neighborhood:"新世界"},
  {key:"大阪",      country:"日本", city:"大阪", district:"", neighborhood:""},
  {key:"osaka",     country:"日本", city:"大阪", district:"", neighborhood:""},
  // 京都
  {key:"祇園",      country:"日本", city:"京都", district:"東山區", neighborhood:"祇園"},
  {key:"gion",      country:"日本", city:"京都", district:"東山區", neighborhood:"祇園"},
  {key:"清水",      country:"日本", city:"京都", district:"東山區", neighborhood:"清水"},
  {key:"kiyomizu",  country:"日本", city:"京都", district:"東山區", neighborhood:"清水"},
  {key:"河原町",    country:"日本", city:"京都", district:"中京區", neighborhood:"河原町"},
  {key:"kawaramachi",country:"日本",city:"京都",district:"中京區",neighborhood:"河原町"},
  {key:"錦市場",    country:"日本", city:"京都", district:"中京區", neighborhood:"錦市場"},
  {key:"嵐山",      country:"日本", city:"京都", district:"右京區", neighborhood:"嵐山"},
  {key:"arashiyama",country:"日本", city:"京都", district:"右京區", neighborhood:"嵐山"},
  {key:"伏見稲荷",  country:"日本", city:"京都", district:"伏見區", neighborhood:"伏見稻荷"},
  {key:"京都",      country:"日本", city:"京都", district:"", neighborhood:""},
  {key:"kyoto",     country:"日本", city:"京都", district:"", neighborhood:""},
  // 福岡
  {key:"天神",      country:"日本", city:"福岡", district:"中央區", neighborhood:"天神"},
  {key:"tenjin",    country:"日本", city:"福岡", district:"中央區", neighborhood:"天神"},
  {key:"大名",      country:"日本", city:"福岡", district:"中央區", neighborhood:"大名"},
  {key:"薬院",      country:"日本", city:"福岡", district:"中央區", neighborhood:"藥院"},
  {key:"博多",      country:"日本", city:"福岡", district:"博多區", neighborhood:"博多"},
  {key:"hakata",    country:"日本", city:"福岡", district:"博多區", neighborhood:"博多"},
  {key:"中洲",      country:"日本", city:"福岡", district:"博多區", neighborhood:"中洲"},
  {key:"福岡",      country:"日本", city:"福岡", district:"", neighborhood:""},
  {key:"fukuoka",   country:"日本", city:"福岡", district:"", neighborhood:""},
  // 北海道
  {key:"大通",      country:"日本", city:"北海道", district:"札幌市", neighborhood:"大通"},
  {key:"薄野",      country:"日本", city:"北海道", district:"札幌市", neighborhood:"薄野"},
  {key:"すすきの",  country:"日本", city:"北海道", district:"札幌市", neighborhood:"薄野"},
  {key:"susukino",  country:"日本", city:"北海道", district:"札幌市", neighborhood:"薄野"},
  {key:"円山",      country:"日本", city:"北海道", district:"札幌市", neighborhood:"円山"},
  {key:"小樽",      country:"日本", city:"北海道", district:"小樽市", neighborhood:"小樽運河"},
  {key:"otaru",     country:"日本", city:"北海道", district:"小樽市", neighborhood:"小樽運河"},
  {key:"函館",      country:"日本", city:"北海道", district:"函館市", neighborhood:"元町"},
  {key:"hakodate",  country:"日本", city:"北海道", district:"函館市", neighborhood:"元町"},
  {key:"札幌",      country:"日本", city:"北海道", district:"", neighborhood:""},
  {key:"sapporo",   country:"日本", city:"北海道", district:"", neighborhood:""},
  {key:"北海道",    country:"日本", city:"北海道", district:"", neighborhood:""},
  {key:"hokkaido",  country:"日本", city:"北海道", district:"", neighborhood:""},
  // 沖繩
  {key:"国際通り",  country:"日本", city:"沖繩", district:"那霸市", neighborhood:"國際通"},
  {key:"kokusaidori",country:"日本",city:"沖繩",district:"那霸市",neighborhood:"國際通"},
  {key:"牧志",      country:"日本", city:"沖繩", district:"那霸市", neighborhood:"牧志"},
  {key:"首里",      country:"日本", city:"沖繩", district:"那霸市", neighborhood:"首里"},
  {key:"那覇",      country:"日本", city:"沖繩", district:"那霸市", neighborhood:""},
  {key:"naha",      country:"日本", city:"沖繩", district:"那霸市", neighborhood:""},
  {key:"沖縄",      country:"日本", city:"沖繩", district:"", neighborhood:""},
  {key:"okinawa",   country:"日本", city:"沖繩", district:"", neighborhood:""},
  // 奈良
  {key:"奈良公園",  country:"日本", city:"奈良", district:"奈良市", neighborhood:"奈良公園"},
  {key:"東大寺",    country:"日本", city:"奈良", district:"奈良市", neighborhood:"東大寺周邊"},
  {key:"奈良市",    country:"日本", city:"奈良", district:"", neighborhood:""},
  {key:"nara",      country:"日本", city:"奈良", district:"", neighborhood:""},
  // 神戶
  {key:"三宮",      country:"日本", city:"神戶", district:"中央區", neighborhood:"三宮"},
  {key:"sannomiya",country:"日本", city:"神戶", district:"中央區", neighborhood:"三宮"},
  {key:"北野",      country:"日本", city:"神戶", district:"中央區", neighborhood:"北野"},
  {key:"南京町",    country:"日本", city:"神戶", district:"中央區", neighborhood:"南京町"},
  {key:"神戸",      country:"日本", city:"神戶", district:"", neighborhood:""},
  {key:"kobe",      country:"日本", city:"神戶", district:"", neighborhood:""},

  // ── 台灣 ──────────────────────────────────────────────────────────────────
  // 台北市
  {key:"信義區",    country:"台灣", city:"台北", district:"信義區", neighborhood:"信義"},
  {key:"象山",      country:"台灣", city:"台北", district:"信義區", neighborhood:"象山"},
  {key:"市政府",    country:"台灣", city:"台北", district:"信義區", neighborhood:"市政府"},
  {key:"微風廣場",  country:"台灣", city:"台北", district:"信義區", neighborhood:"微風廣場"},
  {key:"東區",      country:"台灣", city:"台北", district:"大安區", neighborhood:"東區"},
  {key:"永康街",    country:"台灣", city:"台北", district:"大安區", neighborhood:"永康街"},
  {key:"師大",      country:"台灣", city:"台北", district:"大安區", neighborhood:"師大"},
  {key:"公館",      country:"台灣", city:"台北", district:"大安區", neighborhood:"公館"},
  {key:"敦化",      country:"台灣", city:"台北", district:"大安區", neighborhood:"敦化"},
  {key:"大安區",    country:"台灣", city:"台北", district:"大安區", neighborhood:""},
  {key:"赤峰街",    country:"台灣", city:"台北", district:"中山區", neighborhood:"赤峰街"},
  {key:"行天宮",    country:"台灣", city:"台北", district:"中山區", neighborhood:"行天宮"},
  {key:"林森",      country:"台灣", city:"台北", district:"中山區", neighborhood:"林森"},
  {key:"中山區",    country:"台灣", city:"台北", district:"中山區", neighborhood:""},
  {key:"西門",      country:"台灣", city:"台北", district:"萬華區", neighborhood:"西門"},
  {key:"龍山寺",    country:"台灣", city:"台北", district:"萬華區", neighborhood:"龍山寺"},
  {key:"剝皮寮",    country:"台灣", city:"台北", district:"萬華區", neighborhood:"剝皮寮"},
  {key:"萬華區",    country:"台灣", city:"台北", district:"萬華區", neighborhood:""},
  {key:"饒河",      country:"台灣", city:"台北", district:"松山區", neighborhood:"饒河"},
  {key:"五分埔",    country:"台灣", city:"台北", district:"松山區", neighborhood:"五分埔"},
  {key:"松山區",    country:"台灣", city:"台北", district:"松山區", neighborhood:""},
  {key:"士林夜市",  country:"台灣", city:"台北", district:"士林區", neighborhood:"士林夜市"},
  {key:"天母",      country:"台灣", city:"台北", district:"士林區", neighborhood:"天母"},
  {key:"陽明山",    country:"台灣", city:"台北", district:"士林區", neighborhood:"陽明山"},
  {key:"士林區",    country:"台灣", city:"台北", district:"士林區", neighborhood:""},
  {key:"新北投",    country:"台灣", city:"台北", district:"北投區", neighborhood:"新北投溫泉"},
  {key:"北投區",    country:"台灣", city:"台北", district:"北投區", neighborhood:""},
  {key:"內湖",      country:"台灣", city:"台北", district:"內湖區", neighborhood:"內湖"},
  {key:"大湖",      country:"台灣", city:"台北", district:"內湖區", neighborhood:"大湖"},
  {key:"內湖區",    country:"台灣", city:"台北", district:"內湖區", neighborhood:""},
  {key:"南港區",    country:"台灣", city:"台北", district:"南港區", neighborhood:""},
  {key:"文山區",    country:"台灣", city:"台北", district:"文山區", neighborhood:""},
  {key:"木柵",      country:"台灣", city:"台北", district:"文山區", neighborhood:"木柵"},
  {key:"政大",      country:"台灣", city:"台北", district:"文山區", neighborhood:"政大"},
  {key:"大同區",    country:"台灣", city:"台北", district:"大同區", neighborhood:""},
  {key:"迪化街",    country:"台灣", city:"台北", district:"大同區", neighborhood:"迪化街"},
  {key:"中正區",    country:"台灣", city:"台北", district:"中正區", neighborhood:""},
  {key:"台北車站",  country:"台灣", city:"台北", district:"中正區", neighborhood:"台北車站"},
  {key:"台大",      country:"台灣", city:"台北", district:"中正區", neighborhood:"台大"},
  {key:"台北市",    country:"台灣", city:"台北", district:"", neighborhood:""},
  {key:"臺北市",    country:"台灣", city:"台北", district:"", neighborhood:""},
  {key:"taipei",    country:"台灣", city:"台北", district:"", neighborhood:""},
  // 新北市
  {key:"淡水",      country:"台灣", city:"新北", district:"淡水區", neighborhood:"淡水"},
  {key:"板橋",      country:"台灣", city:"新北", district:"板橋區", neighborhood:"板橋"},
  {key:"新店",      country:"台灣", city:"新北", district:"新店區", neighborhood:"新店"},
  {key:"碧潭",      country:"台灣", city:"新北", district:"新店區", neighborhood:"碧潭"},
  {key:"三重",      country:"台灣", city:"新北", district:"三重區", neighborhood:""},
  {key:"中和",      country:"台灣", city:"新北", district:"中和區", neighborhood:""},
  {key:"永和",      country:"台灣", city:"新北", district:"永和區", neighborhood:""},
  {key:"新莊",      country:"台灣", city:"新北", district:"新莊區", neighborhood:""},
  {key:"土城",      country:"台灣", city:"新北", district:"土城區", neighborhood:""},
  {key:"樹林",      country:"台灣", city:"新北", district:"樹林區", neighborhood:""},
  {key:"鶯歌",      country:"台灣", city:"新北", district:"鶯歌區", neighborhood:"鶯歌老街"},
  {key:"三峽",      country:"台灣", city:"新北", district:"三峽區", neighborhood:"三峽老街"},
  {key:"瑞芳",      country:"台灣", city:"新北", district:"瑞芳區", neighborhood:""},
  {key:"九份",      country:"台灣", city:"新北", district:"瑞芳區", neighborhood:"九份"},
  {key:"金瓜石",    country:"台灣", city:"新北", district:"瑞芳區", neighborhood:"金瓜石"},
  {key:"汐止",      country:"台灣", city:"新北", district:"汐止區", neighborhood:""},
  {key:"深坑",      country:"台灣", city:"新北", district:"深坑區", neighborhood:"深坑老街"},
  {key:"石碇",      country:"台灣", city:"新北", district:"石碇區", neighborhood:""},
  {key:"坪林",      country:"台灣", city:"新北", district:"坪林區", neighborhood:""},
  {key:"烏來",      country:"台灣", city:"新北", district:"烏來區", neighborhood:"烏來老街"},
  {key:"平溪",      country:"台灣", city:"新北", district:"平溪區", neighborhood:"平溪老街"},
  {key:"十分",      country:"台灣", city:"新北", district:"平溪區", neighborhood:"十分"},
  {key:"林口",      country:"台灣", city:"新北", district:"林口區", neighborhood:""},
  {key:"泰山",      country:"台灣", city:"新北", district:"泰山區", neighborhood:""},
  {key:"五股",      country:"台灣", city:"新北", district:"五股區", neighborhood:""},
  {key:"蘆洲",      country:"台灣", city:"新北", district:"蘆洲區", neighborhood:""},
  {key:"八里",      country:"台灣", city:"新北", district:"八里區", neighborhood:""},
  {key:"金山",      country:"台灣", city:"新北", district:"金山區", neighborhood:""},
  {key:"萬里",      country:"台灣", city:"新北", district:"萬里區", neighborhood:""},
  {key:"新北市",    country:"台灣", city:"新北", district:"", neighborhood:""},
  {key:"新北",      country:"台灣", city:"新北", district:"", neighborhood:""},
  // 桃園市
  {key:"桃園區",    country:"台灣", city:"桃園", district:"桃園區", neighborhood:""},
  {key:"中壢",      country:"台灣", city:"桃園", district:"中壢區", neighborhood:""},
  {key:"平鎮",      country:"台灣", city:"桃園", district:"平鎮區", neighborhood:""},
  {key:"八德",      country:"台灣", city:"桃園", district:"八德區", neighborhood:""},
  {key:"大溪",      country:"台灣", city:"桃園", district:"大溪區", neighborhood:"大溪老街"},
  {key:"龍潭",      country:"台灣", city:"桃園", district:"龍潭區", neighborhood:""},
  {key:"楊梅",      country:"台灣", city:"桃園", district:"楊梅區", neighborhood:""},
  {key:"蘆竹",      country:"台灣", city:"桃園", district:"蘆竹區", neighborhood:""},
  {key:"大園",      country:"台灣", city:"桃園", district:"大園區", neighborhood:""},
  {key:"觀音",      country:"台灣", city:"桃園", district:"觀音區", neighborhood:""},
  {key:"新屋",      country:"台灣", city:"桃園", district:"新屋區", neighborhood:""},
  {key:"龜山",      country:"台灣", city:"桃園", district:"龜山區", neighborhood:""},
  {key:"復興",      country:"台灣", city:"桃園", district:"復興區", neighborhood:""},
  {key:"桃園市",    country:"台灣", city:"桃園", district:"", neighborhood:""},
  {key:"taoyuan",   country:"台灣", city:"桃園", district:"", neighborhood:""},
  // 台中市
  {key:"審計新村",  country:"台灣", city:"台中", district:"西區",   neighborhood:"審計新村"},
  {key:"草悟道",    country:"台灣", city:"台中", district:"西區",   neighborhood:"草悟道"},
  {key:"勤美",      country:"台灣", city:"台中", district:"西區",   neighborhood:"勤美"},
  {key:"一中街",    country:"台灣", city:"台中", district:"北區",   neighborhood:"一中街"},
  {key:"逢甲",      country:"台灣", city:"台中", district:"西屯區", neighborhood:"逢甲"},
  {key:"七期",      country:"台灣", city:"台中", district:"西屯區", neighborhood:"七期"},
  {key:"大遠百",    country:"台灣", city:"台中", district:"西屯區", neighborhood:"大遠百"},
  {key:"豐原",      country:"台灣", city:"台中", district:"豐原區", neighborhood:""},
  {key:"大甲",      country:"台灣", city:"台中", district:"大甲區", neighborhood:""},
  {key:"清水",      country:"台灣", city:"台中", district:"清水區", neighborhood:""},
  {key:"沙鹿",      country:"台灣", city:"台中", district:"沙鹿區", neighborhood:""},
  {key:"梧棲",      country:"台灣", city:"台中", district:"梧棲區", neighborhood:""},
  {key:"大里",      country:"台灣", city:"台中", district:"大里區", neighborhood:""},
  {key:"霧峰",      country:"台灣", city:"台中", district:"霧峰區", neighborhood:""},
  {key:"烏日",      country:"台灣", city:"台中", district:"烏日區", neighborhood:""},
  {key:"東勢",      country:"台灣", city:"台中", district:"東勢區", neighborhood:""},
  {key:"和平",      country:"台灣", city:"台中", district:"和平區", neighborhood:""},
  {key:"台中市",    country:"台灣", city:"台中", district:"", neighborhood:""},
  {key:"臺中市",    country:"台灣", city:"台中", district:"", neighborhood:""},
  {key:"taichung",  country:"台灣", city:"台中", district:"", neighborhood:""},
  // 台南市
  {key:"赤崁樓",    country:"台灣", city:"台南", district:"中西區", neighborhood:"赤崁樓"},
  {key:"神農街",    country:"台灣", city:"台南", district:"中西區", neighborhood:"神農街"},
  {key:"正興街",    country:"台灣", city:"台南", district:"中西區", neighborhood:"正興街"},
  {key:"海安路",    country:"台灣", city:"台南", district:"中西區", neighborhood:"海安路"},
  {key:"大東夜市",  country:"台灣", city:"台南", district:"東區",   neighborhood:"大東夜市"},
  {key:"安平",      country:"台灣", city:"台南", district:"安平區", neighborhood:"安平"},
  {key:"漁光島",    country:"台灣", city:"台南", district:"安平區", neighborhood:"漁光島"},
  {key:"花園夜市",  country:"台灣", city:"台南", district:"北區",   neighborhood:"花園夜市"},
  {key:"永康區",    country:"台灣", city:"台南", district:"永康區", neighborhood:""},
  {key:"歸仁",      country:"台灣", city:"台南", district:"歸仁區", neighborhood:""},
  {key:"新化",      country:"台灣", city:"台南", district:"新化區", neighborhood:"新化老街"},
  {key:"麻豆",      country:"台灣", city:"台南", district:"麻豆區", neighborhood:""},
  {key:"佳里",      country:"台灣", city:"台南", district:"佳里區", neighborhood:""},
  {key:"七股",      country:"台灣", city:"台南", district:"七股區", neighborhood:""},
  {key:"將軍",      country:"台灣", city:"台南", district:"將軍區", neighborhood:""},
  {key:"台南市",    country:"台灣", city:"台南", district:"", neighborhood:""},
  {key:"臺南市",    country:"台灣", city:"台南", district:"", neighborhood:""},
  {key:"tainan",    country:"台灣", city:"台南", district:"", neighborhood:""},
  // 高雄市
  {key:"鹽埕",      country:"台灣", city:"高雄", district:"鹽埕區", neighborhood:"鹽埕"},
  {key:"駁二",      country:"台灣", city:"高雄", district:"鹽埕區", neighborhood:"駁二"},
  {key:"六合夜市",  country:"台灣", city:"高雄", district:"前金區", neighborhood:"六合夜市"},
  {key:"瑞豐夜市",  country:"台灣", city:"高雄", district:"苓雅區", neighborhood:"瑞豐夜市"},
  {key:"左營",      country:"台灣", city:"高雄", district:"左營區", neighborhood:"左營"},
  {key:"蓮池潭",    country:"台灣", city:"高雄", district:"左營區", neighborhood:"蓮池潭"},
  {key:"夢時代",    country:"台灣", city:"高雄", district:"前鎮區", neighborhood:"夢時代"},
  {key:"高雄展覽館",country:"台灣", city:"高雄", district:"前鎮區", neighborhood:"高雄展覽館"},
  {key:"鳳山",      country:"台灣", city:"高雄", district:"鳳山區", neighborhood:""},
  {key:"三民區",    country:"台灣", city:"高雄", district:"三民區", neighborhood:""},
  {key:"楠梓",      country:"台灣", city:"高雄", district:"楠梓區", neighborhood:""},
  {key:"大社",      country:"台灣", city:"高雄", district:"大社區", neighborhood:""},
  {key:"岡山",      country:"台灣", city:"高雄", district:"岡山區", neighborhood:""},
  {key:"旗山",      country:"台灣", city:"高雄", district:"旗山區", neighborhood:"旗山老街"},
  {key:"美濃",      country:"台灣", city:"高雄", district:"美濃區", neighborhood:""},
  {key:"茂林",      country:"台灣", city:"高雄", district:"茂林區", neighborhood:""},
  {key:"那瑪夏",    country:"台灣", city:"高雄", district:"那瑪夏區", neighborhood:""},
  {key:"高雄市",    country:"台灣", city:"高雄", district:"", neighborhood:""},
  {key:"kaohsiung", country:"台灣", city:"高雄", district:"", neighborhood:""},
  // 基隆市
  {key:"仁愛區",    country:"台灣", city:"基隆", district:"仁愛區", neighborhood:""},
  {key:"廟口夜市",  country:"台灣", city:"基隆", district:"仁愛區", neighborhood:"廟口夜市"},
  {key:"正濱漁港",  country:"台灣", city:"基隆", district:"中正區", neighborhood:"正濱漁港"},
  {key:"七堵",      country:"台灣", city:"基隆", district:"七堵區", neighborhood:""},
  {key:"基隆市",    country:"台灣", city:"基隆", district:"", neighborhood:""},
  {key:"keelung",   country:"台灣", city:"基隆", district:"", neighborhood:""},
  // 新竹市
  {key:"新竹市",    country:"台灣", city:"新竹市", district:"", neighborhood:""},
  {key:"城隍廟",    country:"台灣", city:"新竹市", district:"東區", neighborhood:"城隍廟"},
  {key:"香山",      country:"台灣", city:"新竹市", district:"香山區", neighborhood:""},
  {key:"hsinchu",   country:"台灣", city:"新竹市", district:"", neighborhood:""},
  // 嘉義市
  {key:"嘉義市",    country:"台灣", city:"嘉義市", district:"", neighborhood:""},
  {key:"文化路夜市",country:"台灣", city:"嘉義市", district:"東區", neighborhood:"文化路夜市"},
  {key:"chiayi",    country:"台灣", city:"嘉義市", district:"", neighborhood:""},
  // 新竹縣
  {key:"竹北",      country:"台灣", city:"新竹縣", district:"竹北市", neighborhood:""},
  {key:"竹東",      country:"台灣", city:"新竹縣", district:"竹東鎮", neighborhood:""},
  {key:"關西",      country:"台灣", city:"新竹縣", district:"關西鎮", neighborhood:"關西老街"},
  {key:"尖石",      country:"台灣", city:"新竹縣", district:"尖石鄉", neighborhood:""},
  {key:"五峰",      country:"台灣", city:"新竹縣", district:"五峰鄉", neighborhood:""},
  {key:"新竹縣",    country:"台灣", city:"新竹縣", district:"", neighborhood:""},
  // 苗栗縣
  {key:"苗栗市",    country:"台灣", city:"苗栗", district:"苗栗市", neighborhood:""},
  {key:"頭份",      country:"台灣", city:"苗栗", district:"頭份市", neighborhood:""},
  {key:"竹南",      country:"台灣", city:"苗栗", district:"竹南鎮", neighborhood:""},
  {key:"後龍",      country:"台灣", city:"苗栗", district:"後龍鎮", neighborhood:""},
  {key:"通霄",      country:"台灣", city:"苗栗", district:"通霄鎮", neighborhood:""},
  {key:"南庄",      country:"台灣", city:"苗栗", district:"南庄鄉", neighborhood:"南庄老街"},
  {key:"三義",      country:"台灣", city:"苗栗", district:"三義鄉", neighborhood:""},
  {key:"苗栗縣",    country:"台灣", city:"苗栗", district:"", neighborhood:""},
  {key:"miaoli",    country:"台灣", city:"苗栗", district:"", neighborhood:""},
  // 彰化縣
  {key:"彰化市",    country:"台灣", city:"彰化", district:"彰化市", neighborhood:""},
  {key:"員林",      country:"台灣", city:"彰化", district:"員林市", neighborhood:""},
  {key:"鹿港",      country:"台灣", city:"彰化", district:"鹿港鎮", neighborhood:"鹿港老街"},
  {key:"溪湖",      country:"台灣", city:"彰化", district:"溪湖鎮", neighborhood:""},
  {key:"二林",      country:"台灣", city:"彰化", district:"二林鎮", neighborhood:""},
  {key:"北斗",      country:"台灣", city:"彰化", district:"北斗鎮", neighborhood:""},
  {key:"彰化縣",    country:"台灣", city:"彰化", district:"", neighborhood:""},
  {key:"changhua",  country:"台灣", city:"彰化", district:"", neighborhood:""},
  // 南投縣
  {key:"南投市",    country:"台灣", city:"南投", district:"南投市", neighborhood:""},
  {key:"埔里",      country:"台灣", city:"南投", district:"埔里鎮", neighborhood:""},
  {key:"日月潭",    country:"台灣", city:"南投", district:"魚池鄉", neighborhood:"日月潭"},
  {key:"集集",      country:"台灣", city:"南投", district:"集集鎮", neighborhood:""},
  {key:"竹山",      country:"台灣", city:"南投", district:"竹山鎮", neighborhood:""},
  {key:"鹿谷",      country:"台灣", city:"南投", district:"鹿谷鄉", neighborhood:""},
  {key:"草屯",      country:"台灣", city:"南投", district:"草屯鎮", neighborhood:""},
  {key:"中寮",      country:"台灣", city:"南投", district:"中寮鄉", neighborhood:""},
  {key:"仁愛鄉",    country:"台灣", city:"南投", district:"仁愛鄉", neighborhood:"清境"},
  {key:"清境",      country:"台灣", city:"南投", district:"仁愛鄉", neighborhood:"清境農場"},
  {key:"南投縣",    country:"台灣", city:"南投", district:"", neighborhood:""},
  {key:"nantou",    country:"台灣", city:"南投", district:"", neighborhood:""},
  // 雲林縣
  {key:"斗六",      country:"台灣", city:"雲林", district:"斗六市", neighborhood:""},
  {key:"斗南",      country:"台灣", city:"雲林", district:"斗南鎮", neighborhood:""},
  {key:"虎尾",      country:"台灣", city:"雲林", district:"虎尾鎮", neighborhood:""},
  {key:"西螺",      country:"台灣", city:"雲林", district:"西螺鎮", neighborhood:"西螺老街"},
  {key:"北港",      country:"台灣", city:"雲林", district:"北港鎮", neighborhood:""},
  {key:"古坑",      country:"台灣", city:"雲林", district:"古坑鄉", neighborhood:""},
  {key:"雲林縣",    country:"台灣", city:"雲林", district:"", neighborhood:""},
  {key:"yunlin",    country:"台灣", city:"雲林", district:"", neighborhood:""},
  // 嘉義縣
  {key:"太保",      country:"台灣", city:"嘉義縣", district:"太保市", neighborhood:""},
  {key:"朴子",      country:"台灣", city:"嘉義縣", district:"朴子市", neighborhood:""},
  {key:"布袋",      country:"台灣", city:"嘉義縣", district:"布袋鎮", neighborhood:""},
  {key:"大林",      country:"台灣", city:"嘉義縣", district:"大林鎮", neighborhood:""},
  {key:"民雄",      country:"台灣", city:"嘉義縣", district:"民雄鄉", neighborhood:""},
  {key:"阿里山",    country:"台灣", city:"嘉義縣", district:"阿里山鄉", neighborhood:"阿里山"},
  {key:"嘉義縣",    country:"台灣", city:"嘉義縣", district:"", neighborhood:""},
  // 屏東縣
  {key:"屏東市",    country:"台灣", city:"屏東", district:"屏東市", neighborhood:""},
  {key:"潮州",      country:"台灣", city:"屏東", district:"潮州鎮", neighborhood:""},
  {key:"東港",      country:"台灣", city:"屏東", district:"東港鎮", neighborhood:""},
  {key:"恆春",      country:"台灣", city:"屏東", district:"恆春鎮", neighborhood:"恆春古城"},
  {key:"墾丁",      country:"台灣", city:"屏東", district:"恆春鎮", neighborhood:"墾丁"},
  {key:"三地門",    country:"台灣", city:"屏東", district:"三地門鄉", neighborhood:""},
  {key:"霧台",      country:"台灣", city:"屏東", district:"霧台鄉", neighborhood:""},
  {key:"琉球",      country:"台灣", city:"屏東", district:"琉球鄉", neighborhood:"小琉球"},
  {key:"小琉球",    country:"台灣", city:"屏東", district:"琉球鄉", neighborhood:"小琉球"},
  {key:"屏東縣",    country:"台灣", city:"屏東", district:"", neighborhood:""},
  {key:"pingtung",  country:"台灣", city:"屏東", district:"", neighborhood:""},
  // 台東縣
  {key:"台東市",    country:"台灣", city:"台東", district:"台東市", neighborhood:""},
  {key:"臺東市",    country:"台灣", city:"台東", district:"台東市", neighborhood:""},
  {key:"綠島",      country:"台灣", city:"台東", district:"綠島鄉", neighborhood:"綠島"},
  {key:"蘭嶼",      country:"台灣", city:"台東", district:"蘭嶼鄉", neighborhood:"蘭嶼"},
  {key:"鹿野",      country:"台灣", city:"台東", district:"鹿野鄉", neighborhood:""},
  {key:"關山",      country:"台灣", city:"台東", district:"關山鎮", neighborhood:""},
  {key:"成功",      country:"台灣", city:"台東", district:"成功鎮", neighborhood:""},
  {key:"池上",      country:"台灣", city:"台東", district:"池上鄉", neighborhood:"池上"},
  {key:"卑南",      country:"台灣", city:"台東", district:"卑南鄉", neighborhood:""},
  {key:"台東縣",    country:"台灣", city:"台東", district:"", neighborhood:""},
  {key:"taitung",   country:"台灣", city:"台東", district:"", neighborhood:""},
  // 花蓮縣
  {key:"東大門夜市",country:"台灣", city:"花蓮", district:"花蓮市", neighborhood:"東大門夜市"},
  {key:"自強夜市",  country:"台灣", city:"花蓮", district:"花蓮市", neighborhood:"自強夜市"},
  {key:"鯉魚潭",    country:"台灣", city:"花蓮", district:"壽豐鄉", neighborhood:"鯉魚潭"},
  {key:"雲山水",    country:"台灣", city:"花蓮", district:"壽豐鄉", neighborhood:"雲山水"},
  {key:"光復",      country:"台灣", city:"花蓮", district:"光復鄉", neighborhood:""},
  {key:"瑞穗",      country:"台灣", city:"花蓮", district:"瑞穗鄉", neighborhood:""},
  {key:"玉里",      country:"台灣", city:"花蓮", district:"玉里鎮", neighborhood:""},
  {key:"富里",      country:"台灣", city:"花蓮", district:"富里鄉", neighborhood:""},
  {key:"秀林",      country:"台灣", city:"花蓮", district:"秀林鄉", neighborhood:"太魯閣"},
  {key:"太魯閣",    country:"台灣", city:"花蓮", district:"秀林鄉", neighborhood:"太魯閣"},
  {key:"花蓮市",    country:"台灣", city:"花蓮", district:"", neighborhood:""},
  {key:"花蓮縣",    country:"台灣", city:"花蓮", district:"", neighborhood:""},
  {key:"hualien",   country:"台灣", city:"花蓮", district:"", neighborhood:""},
  // 宜蘭縣
  {key:"羅東夜市",  country:"台灣", city:"宜蘭", district:"羅東鎮", neighborhood:"羅東夜市"},
  {key:"羅東林業",  country:"台灣", city:"宜蘭", district:"羅東鎮", neighborhood:"羅東林業文化園區"},
  {key:"礁溪溫泉",  country:"台灣", city:"宜蘭", district:"礁溪鄉", neighborhood:"礁溪溫泉"},
  {key:"礁溪",      country:"台灣", city:"宜蘭", district:"礁溪鄉", neighborhood:"礁溪溫泉"},
  {key:"宜蘭市",    country:"台灣", city:"宜蘭", district:"宜蘭市", neighborhood:""},
  {key:"頭城",      country:"台灣", city:"宜蘭", district:"頭城鎮", neighborhood:""},
  {key:"壯圍",      country:"台灣", city:"宜蘭", district:"壯圍鄉", neighborhood:""},
  {key:"員山",      country:"台灣", city:"宜蘭", district:"員山鄉", neighborhood:""},
  {key:"三星",      country:"台灣", city:"宜蘭", district:"三星鄉", neighborhood:""},
  {key:"冬山",      country:"台灣", city:"宜蘭", district:"冬山鄉", neighborhood:""},
  {key:"蘇澳",      country:"台灣", city:"宜蘭", district:"蘇澳鎮", neighborhood:""},
  {key:"南澳",      country:"台灣", city:"宜蘭", district:"南澳鄉", neighborhood:""},
  {key:"宜蘭縣",    country:"台灣", city:"宜蘭", district:"", neighborhood:""},
  {key:"羅東",      country:"台灣", city:"宜蘭", district:"羅東鎮", neighborhood:""},
  {key:"yilan",     country:"台灣", city:"宜蘭", district:"", neighborhood:""},
  // 澎湖縣
  {key:"馬公",      country:"台灣", city:"澎湖", district:"馬公市", neighborhood:""},
  {key:"澎湖",      country:"台灣", city:"澎湖", district:"", neighborhood:""},
  {key:"penghu",    country:"台灣", city:"澎湖", district:"", neighborhood:""},
  // 金門縣
  {key:"金城",      country:"台灣", city:"金門", district:"金城鎮", neighborhood:""},
  {key:"金湖",      country:"台灣", city:"金門", district:"金湖鎮", neighborhood:""},
  {key:"金沙",      country:"台灣", city:"金門", district:"金沙鎮", neighborhood:""},
  {key:"金門縣",    country:"台灣", city:"金門", district:"", neighborhood:""},
  {key:"kinmen",    country:"台灣", city:"金門", district:"", neighborhood:""},
  // 連江縣（馬祖）
  {key:"南竿",      country:"台灣", city:"馬祖", district:"南竿鄉", neighborhood:""},
  {key:"北竿",      country:"台灣", city:"馬祖", district:"北竿鄉", neighborhood:""},
  {key:"馬祖",      country:"台灣", city:"馬祖", district:"", neighborhood:""},
  {key:"連江縣",    country:"台灣", city:"馬祖", district:"", neighborhood:""},
  {key:"matsu",     country:"台灣", city:"馬祖", district:"", neighborhood:""},


  // ── 中國 ──────────────────────────────────────────────────────────────────
  // 上海
  {key:"外滩",      country:"中國", city:"上海", district:"黃浦區",   neighborhood:"外灘"},
  {key:"外灘",      country:"中國", city:"上海", district:"黃浦區",   neighborhood:"外灘"},
  {key:"南京路",    country:"中國", city:"上海", district:"黃浦區",   neighborhood:"南京路"},
  {key:"豫园",      country:"中國", city:"上海", district:"黃浦區",   neighborhood:"豫園"},
  {key:"新天地",    country:"中國", city:"上海", district:"黃浦區",   neighborhood:"新天地"},
  {key:"南京西路",  country:"中國", city:"上海", district:"靜安區",   neighborhood:"南京西路"},
  {key:"静安寺",    country:"中國", city:"上海", district:"靜安區",   neighborhood:"靜安寺"},
  {key:"衡山路",    country:"中國", city:"上海", district:"徐匯區",   neighborhood:"衡山路"},
  {key:"田子坊",    country:"中國", city:"上海", district:"徐匯區",   neighborhood:"田子坊"},
  {key:"徐家汇",    country:"中國", city:"上海", district:"徐匯區",   neighborhood:"徐家匯"},
  {key:"陆家嘴",    country:"中國", city:"上海", district:"浦東新區", neighborhood:"陸家嘴"},
  {key:"陸家嘴",    country:"中國", city:"上海", district:"浦東新區", neighborhood:"陸家嘴"},
  {key:"上海市",    country:"中國", city:"上海", district:"", neighborhood:""},
  {key:"shanghai",  country:"中國", city:"上海", district:"", neighborhood:""},
  // 北京
  {key:"王府井",    country:"中國", city:"北京", district:"東城區",   neighborhood:"王府井"},
  {key:"南锣鼓巷",  country:"中國", city:"北京", district:"東城區",   neighborhood:"南鑼鼓巷"},
  {key:"故宫",      country:"中國", city:"北京", district:"東城區",   neighborhood:"故宮周邊"},
  {key:"天安门",    country:"中國", city:"北京", district:"東城區",   neighborhood:"天安門"},
  {key:"西单",      country:"中國", city:"北京", district:"西城區",   neighborhood:"西單"},
  {key:"什刹海",    country:"中國", city:"北京", district:"西城區",   neighborhood:"什剎海"},
  {key:"三里屯",    country:"中國", city:"北京", district:"朝陽區",   neighborhood:"三里屯"},
  {key:"国贸",      country:"中國", city:"北京", district:"朝陽區",   neighborhood:"國貿"},
  {key:"798",       country:"中國", city:"北京", district:"朝陽區",   neighborhood:"798"},
  {key:"北京市",    country:"中國", city:"北京", district:"", neighborhood:""},
  {key:"beijing",   country:"中國", city:"北京", district:"", neighborhood:""},
  // 成都
  {key:"春熙路",    country:"中國", city:"成都", district:"錦江區",   neighborhood:"春熙路"},
  {key:"太古里",    country:"中國", city:"成都", district:"錦江區",   neighborhood:"太古里"},
  {key:"宽窄巷子",  country:"中國", city:"成都", district:"武侯區",   neighborhood:"寬窄巷子"},
  {key:"锦里",      country:"中國", city:"成都", district:"武侯區",   neighborhood:"錦里"},
  {key:"玉林",      country:"中國", city:"成都", district:"武侯區",   neighborhood:"玉林"},
  {key:"文殊院",    country:"中國", city:"成都", district:"青羊區",   neighborhood:"文殊院"},
  {key:"成都市",    country:"中國", city:"成都", district:"", neighborhood:""},
  {key:"chengdu",   country:"中國", city:"成都", district:"", neighborhood:""},
  // 廣州
  {key:"北京路",    country:"中國", city:"廣州", district:"越秀區",   neighborhood:"北京路"},
  {key:"上下九",    country:"中國", city:"廣州", district:"越秀區",   neighborhood:"上下九"},
  {key:"天河城",    country:"中國", city:"廣州", district:"天河區",   neighborhood:"天河城"},
  {key:"珠江新城",  country:"中國", city:"廣州", district:"天河區",   neighborhood:"珠江新城"},
  {key:"沙面",      country:"中國", city:"廣州", district:"荔灣區",   neighborhood:"沙面"},
  {key:"广州市",    country:"中國", city:"廣州", district:"", neighborhood:""},
  {key:"廣州市",    country:"中國", city:"廣州", district:"", neighborhood:""},
  {key:"guangzhou", country:"中國", city:"廣州", district:"", neighborhood:""},
  // 深圳
  {key:"海岸城",    country:"中國", city:"深圳", district:"南山區",   neighborhood:"海岸城"},
  {key:"蛇口",      country:"中國", city:"深圳", district:"南山區",   neighborhood:"蛇口"},
  {key:"华强北",    country:"中國", city:"深圳", district:"福田區",   neighborhood:"華強北"},
  {key:"东门",      country:"中國", city:"深圳", district:"羅湖區",   neighborhood:"東門"},
  {key:"深圳市",    country:"中國", city:"深圳", district:"", neighborhood:""},
  {key:"shenzhen",  country:"中國", city:"深圳", district:"", neighborhood:""},
  // 杭州
  {key:"西湖",      country:"中國", city:"杭州", district:"上城區",   neighborhood:"西湖"},
  {key:"河坊街",    country:"中國", city:"杭州", district:"上城區",   neighborhood:"河坊街"},
  {key:"清河坊",    country:"中國", city:"杭州", district:"上城區",   neighborhood:"清河坊"},
  {key:"大运河",    country:"中國", city:"杭州", district:"拱墅區",   neighborhood:"大運河"},
  {key:"灵隐寺",    country:"中國", city:"杭州", district:"西湖區",   neighborhood:"靈隱寺"},
  {key:"龙井",      country:"中國", city:"杭州", district:"西湖區",   neighborhood:"龍井"},
  {key:"杭州市",    country:"中國", city:"杭州", district:"", neighborhood:""},
  {key:"hangzhou",  country:"中國", city:"杭州", district:"", neighborhood:""},
  // 重慶
  {key:"解放碑",    country:"中國", city:"重慶", district:"渝中區",   neighborhood:"解放碑"},
  {key:"洪崖洞",    country:"中國", city:"重慶", district:"渝中區",   neighborhood:"洪崖洞"},
  {key:"磁器口",    country:"中國", city:"重慶", district:"沙坪壩區", neighborhood:"磁器口"},
  {key:"重庆市",    country:"中國", city:"重慶", district:"", neighborhood:""},
  {key:"重慶市",    country:"中國", city:"重慶", district:"", neighborhood:""},
  {key:"chongqing", country:"中國", city:"重慶", district:"", neighborhood:""},

  // ── 泰國 ──────────────────────────────────────────────────────────────────
  // 曼谷
  {key:"暹罗",      country:"泰國", city:"曼谷", district:"巴吞旺縣", neighborhood:"暹羅"},
  {key:"暹羅",      country:"泰國", city:"曼谷", district:"巴吞旺縣", neighborhood:"暹羅"},
  {key:"siam",      country:"泰國", city:"曼谷", district:"巴吞旺縣", neighborhood:"暹羅"},
  {key:"奇隆",      country:"泰國", city:"曼谷", district:"巴吞旺縣", neighborhood:"奇隆"},
  {key:"chidlom",   country:"泰國", city:"曼谷", district:"巴吞旺縣", neighborhood:"奇隆"},
  {key:"素坤逸",    country:"泰國", city:"曼谷", district:"素坤逸",   neighborhood:"素坤逸"},
  {key:"sukhumvit", country:"泰國", city:"曼谷", district:"素坤逸",   neighborhood:"素坤逸"},
  {key:"通罗",      country:"泰國", city:"曼谷", district:"素坤逸",   neighborhood:"通羅"},
  {key:"通羅",      country:"泰國", city:"曼谷", district:"素坤逸",   neighborhood:"通羅"},
  {key:"thonglor",  country:"泰國", city:"曼谷", district:"素坤逸",   neighborhood:"通羅"},
  {key:"艾卡迈",    country:"泰國", city:"曼谷", district:"素坤逸",   neighborhood:"艾卡邁"},
  {key:"ekkamai",   country:"泰國", city:"曼谷", district:"素坤逸",   neighborhood:"艾卡邁"},
  {key:"考山路",    country:"泰國", city:"曼谷", district:"考山路",   neighborhood:"考山路"},
  {key:"khao san",  country:"泰國", city:"曼谷", district:"考山路",   neighborhood:"考山路"},
  {key:"唐人街",    country:"泰國", city:"曼谷", district:"唐人街",   neighborhood:"耀華力路"},
  {key:"yaowarat",  country:"泰國", city:"曼谷", district:"唐人街",   neighborhood:"耀華力路"},
  {key:"察图察",    country:"泰國", city:"曼谷", district:"察圖察",   neighborhood:"察圖察週末市場"},
  {key:"chatuchak", country:"泰國", city:"曼谷", district:"察圖察",   neighborhood:"察圖察週末市場"},
  {key:"曼谷",      country:"泰國", city:"曼谷", district:"", neighborhood:""},
  {key:"bangkok",   country:"泰國", city:"曼谷", district:"", neighborhood:""},
  // 清邁
  {key:"古城",      country:"泰國", city:"清邁", district:"古城區", neighborhood:"古城"},
  {key:"尼曼",      country:"泰國", city:"清邁", district:"尼曼區", neighborhood:"尼曼路"},
  {key:"nimman",    country:"泰國", city:"清邁", district:"尼曼區", neighborhood:"尼曼路"},
  {key:"清迈",      country:"泰國", city:"清邁", district:"", neighborhood:""},
  {key:"清邁",      country:"泰國", city:"清邁", district:"", neighborhood:""},
  {key:"chiang mai",country:"泰國", city:"清邁", district:"", neighborhood:""},
  // 普吉
  {key:"芭东",      country:"泰國", city:"普吉", district:"芭東", neighborhood:"芭東海灘"},
  {key:"patong",    country:"泰國", city:"普吉", district:"芭東", neighborhood:"芭東海灘"},
  {key:"普吉",      country:"泰國", city:"普吉", district:"", neighborhood:""},
  {key:"phuket",    country:"泰國", city:"普吉", district:"", neighborhood:""},

  // ── 新加坡 ────────────────────────────────────────────────────────────────
  {key:"乌节路",    country:"新加坡", city:"新加坡", district:"烏節路", neighborhood:"烏節路"},
  {key:"orchard",   country:"新加坡", city:"新加坡", district:"烏節路", neighborhood:"烏節路"},
  {key:"濱海灣",    country:"新加坡", city:"新加坡", district:"濱海灣", neighborhood:"濱海灣花園"},
  {key:"marina bay",country:"新加坡", city:"新加坡", district:"濱海灣", neighborhood:"濱海灣花園"},
  {key:"克拉碼頭",  country:"新加坡", city:"新加坡", district:"克拉碼頭", neighborhood:"克拉碼頭"},
  {key:"clarke quay",country:"新加坡",city:"新加坡",district:"克拉碼頭",neighborhood:"克拉碼頭"},
  {key:"牛車水",    country:"新加坡", city:"新加坡", district:"牛車水", neighborhood:"牛車水"},
  {key:"chinatown", country:"新加坡", city:"新加坡", district:"牛車水", neighborhood:"牛車水"},
  {key:"小印度",    country:"新加坡", city:"新加坡", district:"小印度", neighborhood:"小印度"},
  {key:"little india",country:"新加坡",city:"新加坡",district:"小印度",neighborhood:"小印度"},
  {key:"阿拉伯街",  country:"新加坡", city:"新加坡", district:"甘榜格南", neighborhood:"阿拉伯街"},
  {key:"arab street",country:"新加坡",city:"新加坡",district:"甘榜格南",neighborhood:"阿拉伯街"},
  {key:"聖淘沙",    country:"新加坡", city:"新加坡", district:"聖淘沙", neighborhood:"聖淘沙"},
  {key:"sentosa",   country:"新加坡", city:"新加坡", district:"聖淘沙", neighborhood:"聖淘沙"},
  {key:"singapore", country:"新加坡", city:"新加坡", district:"", neighborhood:""},
  {key:"新加坡",    country:"新加坡", city:"新加坡", district:"", neighborhood:""},
];

function parseAddressMultiCountry(addr: string): { country?:string; city?: string; district?: string; neighborhood?: string } | null {
  const lower = addr.toLowerCase();
  const sorted = [...ADDRESS_MAP].sort((a,b)=>b.key.length-a.key.length);

  let base: { country?:string; city?: string; district?: string; neighborhood?: string } | null = null;

  // 第一輪：找有商圈的精確關鍵字（key本身就是商圈名稱）
  for(const item of sorted){
    if(item.neighborhood && lower.includes(item.key.toLowerCase())){
      base = { country:item.country, city:item.city, district:item.district, neighborhood:item.neighborhood };
      break;
    }
  }

  // 第二輪：只找行政區層級（neighborhood為空的），商圈留空
  if(!base){
    for(const item of sorted){
      if(!item.neighborhood && lower.includes(item.key.toLowerCase())){
        base = { country:item.country, city:item.city, district:item.district, neighborhood:"" };
        break;
      }
    }
  }

  // 台灣：行政區若沒帶到，用「縣/市 + 區/鄉/鎮/市」規則自動補抓（例：高雄市路竹區 → 路竹區）
  if(base && base.country==="台灣" && !base.district){
    const m = addr.match(/(?:縣|市)([\u4e00-\u9fa5]{1,3}(?:區|鄉|鎮|市))/);
    if(m && m[1]) base.district = m[1];
  }

  // 日本／中國：行政區若沒帶到，用「市○○区 / 東京都○○区」規則自動補抓並轉成「區」
  // 例：福岡県福岡市中央区 → 中央區、東京都渋谷区 → 渋谷區、上海市黃浦区 → 黃浦區
  if(base && (base.country==="日本" || base.country==="中國") && !base.district){
    let m = addr.match(/市([\u3400-\u9fff]{1,4}?区)/);
    if(!m) m = addr.match(/東京都([\u3400-\u9fff]{1,4}?区)/);
    if(m && m[1]) base.district = m[1].replace(/区/g, '區');
  }

  return base;
}

const KR_KEYWORD_MAP = ADDRESS_MAP.filter(x=>x.country==="韓國");

function parseKoreanAddress(addr: string): { city?: string; district?: string; neighborhood?: string } | null {
  const result = parseAddressMultiCountry(addr);
  if(result?.country==="韓國") return result;
  return null;
}

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

function Add({ onBack, onAdd, countries, types, geoData: geoDataProp, onAutoAddNb }) {
  const [f,setF] = useState({ name:"",country:"",city:"",district:"",neighborhood:"",types:[],note:"",address:"",map_query:"",recommendations:"",source_url:"",rating:0,review:"",photos:[] });
  const [saving,setSaving] = useState(false);
  const photoInputRef = useRef(null);
  const set=(k:string,v:any)=>setF((x:any)=>({...x,[k]:v}));

  function handleAddressChange(addr: string) {
    setF((x:any) => ({ ...x, address: addr }));
    if (addr.length > 3) {
      const parsed = parseAddressMultiCountry(addr);
      if (parsed && (parsed.country||parsed.city||parsed.district||parsed.neighborhood)) {
        setF((x:any) => ({
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
      const compressed = await compressImage(file);
      const path = `places/${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`;
      const { error } = await sb.storage.from('photos').upload(path, compressed, { upsert: true, contentType: 'image/jpeg' });
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
    // 自動新增商圈（如果清單裡沒有）
    if(f.country && f.city && (f.district || f.neighborhood) && onAutoAddNb){
      onAutoAddNb(f.country, f.city, f.district, f.neighborhood);
    }
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
            <input value={f.name} onChange={e=>set("name",e.target.value)} placeholder="" style={{ width:"100%", border:"none", outline:"none", fontSize:16, color:"#000", background:"none", fontFamily:"inherit" }} />
          </div>
          <div style={{ padding:"14px 16px", borderBottom:"1px solid #EDE8E2" }}>
            <div style={{ fontSize:11, color:"#8E8E93", marginBottom:5, textTransform:"uppercase", letterSpacing:0.5 }}>地圖搜尋名稱 <span style={{ color:"#C7C7CC", fontWeight:400 }}>· 當地語言・選填</span></div>
            <input value={f.map_query} onChange={e=>set("map_query",e.target.value)} placeholder=""
              style={{ width:"100%", border:"none", outline:"none", fontSize:16, color:"#000", background:"none", fontFamily:"inherit" }} />
          </div>
          <div style={{ padding:"14px 16px" }}>
            <div style={{ fontSize:11, color:"#8E8E93", marginBottom:5, textTransform:"uppercase", letterSpacing:0.5 }}>收藏原因</div>
            <input value={f.note} onChange={e=>set("note",e.target.value)} placeholder="" style={{ width:"100%", border:"none", outline:"none", fontSize:16, color:"#000", background:"none", fontFamily:"inherit" }} />
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

        <div style={{ background:"#FDF8F3", borderRadius:16, overflow:"hidden", marginBottom:12 }}>
          <div style={{ padding:"14px 16px" }}>
            <div style={{ fontSize:11, color:"#8E8E93", marginBottom:5, textTransform:"uppercase", letterSpacing:0.5 }}>地址 <span style={{ color:"#C7C7CC", fontWeight:400 }}>· 貼上自動帶入位置</span></div>
            <input value={f.address} onChange={e=>handleAddressChange(e.target.value)}
              style={{ width:"100%", border:"none", outline:"none", fontSize:15, color:"#000", background:"none", fontFamily:"inherit" }} />
          </div>
        </div>

        <div style={{ background:"#FDF8F3", borderRadius:16, padding:16, marginBottom:12 }}>
          <div style={{ fontSize:11, color:"#8E8E93", marginBottom:10, textTransform:"uppercase", letterSpacing:0.5 }}>類型</div>
          <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
            {types.map(t=>{ const a=f.types.includes(t); return <button key={t} onClick={()=>set("types",a?f.types.filter(x=>x!==t):[...f.types,t])} style={{ padding:"7px 16px", borderRadius:20, border:"none", background:a?"#3C3C3C":"#EDE8E2", color:a?"white":"#3C3C43", fontSize:14, cursor:"pointer", fontWeight:a?600:400 }}>{t}</button>; })}
          </div>
        </div>

        <div style={{ background:"#FDF8F3", borderRadius:16, overflow:"hidden" }}>
          <div style={{ padding:"14px 16px", borderBottom:"1px solid #EDE8E2" }}>
            <div style={{ fontSize:11, color:"#8E8E93", marginBottom:5, textTransform:"uppercase", letterSpacing:0.5 }}>推薦品項</div>
            <textarea value={f.recommendations as string}
              onChange={e=>set("recommendations", e.target.value)}
              placeholder=""
              rows={3}
              style={{ width:"100%", border:"none", outline:"none", fontSize:15, color:"#000", background:"none", fontFamily:"inherit", resize:"none", lineHeight:1.6 }} />
          </div>
          <div style={{ padding:"14px 16px" }}>
            <div style={{ fontSize:11, color:"#8E8E93", marginBottom:5, textTransform:"uppercase", letterSpacing:0.5 }}>來源連結</div>
            <input value={f.source_url} onChange={e=>set("source_url", e.target.value)}
              style={{ width:"100%", border:"none", outline:"none", fontSize:15, color:"#000", background:"none", fontFamily:"inherit" }} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Detail ────────────────────────────────────────────────────────────────────
function Detail({ place, onBack, onStatusChange, onDelete, onEdit, countries, types, geoData }) {
  const [editing, setEditing] = useState(false);
  const [f, setF] = useState({...place});
  const [lightboxLocal, setLightboxLocal] = useState<{photos:string[],index:number}|null>(null);
  const searchName = (place.map_query && place.map_query.trim()) ? place.map_query.trim() : (place.name||"");
  const q = encodeURIComponent([searchName, place.address].map((s:string)=>(s||"").trim()).filter(Boolean).join(" "));

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
            countries={countries} geoData={geoData||GEO}
            onChange={({country,city,district,neighborhood})=>setF(x=>({...x,country,city,district,neighborhood}))} />

          <div style={{ background:"#FDF8F3", borderRadius:16, padding:16, marginBottom:12 }}>
            <div style={{ fontSize:11, color:"#8E8E93", marginBottom:10, textTransform:"uppercase", letterSpacing:0.5 }}>類型</div>
            <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
              {types.map(t=>{ const a=f.types?.includes(t); return <button key={t} onClick={()=>setF(x=>({...x,types:a?x.types.filter(v=>v!==t):[...(x.types||[]),t]}))} style={{ padding:"7px 16px", borderRadius:20, border:"none", background:a?"#000":"#EDE8E2", color:a?"white":"#3C3C43", fontSize:14, cursor:"pointer", fontWeight:a?600:400 }}>{t}</button>; })}
            </div>
          </div>

          <div style={{ background:"#FDF8F3", borderRadius:16, overflow:"hidden", marginBottom:12 }}>
            <div style={{ padding:"14px 16px", borderBottom:"1px solid #EDE8E2" }}>
              <div style={{ fontSize:11, color:"#8E8E93", marginBottom:5, textTransform:"uppercase", letterSpacing:0.5 }}>推薦品項</div>
              <textarea value={typeof f.recommendations === 'string' ? f.recommendations : (f.recommendations||[]).join('\n')}
                onChange={e=>setF((x:any)=>({...x,recommendations:e.target.value}))}
                rows={3}
                style={{ width:"100%", border:"none", outline:"none", fontSize:15, color:"#000", background:"none", fontFamily:"inherit", resize:"none", lineHeight:1.6 }} />
            </div>
            {[["地址","address"],["地圖搜尋名稱","map_query"],["來源連結","source_url"]].map(([label,key],i,arr)=>(
              <div key={key} style={{ padding:"14px 16px", borderBottom:i<arr.length-1?"1px solid #EDE8E2":"none" }}>
                <div style={{ fontSize:11, color:"#8E8E93", marginBottom:5, textTransform:"uppercase", letterSpacing:0.5 }}>{label}</div>
                <input value={(f as any)[key]||""}
                  onChange={e=>setF((x:any)=>({...x,[key]:e.target.value}))}
                  style={{ width:"100%", border:"none", outline:"none", fontSize:15, color:"#000", background:"none", fontFamily:"inherit" }} />
              </div>
            ))}
          </div>

          <RatingRow rating={f.rating||0} review={f.review||""} onChange={({rating,review})=>setF(x=>({...x,rating,review}))} />

          {/* 照片 */}
          <div style={{ background:"#FDF8F3", borderRadius:16, padding:"16px", marginBottom:12 }}>
            <div style={{ fontSize:11, color:"#8E8E93", marginBottom:10, textTransform:"uppercase", letterSpacing:0.5 }}>照片</div>
            <div style={{ display:"flex", gap:8, overflowX:"auto", paddingBottom:2 }}>
              {(f.photos||[]).map((photo:string, i:number) => (
                <div key={i} style={{ flexShrink:0, width:100, height:100, borderRadius:10, overflow:"hidden", position:"relative" }}>
                  <img src={photo} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                  <button onClick={()=>setF((x:any)=>({...x,photos:x.photos.filter((_:any,idx:number)=>idx!==i)}))}
                    style={{ position:"absolute", top:4, right:4, background:"rgba(0,0,0,0.55)", border:"none", borderRadius:"50%", width:22, height:22, color:"white", fontSize:12, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>✕</button>
                </div>
              ))}
              <label style={{ flexShrink:0, width:100, height:100, borderRadius:10, background:"#EDE8E2", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", cursor:"pointer", gap:4 }}>
                <span style={{ fontSize:26, color:"#8E8E93" }}>+</span>
                <span style={{ fontSize:11, color:"#8E8E93" }}>加照片</span>
                <input type="file" accept="image/*" multiple style={{ display:"none" }} onChange={async e=>{
                  const files = Array.from(e.target.files||[]);
                  const urls:string[] = [];
                  for(const file of files as File[]){
                    const compressed = await compressImage(file);
                    const path = `places/${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`;
                    const { error } = await sb.storage.from('photos').upload(path, compressed, { upsert:true, contentType:'image/jpeg' });
                    if(!error){ const { data } = sb.storage.from('photos').getPublicUrl(path); urls.push(data.publicUrl); }
                  }
                  if(urls.length>0) setF((x:any)=>({...x,photos:[...(x.photos||[]),...urls]}));
                }} />
              </label>
            </div>
          </div>

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
      {/* Lightbox */}
      {lightboxLocal && (
        <div onClick={()=>setLightboxLocal(null)}
          style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.92)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <img src={lightboxLocal.photos[lightboxLocal.index]} alt=""
            style={{ maxWidth:"100%", maxHeight:"100%", objectFit:"contain" }}
            onClick={e=>e.stopPropagation()} />
          <button onClick={()=>setLightboxLocal(null)}
            style={{ position:"absolute", top:20, right:20, background:"none", border:"none", color:"white", fontSize:28, cursor:"pointer", lineHeight:1 }}>✕</button>
          {lightboxLocal.photos.length > 1 && (<>
            <button onClick={e=>{e.stopPropagation();setLightboxLocal(l=>l?{...l,index:(l.index-1+l.photos.length)%l.photos.length}:null)}}
              style={{ position:"absolute", left:16, background:"rgba(255,255,255,0.2)", border:"none", borderRadius:"50%", width:40, height:40, color:"white", fontSize:22, cursor:"pointer" }}>‹</button>
            <button onClick={e=>{e.stopPropagation();setLightboxLocal(l=>l?{...l,index:(l.index+1)%l.photos.length}:null)}}
              style={{ position:"absolute", right:16, background:"rgba(255,255,255,0.2)", border:"none", borderRadius:"50%", width:40, height:40, color:"white", fontSize:22, cursor:"pointer" }}>›</button>
          </>)}
        </div>
      )}
      {/* 固定頂部 */}
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
          {place.recommendations && (typeof place.recommendations === 'string' ? place.recommendations : (place.recommendations as string[]).join('\n')).trim().length>0 && (
            <div style={{ padding:"14px 16px" }}>
              <div style={{ fontSize:13, color:"#8E8E93", marginBottom:8 }}>推薦品項</div>
              <div style={{ fontSize:15, color:"#000", lineHeight:1.7, whiteSpace:"pre-line" }}>
                {typeof place.recommendations === 'string' ? place.recommendations : (place.recommendations as string[]).join('\n')}
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

        {/* Photos — view only, tap to enlarge */}
        {(place.photos||[]).length > 0 && (
          <div style={{ background:"#FDF8F3", borderRadius:16, padding:"16px", marginBottom:12 }}>
            <div style={{ fontSize:11, color:"#8E8E93", marginBottom:10, textTransform:"uppercase", letterSpacing:0.5 }}>照片</div>
            <div style={{ display:"flex", gap:8, overflowX:"auto", paddingBottom:2 }}>
              {(place.photos||[]).map((photo, i) => (
                <div key={i} onClick={()=>setLightboxLocal({photos:place.photos, index:i})}
                  style={{ flexShrink:0, width:120, height:120, borderRadius:10, overflow:"hidden", cursor:"pointer" }}>
                  <img src={photo} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ background:"#FDF8F3", borderRadius:16, overflow:"hidden", marginBottom:12 }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"14px 16px" }}>
            <div>
              <div style={{ fontSize:11, color:"#8E8E93", marginBottom:3, textTransform:"uppercase", letterSpacing:0.5 }}>地址</div>
              <div style={{ fontSize:14, color:"#000" }}>{place.address || "未填寫"}</div>
            </div>
            <div style={{ display:"flex", gap:8 }}>
              {/* 中國用高德，其他用 Google Maps */}
              {place.country==="中國" ? (
                <a href={`https://uri.amap.com/search?keyword=${q}`} target="_blank" rel="noreferrer"
                  style={{ width:36, height:36, borderRadius:10, background:"#1677FF", display:"flex", alignItems:"center", justifyContent:"center", textDecoration:"none" }} title="高德地圖">
                  <span style={{ color:"white", fontSize:13, fontWeight:700 }}>高德</span>
                </a>
              ) : (
                <a href={`https://maps.google.com/?q=${q}`} target="_blank" rel="noreferrer"
                  style={{ width:36, height:36, borderRadius:10, background:"#fff", display:"flex", alignItems:"center", justifyContent:"center", textDecoration:"none", boxShadow:"0 1px 4px rgba(0,0,0,0.12)" }} title="Google Maps">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="#EA4335"/>
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 1.93.78 3.68 2.04 4.96L12 2z" fill="#FBBC04"/>
                    <path d="M12 2l4.96 11.96C18.22 12.68 19 10.93 19 9c0-3.87-3.13-7-7-7z" fill="#4285F4"/>
                    <circle cx="12" cy="9" r="2.5" fill="white"/>
                  </svg>
                </a>
              )}
              {/* 韓國加 Naver Maps */}
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
function Notes({ onBack, countries, noteCats, onUpdateNoteCats }) {
  const [country,setCountry]=useState(countries[0]||"韓國");
  const [notes,setNotes]=useState<any[]>([]);
  const [loading,setLoading]=useState(true);
  const [cats,setCats]=useState<string[]>(noteCats||["入境","交通","退稅","禮儀","緊急聯絡","其他"]);
  const [adding,setAdding]=useState(false);
  const [newCat,setNewCat]=useState(noteCats?.[0]||"入境");
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
    const urls:string[]=[];
    for(const file of files as File[]){
      const compressed = await compressImage(file);
      const path = `notes/${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`;
      const { error } = await sb.storage.from('photos').upload(path, compressed, { upsert: true, contentType: 'image/jpeg' });
      if(!error){
        const { data } = sb.storage.from('photos').getPublicUrl(path);
        urls.push(data.publicUrl);
      }
    }
    if(urls.length>0) setter(urls);
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
    if(c&&!cats.includes(c)){
      const newCats=[...cats,c];
      setCats(newCats);
      setNewCat(c);
      if(onUpdateNoteCats) onUpdateNoteCats(newCats);
    }
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
              <input ref={photoInputRef} type="file" accept="image/*" multiple style={{display:"none"}} onChange={e=>handlePhotoAdd(e,(urls:string[])=>setNewPhotos(prev=>[...prev,...urls]))} />
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
                <input ref={editPhotoInputRef} type="file" accept="image/*" multiple style={{display:"none"}} onChange={e=>handlePhotoAdd(e,(urls:string[])=>setEditingNote((n:any)=>({...n,photos:[...(n.photos||[]),...urls]})))} />
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
          onTouchStart={e=>{ e.stopPropagation(); lightboxStartX.current=e.touches[0].clientX; }}
          onTouchMove={e=>e.stopPropagation()}
          onTouchEnd={e=>{
            e.stopPropagation();
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
  const [noteCats,setNoteCats]=useState(["入境","交通","退稅","禮儀","緊急聯絡","其他"]);
  const [geoData,setGeoData]=useState(GEO);
  const [history,setHistory]=useState(["home"]);
  const [selected,setSelected]=useState<any>(null);
  const [selectedCountry,setSelectedCountry]=useState<string|null>(null);
  const [slideX,setSlideX]=useState(0);
  const touchStartX=useRef(0);
  const touchStartY=useRef(0);
  const isSwiping=useRef(false);

  // ── 載入所有資料 ──
  useEffect(()=>{
    Promise.all([
      sb.from('places').select('*').order('created_at',{ascending:false}),
      sb.from('user_settings').select('*').eq('id','default').single(),
    ]).then(([placesRes, settingsRes])=>{
      if(placesRes.data) setPlaces(placesRes.data.map((p:any)=>({...p, map_query: p.summary||''})));
      if(settingsRes.data){
        const s = settingsRes.data;
        if(s.types?.length) setTypes(s.types);
        if(s.country_order?.length){
          setCountryOrder(s.country_order);
          setCountries(s.country_order);
        }
        if(s.note_cats?.length) setNoteCats(s.note_cats);
        if(s.geo_data && Object.keys(s.geo_data).length){
          // 把儲存的自訂商圈合併進 GEO
          const merged = {...GEO};
          for(const [country, cities] of Object.entries(s.geo_data as any)){
            if(!merged[country]) merged[country] = {};
            for(const [city, districts] of Object.entries(cities as any)){
              if(!merged[country][city]) merged[country][city] = {};
              for(const [dist, nbs] of Object.entries(districts as any)){
                const existing = merged[country][city][dist] || [];
                const extra = (nbs as string[]).filter((n:string)=>!existing.includes(n));
                merged[country][city][dist] = [...existing, ...extra];
              }
            }
          }
          setGeoData(merged);
        }
      }
      setLoading(false);
    }).catch(()=>setLoading(false));
  },[]);

  // ── 儲存設定到 Supabase ──
  async function saveSettings(patch: any){
    await sb.from('user_settings').update(patch).eq('id','default');
  }

  async function handleUpdateTypes(newTypes: string[]){
    setTypes(newTypes);
    await saveSettings({types: newTypes});
  }

  async function handleUpdateOrder(newOrder: string[]){
    setCountryOrder(newOrder);
    await saveSettings({country_order: newOrder});
  }

  async function handleUpdateCountries(newCountries: string[]){
    setCountries(newCountries);
  }

  // ── 設定頁的城市/行政區/商圈變更：存進 Supabase ──
  async function handleUpdateGeo(newGeo: any){
    setGeoData(newGeo);
    await saveSettings({geo_data: newGeo});
  }

  // ── 地址帶出新的行政區/商圈時，自動加入 geoData 並存進 Supabase ──
  async function autoAddNeighborhood(country:string, city:string, district:string, neighborhood:string){
    if(!country || !city) return;
    const dist = (district||'').trim() || '其他';
    const nb = (neighborhood||'').trim();
    const newGeo:any = JSON.parse(JSON.stringify(geoData));
    if(!newGeo[country]) newGeo[country]={};
    if(!newGeo[country][city]) newGeo[country][city]={};
    if(!newGeo[country][city][dist]) newGeo[country][city][dist]=[];
    if(nb && !newGeo[country][city][dist].includes(nb)){
      newGeo[country][city][dist] = [...newGeo[country][city][dist], nb];
    }
    setGeoData(newGeo);
    await saveSettings({geo_data: newGeo});
  }

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
      recommendations: (typeof p.recommendations === 'string' ? p.recommendations.split('\n') : (p.recommendations||[])).map((s:string)=>s.trim()).filter(Boolean),
      source_url:p.source_url||'',
      rating:0, review:'', summary:p.map_query||'', tags:[], photos:p.photos||[],
    };
    const {data,error}=await sb.from('places').insert([payload]).select().single();
    if(!error&&data) setPlaces(ps=>[{...data, map_query:data.summary||''},...ps]);
    else { console.error('handleAdd error:', error); alert('新增失敗：' + (error?.message || JSON.stringify(error))); }
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
      recommendations: (typeof u.recommendations === 'string' ? u.recommendations.split('\n') : (u.recommendations||[])).map((s:string)=>s.trim()).filter(Boolean), source_url:u.source_url||'',
      rating:u.rating||0, review:u.review||'', photos:u.photos||[],
      status:u.status, summary:u.map_query||'', tags:u.tags||[],
    }).eq('id',u.id);
    if(!error){ setPlaces(ps=>ps.map(p=>p.id===u.id?u:p)); setSelected(u); }
    else { console.error('handleEdit error:', error); alert('儲存失敗：' + (error?.message || JSON.stringify(error))); }
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
          {page==="add"&&<Add onBack={goBack} onAdd={handleAdd} countries={countries} types={types} geoData={geoData} onAutoAddNb={autoAddNeighborhood} />}
          {page==="country"&&<CountryPage country={selectedCountry!} places={places} onBack={goBack} onSelect={p=>{setSelected(p);setHistory(h=>[...h,"detail"]);}} />}
          {page==="search"&&<Search places={places} onBack={goBack} onSelect={p=>{setSelected(p);setHistory(h=>[...h,"detail"]);}} />}
          {page==="notes"&&<Notes onBack={goBack} countries={countries} noteCats={noteCats} onUpdateNoteCats={async (cats:string[])=>{ setNoteCats(cats); await saveSettings({note_cats:cats}); }} />}
          {page==="settings"&&<Settings countries={countries} types={types} countryOrder={countryOrder} geoData={geoData} onBack={goBack} onUpdateCountries={handleUpdateCountries} onUpdateTypes={handleUpdateTypes} onUpdateOrder={handleUpdateOrder} onUpdateGeo={handleUpdateGeo} />}
          {page==="detail"&&selected&&(
            <Detail place={selected} onBack={goBack} countries={countries} types={types} geoData={geoData}
              onStatusChange={handleStatusChange} onEdit={handleEdit} onDelete={handleDelete} />
          )}
        </div>
      )}
    </div>
  );
}
