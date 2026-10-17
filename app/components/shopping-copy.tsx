'use client';
import {useEffect,useRef,useState} from 'react';
import type {Item} from '../kitchen';
import {shoppingMessage,type PurchasePrices,type ProduceCart} from '../shopping-message';
export default function ShoppingCopy({items,prices,cart}:{items:Item[];prices:PurchasePrices|null;cart:ProduceCart}){
 const generated=shoppingMessage(items,prices??{},cart);
 const [draft,setDraft]=useState(generated),[status,setStatus]=useState('');
 const field=useRef<HTMLTextAreaElement>(null);
 useEffect(()=>{setDraft(generated);setStatus('');},[generated]);
 async function copy(){try{await navigator.clipboard.writeText(draft);setStatus('已複製');}catch{field.current?.focus();field.current?.select();setStatus('請長按或使用 Ctrl/Cmd+C 複製已選取文字。');}}
 return <section className="shopping-copy"><h2>複製採購清單</h2><textarea ref={field} aria-label="採購清單文字" rows={Math.max(4,Math.min(12,draft.split('\n').length+1))} value={draft} onChange={e=>{setDraft(e.target.value);setStatus('');}} placeholder="目前沒有需要補貨的食材"/><div className="actions"><button type="button" disabled={!prices||!draft.trim()} onClick={copy}>複製清單</button></div>{!prices&&<p className="hint">正在讀取購買上限；若讀取失敗，請按下方的「重新載入價格上限」。</p>}<p role="status">{status}</p></section>;
}
