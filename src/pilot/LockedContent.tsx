import {useEffect,useState} from 'react';
import {CalendarDays,Lock,Tag} from 'lucide-react';
import {rpc} from './backend';
import {storyExcerpt} from './storyModel';
import './access.css';
type Locked={id:string;kind:string;title:string;excerpt:string;starts_at:string|null;ends_at:string|null;topics:string[]|null;access_scope:'makers'|'peers';cover_alt:string;created_at:string};
const KIND:Record<string,string>={event:'Evento',webinar:'Webinar',resource:'Aprendizaje',speaker:'Speaker',case:'Reto',project:'Proyecto',post:'Publicación',builder:'Builder case',update:'Avance',solution:'Solución'};
/** Contenido que el otro grupo puede conocer pero no abrir (vista bloqueada, 025). */
export default function LockedContent({kind,compact=false}:{kind?:string;compact?:boolean}){
 const [items,setItems]=useState<Locked[]>([]);
 useEffect(()=>{let alive=true;void rpc<Locked[]>('locked_catalog').then(d=>alive&&setItems(d)).catch(()=>{});return()=>{alive=false;};},[]);
 const shown=items.filter(c=>!kind||c.kind===kind||(kind==='event'&&c.kind==='webinar'));
 if(!shown.length)return null;
 const forMakers=shown[0].access_scope==='makers';
 return <section className="locked-section"><header><Lock size={20} aria-hidden="true"/><div><h2>{forMakers?'También está pasando entre makers':'También está pasando entre peers'}</h2><p>{forMakers?'Estas actividades son del programa Makers. Puedes ver de qué tratan; el acceso está reservado a makers.':'Estas actividades son de Peers Community Pass. Puedes ver de qué tratan; el acceso está reservado a peers.'}</p></div></header>
  <div className="locked-grid">{shown.slice(0,compact?3:24).map(c=>{let text='';try{text=storyExcerpt(c.excerpt);}catch{text=c.excerpt;}return <article className="locked-card" key={c.id} aria-label={`${c.title}, contenido bloqueado`}>
   <div className="locked-cover" aria-hidden="true"/><span className="locked-badge"><Lock size={13} aria-hidden="true"/>Solo {c.access_scope==='makers'?'makers':'peers'}</span>
   <h3>{c.title}</h3>{text&&<p>{text.slice(0,220)}</p>}
   <div className="locked-meta"><span>{KIND[c.kind]||c.kind}</span>{c.starts_at&&<span><CalendarDays size={14} aria-hidden="true"/>{new Date(c.starts_at).toLocaleString('es-CO',{dateStyle:'medium',timeStyle:'short'})}</span>}{!!c.topics?.length&&<span><Tag size={14} aria-hidden="true"/>{c.topics.slice(0,3).join(', ')}</span>}</div>
   <button type="button" className="secondary" disabled>Acceso reservado a {c.access_scope==='makers'?'makers':'peers'}</button></article>;})}</div></section>;
}
