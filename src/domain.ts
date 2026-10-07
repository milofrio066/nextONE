export type Role = 'founder' | 'mentor' | 'member' | 'visitor';
export type Person = { id: string; name: string; title: string; skills: string[]; bio: string; linkedin: string; portfolio: string; availability: number; role: Role; source: string; status: 'active' | 'suspended'; };
export type Task = { id: string; title: string; owner: string; period: string; status: 'todo' | 'doing' | 'done' };
export type Message = { id: string; author: string; text: string; date: string; channel: string };
export type Project = { id: string; title: string; summary: string; scope: string; difference: string; tags: string[]; owner: string; members: string[]; roles: string[]; capacity: number; requests: string[]; tasks: Task[]; messages: Message[]; docs: string; updates: string[]; exits: { user: string; reason: string }[]; status: 'active' | 'completed'; };
export type Invite = { id: string; label: string; kind: 'founder' | 'mentor' | 'makers' | 'review'; owner: string; limit: number; used: number; expires: string; revoked: boolean; };
export type Application = { id: string; name: string; email: string; skills: string; portfolio: string; linkedin: string; cv: string; bio: string; invite: string; source: string; state: 'pending' | 'approved' | 'rejected'; memberId?: string; };
export type Challenge = { id: string; title: string; area: string; description: string; owner: string; solutions: { id: string; author: string; text: string }[]; selected?: string; projectId?: string };
export type Lesson = { id: string; title: string; category: string; mentor: string; description: string; url: string; date: string; enrolled: string[]; attendees: string[]; approved: boolean; };
export type Report = { id: string; author: string; target: string; reason: string; state: 'open' | 'closed'; decision: string; };
export type State = { people: Person[]; projects: Project[]; invites: Invite[]; applications: Application[]; challenges: Challenge[]; lessons: Lesson[]; reports: Report[]; forum: Message[]; log: string[]; };
export const uid = () => crypto.randomUUID();
export function invitationStatus(invite: Invite | undefined, now = new Date()) {
  if (!invite) return 'invalid';
  if (invite.revoked) return 'revoked';
  if (new Date(invite.expires).getTime() <= now.getTime()) return 'expired';
  if (invite.used >= invite.limit) return 'full';
  return 'available';
}
export function submitApplication(state: State, application: Application, now = new Date()): State {
  if (state.applications.some(a => a.email.toLowerCase() === application.email.toLowerCase() && a.state !== 'rejected')) throw new Error('duplicate');
  const invite = state.invites.find(i => i.id === application.invite);
  if (application.invite && invitationStatus(invite, now) !== 'available') throw new Error('invitation');
  const direct = !!invite && invite.kind !== 'review';
  const memberId = direct ? uid() : undefined;
  const saved: Application = { ...application, source: invite ? `${invite.kind}: ${invite.label}` : 'Solicitud / Application', state: direct ? 'approved' : 'pending', memberId };
  return { ...state, applications: [...state.applications, saved], invites: state.invites.map(i => i.id === invite?.id ? { ...i, used: i.used + 1 } : i), people: direct ? [...state.people, personFromApplication(saved, memberId!)] : state.people };
}
export function personFromApplication(a: Application, id: string): Person { return { id, name: a.name, title: 'Tech builder', skills: a.skills.split(',').map(s => s.trim()).filter(Boolean), bio: a.bio, linkedin: a.linkedin, portfolio: a.portfolio, availability: 5, role: 'member', source: a.source, status: 'active' }; }
export function canManage(project: Project, person: Person | undefined) { return person?.role === 'founder' || project.owner === person?.id; }
export function canEnter(project: Project, person: Person | undefined) { return person?.status === 'active' && (canManage(project, person) || project.members.includes(person.id)); }
export function reviewProject(title: string, summary: string, difference: string, projects: Project[]) {
  const tokens = (text: string) => new Set(text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').split(/\W+/).filter(t => t.length > 3));
  const candidate = tokens(title + ' ' + summary);
  const similar = projects.map(p => { const other = tokens(p.title + ' ' + p.summary); const overlap = [...candidate].filter(t => other.has(t)).length; return { project: p, score: candidate.size ? overlap / Math.min(candidate.size, other.size || 1) : 0 }; }).filter(p => p.score > 0.28).sort((a,b) => b.score-a.score);
  return { similar, ready: title.trim().length >= 5 && summary.trim().length >= 40 && difference.trim().length >= 20, teamSize: summary.length > 450 ? 6 : summary.length > 200 ? 4 : 3 };
}
export function safeUrl(value: string) { try { const u = new URL(value); return ['https:', 'http:'].includes(u.protocol) ? u.href : undefined; } catch { return undefined; } }
export const storageKey = 'nextone.demo.v1';
export function loadState(): State {
  try { const saved = localStorage.getItem(storageKey); if (saved) { const state = JSON.parse(saved); if (Array.isArray(state.people) && Array.isArray(state.projects) && Array.isArray(state.invites) && Array.isArray(state.applications) && Array.isArray(state.challenges) && Array.isArray(state.lessons) && Array.isArray(state.reports) && Array.isArray(state.forum) && Array.isArray(state.log)) return state; } } catch { /* Start with demo data when local storage is unavailable or invalid. */ }
  return structuredClone(seed);
}
const demoExpiry = '2027-01-01T00:00:00Z';
export const seed: State = {
  people: [
    { id: 'you', name: 'Camilo', title: 'Fundador de nextONE', skills: ['Producto', 'Desarrollo web', 'Comunidad'], bio: 'Construyendo un lugar para que el talento encuentre su siguiente oportunidad.', linkedin: '', portfolio: '', availability: 8, role: 'founder', source: 'Fundador', status: 'active' },
    { id: 'mentor', name: 'Alex Rivera', title: 'Mentor · Software architecture', skills: ['TypeScript', 'React', 'Arquitectura'], bio: 'Mentor ficticio para explorar el piloto. Aprendemos construyendo y compartiendo.', linkedin: '', portfolio: '', availability: 4, role: 'mentor', source: 'Mentor demo', status: 'active' },
    { id: 'member', name: 'Valentina Torres', title: 'Frontend developer', skills: ['React', 'TypeScript', 'UI'], bio: 'Me interesa construir herramientas accesibles y aprender de otros builders.', linkedin: '', portfolio: '', availability: 6, role: 'member', source: 'Makers · cohorte demo', status: 'active' },
    { id: 'mateo', name: 'Mateo Ruiz', title: 'Backend developer', skills: ['Python', 'PostgreSQL', 'API'], bio: 'Datos, automatización y soluciones que resuelven problemas reales.', linkedin: '', portfolio: '', availability: 5, role: 'member', source: 'Mentor demo', status: 'active' },
    { id: 'sara', name: 'Sara López', title: 'Product designer', skills: ['Figma', 'UX', 'UI'], bio: 'Diseño experiencias simples para problemas complejos.', linkedin: '', portfolio: '', availability: 5, role: 'member', source: 'Solicitud', status: 'active' },
  ],
  projects: [
    { id: 'p1', title: 'OpenMentor', summary: 'Una plataforma para conectar estudiantes de tecnología con mentores mediante objetivos de aprendizaje concretos.', scope: 'MVP: perfil de mentor, búsqueda por habilidades y solicitud de una primera sesión. Entregable: prototipo web funcional en cuatro semanas.', difference: 'Cada mentoría parte de un proyecto y termina con un entregable revisado.', tags: ['React', 'TypeScript', 'UX'], owner: 'you', members: ['you', 'member', 'sara'], roles: ['Frontend', 'Diseño UX', 'Backend'], capacity: 4, requests: ['mateo'], tasks: [{ id: 't1', title: 'Diseñar el flujo de solicitud', owner: 'sara', period: 'weekly', status: 'done' }, { id: 't2', title: 'Construir el perfil del mentor', owner: 'member', period: 'weekly', status: 'doing' }, { id: 't3', title: 'Definir el modelo de datos', owner: 'you', period: 'daily', status: 'todo' }], messages: [{ id: 'm1', author: 'you', text: 'Bienvenidos. Esta semana cerramos el flujo de búsqueda y los perfiles. ¿Qué bloqueos tienen?', date: '2026-10-06T15:00:00Z', channel: 'general' }, { id: 'm2', author: 'member', text: 'Ya tengo el primer componente de perfil. Lo comparto en la revisión del equipo.', date: '2026-10-06T15:20:00Z', channel: 'general' }], docs: '## Objetivo\nConectar talento con mentoría basada en proyectos.\n\n## Esta semana\nValidar el flujo de solicitud y terminar los perfiles.\n\n## Fuera de alcance\nPagos, grabaciones y recomendaciones automáticas.', updates: ['Terminamos el primer mapa de la experiencia. Próximo paso: validar el prototipo con tres participantes.'], exits: [], status: 'active' },
    { id: 'p2', title: 'Ciudad en datos', summary: 'Un tablero abierto para explorar indicadores de movilidad y convertir datos públicos en decisiones útiles.', scope: 'Visualizar un conjunto de datos abierto con tres indicadores y filtros. Entregable: tablero documentado.', difference: 'Explica cada indicador con lenguaje sencillo y publica el proceso de transformación de datos.', tags: ['Python', 'PostgreSQL', 'Data'], owner: 'mentor', members: ['mentor', 'mateo'], roles: ['Data engineer', 'Frontend', 'UX'], capacity: 5, requests: [], tasks: [], messages: [], docs: 'Seleccionar una fuente abierta, documentar su licencia y validar la calidad de los datos.', updates: [], exits: [], status: 'active' },
    { id: 'p3', title: 'Accesible UI', summary: 'Una colección de componentes accesibles para que equipos pequeños construyan mejores experiencias web.', scope: 'Cinco componentes con navegación por teclado, contraste verificado y documentación de uso.', difference: 'Ejemplos prácticos en español y foco en equipos que empiezan.', tags: ['React', 'UI', 'Open source'], owner: 'sara', members: ['sara', 'member'], roles: ['Frontend', 'QA'], capacity: 3, requests: [], tasks: [], messages: [], docs: 'Botón, modal, formulario, navegación y mensajes de estado.', updates: [], exits: [], status: 'active' },
  ],
  invites: [
    { id: 'fundador-demo', label: 'Invitación de Camilo', kind: 'founder', owner: 'you', limit: 10, used: 0, expires: demoExpiry, revoked: false },
    { id: 'mentor-demo', label: 'Alex · referencias directas', kind: 'mentor', owner: 'mentor', limit: 5, used: 0, expires: demoExpiry, revoked: false },
    { id: 'makers-demo', label: 'Makers · cohorte de demostración', kind: 'makers', owner: 'you', limit: 30, used: 0, expires: demoExpiry, revoked: false },
  ],
  applications: [],
  challenges: [{ id: 'c1', title: '¿Cómo reducir el abandono al aprender a programar?', area: 'Educación', description: 'Diseña una solución que acompañe a personas que empiezan y les ayude a sostener su aprendizaje durante el primer mes.', owner: 'you', solutions: [{ id: 's1', author: 'member', text: 'Equipos de tres personas con un mini proyecto semanal y una revisión entre pares. El progreso se mide por entregables, no por horas de video.' }] }],
  lessons: [
    { id: 'l1', title: 'De una idea a un MVP que resuelve algo', category: 'Sesión en vivo', mentor: 'mentor', description: 'Define el problema, recorta el alcance y diseña tu primer experimento. Sesión de demostración; horario por confirmar.', url: '', date: '', enrolled: ['member'], attendees: [], approved: true },
    { id: 'l2', title: 'Aprende desarrollo web construyendo', category: 'Ruta autodidacta', mentor: 'you', description: 'Fundamentos de HTML, CSS y JavaScript para construir una base sólida.', url: 'https://developer.mozilla.org/es/docs/Learn_web_development', date: '', enrolled: [], attendees: [], approved: true },
    { id: 'l3', title: 'Colabora con Git y GitHub', category: 'Recurso', mentor: 'you', description: 'Repositorios, ramas y contribuciones: el punto de partida para trabajar en equipo.', url: 'https://docs.github.com/es/get-started', date: '', enrolled: [], attendees: [], approved: true },
  ],
  reports: [],
  forum: [{ id: 'f1', author: 'you', text: 'Bienvenidos a nextONE. Comparte qué estás construyendo y qué te gustaría aprender. Tu próximo equipo puede estar aquí.', date: '2026-10-06T15:00:00Z', channel: 'general' }, { id: 'f2', author: 'mateo', text: 'Estoy explorando datos abiertos con Python. ¿Alguien quiere colaborar en una visualización?', date: '2026-10-06T16:00:00Z', channel: 'general' }],
  log: ['Piloto local inicializado con datos ficticios.'],
};
