import CoverEditor,{type CoverDraft} from './CoverEditor';
import ChallengeFields from './ChallengeFields';
import {DEFAULT_RULES} from './challengeModel';
import type {ChallengeRules} from './challengeModel';
import {readRows} from './data';
import { normalizeWebUrl } from './webLinks';
import { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { backend, rpc } from './backend';
import type { Content, Kind, Profile } from './types';
import { urlAllowed } from './types';
import type { PageData } from './interactive/types';
const PageDesigner = lazy(()=>import('./interactive/PageDesigner'));
import { decodeStory } from './storyModel';
import {restoreForm} from './drafts';
import ProjectAssistant from './ProjectAssistant';
import {planFields} from './ProjectRecords';
import BlockEditor from './BlockEditor';
const local=(s:string|null)=>s?new Date(new Date(s).getTime()-new Date(s).getTimezoneOffset()*60000).toISOString().slice(0,16):'';
export default function ContentComposer({people,userId,value,kind,parentId,items,close,saved}:{people:Profile[];userId:string;value:Content|null;kind:Kind;parentId:string|null;items:Content[];close:()=>void;saved:()=>Promise<void>}) {
 const k=value?.kind||kind;
 const [title,setTitle]=useState(value?.title||''),[body,setBody]=useState(value?.body||''),[initial,setInitial]=useState<{template_id:string;data:unknown}|null>(null),[ready,setReady]=useState(!value),[error,setError]=useState('');
 const [cover,setCover]=useState<CoverDraft>({path:value?.cover_path||'',alt:value?.cover_alt||'',position:value?.cover_position||'center'}),[coverBusy,setCoverBusy]=useState(false);
 const [rules,setRules]=useState<ChallengeRules>(DEFAULT_RULES);
 const form=useRef<HTMLFormElement>(null),target=useRef(value?.id||null);
 useEffect(()=>{if(!value)return;let alive=true;if(!backend){setError('Supabase no está configurado');return;}void Promise.all([backend.from('content_pages').select('template_id,data').eq('content_id',value.id).maybeSingle(),value.kind==='case'?readRows<ChallengeRules>('challenge_rules',{content_id:value.id}):Promise.resolve([])]).then(([result,rules])=>{if(!alive)return;if(result.error)setError('No se pudo leer el diseño existente. Cierra y vuelve a intentar.');else{setInitial(result.data);setRules(rules[0]||DEFAULT_RULES);setReady(true);}}).catch(e=>alive&&setError(e.message));return()=>{alive=false;};},[value?.id]);
 if(!ready)return <div className="modal-backdrop studio-backdrop"><div className="studio" role="dialog" aria-label="Cargando contenido"><p>{error||'Cargando diseño…'}</p><button className="secondary" onClick={close}>Cerrar</button></div></div>;
 async function publish(template:string,data:PageData){
  if(coverBusy)throw new Error('Espera a que termine de subir la portada.');
  for(const field of ['url','join']){const input=form.current?.elements.namedItem(field) as HTMLInputElement|null;if(input?.value){const url=normalizeWebUrl(input.value);if(url)input.value=url;}}

  if(!form.current?.checkValidity()){const details=form.current?.closest('details');if(details)details.open=true;form.current?.reportValidity();throw new Error('Completa los datos de publicación que aparecen arriba.');}
  const f=new FormData(form.current),url=String(f.get('url')||''),join=String(f.get('join')||'');
  if(!urlAllowed(url)||!urlAllowed(join))throw new Error('Usa enlaces HTTPS válidos.');
  const stamp=(n:string)=>f.get(n)?new Date(String(f.get(n))).toISOString():null;
  const args:Record<string,unknown>={p_id:target.current,p_kind:k,p_title:title,p_body:body,p_url:url||null,p_parent:k==='solution'?(value?.parent_id||parentId):f.get('parent')||null,p_start:stamp('start'),p_end:stamp('end'),p_capacity:f.get('capacity')?Number(f.get('capacity')):null,p_published:k==='solution'?true:f.get('published')==='on',p_join_url:join||null,p_template:template,p_data:data,p_topics:String(f.get('topics')||'').split(',').map(t=>t.trim()).filter(Boolean),p_methodology:f.get('methodology')||'',p_audience:f.get('audience')||'',p_project_config:k==='project'?{type:f.get('project_type')||'project',evaluator:f.get('evaluator')||'',plan:Object.fromEntries(planFields.map(([key])=>[key,f.get(key)||'']))}:null};
  const criteria=k==='case'?JSON.parse(String(f.get('challenge_criteria')||'[]')):[];
  if(k==='case'&&criteria.reduce((n:number,c:{weight:number})=>n+Number(c.weight),0)!==100)throw new Error('Los pesos de los criterios deben sumar 100%.');
  const contentId=await rpc<string>('publish_content_with_cover',{p_content:args,p_cover:cover,p_rules:k==='case'?{instructions:f.get('challenge_instructions')||body,deliverables:f.get('challenge_deliverables')||'Demostración HTTPS y explicación de la solución',criteria,participant_limit:f.get('challenge_limit')?Number(f.get('challenge_limit')):null,allow_updates:f.get('challenge_updates')==='on'}:null});
  target.current=contentId;
  window.dispatchEvent(new CustomEvent('nextone:page-saved',{detail:contentId}));
  await saved();
 }
 return <Suspense fallback={<div className="modal-backdrop studio-backdrop"><div className="studio"><p>Cargando editor…</p></div></div>}><PageDesigner draftKey={`nextone-draft:${userId}:${value?.id||`${k}:${parentId||'root'}`}`} restoreMetadata={values=>{setTitle(values.title??title);setBody(values.body??body);if(values.cover_path!==undefined)setCover({path:values.cover_path,alt:values.cover_alt||'',position:['top','center','bottom'].includes(values.cover_position)?values.cover_position as CoverDraft['position']:'center'});if(k==='case'&&values.challenge_criteria){try{const criteria=JSON.parse(values.challenge_criteria);if(Array.isArray(criteria)&&criteria.length>=1&&criteria.length<=8&&criteria.every(c=>typeof c.label==='string'&&Number.isFinite(c.weight)))setRules({...rules,criteria,instructions:values.challenge_instructions||'',deliverables:values.challenge_deliverables||'',participant_limit:values.challenge_limit?Number(values.challenge_limit):null,allow_updates:values.challenge_updates==='true'});}catch{/* Keep current rules when a local draft is malformed. */}}restoreForm(form.current,values);}} item={{id:value?.id||'new',kind:k,title:title||'Nuevo contenido'}} initial={initial} close={close} saved={close} savePage={publish} metadata={<form className="composer-metadata" ref={form} onSubmit={e=>e.preventDefault()}>
 <h3>Datos de publicación</h3><p>Elige una plantilla o empieza en blanco. Cambia textos, colores, bloques y su orden antes de guardar.</p>
 <label className="field">Título<input name="title" required minLength={3} maxLength={180} value={title} onChange={e=>setTitle(e.target.value)}/></label>
 {decodeStory(body).layout?<details><summary>Editar descripción anterior</summary><BlockEditor body={body} onChange={setBody}/></details>:<label className="field">Descripción, objetivos y dinámica<textarea required minLength={1} maxLength={12000} value={body} onChange={e=>setBody(e.target.value)}/></label>}
 <CoverEditor user={userId} value={cover} onChange={setCover} onBusy={setCoverBusy}/><input type="hidden" name="body" value={body}/><label className="field">Temas (separados por comas, máximo 12)<input name="topics" defaultValue={value?.topics?.join(', ')}/></label><label className="field">Metodología<input name="methodology" maxLength={80} defaultValue={value?.methodology||''} placeholder="Taller práctico, panel, reto…"/></label><label className="field">Público objetivo<input name="audience" maxLength={120} defaultValue={value?.audience||''}/></label>
 {k==='case'&&<ChallengeFields key={JSON.stringify(rules)} initial={rules}/>}
 {k==='project'&&<><ProjectAssistant apply={(plan,type)=>{setTitle(plan.title);setBody(plan.problem);restoreForm(form.current,{...plan,project_type:type});}}/><label className="field">Tipo de iniciativa<select name="project_type" defaultValue={value?.project_type||'project'}><option value="project">Proyecto</option><option value="semillero">Semillero</option></select></label><label className="field">Evaluador independiente<select aria-label="Evaluador independiente" name="evaluator" required defaultValue={value?.evaluator_id||''}><option value="">Selecciona una persona activa</option>{people.filter(p=>p.status==='active'&&p.id!==(value?.owner_id||userId)).map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label><div className="project-brief">{planFields.map(([key,label])=><label key={key} className="field">{label}<textarea name={key} maxLength={1500} defaultValue={value?.project_plan?.[key]||''}/></label>)}</div></>}
 {k!=='solution'&&<label className="field">Vincular a un evento, webinar, case o proyecto<select name="parent" defaultValue={value?.parent_id||parentId||''} required={k==='update'}><option value="">Sin vinculación</option>{items.filter(c=>c.id!==value?.id&&['event','webinar','case','project'].includes(c.kind)&&(k!=='update'||c.kind==='project')).map(c=><option key={c.id} value={c.id}>{c.title}</option>)}</select></label>}
 <label className="field">{k==='solution'?'Enlace HTTPS al prototipo funcional':'Enlace público HTTPS (grabación, material o prototipo)'}<input type="url" name="url" required={k==='solution'} defaultValue={value?.url||''}/></label>
 {['event','webinar','case'].includes(k)&&<div className="form-grid"><label className="field">Inicio (tu zona horaria)<input type="datetime-local" name="start" defaultValue={local(value?.starts_at||null)} required={k!=='case'}/></label><label className="field">Fin o cierre<input type="datetime-local" name="end" defaultValue={local(value?.ends_at||null)} required/></label></div>}
 {['event','webinar'].includes(k)&&<><label className="field">Cupos<input type="number" min={1} max={10000} name="capacity" defaultValue={value?.capacity||100}/></label><label className="field">Enlace privado de Zoom (solo acceso verificado)<input type="url" name="join"/></label><p>Al editar, deja vacío el enlace privado para conservarlo.</p></>}
 {k!=='solution'&&<label className="field"><input className="inline-check" type="checkbox" name="published" defaultChecked={value?.published??true}/> Publicar para la comunidad</label>}
 </form>}/></Suspense>;
}
