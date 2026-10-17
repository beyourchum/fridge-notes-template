'use client';
import {useState} from 'react';
import {newIngredient,newOptionalGroup,recipeUnits,toggleOptionalSelection,type Ingredient,type Item,type OptionalGroup} from '../kitchen';
import {UnitSelect} from './unit-select';

export function OptionalGroupsEditor({groups,items,onChange}:{groups:OptionalGroup[];items:Item[];onChange:(groups:OptionalGroup[])=>void}) {
  function update(id:string,patch:Partial<OptionalGroup>){onChange(groups.map(g=>g.id===id?{...g,...patch}:g));}
  function updateOption(group:OptionalGroup,id:string,patch:Partial<Ingredient>){update(group.id,{options:group.options.map(m=>m.id===id?{...m,...patch}:m)});}
  return <section className="optional-section" aria-labelledby="optional-editor-title">
    <h3 id="optional-editor-title">選配項目</h3>
    <p className="hint">將可替換或自由添加的食材放在同一組。選配可全部不選，不計入缺料。</p>
    <div className="ingredient-rows">{groups.map((group,index)=><div className="optional-group" key={group.id}>
      <div className="row-title"><strong>選配組 {index+1}</strong><button type="button" className="text-button danger" aria-label={`移除選配組 ${index+1}`} onClick={()=>onChange(groups.filter(g=>g.id!==group.id))}>移除整組</button></div>
      <div className="formrow"><label>選配組名稱<input required maxLength={100} value={group.name} placeholder="例如：配菜、加料" onChange={e=>update(group.id,{name:e.target.value})}/></label><label>選擇方式<select value={group.mode} onChange={e=>update(group.id,{mode:e.target.value as OptionalGroup['mode']})}><option value="one">擇一（最多選一項）</option><option value="any">自由多選</option></select></label></div>
      <div className="ingredient-rows">{group.options.map((m,optionIndex)=><div className="ingredient-row" key={m.id}>
        <div className="row-title"><strong>選項 {optionIndex+1}</strong><button type="button" className="text-button danger" disabled={group.options.length===1} aria-label={`移除選配組 ${index+1} 的選項 ${optionIndex+1}`} onClick={()=>update(group.id,{options:group.options.filter(x=>x.id!==m.id)})}>移除</button></div>
        <label>食材名稱<input required list="inventory-names" maxLength={10000} value={m.name} placeholder="輸入或選取食材" onChange={e=>{const match=items.find(i=>i.name===e.target.value);updateOption(group,m.id,{name:e.target.value,...(match?.unit?{unit:match.unit}:{})});}}/></label>
        <div className="formrow"><label>份量（選填）<input type="number" min="0.001" max="100000" step="0.001" value={m.amount??''} placeholder="未填" onChange={e=>updateOption(group,m.id,{amount:e.target.value===''?null:Number(e.target.value)})}/></label><label>單位<UnitSelect options={recipeUnits} label={`選配組 ${index+1} 選項 ${optionIndex+1} 單位`} value={m.unit} onChange={unit=>updateOption(group,m.id,{unit})}/></label></div>
      </div>)}</div>
      <button type="button" className="add-row" disabled={group.options.length>=200} onClick={()=>update(group.id,{options:[...group.options,newIngredient()]})}>＋ 新增選項</button>
    </div>)}</div>
    <button type="button" className="add-row" disabled={groups.length>=50} onClick={()=>onChange([...groups,newOptionalGroup()])}>＋ 新增選配組</button>
  </section>;
}

export function OptionalChoices({groups,items}:{groups:OptionalGroup[];items:Item[]}) {
  const [selections,setSelections]=useState<Record<string,string[]>>({});
  const [extras,setExtras]=useState<Ingredient[]>([]),[draft,setDraft]=useState<Ingredient>(newIngredient);
  function addExtra(){if(!draft.name.trim()||extras.length>=200||draft.amount!==null&&(!Number.isFinite(draft.amount)||draft.amount<0.001||draft.amount>100000))return;setExtras(a=>[...a,{...draft,name:draft.name.trim()}]);setDraft(newIngredient());}
  return <section className="optional-section" aria-labelledby="optional-choices-title">
    <h3 id="optional-choices-title">選配與自由添加</h3>
    <p className="hint">勾選這次想加的食材，也可以全部不選。選擇與臨時加料只用於這次料理，不會扣除庫存；常用選項可在「編輯食譜」儲存。</p>
    {groups.map(group=><div className="optional-group" key={group.id}><h4>{group.name}<span className="option-mode">{group.mode==='one'?'擇一':'可多選'}</span></h4><ul className="material-checklist">{group.options.map(m=><li key={m.id}><label><input type="checkbox" checked={(selections[group.id]??[]).includes(m.id)} onChange={()=>setSelections(values=>({...values,[group.id]:toggleOptionalSelection(group,values[group.id]??[],m.id)}))}/><span>{m.name}</span><b>{m.amount===null?'':`${m.amount} ${m.unit}`}</b></label></li>)}</ul></div>)}
    <div className="optional-group"><h4>這次自由添加</h4><datalist id="extra-inventory-names">{Array.from(new Set(items.map(i=>i.name))).map(n=><option key={n} value={n}/>)}</datalist>
      <label>食材名稱<input list="extra-inventory-names" maxLength={10000} placeholder="例如：玉米、起司" value={draft.name} onChange={e=>{const match=items.find(i=>i.name===e.target.value);setDraft({...draft,name:e.target.value,...(match?.unit?{unit:match.unit}:{})});}} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();addExtra();}}}/></label>
      <div className="formrow"><label>份量（選填）<input type="number" min="0.001" max="100000" step="0.001" placeholder="未填" value={draft.amount??''} onChange={e=>setDraft({...draft,amount:e.target.value===''?null:Number(e.target.value)})}/></label><label>單位<UnitSelect options={recipeUnits} label="自由添加食材單位" value={draft.unit} onChange={unit=>setDraft({...draft,unit})}/></label></div>
      <button type="button" disabled={!draft.name.trim()||extras.length>=200||draft.amount!==null&&(!Number.isFinite(draft.amount)||draft.amount<0.001||draft.amount>100000)} onClick={addExtra}>＋ 添加到這次料理</button>
      {extras.length>0&&<ul className="extra-materials" aria-live="polite">{extras.map(m=><li key={m.id}><span>{m.name}{m.amount===null?'':` · ${m.amount} ${m.unit}`}</span><button type="button" className="text-button danger" aria-label={`移除自由添加的${m.name}`} onClick={()=>setExtras(a=>a.filter(x=>x.id!==m.id))}>移除</button></li>)}</ul>}
    </div>
  </section>;
}
