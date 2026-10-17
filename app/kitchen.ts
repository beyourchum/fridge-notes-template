export const units = ['克', '毫升', '顆', '盒', '包', '個', '瓶', '根', '罐', '條', '片'];
export const recipeUnits = [...units, '茶匙', '匙'];
export const appliances = ['不需加熱', '電子鍋', '微波爐', '氣炸鍋', '電磁爐'] as const;
export type Item = {id:string; name:string; qty:number; unit:string; zone:string; min:number; expiry:string};
export type Ingredient = {id:string; name:string; amount:number|null; unit:string};
export type OptionalGroup = {id:string; name:string; mode:'one'|'any'; options:Ingredient[]};
export type CookingStep = {id:string; text:string; appliance:string; minutes:number|null};
export type RecipeSource = {kind:'text'|'image'|'url';url?:string;text:string;reviewedText?:string;files?:string[];method:string;warnings:string[]};
export type Recipe = {id:string; name:string; ingredients:string; steps:string; materials?:Ingredient[]; optionalGroups?:OptionalGroup[]; instructions?:CookingStep[];source?:RecipeSource;verified?:boolean};
export type Data = {items:Item[]; recipes:Recipe[]};
export function newIngredient():Ingredient {return {id:crypto.randomUUID(),name:'',amount:null,unit:'克'};}
export function newOptionalGroup():OptionalGroup {return {id:crypto.randomUUID(),name:'自由添加',mode:'any',options:[newIngredient()]};}
export function toggleOptionalSelection(group:OptionalGroup,selected:string[],id:string):string[] {
  const current=selected.filter(value=>group.options.some(option=>option.id===value));
  if(current.includes(id))return current.filter(value=>value!==id);
  if(!group.options.some(option=>option.id===id))return current;
  return group.mode==='one'?[id]:[...current,id];
}
export function newStep():CookingStep {return {id:crypto.randomUUID(),text:'',appliance:'',minutes:null};}
export function recipeMaterials(recipe:Recipe):Ingredient[] {
  return recipe.materials ?? recipe.ingredients.split(/\r?\n/).filter(line=>line.trim()).map((name,index)=>({id:`legacy-material-${index}`,name,amount:null,unit:'克'}));
}
export function recipeSteps(recipe:Recipe):CookingStep[] {
  return recipe.instructions ?? recipe.steps.split(/\r?\n/).filter(line=>line.trim()).map((text,index)=>({id:`legacy-step-${index}`,text,appliance:'',minutes:null}));
}
export function materialSummary(recipe:Recipe) {return [recipeMaterials(recipe).map(m=>`${m.name}${m.amount===null?'':` ${m.amount} ${m.unit}`}`).join('、'),...(recipe.optionalGroups??[]).map(g=>`選配：${g.name}（${g.options.map(m=>m.name).join('／')}）`)].filter(Boolean).join('；');}

const ingredientAliases:Record<string,string>={'雞蛋':'蛋','蕃茄':'番茄','蒜頭':'蒜','大蒜':'蒜','青蔥':'蔥','胡蘿蔔':'紅蘿蔔','馬鈴薯':'馬鈴薯'};
const leafyIngredients=new Set(['葉菜','葉菜類','葉菜類蔬菜','高麗菜','甘藍','空心菜','蕹菜','地瓜葉','甘藷葉','小白菜','青江菜','青江','菠菜','a菜','大白菜','結球白菜','油菜','芥藍菜','芥藍','芥菜','茼蒿','莧菜','紅莧菜','白莧菜','小松菜','美生菜','結球萵苣','萵苣','生菜','大陸妹','油麥菜','蘿蔓','蘿蔓生菜','山茼蒿','皇宮菜','莙薘菜']);
const mushroomIngredients=new Set(['菇','菇類','其他菇','綜合菇','綜合菇類','香菇','鮮香菇','新鮮香菇','乾香菇','杏鮑菇','鴻喜菇','美白菇','鴻喜菇、美白菇','金針菇','金針姑','雪白菇','白玉菇','秀珍菇','洋菇','蘑菇','舞菇','珊瑚菇','柳松菇','猴頭菇','蠔菇']);
function ingredientKey(name:string) {
  const key=name.normalize('NFKC').replace(/\s+/g,'').toLowerCase();
  if(leafyIngredients.has(key))return '葉菜';
  if(mushroomIngredients.has(key))return '菇類';
  return ingredientAliases[key]??key;
}
export function recipeStock(recipe:Recipe,items:Item[]) {
  const materials=Array.from(new Map(recipeMaterials(recipe).filter(m=>m.name.trim()).map(m=>[ingredientKey(m.name),m.name.trim()])).entries());
  const stocked=new Set(items.filter(i=>i.qty>0).map(i=>ingredientKey(i.name)));
  const missing=materials.filter(([key])=>!stocked.has(key)).map(([,name])=>name);
  const matched=materials.length-missing.length;
  const status=materials.length===0?'unknown':missing.length===0?'ready':matched>0&&missing.length<=2?'near':'missing';
  return {status,missing,matched,total:materials.length};
}
