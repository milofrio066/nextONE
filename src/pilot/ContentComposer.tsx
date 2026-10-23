import { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { backend, rpc } from './backend';
import type { Content, Kind } from './types';
import { urlAllowed } from './types';
import type { PageData } from './interactive/types';
const PageDesigner = lazy(()=>import('./interactive/PageDesigner'));
import { decodeStory } from './storyModel';
import {restoreForm} from './drafts';
import BlockEditor from './BlockEditor';
const local=(s:string|null)=>s?new Date(new Date(s).getTime()-new Date(s).getTimezoneOffset()*60000).toISOString().slice(0,16):'';
export default function ContentComposer({userId,value,kind,parentId,items,close,saved}:{userId:string;value:Content|null;kind:Kind;parentId:string|null;items:Content[];close:()=>void;saved:()=>Promise<void>}) {
 const k=value?.kind||kind;
 const [title,setTitle]=useState(value?.title||''),[body,setBody]=useState(value?.body||''),[initial,setInitial]=useState<{template_id:string;data:unknown}|null>(null),[ready,setReady]=useState(!value),[error,setError]=useState('');
 const form=useRef<HTMLFormElement>(null);
 useEffect(()=>{if(!value)return;let alive=true;void backend?.from('content_pages').select('template_id,data').eq('content_id',value.id).maybeSingle().then(({data,error})=>{if(!alive)return;if(error)setError('No se pudo leer el diseño existente. Cierra y vuelve a intentar para evitar sobrescribirlo.');else{setInitial(data);setReady(true);}});return()=>{alive=false;};},[value?.id]);
 if(!ready)return <div className="modal-backdrop studio-backdrop"><div className="studio" role="dialog" aria-label="Cargando contenido"><p>{error||'Cargando diseño…'}</p><button className="secondary" onClick={close}>Cerrar</button></div></div>;
 async function publish(template:string,data:PageData){
  if(!form.current?.checkValidity()){const details=form.current?.closest('details');if(details)details.open=true;form.current?.reportValidity();throw new Error('Completa los datos de publicación que aparecen arriba.');}
  const f=new FormData(form.current),url=String(f.get('url')||''),join=String(f.get('join')||'');
  if(!urlAllowed(url)||!urlAllowed(join))throw new Error('Usa enlaces HTTPS válidos.');
  const stamp=(n:string)=>f.get(n)?new Date(String(f.get(n))).toISOString():null;
  const contentId=await rpc<string>('publish_makers_content',{p_id:value?.id||null,p_kind:k,p_title:title,p_body:body,p_url:url||null,p_parent:k==='solution'?(value?.parent_id||parentId):f.get('parent')||null,p_start:stamp('start'),p_end:stamp('end'),p_capacity:f.get('capacity')?Number(f.get('capacity')):null,p_published:k==='solution'?true:f.get('published')==='on',p_join_url:join||null,p_template:template,p_data:data,p_topics:String(f.get('topics')||'').split(',').map(t=>t.trim()).filter(Boolean),p_methodology:f.get('methodology')||'',p_audience:f.get('audience')||''});
  window.dispatchEvent(new CustomEvent('nextone:page-saved',{detail:contentId}));
  await saved();
 }
 return <Suspense fallback={<div className="modal-backdrop studio-backdrop"><div className="studio"><p>Cargando editor…</p></div></div>}><PageDesigner draftKey={`nextone-draft:${userId}:${value?.id||`${k}:${parentId||'root'}`}`} restoreMetadata={values=>{setTitle(values.title??title);setBody(values.body??body);restoreForm(form.current,values);}} item={{id:value?.id||'new',kind:k,title:title||'Nuevo contenido'}} initial={initial} close={close} saved={close} savePage={publish} metadata={<form className="composer-metadata" ref={form} onSubmit={e=>e.preventDefault()}>
 <h3>Datos de publicación</h3><p>Elige una plantilla o empieza en blanco. Cambia textos, colores, bloques y su orden antes de guardar.</p>
 <label className="field">Título<input name="title" required minLength={3} maxLength={180} value={title} onChange={e=>setTitle(e.target.value)}/></label>
 {decodeStory(body).layout?<details><summary>Editar descripción anterior</summary><BlockEditor body={body} onChange={setBody}/></details>:<label className="field">Descripción, objetivos y dinámica<textarea required minLength={1} maxLength={12000} value={body} onChange={e=>setBody(e.target.value)}/></label>}
 <input type="hidden" name="body" value={body}/><label className="field">Temas (separados por comas, máximo 12)<input name="topics" defaultValue={value?.topics?.join(', ')}/></label><label className="field">Metodología<input name="methodology" maxLength={80} defaultValue={value?.methodology||''} placeholder="Taller práctico, panel, reto…"/></label><label className="field">Público objetivo<input name="audience" maxLength={120} defaultValue={value?.audience||''}/></label>
 {k!=='solution'&&<label className="field">Vincular a un evento, webinar, case o proyecto<select name="parent" defaultValue={value?.parent_id||parentId||''} required={k==='update'}><option value="">Sin vinculación</option>{items.filter(c=>c.id!==value?.id&&['event','webinar','case','project'].includes(c.kind)&&(k!=='update'||c.kind==='project')).map(c=><option key={c.id} value={c.id}>{c.title}</option>)}</select></label>}
 <label className="field">{k==='solution'?'Enlace HTTPS al prototipo funcional':'Enlace público HTTPS (grabación, material o prototipo)'}<input type="url" name="url" required={k==='solution'} defaultValue={value?.url||''}/></label>
 {['event','webinar','case'].includes(k)&&<div className="form-grid"><label className="field">Inicio (tu zona horaria)<input type="datetime-local" name="start" defaultValue={local(value?.starts_at||null)} required={k!=='case'}/></label><label className="field">Fin o cierre<input type="datetime-local" name="end" defaultValue={local(value?.ends_at||null)} required/></label></div>}
 {['event','webinar'].includes(k)&&<><label className="field">Cupos<input type="number" min={1} max={10000} name="capacity" defaultValue={value?.capacity||100}/></label><label className="field">Enlace privado de Zoom (solo acceso verificado)<input type="url" name="join"/></label><p>Al editar, deja vacío el enlace privado para conservarlo.</p></>}
 {k!=='solution'&&<label className="field"><input className="inline-check" type="checkbox" name="published" defaultChecked={value?.published??true}/> Publicar para la comunidad</label>}
 </form>}/></Suspense>;
}
