import {getDb} from '../../../db';
import {kitchens} from '../../../db/schema';
import {eq,and} from 'drizzle-orm';
import {z} from 'zod';
import type {Data} from '../../kitchen';
import {isCombinedMushroomName,normalizeFoodName} from '../../food-catalog';
import {ingredientSchema,optionalGroupsSchema} from '../../recipe-options-schema';
const normalizeZone=(zone:string)=>zone==='鋁罐飲料・零食'?'蛋':zone;
function earlierExpiry(a:string,b:string){if(!a)return b;if(!b)return a;return a<b?a:b;}
function normalizeData(data:Data):Data{
 const items:Data['items']=[];
 const combined=new Map<string,Data['items'][number]>();
 for(const raw of data.items){
  const zone=normalizeZone(raw.zone);
  const name=normalizeFoodName(raw.name);
  const item={...raw,name,zone,unit:zone==='調味料'?'':raw.unit,...(zone==='調味料'?{qty:raw.qty>0?1:0,min:0}: {})};
  if(!isCombinedMushroomName(raw.name)){items.push(item);continue;}
  const key=[zone,name,item.unit].join('\u0000');
  const existing=combined.get(key);
  if(existing){existing.qty+=item.qty;existing.min+=item.min;existing.expiry=earlierExpiry(existing.expiry,item.expiry);}
  else{combined.set(key,item);items.push(item);}
 }
 return {...data,items};
}
export const dynamic='force-dynamic';
// One shared kitchen per deployment. Each installation must use its own database.
const sharedKitchen='template-kitchen-v1';
const quantity=z.number().finite().min(0).max(100000);
const schema=z.object({version:z.number().int().nonnegative(),data:z.object({items:z.array(z.object({id:z.string().uuid(),name:z.string().trim().min(1).max(80),qty:quantity,unit:z.string().trim().max(20),min:quantity,zone:z.enum(['保鮮盒1','保鮮盒2','保鮮盒3','保鮮盒4','其他','豆漿牛奶','優格','豆腐','辛香料','蛋','鋁罐飲料・零食','蔬果大格 1','蔬果大格 2','蔬果大格 3','蔬果大格 4','蔬果小格 1','蔬果小格 2','不規則・散裝蔬果','白飯','肉品','冷凍食品','奶油．起司','調味料','罐頭','根莖蔬菜','冷凍暫存區','鍋具・保鮮盒','豆漿・奶類・豆腐']).transform(normalizeZone),expiry:z.string().regex(/^(\d{4}-\d{2}-\d{2})?$/)}).refine(item=>item.zone==='調味料'||item.unit.length>0).transform(item=>item.zone==='調味料'?{...item,unit:'',qty:item.qty>0?1:0,min:0}:item)).max(3000),recipes:z.array(z.object({id:z.string().uuid(),name:z.string().trim().min(1).max(100),verified:z.boolean().optional(),ingredients:z.string().max(10000),steps:z.string().max(20000),source:z.object({kind:z.enum(['text','image','url']),url:z.string().url().max(2048).refine(v=>{const u=new URL(v);return ['http:','https:'].includes(u.protocol)&&!u.username&&!u.password;}).optional(),text:z.string().max(30000),reviewedText:z.string().max(30000).optional(),files:z.array(z.string().max(255)).max(5).optional(),method:z.string().max(100),warnings:z.array(z.string().max(1000)).max(100)}).optional(),materials:z.array(ingredientSchema).max(10000).optional(),optionalGroups:optionalGroupsSchema.optional(),instructions:z.array(z.object({id:z.string().min(1).max(100),text:z.string().trim().min(1).max(20000),appliance:z.enum(['','不需加熱','電子鍋','微波爐','氣炸鍋','電磁爐']),minutes:z.number().finite().min(0).max(1440).nullable()})).min(1).max(10000).optional()})).max(1000)})});
export async function GET(){const rows=await getDb().select().from(kitchens).where(eq(kitchens.owner,sharedKitchen));return Response.json(rows.length?{data:normalizeData(JSON.parse(rows[0].payload)),version:rows[0].version}:{data:{items:[],recipes:[]},version:0},{headers:{'Cache-Control':'no-store'}});}
export async function PUT(request:Request){if(request.headers.get('Origin')!==new URL(request.url).origin)return Response.json({error:'無效來源'},{status:403});const raw=await request.text();if(raw.length>4000000)return Response.json({error:'資料過大'},{status:413});let parsed;try{parsed=schema.safeParse(JSON.parse(raw));}catch{return Response.json({error:'無效資料'},{status:400});}if(!parsed.success)return Response.json({error:'無效資料'},{status:400});const {version,data:rawData}=parsed.data;const data=normalizeData(rawData);const db=getDb();let rows;if(version===0){rows=await db.insert(kitchens).values({owner:sharedKitchen,payload:JSON.stringify(data),version:1}).onConflictDoNothing().returning();}else{rows=await db.update(kitchens).set({payload:JSON.stringify(data),version:version+1}).where(and(eq(kitchens.owner,sharedKitchen),eq(kitchens.version,version))).returning();}if(!rows.length)return Response.json({error:'資料已更新'},{status:409});return Response.json({version:version+1});}

