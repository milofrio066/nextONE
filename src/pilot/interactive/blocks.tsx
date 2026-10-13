import { useEffect, useState } from 'react';
import type { ComponentType } from 'react';
import { ArrowLeft, ArrowRight, ArrowUpRight, Check, CheckCircle2, ChevronDown, Info, RotateCcw, Sparkles, Star, TriangleAlert } from 'lucide-react';
import type { BlockType, Props } from './types';
import { arr, fmt, initials, n, s, safeUrl, strs, useCountUp, useInView, useLocal } from './util';

type B = { p: Props; id: string };
const PAL = ['#22d3ee', '#8b5cf6', '#34d399', '#fbbf24', '#fb7185', '#60a5fa', '#f472b6', '#a3e635'];

function Title({ p }: { p: Props }) {
  return s(p.title) ? <h3 className="ix-title">{s(p.title, 120)}</h3> : null;
}
function Note({ p }: { p: Props }) {
  return s(p.note) ? <p className="ix-note"><Info size={15} /> {s(p.note, 400)}</p> : null;
}

/* ── Portada ─────────────────────────────────────────────── */
function Hero({ p }: B) {
  const link = safeUrl(p.url);
  return (
    <header className="ix-hero">
      <i className="ix-orb a" /><i className="ix-orb b" />
      {s(p.eyebrow) && <span className="ix-eyebrow"><Sparkles size={14} /> {s(p.eyebrow, 60)}</span>}
      <h2>{s(p.title, 140)}</h2>
      {s(p.subtitle) && <p>{s(p.subtitle, 300)}</p>}
      {link && s(p.button) && <a className="ix-btn" href={link} target="_blank" rel="noopener noreferrer">{s(p.button, 40)} <ArrowUpRight size={16} /></a>}
    </header>
  );
}

/* ── Cuenta regresiva ────────────────────────────────────── */
function Countdown({ p }: B) {
  const target = new Date(s(p.target, 40)).getTime();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  if (!Number.isFinite(target)) return <div className="ix-card ix-muted">Define la fecha de la cuenta regresiva en el editor.</div>;
  const d = Math.max(0, target - now);
  const parts: [string, number][] = [['Días', Math.floor(d / 864e5)], ['Horas', Math.floor(d / 36e5) % 24], ['Min', Math.floor(d / 6e4) % 60], ['Seg', Math.floor(d / 1e3) % 60]];
  return (
    <div className="ix-card ix-count">
      <h3 className="ix-title">{s(p.label, 100) || 'Cuenta regresiva'}</h3>
      {d === 0 ? <p className="ix-big">¡Es el momento!</p> : (
        <div className="ix-count-grid" role="timer" aria-live="off">
          {parts.map(([l, v]) => <div key={l}><b>{String(v).padStart(2, '0')}</b><span>{l}</span></div>)}
        </div>
      )}
    </div>
  );
}

/* ── Cifras con contador animado ─────────────────────────── */
function Stat({ it, go }: { it: Record<string, unknown>; go: boolean }) {
  const [open, setOpen] = useState(false);
  const val = n(it.value, -1e9, 1e9, 0);
  const v = useCountUp(val, go);
  const note = s(it.note, 240);
  return (
    <button type="button" className={`ix-stat ${open ? 'open' : ''}`} aria-expanded={note ? open : undefined} onClick={() => note && setOpen(!open)}>
      <b>{fmt(Number.isInteger(val) ? Math.round(v) : v)}{s(it.suffix, 8)}</b>
      <span>{s(it.label, 60)}</span>
      {note && <small>{open ? note : 'Toca para ver qué significa'}</small>}
    </button>
  );
}
function Stats({ p }: B) {
  const [ref, seen] = useInView<HTMLDivElement>();
  return (
    <div ref={ref}>
      <Title p={p} />
      <div className="ix-stats">{arr(p.items, 8).map((it, i) => <Stat key={i} it={it} go={seen} />)}</div>
    </div>
  );
}

/* ── Tarjetas que se voltean ─────────────────────────────── */
function Flip({ p }: B) {
  const [on, setOn] = useState<number[]>([]);
  return (
    <>
      <Title p={p} />
      <div className="ix-flip-grid">
        {arr(p.items, 12).map((it, i) => {
          const f = on.includes(i);
          return (
            <button key={i} type="button" className={`ix-flip ${f ? 'on' : ''}`} aria-pressed={f} onClick={() => setOn(f ? on.filter(x => x !== i) : [...on, i])}>
              <span className="ix-face front"><em>{s(it.icon, 4) || '✦'}</em><b>{s(it.front, 120)}</b><small>Toca para voltear</small></span>
              <span className="ix-face back"><span>{s(it.back, 320)}</span></span>
            </button>
          );
        })}
      </div>
    </>
  );
}

/* ── Pestañas ────────────────────────────────────────────── */
function Tabs({ p }: B) {
  const items = arr(p.items, 8);
  const [i, setI] = useState(0);
  const cur = items[Math.min(i, items.length - 1)];
  return (
    <>
      <Title p={p} />
      <div className="ix-tabs" role="tablist">
        {items.map((it, k) => <button key={k} type="button" role="tab" aria-selected={k === i} className={k === i ? 'on' : ''} onClick={() => setI(k)}>{s(it.title, 40)}</button>)}
      </div>
      {cur && <div className="ix-panel ix-fade" role="tabpanel" key={i}>{s(cur.body, 1200)}</div>}
    </>
  );
}

/* ── Preguntas frecuentes ────────────────────────────────── */
function Accordion({ p }: B) {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <>
      <Title p={p} />
      <div className="ix-acc">
        {arr(p.items, 12).map((it, i) => (
          <div key={i} className={`ix-acc-item ${open === i ? 'open' : ''}`}>
            <button type="button" aria-expanded={open === i} onClick={() => setOpen(open === i ? null : i)}>{s(it.q, 160)}<ChevronDown size={18} /></button>
            {open === i && <p className="ix-fade">{s(it.a, 800)}</p>}
          </div>
        ))}
      </div>
    </>
  );
}

/* ── Línea de tiempo ─────────────────────────────────────── */
function Timeline({ p }: B) {
  const items = arr(p.items, 12);
  const [a, setA] = useState(0);
  const pct = items.length > 1 ? (Math.min(a, items.length - 1) / (items.length - 1)) * 100 : 100;
  return (
    <>
      <Title p={p} />
      <ol className="ix-timeline" style={{ ['--p' as string]: `${pct}%` }}>
        {items.map((it, k) => (
          <li key={k} className={k <= a ? 'done' : ''}>
            <button type="button" aria-current={k === a ? 'step' : undefined} onClick={() => setA(k)}>
              <i />
              <span>{s(it.time, 40) && <time>{s(it.time, 40)}</time>}<b>{s(it.title, 120)}</b></span>
            </button>
            {k === a && s(it.body) && <p className="ix-fade">{s(it.body, 500)}</p>}
          </li>
        ))}
      </ol>
    </>
  );
}

/* ── Agenda personalizable ───────────────────────────────── */
function Agenda({ p, id }: B) {
  const items = arr(p.items, 16);
  const [mine, setMine] = useLocal<number[]>(id, []);
  const sel = items.map((_, i) => i).filter(i => mine.includes(i));
  const mins = sel.reduce((a, i) => a + n(items[i].minutes, 0, 600, 0), 0);
  return (
    <>
      <Title p={p} />
      <ul className="ix-agenda">
        {items.map((it, i) => {
          const on = mine.includes(i);
          return (
            <li key={i} className={on ? 'on' : ''}>
              <time>{s(it.time, 30)}</time>
              <div><b>{s(it.title, 120)}</b>{s(it.who) && <small>{s(it.who, 80)}</small>}</div>
              {n(it.minutes, 0, 600, 0) > 0 && <span className="ix-chip">{n(it.minutes, 0, 600, 0)} min</span>}
              <button type="button" aria-pressed={on} aria-label={on ? 'Quitar de mi plan' : 'Añadir a mi plan'} onClick={() => setMine(on ? mine.filter(x => x !== i) : [...mine, i])}><Star size={18} /></button>
            </li>
          );
        })}
      </ul>
      <p className="ix-summary"><Star size={15} /> Tu plan: {sel.length} {sel.length === 1 ? 'sesión' : 'sesiones'}{mins > 0 && ` · ${mins} min`}</p>
    </>
  );
}

/* ── Lista de verificación con progreso ──────────────────── */
function Checklist({ p, id }: B) {
  const items = strs(p.items, 20);
  const [done, setDone] = useLocal<number[]>(id, []);
  const ok = done.filter(i => i < items.length);
  const pct = items.length ? Math.round((ok.length / items.length) * 100) : 0;
  return (
    <div className="ix-check">
      <div className="ix-check-head">
        <svg viewBox="0 0 64 64" className="ix-ring" role="img" aria-label={`${pct}% completado`}>
          <circle cx="32" cy="32" r="26" className="bg" />
          <circle cx="32" cy="32" r="26" className="fg" strokeDasharray={`${pct * 1.6336} 163.36`} transform="rotate(-90 32 32)" />
          <text x="32" y="37" textAnchor="middle">{pct}%</text>
        </svg>
        <div><Title p={p} /><small>{pct === 100 && items.length ? '¡Todo listo! 🎉' : `${ok.length} de ${items.length} completados`}</small></div>
      </div>
      <ul>
        {items.map((t, i) => {
          const on = ok.includes(i);
          return <li key={i}><button type="button" role="checkbox" aria-checked={on} className={on ? 'on' : ''} onClick={() => setDone(on ? ok.filter(x => x !== i) : [...ok, i])}><span>{on && <Check size={14} />}</span>{t}</button></li>;
        })}
      </ul>
    </div>
  );
}

/* ── Quiz ────────────────────────────────────────────────── */
function Quiz({ p }: B) {
  const qs = arr(p.items, 10).map(q => ({ q: s(q.q, 240), opts: strs(q.options, 6), ans: n(q.answer, 1, 6, 1) - 1, exp: s(q.explain, 300) })).filter(q => q.q && q.opts.length > 1);
  const [i, setI] = useState(0);
  const [pick, setPick] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [fin, setFin] = useState(false);
  if (!qs.length) return <div className="ix-card ix-muted">Agrega preguntas con al menos dos opciones.</div>;
  const q = qs[Math.min(i, qs.length - 1)];
  const reset = () => { setI(0); setPick(null); setScore(0); setFin(false); };
  if (fin) {
    const pct = Math.round((score / qs.length) * 100);
    return (
      <div className="ix-card ix-fade ix-quiz-end">
        <Title p={p} />
        <p className="ix-big">{score}/{qs.length}</p>
        <p>{pct >= 80 ? '¡Excelente! Dominas el tema.' : pct >= 50 ? 'Buen avance. Repasa y vuelve a intentarlo.' : 'Es un buen punto de partida. Revisa el contenido e inténtalo de nuevo.'}</p>
        <button type="button" className="ix-btn ghost" onClick={reset}><RotateCcw size={16} /> Reintentar</button>
      </div>
    );
  }
  return (
    <div className="ix-card ix-quiz">
      <Title p={p} />
      <small className="ix-muted">Pregunta {Math.min(i, qs.length - 1) + 1} de {qs.length}</small>
      <h4>{q.q}</h4>
      <div className="ix-opts">
        {q.opts.map((o, k) => (
          <button key={k} type="button" disabled={pick !== null} className={pick === null ? '' : k === q.ans ? 'right' : k === pick ? 'wrong' : ''}
            onClick={() => { setPick(k); if (k === q.ans) setScore(score + 1); }}>{o}</button>
        ))}
      </div>
      {pick !== null && (
        <div className="ix-fade">
          <p className="ix-feedback">{pick === q.ans ? '✅ ¡Correcto!' : '❌ Casi.'} {q.exp}</p>
          <button type="button" className="ix-btn" onClick={() => { if (i + 1 >= qs.length) setFin(true); else { setI(i + 1); setPick(null); } }}>{i + 1 >= qs.length ? 'Ver resultado' : 'Siguiente'} <ArrowRight size={16} /></button>
        </div>
      )}
    </div>
  );
}

/* ── Elige tu camino ─────────────────────────────────────── */
function Chooser({ p }: B) {
  const items = arr(p.items, 6);
  const [k, setK] = useState<number | null>(null);
  return (
    <>
      <Title p={p} />
      <div className="ix-choose">
        {items.map((it, i) => <button key={i} type="button" aria-pressed={k === i} className={k === i ? 'on' : ''} onClick={() => setK(i)}>{s(it.label, 60)}</button>)}
      </div>
      {k !== null && items[k] && <div className="ix-panel ix-fade" key={k}><b>{s(items[k].label, 60)}</b><p>{s(items[k].result, 500)}</p></div>}
    </>
  );
}

/* ── Paso a paso ─────────────────────────────────────────── */
function Steps({ p }: B) {
  const items = arr(p.items, 10);
  const [i, setI] = useState(0);
  if (!items.length) return null;
  const k = Math.min(i, items.length - 1);
  return (
    <>
      <Title p={p} />
      <div className="ix-steps">
        <div className="ix-progress"><i style={{ width: `${((k + 1) / items.length) * 100}%` }} /></div>
        <div className="ix-step ix-fade" key={k}>
          <span className="ix-chip">Paso {k + 1} de {items.length}</span>
          <h4>{s(items[k].title, 100)}</h4>
          <p>{s(items[k].body, 500)}</p>
        </div>
        <div className="ix-step-nav">
          <button type="button" className="ix-btn ghost" disabled={k === 0} onClick={() => setI(k - 1)}><ArrowLeft size={16} /> Anterior</button>
          <div className="ix-dots">{items.map((_, d) => <button key={d} type="button" aria-label={`Ir al paso ${d + 1}`} className={d === k ? 'on' : ''} onClick={() => setI(d)} />)}</div>
          <button type="button" className="ix-btn" disabled={k === items.length - 1} onClick={() => setI(k + 1)}>Siguiente <ArrowRight size={16} /></button>
        </div>
      </div>
    </>
  );
}

/* ── Barras ──────────────────────────────────────────────── */
function Bars({ p }: B) {
  const [ref, seen] = useInView<HTMLDivElement>();
  const [sorted, setSorted] = useState(false);
  const items = arr(p.items, 12).map(i => ({ l: s(i.label, 50), v: n(i.value, 0, 1e9, 0) }));
  const rows = sorted ? [...items].sort((a, b) => b.v - a.v) : items;
  const max = Math.max(1, ...rows.map(r => r.v));
  const unit = s(p.unit, 10);
  return (
    <div ref={ref}>
      <div className="ix-row-head"><Title p={p} /><button type="button" className="ix-btn ghost sm" aria-pressed={sorted} onClick={() => setSorted(!sorted)}>{sorted ? 'Orden original' : 'Ordenar por valor'}</button></div>
      <ul className="ix-bars">
        {rows.map(r => (
          <li key={r.l} tabIndex={0} title={`${r.l}: ${fmt(r.v)}${unit}`}>
            <span>{r.l}</span>
            <div className="ix-bar"><i style={{ width: seen ? `${(r.v / max) * 100}%` : '0%' }} /></div>
            <b>{fmt(r.v)}{unit}</b>
          </li>
        ))}
      </ul>
      <Note p={p} />
    </div>
  );
}

/* ── Dona ────────────────────────────────────────────────── */
function Donut({ p }: B) {
  const items = arr(p.items, 8).map(i => ({ l: s(i.label, 40), v: n(i.value, 0, 1e9, 0) }));
  const total = items.reduce((a, b) => a + b.v, 0) || 1;
  const [h, setH] = useState<number | null>(null);
  const C = 2 * Math.PI * 60;
  let off = 0;
  const cur = h !== null ? items[h] : null;
  return (
    <>
      <Title p={p} />
      <div className="ix-donut-wrap">
        <svg viewBox="0 0 160 160" className="ix-donut" aria-hidden="true">
          <circle cx="80" cy="80" r="60" fill="none" className="track" strokeWidth="18" />
          {items.map((it, i) => {
            const len = (it.v / total) * C;
            const el = <circle key={i} cx="80" cy="80" r="60" fill="none" stroke={PAL[i % PAL.length]} strokeWidth={h === i ? 24 : 18}
              strokeDasharray={`${Math.max(0, len - 1.5)} ${C}`} strokeDashoffset={-off} transform="rotate(-90 80 80)" onMouseEnter={() => setH(i)} onMouseLeave={() => setH(null)} />;
            off += len;
            return el;
          })}
          <text x="80" y="78" textAnchor="middle" className="big">{cur ? `${Math.round((cur.v / total) * 100)}%` : fmt(total)}</text>
          <text x="80" y="96" textAnchor="middle" className="sm">{cur ? cur.l.slice(0, 18) : 'Total'}</text>
        </svg>
        <ul className="ix-legend">
          {items.map((it, i) => (
            <li key={i}><button type="button" className={h === i ? 'on' : ''} onMouseEnter={() => setH(i)} onMouseLeave={() => setH(null)} onFocus={() => setH(i)} onBlur={() => setH(null)}>
              <i style={{ background: PAL[i % PAL.length] }} />{it.l}<b>{Math.round((it.v / total) * 100)}%</b></button></li>
          ))}
        </ul>
      </div>
      <Note p={p} />
    </>
  );
}

/* ── Radar ───────────────────────────────────────────────── */
function Radar({ p }: B) {
  const items = arr(p.items, 8).map(i => ({ l: s(i.label, 24), v: n(i.value, 0, 100, 0) }));
  const [h, setH] = useState<number | null>(null);
  const m = items.length;
  if (m < 3) return <div className="ix-card ix-muted">El radar necesita al menos 3 ejes.</div>;
  const pt = (i: number, r: number): [number, number] => { const a = -Math.PI / 2 + (i * 2 * Math.PI) / m; return [100 + Math.cos(a) * r, 100 + Math.sin(a) * r]; };
  const ring = (f: number) => items.map((_, i) => pt(i, 70 * f).join(',')).join(' ');
  const poly = items.map((it, i) => pt(i, (it.v / 100) * 70).join(',')).join(' ');
  return (
    <>
      <Title p={p} />
      <div className="ix-donut-wrap">
        <svg viewBox="0 0 200 200" className="ix-radar" aria-hidden="true">
          {[0.25, 0.5, 0.75, 1].map(f => <polygon key={f} points={ring(f)} className="grid" />)}
          {items.map((_, i) => <line key={i} x1="100" y1="100" x2={pt(i, 70)[0]} y2={pt(i, 70)[1]} className="grid" />)}
          <polygon points={poly} className="area" />
          {items.map((it, i) => <circle key={i} cx={pt(i, (it.v / 100) * 70)[0]} cy={pt(i, (it.v / 100) * 70)[1]} r={h === i ? 6 : 3.5} className="dot" />)}
          {items.map((it, i) => <text key={i} x={pt(i, 88)[0]} y={pt(i, 88)[1] + 3} textAnchor="middle" className={h === i ? 'lab on' : 'lab'}>{it.l}</text>)}
        </svg>
        <ul className="ix-legend">
          {items.map((it, i) => (
            <li key={i}><button type="button" className={h === i ? 'on' : ''} onMouseEnter={() => setH(i)} onMouseLeave={() => setH(null)} onFocus={() => setH(i)} onBlur={() => setH(null)}>{it.l}<b>{it.v}</b></button></li>
          ))}
        </ul>
      </div>
      <Note p={p} />
    </>
  );
}

/* ── Personas / roles ────────────────────────────────────── */
function People({ p }: B) {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <>
      <Title p={p} />
      <div className="ix-people">
        {arr(p.items, 12).map((it, i) => {
          const tags = s(it.tags, 200).split(',').map(t => t.trim()).filter(Boolean).slice(0, 6);
          return (
            <button key={i} type="button" aria-expanded={open === i} className={`ix-person ${open === i ? 'open' : ''}`} onClick={() => setOpen(open === i ? null : i)}>
              <span className="ix-avatar" style={{ background: `linear-gradient(135deg,${PAL[i % PAL.length]},${PAL[(i + 3) % PAL.length]})` }}>{initials(s(it.name, 60))}</span>
              <b>{s(it.name, 60)}</b><small>{s(it.role, 80)}</small>
              {open === i && <span className="ix-fade ix-person-more">{s(it.bio, 400)}{tags.length > 0 && <span className="ix-tags">{tags.map(t => <em key={t}>{t}</em>)}</span>}</span>}
            </button>
          );
        })}
      </div>
    </>
  );
}

/* ── Tablero kanban ──────────────────────────────────────── */
function Kanban({ p, id }: B) {
  const cols = arr(p.columns, 4).map(c => ({ t: s(c.title, 40), cards: strs(c.cards, 12) }));
  const [saved, setSaved] = useLocal<string[][] | null>(id, null);
  const [text, setText] = useState('');
  const board: string[][] = saved && saved.length === cols.length ? saved : cols.map(c => c.cards);
  const move = (c: number, k: number, d: number) => {
    const next = board.map(x => [...x]);
    const [card] = next[c].splice(k, 1);
    next[c + d].push(card);
    setSaved(next);
  };
  if (!cols.length) return null;
  return (
    <>
      <div className="ix-row-head"><Title p={p} /><button type="button" className="ix-btn ghost sm" onClick={() => setSaved(null)}><RotateCcw size={14} /> Reiniciar</button></div>
      <div className="ix-kanban" style={{ ['--cols' as string]: cols.length }}>
        {cols.map((c, ci) => (
          <div key={ci} className="ix-col"><h4>{c.t}<span>{board[ci]?.length ?? 0}</span></h4>
            {(board[ci] || []).map((card, k) => (
              <div key={`${card}-${k}`} className="ix-kcard"><span>{card}</span>
                <div>
                  {ci > 0 && <button type="button" aria-label="Mover a la columna anterior" onClick={() => move(ci, k, -1)}><ArrowLeft size={14} /></button>}
                  {ci < cols.length - 1 && <button type="button" aria-label="Mover a la siguiente columna" onClick={() => move(ci, k, 1)}><ArrowRight size={14} /></button>}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
      <form className="ix-add" onSubmit={e => { e.preventDefault(); const t = text.trim().slice(0, 120); if (!t) return; const next = board.map(x => [...x]); next[0].push(t); setSaved(next); setText(''); }}>
        <input value={text} maxLength={120} onChange={e => setText(e.target.value)} placeholder={`Añade una tarjeta a «${cols[0].t}»`} aria-label="Nueva tarjeta" />
        <button className="ix-btn sm">Añadir</button>
      </form>
    </>
  );
}

/* ── Comparador A / B ────────────────────────────────────── */
function Compare({ p }: B) {
  const [mode, setMode] = useState<'a' | 'b' | 'both'>('both');
  const la = s(p.labelA, 30) || 'Antes', lb = s(p.labelB, 30) || 'Después';
  const rows = arr(p.rows, 12);
  return (
    <>
      <Title p={p} />
      <div className="ix-tabs" role="group" aria-label="Modo de comparación">
        <button type="button" className={mode === 'a' ? 'on' : ''} aria-pressed={mode === 'a'} onClick={() => setMode('a')}>{la}</button>
        <button type="button" className={mode === 'b' ? 'on' : ''} aria-pressed={mode === 'b'} onClick={() => setMode('b')}>{lb}</button>
        <button type="button" className={mode === 'both' ? 'on' : ''} aria-pressed={mode === 'both'} onClick={() => setMode('both')}>Ver ambos</button>
      </div>
      <div className="ix-compare ix-fade" key={mode}>
        {rows.map((r, i) => (
          <div key={i} className={`ix-cmp-row ${mode}`}>
            <b>{s(r.label, 60)}</b>
            {mode !== 'b' && <span className="a"><small>{la}</small>{s(r.a, 160)}</span>}
            {mode !== 'a' && <span className="b"><small>{lb}</small>{s(r.b, 160)}</span>}
          </div>
        ))}
      </div>
    </>
  );
}

/* ── Calculadora con deslizador ──────────────────────────── */
function Slider({ p }: B) {
  const min = n(p.min, -1e6, 1e6, 0);
  const max = Math.max(min + 1, n(p.max, -1e6, 1e6, 100));
  const step = n(p.step, 0.0001, 1e6, 1);
  const [v, setV] = useState(n(p.value, min, max, min));
  const val = Math.min(max, Math.max(min, v));
  const res = val * n(p.factor, -1e6, 1e6, 1);
  return (
    <div className="ix-card ix-slider">
      <Title p={p} />
      <label><span>{s(p.label, 80) || 'Valor'}: <b>{fmt(val)} {s(p.unit, 16)}</b></span>
        <input type="range" min={min} max={max} step={step} value={val} onChange={e => setV(Number(e.target.value))} />
      </label>
      <div className="ix-result"><small>{s(p.resultLabel, 80) || 'Resultado'}</small><b>{fmt(res)} <span>{s(p.resultUnit, 16)}</span></b></div>
      <Note p={p} />
    </div>
  );
}

/* ── Enlaces ─────────────────────────────────────────────── */
function Links({ p }: B) {
  const items = arr(p.items, 10).map(i => ({ label: s(i.label, 80), desc: s(i.desc, 140), url: safeUrl(i.url) })).filter(i => i.url && i.label);
  return (
    <>
      <Title p={p} />
      <div className="ix-links">
        {items.map((it, i) => <a key={i} href={it.url} target="_blank" rel="noopener noreferrer"><span><b>{it.label}</b>{it.desc && <small>{it.desc}</small>}</span><ArrowUpRight size={18} /></a>)}
      </div>
    </>
  );
}

/* ── Aviso ───────────────────────────────────────────────── */
function Callout({ p }: B) {
  const tone = ['info', 'success', 'warn'].includes(s(p.tone)) ? s(p.tone) : 'info';
  const Icon = tone === 'success' ? CheckCircle2 : tone === 'warn' ? TriangleAlert : Info;
  return <aside className={`ix-callout ${tone}`}><Icon size={22} /><div>{s(p.title) && <b>{s(p.title, 100)}</b>}<p>{s(p.body, 600)}</p></div></aside>;
}

/* ── Llamado a la acción ─────────────────────────────────── */
function Cta({ p }: B) {
  const link = safeUrl(p.url);
  return (
    <div className="ix-cta">
      <h3>{s(p.title, 120)}</h3>
      {s(p.body) && <p>{s(p.body, 300)}</p>}
      {link && s(p.button) && <a className="ix-btn" href={link} target="_blank" rel="noopener noreferrer">{s(p.button, 40)} <ArrowUpRight size={16} /></a>}
    </div>
  );
}

const RENDER: Record<BlockType, ComponentType<B>> = {
  hero: Hero, countdown: Countdown, stats: Stats, flip: Flip, tabs: Tabs, accordion: Accordion, timeline: Timeline,
  agenda: Agenda, checklist: Checklist, quiz: Quiz, chooser: Chooser, steps: Steps, bars: Bars, donut: Donut,
  radar: Radar, people: People, kanban: Kanban, compare: Compare, slider: Slider, links: Links, callout: Callout, cta: Cta
};

export function BlockView({ type, id, props }: { type: BlockType; id: string; props: Props }) {
  const R = RENDER[type];
  return R ? <R p={props} id={id} /> : null;
}
