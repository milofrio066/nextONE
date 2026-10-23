import {useEffect,useState} from 'react';
import {readRows} from './data';
import type {Content,Registration} from './types';
export default function Reminders({user,items,refreshKey,open}:{user:string;items:Content[];refreshKey:number;open:(c:Content)=>void}){
 const [regs,setRegs]=useState<Registration[]>([]),[error,setError]=useState(''),[now,setNow]=useState(Date.now());
 useEffect(()=>{let alive=true;const load=()=>readRows<Registration>('registrations',{user_id:user}).then(r=>{if(alive){setRegs(r);setError('');}}).catch(()=>{if(alive)setError('No se pudo actualizar tu agenda.');});void load();const timer=setInterval(()=>{setNow(Date.now());void load();},60000);return()=>{alive=false;clearInterval(timer);};},[user,refreshKey]);
 const upcoming=items.filter(c=>regs.some(r=>r.content_id===c.id&&r.status!=='cancelled')&&c.starts_at&&c.ends_at&&new Date(c.ends_at).getTime()>now&&new Date(c.starts_at).getTime()<now+86400000).sort((a,b)=>a.starts_at!.localeCompare(b.starts_at!));
 if(error)return <p role="alert">{error}</p>;
 if(!upcoming.length)return <aside className="pilot-notice" aria-label="Tu agenda"><strong>Tu agenda · próximas 24 horas</strong><p>No tienes inscripciones próximas. Explora los encuentros de Makers.</p></aside>;
 return <aside className="pilot-notice" aria-label="Recordatorios de tus actividades"><strong>Tu agenda de las próximas 24 horas</strong>{upcoming.map(c=><p key={c.id}><button className="secondary" onClick={()=>open(c)}>{c.title} · {new Date(c.starts_at!).toLocaleString('es-CO')}</button></p>)}<small>Recordatorios mientras usas nextONE. Añade la actividad a tu calendario para recibir su aviso fuera de la app.</small></aside>;
}
