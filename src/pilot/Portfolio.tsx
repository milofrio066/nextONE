import {ExternalLink,Quote,Sparkles} from 'lucide-react';
import type {CSSProperties} from 'react';
import type {Profile} from './types';
import {avatarOf,resolveTheme,splitList,themeVars} from './profileThemes';
const roles={admin:'Administración',organizer:'Organización',mentor:'Mentoría',member:'Miembro'};
export type PortfolioStat={label:string;value:number};
// Todo el contenido se pinta como texto de React; los enlaces solo se aceptan por HTTPS.
export default function Portfolio({person,stats=[],preview=false}:{person:Profile;stats?:PortfolioStat[];preview?:boolean}){
 const t=resolveTheme(person),skills=splitList(person.skills),interests=person.interests||[],first=(person.nickname||person.name).replace(/\p{Extended_Pictographic}/gu,'').trim().split(' ')[0]||person.name.split(' ')[0];
 return <article className={'portfolio tpl-'+t.template+(preview?' is-preview':'')} style={themeVars(t) as CSSProperties} aria-label={'Portafolio de '+person.name}>
  <div className="pf-top"><span>MAKERS · PORTAFOLIO</span><span>{person.cohort?`COHORTE ${person.cohort.toUpperCase()}`:'COMUNIDAD'}</span></div>
  <h2 className="pf-title" aria-hidden="true">{first.toUpperCase()}</h2>
  <div className="pf-hero"><div className="pf-avatar" aria-hidden="true"><span>{avatarOf(person)}</span></div><div><h3>{person.name}</h3><p className="pf-role">{t.headline||roles[person.role]}</p>{person.nickname&&<small>aka {person.nickname}</small>}</div></div>
  {t.quote&&<blockquote className="pf-quote"><Quote size={16}/>{t.quote}</blockquote>}
  {stats.length>0&&<div className="pf-stats">{stats.map(s=><div key={s.label}><strong>{s.value}</strong><small>{s.label}</small></div>)}</div>}
  <div className="pf-grid">
   <section><h4>Qué hago</h4>{skills.length?<ul className="pf-chips">{skills.slice(0,12).map((s,i)=><li key={i}>{s}</li>)}</ul>:<p className="pf-muted">Aún sin habilidades.</p>}</section>
   <section><h4>Intereses</h4>{interests.length?<ul className="pf-chips alt">{interests.slice(0,12).map((s,i)=><li key={i}>{s}</li>)}</ul>:<p className="pf-muted">Aún sin intereses.</p>}</section>
   <section className="pf-wide"><h4>Sobre mí</h4><p className="preserve-lines">{person.bio||'Perfil en construcción.'}</p></section>
   {t.links.length>0&&<section className="pf-wide"><h4>Conecta</h4><div className="pf-links">{t.links.map((l,i)=>preview?<span key={i}><ExternalLink size={14}/>{l.label}</span>:<a key={i} href={l.url} target="_blank" rel="noopener noreferrer"><ExternalLink size={14}/>{l.label}</a>)}</div></section>}
  </div>
  <div className="pf-foot"><Sparkles size={14}/> Diseñando experiencias, conectando personas.</div>
 </article>;
}
