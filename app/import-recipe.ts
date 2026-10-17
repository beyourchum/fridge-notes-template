import type {Ingredient,CookingStep,Recipe} from './kitchen';

export function normalizeOcrText(text:string):string {return text.replace(/([\u3400-\u9fff])[ \t]+(?=[\u3400-\u9fff])/g,'$1');}

const numberText='(?:\\d+(?:\\.\\d+)?(?:\\s*[/／]\\s*\\d+)?|[一二三四五六七八九十兩两半])';
const unitText='(?:公斤|公克|毫升|公升|大匙|小匙|茶匙|湯匙|汤匙|kg|ml|mL|g|L|顆|颗|個|个|包|盒|罐|瓶|袋|片|塊|块|條|条|根|把|份|克|杯|碗|匙)';
const unitMap:Record<string,string>={g:'克',公克:'克',kg:'公斤',ml:'毫升',mL:'毫升',L:'公升',小匙:'茶匙',湯匙:'大匙',汤匙:'大匙',颗:'顆',个:'個',块:'塊',条:'條'};
function quantity(text:string):number|null {const v=text.replace(/\s/g,'').replace('／','/');const chinese:Record<string,number>={一:1,二:2,兩:2,两:2,三:3,四:4,五:5,六:6,七:7,八:8,九:9,十:10,半:0.5};if(v in chinese)return chinese[v];if(v.includes('/')){const [a,b]=v.split('/').map(Number);return b>0?a/b:null;}const n=Number(v);return Number.isFinite(n)&&n>0?n:null;}
export function parseIngredient(line:string):Ingredient {
  const original=line.trim();const clean=original.normalize('NFKC').replace(/^[•●・*\-]\s*/, '').trim();
  const result:Ingredient={id:crypto.randomUUID(),name:original,amount:null,unit:'份'};
  const tail=new RegExp(`^(.+?)\\s*[:：]?\\s*(${numberText})\\s*(${unitText})$`,'i').exec(clean);
  const head=new RegExp(`^(${numberText})\\s*(${unitText})\\s*(.+)$`,'i').exec(clean);
  const match=tail??head;if(!match)return result;
  const name=(tail?match[1]:match[3]).trim().replace(/[：:]$/,'').trim();
  const n=quantity(tail?match[2]:match[1]);const unit=tail?match[3]:match[2];
  if(!name||n===null||n<=0||n>100000||/[\d一二三四五六七八九十兩半]\s*(?:[-~～至到]|或)\s*$/.test(name))return result;
  const amount=Math.round(n*1000)/1000;if(amount<=0)return result;
  return {...result,name,amount,unit:unitMap[unit]??unit};
}
export function parseStep(line:string):CookingStep {
  const text=line.trim().replace(/^(?:(?:步驟|步骤|Step)\s*)?[（(]?\d+[）).、:：]\s*/i,'');
  const appliances=['電子鍋','微波爐','氣炸鍋','電磁爐','不需加熱'].filter(a=>text.includes(a));
  const numbers=Array.from(text.normalize('NFKC').matchAll(/(\d+(?:\.\d+)?)\s*(分鐘|分钟|小時|小时|秒鐘|秒钟|秒)/g));
  let minutes:number|null=null;
  if(numbers.length===1&&!/[\d一二三四五六七八九十]\s*(?:[-~～至到]|或)\s*\d/.test(text)) {
    const m=numbers[0];const value=Number(m[1])*(/小/.test(m[2])?60:/秒/.test(m[2])?1/60:1);
    if(value<=1440)minutes=Math.round(value*1000)/1000;
  }
  return {id:crypto.randomUUID(),text,appliance:appliances.length===1?appliances[0]:'',minutes};
}
const materialHeading=/^[【\[（(]?\s*(?:食材|材料|配料|調味料|调味料|用料|ingredients)\s*[】\]）)]?\s*[:：]?\s*/i;
const stepHeading=/^[【\[（(]?\s*(?:做法|作法|步驟|步骤|料理步驟|烹調步驟|製作方法|制作方法|directions|instructions|method)\s*[】\]）)]?\s*[:：]?\s*/i;
export type ImportResult={recipe:Recipe;warnings:string[];unassigned:string[]};
export function parseRecipeText(raw:string,title=''):ImportResult {
  if(!raw.trim())throw new Error('請先提供食譜文字。');
  if(raw.length>30000)throw new Error('食譜文字超過 30,000 字，請一次匯入一道料理。');
  const materialLines:string[]=[],stepLines:string[]=[],unassigned:string[]=[];
  let mode:'materials'|'steps'|''='',name=title.trim().slice(0,100);
  const lines=raw.replace(/\r/g,'').split('\n').flatMap(line=>line.split(/(?=【(?:材料|食材|做法|步驟)】)/)).map(s=>s.trim()).filter(Boolean);
  for(let index=0;index<lines.length;index++){
    let line=lines[index];
    if(materialHeading.test(line)){mode='materials';line=line.replace(materialHeading,'').trim();if(!line)continue;}
    else if(stepHeading.test(line)){mode='steps';line=line.replace(stepHeading,'').trim();if(!line)continue;}
    else if(/^(?:備註|备注|小提醒|小撇步|notes?)\s*[:：]?/i.test(line)){mode='';unassigned.push(line);continue;}
    if(mode==='materials'){materialLines.push(...line.split(/[、；;]/).filter(x=>x.trim()));continue;}
    if(mode==='steps'){stepLines.push(line);continue;}
    if(/^(?:\d+[.)、]|步[驟骤]\s*\d+|Step\s*\d+)/i.test(line)){mode='steps';stepLines.push(line);continue;}
    const parsed=parseIngredient(line);
    if(parsed.amount!==null){materialLines.push(line);continue;}
    if(index===0&&!name&&line.length<=100){name=line.replace(/^(?:食譜|食谱|菜名|料理名稱)\s*[:：]\s*/,'');continue;}
    unassigned.push(line);
  }
  if(materialLines.length>200||stepLines.length>200)throw new Error('內容超過 200 項材料或步驟，請分成不同食譜匯入。');
  if(materialLines.some(line=>line.length>10000)||stepLines.some(line=>line.length>20000))throw new Error('單項材料或步驟過長，請補上適當換行後再匯入。');
  const materials=materialLines.map(parseIngredient),instructions=stepLines.map(parseStep);
  const warnings:string[]=[];
  if(!materials.length)warnings.push('尚未辨識出材料列表，可補上「材料」標題後重新整理，或在下一步手動補齊。');
  if(!instructions.length)warnings.push('尚未辨識出烹調步驟，可補上「做法」標題後重新整理，或在下一步手動補齊。');
  if(materials.some(m=>m.amount===null))warnings.push('部分材料份量未拆出，原文保留在材料名稱中。');
  if(instructions.some(s=>s.minutes===null||!s.appliance))warnings.push('未明確提供的廚具或時間維持空白。');
  if(unassigned.length)warnings.push(`${unassigned.length} 行未分類內容已保留在來源原文，請確認是否需要補入材料或步驟。`);
  return {recipe:{id:crypto.randomUUID(),name,ingredients:materialLines.join('\n').slice(0,10000),steps:stepLines.join('\n').slice(0,20000),materials,instructions},warnings,unassigned};
}
