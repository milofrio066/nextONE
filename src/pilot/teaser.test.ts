import {describe,expect,it} from 'vitest';
import {ACCESS_OPTIONS,accessOption,accessValue,allowedFor} from './accessModel';
import {deskCounts,personStage,type RosterPerson} from './eventDeskModel';
describe('acceso: quién ve y quién entra',()=>{
 it('cada opción se traduce a audiencia y vista bloqueada',()=>{
  expect(accessOption('makers_teaser')).toEqual({value:'makers_teaser',scope:'makers',teaser:true});
  expect(accessOption('community')).toMatchObject({scope:'community',teaser:false});
  expect(accessOption('raro')).toMatchObject({scope:'makers',teaser:false});
 });
 it('recupera la opción desde el contenido guardado',()=>{
  expect(accessValue({access_scope:'peers',teaser:true})).toBe('peers_teaser');
  expect(accessValue({access_scope:'community',teaser:true})).toBe('community');
  expect(accessValue({})).toBe('makers');
 });
 it('un miembro solo publica donde puede entrar; el equipo publica en todas',()=>{
  expect(ACCESS_OPTIONS.filter(o=>allowedFor(o.value,'subscriber',false)).map(o=>o.value)).toEqual(['community','peers','peers_teaser']);
  expect(ACCESS_OPTIONS.filter(o=>allowedFor(o.value,'maker',false)).map(o=>o.value)).toEqual(['community','makers','makers_teaser']);
  expect(ACCESS_OPTIONS.every(o=>allowedFor(o.value,'maker',true))).toBe(true);
 });
});
describe('panel del organizador',()=>{
 const p=(status:RosterPerson['status'],confirmed:boolean,extra:Partial<RosterPerson>={}):RosterPerson=>({id:Math.random().toString(),name:'A',access_tier:'maker',status,created_at:'2026-11-01',confirmed_at:confirmed?'2026-11-02':null,joined_at:null,surveyed:false,...extra});
 it('la asistencia pesa más que la confirmación',()=>{expect(personStage(p('attended',false))).toBe('attended');expect(personStage(p('registered',true))).toBe('confirmed');expect(personStage(p('cancelled',true))).toBe('cancelled');});
 it('cuenta etapas sin sumar cancelados a los activos',()=>{
  const c=deskCounts([p('registered',false),p('registered',true,{joined_at:'x'}),p('attended',true,{surveyed:true,joined_at:'x'}),p('cancelled',false)]);
  expect(c).toMatchObject({active:3,pending:1,confirmed:1,attended:1,cancelled:1,joined:2,surveyed:1});
 });
});
