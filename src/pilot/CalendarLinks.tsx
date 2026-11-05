import {CalendarPlus,Download} from 'lucide-react';
import './peers.css';
import type {Content} from './types';
import {downloadCalendar,googleCalendarUrl,outlookCalendarUrl} from './calendar';
/** Añadir una actividad al calendario personal: Google, Outlook o archivo .ics (Apple Calendar y otros). */
export default function CalendarLinks({item,highlight=false}:{item:Content;highlight?:boolean}){
 if(!item.starts_at||!item.ends_at)return null;
 return <div className={'calendar-links'+(highlight?' is-highlight':'')} role="group" aria-label="Añadir a mi calendario">
  <span className="calendar-links-title"><CalendarPlus size={18} aria-hidden="true"/>{highlight?'¡Listo! Guárdalo en tu calendario':'Añadir a mi calendario'}</span>
  <div className="calendar-links-actions"><a className="secondary" href={googleCalendarUrl(item)} target="_blank" rel="noopener noreferrer">Google Calendar</a><a className="secondary" href={outlookCalendarUrl(item)} target="_blank" rel="noopener noreferrer">Outlook</a><a className="secondary" href={outlookCalendarUrl(item,true)} target="_blank" rel="noopener noreferrer">Outlook (trabajo)</a><button type="button" className="secondary" onClick={()=>downloadCalendar(item)}><Download size={15} aria-hidden="true"/> Apple / .ics</button></div>
  {highlight&&<small>Incluye un recordatorio 30 minutos antes en el archivo .ics. El enlace de acceso sigue estando en la plataforma.</small>}</div>;
}
