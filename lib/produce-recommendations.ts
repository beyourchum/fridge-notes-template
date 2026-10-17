export type ProduceRecommendation={kind:'vege'|'fruit';name:string;rank:number;url:string};
export type RecommendationData={entries:ProduceRecommendation[];fetchedAt:string};
export function parseRecommendations(html:string):ProduceRecommendation[]{
  const entries:ProduceRecommendation[]=[];
  for(const heading of html.matchAll(/<h4\b[^>]*>([\s\S]*?)<\/h4>/gi)){
    const link=heading[1].match(/<a\b[^>]*href=["'](\/(vege|fruit)\/[^"']+)["'][^>]*>([\s\S]*?)<\/a>/i);
    if(!link)continue;
    const text=link[3].replace(/<[^>]*>/g,' ').replace(/&nbsp;|&#160;/g,' ').replace(/&amp;/g,'&').replace(/\s+/g,' ').trim();
    const match=text.match(/^推薦No\s*:\s*(\d+)\s+(.+)$/);
    if(!match)continue;
    const rank=Number(match[1]);
    if(rank<1||rank>10)continue;
    entries.push({kind:link[2] as 'vege'|'fruit',name:match[2],rank,url:new URL(link[1],'https://www.twfood.cc').href});
  }
  if(!entries.length)throw Error('推薦名單格式已改變');
  return entries;
}
const aliases:Record<string,string>={'甘藍':'高麗菜','捲心菜':'高麗菜','包心白':'大白菜','結球白菜':'大白菜','花胡瓜':'小黃瓜','紅龍果':'火龍果','番石榴':'芭樂','胡蘿蔔':'紅蘿蔔','蕃茄':'番茄','青蔥':'蔥','大蒜':'蒜','結球萵苣':'美生菜'};
function key(name:string){const n=name.normalize('NFKC').replace(/\s+/g,'').toLowerCase();return aliases[n]??n;}
function recommendationKeys(name:string){
  if(name.startsWith('柚子-文旦'))return ['文旦柚'];
  const alternate=Array.from(name.matchAll(/[（(]([^）)]+)[）)]/g)).flatMap(m=>m[1].split(/[,、，]/));
  return [name.split(/[-（(]/)[0],...alternate].map(key);
}
export function recommendationFor(entries:ProduceRecommendation[],produce:{id:string;name:string},kind:'vege'|'fruit'){
  return entries.filter(e=>e.kind===kind).find(e=>recommendationKeys(e.name).some(k=>k===key(produce.id)||k===key(produce.name)));
}
