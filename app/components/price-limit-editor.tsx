'use client';
import {useState} from 'react';
import {units} from '../kitchen';
import {defaultFoodUnit} from '../food-catalog';
import {UnitSelect} from './unit-select';
function parsePrice(value:string){
 const m=value.normalize('NFKC').trim().match(/^(\d+(?:\.\d+)?)\s*元\s*[／/]\s*(?:(\d+(?:\.\d+)?)\s*)?(克|毫升|顆|盒|包|個|瓶|根|罐)$/);
 if(!m||!units.includes(m[3])||Number(m[2]??1)<=0)return null;
 return {amount:m[1],quantity:m[2]??'1',unit:m[3]};
}
export default function PriceLimitEditor({name,value,busy,onSave,onCancel}:{name:string;value:string;busy:boolean;onSave:(value:string)=>void;onCancel:()=>void}){
 const [initial]=useState(()=>parsePrice(value));
 const [amount,setAmount]=useState(initial?.amount??''),[quantity,setQuantity]=useState(initial?.quantity??'1'),[unit,setUnit]=useState(initial?.unit??defaultFoodUnit(name)??'個');
 const valid=amount.trim()!==''&&Number.isFinite(Number(amount))&&Number(amount)>=0&&Number(amount)<=1000000&&quantity.trim()!==''&&Number.isFinite(Number(quantity))&&Number(quantity)>0&&Number(quantity)<=100000;
 return <form onSubmit={e=>{e.preventDefault();if(valid)onSave(Number(amount)+' 元／'+(Number(quantity)===1?'':Number(quantity)+' ')+unit);}}>
 {value&&!initial&&<p className="hint">原購買上限：{value}。請用下方欄位重新設定，儲存後才會取代。</p>}
 <fieldset className="price-editor" disabled={busy}><label>最高金額（元）<input aria-label={name+'最高金額'} type="number" inputMode="decimal" min="0" max="1000000" step="0.01" required autoFocus value={amount} onChange={e=>setAmount(e.target.value)} placeholder="例如 35"/></label><div className="price-basis"><label>每多少<input aria-label={name+'計價數量'} type="number" inputMode="decimal" min="0.001" max="100000" step="0.001" required value={quantity} onChange={e=>setQuantity(e.target.value)}/></label><label>單位<UnitSelect label={name+'價格單位'} value={unit} onChange={setUnit}/></label></div></fieldset>
 <div className="actions">{value&&<button type="button" disabled={busy} onClick={()=>onSave('')}>清除上限</button>}<button type="button" disabled={busy} onClick={onCancel}>取消</button><button className="primary" disabled={busy||!valid}>{busy?'儲存中…':'儲存購買上限'}</button></div></form>;
}
