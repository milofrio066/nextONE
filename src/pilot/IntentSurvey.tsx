import {useEffect,useState} from 'react';
import {Compass,Check} from 'lucide-react';
import {rpc} from './backend';
import {AVAILABILITY,CHALLENGES,EMPTY_INTENT,FORMATS,GOALS,MAX_PICKS,STAGES,label,toggle,type Intent} from './intentModel';
import './peers.css';
type Field='goals'|'challenges'|'formats'|'availability';
const BLOCKS:[Field,string,string,readonly (readonly [string,string])[]][]=[
 ['goals','¿Qué quieres lograr?','Elige hasta 4. Es lo único obligatorio.',GOALS],
 ['challenges','¿Qué te está frenando hoy?','Con esto armamos mentorías grupales con personas que viven lo mismo.',CHALLENGES],
 ['formats','¿Cómo prefieres aprender?','Priorizamos las actividades que más se piden.',FORMATS],
 ['availability','¿Cuándo puedes participar?','Para proponer horarios que te sirvan.',AVAILABILITY]];
/** «¿Qué buscas?»: cada maker o peer cuenta qué quiere, y administración lo usa para segmentar y armar grupos. */
export default function IntentSurvey({compact=false,onSaved}:{compact?:boolean;onSaved?:()=>void}){
 const [intent,setIntent]=useState<Intent|null>(null),[draft,setDraft]=useState<Intent>(EMPTY_INTENT),[editing,setEditing]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[hidden,setHidden]=useState(false),[loaded,setLoaded]=useState(false);
 useEffect(()=>{let alive=true;void rpc<Intent|null>('my_member_intent').then(d=>{if(!alive)return;setIntent(d);setDraft(d?{...EMPTY_INTENT,...d}:EMPTY_INTENT);setLoaded(true);}).catch(()=>alive&&setLoaded(true));return()=>{alive=false;};},[]);
 const hasAnswer=!!intent?.goals?.length;
 if(!loaded||hidden)return null;
 if(compact&&hasAnswer&&!editing&&!notice)return null;
 async function save(){setError('');setNotice('');if(!draft.goals.length){setError('Elige al menos un objetivo.');return;}setBusy(true);
  try{await rpc('save_member_intent',{p_intent:{goals:draft.goals,challenges:draft.challenges,formats:draft.formats,availability:draft.availability,stage:draft.stage,note:draft.note.trim()}});setIntent({...draft});setEditing(false);setNotice('¡Gracias! Usaremos tus respuestas para proponerte actividades y grupos afines.');onSaved?.();}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 if(hasAnswer&&!editing)return <section className="intent-card intent-summary"><header><span className="intent-icon"><Compass size={22} aria-hidden="true"/></span><div><span className="eyebrow">LO QUE BUSCAS</span><h3>Tu brújula en Makers</h3></div><button type="button" className="secondary" onClick={()=>setEditing(true)}>Actualizar</button></header>
  <div className="intent-tags">{intent!.goals.map(g=><span className="intent-tag tone-1" key={g}>{label(g)}</span>)}{intent!.challenges.map(g=><span className="intent-tag tone-3" key={g}>{label(g)}</span>)}{intent!.formats.map(g=><span className="intent-tag tone-2" key={g}>{label(g)}</span>)}</div>{intent!.segment&&<p>Grupo asignado: <strong>{intent!.segment}</strong></p>}{notice&&<p role="status">{notice}</p>}</section>;
 return <section className="intent-card"><header><span className="intent-icon"><Compass size={22} aria-hidden="true"/></span><div><span className="eyebrow">¿QUÉ BUSCAS EN MAKERS?</span><h3>Cuéntanos en un minuto qué necesitas</h3><p>Así te proponemos mentorías grupales, retos y personas afines. Solo lo ve el equipo de administración.</p></div>{compact&&<button type="button" className="text-button" onClick={()=>setHidden(true)}>Ahora no</button>}</header>
 <form onSubmit={e=>{e.preventDefault();void save();}}>
 {BLOCKS.map(([field,title,hint,options])=><fieldset key={field} className="intent-block"><legend>{title}</legend><p>{hint} <small>{draft[field].length}/{MAX_PICKS}</small></p><div className="intent-chips">{options.map(([k,l])=>{const on=draft[field].includes(k),full=!on&&draft[field].length>=MAX_PICKS;return <button type="button" key={k} className="intent-chip" aria-pressed={on} disabled={full} onClick={()=>setDraft(d=>({...d,[field]:toggle(d[field],k)}))}>{on&&<Check size={14} aria-hidden="true"/>}{l}</button>;})}</div></fieldset>)}
 <div className="form-grid"><label className="field">¿En qué etapa estás?<select value={draft.stage} onChange={e=>setDraft(d=>({...d,stage:e.target.value}))}><option value="">Prefiero no decirlo</option>{STAGES.map(([k,l])=><option key={k} value={k}>{l}</option>)}</select></label><label className="field">¿Algo más que debamos saber? (opcional)<textarea maxLength={600} value={draft.note} onChange={e=>setDraft(d=>({...d,note:e.target.value}))} placeholder="Ej. quiero validar una app de finanzas personales"/></label></div>
 {error&&<p role="alert">{error}</p>}<div className="actions"><button className="primary" disabled={busy}>{busy?'Guardando…':'Guardar mis respuestas'}</button>{editing&&<button type="button" className="secondary" onClick={()=>{setEditing(false);setDraft(intent?{...EMPTY_INTENT,...intent}:EMPTY_INTENT);}}>Cancelar</button>}</div></form></section>;
}
