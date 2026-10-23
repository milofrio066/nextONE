import {useState} from 'react';
import {ArrowUpRight,Users,X} from 'lucide-react';
import type {Profile} from './types';
import TiltSurface from './TiltSurface';
const roles={admin:'Administrador',organizer:'Organizador',mentor:'Mentor',member:'Miembro'};
export default function PersonCard({person,index}:{person:Profile;index:number}){
 const [selected,setSelected]=useState(false);const skills=person.skills.split(/[,;]/).map(s=>s.trim()).filter(Boolean);
 return <TiltSurface className={'directory-card person-card tone-'+index%4+(selected?' is-selected':'')}><div className="person-art" aria-hidden="true"><div className="person-ring"/><div className="person-monogram">{person.name.split(' ').filter(Boolean).slice(0,2).map(n=>n[0]).join('').toUpperCase()}</div><span className="person-spark"/></div><div className="person-info"><span className="badge"><Users size={12}/>{roles[person.role]}</span><h3>{person.nickname||person.name}</h3>{person.nickname&&<small>{person.name}</small>}<p className="person-intro">{person.bio||'Este miembro está completando su experiencia.'}</p><div className="skill-tags">{skills.slice(0,3).map((s,i)=><span key={i}>{s}</span>)}{skills.length>3&&<span>+{skills.length-3}</span>}</div><button className="text-button person-open" aria-expanded={selected} aria-controls={'person-'+person.id} onClick={()=>setSelected(!selected)}>{selected?'Cerrar perfil':'Conocer a '+person.name}{selected?<X size={16}/>:<ArrowUpRight size={17}/>}</button>{selected&&<div className="person-full-profile" id={'person-'+person.id}><span className="eyebrow">EXPERIENCIA Y PORTAFOLIO</span><p className="preserve-lines">{person.bio||'Perfil en construcción.'}</p><div className="skill-tags">{skills.map((s,i)=><span key={i}>{s}</span>)}</div></div>}</div></TiltSurface>;
}
