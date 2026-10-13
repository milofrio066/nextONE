import { Suspense, lazy, useCallback, useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { backend } from './backend';
import type { Kind } from './types';
import InteractivePage from './interactive/InteractivePage';

const PageDesigner = lazy(() => import('./interactive/PageDesigner'));
type Row = { template_id: string; data: unknown };

/* Se coloca bajo la descripción del contenido: muestra la página interactiva y,
   para el responsable, el acceso al diseñador. No altera el contenido original. */
export default function InteractiveSlot({ item, canEdit, userId }: { item: { id: string; kind: Kind; title: string }; canEdit: boolean; userId: string }) {
  const [row, setRow] = useState<Row | null>(null);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);
  const [designing, setDesigning] = useState(false);

  const load = useCallback(async () => {
    if (!backend) { setReady(true); return; }
    setError('');
    const { data, error } = await backend.from('content_pages').select('template_id,data').eq('content_id', item.id).maybeSingle();
    if (error) { setError('No se pudo cargar el diseño interactivo. Comprueba que la migración 004 esté aplicada y vuelve a intentar.'); setReady(true); return; }
    setRow((data as Row | null) ?? null);
    setReady(true);
  }, [item.id]);
  useEffect(() => { setReady(false); setRow(null); void load(); }, [load]);

  if (!ready) return null;
  return (
    <>
      {error && <div role="alert" className="pilot-alert">{error} <button type="button" onClick={() => void load()}>Reintentar</button></div>}
      {row && <InteractivePage key={`${userId}:${item.id}`} data={row.data} pageKey={`${userId}:${item.id}`} />}
      {!error && canEdit && item.kind !== 'update' && (
        <button type="button" className="secondary ix-open" onClick={() => setDesigning(true)}><Sparkles size={16} /> {row ? 'Editar diseño interactivo' : 'Crear diseño interactivo'}</button>
      )}
      {designing && (
        <Suspense fallback={null}>
          <PageDesigner item={item} initial={row} close={() => setDesigning(false)} saved={() => { setDesigning(false); void load(); }} />
        </Suspense>
      )}
    </>
  );
}
