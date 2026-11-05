import {useEffect,useState} from 'react';
import {BarChart3,CheckCircle2,Clock,Lock,Plus,Trash2,Vote,X} from 'lucide-react';
import {rpc} from './backend';
import {downloadCsv} from './analyticsModel';
import {BarList,Columns,fmt} from './VisualKit';
import {AUDIENCE_LABEL,POLL_TYPES,blankQuestion,pollIssues,resultRows,type Poll,type PollDraft,type Question,type QuestionResult} from './pollModel';
import './peers.css';
/** Encuestas de comunidad: administración u organización las crea y dirige por audiencia o segmento; cada persona responde una vez. */
export default function Polls({canManage}:{canManage:boolean}){
 const [polls,setPolls]=useState<Poll[]|null>(null),[error,setError]=useState(''),[editing,setEditing]=useState<PollDraft|null>(null),[reload,setReload]=useState(0);
 useEffect(()=>{let alive=true;setError('');void rpc<Poll[]>('poll_feed').then(d=>alive&&setPolls(d)).catch(e=>alive&&setError((e as Error).message));return()=>{alive=false;};},[reload]);
 const refresh=()=>setReload(v=>v+1);
 if(error&&!polls)return <div role="alert" className="panel"><strong>No se pudieron cargar las encuestas.</strong> <span>{error}</span></div>;
 if(!polls)return <p role="status">Cargando encuestas…</p>;
 const open=polls.filter(p=>p.status==='open'&&!p.answered),rest=polls.filter(p=>!(p.status==='open'&&!p.answered));
 return <div className="polls">
  <header className="polls-head"><div><span className="eyebrow">TU VOZ DECIDE</span><h2>Encuestas de la comunidad</h2><p>Responde en menos de un minuto. Con tus respuestas elegimos temas, formatos y fechas.</p></div>{canManage&&!editing&&<button className="primary" onClick={()=>setEditing({id:null,title:'',description:'',audience:'community',segment:'',anonymous:true,show_results:true,status:'open',closes_at:'',questions:[blankQuestion('single',1)]})}><Plus size={18}/> Crear encuesta</button>}</header>
  {editing&&<PollEditor draft={editing} close={()=>setEditing(null)} saved={()=>{setEditing(null);refresh();}}/>}
  {!polls.length&&!editing&&<div className="viz-empty"><Vote size={28} aria-hidden="true"/><p>No hay encuestas abiertas para ti en este momento.</p></div>}
  {!!open.length&&<div className="poll-list">{open.map(p=><PollCard key={p.id} poll={p} answered={refresh} edit={canManage?()=>setEditing(toDraft(p)):undefined}/>)}</div>}
  {!!rest.length&&<><h3 className="polls-subtitle">Respondidas y cerradas</h3><div className="poll-list">{rest.map(p=><PollCard key={p.id} poll={p} answered={refresh} edit={canManage?()=>setEditing(toDraft(p)):undefined}/>)}</div></>}
 </div>;
}
const localInput=(iso:string)=>{const d=new Date(iso);return new Date(d.getTime()-d.getTimezoneOffset()*6e4).toISOString().slice(0,16);};
const toDraft=(p:Poll):PollDraft=>({id:p.id,title:p.title,description:p.description,audience:p.audience,segment:p.segment||'',anonymous:p.anonymous,show_results:p.show_results,status:p.status,closes_at:p.closes_at?localInput(p.closes_at):'',questions:p.questions,locked:!!p.results?.responses});

function PollCard({poll,answered,edit}:{poll:Poll;answered:()=>void;edit?:()=>void}){
 const [answers,setAnswers]=useState<Record<string,unknown>>({}),[busy,setBusy]=useState(false),[error,setError]=useState(''),[showResults,setShowResults]=useState(false);
 const canAnswer=poll.status==='open'&&!poll.answered,results=poll.results;
 async function submit(){setError('');setBusy(true);try{await rpc('answer_poll',{p_id:poll.id,p_answers:answers});answered();}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 async function remove(){if(!confirm('¿Eliminar esta encuesta y sus respuestas? No se puede deshacer.'))return;setBusy(true);try{await rpc('delete_poll',{p_id:poll.id});answered();}catch(e){setError((e as Error).message);setBusy(false);}}
 return <article className={'poll-card'+(canAnswer?' is-open':'')}>
  <header><div className="poll-badges"><span className="badge">{AUDIENCE_LABEL[poll.audience]}</span>{poll.segment&&<span className="badge">Segmento: {poll.segment}</span>}{poll.status==='draft'&&<span className="badge">Borrador</span>}{poll.status==='closed'&&<span className="badge"><Lock size={12}/> Cerrada</span>}{poll.answered&&<span className="badge"><CheckCircle2 size={12}/> Respondida</span>}{poll.anonymous&&<span className="badge">Anónima</span>}</div>
  <h3>{poll.title}</h3>{poll.description&&<p>{poll.description}</p>}<p className="poll-meta">{poll.questions.length} {poll.questions.length===1?'pregunta':'preguntas'}{poll.closes_at&&<><Clock size={13} aria-hidden="true"/> cierra el {new Date(poll.closes_at).toLocaleString('es-CO',{dateStyle:'medium',timeStyle:'short'})}</>}{results&&<> · {fmt(results.responses)} respuestas</>}</p></header>
  {canAnswer&&<form onSubmit={e=>{e.preventDefault();void submit();}}>{poll.questions.map((q,i)=><QuestionInput key={q.id} index={i} q={q} value={answers[q.id]} set={v=>setAnswers(a=>({...a,[q.id]:v}))}/>)}{error&&<p role="alert">{error}</p>}<div className="actions"><button className="primary" disabled={busy}>{busy?'Enviando…':'Enviar respuestas'}</button></div></form>}
  {!canAnswer&&results&&<><button type="button" className="secondary" aria-expanded={showResults} onClick={()=>setShowResults(!showResults)}><BarChart3 size={16}/> {showResults?'Ocultar resultados':'Ver resultados'}</button>{showResults&&<div className="poll-results">{poll.questions.map((q,i)=><PollResult key={q.id} q={q} index={i} result={results.questions[i]} total={results.responses}/>)}</div>}</>}
  {!canAnswer&&!results&&poll.answered&&<p className="viz-note">Gracias por responder. El equipo comparte los resultados cuando cierre.</p>}
  {edit&&<div className="actions poll-admin">{edit&&<button type="button" className="secondary" onClick={edit}>Editar</button>}{results&&<button type="button" className="secondary" onClick={()=>downloadCsv('encuesta-'+poll.title.slice(0,40)+'.csv',[['Pregunta','Opción','Respuestas'],...poll.questions.flatMap((q,i)=>resultRows(q,results.questions[i]).map(r=>[q.prompt,r.label,r.value]))])}>Exportar resultados</button>}<button type="button" className="secondary danger" disabled={busy} onClick={()=>void remove()}><Trash2 size={15}/> Eliminar</button></div>}
 </article>;
}
function QuestionInput({q,index,value,set}:{q:Question;index:number;value:unknown;set:(v:unknown)=>void}){
 const name=`q-${q.id}`;
 return <fieldset className="poll-question"><legend><span>{index+1}</span>{q.prompt}{q.required===false&&<small> (opcional)</small>}</legend>
 {q.type==='single'&&<div className="poll-options">{q.options!.map(o=><label key={o} className="poll-option"><input type="radio" name={name} required={q.required!==false} checked={value===o} onChange={()=>set(o)}/><span>{o}</span></label>)}</div>}
 {q.type==='multiple'&&<div className="poll-options">{q.options!.map(o=>{const list=(value as string[]|undefined)||[];return <label key={o} className="poll-option"><input type="checkbox" checked={list.includes(o)} onChange={e=>set(e.target.checked?[...list,o]:list.filter(v=>v!==o))}/><span>{o}</span></label>;})}</div>}
 {q.type==='scale'&&<div className="poll-scale" role="radiogroup" aria-label={q.prompt}>{[1,2,3,4,5].map(n=><label key={n} className="poll-scale-step"><input type="radio" name={name} required={q.required!==false} checked={value===n} onChange={()=>set(n)}/><span>{n}</span></label>)}<small>1 = nada · 5 = mucho</small></div>}
 {q.type==='text'&&<textarea maxLength={1000} required={q.required!==false} value={String(value??'')} onChange={e=>set(e.target.value)} placeholder="Escribe tu respuesta"/>}
 </fieldset>;
}
function PollResult({q,index,result,total}:{q:Question;index:number;result:QuestionResult|undefined;total:number}){
 const tone=((index%4)+1) as 1|2|3|4;
 if(!result)return null;
 if(q.type==='scale')return <section className="viz-card"><Columns tone={tone} label={`${index+1}. ${q.prompt}`} rows={resultRows(q,result)} note={`Promedio ${result.average===null||result.average===undefined?'—':fmt(Number(result.average),1)} de 5`}/></section>;
 if(q.type==='text')return <section className="viz-card"><h4>{index+1}. {q.prompt}</h4><p className="viz-note">{fmt(result.answered||0)} respuestas abiertas{result.texts?.length?'':' · visibles solo para el equipo'}</p>{!!result.texts?.length&&<ul className="poll-texts">{result.texts.map((t,i)=><li key={i}>{t}</li>)}</ul>}</section>;
 return <section className="viz-card"><BarList tone={tone} label={`${index+1}. ${q.prompt}`} max={Math.max(1,total)} rows={resultRows(q,result)}/>{q.type==='multiple'&&<p className="viz-note">Cada persona pudo elegir varias opciones.</p>}</section>;
}

function PollEditor({draft,close,saved}:{draft:PollDraft;close:()=>void;saved:()=>void}){
 const [d,setD]=useState<PollDraft>(draft),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const setQ=(i:number,q:Partial<Question>)=>setD(v=>({...v,questions:v.questions.map((x,k)=>k===i?{...x,...q}:x)}));
 async function save(){const issues=pollIssues(d);if(issues.length){setError(issues[0]);return;}setError('');setBusy(true);
  try{await rpc('save_poll',{p_id:d.id,p_poll:{title:d.title.trim(),description:d.description.trim(),audience:d.audience,segment:d.segment.trim(),anonymous:d.anonymous,show_results:d.show_results,status:d.status,closes_at:d.closes_at?new Date(d.closes_at).toISOString():'',questions:d.questions.map(q=>({id:q.id,type:q.type,prompt:q.prompt.trim(),required:q.required!==false,...(q.type==='single'||q.type==='multiple'?{options:q.options!.map(o=>o.trim())}:{})}))}});saved();}
  catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 return <section className="poll-editor panel"><header><h3>{d.id?'Editar encuesta':'Nueva encuesta'}</h3><button type="button" className="text-button" onClick={close} aria-label="Cerrar editor"><X size={18}/></button></header>
 <div className="form-grid"><label className="field">Título<input value={d.title} maxLength={160} onChange={e=>setD({...d,title:e.target.value})} placeholder="Ej. ¿Qué taller quieres en diciembre?"/></label><label className="field">Audiencia<select value={d.audience} onChange={e=>setD({...d,audience:e.target.value as PollDraft['audience']})}>{Object.entries(AUDIENCE_LABEL).map(([k,l])=><option key={k} value={k}>{l}</option>)}</select></label></div>
 <label className="field">Descripción (opcional)<textarea maxLength={1000} value={d.description} onChange={e=>setD({...d,description:e.target.value})}/></label>
 <div className="form-grid"><label className="field">Solo para un segmento (opcional)<input value={d.segment} maxLength={60} onChange={e=>setD({...d,segment:e.target.value})} placeholder="Nombre exacto del segmento"/></label><label className="field">Estado<select value={d.status} onChange={e=>setD({...d,status:e.target.value as PollDraft['status']})}><option value="draft">Borrador (no visible)</option><option value="open">Abierta</option><option value="closed">Cerrada</option></select></label><label className="field">Cierre automático (opcional)<input type="datetime-local" value={d.closes_at} onChange={e=>setD({...d,closes_at:e.target.value})}/></label></div>
 <div className="poll-toggles"><label><input type="checkbox" checked={d.anonymous} disabled={d.locked} onChange={e=>setD({...d,anonymous:e.target.checked})}/> Anónima: los resultados nunca muestran quién respondió</label><label><input type="checkbox" checked={d.show_results} onChange={e=>setD({...d,show_results:e.target.checked})}/> Mostrar resultados a quien ya respondió</label></div>
 {d.locked&&<p className="viz-note">Ya tiene respuestas: puedes cambiar título, estado o cierre, pero no las preguntas.</p>}
 <ol className="poll-builder">{d.questions.map((q,i)=><li key={q.id} className="poll-builder-q"><div className="form-grid"><label className="field">Pregunta {i+1}<input value={q.prompt} maxLength={240} disabled={d.locked} onChange={e=>setQ(i,{prompt:e.target.value})}/></label><label className="field">Tipo<select value={q.type} disabled={d.locked} onChange={e=>{const type=e.target.value as Question['type'];setQ(i,{type,options:type==='single'||type==='multiple'?(q.options?.length?q.options:['','']):undefined});}}>{Object.entries(POLL_TYPES).map(([k,l])=><option key={k} value={k}>{l}</option>)}</select></label></div>
  {(q.type==='single'||q.type==='multiple')&&<div className="poll-builder-options">{q.options!.map((o,k)=><div key={k} className="poll-builder-option"><input aria-label={`Opción ${k+1} de la pregunta ${i+1}`} value={o} maxLength={120} disabled={d.locked} onChange={e=>setQ(i,{options:q.options!.map((x,n)=>n===k?e.target.value:x)})} placeholder={`Opción ${k+1}`}/>{q.options!.length>2&&!d.locked&&<button type="button" className="text-button" aria-label={`Quitar opción ${k+1}`} onClick={()=>setQ(i,{options:q.options!.filter((_,n)=>n!==k)})}><X size={15}/></button>}</div>)}{q.options!.length<10&&!d.locked&&<button type="button" className="text-button" onClick={()=>setQ(i,{options:[...q.options!,'']})}>+ Añadir opción</button>}</div>}
  <div className="actions"><label><input type="checkbox" checked={q.required!==false} disabled={d.locked} onChange={e=>setQ(i,{required:e.target.checked})}/> Obligatoria</label>{d.questions.length>1&&!d.locked&&<button type="button" className="text-button" onClick={()=>setD(v=>({...v,questions:v.questions.filter((_,k)=>k!==i)}))}>Quitar pregunta</button>}</div></li>)}</ol>
 {!d.locked&&d.questions.length<12&&<div className="actions">{Object.entries(POLL_TYPES).map(([k,l])=><button type="button" key={k} className="secondary" onClick={()=>setD(v=>({...v,questions:[...v.questions,blankQuestion(k as Question['type'],v.questions.length+1,v.questions.map(x=>x.id))]}))}>+ {l}</button>)}</div>}
 {error&&<p role="alert">{error}</p>}<div className="actions"><button type="button" className="primary" disabled={busy} onClick={()=>void save()}>{busy?'Guardando…':d.status==='open'?'Publicar encuesta':'Guardar'}</button><button type="button" className="secondary" onClick={close}>Cancelar</button></div></section>;
}
