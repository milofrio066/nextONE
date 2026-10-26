import {useEffect,useRef,useState} from 'react';
import {rpc} from './backend';
type Values={status:string;role:string;cohort:string};
type Member={onboarding_completed_at?:string|null;id:string;name?:string;verified?:boolean;created_at?:string;bio?:string;skills?:string;source?:string;status?:string;role?:string;cohort?:string};
type Action=(work:()=>Promise<unknown>,message?:string)=>Promise<void>;
const labels:Record<string,string>={pending:'Pendiente',active:'Activo',suspended:'Sin acceso',member:'Miembro',mentor:'Mentor',organizer:'Organizador',admin:'Administrador'};
const values=(row:Member):Values=>({status:row.status||'pending',role:row.role||'member',cohort:row.cohort||''});
const fields=[['status','Acceso'],['role','Rol'],['cohort','Cohorte']] as const;
export default function MemberDecision({row,run,busy}:{row:Member;run:Action;busy:boolean}){
 const [baseline,setBaseline]=useState(()=>values(row)),[draft,setDraft]=useState(()=>values(row)),[review,setReview]=useState(false),[reason,setReason]=useState('');const note=useRef<HTMLTextAreaElement>(null);
 const changes=fields.filter(([key])=>baseline[key]!==(key==='cohort'?draft[key].trim():draft[key])),stale=JSON.stringify(values(row))!==JSON.stringify(baseline);
 useEffect(()=>{if(review)note.current?.focus();},[review]);
 const describe=(key:keyof Values,value:string)=>key==='cohort'?value||'Sin cohorte':labels[value]||value;
 return <section className="member-decision"><p><b>{row.verified?'✓ Correo verificado':'Correo sin confirmar'}</b>{row.created_at&&' · Solicitud del '+new Date(row.created_at).toLocaleString('es-CO')}</p>
 {row.bio&&<details className="admin-context"><summary>Información anterior del miembro</summary><p>{row.bio}</p><p>Habilidades: {row.skills||'Sin indicar'}</p></details>}
 {row.status==='active'&&row.onboarding_completed_at!==undefined&&<p className="pilot-notice">{row.onboarding_completed_at===null?'Ingreso aprobado · perfil inicial por completar.':'Acceso completo a la comunidad.'}</p>}
 <p className="muted">Origen: {row.source||'Registro en nextONE'}. Una aprobación nueva da paso a la bienvenida guiada; el perfil se crea después.</p>
 <ol className="decision-steps" aria-label="Proceso de decisión"><li aria-current={!review?'step':undefined}>1 · Elegir cambios</li><li aria-current={review?'step':undefined}>2 · Revisar y justificar</li></ol>
 {stale&&<div className="pilot-notice" role="alert"><p>Esta cuenta cambió mientras la revisabas. Conservamos tu propuesta, pero debes cargar los datos actuales antes de guardar.</p><button type="button" className="secondary" onClick={()=>{const next=values(row);setBaseline(next);setDraft(next);setReview(false);setReason('');}}>Cargar datos actuales</button></div>}
 {!review?<form onSubmit={e=>{e.preventDefault();setReview(true);}}><h3>Primero elige cómo quedará la cuenta</h3><div className="form-grid">
 <label className="field">Acceso<select aria-label="Acceso" value={draft.status} onChange={e=>setDraft({...draft,status:e.target.value})}><option value="pending">Pendiente de aprobación</option><option value="active">Activo · aprobar acceso</option><option value="suspended">Sin acceso</option></select></label>
 <label className="field">Rol<select aria-label="Rol" value={draft.role} onChange={e=>setDraft({...draft,role:e.target.value})}>{['member','mentor','organizer','admin'].map(role=><option key={role} value={role}>{labels[role]}</option>)}</select></label>
 <label className="field">Cohorte<input value={draft.cohort} maxLength={80} onChange={e=>setDraft({...draft,cohort:e.target.value})} placeholder="Opcional"/></label></div>
 {!row.verified&&draft.status==='active'&&<p role="alert">El correo debe estar confirmado antes de aprobar el acceso.</p>}
 <p>Los cambios todavía no se han aplicado.</p><button className="primary" disabled={busy||stale||!changes.length||(!row.verified&&draft.status==='active')}>Revisar cambios</button></form>:
 <form onSubmit={e=>{e.preventDefault();void run(()=>rpc('admin_update_member',{p_user:row.id,p_status:draft.status,p_role:draft.role,p_cohort:draft.cohort.trim(),p_reason:reason.trim(),p_expected:baseline}),'Cambios guardados. El motivo está en el historial privado del miembro.');}}><h3>Revisa el resultado y explica la decisión</h3>
 <dl className="decision-summary">{changes.map(([key,label])=><div key={key}><dt>{label}</dt><dd><span>{describe(key,baseline[key])}</span><span aria-hidden="true"> → </span><strong>{describe(key,draft[key])}</strong></dd></div>)}</dl>
 {draft.role==='admin'&&baseline.role!=='admin'&&<p className="pilot-notice">Este rol permite administrar miembros, contenido, reportes e indicadores de toda la comunidad.</p>}
 <label className="field">Motivo de la decisión<textarea ref={note} required minLength={10} maxLength={2000} value={reason} onChange={e=>setReason(e.target.value)} placeholder="Explica por qué realizas estos cambios."/></label>
 <p className="decision-privacy">La justificación queda en el historial privado de esta persona, junto con tu nombre, la fecha y los cambios. Solo administración puede verla; no se publica en su perfil ni se envía por correo.</p>
 <div className="actions"><button type="button" className="secondary" disabled={busy} onClick={()=>setReview(false)}>Volver a editar</button><button className="primary" disabled={busy||stale||reason.trim().length<10}>Confirmar y guardar</button></div></form>}
 <MemberHistory user={row.id}/></section>;
}
type Entry={id:string;actor:string;created_at:string;reason:string;before_values:Values|null;after_values:Values|null;legacy:boolean};
function MemberHistory({user}:{user:string}){
 const [open,setOpen]=useState(false),[entries,setEntries]=useState<Entry[]|null>(null),[error,setError]=useState('');
 useEffect(()=>{if(!open)return;let alive=true;setError('');void rpc<Entry[]>('admin_member_history',{p_user:user}).then(data=>{if(alive)setEntries(data);}).catch(e=>{if(alive)setError(e.message);});return()=>{alive=false;};},[open,user]);
 return <details className="admin-context member-history" open={open} onToggle={e=>{if(e.target===e.currentTarget)setOpen(e.currentTarget.open);}}><summary>Historial privado de decisiones</summary><p>Solo administración. Incluye las justificaciones antiguas que ya estaban guardadas.</p>{error&&<p role="alert">{error}</p>}{!entries&&!error&&<p role="status">Cargando historial…</p>}{entries?.map(entry=><article key={entry.id}><strong>{entry.actor||'Administración'}</strong><small>{new Date(entry.created_at).toLocaleString('es-CO')}</small><p className="preserve-lines">{entry.reason||'Sin nota en el registro anterior.'}</p>{entry.before_values&&entry.after_values&&<ul>{fields.filter(([key])=>entry.before_values![key]!==entry.after_values![key]).map(([key,label])=><li key={key}>{label}: {labels[entry.before_values![key]]||entry.before_values![key]||'Sin cohorte'} → {labels[entry.after_values![key]]||entry.after_values![key]||'Sin cohorte'}</li>)}</ul>}{entry.legacy&&<small>Registro anterior: no incluía una comparación de valores.</small>}</article>)}{entries?.length===0&&<p>Todavía no hay decisiones registradas para esta persona.</p>}<small>Se muestran hasta 100 registros recientes.</small></details>;
}
