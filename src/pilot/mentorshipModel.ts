import type {Content,Profile} from './types';
export type MentorshipInfo={content_id:string;audience:'makers'|'makers_subscribers';modality:'zoom'|'meet';has_recording:boolean;mentor:Profile;seats_left:number;materials:number;mine:{status:'registered'|'attended';confirmed_at:string|null}|null;can_manage:boolean};
export type Session={item:Content;info:MentorshipInfo};
export type Step='ended'|'join'|'confirm'|'confirmed'|'register'|'full';
export type Filters={topic:string;range:''|'7'|'30';availability:''|'open'};
const JOIN_WINDOW=5*60000;
export const audienceLabel={makers:'Solo makers',makers_subscribers:'Makers + suscriptores'};
export const modalityLabel={zoom:'Zoom',meet:'Google Meet'};
export const when=(iso:string)=>new Intl.DateTimeFormat('es-CO',{dateStyle:'long',timeStyle:'short'}).format(new Date(iso));
export const timeZone=(iso:string)=>new Intl.DateTimeFormat('es-CO',{timeZoneName:'long'}).formatToParts(new Date(iso)).find(p=>p.type==='timeZoneName')?.value||'';
export const monthLabel=(iso:string)=>new Intl.DateTimeFormat('es-CO',{month:'long',year:'numeric'}).format(new Date(iso));
export function duration(start:string,end:string){const minutes=Math.round((new Date(end).getTime()-new Date(start).getTime())/60000),h=Math.floor(minutes/60),m=minutes%60;return [h&&`${h} h`,m&&`${m} min`].filter(Boolean).join(' ')||'0 min';}
export const seatsLabel=(seats:number)=>seats===0?'Sin cupos':seats===1?'1 cupo disponible':`${seats} cupos disponibles`;
export const specialty=(mentor:Profile)=>mentor.skills.split(',').map(s=>s.trim()).filter(Boolean).slice(0,2).join(' · ')||'Mentor de la comunidad';
export const sessionsFrom=(items:Content[],infos:MentorshipInfo[])=>infos.flatMap(info=>{const item=items.find(c=>c.id===info.content_id);return item?.starts_at&&item.ends_at?[{item,info}]:[];}).sort((a,b)=>a.item.starts_at!.localeCompare(b.item.starts_at!));
export const isPast=({item}:Session,now:number)=>new Date(item.ends_at!).getTime()<=now;
export const upcoming=(list:Session[],now:number)=>list.filter(s=>!isPast(s,now));
export const past=(list:Session[],now:number)=>list.filter(s=>isPast(s,now)).reverse();
export const mine=(list:Session[])=>list.filter(s=>s.info.mine);
export const topics=(list:Session[])=>[...new Set(list.flatMap(s=>s.item.topics||[]))].sort();
/** La próxima sesión con la que la persona aún puede hacer algo. */
export const nextSession=(list:Session[],now:number)=>upcoming(list,now).filter(s=>s.item.published).find(s=>s.info.mine||s.info.seats_left>0)||null;
export function filterSessions(list:Session[],{topic,range,availability}:Filters,now:number){
 const limit=range?now+Number(range)*864e5:Infinity;
 return list.filter(s=>(!topic||s.item.topics?.includes(topic))&&new Date(s.item.starts_at!).getTime()<=limit&&(!availability||s.info.seats_left>0||!!s.info.mine));
}
export function byMonth(list:Session[]){const groups=new Map<string,Session[]>();for(const s of list){const key=monthLabel(s.item.starts_at!);groups.set(key,[...(groups.get(key)||[]),s]);}return [...groups];}
export function step({item,info}:Session,now:number):Step{
 if(new Date(item.ends_at!).getTime()<=now)return 'ended';
 if(info.mine){if(now>=new Date(item.starts_at!).getTime()-JOIN_WINDOW)return 'join';return info.mine.confirmed_at?'confirmed':'confirm';}
 return info.seats_left>0?'register':'full';
}
