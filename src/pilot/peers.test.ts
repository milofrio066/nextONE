import {describe,expect,it,vi} from 'vitest';
import {suggestGroups,tally,toggle,similarity,intentsTable,type IntentRow} from './intentModel';
import {blankQuestion,pollIssues,resultRows,type PollDraft} from './pollModel';
import {googleCalendarUrl,outlookCalendarUrl} from './calendar';
import {AVATAR_PRESETS,DEFAULT_AVATAR,legacyAvatar,needsAvatarV4,normalizeAvatar} from './profileThemes';
import type {Content} from './types';
const row=(name:string,goals:string[],challenges:string[],extra:Partial<IntentRow>={}):IntentRow=>({user_id:name,name,access_tier:'subscriber',cohort:null,skills:'',interests:[],goals,challenges,formats:[],availability:[],stage:'',note:'',segment:null,updated_at:null,...extra});
describe('seguimiento y grupos por necesidad',()=>{
 it('toggle respeta el máximo de opciones',()=>{expect(toggle(['a','b','c','d'],'e')).toEqual(['a','b','c','d']);expect(toggle(['a'],'a')).toEqual([]);});
 it('cuenta y ordena las opciones más elegidas',()=>{expect(tally([row('A',['empleo'],[]),row('B',['empleo','ingles'],[])],'goals')[0]).toMatchObject({key:'empleo',count:2,label:'Conseguir empleo'});});
 it('agrupa por retos comunes, deja fuera a quien no respondió y no deja grupos casi vacíos',()=>{
  const rows=[...Array.from({length:9},(_,i)=>row('V'+i,['emprender'],['validar_idea'])),...Array.from({length:9},(_,i)=>row('E'+i,['empleo'],['buscar_empleo'])),row('Sin respuesta',[],[]),row('Suelto',['ingles'],['tiempo'])];
  const groups=suggestGroups(rows,10);
  expect(groups.flatMap(g=>g.members).map(m=>m.name)).not.toContain('Sin respuesta');
  expect(groups.flatMap(g=>g.members)).toHaveLength(19);
  expect(groups.every(g=>g.members.length>=3)).toBe(true);
  const v=groups.find(g=>g.members.some(m=>m.name==='V0'))!;expect(v.members.filter(m=>m.name.startsWith('V'))).toHaveLength(9);
  expect(similarity(rows[0],rows[1])).toBeGreaterThan(similarity(rows[0],rows[10]));
 });
 it('exporta etiquetas legibles',()=>{expect(intentsTable([row('Ana',['empleo'],['tiempo'],{segment:'Empleo'})])[1]).toEqual(expect.arrayContaining(['Ana','Peer','Empleo','Conseguir empleo','Falta de tiempo']));});
});
describe('encuestas',()=>{
 const draft=(q:PollDraft['questions']):PollDraft=>({id:null,title:'Encuesta',description:'',audience:'community',segment:'',anonymous:true,show_results:true,status:'open',closes_at:'',questions:q});
 it('detecta enunciados vacíos y opciones incompletas o repetidas',()=>{
  expect(pollIssues(draft([{...blankQuestion('single',1)}]))).toEqual(['La pregunta 1 necesita un enunciado.','Completa al menos dos opciones en la pregunta 1.']);
  expect(pollIssues(draft([{id:'a',type:'multiple',prompt:'¿Cuál?',options:['Sí','Sí']}]))).toEqual(['La pregunta 1 tiene opciones repetidas.']);
  expect(pollIssues(draft([{id:'a',type:'scale',prompt:'¿Qué tan útil?'}]))).toEqual([]);
 });
 it('no repite identificadores al añadir preguntas',()=>{expect(blankQuestion('text',2,['p2','p3']).id).toBe('p4');});
 it('convierte resultados en filas para gráficos',()=>{
  expect(resultRows({id:'a',type:'single',prompt:'x',options:['A','B']},{id:'a',type:'single',counts:[3,1]})).toEqual([{label:'A',value:3},{label:'B',value:1}]);
  expect(resultRows({id:'n',type:'scale',prompt:'x'},{id:'n',type:'scale',counts:[0,0,1,0,2],average:4.3}).map(r=>r.value)).toEqual([0,0,1,0,2]);
 });
});
describe('calendario',()=>{
 vi.stubGlobal('location',new URL('https://makers.example/?page=home'));
 const item={id:'e1',kind:'event',title:'Mentoría: valida tu idea & más',starts_at:'2026-11-20T23:00:00Z',ends_at:'2026-11-21T00:00:00Z'} as Content;
 it('arma enlaces de Google y Outlook con horario en UTC y sin datos personales',()=>{
  const g=new URL(googleCalendarUrl(item));expect(g.origin).toBe('https://calendar.google.com');expect(g.searchParams.get('dates')).toBe('20261120T230000Z/20261121T000000Z');expect(g.searchParams.get('text')).toBe(item.title);
  const o=new URL(outlookCalendarUrl(item,true));expect(o.host).toBe('outlook.office.com');expect(o.searchParams.get('startdt')).toBe('2026-11-20T23:00:00.000Z');
 });
 it('exige inicio y fin',()=>{expect(()=>googleCalendarUrl({...item,ends_at:null})).toThrow(/inicio y fin/);});
});
describe('avatar v4',()=>{
 it('los estilos de partida solo usan valores del catálogo',()=>{for(const p of Object.values(AVATAR_PRESETS))expect(normalizeAvatar(p.avatar)).toEqual(p.avatar);});
 it('el equivalente anterior es aceptado por la ruta v3 y detecta cuándo hace falta v4',()=>{
  const a={...DEFAULT_AVATAR,hair:'locs' as const,gear:'hijab' as const,face:'heart' as const,body:'curvy' as const,makeup:'full' as const};
  expect(legacyAvatar(a)).toMatchObject({hair:'braids',gear:'none',face:'oval',body:'soft',makeup:'none'});
  expect(needsAvatarV4(a)).toBe(true);expect(needsAvatarV4(DEFAULT_AVATAR)).toBe(false);
 });
});
