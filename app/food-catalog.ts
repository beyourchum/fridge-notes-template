import {seasonalFruits} from './seasonal-fruit.ts';
const leafy=['高麗菜','空心菜','地瓜葉','花椰菜','青花菜','小白菜','青江菜','菠菜','A菜','大白菜','油菜','芥藍菜','芥菜','茼蒿','莧菜','小松菜','美生菜'];
export const combinedMushroomName='鴻喜菇、美白菇';
const combinedMushroomAliases=new Set(['鴻喜菇','鴻禧菇','美白菇',combinedMushroomName,'鴻禧菇、美白菇']);
function compactFoodName(name:string){return name.normalize('NFKC').replace(/\s+/g,'').trim();}
export function isCombinedMushroomName(name:string){return combinedMushroomAliases.has(compactFoodName(name));}
export function normalizeFoodName(name:string){return isCombinedMushroomName(name)?combinedMushroomName:name.trim();}
export function foodOptions(zone:string):string[]{
 if(zone==='調味料')return ['鹽','黑胡椒','白胡椒','柴魚片','干貝調味粉','醬油','昆布醬油','孜然','好吃粉（煙燻）','好吃粉（辣）','山椒','七味粉','鵝油','蒜油','辣油','香蒜粉','芥末胡椒','羅勒葉'];
 if(zone==='奶油．起司')return ['奶油','起司']; if(zone==='不規則・散裝蔬果')return seasonalFruits.map(v=>v.name);
 if(zone.startsWith('蔬果大格'))return leafy;
 if(zone.startsWith('蔬果小格'))return ['紅蘿蔔','櫛瓜','杏鮑菇','香菇',combinedMushroomName,'小黃瓜',...seasonalFruits.map(v=>v.name)];
 return ({'罐頭':['鮪魚罐頭'],'辛香料':['蔥','薑','蒜','蔥鹽'],'蛋':['蛋'],'豆漿牛奶':['豆漿','牛奶'],'豆腐':['雞蛋豆腐','板豆腐','嫩豆腐','鹽滷豆腐'],'優格':['小優格','大優格'],'根莖蔬菜':['洋蔥','馬鈴薯'],'白飯':['白飯','白米'],'肉品':['雞腿','雞胸','豬絞肉','牛絞肉','蝦仁','鮭魚','鯛魚','豬肉片','牛肉片','柳葉魚','漢堡排'],'冷凍食品':['牛肉捲','米漢堡','水餃']} as Record<string,string[]>)[zone]??[];
}

const aliases:Record<string,string>={'釋迦':'番荔枝','芭樂':'番石榴','火龍果':'紅龍果','李子':'李','文旦':'文旦柚','生薑':'薑','老薑':'薑','嫩薑':'薑','蔥':'青蔥','蒜':'大蒜','高麗菜':'甘藍','大白菜':'結球白菜','美生菜':'結球萵苣','紅蘿蔔':'胡蘿蔔','白蘿蔔':'蘿蔔','大黃瓜':'胡瓜','菜豆':'長豇豆','青花菜':'花椰菜','綠花椰菜':'花椰菜','白花椰菜':'花椰菜','青江':'青江菜','蕃茄':'番茄','蒜頭':'大蒜'};
export function seasonalFoodId(name:string):string{
 const normalized=compactFoodName(name).replace(/^a菜$/i,'A菜');
 if(/杏鮑菇$/.test(normalized))return '杏鮑菇';
 if(/香菇$/.test(normalized))return '香菇';
 if(isCombinedMushroomName(normalized))return '其他菇';
 if(/菇(?:類)?$/.test(normalized))return '其他菇';
 return aliases[normalized]??normalized;
}
export function matchesSeasonalFood(name:string,produce:{id:string;name:string}):boolean{return seasonalFoodId(name)===seasonalFoodId(produce.id)||seasonalFoodId(name)===seasonalFoodId(produce.name);}
const confirmedUnits:Record<string,string>={'漢堡排':'顆','奶油':'條','起司':'片','鮪魚罐頭':'罐','蔥':'盒','薑':'盒','蒜':'盒','蔥鹽':'盒','牛肉捲':'個','米漢堡':'個','水餃':'包','雞腿':'包','雞胸':'包','蝦仁':'包','豬絞肉':'盒','牛絞肉':'盒','鮭魚':'盒','鯛魚':'盒','豬肉片':'盒','牛肉片':'盒','柳葉魚':'盒','洋蔥':'顆','馬鈴薯':'顆','白飯':'盒','白米':'包','紅蘿蔔':'根','櫛瓜':'根','小黃瓜':'根','杏鮑菇':'包',[combinedMushroomName]:'包','鴻喜菇':'包','鴻禧菇':'包','美白菇':'包','蛋':'顆','豆漿':'瓶','牛奶':'瓶','小優格':'盒','大優格':'盒','雞蛋豆腐':'盒','板豆腐':'盒','嫩豆腐':'盒','鹽滷豆腐':'包',...Object.fromEntries(leafy.map(name=>[name,name==='高麗菜'?'顆':'包']))};
export function defaultFoodUnit(name:string):string|undefined{return confirmedUnits[name.trim()]??(['杏鮑菇','香菇','其他菇'].includes(seasonalFoodId(name))?'包':undefined);}

