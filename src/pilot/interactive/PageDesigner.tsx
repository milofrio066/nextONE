import { normalizeWebUrl, normalizePageLinks } from '../webLinks';
import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { ArrowDown, ArrowRight, ArrowUp, Check, ChevronDown, Copy, Eye, Pencil, Plus, Trash2, WandSparkles, X } from 'lucide-react';
import {backend, rpc } from '../backend';
import {formSnapshot,readDraft,removeDraft,writeDraft} from '../drafts';
import type {Draft} from '../drafts';
import type { Kind } from '../types';
import InteractivePage, { normalize } from './InteractivePage';
import { pageTemplates, templateById } from './catalog';
import { DEF, DEFS } from './schema';
import type { Block, BlockType, FieldSpec, PageData, Props } from './types';
import { ACCENTS, s, uid } from './util';
import './interactive.css';

const KIND_NAMES: Record<string, string> = { event: 'Eventos', webinar: 'Webinars', resource: 'Aprendizaje', speaker: 'Speakers', case: 'Retos', solution: 'Soluciones', builder: 'Builder case', project: 'Proyectos y semilleros', post: 'Comunidad', update: 'Avances' };
const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));
const blank = (fields: FieldSpec[]): Props => Object.fromEntries(fields.map(f => [f.key, f.type === 'strings' ? [] : f.type === 'list' ? [] : '']));

const toLocal = (iso: unknown) => {
  const d = new Date(typeof iso === 'string' ? iso : '');
  return Number.isNaN(d.getTime()) ? '' : new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

/* Elimina textos vacíos antes de guardar. */
function clean(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(clean).filter(x => !(typeof x === 'string' && !x.trim()));
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, clean(x)]));
  return typeof v === 'string' ? v.trim() : v;
}

function move<T>(list: T[], i: number, d: number) {
  const j = i + d;
  if (j < 0 || j >= list.length) return list;
  const next = [...list];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}

function FieldEditor({ spec, value, onChange }: { spec: FieldSpec; value: unknown; onChange: (v: unknown) => void }) {
  const max = spec.max || 200;
  const help = spec.help ? <small>{spec.help}</small> : null;
  switch (spec.type) {
    case 'text': return <label className="ix-f"><span>{spec.label}</span><input value={s(value, max)} maxLength={max} onChange={e => onChange(e.target.value)} />{help}</label>;
    case 'textarea': return <label className="ix-f"><span>{spec.label}</span><textarea rows={3} value={s(value, max)} maxLength={max} onChange={e => onChange(e.target.value)} />{help}</label>;
    case 'url': return <label className="ix-f"><span>{spec.label}</span><input type="text" aria-label={spec.label} inputMode="url" placeholder="linkedin.com/in/tu-perfil o https://…" value={s(value, 500)} aria-invalid={!!s(value)&&!normalizeWebUrl(value)} onBlur={()=>{const url=normalizeWebUrl(value);if(url)onChange(url);}} onChange={e => onChange(e.target.value)} />{help}</label>;
    case 'number': return <label className="ix-f"><span>{spec.label}</span><input type="number" step="any" value={typeof value === 'number' || typeof value === 'string' ? value : ''} onChange={e => onChange(e.target.value === '' ? '' : Number(e.target.value))} />{help}</label>;
    case 'datetime': return <label className="ix-f"><span>{spec.label}</span><input type="datetime-local" value={toLocal(value)} onChange={e => onChange(e.target.value ? new Date(e.target.value).toISOString() : '')} />{help}</label>;
    case 'select': return <label className="ix-f"><span>{spec.label}</span><select value={s(value)} onChange={e => onChange(e.target.value)}>{(spec.options || []).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>;
    case 'strings': return <label className="ix-f"><span>{spec.label}</span><textarea rows={4} value={(Array.isArray(value) ? value : []).map(x => s(x, 240)).join('\n')} onChange={e => onChange(e.target.value.split('\n').slice(0, 24))} />{help}</label>;
    case 'list': {
      const items = Array.isArray(value) ? (value as Props[]) : [];
      const set = (next: Props[]) => onChange(next);
      return (
        <div className="ix-f ix-list">
          <span>{spec.label} <em>({items.length})</em></span>
          {items.map((it, i) => (
            <fieldset key={i} className="ix-item">
              <legend>{i + 1}</legend>
              <div className="ix-item-tools">
                <button type="button" aria-label="Subir" disabled={i === 0} onClick={() => set(move(items, i, -1))}><ArrowUp size={14} /></button>
                <button type="button" aria-label="Bajar" disabled={i === items.length - 1} onClick={() => set(move(items, i, 1))}><ArrowDown size={14} /></button>
                <button type="button" aria-label="Eliminar elemento" onClick={() => set(items.filter((_, k) => k !== i))}><Trash2 size={14} /></button>
              </div>
              {(spec.fields || []).map(f => <FieldEditor key={f.key} spec={f} value={it?.[f.key]} onChange={v => set(items.map((x, k) => (k === i ? { ...x, [f.key]: v } : x)))} />)}
            </fieldset>
          ))}
          {items.length < (spec.max || 12) && <button type="button" className="ix-btn ghost sm" onClick={() => set([...items, blank(spec.fields || [])])}><Plus size={14} /> Añadir</button>}
        </div>
      );
    }
  }
}

export default function PageDesigner({ item, initial, close, saved, savePage, metadata, draftKey, restoreMetadata }: {
  item: { id: string; kind: Kind; title: string };
  initial: { template_id: string; data: unknown } | null;
  close: () => void;
  saved: () => void;
  savePage?: (template: string, data: PageData) => Promise<void>;
  metadata?: ReactNode;
  draftKey?:string;
  restoreMetadata?:(values:Record<string,string>)=>void;
}) {
  const [data, setData] = useState<PageData | null>(initial ? normalize(initial.data) : null);
  const [tpl, setTpl] = useState(initial?.template_id || 'blank');
  const [open, setOpen] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [pane, setPane] = useState<'edit' | 'view'>('edit');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const busyRef = useRef(busy); busyRef.current = busy;
  const panel = useRef<HTMLDivElement>(null);
  const options = pageTemplates(item.kind);
  const [meta,setMeta]=useState<Record<string,string>>({});
  const [recoverable,setRecoverable]=useState<Draft<PageData>|null>(()=>draftKey?readDraft<PageData>(draftKey):null);
  const [draftWarning,setDraftWarning]=useState(''),[saveNotice,setSaveNotice]=useState('');
  const [draftReady,setDraftReady]=useState(false);const baseline=useRef('');const dirty=useRef(false);const currentClose=useRef(close);
  const metadataForm=()=>panel.current?.querySelector<HTMLFormElement>('.composer-metadata')||null;
  currentClose.current=()=>{if(!dirty.current||confirm('Hay cambios sin publicar. ¿Cerrar y conservar el borrador local para retomarlo?'))close();};
  useEffect(()=>{const m=formSnapshot(metadataForm());setMeta(m);baseline.current=JSON.stringify({data,tpl,meta:m});setDraftReady(true);},[]);
  useEffect(()=>{if(draftReady)setMeta(formSnapshot(metadataForm()));},[metadata]);
  useEffect(()=>{if(!draftReady||!baseline.current)return;dirty.current=JSON.stringify({data,tpl,meta})!==baseline.current;if(draftKey&&dirty.current&&!writeDraft(draftKey,{v:1,data,tpl,metadata:meta,savedAt:new Date().toISOString()}))setDraftWarning('No se pudo guardar el borrador en este navegador. Mantén el editor abierto hasta publicar.');},[data,tpl,meta,draftKey,draftReady]);
  useEffect(()=>{const guard=(e:BeforeUnloadEvent)=>{if(dirty.current){e.preventDefault();e.returnValue='';}};window.addEventListener('beforeunload',guard);return()=>window.removeEventListener('beforeunload',guard);},[]);
  const clearDraft=()=>{dirty.current=false;if(draftKey){removeDraft(draftKey);void rpc('save_editor_draft',{p_key:draftKey,p_snapshot:null}).catch(()=>setDraftWarning('Publicado; no se pudo retirar el borrador remoto.'));}};
  useEffect(()=>{if(!draftKey||!backend)return;let alive=true;void backend.from('editor_drafts').select('snapshot').eq('draft_key',draftKey).maybeSingle().then(({data,error})=>{if(alive&&!error&&data&&!dirty.current&&!readDraft(draftKey))setRecoverable(data.snapshot as Draft<PageData>);});return()=>{alive=false;};},[draftKey]);
  async function saveDraft(){if(!draftKey)return;setBusy(true);setError('');const snapshot:Draft<PageData>={v:1,data,tpl,metadata:formSnapshot(metadataForm()),savedAt:new Date().toISOString()};const local=writeDraft(draftKey,snapshot);try{await rpc('save_editor_draft',{p_key:draftKey,p_snapshot:snapshot});setSaveNotice('Borrador guardado. Puedes continuar.');}catch(e){setError((local?'Guardado en este navegador; no se sincronizó. ':'')+(e as Error).message);}finally{setBusy(false);}}
  function recover(){if(!recoverable)return;setData(recoverable.data?normalize(recoverable.data):null);setTpl(recoverable.tpl);setMeta(recoverable.metadata);restoreMetadata?.(recoverable.metadata);setRecoverable(null);}


  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    panel.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busyRef.current) currentClose.current();
      if (e.key !== 'Tab') return;
      const controls = Array.from(panel.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input, textarea, select, a[href], [tabindex="0"]') || []).filter(el => el.getClientRects().length > 0);
      const first = controls[0], last = controls[controls.length - 1];
      if (!first) { e.preventDefault(); return; }
      if (e.shiftKey && (document.activeElement === first || document.activeElement === panel.current)) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && (document.activeElement === last || document.activeElement === panel.current)) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', key);
    return () => { document.removeEventListener('keydown', key); document.body.style.overflow = previousOverflow; prev?.focus(); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function start(id: string) {
    const t = templateById(id);
    if (!t) { setData({ v: 1, accent: ACCENTS[0][0], blocks: [{ id: uid(), type: 'hero', props: DEF.hero.defaults() }] }); setTpl('blank'); return; }
    setData({ v: 1, accent: t.accent, blocks: clone(t.blocks).map(b => ({ id: uid(), type: b.type, props: b.props })) });
    setTpl(t.id);
  }
  const patch = (fn: (d: PageData) => PageData) => setData(d => (d ? fn(d) : d));
  const setBlocks = (blocks: Block[]) => patch(d => ({ ...d, blocks }));
  const setProp = (id: string, key: string, v: unknown) => patch(d => ({ ...d, blocks: d.blocks.map(b => (b.id === id ? { ...b, props: { ...b.props, [key]: v } } : b)) }));
  function add(type: BlockType) {
    if (!data || data.blocks.length >= 40) return;
    const b: Block = { id: uid(), type, props: DEF[type].defaults() };
    setBlocks([...data.blocks, b]);
    setOpen(b.id);
    setAdding(false);
  }

  // Sin diseño previo, los datos de publicación (vínculos, fechas, título) se guardan igual con un aviso mínimo.
  const fallbackPage = (): PageData => ({ v: 1, accent: ACCENTS[0][0], blocks: [{ id: uid(), type: 'callout', props: { tone: 'info', title: item.title.slice(0, 100) || 'Información', body: 'Este contenido aún no tiene un diseño interactivo. Puedes añadirlo desde Editar.' } }] });
  async function save(keepOpen=false) {
    const source = data ?? (savePage ? fallbackPage() : null);
    if (!source) return;
    let out:PageData;try{out=normalizePageLinks(clean({ ...source, blocks: source.blocks })) as PageData;}catch(e){setError((e as Error).message);return;}
    if (!out.blocks.length) { setError('Agrega al menos un bloque.'); return; }
    if (JSON.stringify(out).length > 55000) { setError('La página es muy grande. Quita algunos bloques o textos.'); return; }
    setBusy(true); setError('');
    try { if(savePage) await savePage(tpl,out); else await rpc('save_content_page', { p_content: item.id, p_template: tpl, p_data: out }); clearDraft();if(!data)setData(normalize(out));baseline.current=JSON.stringify({data:data??out,tpl,meta:formSnapshot(metadataForm())});if(keepOpen){setSaveNotice('Cambios guardados.');setBusy(false);}else saved(); }
    catch (e) { setError((e as { message?: string })?.message || 'No se pudo guardar.'); setBusy(false); }
  }
  async function remove() {
    if (!confirm('¿Quitar el diseño interactivo? El contenido original se conserva.')) return;
    setBusy(true); setError('');
    try { await rpc('delete_content_page', { p_content: item.id }); saved(); }
    catch (e) { setError((e as { message?: string })?.message || 'No se pudo quitar.'); setBusy(false); }
  }

  return (
    <div className="modal-backdrop studio-backdrop">
      <div ref={panel} onChangeCapture={()=>setMeta(formSnapshot(metadataForm()))} tabIndex={-1} className="studio ix-designer" role="dialog" aria-modal="true" aria-label="Diseño interactivo">
        <header className="studio-header">
          <div><span className="eyebrow"><WandSparkles size={14} /> DISEÑO INTERACTIVO · {KIND_NAMES[item.kind] || ''}</span><h2>{item.title}</h2></div>
          <div className="save-actions">{draftKey&&<button type="button" className="secondary" disabled={busy} onClick={()=>void saveDraft()}>Guardar borrador</button>}<button type="button" className="primary" disabled={busy||(!data&&!savePage)} onClick={()=>void save(true)}>Guardar cambios</button></div><button className="icon-button" aria-label="Cerrar" disabled={busy} onClick={()=>currentClose.current()}><X /></button>
        </header>

        {recoverable&&<div className="pilot-notice"><p>Hay un borrador local del {new Date(recoverable.savedAt).toLocaleString('es-CO')}.</p><button type="button" className="secondary" onClick={recover}>Recuperar borrador</button><button type="button" className="secondary" onClick={()=>{if(confirm('¿Descartar este borrador local?')){if(draftKey)removeDraft(draftKey);setRecoverable(null);}}}>Descartar borrador</button></div>}{draftWarning&&<p role="alert">{draftWarning}</p>}
        {metadata&&<details className="composer-settings" open={!data}><summary>Datos de publicación · título, descripción y vinculación</summary>{metadata}</details>}
        {!data ? (
          <div className="studio-body">
            <h3 className="ix-lead">Elige una plantilla interactiva</h3>
            <p className="ix-muted">Todas son editables: cambia textos, orden y bloques cuando quieras.</p>
            <div className="template-grid">
              {options.map((t, i) => (
                <button key={t.id} type="button" className="template-card" onClick={() => start(t.id)}>
                  <div className={`template-art variant-${i % 5}`} style={{ ['--ix' as string]: t.accent }}>
                    <span>{t.tag}</span>
                    <div className="ix-mini">{t.blocks.slice(0, 5).map((b, k) => { const I = DEF[b.type].icon; return <i key={k}><I size={14} /></i>; })}</div>
                  </div>
                  <h3>{t.name}</h3><p>{t.description}</p><small>{t.blocks.length} bloques interactivos <ArrowRight size={14} /></small>
                </button>
              ))}
            </div>
            <button type="button" className="text-button" onClick={() => start('blank')}>Prefiero empezar en blanco <ArrowRight size={15} /></button>
          </div>
        ) : (
          <>
            <div className="ix-toolbar">
              <div className="ix-swatches" role="radiogroup" aria-label="Color de acento">
                {ACCENTS.map(([hex, name]) => <button key={hex} type="button" role="radio" aria-checked={data.accent === hex} aria-label={name} className={data.accent === hex ? 'on' : ''} style={{ background: hex }} onClick={() => patch(d => ({ ...d, accent: hex }))} />)}
              </div>
              <label className="ix-custom-color">Color personalizado<input type="color" aria-label="Color de acento personalizado" value={data.accent} onChange={e=>patch(d=>({...d,accent:e.target.value}))}/></label>
              <div className="ix-pane-switch" role="group" aria-label="Vista">
                <button type="button" className={pane === 'edit' ? 'on' : ''} aria-pressed={pane === 'edit'} onClick={() => setPane('edit')}><Pencil size={14} /> Editar</button>
                <button type="button" className={pane === 'view' ? 'on' : ''} aria-pressed={pane === 'view'} onClick={() => setPane('view')}><Eye size={14} /> Vista previa</button>
              </div>
              <button type="button" className="text-button" onClick={() => { if (confirm('¿Cambiar de plantilla? Perderás los cambios de este diseño.')) setData(null); }}>Cambiar plantilla</button>
            </div>
            <div className={`ix-split ${pane}`}>
              <div className="ix-edit">
                {data.blocks.map((b, i) => {
                  const def = DEF[b.type];
                  const Icon = def.icon;
                  const isOpen = open === b.id;
                  return (
                    <div key={b.id} className={`ix-bcard ${isOpen ? 'open' : ''}`}>
                      <div className="ix-bhead">
                        <button type="button" className="ix-btitle" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : b.id)}><Icon size={18} /><b>{def.label}</b><ChevronDown size={16} /></button>
                        <div className="ix-item-tools">
                          <button type="button" aria-label="Subir bloque" disabled={i === 0} onClick={() => setBlocks(move(data.blocks, i, -1))}><ArrowUp size={14} /></button>
                          <button type="button" aria-label="Bajar bloque" disabled={i === data.blocks.length - 1} onClick={() => setBlocks(move(data.blocks, i, 1))}><ArrowDown size={14} /></button>
                          <button type="button" aria-label="Duplicar bloque" disabled={data.blocks.length >= 40} onClick={() => { const c = { ...clone(b), id: uid() }; setBlocks([...data.blocks.slice(0, i + 1), c, ...data.blocks.slice(i + 1)]); }}><Copy size={14} /></button>
                          <button type="button" aria-label="Eliminar bloque" onClick={() => setBlocks(data.blocks.filter(x => x.id !== b.id))}><Trash2 size={14} /></button>
                        </div>
                      </div>
                      {isOpen && <div className="ix-bbody">{def.fields.map(f => <FieldEditor key={f.key} spec={f} value={b.props[f.key]} onChange={v => setProp(b.id, f.key, v)} />)}</div>}
                    </div>
                  );
                })}
                {adding ? (
                  <div className="ix-palette">
                    <div className="ix-row-head"><h4>Elige un bloque</h4><button type="button" className="icon-button" aria-label="Cerrar paleta" onClick={() => setAdding(false)}><X size={16} /></button></div>
                    <div className="ix-palette-grid">{DEFS.map(d => { const I = d.icon; return <button key={d.type} type="button" onClick={() => add(d.type)}><I size={20} /><b>{d.label}</b><small>{d.desc}</small></button>; })}</div>
                  </div>
                ) : <button type="button" className="ix-btn ghost" disabled={data.blocks.length >= 40} onClick={() => setAdding(true)}><Plus size={16} /> Añadir bloque</button>}
              </div>
              <div className="ix-live"><span className="badge"><Eye size={13} /> VISTA PREVIA INTERACTIVA</span><InteractivePage data={data} pageKey="preview" preview /></div>
            </div>
          </>
        )}

        {saveNotice&&<p className="pilot-notice" role="status">{saveNotice}</p>}{error && <div className="pilot-alert" role="alert">{error}</div>}
        {data && (
          <footer className="studio-footer">
            {initial && !savePage ? <button type="button" className="secondary" disabled={busy} onClick={remove}><Trash2 size={15} /> Quitar diseño</button> : <button type="button" className="secondary" disabled={busy} onClick={()=>currentClose.current()}>Cancelar</button>}
            <button type="button" className="primary" disabled={busy} onClick={()=>void save()}>{busy ? 'Guardando…' : 'Guardar y cerrar'} <Check size={16} /></button>
          </footer>
        )}
      </div>
    </div>
  );
}
