const allowedHosts=new Set(['youtube.com','www.youtube.com','m.youtube.com','youtu.be','www.instagram.com','instagram.com','www.facebook.com','facebook.com','m.facebook.com','fb.watch','icook.tw','www.icook.tw','cookpad.com','www.cookpad.com']);
export function validateRecipeUrl(value:string):URL {
  let url:URL;try{url=new URL(value);}catch{throw new Error('請貼上完整的 https 影片或食譜網址。');}
  if(url.protocol!=='https:'||url.username||url.password||url.port||!allowedHosts.has(url.hostname))throw new Error('目前支援 YouTube、Instagram、Facebook、愛料理和 Cookpad 的 https 連結。其他來源請改貼文字或上傳截圖。');
  url.hash='';return url;
}
function entities(text:string):string {return text.replace(/&(?:amp|quot|apos|lt|gt|nbsp|#\d+|#x[\da-f]+);/gi,m=>{const map:Record<string,string>={'&amp;':'&','&quot;':'"','&apos;':"'",'&lt;':'<','&gt;':'>','&nbsp;':' '};if(m in map)return map[m];const n=m.startsWith('&#x')?parseInt(m.slice(3,-1),16):parseInt(m.slice(2,-1),10);return Number.isFinite(n)&&n>0&&n<=0x10ffff?String.fromCodePoint(n):m;});}
function plain(text:unknown):string {return typeof text==='string'?entities(text.replace(/<br\s*\/?\s*>/gi,'\n').replace(/<[^>]*>/g,'')).trim():'';}
function flattenSteps(value:unknown):string[] {
  if(typeof value==='string')return [plain(value)];
  if(Array.isArray(value))return value.flatMap(flattenSteps);
  if(value&&typeof value==='object'){const o=value as Record<string,unknown>;return o.itemListElement?flattenSteps(o.itemListElement):o.text?flattenSteps(o.text):o.name?flattenSteps(o.name):[];}
  return [];
}
function ingredientText(value:unknown):string[] {
  if(typeof value==='string')return [plain(value)];if(Array.isArray(value))return value.flatMap(ingredientText);
  if(value&&typeof value==='object'){const o=value as Record<string,unknown>;if(o.itemListElement)return ingredientText(o.itemListElement);if(typeof o.name==='string')return [[o.name,o.value,o.unitText].filter(v=>typeof v==='string'||typeof v==='number').join(' ')];}
  return [];
}
function findRecipes(value:unknown,depth=0):Record<string,unknown>[] {
  if(depth>12||!value)return [];if(Array.isArray(value))return value.flatMap(v=>findRecipes(v,depth+1));
  if(typeof value==='object'){const o=value as Record<string,unknown>;const types=Array.isArray(o['@type'])?o['@type']:[o['@type']];if(types.includes('Recipe'))return [o];return Object.values(o).flatMap(v=>findRecipes(v,depth+1));}return [];
}
function jsonAfter(html:string,marker:string):unknown {
  const pos=html.indexOf(marker);if(pos<0)return null;const start=html.indexOf('{',pos+marker.length);if(start<0)return null;
  let depth=0,quoted=false,escape=false;for(let i=start;i<html.length;i++){const c=html[i];if(quoted){if(escape)escape=false;else if(c==='\\')escape=true;else if(c==='"')quoted=false;}else if(c==='"')quoted=true;else if(c==='{')depth++;else if(c==='}'&&--depth===0){try{return JSON.parse(html.slice(start,i+1));}catch{return null;}}}return null;
}
export function extractRecipePage(html:string):{text:string;title:string;method:string;warnings:string[]} {
  const recipes:Record<string,unknown>[]=[];
  for(const tag of html.matchAll(/<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)){try{recipes.push(...findRecipes(JSON.parse(tag[1])));}catch{}}
  const complete=recipes.filter(r=>ingredientText(r.recipeIngredient).length&&flattenSteps(r.recipeInstructions).length);
  if(recipes.length>1)throw new Error('這個頁面包含多份食譜資料，請改貼其中一道的連結或文字。');
  const r=complete[0]??recipes[0];
  if(r){const title=plain(r.name);return {title,text:[title,'材料',...ingredientText(r.recipeIngredient),'做法',...flattenSteps(r.recipeInstructions)].join('\n'),method:'網頁食譜資料',warnings:[]};}
  const player=jsonAfter(html,'ytInitialPlayerResponse') as {videoDetails?:{title?:string;shortDescription?:string}}|null;
  if(player?.videoDetails?.shortDescription){return {title:player.videoDetails.title??'',text:player.videoDetails.shortDescription,method:'影片說明欄',warnings:['本次讀取影片說明欄，未分析影片畫面或聲音。']};}
  const meta:Record<string,string>={};for(const match of html.matchAll(/<meta\b[^>]*>/gi)){const attrs:Record<string,string>={};for(const a of match[0].matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g))attrs[a[1].toLowerCase()]=a[2]??a[3];const key=attrs.property??attrs.name;if(key&&attrs.content)meta[key]=entities(attrs.content);}
  const description=meta['og:description']??meta.description??'';
  if(description.trim().length<30)throw new Error('這個連結沒有可讀取的完整食譜內容，或平台限制讀取。請貼上說明欄／字幕，或上傳食譜截圖；來源連結可保留。');
  return {title:meta['og:title']??'',text:description,method:'頁面公開說明',warnings:['只取得頁面公開說明，可能不完整；未分析影片畫面或聲音。']};
}
export async function fetchRecipePage(value:string,fetcher:typeof fetch=fetch) {
  let url=validateRecipeUrl(value);const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),15000);
  try{
    for(let redirects=0;redirects<=4;redirects++){
      const response=await fetcher(url.href,{redirect:'manual',signal:controller.signal,headers:{Accept:'text/html,application/xhtml+xml'}});
      if([301,302,303,307,308].includes(response.status)){const location=response.headers.get('location');await response.body?.cancel();if(!location)throw new Error('連結轉址失敗，請使用完整原始網址。');url=validateRecipeUrl(new URL(location,url).href);continue;}
      if(!response.ok){await response.body?.cancel();throw new Error('平台目前不允許讀取這個連結，請改貼說明欄／字幕或上傳截圖。');}
      if(!/text\/html|application\/xhtml\+xml/i.test(response.headers.get('content-type')??'')){await response.body?.cancel();throw new Error('這個連結不是可讀取的食譜頁面，請改用影片分享網址。');}
      const reader=response.body?.getReader();if(!reader)throw new Error('沒有取得頁面內容。');let bytes=0;const chunks:Uint8Array[]=[];
      try{while(true){const {value,done}=await reader.read();if(done)break;bytes+=value.length;if(bytes>2500000){await reader.cancel();throw new Error('頁面過大，請改貼食譜文字或截圖。');}chunks.push(value);}}finally{reader.releaseLock();}
      const joined=new Uint8Array(bytes);let offset=0;for(const chunk of chunks){joined.set(chunk,offset);offset+=chunk.length;}
      const extracted=extractRecipePage(new TextDecoder().decode(joined));if(extracted.text.length>30000)throw new Error('頁面內容過長，請貼上單道食譜的材料與做法。');
      return {...extracted,url:url.href};
    }throw new Error('連結轉址過多，請使用完整原始網址。');
  }catch(e){if(controller.signal.aborted)throw new Error('讀取連結逾時，請稍後重試，或貼上食譜文字。');throw e;}finally{clearTimeout(timer);}
}
