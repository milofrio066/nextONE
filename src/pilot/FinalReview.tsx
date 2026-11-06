import {useEffect,useState} from 'react';
import type React from 'react';
import {Lock,Sparkles,Target,Flag} from 'lucide-react';
import {backend,rpc} from './backend';
import type {Content,Profile} from './types';
import './event-desk.css';
type Review={content_id:string;score:number;strengths:string;improvements:string;verdict:string;reviewer_id:string;updated_at:string;revision:number};
/** Tarjeta del feedback definitivo. Solo administración, organizadores responsables y la persona evaluada (025). */
export function ReviewCard({review,people,score,children}:{review:Review|{score:number;strengths:string;improvements:string;verdict:string;reviewer_id:string;updated_at:string;revision:number};people:Profile[];score?:number;children?:React.ReactNode}){
 const value=score??review.score;
 return <article className="review-card"><div className="review-head"><div className="review-ring" style={{'--score':`${value/5*100}%`} as React.CSSProperties} role="img" aria-label={`Calificación definitiva ${value.toFixed(1)} de 5`}><div><strong>{value.toFixed(value%1?1:0)}</strong><small>de 5</small></div></div>
  <div className="review-meta"><span className="review-private"><Lock size={13}/> Privado: solo tú, organización y administración</span><p>{people.find(p=>p.id===review.reviewer_id)?.name||'Organizador'} · {new Date(review.updated_at).toLocaleString('es-CO',{dateStyle:'medium',timeStyle:'short'})}{review.revision>1?` · revisión ${review.revision}`:''}</p></div></div>
  {children}
  <div className="review-blocks"><section className="review-block tone-2"><h3><Sparkles size={15}/> Fortalezas</h3><p>{review.strengths}</p></section><section className="review-block tone-4"><h3><Target size={15}/> Oportunidades de mejora</h3><p>{review.improvements}</p></section><section className="review-block tone-1"><h3><Flag size={15}/> Conclusión</h3><p>{review.verdict}</p></section></div></article>;
}
export function StarPicker({value,set}:{value:number;set:(n:number)=>void}){return <div className="review-stars" role="radiogroup" aria-label="Calificación definitiva">{[1,2,3,4,5].map(n=><button type="button" role="radio" key={n} aria-checked={value===n} aria-pressed={n<=value} aria-label={`${n} de 5`} onClick={()=>set(n)}>★</button>)}</div>;}
export default function FinalReview({item,people,refreshKey}:{item:Content;people:Profile[];refreshKey:number}){
 const [visible,setVisible]=useState(false),[review,setReview]=useState<Review|null>(null),[allowed,setAllowed]=useState(false),[votes,setVotes]=useState(0),[busy,setBusy]=useState(false),[error,setError]=useState(''),[editing,setEditing]=useState(false),[score,setScore]=useState(5);
 async function load(){setError('');const can=await rpc<boolean>('can_view_final_review',{p_content:item.id});setVisible(can);if(!can)return;const [{data,error},fin,summary]=await Promise.all([backend!.from('final_reviews').select('*').eq('content_id',item.id),rpc<boolean>('can_finalize_content',{p_content:item.id}),rpc<{ratingCount:number}>('feedback_summary',{p_content:item.id})]);if(error)throw error;const r=(data as Review[]).find(x=>x.content_id===item.id)||null;setReview(r);setScore(r?.score||5);setAllowed(fin);setVotes(summary.ratingCount);}
 useEffect(()=>{void load().catch(e=>setError(e.message));},[item.id,refreshKey]);
 if(!visible)return null;
 return <section className="panel final-review"><span className="eyebrow">EVALUACIÓN OFICIAL</span><h2>Feedback definitivo</h2><p>Es independiente de la calificación de la comunidad. Solo lo ven administración, los organizadores responsables y quien publicó el contenido.</p>
 {error&&<p role="alert">{error} <button className="secondary" onClick={()=>void load().catch(e=>setError(e.message))}>Reintentar</button></p>}
 {review&&!editing?<ReviewCard review={review} people={people}/>:!review&&!allowed&&<p className="viz-note">El equipo aún no ha publicado su feedback definitivo.</p>}
 {allowed&&(!review||editing)?<form key={review?.revision||0} className="review-form" onSubmit={async e=>{e.preventDefault();const f=new FormData(e.currentTarget);setBusy(true);setError('');try{await rpc('save_final_review',{p_content:item.id,p_score:score,p_strengths:f.get('strengths'),p_improvements:f.get('improvements'),p_verdict:f.get('verdict')});await load();setEditing(false);}catch(e){setError((e as {message:string}).message);}finally{setBusy(false);}}}>
 <div className="field">Calificación definitiva<StarPicker value={score} set={setScore}/></div>
 <label className="field">Fortalezas<textarea name="strengths" minLength={10} maxLength={2000} required defaultValue={review?.strengths} placeholder="Qué funcionó y por qué"/></label>
 <label className="field">Oportunidades de mejora<textarea name="improvements" minLength={10} maxLength={2000} required defaultValue={review?.improvements} placeholder="Qué ajustar, con un siguiente paso concreto"/></label>
 <label className="field">Conclusión definitiva<textarea name="verdict" minLength={10} maxLength={2000} required defaultValue={review?.verdict}/></label>
 {!votes&&<p className="viz-note">Espera la primera calificación de la comunidad para publicar el feedback definitivo.</p>}<div className="actions"><button className="primary" disabled={busy||!votes}>Publicar feedback definitivo</button>{review&&<button type="button" className="secondary" onClick={()=>setEditing(false)}>Cancelar revisión</button>}</div>
 </form>:allowed&&review&&<button className="secondary" onClick={()=>setEditing(true)}>Revisar feedback definitivo</button>}
 </section>;
}
