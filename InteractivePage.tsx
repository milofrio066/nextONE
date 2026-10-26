import { contrastInk } from '../webLinks';
import { BlockView } from './blocks';
import { DEF } from './schema';
import type { Block, BlockType, PageData } from './types';
import { PageCtx, accentOf } from './util';
import './interactive.css';

/* Normaliza datos externos: descarta bloques desconocidos o malformados. */
export function normalize(data: unknown): PageData {
  const d = (data && typeof data === 'object' ? data : {}) as Partial<PageData>;
  const blocks = (Array.isArray(d.blocks) ? d.blocks : []).slice(0, 40).flatMap((b, i): Block[] => {
    if (!b || typeof b !== 'object') return [];
    const x = b as Partial<Block>;
    if (typeof x.type !== 'string' || !Object.prototype.hasOwnProperty.call(DEF, x.type)) return [];
    return [{ id: typeof x.id === 'string' && x.id ? x.id.slice(0, 24) : `b${i}`, type: x.type as BlockType, props: x.props && typeof x.props === 'object' ? x.props : {} }];
  });
  return { v: 1, accent: accentOf(d.accent), blocks };
}

export default function InteractivePage({ data, pageKey, preview = false }: { data: unknown; pageKey: string; preview?: boolean }) {
  const page = normalize(data);
  return (
    <PageCtx.Provider value={{ key: pageKey, preview }}>
      <div className="ix-page" style={{ ['--ix' as string]: page.accent, ['--ix-ink' as string]:contrastInk(page.accent||'#22d3ee') }}>
        {page.blocks.some(b => ['stats','bars','donut','radar'].includes(b.type)) && <p className="ix-note">Cifras configuradas por el autor del contenido. Consulta Indicadores para las métricas de actividad de nextONE.</p>}
        {page.blocks.map(b => (
          <section key={b.id} className={`ix-block ix-t-${b.type}`}>
            <BlockView type={b.type} id={b.id} props={b.props} />
          </section>
        ))}
      </div>
    </PageCtx.Provider>
  );
}
