'use client';
import {units} from '../kitchen';
export function UnitSelect({value,onChange,label='單位',options=units}:{value:string;onChange:(value:string)=>void;label?:string;options?:string[]}) {
  return <select aria-label={label} value={value} onChange={e=>onChange(e.target.value)}>
    {!options.includes(value)&&<option value={value} disabled>{value}（原有單位）</option>}
    {options.map(unit=><option key={unit}>{unit}</option>)}
  </select>;
}
export function QuantityInput({value,onChange,label}:{value:number;onChange:(n:number)=>void;label:string}) {
  return <div className="quantity-control"><button type="button" aria-label={label+'減少 1'} disabled={value<=0} onClick={()=>onChange(Math.max(0,Math.round((value-1)*1000)/1000))}>−</button><input aria-label={label} type="number" min="0" max="100000" step="0.001" required value={value} onChange={e=>onChange(Number(e.target.value))}/><button type="button" aria-label={label+'增加 1'} disabled={value>=100000} onClick={()=>onChange(Math.min(100000,Math.round((value+1)*1000)/1000))}>＋</button></div>;
}
