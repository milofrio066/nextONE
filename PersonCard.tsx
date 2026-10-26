import {createPortal} from 'react-dom';
import ProfileAvatar from './ProfileAvatar';
import {useEffect,useRef,useState} from 'react';
import {ArrowUpRight,X} from 'lucide-react';
import type {CSSProperties} from 'react';
import type {Profile} from './types';
import TiltSurface from './TiltSurface';
import Portfolio,{type PortfolioStat} from './Portfolio';
import {resolveTheme,splitList,themeVars} from './profileThemes';
const roles={admin:'Administración',organizer:'Organización',mentor:'Mentoría',member:'Miembro'};
export default function PersonCard({person,index,stats=[]}:{person:Profile;index:number;stats?:PortfolioStat[]}){
 const [open,setOpen]=useState(false),back=useRef<HTMLButtonElement>(null),trigger=useRef<HTMLButtonElement>(null);
 const t=resolveTheme(person),skills=splitList(person.skills);
 useEffect(()=>{if(!open)return;const prev=document.body.style.overflow;document.body.style.overflow='hidden';back.current?.focus();const key=(e:KeyboardEvent)=>{if(e.key==='Escape')setOpen(false);if(e.key==='Tab'){const all=Array.from(back.current?.closest('.pf-modal')?.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],input,select,textarea')||[]).filter(el=>el.getClientRects().length);const first=all[0],last=all[all.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}};document.addEventListener('keydown',key);return()=>{document.removeEventListener('keydown',key);document.body.style.overflow=prev;trigger.current?.focus();};},[open]);
 return <><TiltSurface className={'directory-card person-card pf-card tpl-'+t.template+' tone-'+index%4} style={themeVars(t) as CSSProperties}>
  <button ref={trigger} className="pf-card-hit" aria-haspopup="dialog" onClick={()=>setOpen(true)} aria-label={'Ver portafolio de '+person.name}>
   <span className="pf-card-top"><span className="pf-chip">{roles[person.role]}</span>{person.cohort&&<span className="pf-chip ghost">{person.cohort}</span>}</span>
   <span className="pf-card-name">{(person.nickname||person.name).slice(0,28)}</span>
   <span className="pf-card-row"><ProfileAvatar person={person} compact/><span className="pf-card-meta"><strong>{person.name}</strong><small>{t.headline||skills.slice(0,2).join(' · ')||'Perfil en construcción'}</small></span></span>
   <span className="pf-card-cta">Ver portafolio <ArrowUpRight size={16}/></span>
  </button></TiltSurface>
  {open&&createPortal(<div className="modal-backdrop pf-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setOpen(false);}}><div className="pf-modal" role="dialog" aria-modal="true" aria-label={'Portafolio de '+person.name}><button ref={back} className="icon-button pf-close" onClick={()=>setOpen(false)} aria-label="Cerrar portafolio"><X/></button><Portfolio person={person} stats={stats}/></div></div>,document.body)}</>;
}
