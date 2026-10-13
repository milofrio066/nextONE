import { useEffect, useState } from 'react';
import { backend, rpc } from './backend';
import type { Content, Profile } from './types';
type Review={content_id:string;score:number;strengths:string;improvements:string;verdict:string;reviewer_id:string;updated_at:string;revision:number};
export default function FinalReview({item,people,refreshKey}:{item:Content;people:Profile[];refreshKey:number}){
 const [review,setReview]=useState<Review|null>(null),[allowed,setAllowed]=useState(false),[votes,setVotes]=useState(0),[busy,setBusy]=useState(false),[error,setError]=useState(''),[editing,setEditing]=useState(false);
 async function load(){setError('');const [{data,error},can,summary]=await Promise.all([backend!.from('final_reviews').select('*').eq('content_id',item.id),rpc<boolean>('can_finalize_content',{p_content:item.id}),rpc<{ratingCount:number}>('feedback_summary',{p_content:item.id})]);if(error)throw error;setReview((data as Review[]).find(r=>r.content_id===item.id)||null);setAllowed(can);setVotes(summary.ratingCount);}
 useEffect(()=>{void load().catch(e=>setError(e.message));},[item.id,refreshKey]);
 return <section className="panel final-review"><span className="eyebrow">EVALUACIÓN OFICIAL</span><h2>Feedback definitivo de organizadores</h2><p>La calificación comunitaria es independiente. El equipo responsable emite su evaluación después de recibir al menos una calificación de la comunidad.</p>
 {error&&<p role="alert">{error} <button className="secondary" onClick={()=>void load().catch(e=>setError(e.message))}>Reintentar</button></p>}
 {review?<article><strong className="review-score">{review.score} / 5</strong><p>{people.find(p=>p.id===review.reviewer_id)?.name||'Organizador'} · {new Date(review.updated_at).toLocaleString('es-CO')} · revisión {review.revision}</p><h3>Fortalezas</h3><p>{review.strengths}</p><h3>Oportunidades de mejora</h3><p>{review.improvements}</p><h3>Conclusión definitiva</h3><p>{review.verdict}</p></article>:<p>Aún no hay feedback definitivo.</p>}
 {allowed&&(!review||editing)?<form key={review?.revision||0} onSubmit={async e=>{e.preventDefault();const f=new FormData(e.currentTarget);setBusy(true);setError('');try{await rpc('save_final_review',{p_content:item.id,p_score:Number(f.get('score')),p_strengths:f.get('strengths'),p_improvements:f.get('improvements'),p_verdict:f.get('verdict')});await load();setEditing(false);}catch(e){setError((e as {message:string}).message);}finally{setBusy(false);}}}>
 <label className="field">Calificación definitiva<select name="score" defaultValue={review?.score||5}>{[1,2,3,4,5].map(n=><option key={n} value={n}>{n} / 5</option>)}</select></label>
 <label className="field">Fortalezas<textarea name="strengths" minLength={10} maxLength={2000} required defaultValue={review?.strengths}/></label>
 <label className="field">Oportunidades de mejora<textarea name="improvements" minLength={10} maxLength={2000} required defaultValue={review?.improvements}/></label>
 <label className="field">Conclusión definitiva<textarea name="verdict" minLength={10} maxLength={2000} required defaultValue={review?.verdict}/></label>
 {!votes&&<p>Espera la primera calificación comunitaria para emitir el feedback definitivo.</p>}<button className="primary" disabled={busy||!votes}>Publicar feedback definitivo</button>{review&&<button type="button" className="secondary" onClick={()=>setEditing(false)}>Cancelar revisión</button>}
 </form>:allowed&&review&&<button className="secondary" onClick={()=>setEditing(true)}>Revisar feedback definitivo</button>}
 </section>;
}
