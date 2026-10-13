import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { urlAllowed } from '../types';

/* Los datos vienen de la base de datos: se tratan siempre como no confiables. */
export const s = (v: unknown, max = 400) => (typeof v === 'string' ? v.slice(0, max) : typeof v === 'number' ? String(v) : '');
export const n = (v: unknown, min: number, max: number, def: number) => {
  const x = typeof v === 'number' ? v : parseFloat(String(v));
  return Number.isFinite(x) ? Math.min(max, Math.max(min, x)) : def;
};
export const arr = (v: unknown, max = 24): Record<string, unknown>[] =>
  Array.isArray(v) ? (v.slice(0, max).filter(x => x && typeof x === 'object') as Record<string, unknown>[]) : [];
export const strs = (v: unknown, max = 24): string[] =>
  Array.isArray(v) ? v.slice(0, max).map(x => s(x, 240).trim()).filter(Boolean) : [];
export const safeUrl = (v: unknown) => {
  const u = s(v, 500).trim();
  return u && urlAllowed(u) ? u : '';
};
export const uid = () => Math.random().toString(36).slice(2, 10);
export const fmt = (x: number) => x.toLocaleString('es-CO', { maximumFractionDigits: 1 });
export const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]?.toUpperCase()).join('') || '·';

export const ACCENTS: [string, string][] = [
  ['#22d3ee', 'Cian'], ['#8b5cf6', 'Violeta'], ['#34d399', 'Esmeralda'],
  ['#fbbf24', 'Ámbar'], ['#fb7185', 'Rosa'], ['#60a5fa', 'Azul']
];
export const accentOf = (v: unknown) => (typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v) ? v : ACCENTS[0][0]);

/* Contexto de página: clave de almacenamiento local y modo vista previa (sin persistir). */
export const PageCtx = createContext<{ key: string; preview: boolean }>({ key: 'preview', preview: true });

export function useLocal<T>(id: string, init: T): [T, (v: T) => void] {
  const { key, preview } = useContext(PageCtx);
  const k = `nextone-ix:${key}:${id}`;
  const [v, setV] = useState<T>(() => {
    if (preview) return init;
    try { const raw = localStorage.getItem(k); if (!raw) return init; const value: unknown = JSON.parse(raw);
      if (Array.isArray(init)) return Array.isArray(value) && value.every(x => typeof x === 'number' && Number.isInteger(x) && x >= 0) ? value as T : init;
      if (init === null) return Array.isArray(value) && value.length <= 4 && value.every(col => Array.isArray(col) && col.length <= 100 && col.every(card => typeof card === 'string')) ? value as T : init;
      if (init && typeof init === 'object') return value && typeof value === 'object' && !Array.isArray(value) ? value as T : init;
      return typeof value === typeof init ? value as T : init; } catch { return init; }
  });
  const set = useCallback((x: T) => {
    setV(x);
    if (preview) return;
    try { localStorage.setItem(k, JSON.stringify(x)); } catch { /* almacenamiento no disponible */ }
  }, [k, preview]);
  return [v, set];
}

export function useInView<T extends Element>() {
  const ref = useRef<T>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || seen) return;
    if (typeof IntersectionObserver === 'undefined') { setSeen(true); return; }
    const o = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setSeen(true); o.disconnect(); } }, { threshold: 0.2 });
    o.observe(el);
    return () => o.disconnect();
  }, [seen]);
  return [ref, seen] as const;
}

export function useCountUp(target: number, active: boolean, ms = 1100) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!active) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) { setV(target); return; }
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / ms);
      setV(target * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, active, ms]);
  return v;
}
