import {useState} from 'react';
import {CalendarCheck2} from 'lucide-react';
import {rpc} from './backend';
import './event-desk.css';
type Survey={id:string;title:string;ends_at:string;starts_at?:string};
const FACES=[[1,'😞','Nada útil'],[2,'😕','Poco útil'],[3,'😐','Regular'],[4,'🙂','Útil'],[5,'🤩','Muy útil']] as const;
/** Encuesta de satisfacción por pasos. Aparece 3 h después del final para quien confirmó o asistió (025). */
export default function SatisfactionSurvey({survey,remaining,done}:{survey:Survey;remaining:number;done:()=>Promise<void>}){
 const [step,setStep]=useState(0),[attended,setAttended]=useState<boolean|null>(null),[rating,setRating]=useState<number|null>(null),[recommend,setRecommend]=useState<number|null>(null),[comment,setComment]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const steps=attended===false?2:4,last=step===steps-1;
 async function submit(){setBusy(true);setError('');try{await rpc('submit_event_survey',{p_content:survey.id,p_attended:!!attended,p_rating:attended?rating:null,p_recommend:attended?recommend:null,p_comment:comment.trim()});await done();}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 const canNext=step===0?attended!==null:step===1&&attended?rating!==null:step===2?recommend!==null:true;
 return <div className="survey-flow"><h1>¿Cómo te fue?</h1>
  <div className="survey-event"><CalendarCheck2 size={30} aria-hidden="true"/><div><strong>{survey.title}</strong><small>Terminó el {new Date(survey.ends_at).toLocaleString('es-CO',{dateStyle:'long',timeStyle:'short'})}{remaining>1?` · ${remaining} encuestas pendientes`:''}</small></div></div>
  <div className="survey-progress" aria-label={`Paso ${step+1} de ${steps}`}>{Array.from({length:steps},(_,i)=><i key={i} className={i<=step?'on':''}/>)}</div>
  <form key={survey.id} className="survey-step" onSubmit={e=>{e.preventDefault();if(last)void submit();else if(canNext)setStep(step+1);}}>
   {step===0&&<fieldset><legend><h2>¿Pudiste asistir?</h2></legend><p>Tu respuesta no reemplaza la asistencia verificada por el organizador.</p><div className="survey-choices">{([[true,'🙌','Sí, asistí'],[false,'🙈','No pude asistir']] as const).map(([v,e,l])=><button type="button" key={l} className="survey-choice" aria-pressed={attended===v} onClick={()=>{setAttended(v);setStep(1);}}><span aria-hidden="true">{e}</span>{l}</button>)}</div></fieldset>}
   {step===1&&attended&&<fieldset><legend><h2>¿Qué tan útil fue para ti?</h2></legend><div className="survey-choices survey-faces">{FACES.map(([n,e,l])=><button type="button" key={n} className="survey-choice" aria-pressed={rating===n} aria-label={`${n} de 5: ${l}`} onClick={()=>{setRating(n);setStep(2);}}><span aria-hidden="true">{e}</span>{l}</button>)}</div></fieldset>}
   {step===2&&attended&&<fieldset><legend><h2>¿Qué tan probable es que lo recomiendes?</h2></legend><p>0 = nada probable · 10 = muy probable</p><div className="survey-nps" role="group" aria-label="Recomendación de 0 a 10">{Array.from({length:11},(_,n)=><button type="button" key={n} aria-pressed={recommend===n} onClick={()=>{setRecommend(n);setStep(3);}}>{n}</button>)}</div><div className="survey-nps-legend"><span>Nada probable</span><span>Muy probable</span></div></fieldset>}
   {last&&<><h2>{attended?'¿Qué mejorarías o qué te gustó más?':'¿Qué te impidió asistir?'}</h2><p>Opcional. El equipo lo lee sin tu nombre.</p><label className="field">Comentario<textarea maxLength={1000} value={comment} onChange={e=>setComment(e.target.value)} placeholder={attended?'Ej. me encantó la dinámica en grupos; faltó tiempo para preguntas':'Ej. coincidió con mi trabajo; prefiero horario de noche'}/></label></>}
   {error&&<p role="alert">{error}</p>}
   <div className="survey-actions">{step>0?<button type="button" className="secondary" onClick={()=>setStep(step===steps-1&&attended===false?0:step-1)}>Anterior</button>:<span/>}{(last||step>0&&canNext)&&<button className="primary" disabled={busy||!canNext}>{last?busy?'Enviando…':'Enviar y continuar':'Siguiente'}</button>}</div>
  </form></div>;
}
