import type { Kind } from '../types';
import type { PageTemplate, Props } from './types';

/* Constructores cortos: cada plantilla es una composición de bloques. Todo el texto es editable. */
const soon = () => new Date(Date.now() + 14 * 864e5).toISOString();
const hero = (eyebrow: string, title: string, subtitle: string, button = '', url = '') => ({ type: 'hero' as const, props: { eyebrow, title, subtitle, button, url } });
const countdown = (label: string) => ({ type: 'countdown' as const, props: { label, target: soon() } });
const stats = (title: string, items: [string, string, string, string?][]) => ({ type: 'stats' as const, props: { title, items: items.map(([value, suffix, label, note]) => ({ value, suffix, label, note: note || '' })) } });
const flip = (title: string, items: [string, string, string][]) => ({ type: 'flip' as const, props: { title, items: items.map(([icon, front, back]) => ({ icon, front, back })) } });
const tabs = (title: string, items: [string, string][]) => ({ type: 'tabs' as const, props: { title, items: items.map(([t, body]) => ({ title: t, body })) } });
const acc = (title: string, items: [string, string][]) => ({ type: 'accordion' as const, props: { title, items: items.map(([q, a]) => ({ q, a })) } });
const timeline = (title: string, items: [string, string, string][]) => ({ type: 'timeline' as const, props: { title, items: items.map(([time, t, body]) => ({ time, title: t, body })) } });
const agenda = (title: string, items: [string, string, string, number][]) => ({ type: 'agenda' as const, props: { title, items: items.map(([time, t, who, minutes]) => ({ time, title: t, who, minutes })) } });
const checklist = (title: string, items: string[]) => ({ type: 'checklist' as const, props: { title, items } });
const quiz = (title: string, items: [string, string[], number, string][]) => ({ type: 'quiz' as const, props: { title, items: items.map(([q, options, answer, explain]) => ({ q, options, answer, explain })) } });
const chooser = (title: string, items: [string, string][]) => ({ type: 'chooser' as const, props: { title, items: items.map(([label, result]) => ({ label, result })) } });
const steps = (title: string, items: [string, string][]) => ({ type: 'steps' as const, props: { title, items: items.map(([t, body]) => ({ title: t, body })) } });
const bars = (title: string, unit: string, items: [string, number][], note = '') => ({ type: 'bars' as const, props: { title, unit, items: items.map(([label, value]) => ({ label, value })), note } });
const donut = (title: string, items: [string, number][], note = '') => ({ type: 'donut' as const, props: { title, items: items.map(([label, value]) => ({ label, value })), note } });
const radar = (title: string, items: [string, number][], note = '') => ({ type: 'radar' as const, props: { title, items: items.map(([label, value]) => ({ label, value })), note } });
const people = (title: string, items: [string, string, string, string][]) => ({ type: 'people' as const, props: { title, items: items.map(([name, role, bio, tags]) => ({ name, role, bio, tags })) } });
const kanban = (title: string, columns: [string, string[]][]) => ({ type: 'kanban' as const, props: { title, columns: columns.map(([t, cards]) => ({ title: t, cards })) } });
const compare = (title: string, labelA: string, labelB: string, rows: [string, string, string][]) => ({ type: 'compare' as const, props: { title, labelA, labelB, rows: rows.map(([label, a, b]) => ({ label, a, b })) } });
const slider = (p: Props) => ({ type: 'slider' as const, props: p });
const links = (title: string, items: [string, string][]) => ({ type: 'links' as const, props: { title, items: items.map(([label, desc]) => ({ label, desc, url: '' })) } });
const callout = (tone: 'info' | 'success' | 'warn', title: string, body: string) => ({ type: 'callout' as const, props: { tone, title, body } });
const cta = (title: string, body: string, button = '', url = '') => ({ type: 'cta' as const, props: { title, body, button, url } });

const C = { cyan: '#22d3ee', violet: '#8b5cf6', green: '#34d399', amber: '#fbbf24', rose: '#fb7185', blue: '#60a5fa' };
const T = (id: string, kind: Kind, name: string, tag: string, description: string, accent: string, blocks: PageTemplate['blocks']): PageTemplate => ({ id, kind, name, tag, description, accent, blocks });

export const CATALOG: PageTemplate[] = [
  /* ═════════════ EVENTOS ═════════════ */
  T('evento-lanzamiento', 'event', 'Lanzamiento', 'Cuenta regresiva', 'Portada con cuenta regresiva, cifras y agenda para que cada persona arme su plan.', C.cyan, [
    hero('Evento · Presencial o virtual', 'Nombre de tu evento', 'Una frase que explique por qué vale la pena asistir.', 'Quiero asistir'),
    countdown('Faltan'),
    stats('El evento en cifras', [['300', '+', 'Asistentes', 'Aforo esperado. Edita según tu evento.'], ['12', '', 'Charlas'], ['4', 'h', 'De contenido']]),
    agenda('Arma tu agenda', [['6:00 pm', 'Apertura', '', 15], ['6:15 pm', 'Charla principal', 'Nombre del speaker', 40], ['7:00 pm', 'Networking', '', 30]]),
    cta('Reserva tu cupo', 'Los cupos son limitados. Confirma tu asistencia.', 'Registrarme')
  ]),
  T('evento-agenda-viva', 'event', 'Agenda viva', 'Agenda + speakers', 'Agenda marcable con tarjetas de speakers y enlaces de interés.', C.violet, [
    hero('Programa completo', 'Programa del evento', 'Marca lo que no te quieres perder.'),
    agenda('Programa', [['9:00 am', 'Registro y café', '', 30], ['9:30 am', 'Keynote', 'Nombre del speaker', 45], ['10:30 am', 'Taller práctico', 'Nombre del mentor', 90], ['12:00 pm', 'Cierre', '', 20]]),
    flip('Speakers destacados', [['🎤', 'Nombre del speaker 1', 'Tema que presentará y por qué importa.'], ['🧠', 'Nombre del speaker 2', 'Tema que presentará y por qué importa.'], ['🚀', 'Nombre del speaker 3', 'Tema que presentará y por qué importa.']]),
    links('Antes de venir', [['Cómo llegar', 'Ubicación y transporte'], ['Reglas de convivencia', 'Para que todos disfruten']])
  ]),
  T('evento-hackathon', 'event', 'Hackathon', 'Fases + reglas', 'Fases del reto, qué llevar, reglas y premios en pestañas.', C.rose, [
    hero('Hackathon', 'Construye algo en 48 horas', 'Forma tu equipo, elige un reto y presenta tu prototipo.', 'Inscribir mi equipo'),
    countdown('Arranca en'),
    timeline('Fases del hackathon', [['Viernes', 'Apertura y equipos', 'Presentamos los retos y formamos equipos.'], ['Sábado', 'Desarrollo y mentorías', 'Trabajo en equipo con apoyo de mentores.'], ['Domingo', 'Pitch y premiación', 'Cada equipo presenta en 5 minutos.']]),
    checklist('Qué llevar', ['Computador y cargador', 'Idea o área de interés', 'Ganas de colaborar']),
    tabs('Lo que debes saber', [['Reglas', 'Equipos de 3 a 5 personas. Todo el código se desarrolla durante el evento.'], ['Criterios', 'Innovación, impacto, ejecución técnica y presentación.'], ['Premios', 'Describe aquí los premios y reconocimientos.']]),
    cta('¿Listo para competir?', 'Cierra inscripciones pronto.', 'Inscribirme')
  ]),
  T('evento-meetup', 'event', 'Meetup relajado', 'Cómo funciona', 'Paso a paso del encuentro, anfitriones y preguntas frecuentes.', C.green, [
    hero('Meetup', 'Nombre del meetup', 'Un espacio casual para conocernos y compartir lo que estamos construyendo.'),
    steps('Cómo será la noche', [['Llegada', 'Recibe tu credencial y saluda al equipo.'], ['Lightning talks', 'Charlas relámpago de 5 minutos.'], ['Mesas de conversación', 'Elige un tema y conversa con otras personas.']]),
    chooser('¿Qué quieres lograr?', [['Conocer gente', 'Pasa por la mesa de bienvenida y pide que te presenten.'], ['Aprender algo', 'Quédate en las lightning talks y toma notas.'], ['Buscar equipo', 'Cuéntales tu idea en las mesas de conversación.']]),
    people('Anfitriones', [['Nombre Apellido', 'Organizador/a', 'Cuéntales quién es y qué hace.', 'Comunidad']]),
    acc('Preguntas frecuentes', [['¿Tiene costo?', 'Escribe aquí la respuesta.'], ['¿Debo llevar algo?', 'Escribe aquí la respuesta.']])
  ]),
  T('evento-networking', 'event', 'Networking guiado', 'Rompehielos', 'Metas personales, rompehielos y guía para conectar mejor.', C.amber, [
    hero('Networking', 'Conecta con intención', 'Una noche para conocer personas que construyen como tú.'),
    checklist('Tus metas de la noche', ['Conocer a 3 personas nuevas', 'Compartir en qué estoy trabajando', 'Pedir o dar una recomendación']),
    flip('Rompehielos', [['👋', '¿En qué estás trabajando?', 'Pregunta abierta para empezar cualquier conversación.'], ['🎯', '¿Qué quieres aprender?', 'Ayuda a encontrar mentores y compañeros.'], ['🤝', '¿En qué puedo ayudarte?', 'Cambia la conversación hacia la colaboración.']]),
    steps('Cómo funciona la dinámica', [['Ronda 1', '5 minutos con una persona nueva.'], ['Ronda 2', 'Cambia de pareja y repite.'], ['Cierre', 'Comparte un aprendizaje con el grupo.']]),
    callout('info', 'Después del evento', 'Escribe a quienes conociste en las próximas 48 horas. Un mensaje corto marca la diferencia.')
  ]),

  /* ═════════════ WEBINARS ═════════════ */
  T('webinar-clase', 'webinar', 'Clase en vivo', 'Paso a paso', 'Cuenta regresiva, recorrido de la sesión, preguntas y material.', C.cyan, [
    hero('Webinar en vivo', 'Título de tu webinar', 'Qué aprenderás y por qué te servirá.', 'Unirme al webinar'),
    countdown('Empieza en'),
    steps('Qué veremos', [['Introducción', 'Contexto y objetivos.'], ['Demostración', 'Ejemplo guiado paso a paso.'], ['Preguntas', 'Espacio abierto para dudas.']]),
    acc('Preguntas frecuentes', [['¿Quedará grabado?', 'Escribe aquí la respuesta.'], ['¿Necesito conocimientos previos?', 'Escribe aquí la respuesta.']]),
    links('Material de apoyo', [['Diapositivas', 'Se publican al terminar'], ['Repositorio', 'Código del ejemplo']]),
    cta('Reserva tu lugar', 'Recibirás el enlace de acceso al registrarte.', 'Registrarme')
  ]),
  T('webinar-taller', 'webinar', 'Taller práctico', 'Hazlo tú', 'Requisitos con progreso, línea de tiempo del taller y un pre-test.', C.green, [
    hero('Taller', 'Aprende haciendo', 'Una sesión práctica para construir algo desde cero.'),
    checklist('Prepara tu entorno', ['Instalar las herramientas', 'Crear una cuenta gratuita', 'Descargar el material']),
    timeline('Ruta del taller', [['Min 0', 'Bienvenida', 'Objetivos y herramientas.'], ['Min 15', 'Construcción guiada', 'Seguimos juntos cada paso.'], ['Min 60', 'Reto final', 'Aplica lo aprendido por tu cuenta.']]),
    quiz('Pre-test rápido', [['¿Qué necesitas tener listo antes de empezar?', ['Solo ganas', 'El entorno preparado', 'Nada'], 2, 'Tener el entorno listo ahorra los primeros 15 minutos.']]),
    links('Recursos', [['Guía de instalación', 'Paso a paso'], ['Plantilla inicial', 'Para no empezar de cero']])
  ]),
  T('webinar-panel', 'webinar', 'Panel de expertos', 'Panelistas', 'Presenta a los panelistas, los temas y recoge preguntas.', C.violet, [
    hero('Panel', 'Título del panel', 'Voces con experiencia real conversando sobre un tema que importa.', 'Quiero asistir'),
    people('Panelistas', [['Nombre Apellido', 'Cargo · Organización', 'Qué perspectiva aporta al panel.', 'Tema 1, Tema 2'], ['Nombre Apellido', 'Cargo · Organización', 'Qué perspectiva aporta al panel.', 'Tema 3'], ['Moderador/a', 'Comunidad nextONE', 'Guiará la conversación.', '']]),
    tabs('Temas del panel', [['Tema 1', 'Qué se discutirá y por qué.'], ['Tema 2', 'Qué se discutirá y por qué.'], ['Tema 3', 'Qué se discutirá y por qué.']]),
    acc('Preguntas que queremos responder', [['¿Pregunta guía 1?', 'Contexto de la pregunta.'], ['¿Pregunta guía 2?', 'Contexto de la pregunta.']]),
    cta('Envía tu pregunta', 'Las mejores se responderán en vivo.', 'Enviar pregunta')
  ]),
  T('webinar-grabacion', 'webinar', 'Grabación y aprendizajes', 'Resumen', 'Resumen por pestañas, ideas clave y un quiz para comprobar lo aprendido.', C.amber, [
    hero('Grabación disponible', 'Título del webinar', 'Mira la sesión completa y repasa lo más importante.', 'Ver grabación'),
    tabs('Contenido', [['Resumen', 'Escribe aquí lo esencial de la sesión.'], ['Capítulos', '00:00 Introducción · 10:00 Demo · 40:00 Preguntas'], ['Recursos', 'Enumera los materiales mencionados.']]),
    flip('Ideas clave', [['💡', 'Idea 1', 'Explica la idea.'], ['⚙️', 'Idea 2', 'Explica la idea.'], ['🎯', 'Idea 3', 'Explica la idea.']]),
    quiz('¿Qué te llevaste?', [['Pregunta sobre el contenido', ['Opción A', 'Opción B', 'Opción C'], 1, 'Explica la respuesta correcta.']]),
    links('Para seguir aprendiendo', [['Recurso 1', 'Descripción'], ['Recurso 2', 'Descripción']])
  ]),
  T('webinar-serie', 'webinar', 'Serie de sesiones', 'Ciclo', 'Un ciclo de varias sesiones con ruta, cifras y guía de por dónde empezar.', C.blue, [
    hero('Serie', 'Nombre de la serie', 'Varias sesiones conectadas para llevarte de cero a resultados.'),
    timeline('Sesiones', [['Sesión 1', 'Fundamentos', 'Qué se cubre.'], ['Sesión 2', 'Práctica', 'Qué se cubre.'], ['Sesión 3', 'Proyecto final', 'Qué se cubre.']]),
    stats('La serie en cifras', [['3', '', 'Sesiones'], ['6', 'h', 'De contenido'], ['100', '%', 'Gratuita']]),
    chooser('¿Por dónde empiezo?', [['Soy principiante', 'Empieza por la sesión 1 y sigue el orden.'], ['Ya tengo bases', 'Puedes saltar a la sesión 2.'], ['Solo quiero el proyecto', 'Ve a la sesión 3 con el material previo.']]),
    cta('Únete a la serie', 'Inscríbete una vez y accede a todas las sesiones.', 'Inscribirme')
  ]),

  /* ═════════════ APRENDIZAJE ═════════════ */
  T('recurso-ruta', 'resource', 'Ruta de aprendizaje', 'Ruta', 'Pasos guiados, checklist de avance y tiempos estimados por módulo.', C.green, [
    hero('Aprendizaje', 'Ruta para dominar un tema', 'Un camino ordenado, con tiempos y metas claras.'),
    steps('Tu ruta', [['Módulo 1 · Bases', 'Qué aprenderás y cómo practicarlo.'], ['Módulo 2 · Práctica', 'Ejercicios guiados.'], ['Módulo 3 · Proyecto', 'Aplica todo en algo real.']]),
    checklist('Tu progreso', ['Terminé el módulo 1', 'Terminé el módulo 2', 'Entregué mi proyecto']),
    bars('Ejemplo: horas por módulo (edita estos datos)', 'h', [['Bases', 6], ['Práctica', 10], ['Proyecto', 14]], 'Sirve para planear tu semana. Reemplaza los valores por los reales.'),
    links('Material', [['Lectura recomendada', 'Descripción'], ['Video', 'Descripción']])
  ]),
  T('recurso-guia', 'resource', 'Guía rápida', 'Consulta', 'Guía por pestañas con preguntas frecuentes y avisos destacados.', C.cyan, [
    hero('Guía', 'Guía rápida de…', 'Todo lo esencial en un solo lugar.'),
    tabs('Contenido', [['Qué es', 'Define el tema.'], ['Cómo empezar', 'Primeros pasos.'], ['Errores comunes', 'Qué evitar.']]),
    callout('warn', 'Ten en cuenta', 'Escribe una advertencia importante.'),
    acc('Dudas frecuentes', [['¿Pregunta común?', 'Respuesta.'], ['¿Otra pregunta?', 'Respuesta.']]),
    links('Más información', [['Documentación oficial', 'Fuente principal']])
  ]),
  T('recurso-flashcards', 'resource', 'Flashcards de estudio', 'Estudia', 'Tarjetas giratorias para memorizar, un quiz y metas de estudio.', C.violet, [
    hero('Estudio activo', 'Repasa con tarjetas', 'Voltea cada tarjeta, piensa tu respuesta y verifica.'),
    flip('Conceptos', [['📘', 'Concepto 1', 'Definición.'], ['📗', 'Concepto 2', 'Definición.'], ['📙', 'Concepto 3', 'Definición.'], ['📕', 'Concepto 4', 'Definición.']]),
    quiz('Ponte a prueba', [['Pregunta de repaso', ['Opción A', 'Opción B', 'Opción C'], 2, 'Explica por qué.']]),
    checklist('Metas de estudio', ['Repasar todas las tarjetas', 'Acertar el quiz', 'Explicar un concepto a otra persona'])
  ]),
  T('recurso-reto', 'resource', 'Reto semanal', '7 días', 'Reto por días con checklist y calculadora de tiempo de práctica.', C.rose, [
    hero('Reto', 'Reto de 7 días', 'Pequeñas prácticas diarias que suman.', 'Aceptar el reto'),
    timeline('Tu semana', [['Día 1', 'Arranque', 'Tarea del día.'], ['Día 4', 'A mitad de camino', 'Tarea del día.'], ['Día 7', 'Cierre', 'Comparte tu resultado.']]),
    checklist('Marca cada día', ['Día 1', 'Día 2', 'Día 3', 'Día 4', 'Día 5', 'Día 6', 'Día 7']),
    slider({ title: '¿Cuánto vas a practicar?', label: 'Minutos al día', unit: 'min', min: 10, max: 120, step: 5, value: 30, factor: 7, resultLabel: 'Minutos en la semana', resultUnit: 'min', note: 'Constancia gana a intensidad.' }),
    cta('Comparte tu avance', 'Cuéntale a la comunidad cómo te fue.', 'Compartir')
  ]),
  T('recurso-comparativa', 'resource', 'Comparativa de herramientas', 'Decide', 'Compara opciones, mira su perfil en un radar y obtén una recomendación.', C.amber, [
    hero('Comparativa', 'Herramienta A vs herramienta B', 'Para elegir con criterio, no por moda.'),
    compare('Frente a frente', 'Herramienta A', 'Herramienta B', [['Curva de aprendizaje', 'Descripción', 'Descripción'], ['Costo', 'Descripción', 'Descripción'], ['Comunidad', 'Descripción', 'Descripción']]),
    radar('Ejemplo: perfil de la herramienta A (edita estos datos)', [['Facilidad', 80], ['Potencia', 65], ['Comunidad', 90], ['Costo', 70]], 'Cada eje va de 0 a 100. Más cerca del borde es mejor.'),
    chooser('¿Cuál me conviene?', [['Estoy empezando', 'Recomendación.'], ['Busco rendimiento', 'Recomendación.']]),
    links('Documentación', [['Herramienta A', 'Sitio oficial'], ['Herramienta B', 'Sitio oficial']])
  ]),

  /* ═════════════ SPEAKERS ═════════════ */
  T('speaker-perfil', 'speaker', 'Perfil destacado', 'Trayectoria', 'Presenta a la persona con cifras, trayectoria y datos curiosos.', C.violet, [
    hero('Speaker', 'Nombre del speaker', 'Cargo · Organización. Una frase que lo/la describa.'),
    stats('En números', [['10', '+', 'Años de experiencia'], ['50', '+', 'Charlas dadas'], ['5', '', 'Proyectos destacados']]),
    timeline('Trayectoria', [['2018', 'Inicio', 'Dónde comenzó.'], ['2021', 'Un gran paso', 'Qué cambió.'], ['Hoy', 'Presente', 'En qué trabaja ahora.']]),
    flip('Datos curiosos', [['☕', 'Su herramienta favorita', 'Cuéntalo.'], ['📚', 'Un libro que recomienda', 'Cuéntalo.'], ['🌱', 'Su primer proyecto', 'Cuéntalo.']]),
    links('Sigue su trabajo', [['LinkedIn', 'Perfil profesional'], ['Sitio web', 'Portafolio']])
  ]),
  T('speaker-charla', 'speaker', 'Charla y temas', 'Charla', 'Temas de la charla, preguntas para el speaker y llamado a asistir.', C.cyan, [
    hero('Charla', 'Título de la charla', 'De qué trata y a quién va dirigida.', 'Asistir a la charla'),
    tabs('Sobre la charla', [['Qué aprenderás', 'Escribe los aprendizajes.'], ['Para quién es', 'Describe a la audiencia.'], ['Requisitos', 'Qué debes saber de antemano.']]),
    agenda('Estructura', [['Min 0', 'Introducción', '', 5], ['Min 5', 'Desarrollo', '', 30], ['Min 35', 'Preguntas', '', 15]]),
    acc('Pregúntale al speaker', [['¿Pregunta sugerida 1?', 'Contexto.'], ['¿Pregunta sugerida 2?', 'Contexto.']]),
    cta('Asegura tu lugar', 'Recibe el enlace antes de la charla.', 'Registrarme')
  ]),
  T('speaker-habilidades', 'speaker', 'Mapa de habilidades', 'Radar', 'Radar de fortalezas, barras de experiencia por área y enlaces.', C.green, [
    hero('Perfil técnico', 'Nombre del speaker', 'Sus áreas de experiencia, de un vistazo.'),
    radar('Ejemplo: fortalezas (edita estos datos)', [['Backend', 85], ['Frontend', 60], ['Datos', 75], ['Liderazgo', 80], ['Docencia', 70]], 'Pasa el cursor por cada eje para ver el valor.'),
    bars('Ejemplo: años por área (edita estos datos)', ' años', [['Desarrollo', 8], ['Datos', 5], ['Mentoría', 3]]),
    tabs('Proyectos', [['Proyecto 1', 'Descripción.'], ['Proyecto 2', 'Descripción.']]),
    links('Más sobre su trabajo', [['Portafolio', 'Proyectos']])
  ]),
  T('speaker-entrevista', 'speaker', 'Entrevista rápida', 'Q&A', 'Preguntas y respuestas, consejos giratorios y una cita destacada.', C.amber, [
    hero('Entrevista', 'Conversación con…', 'Cinco preguntas sobre su camino y sus consejos.'),
    acc('Preguntas y respuestas', [['¿Cómo empezaste?', 'Respuesta.'], ['¿Qué te gustaría haber sabido antes?', 'Respuesta.'], ['¿Qué estás aprendiendo ahora?', 'Respuesta.']]),
    flip('Consejos', [['🎯', 'Consejo 1', 'Explica el consejo.'], ['🧭', 'Consejo 2', 'Explica el consejo.'], ['⚡', 'Consejo 3', 'Explica el consejo.']]),
    callout('success', 'Cita para recordar', '«Escribe aquí la frase más inspiradora de la entrevista.»'),
    links('Lecturas que recomienda', [['Libro o artículo', 'Por qué lo recomienda']])
  ]),
  T('speaker-mentor', 'speaker', 'Mentorías', 'Mentoría', 'Cómo funcionan las mentorías, a quién ayudan y cómo prepararte.', C.rose, [
    hero('Mentoría', 'Mentorías con…', 'Sesiones uno a uno para destrabar tu siguiente paso.'),
    steps('Cómo funciona', [['Agenda', 'Elige un horario disponible.'], ['Prepárate', 'Define qué quieres resolver.'], ['Sesión', '30 a 45 minutos de conversación.'], ['Seguimiento', 'Acuerden próximos pasos.']]),
    chooser('¿Qué necesitas?', [['Orientación de carrera', 'Ideal para definir rumbo y portafolio.'], ['Revisar un proyecto', 'Trae tu avance y preguntas específicas.'], ['Prepararme para entrevistas', 'Practicamos juntos.']]),
    checklist('Prepara tu sesión', ['Escribir mi objetivo en una frase', 'Reunir mi CV o proyecto', 'Preparar 3 preguntas']),
    cta('Solicita una mentoría', 'Cupos limitados por mes.', 'Solicitar')
  ]),

  /* ═════════════ BUILDER CASES ═════════════ */
  T('case-reto', 'case', 'Reto del caso', 'Brief', 'Brief del reto con cuenta regresiva, entregables y criterios.', C.violet, [
    hero('Reto', 'Nombre del reto', 'El problema que tu equipo va a resolver.'),
    countdown('Cierre de entregas en'),
    tabs('El brief', [['Contexto', 'Describe la situación.'], ['Objetivo', 'Qué debe lograr la solución.'], ['Restricciones', 'Límites de tiempo, datos o tecnología.']]),
    checklist('Entregables', ['Prototipo o demo funcionando', 'Documento de una página', 'Presentación de 5 minutos']),
    cta('Empieza tu entrega', 'Inicia el caso cuando estés listo.', 'Comenzar')
  ]),
  T('case-criterios', 'case', 'Criterios de evaluación', 'Rúbrica', 'Pesos de la rúbrica en una dona, detalle por criterio y un quiz.', C.cyan, [
    hero('Rúbrica', 'Cómo se evaluará tu solución', 'Conoce los criterios antes de empezar.'),
    donut('Peso de cada criterio', [['Impacto', 30], ['Viabilidad técnica', 25], ['Innovación', 20], ['Presentación', 15], ['Trabajo en equipo', 10]], 'Pasa el cursor para ver el porcentaje de cada criterio.'),
    acc('Qué evaluamos en cada uno', [['Impacto', 'Describe qué buscamos.'], ['Viabilidad técnica', 'Describe qué buscamos.'], ['Innovación', 'Describe qué buscamos.']]),
    quiz('¿Entendiste el caso?', [['¿Qué criterio pesa más?', ['Presentación', 'Impacto', 'Trabajo en equipo'], 2, 'El impacto vale el 30% de la nota.']]),
    links('Casos de referencia', [['Ejemplo de buena entrega', 'Para inspirarte']])
  ]),
  T('case-ruta', 'case', 'Ruta de trabajo', 'Plan', 'Fases, tablero para organizar el trabajo y pasos recomendados.', C.green, [
    hero('Plan de trabajo', 'Cómo abordar el caso', 'Una ruta sugerida para no perderte.'),
    timeline('Fases', [['Fase 1', 'Entender el problema', 'Habla con usuarios y revisa datos.'], ['Fase 2', 'Diseñar la solución', 'Esboza y valida tu idea.'], ['Fase 3', 'Construir y presentar', 'Prototipo y pitch.']]),
    kanban('Tablero del equipo', [['Por hacer', ['Investigar el problema', 'Definir el alcance']], ['En curso', ['Primer prototipo']], ['Listo', []]]),
    steps('Consejos para entregar bien', [['Empieza simple', 'Un prototipo pequeño que funcione vale más que uno grande a medias.'], ['Valida pronto', 'Muéstralo a alguien antes de pulirlo.'], ['Cuenta la historia', 'Explica el problema antes de la solución.']])
  ]),
  T('case-contexto', 'case', 'Contexto y datos', 'Datos', 'Cifras del problema, gráfico de contexto y restricciones.', C.amber, [
    hero('Contexto', 'El problema en datos', 'Entiende la magnitud antes de proponer.'),
    stats('Lo que sabemos', [['70', '%', 'Dato clave 1', 'Explica la fuente y qué significa.'], ['3', 'x', 'Dato clave 2'], ['500', '+', 'Dato clave 3']]),
    bars('Ejemplo: distribución del problema (edita estos datos)', '%', [['Causa A', 45], ['Causa B', 30], ['Causa C', 25]], 'Cada barra muestra el peso de una causa.'),
    callout('warn', 'Restricciones', 'Describe límites de presupuesto, tiempo, datos o tecnología.'),
    tabs('Más información', [['Fuentes', 'Enumera las fuentes.'], ['Glosario', 'Define términos clave.']])
  ]),
  T('case-equipos', 'case', 'Equipos y roles', 'Equipos', 'Roles sugeridos, descubre cuál te encaja y prepara a tu equipo.', C.rose, [
    hero('Equipos', 'Arma el equipo ideal', 'Cada rol aporta algo distinto al caso.'),
    people('Roles sugeridos', [['Producto', 'Define el problema', 'Prioriza y guía la visión.', 'Estrategia'], ['Desarrollo', 'Construye', 'Convierte la idea en un prototipo.', 'Código'], ['Diseño', 'Experiencia', 'Cuida que sea claro y usable.', 'UX'], ['Datos', 'Evidencia', 'Aporta números que sustentan.', 'Análisis']]),
    chooser('¿Qué rol me encaja?', [['Me gusta organizar', 'Producto: coordina y prioriza.'], ['Me gusta construir', 'Desarrollo: lleva la idea a la realidad.'], ['Me gusta lo visual', 'Diseño: cuida la experiencia.']]),
    checklist('Acuerdos del equipo', ['Definir canal de comunicación', 'Repartir roles', 'Fijar horarios de trabajo']),
    cta('Busca equipo', 'Publica en la comunidad lo que buscas.', 'Ir a comunidad')
  ]),

  /* ═════════════ SOLUCIONES ═════════════ */
  T('solucion-demo', 'solution', 'Demo guiada', 'Recorrido', 'Recorrido paso a paso, funciones giratorias y enlace para probarla.', C.cyan, [
    hero('Solución', 'Nombre de tu solución', 'Qué problema resuelve en una frase.', 'Probar la solución'),
    steps('Recorrido', [['1 · El problema', 'Qué dolor resuelve.'], ['2 · La solución', 'Cómo funciona.'], ['3 · El resultado', 'Qué logra quien la usa.']]),
    flip('Funciones principales', [['⚡', 'Función 1', 'Qué hace.'], ['🔒', 'Función 2', 'Qué hace.'], ['📊', 'Función 3', 'Qué hace.']]),
    links('Pruébala', [['Demo en vivo', 'Enlace público'], ['Repositorio', 'Código fuente']]),
    cta('Danos tu opinión', 'Tu retroalimentación nos ayuda a mejorar.', 'Dar opinión')
  ]),
  T('solucion-antes-despues', 'solution', 'Antes y después', 'Impacto', 'Comparador antes/después, calculadora de ahorro y conclusión.', C.green, [
    hero('Impacto', 'El cambio que logra', 'Mira la diferencia con y sin la solución.'),
    compare('Antes vs. después', 'Antes', 'Después', [['Tiempo', 'Proceso manual', 'Proceso automatizado'], ['Errores', 'Frecuentes', 'Casi nulos'], ['Costo', 'Alto', 'Reducido']]),
    slider({ title: 'Calcula tu ahorro', label: 'Horas ahorradas por semana', unit: 'h', min: 0, max: 40, step: 1, value: 10, factor: 4, resultLabel: 'Horas ahorradas al mes', resultUnit: 'h', note: 'Ajusta el multiplicador a tu caso real.' }),
    callout('success', 'Conclusión', 'Resume el resultado más importante.')
  ]),
  T('solucion-arquitectura', 'solution', 'Arquitectura', 'Técnico', 'Capas de la solución, decisiones técnicas y distribución del stack.', C.violet, [
    hero('Arquitectura', 'Cómo está construida', 'Las decisiones técnicas detrás de la solución.'),
    tabs('Capas', [['Interfaz', 'Tecnologías y decisiones.'], ['Lógica', 'Tecnologías y decisiones.'], ['Datos', 'Tecnologías y decisiones.']]),
    acc('Decisiones técnicas', [['¿Por qué esta tecnología?', 'Justificación.'], ['¿Qué alternativas evaluamos?', 'Comparación breve.']]),
    donut('Ejemplo: composición del código (edita estos datos)', [['Frontend', 45], ['Backend', 35], ['Datos', 20]], 'Muestra dónde se concentra el esfuerzo.'),
    links('Código y documentación', [['Repositorio', 'Código fuente'], ['Documentación', 'Guía técnica']])
  ]),
  T('solucion-impacto', 'solution', 'Impacto y resultados', 'Métricas', 'Cifras animadas, gráficos de resultados y una conclusión.', C.amber, [
    hero('Resultados', 'Lo que logramos', 'Evidencia real del impacto de la solución.'),
    stats('Resultados clave', [['85', '%', 'Mejora', 'Explica cómo se midió.'], ['120', '+', 'Usuarios'], ['3', 'x', 'Más rápido']]),
    bars('Ejemplo: resultados por etapa (edita estos datos)', '%', [['Prueba piloto', 40], ['Versión beta', 65], ['Lanzamiento', 85]], 'Cada barra es una etapa del proyecto.'),
    donut('Ejemplo: quién la usa (edita estos datos)', [['Estudiantes', 50], ['Profesionales', 30], ['Emprendedores', 20]]),
    callout('success', 'Aprendizaje principal', 'Resume lo más importante que descubriste.')
  ]),
  T('solucion-aprendizajes', 'solution', 'Aprendizajes', 'Retrospectiva', 'Proceso, retrospectiva en tablero y lecciones giratorias.', C.rose, [
    hero('Retrospectiva', 'Lo que aprendimos', 'El proceso detrás de la solución, con honestidad.'),
    timeline('El proceso', [['Inicio', 'Primera idea', 'Qué pensábamos al empezar.'], ['Mitad', 'Giro', 'Qué cambió y por qué.'], ['Final', 'Entrega', 'Cómo terminó.']]),
    kanban('Retrospectiva', [['Qué funcionó', ['Aprendizaje 1']], ['Qué mejorar', ['Aprendizaje 2']], ['Próximos pasos', ['Acción 1']]]),
    flip('Lecciones', [['🧩', 'Lección 1', 'Explica.'], ['⏱️', 'Lección 2', 'Explica.'], ['🤝', 'Lección 3', 'Explica.']]),
    cta('Construyamos juntos', 'Si te interesa continuar esta solución, escríbenos.', 'Contactar')
  ]),

  /* ═════════════ PROYECTOS Y SEMILLEROS ═════════════ */
  T('proyecto-ficha', 'project', 'Ficha del proyecto', 'Ficha', 'Problema, solución, equipo y llamado para unirse.', C.cyan, [
    hero('Proyecto', 'Nombre del proyecto', 'Qué busca lograr y para quién.', 'Unirme'),
    stats('Estado actual', [['4', '', 'Integrantes'], ['2', '', 'Vacantes'], ['30', '%', 'Avance']]),
    tabs('El proyecto', [['Problema', 'Qué problema aborda.'], ['Solución', 'Cómo lo resuelve.'], ['Público', 'A quién beneficia.']]),
    people('Equipo', [['Nombre Apellido', 'Líder', 'Responsable del proyecto.', 'Producto'], ['Nombre Apellido', 'Desarrollo', 'Qué construye.', 'Código']]),
    cta('Súmate al proyecto', 'Revisa los roles abiertos y postúlate.', 'Ver roles')
  ]),
  T('proyecto-roadmap', 'project', 'Roadmap', 'Hitos', 'Hoja de ruta con hitos, avance por área y tablero de tareas.', C.violet, [
    hero('Roadmap', 'Hacia dónde vamos', 'Las etapas del proyecto y su estado.'),
    timeline('Hitos', [['Mes 1', 'Investigación', 'Entender el problema.'], ['Mes 2', 'Prototipo', 'Primera versión usable.'], ['Mes 3', 'Validación', 'Pruebas con usuarios reales.']]),
    bars('Ejemplo: avance por área (edita estos datos)', '%', [['Investigación', 90], ['Diseño', 60], ['Desarrollo', 30]]),
    kanban('Tareas', [['Por hacer', ['Definir métricas']], ['En curso', ['Prototipo de pantalla principal']], ['Listo', ['Entrevistas iniciales']]]),
    checklist('Hitos cumplidos', ['Equipo conformado', 'Problema validado', 'Primer prototipo'])
  ]),
  T('proyecto-semillero', 'project', 'Semillero de investigación', 'Semillero', 'Cómo funciona el semillero, líneas de trabajo y personas.', C.green, [
    hero('Semillero', 'Nombre del semillero', 'Un espacio para investigar y construir con apoyo de mentores.'),
    steps('Cómo participar', [['Conoce las líneas', 'Revisa los temas de investigación.'], ['Postúlate', 'Cuéntanos tu interés.'], ['Trabaja en equipo', 'Reuniones periódicas y metas claras.']]),
    acc('Líneas de investigación', [['Línea 1', 'Descripción.'], ['Línea 2', 'Descripción.']]),
    people('Mentores', [['Nombre Apellido', 'Mentor/a', 'Área de experiencia.', 'Investigación']]),
    links('Publicaciones y avances', [['Resultado 1', 'Descripción']]),
    cta('Ingresa al semillero', 'Convocatoria abierta.', 'Postularme')
  ]),
  T('proyecto-mvp', 'project', 'Camino al MVP', 'Producto', 'Tablero de producto, madurez en radar y checklist de lanzamiento.', C.amber, [
    hero('MVP', 'De la idea al producto mínimo', 'Qué construimos primero y por qué.'),
    kanban('Backlog', [['Por hacer', ['Pantalla de inicio', 'Registro de usuarios']], ['En curso', ['Primer flujo completo']], ['Listo', ['Diseño base']]]),
    radar('Ejemplo: madurez del producto (edita estos datos)', [['Idea', 90], ['Diseño', 70], ['Código', 40], ['Pruebas', 20], ['Usuarios', 10]], 'Muestra qué tan avanzado está cada frente.'),
    checklist('Listo para lanzar', ['Flujo principal funciona', 'Probado con 5 personas', 'Sin errores críticos']),
    callout('info', 'Meta del MVP', 'Describe en una frase qué debe lograr la primera versión.')
  ]),
  T('proyecto-vacantes', 'project', 'Se buscan colaboradores', 'Vacantes', 'Roles abiertos, un test para elegir el tuyo y preguntas frecuentes.', C.rose, [
    hero('Convocatoria', 'Buscamos colaboradores', 'Hay un lugar para ti en este proyecto.', 'Postularme'),
    people('Roles abiertos', [['Desarrollo frontend', 'Vacante', 'Construir la interfaz.', 'React'], ['Diseño UX', 'Vacante', 'Diseñar la experiencia.', 'Figma'], ['Datos', 'Vacante', 'Analizar y visualizar.', 'Python']]),
    chooser('¿Cuál rol me encaja?', [['Me gusta construir', 'Desarrollo frontend.'], ['Me gusta investigar usuarios', 'Diseño UX.'], ['Me gustan los números', 'Datos.']]),
    acc('Preguntas frecuentes', [['¿Cuánto tiempo se necesita?', 'Respuesta.'], ['¿Es remunerado?', 'Respuesta.']]),
    cta('Da el primer paso', 'Cuéntanos qué te motiva.', 'Postularme')
  ]),

  /* ═════════════ COMUNIDAD ═════════════ */
  T('post-anuncio', 'post', 'Anuncio', 'Novedad', 'Para compartir una novedad con destacado y llamado a la acción.', C.cyan, [
    hero('Novedad', 'Titular de tu anuncio', 'Resume en una línea lo más importante.'),
    callout('info', 'Lo esencial', 'Explica qué cambia y a quién afecta.'),
    stats('En breve', [['1', '', 'Dato clave'], ['2', '', 'Dato clave']]),
    cta('¿Qué sigue?', 'Indica la acción que esperas de la comunidad.', 'Participar')
  ]),
  T('post-reto', 'post', 'Reto de la comunidad', 'Reto', 'Un reto con pasos, checklist de avance y llamado a compartir.', C.green, [
    hero('Reto', 'Reto de la semana', 'Participa y comparte tu resultado.'),
    steps('Cómo participar', [['Lee el reto', 'Explica el objetivo.'], ['Hazlo', 'Indica cómo ejecutarlo.'], ['Compártelo', 'Cuéntalo en los comentarios.']]),
    checklist('Tu avance', ['Entendí el reto', 'Lo resolví', 'Lo compartí']),
    cta('Comparte tu resultado', 'Cuéntanos cómo te fue en los comentarios.', 'Compartir')
  ]),
  T('post-pregunta', 'post', 'Pregunta abierta', 'Debate', 'Plantea una pregunta, ofrece perspectivas y abre la conversación.', C.violet, [
    hero('Debate', '¿Pregunta para la comunidad?', 'Queremos conocer tu opinión.'),
    chooser('¿Cuál es tu postura?', [['Postura A', 'Argumento a favor.'], ['Postura B', 'Argumento en contra.'], ['Depende', 'Matices a considerar.']]),
    acc('Perspectivas', [['Perspectiva 1', 'Descripción.'], ['Perspectiva 2', 'Descripción.']]),
    callout('info', 'Cómo participar', 'Responde con respeto y comparte ejemplos concretos.')
  ]),
  T('post-historia', 'post', 'Historia o aprendizaje', 'Historia', 'Cuenta tu proceso: línea de tiempo, ideas giratorias y una lección.', C.amber, [
    hero('Historia', 'Lo que aprendí construyendo…', 'Una experiencia contada con honestidad.'),
    timeline('Mi recorrido', [['Inicio', 'Cómo empecé', 'Contexto.'], ['Reto', 'Lo difícil', 'Qué salió mal.'], ['Hoy', 'Lo que logré', 'Resultado.']]),
    flip('Lo que haría distinto', [['🔁', 'Cambio 1', 'Explica.'], ['📌', 'Cambio 2', 'Explica.']]),
    callout('success', 'La lección', 'Resume el aprendizaje principal en una frase.')
  ]),
  T('post-recursos', 'post', 'Recursos recomendados', 'Lista', 'Una selección de recursos con descripción y preguntas frecuentes.', C.blue, [
    hero('Recomendados', 'Mi lista de recursos sobre…', 'Lo mejor que encontré, ordenado.'),
    links('Empieza aquí', [['Recurso 1', 'Por qué lo recomiendo'], ['Recurso 2', 'Por qué lo recomiendo'], ['Recurso 3', 'Por qué lo recomiendo']]),
    acc('¿Por dónde empiezo?', [['Soy principiante', 'Recomendación.'], ['Ya tengo experiencia', 'Recomendación.']]),
    cta('¿Conoces otro?', 'Compártelo en los comentarios.', 'Aportar')
  ])
];

// Avances comparten el motor, con cinco puntos de partida propios.
CATALOG.push(...CATALOG.filter(t => t.kind === 'project').map((t,i) => ({...t,id:'update-'+i,kind:'update' as Kind,name:['Avance de sprint','Hitos y resultados','Experimento validado','Riesgos y decisiones','Próximos pasos'][i],description:'Presenta el avance de tu proyecto y personaliza todos sus bloques.'})));

export const pageTemplates = (kind: Kind) => CATALOG.filter(t => t.kind === kind);
export const templateById = (id: string) => CATALOG.find(t => t.id === id);
