import ProfileAvatar from './ProfileAvatar';
import {ExternalLink,Quote,Sparkles} from 'lucide-react';
import type {CSSProperties} from 'react';
import type {Profile} from './types';
import {graphemes,resolveTheme,splitList,themeVars,sectionStyle} from './profileThemes';
const roles={admin:'Administración',organizer:'Organización',mentor:'Mentoría',member:'Miembro'};
export type PortfolioStat={label:string;value:number};
// Todo el contenido se pinta como texto de React; los enlaces solo se aceptan por HTTPS.
export default function Portfolio({person,stats=[],preview=false}:{person:Profile;stats?:PortfolioStat[];preview?:boolean}){
 const t=resolveTheme(person),skills=splitList(person.skills),interests=person.interests||[],first=graphemes(person.nickname||person.name).filter(g=>!/[\p{Extended_Pictographic}\p{Regional_Indicator}]/u.test(g)).join('').trim().split(' ')[0]||person.name.split(' ')[0];
 return <article className={'portfolio title-'+t.titleStyle+' tpl-'+t.template+(preview?' is-preview':'')} style={themeVars(t) as CSSProperties} aria-label={'Portafolio de '+person.name}>
  <div className="pf-top"><span>MAKERS · PORTAFOLIO</span><span>{person.cohort?`COHORTE ${person.cohort.toUpperCase()}`:'COMUNIDAD'}</span></div>
  <h2 className="pf-title" aria-hidden="true">{first.toUpperCase()}</h2>
  <div className="pf-hero" style={sectionStyle(t,'hero') as CSSProperties}><ProfileAvatar person={person}/><div><h3>{person.name}</h3><p className="pf-role">{t.headline||roles[person.role]}</p>{person.nickname&&<small>aka {person.nickname}</small>}</div></div>
  {t.quote&&<blockquote className="pf-quote"><Quote size={16}/>{t.quote}</blockquote>}
  {stats.length>0&&<div className="pf-stats">{stats.map(s=><div key={s.label}><strong>{s.value}</strong><small>{s.label}</small></div>)}</div>}
  <div className="pf-grid">
   <section style={sectionStyle(t,'skills') as CSSProperties}><h4>Qué hago</h4>{skills.length?<ul className="pf-chips">{skills.slice(0,12).map((s,i)=><li key={i}>{s}</li>)}</ul>:<p className="pf-muted">Aún sin habilidades.</p>}</section>
   <section style={sectionStyle(t,'interests') as CSSProperties}><h4>Intereses</h4>{interests.length?<ul className="pf-chips alt">{interests.slice(0,12).map((s,i)=><li key={i}>{s}</li>)}</ul>:<p className="pf-muted">Aún sin intereses.</p>}</section>
   <section className="pf-wide" style={sectionStyle(t,'about') as CSSProperties}><h4>Sobre mí</h4><p className="preserve-lines">{person.bio||'Perfil en construcción.'}</p></section>
   {t.links.length>0&&<section className="pf-wide" style={sectionStyle(t,'links') as CSSProperties}><h4>Conecta</h4><div className="pf-links">{t.links.map((l,i)=><a key={i} href={l.url} target="_blank" rel="noopener noreferrer" aria-label={l.label+' · abrir en otra pestaña'}><ExternalLink size={14}/>{l.label}</a>)}</div></section>}
  </div>
  <div className="pf-foot"><Sparkles size={14}/> Diseñando experiencias, conectando personas.</div>
 </article>;
}
