import {beforeEach,describe,expect,it,vi} from 'vitest';
import {calendarText} from './calendar';
import {currentDestination,destination} from './navigation';
import {readDraft,writeDraft,removeDraft} from './drafts';
import type {Content} from './types';
describe('enlaces, calendario y borradores',()=>{
 let values:Map<string,string>;
 beforeEach(()=>{values=new Map();vi.stubGlobal('location',{href:'https://nextone.example/?page=event&content=00000000-0000-4000-8000-000000000001',search:'?page=event&content=00000000-0000-4000-8000-000000000001'});vi.stubGlobal('localStorage',{getItem:(k:string)=>values.get(k)??null,setItem:(k:string,v:string)=>values.set(k,v),removeItem:(k:string)=>values.delete(k)});});
 it('conserva un destino válido y descarta secciones arbitrarias',()=>{expect(currentDestination().page).toBe('event');expect(destination('invalid').searchParams.get('page')).toBe('home');expect(destination('home').searchParams.has('content')).toBe(false);});
 it('exporta fechas UTC, texto escapado y aviso sin revelar enlace privado',()=>{const item={id:'uuid',kind:'event',title:'Diseño, taller; Makers\nSegunda línea',starts_at:'2026-10-22T10:00:00-05:00',ends_at:'2026-10-22T11:00:00-05:00',url:'https://private.example'} as Content;const text=calendarText(item);expect(text).toContain('DTSTART:20261022T150000Z');expect(text).toContain('Diseño\\, taller\\; Makers\\nSegunda línea');expect(text).toContain('TRIGGER:-PT30M');expect(text).not.toContain('private.example');for(const line of text.split('\r\n'))expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);});
 it('aísla borradores por usuario y maneja datos corruptos o almacenamiento bloqueado',()=>{const draft={v:1 as const,data:null,tpl:'blank',metadata:{title:'Pendiente'},savedAt:new Date().toISOString()};expect(writeDraft('user-a:post',draft)).toBe(true);expect(readDraft('user-b:post')).toBeNull();expect(readDraft('user-a:post')).toEqual(draft);values.set('broken','{');expect(readDraft('broken')).toBeNull();removeDraft('user-a:post');expect(readDraft('user-a:post')).toBeNull();vi.stubGlobal('localStorage',{setItem:()=>{throw Error('blocked');},getItem:()=>{throw Error('blocked');}});expect(writeDraft('x',draft)).toBe(false);expect(readDraft('x')).toBeNull();});
});
