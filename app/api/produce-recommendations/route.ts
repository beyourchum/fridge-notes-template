import {parseRecommendations,type RecommendationData} from '../../../lib/produce-recommendations';
export const dynamic='force-dynamic';
let cached:RecommendationData|undefined;
let pending:Promise<RecommendationData>|undefined;
async function refresh(){
  const pages=await Promise.all(['vege','fruit'].flatMap(kind=>[1,2].map(async page=>{
  const response=await fetch('https://www.twfood.cc/'+kind+'?page='+page+'&per-page=5',{signal:AbortSignal.timeout(10000),redirect:'manual'});
  if(!response.ok)throw Error('來源無法讀取');
  const html=await response.text();
  if(html.length>2000000)throw Error('來源內容過大');
  return parseRecommendations(html).filter(e=>e.kind===kind);
  })));
  const entries=pages.flat();
  for(const kind of ['vege','fruit']){
    const ranks=new Set(entries.filter(e=>e.kind===kind).map(e=>e.rank));
    if(ranks.size!==10)throw Error('前十名推薦資料不完整');
  }
  const result={entries,fetchedAt:new Date().toISOString()};
  cached=result;return result;
}
export async function GET(){
  try{
    if(cached&&Date.now()-Date.parse(cached.fetchedAt)<3600000)return Response.json(cached,{headers:{'Cache-Control':'no-store'}});
    pending??=refresh().finally(()=>{pending=undefined;});
    return Response.json(await pending,{headers:{'Cache-Control':'no-store'}});
  }catch(error){console.error('twfood recommendation fetch failed',error);return Response.json({error:'暫時無法讀取推薦名單，請稍後重試。'},{status:502,headers:{'Cache-Control':'no-store'}});}
}
