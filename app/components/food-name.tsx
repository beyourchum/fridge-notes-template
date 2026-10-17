'use client';
import {useState} from 'react';
import {foodOptions} from '../food-catalog';
export default function FoodName({zone,value,onChange}:{zone:string;value:string;onChange:(value:string)=>void}){
 const options=foodOptions(zone);
 const [mode,setMode]=useState<'text'|'select'>(()=>options.length&&(!value||options.includes(value))?'select':'text');
 return <div className="food-name-field"><div className="name-input-modes" role="group" aria-label="食材名稱輸入方式"><button type="button" aria-pressed={mode==='select'} disabled={!options.length} onClick={()=>setMode('select')}>下拉選擇</button><button type="button" aria-pressed={mode==='text'} onClick={()=>setMode('text')}>自行輸入</button></div>{mode==='select'?<label>食材名稱<select aria-label="食材名稱" required value={options.includes(value)?value:''} onChange={e=>onChange(e.target.value)}><option value="" disabled>請選擇食材</option>{options.map(n=><option key={n} value={n}>{n}</option>)}</select>{value&&!options.includes(value)&&<small>原名稱「{value}」仍保留；請選擇食材，或切回自行輸入。</small>}</label>:<label>食材名稱<input aria-label="食材名稱" required maxLength={80} placeholder="輸入食材名稱" value={value} onChange={e=>onChange(e.target.value)}/>{!options.length&&<small>此位置尚無預設選項，請自行輸入。</small>}</label>}</div>;
}
