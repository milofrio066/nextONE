import {describe,it,expect} from 'vitest';
import {byMonth,duration,filterSessions,nextSession,past,seatsLabel,sessionsFrom,specialty,step,upcoming,type MentorshipInfo,type Session} from './mentorshipModel';
import type {Content,Profile} from './types';
const now=Date.parse('2026-11-10T15:00:00Z'),hour=36e5;
const at=(hours:number)=>new Date(now+hours*hour).toISOString();
const item=(id:string,hours:number,extra:Partial<Content>={})=>({id,kind:'event',title:id,body:'',published:true,starts_at:at(hours),ends_at:at(hours+1),topics:['Ventas'],...extra}) as Content;
const info=(id:string,extra:Partial<MentorshipInfo>={})=>({content_id:id,audience:'makers',modality:'zoom',has_recording:false,mentor:{skills:'Ventas, Producto, Datos'} as Profile,seats_left:3,materials:0,mine:null,can_manage:false,...extra}) as MentorshipInfo;
const session=(id:string,hours:number,extra:Partial<MentorshipInfo>={},content:Partial<Content>={}):Session=>({item:item(id,hours,content),info:info(id,extra)});
describe('Botón principal según el estado de la mentoría',()=>{
 it('avanza de inscribirse a confirmar y entrar',()=>{
  expect(step(session('a',24),now)).toBe('register');
  expect(step(session('a',24,{mine:{status:'registered',confirmed_at:null}}),now)).toBe('confirm');
  expect(step(session('a',24,{mine:{status:'registered',confirmed_at:at(-1)}}),now)).toBe('confirmed');
  expect(step(session('a',.05,{mine:{status:'registered',confirmed_at:at(-1)}}),now)).toBe('join');
 });
 it('permite entrar a quien se inscribió sin confirmar cuando abre el acceso',()=>expect(step(session('a',.05,{mine:{status:'registered',confirmed_at:null}}),now)).toBe('join'));
 it('no ofrece inscripción sin cupos ni después de la sesión',()=>{
  expect(step(session('a',24,{seats_left:0}),now)).toBe('full');
  expect(step(session('a',-3,{mine:{status:'attended',confirmed_at:null}}),now)).toBe('ended');
 });
});
describe('Listados de mentorías',()=>{
 const list=[session('pasada',-48),session('llena',2,{seats_left:0}),session('abierta',24,{},{topics:['Datos']}),session('lejana',24*40)];
 it('separa próximas y anteriores',()=>{
  expect(upcoming(list,now).map(s=>s.item.id)).toEqual(['llena','abierta','lejana']);
  expect(past(list,now).map(s=>s.item.id)).toEqual(['pasada']);
 });
 it('destaca la próxima disponible, o la propia aunque esté llena',()=>{
  expect(nextSession(list,now)?.item.id).toBe('abierta');
  expect(nextSession([session('llena',2,{seats_left:0,mine:{status:'registered',confirmed_at:null}}),session('abierta',24)],now)?.item.id).toBe('llena');
  expect(nextSession([session('borrador',2,{},{published:false})],now)).toBeNull();
 });
 it('filtra por tema, fecha y disponibilidad',()=>{
  const open=upcoming(list,now);
  expect(filterSessions(open,{topic:'Datos',range:'',availability:''},now).map(s=>s.item.id)).toEqual(['abierta']);
  expect(filterSessions(open,{topic:'',range:'7',availability:''},now).map(s=>s.item.id)).toEqual(['llena','abierta']);
  expect(filterSessions(open,{topic:'',range:'',availability:'open'},now).map(s=>s.item.id)).toEqual(['abierta','lejana']);
 });
 it('agrupa el calendario por mes',()=>expect(byMonth(upcoming(list,now)).map(([,group])=>group.length)).toEqual([2,1]));
 it('ignora sesiones sin contenido visible o sin fechas',()=>{
  expect(sessionsFrom([item('a',2),item('b',1,{starts_at:null})],[info('a'),info('b'),info('c')]).map(s=>s.item.id)).toEqual(['a']);
 });
});
describe('Etiquetas',()=>{
 it('resume duración, cupos y especialidad',()=>{
  expect(duration(at(0),at(1.5))).toBe('1 h 30 min');expect(duration(at(0),at(.5))).toBe('30 min');
  expect(seatsLabel(0)).toBe('Sin cupos');expect(seatsLabel(1)).toBe('1 cupo disponible');
  expect(specialty({skills:'Ventas, Producto, Datos'} as Profile)).toBe('Ventas · Producto');expect(specialty({skills:''} as Profile)).toBe('Mentor de la comunidad');
 });
});
