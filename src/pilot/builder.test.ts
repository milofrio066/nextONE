import {describe,expect,it} from 'vitest';
import {templates} from './templates';
import type {Kind} from './types';
describe('plantillas de Builder case (Makers)',()=>{
 const list=templates('builder');
 it('ofrece 6 estructuras guiadas y 5 composiciones interactivas',()=>{expect(list.filter(t=>t.id.startsWith('builder-interactive')).length).toBe(5);expect(list.filter(t=>/^builder-\d+$/.test(t.id)).length).toBe(6);});
 it('el builder case completo cubre problema, cliente, validación, MVP, métricas y plan',()=>{const full=list[0];expect(full.name).toBe('Builder case completo');expect(full.steps.length).toBe(12);for(const k of ['Problema y contexto','Cliente y usuario','Validación y evidencia','Prototipo o MVP','Métricas de éxito','Plan de 30-60-90 días'])expect(full.steps).toContain(k);});
 it('cada sección trae una pregunta guía y los títulos no arrastran el texto guía',()=>{for(const t of list.filter(x=>/^builder-\d+$/.test(x.id))){for(const s of t.steps)expect(s).not.toContain('~');expect(t.body).not.toContain('~');expect(t.body).not.toMatch(/Describe .* aquí/);}});
 it('las plantillas anteriores conservan su texto genérico',()=>{const ev=templates('event')[0];expect(ev.body).toMatch(/Describe .* aquí\./);for(const k of ['event','case','solution','project','post'] as Kind[])expect(templates(k).length).toBeGreaterThan(0);});
});
