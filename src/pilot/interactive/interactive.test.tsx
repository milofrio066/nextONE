import { describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import { CATALOG, pageTemplates } from './catalog';
import { DEF, DEFS } from './schema';
import InteractivePage, { normalize } from './InteractivePage';

const KINDS = ['event', 'webinar', 'resource', 'speaker', 'case', 'solution', 'project', 'post'] as const;

describe('plantillas interactivas', () => {
  it('hay exactamente 5 plantillas por sección y los ids son únicos', () => {
    for (const k of KINDS) expect(pageTemplates(k)).toHaveLength(5);
    expect(new Set(CATALOG.map(t => t.id)).size).toBe(CATALOG.length);
    expect(CATALOG.every(t => /^[a-z0-9-]{1,60}$/.test(t.id))).toBe(true);
  });
  it('todas usan bloques conocidos y se renderizan sin errores', () => {
    for (const t of CATALOG) {
      expect(t.blocks.length).toBeGreaterThan(2);
      const data = { v: 1, accent: t.accent, blocks: t.blocks.map((b, i) => ({ id: 'b' + i, type: b.type, props: b.props })) };
      expect(normalize(data).blocks).toHaveLength(t.blocks.length);
      expect(renderToString(<InteractivePage data={data} pageKey={t.id} />).length).toBeGreaterThan(200);
    }
  });
  it('cada bloque disponible tiene valores por defecto que se renderizan', () => {
    for (const d of DEFS) {
      const html = renderToString(<InteractivePage data={{ v: 1, blocks: [{ id: 'x', type: d.type, props: DEF[d.type].defaults() }] }} pageKey="t" />);
      expect(html).toContain(`ix-t-${d.type}`);
    }
  });
  it('datos malformados o maliciosos no rompen ni inyectan enlaces', () => {
    const evil = { v: 1, blocks: [{ id: 'e', type: 'cta', props: { title: '<img src=x onerror=alert(1)>', button: 'Ir', url: 'javascript:alert(1)' } }, { id: 'f', type: 'constructor', props: {} }, null, 7, { id: 'g', type: 'links', props: { items: [{ label: 'x', url: 'http://inseguro.com' }, 'texto', null] } }, { id: 'h', type: 'bars', props: { items: 'no' } }] };
    const html = renderToString(<InteractivePage data={evil} pageKey="t" />);
    expect(html).not.toContain('javascript:');
    expect(html).not.toContain('href="http://');
    expect(html).not.toContain('<img');
    expect(normalize(evil).blocks.map(b => b.type)).toEqual(['cta', 'links', 'bars']);
    expect(() => normalize(null)).not.toThrow();
    expect(normalize('x').blocks).toEqual([]);
  });
});
