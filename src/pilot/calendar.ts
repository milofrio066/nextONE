import type {Content} from './types';
import {destination} from './navigation';
const escape=(s:string)=>s.replace(/\\/g,'\\\\').replace(/\r?\n/g,'\\n').replace(/;/g,'\\;').replace(/,/g,'\\,');
const utc=(s:string)=>new Date(s).toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');
export function calendarText(item:Content){
 if(!item.starts_at||!item.ends_at)throw new Error('La actividad necesita inicio y fin.');
 const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//nextONE//Makers//ES','BEGIN:VEVENT',`UID:${item.id}@nextone`,`DTSTAMP:${utc(new Date().toISOString())}`,`DTSTART:${utc(item.starts_at)}`,`DTEND:${utc(item.ends_at)}`,`SUMMARY:${escape(item.title)}`,`URL:${destination(item.kind,item.id)}`,'BEGIN:VALARM','TRIGGER:-PT30M','ACTION:DISPLAY','DESCRIPTION:Tu actividad de Makers comienza en 30 minutos','END:VALARM','END:VEVENT','END:VCALENDAR'];
 // RFC 5545: fold at 75 UTF-8 octets without splitting a character.
 return lines.map(line=>{let out='',bytes=0;for(const c of line){const size=new TextEncoder().encode(c).length;if(bytes+size>75){out+='\r\n ';bytes=1;}out+=c;bytes+=size;}return out;}).join('\r\n')+'\r\n';
}
export function downloadCalendar(item:Content){const url=URL.createObjectURL(new Blob([calendarText(item)],{type:'text/calendar;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='nextone-actividad.ics';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
