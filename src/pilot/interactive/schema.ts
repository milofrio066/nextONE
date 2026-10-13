import { AlignLeft, BarChart3, CalendarClock, CheckSquare, Columns3, Compass, CopyPlus, FlipHorizontal2, GitCompare, HelpCircle, Layers, Link2, ListOrdered, Megaphone, MousePointerClick, PieChart, Radar, SlidersHorizontal, Sparkles, Timer, Users, Workflow } from 'lucide-react';
import type { BlockDef, BlockType, FieldSpec } from './types';

const t = (key: string, label: string, max = 120): FieldSpec => ({ key, label, type: 'text', max });
const ta = (key: string, label: string, max = 500): FieldSpec => ({ key, label, type: 'textarea', max });
const u = (key: string, label: string): FieldSpec => ({ key, label, type: 'url', help: 'Solo enlaces HTTPS' });
const nm = (key: string, label: string): FieldSpec => ({ key, label, type: 'number' });
const ss = (key: string, label: string, help = 'Una por línea'): FieldSpec => ({ key, label, type: 'strings', help });
const list = (key: string, label: string, fields: FieldSpec[], max = 12): FieldSpec => ({ key, label, type: 'list', fields, max });
const title = t('title', 'Título de la sección', 120);
const note = ta('note', 'Cómo leer esto (explicación opcional)', 300);

export const DEFS: BlockDef[] = [
  { type: 'hero', label: 'Portada', desc: 'Título grande con fondo animado y botón', icon: Sparkles,
    fields: [t('eyebrow', 'Etiqueta superior', 60), t('title', 'Título', 140), ta('subtitle', 'Subtítulo', 300), t('button', 'Texto del botón', 40), u('url', 'Enlace del botón')],
    defaults: () => ({ eyebrow: 'nextONE', title: 'Título de tu página', subtitle: 'Cuéntale a la comunidad de qué trata.', button: '', url: '' }) },
  { type: 'countdown', label: 'Cuenta regresiva', desc: 'Días, horas y minutos hasta una fecha', icon: Timer,
    fields: [t('label', 'Texto', 100), { key: 'target', label: 'Fecha y hora', type: 'datetime' }],
    defaults: () => ({ label: 'Empieza en', target: new Date(Date.now() + 7 * 864e5).toISOString() }) },
  { type: 'stats', label: 'Cifras animadas', desc: 'Números que cuentan al aparecer, con explicación', icon: BarChart3,
    fields: [title, list('items', 'Cifras', [t('value', 'Valor', 12), t('suffix', 'Sufijo (%, +, k)', 8), t('label', 'Etiqueta', 60), t('note', 'Explicación al tocar', 240)], 6)],
    defaults: () => ({ title: '', items: [{ value: '120', suffix: '+', label: 'Personas', note: 'Explica qué significa esta cifra.' }, { value: '8', suffix: '', label: 'Equipos', note: '' }, { value: '95', suffix: '%', label: 'Satisfacción', note: '' }] }) },
  { type: 'flip', label: 'Tarjetas giratorias', desc: 'Frente y reverso: ideas, datos o consejos', icon: FlipHorizontal2,
    fields: [title, list('items', 'Tarjetas', [t('icon', 'Emoji', 4), t('front', 'Frente', 120), ta('back', 'Reverso', 320)], 10)],
    defaults: () => ({ title: 'Ideas clave', items: [{ icon: '💡', front: 'Primera idea', back: 'Explícala aquí.' }, { icon: '🚀', front: 'Segunda idea', back: 'Explícala aquí.' }, { icon: '🤝', front: 'Tercera idea', back: 'Explícala aquí.' }] }) },
  { type: 'tabs', label: 'Pestañas', desc: 'Organiza información en secciones', icon: Columns3,
    fields: [title, list('items', 'Pestañas', [t('title', 'Nombre', 40), ta('body', 'Contenido', 1200)], 8)],
    defaults: () => ({ title: '', items: [{ title: 'Resumen', body: 'Escribe aquí.' }, { title: 'Detalles', body: 'Escribe aquí.' }] }) },
  { type: 'accordion', label: 'Preguntas frecuentes', desc: 'Respuestas que se despliegan', icon: HelpCircle,
    fields: [title, list('items', 'Preguntas', [t('q', 'Pregunta', 160), ta('a', 'Respuesta', 800)], 12)],
    defaults: () => ({ title: 'Preguntas frecuentes', items: [{ q: '¿Pregunta uno?', a: 'Respuesta.' }, { q: '¿Pregunta dos?', a: 'Respuesta.' }] }) },
  { type: 'timeline', label: 'Línea de tiempo', desc: 'Fases o hitos que se recorren con un toque', icon: Workflow,
    fields: [title, list('items', 'Hitos', [t('time', 'Fecha o etapa', 40), t('title', 'Título', 120), ta('body', 'Detalle', 500)], 12)],
    defaults: () => ({ title: 'Recorrido', items: [{ time: 'Semana 1', title: 'Inicio', body: 'Describe esta etapa.' }, { time: 'Semana 2', title: 'Desarrollo', body: 'Describe esta etapa.' }, { time: 'Semana 3', title: 'Cierre', body: 'Describe esta etapa.' }] }) },
  { type: 'agenda', label: 'Agenda personalizable', desc: 'Cada persona marca las sesiones que quiere', icon: CalendarClock,
    fields: [title, list('items', 'Sesiones', [t('time', 'Hora', 30), t('title', 'Título', 120), t('who', 'Quién', 80), nm('minutes', 'Minutos')], 16)],
    defaults: () => ({ title: 'Agenda', items: [{ time: '6:00 pm', title: 'Bienvenida', who: '', minutes: 15 }, { time: '6:15 pm', title: 'Sesión principal', who: 'Nombre', minutes: 40 }, { time: '7:00 pm', title: 'Preguntas y networking', who: '', minutes: 30 }] }) },
  { type: 'checklist', label: 'Lista con progreso', desc: 'Casillas con anillo de avance (se guarda en el navegador)', icon: CheckSquare,
    fields: [title, ss('items', 'Elementos')],
    defaults: () => ({ title: 'Antes de empezar', items: ['Primer elemento', 'Segundo elemento', 'Tercer elemento'] }) },
  { type: 'quiz', label: 'Quiz', desc: 'Preguntas con retroalimentación y puntaje', icon: MousePointerClick,
    fields: [title, list('items', 'Preguntas', [t('q', 'Pregunta', 240), ss('options', 'Opciones (2 a 6)'), nm('answer', 'Número de la opción correcta (1, 2, 3…)'), ta('explain', 'Explicación', 300)], 10)],
    defaults: () => ({ title: 'Pon a prueba lo aprendido', items: [{ q: '¿Pregunta?', options: ['Opción A', 'Opción B', 'Opción C'], answer: 1, explain: 'Por qué es correcta.' }] }) },
  { type: 'chooser', label: 'Elige tu camino', desc: 'La persona elige una opción y recibe una recomendación', icon: Compass,
    fields: [title, list('items', 'Opciones', [t('label', 'Opción', 60), ta('result', 'Recomendación', 500)], 6)],
    defaults: () => ({ title: '¿Cuál es tu situación?', items: [{ label: 'Estoy empezando', result: 'Te recomendamos…' }, { label: 'Ya tengo experiencia', result: 'Te recomendamos…' }] }) },
  { type: 'steps', label: 'Paso a paso', desc: 'Presentación guiada con anterior y siguiente', icon: ListOrdered,
    fields: [title, list('items', 'Pasos', [t('title', 'Título', 100), ta('body', 'Detalle', 500)], 10)],
    defaults: () => ({ title: 'Cómo funciona', items: [{ title: 'Paso uno', body: 'Explica.' }, { title: 'Paso dos', body: 'Explica.' }, { title: 'Paso tres', body: 'Explica.' }] }) },
  { type: 'bars', label: 'Gráfico de barras', desc: 'Barras animadas con orden interactivo', icon: BarChart3,
    fields: [title, t('unit', 'Unidad (%, h, $)', 10), list('items', 'Datos', [t('label', 'Etiqueta', 50), nm('value', 'Valor')], 12), note],
    defaults: () => ({ title: 'Ejemplo: edita estos datos', unit: '', items: [{ label: 'Tema A', value: 40 }, { label: 'Tema B', value: 25 }, { label: 'Tema C', value: 15 }], note: '' }) },
  { type: 'donut', label: 'Gráfico de dona', desc: 'Distribución con resalte al pasar el cursor', icon: PieChart,
    fields: [title, list('items', 'Datos', [t('label', 'Etiqueta', 40), nm('value', 'Valor')], 8), note],
    defaults: () => ({ title: 'Ejemplo: edita estos datos', items: [{ label: 'Parte A', value: 40 }, { label: 'Parte B', value: 35 }, { label: 'Parte C', value: 25 }], note: '' }) },
  { type: 'radar', label: 'Radar de habilidades', desc: 'Perfil en varios ejes de 0 a 100', icon: Radar,
    fields: [title, list('items', 'Ejes (mínimo 3)', [t('label', 'Eje', 24), nm('value', 'Valor (0 a 100)')], 8), note],
    defaults: () => ({ title: 'Ejemplo: edita estos datos', items: [{ label: 'Técnica', value: 80 }, { label: 'Diseño', value: 60 }, { label: 'Liderazgo', value: 70 }, { label: 'Datos', value: 50 }], note: '' }) },
  { type: 'people', label: 'Personas y roles', desc: 'Tarjetas que se expanden', icon: Users,
    fields: [title, list('items', 'Personas o roles', [t('name', 'Nombre', 60), t('role', 'Rol', 80), ta('bio', 'Descripción', 400), t('tags', 'Etiquetas separadas por coma', 200)], 12)],
    defaults: () => ({ title: 'Equipo', items: [{ name: 'Nombre Apellido', role: 'Rol', bio: 'Descripción breve.', tags: 'React, Datos' }] }) },
  { type: 'kanban', label: 'Tablero Kanban', desc: 'Tarjetas que se mueven entre columnas', icon: Layers,
    fields: [title, list('columns', 'Columnas', [t('title', 'Nombre', 40), ss('cards', 'Tarjetas')], 4)],
    defaults: () => ({ title: 'Tablero', columns: [{ title: 'Por hacer', cards: ['Tarea uno', 'Tarea dos'] }, { title: 'En curso', cards: ['Tarea tres'] }, { title: 'Listo', cards: [] }] }) },
  { type: 'compare', label: 'Comparador A / B', desc: 'Antes y después, o dos opciones lado a lado', icon: GitCompare,
    fields: [title, t('labelA', 'Nombre de A', 30), t('labelB', 'Nombre de B', 30), list('rows', 'Filas', [t('label', 'Criterio', 60), t('a', 'Valor A', 160), t('b', 'Valor B', 160)], 12)],
    defaults: () => ({ title: 'Comparación', labelA: 'Antes', labelB: 'Después', rows: [{ label: 'Criterio uno', a: 'Cómo era', b: 'Cómo es ahora' }] }) },
  { type: 'slider', label: 'Calculadora interactiva', desc: 'Un deslizador que calcula un resultado', icon: SlidersHorizontal,
    fields: [title, t('label', 'Qué ajusta la persona', 80), t('unit', 'Unidad', 16), nm('min', 'Mínimo'), nm('max', 'Máximo'), nm('step', 'Salto'), nm('value', 'Valor inicial'), nm('factor', 'Multiplicador del resultado'), t('resultLabel', 'Nombre del resultado', 80), t('resultUnit', 'Unidad del resultado', 16), note],
    defaults: () => ({ title: 'Calcula tu impacto', label: 'Horas por semana', unit: 'h', min: 0, max: 20, step: 1, value: 5, factor: 4, resultLabel: 'Horas al mes', resultUnit: 'h', note: '' }) },
  { type: 'links', label: 'Enlaces', desc: 'Tarjetas con enlaces externos', icon: Link2,
    fields: [title, list('items', 'Enlaces', [t('label', 'Texto', 80), t('desc', 'Descripción', 140), u('url', 'Enlace')], 10)],
    defaults: () => ({ title: 'Recursos', items: [{ label: 'Nombre del recurso', desc: 'Para qué sirve', url: '' }] }) },
  { type: 'callout', label: 'Aviso destacado', desc: 'Nota, logro o advertencia', icon: AlignLeft,
    fields: [{ key: 'tone', label: 'Tono', type: 'select', options: [['info', 'Información'], ['success', 'Logro'], ['warn', 'Atención']] }, t('title', 'Título', 100), ta('body', 'Texto', 600)],
    defaults: () => ({ tone: 'info', title: 'Importante', body: 'Escribe el mensaje.' }) },
  { type: 'cta', label: 'Llamado a la acción', desc: 'Bloque con botón para que participen', icon: Megaphone,
    fields: [t('title', 'Título', 120), ta('body', 'Texto', 300), t('button', 'Texto del botón', 40), u('url', 'Enlace')],
    defaults: () => ({ title: '¿Te unes?', body: 'Cuéntales qué sigue.', button: '', url: '' }) }
];

export const DEF = Object.fromEntries(DEFS.map(d => [d.type, d])) as Record<BlockType, BlockDef>;
export const AddIcon = CopyPlus;
