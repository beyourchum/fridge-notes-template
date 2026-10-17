import {seasonalVegetables} from './seasonal-data';
import {seasonalFruits} from './seasonal-fruit';
export type Produce={id:string;name:string;levels:number[];yearRound:boolean;note?:string};
export const seasonalSpices:Produce[]=[
 {...seasonalVegetables.find(v=>v.id==='辣椒')!},
 {...seasonalVegetables.find(v=>v.id==='青蔥')!,name:'蔥'},
 {id:'薑',name:'薑',levels:[],yearRound:false,note:'來源未提供產季'},
 {...seasonalVegetables.find(v=>v.id==='大蒜')!,name:'蒜'}
];
export const displayVegetables:Produce[]=seasonalVegetables.flatMap(v=>v.id==='菇類'?['杏鮑菇','香菇','其他菇'].map(id=>({...v,id,name:id==='其他菇'?'鴻喜菇、美白菇':id})): [v]);
export const allProduce:Produce[]=[...seasonalVegetables,...displayVegetables,...seasonalFruits,...seasonalSpices];
