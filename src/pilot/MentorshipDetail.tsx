import {useEffect,useState} from 'react';
import {CalendarPlus,Video} from 'lucide-react';
import AttendancePanel from './AttendancePanel';
import ContentCover from './ContentCover';
import ContentStory from './ContentStory';
import InteractiveSlot from './InteractiveSlot';
import ProfileAvatar from './ProfileAvatar';
import Recording from './Recording';
import {rpc} from './backend';
import {downloadCalendar} from './calendar';
import {audienceLabel,duration,modalityLabel,seatsLabel,specialty,step,timeZone,when,type Session} from './mentorshipModel';
import {youtubeId} from './youtube';
import type {Content,Profile} from './types';
type Action=(work:()=>Promise<unknown>,message?:string)=>Promise<void>;
type Report={roster:{id:string;name:string;status:string;confirmed_at:string|null;joined_at:string|null;surveyed:boolean}[];survey:{responses:number;attended:number;average:number|null;nps:number|null;comments:string[]}};
const headings={register:'Reserva tu lugar',confirm:'Confirma tu participación',confirmed:'Participación confirmada',join:'La sesión está por comenzar',full:'No quedan cupos',ended:'Esta sesión terminó'};
const notes={register:'Inscríbete para reservar tu cupo en esta sesión.',confirm:'Confirma para que el equipo sepa que asistirás.',confirmed:'El acceso se habilita cinco minutos antes de empezar.',join:'El acceso ya está habilitado.',full:'Puedes revisar otras sesiones en el calendario.',ended:'Al terminar se habilita la encuesta de satisfacción. Los materiales disponibles aparecen abajo.'};
function Manage({session,profile,materials,busy,act,edit,addMaterial,remove,refreshKey}:{session:Session;profile:Profile;materials:Content[];busy:boolean;act:Action;edit:()=>void;addMaterial:()=>void;remove:()=>void;refreshKey:number}){
 const {item,info}=session,owner=item.owner_id===profile.id||profile.role==='admin';
 const [report,setReport]=useState<Report|null>(null),[error,setError]=useState(''),[url,setUrl]=useState('');
 const load=()=>rpc<Report>('mentorship_report',{p_content:item.id}).then(setReport).catch(e=>setError(e.message));
 useEffect(()=>{void load();if(info.has_recording)void rpc<string|null>('mentorship_recording',{p_content:item.id}).then(u=>setUrl(u||'')).catch(()=>{});},[item.id,refreshKey]);
 const counts=report?[['Inscritos',report.roster.length],['Confirmados',report.roster.filter(p=>p.confirmed_at).length],['Asistencia verificada',report.roster.filter(p=>p.status==='attended').length]]:[];
 return <section className="panel mentorship-manage" aria-labelledby="manage-mentorship"><span className="eyebrow">ORGANIZACIÓN</span><h2 id="manage-mentorship">Gestionar esta mentoría</h2>
 <div className="actions">{owner&&<button className="secondary" onClick={edit}>Editar contenido y diseño</button>}<button className="secondary" onClick={addMaterial}>Publicar material</button>{owner&&<button className="secondary delete-content" disabled={busy} onClick={remove}>Eliminar mentoría</button>}</div>
 {error&&<p role="alert">{error}</p>}{!report&&!error&&<p role="status">Cargando participantes…</p>}
 {report&&<><dl className="mentorship-counts">{counts.map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
 <h3>Participantes</h3>{!report.roster.length&&<p>Todavía no hay inscripciones.</p>}{report.roster.map(p=><div className="pilot-row" key={p.id}><span><strong>{p.name}</strong> · {p.confirmed_at?'Confirmó':'Sin confirmar'} · {p.joined_at?'Solicitó acceso':'Sin acceso'} · {p.surveyed?'Encuesta respondida':'Encuesta pendiente'}</span><button className="secondary" disabled={busy} onClick={()=>void act(async()=>{await rpc('mark_attendance',{p_content:item.id,p_user:p.id,p_attended:p.status!=='attended'});await load();},'Asistencia actualizada')}>{p.status==='attended'?'Retirar asistencia':'Confirmar asistencia'}</button></div>)}
 <h3>Satisfacción y comentarios</h3>{report.survey.responses?<><p>{report.survey.responses} {report.survey.responses===1?'respuesta':'respuestas'}{report.survey.average!==null&&` · ${Number(report.survey.average).toFixed(1)} / 5`}{report.survey.nps!==null&&` · NPS ${report.survey.nps}`}</p>{report.survey.comments.map((c,i)=><blockquote key={i}>{c}</blockquote>)}<small>Los comentarios se muestran sin identificar a quien los escribió.</small></>:<p>Las respuestas llegan al terminar la sesión.</p>}</>}
 <h3>Grabación</h3><form onSubmit={e=>{e.preventDefault();if(url&&!youtubeId(url)){setError('Usa un enlace de YouTube para reproducirla dentro de nextONE.');return;}setError('');void act(()=>rpc('set_mentorship_recording',{p_content:item.id,p_url:url}),url?'Grabación publicada':'Grabación retirada');}}><label className="field">Enlace de YouTube (sin listar)<input type="url" value={url} onChange={e=>setUrl(e.target.value)} placeholder="https://youtu.be/…"/></label><button className="secondary" disabled={busy}>Guardar grabación</button></form>
 {!!materials.length&&<p>{materials.length} {materials.length===1?'material publicado':'materiales publicados'}.</p>}
 {owner&&<AttendancePanel content={item.id}/>}
 </section>;
}
export default function MentorshipDetail({session,profile,items,busy,act,open,edit,back,addMaterial,refreshKey}:{session:Session;profile:Profile;items:Content[];busy:boolean;act:Action;open:(c:Content)=>void;edit:()=>void;back:()=>void;addMaterial:()=>void;refreshKey:number}){
 const {item,info}=session,{mentor}=info,[tick,setTick]=useState(Date.now()),[link,setLink]=useState(''),[recording,setRecording]=useState<string|null>(null);
 useEffect(()=>{const t=setInterval(()=>setTick(Date.now()),10000);return()=>clearInterval(t);},[]);
 useEffect(()=>{let alive=true;if(info.has_recording)void rpc<string|null>('mentorship_recording',{p_content:item.id}).then(u=>{if(alive)setRecording(u);}).catch(()=>{});else setRecording(null);return()=>{alive=false;};},[item.id,info.has_recording]);
 const state=step(session,tick),materials=items.filter(c=>c.parent_id===item.id&&c.kind==='resource');
 const change=(name:string,args:Record<string,unknown>,message:string)=>void act(()=>rpc(name,{p_content:item.id,...args}),message);
 const cancel=()=>{if(confirm(`¿Cancelar tu inscripción a "${item.title}"? Tu cupo quedará disponible.`)){setLink('');change('register_event',{p_cancel:true},'Inscripción cancelada');}};
 // Abrir la pestaña dentro del clic evita el bloqueo de ventanas emergentes; el enlace se pide después.
 const enter=()=>{const tab=window.open('','_blank');void act(async()=>{try{const url=await rpc<string>('get_join_link',{p_content:item.id});setLink(url);if(tab){tab.opener=null;tab.location.href=url;}}catch(e){tab?.close();throw e;}},'Acceso habilitado');};
 const remove=()=>void act(async()=>{if(!confirm(`¿Eliminar "${item.title}"? Se ocultará para toda la comunidad.`))return;await rpc('delete_content',{p_content:item.id});back();},'Mentoría eliminada');
 return <div className="mentorship-page"><button className="secondary" onClick={back}>← Volver a Mentorías</button>
 <section className="panel mentorship-head"><ContentCover item={item} detail/><div className="mentorship-badges"><span className="badge">Mentoría grupal</span><span className="badge">{audienceLabel[info.audience]}</span>{!item.published&&<span className="badge">Borrador</span>}</div><h1>{item.title}</h1>{!!item.topics?.length&&<p className="mentorship-topic">{item.topics.join(' · ')}</p>}<ContentStory body={item.body}/></section>
 <div className="mentorship-layout"><div className="mentorship-content"><InteractiveSlot key={item.id} item={item} canEdit={false} userId={profile.id}/>
 <section className="panel"><h2>Quién acompaña</h2><div className="mentor-row"><ProfileAvatar person={mentor} compact/><div><strong>{mentor.nickname||mentor.name}</strong><small>{specialty(mentor)}</small></div></div>{mentor.bio&&<p>{mentor.bio}</p>}</section>
 {(recording||materials.length>0)&&<section className="panel"><h2>Materiales de la sesión</h2>{recording&&<Recording url={recording}/>}{materials.map(c=><button className="secondary mentorship-material" key={c.id} onClick={()=>open(c)}>{c.title}</button>)}</section>}
 {info.can_manage&&<Manage session={session} profile={profile} materials={materials} busy={busy} act={act} edit={edit} addMaterial={addMaterial} remove={remove} refreshKey={refreshKey}/>}</div>
 <aside className="mentorship-aside"><section className="panel mentorship-action"><h2>{headings[state]}</h2><p>{notes[state]}</p>
 {state==='register'&&<button className="primary" disabled={busy} onClick={()=>change('register_event',{p_cancel:false},'Inscripción confirmada')}>Inscribirme</button>}
 {state==='confirm'&&<button className="primary" disabled={busy} onClick={()=>change('confirm_event',{},'Participación confirmada')}>Confirmar participación</button>}
 {state==='confirmed'&&<button className="primary" disabled>Entrar a la sesión</button>}
 {state==='join'&&<button className="primary" disabled={busy} onClick={enter}><Video size={17}/> Entrar a la sesión</button>}
 {link&&<a className="secondary" href={link} target="_blank" rel="noopener noreferrer">Abrir {modalityLabel[info.modality]} de nuevo</a>}
 {state!=='ended'&&<button className="secondary" onClick={()=>downloadCalendar(item)}><CalendarPlus size={17}/> Añadir al calendario</button>}
 {info.mine&&state!=='ended'&&<button className="text-button" disabled={busy} onClick={cancel}>Cancelar inscripción</button>}</section>
 <section className="panel"><h2>Cuándo y dónde</h2><dl className="mentorship-data"><div><dt>Fecha y hora</dt><dd>{when(item.starts_at!)}</dd></div><div><dt>Zona horaria</dt><dd>{timeZone(item.starts_at!)}</dd></div><div><dt>Duración</dt><dd>{duration(item.starts_at!,item.ends_at!)}</dd></div><div><dt>Modalidad</dt><dd>En línea por {modalityLabel[info.modality]}</dd></div></dl></section>
 <section className="panel"><h2>Participación</h2><dl className="mentorship-data"><div><dt>Cupos</dt><dd>{state==='ended'?`${item.capacity} en total`:seatsLabel(info.seats_left)}</dd></div><div><dt>Audiencia autorizada</dt><dd>{audienceLabel[info.audience]}</dd></div><div><dt>Condiciones</dt><dd>Inscríbete y confirma. Si no puedes asistir, cancela para liberar tu cupo. Después de la sesión responde la encuesta de satisfacción.</dd></div></dl></section></aside></div></div>;
}
