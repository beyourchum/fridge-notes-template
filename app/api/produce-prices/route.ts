import {getDb} from '../../../db';
import {kitchens} from '../../../db/schema';
import {eq,and} from 'drizzle-orm';
import {z} from 'zod';
import {allProduce} from '../../produce-catalog';
export const dynamic='force-dynamic';
const key='shared-produce-prices-v1';
const headers={'Cache-Control':'no-store'};
const schema=z.object({version:z.number().int().nonnegative(),id:z.string().refine(id=>allProduce.some(v=>v.id===id)),price:z.string().trim().max(120),field:z.enum(['text','maxPrice']).default('text')});
export async function GET(){const rows=await getDb().select().from(kitchens).where(eq(kitchens.owner,key));return Response.json(rows.length?{prices:JSON.parse(rows[0].payload),version:rows[0].version}:{prices:{},version:0},{headers});}
export async function PUT(request:Request){
 if(request.headers.get('Origin')!==new URL(request.url).origin)return Response.json({error:'無效來源'},{status:403,headers});
 const raw=await request.text();if(raw.length>2000)return Response.json({error:'資料過長'},{status:413,headers});
 let parsed;try{parsed=schema.safeParse(JSON.parse(raw));}catch{return Response.json({error:'無效資料'},{status:400,headers});}if(!parsed.success)return Response.json({error:'無效資料'},{status:400,headers});
 const {version,id,price,field}=parsed.data;const db=getDb();const current=await db.select().from(kitchens).where(eq(kitchens.owner,key));if((current[0]?.version??0)!==version)return Response.json({error:'價格已更新，請重新同步後再儲存。'},{status:409,headers});
 const prices=current.length?JSON.parse(current[0].payload):{};const entry={...prices[id]};if(price)entry[field]=price;else delete entry[field];if(entry.text||entry.maxPrice)prices[id]={...entry,updatedAt:new Date().toISOString()};else delete prices[id];
 const rows=version===0?await db.insert(kitchens).values({owner:key,payload:JSON.stringify(prices),version:1}).onConflictDoNothing().returning():await db.update(kitchens).set({payload:JSON.stringify(prices),version:version+1}).where(and(eq(kitchens.owner,key),eq(kitchens.version,version))).returning();
 if(!rows.length)return Response.json({error:'價格已更新，請重新同步後再儲存。'},{status:409,headers});return Response.json({prices,version:version+1},{headers});
}
