'use client';
import {useEffect,useRef,useState} from 'react';
import type {Worker} from 'tesseract.js';
import {parseRecipeText,normalizeOcrText,ImportResult} from '../import-recipe';
import type {Recipe,RecipeSource} from '../kitchen';

export default function RecipeImport({onClose,onImport}:{onClose:()=>void;onImport:(recipe:Recipe)=>void}) {
  const [mode,setMode]=useState<'text'|'image'|'url'>('text'),[text,setText]=useState(''),[url,setUrl]=useState(''),[files,setFiles]=useState<File[]>([]),[result,setResult]=useState<ImportResult|null>(null),[busy,setBusy]=useState(false),[status,setStatus]=useState(''),[error,setError]=useState(''),[source,setSource]=useState<RecipeSource|null>(null);
  const worker=useRef<Worker|null>(null),generation=useRef(0),mounted=useRef(true),controller=useRef<AbortController|null>(null),panel=useRef<HTMLElement>(null);
  const [previews,setPreviews]=useState<string[]>([]);
  useEffect(()=>{mounted.current=true;const original=document.body.style.overflow;const before=document.activeElement as HTMLElement|null;document.body.style.overflow='hidden';panel.current?.focus();return()=>{mounted.current=false;generation.current++;controller.current?.abort();void worker.current?.terminate();document.body.style.overflow=original;before?.focus();};},[]);
  useEffect(()=>{const urls=files.map(file=>URL.createObjectURL(file));setPreviews(urls);return()=>urls.forEach(u=>URL.revokeObjectURL(u));},[files]);
  function close(){if(busy)return;if((text||files.length||url)&&!confirm('離開匯入？尚未儲存的內容會清除。'))return;onClose();}
  function changeMode(next:typeof mode){setMode(next);setResult(null);setError('');}
  function draft(raw:string,origin:RecipeSource,title=''){
    const parsed=parseRecipeText(raw,title);setText(raw);setSource(origin);setResult(parsed);setError('');
  }
  function cancel(){generation.current++;controller.current?.abort();void worker.current?.terminate();worker.current=null;setBusy(false);setStatus('');setError('已取消，原本輸入的內容仍保留。');}
  async function recognize(){
    const current=++generation.current;setBusy(true);setError('');setStatus('準備圖片辨識…');
    let local:Worker|null=null;const timer=setTimeout(()=>{if(mounted.current&&generation.current===current){cancel();setError('圖片辨識逾時，請縮小圖片或一次上傳一張。');}},180000);
    try{
      const {createWorker}=await import('tesseract.js');
      local=await createWorker(['chi_tra','eng'],1,{workerPath:'/ocr/worker.min.js',corePath:'/ocr',langPath:'/ocr/lang',workerBlobURL:false,logger:m=>{if(mounted.current&&current===generation.current)setStatus(m.status==='recognizing text'?`辨識文字 ${Math.round(m.progress*100)}%`:'準備辨識工具，第一次可能需要較久…');}});
      if(!mounted.current||current!==generation.current){await local.terminate();return;}worker.current=local;
      const parts:string[]=[];const warnings:string[]=[];
      for(let index=0;index<files.length;index++){
        if(current!==generation.current)return;
        setStatus(`讀取第 ${index+1}／${files.length} 張圖片…`);
        const image=await createImageBitmap(files[index]);
        if(image.width*image.height>30000000){image.close();throw new Error('圖片尺寸過大，請裁切到食譜內容後重新上傳。');}
        const scale=Math.min(1,2800/Math.max(image.width,image.height));const canvas=document.createElement('canvas');canvas.width=Math.round(image.width*scale);canvas.height=Math.round(image.height*scale);const ctx=canvas.getContext('2d');if(!ctx){image.close();throw new Error('這個瀏覽器無法處理圖片，請換個瀏覽器或貼上文字。');}ctx.fillStyle='#ffffff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(image,0,0,canvas.width,canvas.height);image.close();
        const recognized=await local.recognize(canvas);parts.push(recognized.data.text.trim());if(recognized.data.confidence<70)warnings.push(`第 ${index+1} 張圖片較難辨識，請核對文字。`);
      }
      if(!mounted.current||current!==generation.current)return;
      const raw=parts.join('\n');if(raw.trim().length<5)throw new Error('圖片中沒有辨識到足夠文字。請提供清楚的食譜截圖；成品照片無法還原做法。');
      draft(normalizeOcrText(raw),{kind:'image',text:raw,files:files.map(f=>f.name),method:'圖片文字辨識',warnings:['請核對圖片中的數字、單位和步驟；只保存辨識文字與檔名，不保存原始圖片。',...warnings]});
    }catch(e){if(mounted.current&&current===generation.current)setError(e instanceof Error?e.message:'圖片辨識失敗，請改用清晰截圖或貼上文字。');}
    finally{clearTimeout(timer);if(worker.current===local)worker.current=null;try{await local?.terminate();}catch{}if(mounted.current&&current===generation.current){setBusy(false);setStatus('');}}
  }
  async function readLink(){setBusy(true);setError('');setStatus('讀取連結的公開食譜內容…');const current=++generation.current;controller.current=new AbortController();try{const r=await fetch('/api/import-recipe',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url}),signal:controller.current.signal});const data=await r.json() as {error?:string;text:string;title:string;url:string;method:string;warnings:string[]};if(!r.ok)throw new Error(data.error??'讀取連結失敗，請改貼食譜文字。');if(current!==generation.current)return;const parsed=parseRecipeText(data.text,data.title);if(!parsed.recipe.materials?.length&&!parsed.recipe.instructions?.length){setText(data.text);setSource({kind:'url',url:data.url,text:data.text,method:data.method,warnings:data.warnings});throw new Error('已讀到公開說明，但沒有找到材料或做法。請在下方補貼說明欄／字幕，或改上傳食譜截圖。');}draft(data.text,{kind:'url',url:data.url,text:data.text,method:data.method,warnings:data.warnings},data.title);}catch(e){if(mounted.current&&current===generation.current)setError(e instanceof Error?e.message:'讀取失敗。');}finally{if(mounted.current&&current===generation.current){setBusy(false);setStatus('');}}}
  function parseText(){try{let link:string|undefined;if(url.trim()){const u=new URL(url);if(!['https:','http:'].includes(u.protocol)||u.username||u.password)throw new Error();link=u.href;}const src:RecipeSource=source?{...source,reviewedText:text===source.text?undefined:text,url:link??source.url}:{kind:mode==='url'?'url':'text',text,method:'文字分段',warnings:[],...(link?{url:link}:{})};draft(text,src);}catch(e){setError(e instanceof Error&&e.message?e.message:'來源連結格式不正確，請使用 http 或 https 網址。');}}
  const combinedWarnings=Array.from(new Set([...(source?.warnings??[]),...(result?.warnings??[])]));
  return <div className="overlay"><section ref={panel} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="import-title" className="modal recipe-modal import-modal" onKeyDown={e=>{if(e.key==='Escape'){e.preventDefault();close();}if(e.key==='Tab'){const focusable=Array.from(panel.current?.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),textarea:not(:disabled),a[href],summary')??[]).filter(n=>n.getClientRects().length);const first=focusable[0],last=focusable.at(-1);if(e.shiftKey&&(document.activeElement===first||document.activeElement===panel.current)){e.preventDefault();last?.focus();}else if(!e.shiftKey&&(document.activeElement===last||document.activeElement===panel.current)){e.preventDefault();first?.focus();}}}}>
    <div className="modalhead"><div><h2 id="import-title">匯入食譜</h2></div><button aria-label="關閉匯入" disabled={busy} onClick={close}>×</button></div>
    <div className="import-tabs" role="group" aria-label="匯入方式">{([['text','貼上文字'],['image','圖片截圖'],['url','影片／食譜連結']] as const).map(([key,label])=><button disabled={busy} aria-pressed={mode===key} className={mode===key?'selected':''} key={key} onClick={()=>changeMode(key)}>{label}</button>)}</div>
    <p className="hint">先整理成草稿，再確認材料、廚具和時間。匯入不會直接覆蓋既有食譜。</p>
    {mode==='image'&&<><label className="upload-box">選擇食譜圖片<input aria-label="食譜圖片" type="file" accept="image/png,image/jpeg,image/webp" multiple disabled={busy} onChange={e=>{const selected=Array.from(e.target.files??[]);if(selected.length>5||selected.some(f=>!['image/png','image/jpeg','image/webp'].includes(f.type)||f.size>8*1024*1024)||selected.reduce((sum,f)=>sum+f.size,0)>20*1024*1024){setError('請選擇最多 5 張 JPG、PNG 或 WebP，每張 8 MB 內，總共 20 MB 內。');e.target.value='';return;}setFiles(selected);setText('');setResult(null);setSource(null);setError('');}}/><small>可多選，依選取順序讀取。辨識在本機執行，圖片不會上傳。</small></label>{files.length>0&&<div className="image-previews">{files.map((f,i)=><figure key={i}><img src={previews[i]} alt={'食譜圖片 '+(i+1)}/><figcaption>{i+1}. {f.name}</figcaption></figure>)}</div>}<button className="primary full" disabled={busy||!files.length} onClick={recognize}>辨識圖片並整理</button></>}
    {mode==='url'&&<><label>影片或食譜網址<input type="url" aria-label="影片或食譜網址" placeholder="https://…" value={url} disabled={busy} onChange={e=>{setUrl(e.target.value);setResult(null);setSource(null);}}/></label><p className="hint">支援 YouTube、Instagram、Facebook、愛料理、Cookpad 的公開食譜資料或說明欄。此功能不觀看影片；需要登入或沒有完整說明時，請補貼文字或上傳截圖。</p><button className="primary full" disabled={busy||!url.trim()} onClick={readLink}>讀取連結並整理</button></>}
    {(mode==='text'||mode==='url'||text)&&<label className="import-raw">{mode==='image'?'辨識文字（可修正）':mode==='url'?'補充食譜文字／字幕（選填）':'食譜文字'}<textarea aria-label="食譜原文" rows={8} maxLength={30000} placeholder={'微波蒸蛋\n材料\n雞蛋 2 顆\n水 100 毫升\n做法\n1. 將材料拌勻\n2. 放入微波爐加熱 3 分鐘'} value={text} disabled={busy} onChange={e=>{setText(e.target.value);setResult(null);}}/><small>有「材料」「做法」標題和換行時較容易拆分；沒有寫明的數量與時間會留白。</small></label>}
    {mode==='text'&&<label>來源連結（選填）<input aria-label="來源連結" type="url" value={url} disabled={busy} onChange={e=>{setUrl(e.target.value);setResult(null);}}/></label>}
    {(mode==='text'||text)&&<button className="add-row" disabled={busy||!text.trim()} onClick={parseText}>{result?'重新整理文字':'整理成食譜草稿'}</button>}
    {busy&&<div className="import-progress" role="status"><span>{status}</span><button onClick={cancel}>取消處理</button></div>}
    {error&&<p role="alert" className="error">{error}</p>}
    {result&&<div className="import-result"><h3>{result.recipe.name||'料理名稱待補'}</h3><div className="recipe-meta"><span>{result.recipe.materials?.length??0} 項材料</span><span>{result.recipe.instructions?.length??0} 個步驟</span><span>{source?.method}</span></div>{combinedWarnings.length>0&&<ul className="import-warnings">{combinedWarnings.map(w=><li key={w}>{w}</li>)}</ul>}<div className="import-summary"><div><h4>材料</h4><ol>{result.recipe.materials?.map(m=><li key={m.id}>{m.name}{m.amount===null?'':` · ${m.amount} ${m.unit}`}</li>)}</ol></div><div><h4>做法</h4><ol>{result.recipe.instructions?.map(s=><li key={s.id}>{s.text}</li>)}</ol></div></div>{result.unassigned.length>0&&<details><summary>查看未分類內容</summary><pre>{result.unassigned.join('\n')}</pre></details>}<button className="primary full" disabled={busy} onClick={()=>onImport({...result.recipe,source:{...(source??{kind:'text',text,method:'文字分段',warnings:[]}),reviewedText:source&&text!==source.text?text:undefined,warnings:combinedWarnings}})}>帶入食譜，檢查並儲存 →</button></div>}
  </section></div>;
}
