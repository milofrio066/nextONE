import {useEffect,useState} from 'react';
import {rpc} from './backend';
import {countries} from './countries';
import SatisfactionSurvey from './SatisfactionSurvey';
import type {Profile} from './types';
type Survey={id:string;title:string;ends_at:string};
export default function FellowshipGate({profile,children,updated}:{profile:Profile;children:React.ReactNode;updated:()=>Promise<void>}){
 const [pending,setPending]=useState<Survey[]>([]),[ready,setReady]=useState(false),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const [country,setCountry]=useState(''),[region,setRegion]=useState(''),[city,setCity]=useState('');
 const location=profile.fellowship_location_completed_at===null;
 async function check(){if(profile.fellowship_location_completed_at===undefined){setReady(true);return;}try{const data=await rpc<{surveys:Survey[]}>('fellowship_gate');setPending(data.surveys);setReady(true);setError('');}catch(e){setError((e as Error).message);}}
 useEffect(()=>{void check();const timer=setInterval(()=>{if(!document.hidden)void check();},30000);const focus=()=>void check();window.addEventListener('focus',focus);return()=>{clearInterval(timer);window.removeEventListener('focus',focus);};},[profile.id,profile.fellowship_location_completed_at]);
 if(!location&&ready&&!pending.length&&!error)return <>{children}</>;
 if(!location&&error&&!pending.length)return <section className="panel"><h1>No pudimos revisar tus pendientes</h1><p role="alert">{error}</p><button className="primary" onClick={()=>void check()}>Reintentar</button></section>;
 return <section className="panel fellowship-gate"><span className="eyebrow">MAKERS FELLOWSHIP · BY NEXTONE</span>{error&&<p role="alert">{error}<button onClick={()=>void check()}>Reintentar</button></p>}{location?<><h1>Completa tu ubicación para continuar</h1><p>País, región y ciudad nos ayudan a organizar la comunidad. Solo administración puede consultarlos; no usamos tu ubicación GPS.</p><form onSubmit={async e=>{e.preventDefault();setBusy(true);try{await rpc('save_member_location',{p_country:country,p_region:region.trim(),p_city:city.trim()});await updated();await check();}catch(e){setError((e as Error).message);}finally{setBusy(false);}}}><label className="field">País<select required aria-label="País" value={country} onChange={e=>setCountry(e.target.value)}><option value="">Selecciona un país</option>{countries.map(c=><option key={c.code} value={c.code}>{c.name}</option>)}</select></label><label className="field">Región o departamento<input required maxLength={80} value={region} onChange={e=>setRegion(e.target.value)}/></label><label className="field">Ciudad<input required maxLength={80} value={city} onChange={e=>setCity(e.target.value)}/></label><button className="primary" disabled={busy}>Guardar y continuar</button></form></>:!ready?<p role="status">Revisando tus actividades pendientes…</p>:<SatisfactionSurvey key={pending[0].id} survey={pending[0]} remaining={pending.length} done={check}/>}</section>;
}
