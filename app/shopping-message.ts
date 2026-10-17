import type {Item} from './kitchen';
import {seasonalFoodId} from './food-catalog';
export type PurchasePrices=Record<string,{text?:string;maxPrice?:string;updatedAt:string}>;
export type CartEntry={name:string;qty:number;unit:string};
export type ProduceCart=Record<string,CartEntry>;
export function shoppingMessage(items:Item[],prices:PurchasePrices,cart:ProduceCart={}):string{
 const grouped=new Map<string,{name:string;unit:string;qty:number}>();
 for(const item of items){if(item.qty>=item.min||['白飯','蔥鹽'].includes(item.name.trim()))continue;const key=JSON.stringify([item.name.trim(),item.unit]);const row=grouped.get(key)??{name:item.name.trim(),unit:item.unit,qty:0};row.qty+=item.min-item.qty;grouped.set(key,row);}
 for(const selected of Object.values(cart)){
 if(['白飯','蔥鹽'].includes(selected.name.trim()))continue;
 const matching=Array.from(grouped.entries()).filter(([,row])=>row.unit===selected.unit&&(row.name===selected.name||(seasonalFoodId(row.name)===seasonalFoodId(selected.name))));
 for(const [key] of matching)grouped.delete(key);
 if(selected.qty>0)grouped.set(JSON.stringify([selected.name,selected.unit]),{...selected});
 }
 const eggs=Array.from(grouped.entries()).filter(([,row])=>row.name==='蛋');
 if(eggs.length){for(const [key] of eggs)grouped.delete(key);grouped.set(JSON.stringify(['蛋','盒']),{name:'蛋',qty:1,unit:'盒'});}
 if(!grouped.size)return '';
 return ['幫我買',...Array.from(grouped.values(),row=>{const limit=prices[seasonalFoodId(row.name)]?.maxPrice;return row.name+'　'+Math.round(row.qty*1000)/1000+' '+row.unit+(limit?'（超過 '+limit.replace(/\r?\n/g,' ')+' 不要買）':'');})].join('\n');
}
