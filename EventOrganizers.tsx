import { useEffect,useState } from 'react';
import { backend,rpc } from './backend';
import type { Profile } from './types';
export default function EventOrganizers({eventId,people}:{eventId:string;people:Profile[]}){
 const [assigned,setAssigned]=useState<string[]>([]),[selected,setSelected]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 async function load(){const {data,error}=await backend!.from('event_organizers').select('*').eq('event_id',eventId);if(error)throw error;setAssigned((data||[]).filter(x=>x.event_id===eventId).map(x=>x.user_id));}
 useEffect(()=>{void load().catch(e=>setError(e.message));},[eventId]);
 async function change(user:string,remove:boolean){setBusy(true);setError('');try{await rpc('set_event_organizer',{p_event:eventId,p_user:user,p_remove:remove});await load();}catch(e){setError((e as {message:string}).message);}finally{setBusy(false);}}
 return <div className="pilot-box"><h3>Organizadores que evalúan</h3><p>El responsable del evento y administración pueden evaluar. Asigna otros organizadores para revisar también los cases, soluciones y proyectos vinculados.</p>{error&&<p role="alert">{error}</p>}{assigned.map(id=><div className="pilot-row" key={id}><span>{people.find(p=>p.id===id)?.name||'Organizador'}</span><button className="secondary" disabled={busy} onClick={()=>void change(id,true)}>Retirar organizador</button></div>)}<label className="field">Asignar organizador<select value={selected} onChange={e=>setSelected(e.target.value)}><option value="">Selecciona una persona</option>{people.filter(p=>p.role==='organizer'&&p.status==='active'&&!assigned.includes(p.id)).map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label><button className="secondary" disabled={busy||!selected} onClick={()=>void change(selected,false)}>Asignar al evento</button></div>;
}
