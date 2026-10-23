import {useId} from 'react';
import type {Profile} from './types';
import {resolveTheme} from './profileThemes';
export default function ProfileAvatar({person,compact=false}:{person:Profile;compact?:boolean}){
 const t=resolveTheme(person),a=t.avatar,id=useId().replace(/:/g,'');
 return <span className={`maker-avatar avatar-${a.motion}${compact?' compact':''}`} role="img" aria-label={`Avatar personalizable de ${person.name}`}>
 <svg viewBox="0 0 200 240" aria-hidden="true"><defs><linearGradient id={'outfit-'+id} x2="1" y2="1"><stop stopColor={a.shirtColor}/><stop offset="1" stopColor="#172135"/></linearGradient></defs>
 <ellipse className="avatar-shadow" cx="100" cy="222" rx="49" ry="8" fill={t.accent} opacity=".2"/>
 <g className="avatar-body"><path d="M76 177h20l-2 37H75zM104 177h20l3 37h-22z" fill="#263149"/><path d="M72 209h25v13H65q-4-8 7-13M103 209h24q12 5 8 13h-32z" fill="#f3f4ff"/>
 <path d="M61 119q39-24 78 0l-10 66H71z" fill={'url(#outfit-'+id+')'}/>
 {a.outfit==='hoodie'&&<><path d="M76 113q24 39 48 0" fill="none" stroke="#ffffff60" strokeWidth="9"/><path d="M87 143h26v19H87z" fill="#ffffff14"/><path d="M92 133v18m16-18v18" stroke="#fff" strokeWidth="2"/></>}
 {a.outfit==='jacket'&&<><path d="M99 121v64M80 117l15 30-15-7m40-23-15 30 15-7" stroke="#ffffff90" strokeWidth="3" fill="none"/><circle cx="105" cy="156" r="2" fill="#fff"/></>}
 {a.outfit==='tee'&&<path d="M84 117q16 17 32 0" fill="none" stroke="#fff8" strokeWidth="4"/>}
 <path d="M62 121q-14 12-16 51l14 4 17-46" fill={a.shirtColor}/><circle cx="51" cy="177" r="9" fill={a.skin}/>
 <g className="avatar-arm"><path d="M137 121q18 15 19 50l-15 4-18-45" fill={a.shirtColor}/><circle cx="150" cy="178" r="9" fill={a.skin}/></g>
 <path d="M89 100h22v22q-11 12-22 0" fill={a.skin}/>
 <g className="avatar-head">{a.hair==='long'&&<path d="M61 60q4-39 39-40 39 0 40 47l9 60-35-9-54 4z" fill={a.hairColor}/>}
 <ellipse cx="63" cy="73" rx="8" ry="12" fill={a.skin}/><ellipse cx="137" cy="73" rx="8" ry="12" fill={a.skin}/><path d="M65 53q1-31 35-31 35 0 35 31v30q-3 32-35 33-32-1-35-33z" fill={a.skin}/>
 {a.hair==='crop'&&<path d="M64 60V43q5-28 39-24 31 0 34 29l-4 17-13-26-44 8-10 17" fill={a.hairColor}/>}
 {a.hair==='wave'&&<path d="M63 63q-13-38 13-42-3-12 14-9 28-15 41 7 23 8 7 47l-11-24q-36 13-49-2z" fill={a.hairColor}/>}
 {a.hair==='curls'&&<g fill={a.hairColor}>{[65,80,95,110,125,137].map((x,i)=><circle key={x} cx={x} cy={34-(i>1&&i<4?10:0)} r="16"/>)}</g>}
 {a.hair==='long'&&<path d="M63 57q-3-35 40-36 39 5 35 42-20-6-38-29-15 19-37 23" fill={a.hairColor}/>}
 <path d="M78 64l10-2m24 0 10 2" stroke={a.hairColor} strokeWidth="3" strokeLinecap="round"/>
 {a.expression==='happy'?<path d="M78 77q5-8 10 0m24 0q5-8 10 0" stroke="#251f2e" strokeWidth="3" fill="none"/>:<g fill="#251f2e"><ellipse className="avatar-eye" cx="83" cy="76" rx="3" ry="4"/><ellipse className="avatar-eye" cx="117" cy="76" rx="3" ry="4"/></g>}
 <path d="M100 77l-3 10h6" fill="none" stroke="#0003" strokeWidth="2"/>
 {a.expression==='calm'?<path d="M91 97h18" stroke="#542f39" strokeWidth="3" strokeLinecap="round"/>:<path d="M89 94q11 14 22 0" fill="#fff" stroke="#542f39" strokeWidth="2"/>}
 {a.accessory==='glasses'&&<g fill="none" stroke="#171522" strokeWidth="4"><rect x="71" y="68" width="24" height="17" rx="7"/><rect x="105" y="68" width="24" height="17" rx="7"/><path d="M95 75h10"/></g>}
 {a.accessory==='headphones'&&<g fill={t.accent} stroke="#272035" strokeWidth="4"><path d="M58 65q-4-58 42-58 46 0 42 58" fill="none" strokeWidth="8"/><rect x="52" y="59" width="14" height="31" rx="6"/><rect x="134" y="59" width="14" height="31" rx="6"/></g>}
 {a.accessory==='cap'&&<path d="M61 46q0-36 40-36 39 0 39 36H61m38 0h53q11 7-4 12h-49z" fill={a.shirtColor} stroke="#ffffff30" strokeWidth="2"/>}
 </g></g></svg></span>;
}
