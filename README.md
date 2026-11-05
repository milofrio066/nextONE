# Entrega actual: nextONE 1.8

Empieza por [docs/LEER_PRIMERO_1.8.md](docs/LEER_PRIMERO_1.8.md): audiencias makers/peers, seguimiento y segmentos, encuestas, indicadores visuales, avatar y calendario. Incluye la migración 024. Antes: [docs/LEER_PRIMERO_1.7.md](docs/LEER_PRIMERO_1.7.md) y [docs/LEER_PRIMERO_1.6.md](docs/LEER_PRIMERO_1.6.md). Las guías de versiones anteriores están en [docs/historial/](docs/historial/) y describen el estado de su momento.

# nextONE 1.6

Ver [docs/LEER_PRIMERO_1.6.md](docs/LEER_PRIMERO_1.6.md).

# nextONE 1.5.2 · estructura y migración corregidas

Lee primero docs/historial/LEEME_1.5.2.txt.

# Makers Fellowship by nextONE · 1.5.1

Cambios visuales y migración nueva: [ACTUALIZAR_V151.md](docs/historial/ACTUALIZAR_V151.md).

# Makers Fellowship by nextONE · 1.5

Actualización y conexiones externas: [ACTUALIZAR_V15.md](docs/historial/ACTUALIZAR_V15.md).

> **Versión actual: nextONE 1.4.0.** Para instalar esta entrega, empieza por [ACTUALIZAR_V14.md](docs/historial/ACTUALIZAR_V14.md). Incluye la migración 018. Conserva la configuración de las versiones anteriores.

# nextONE 1.1

Plataforma de comunidad Makers: encuentros, aprendizaje, personas, retos, soluciones, proyectos y semilleros. React 19 + TypeScript + Vite + Supabase; una sola aplicación en la raíz.

**Para actualizar tu plataforma existente, sigue docs/historial/ACTUALIZAR_V11.md.** Las instrucciones de versiones anteriores se conservan como historial y no reemplazan esa guía.

## Desarrollo

Usa Node.js 24. Copia `.env.example` a `.env.local` y completa los valores públicos de tu proyecto. El cliente nunca debe recibir `service_role`, contraseñas de base de datos ni secretos OAuth.

```sh
pnpm install --frozen-lockfile
pnpm dev
pnpm check:types
pnpm test
pnpm build
pnpm test:browser:all
```

El archivo pnpm-lock.yaml mantiene las versiones instaladas y no cambió en esta entrega. En Windows, si pnpm no puede crear enlaces simbólicos, `npm install --package-lock=false` permite instalar sin reemplazar ese archivo. La comprobación con npm se realizó sin scripts de instalación. Las pruebas de navegador usan Chrome instalado; alternativamente instala Chromium con Playwright y define NEXTONE_BROWSER_CHANNEL=chromium. No son pruebas contra tu base de producción.

## Base de datos

La carpeta `supabase/migrations` contiene 001–014 en orden. Una base que ya tiene 001–012 solo necesita 013 y 014. Conserva el historial real de migraciones y usa la integración GitHub/Supabase existente. No vuelvas a ejecutar migraciones aplicadas ni el instalador histórico `INSTALAR_NEXTONE.sql` sobre tu plataforma.

En una instalación totalmente nueva, aplica 001–014 una vez, en orden, usando migraciones de Supabase. Después de registrar tu primera cuenta, `supabase/activate-admin.sql` permite activar al fundador sustituyendo el correo por el correcto. Las cuentas nuevas continúan pendientes de aprobación o invitación.

## Novedades de administración 1.1

Panel de control con tarjetas accionables, gráficos reales, bandejas desplegables y paginadas, búsqueda/estado, aprobación de ingreso con correo verificado, historial de revisión de reportes, prioridad y asignación, invitaciones con trazabilidad, alertas internas y cola de avisos por correo. Distribución global de miembros y actividad por país, región y ciudad declarados voluntariamente y protegidos por permisos.

Los avisos por correo necesitan configuración de Vercel y un Database Webhook en Supabase. No se envían con subir únicamente el ZIP. Consulta docs/historial/ACTUALIZAR_V11.md; los destinatarios se configuran fuera del código público.

El catálogo carga descripciones recortadas y obtiene el contenido completo al abrirlo. Administración, Indicadores y el editor de perfil se descargan bajo demanda. Las bandejas administrativas usan páginas de 20 y los detalles se consultan al desplegarlos. El directorio y el catálogo aún mantienen sus metadatos autorizados en memoria; esta versión no promete escalabilidad ilimitada ni sustituye mediciones de carga en producción.

## Flujos conservados

- Indicadores exclusivos de administradores en navegación, vista y funciones de base de datos, incluidas las funciones antiguas. Miembros y organizadores conservan la valoración pública de contenidos y su propia actividad.
- Retos: reglas, instrucciones, entregables, criterios ponderados, cupos, fechas, fases y gestión de participantes. Una publicación guarda metadatos, reglas y diseño de forma atómica.
- Participantes: explorar, filtrar, iniciar, salir antes de entregar, usar plantilla o lienzo en blanco, entregar prototipo HTTPS, revisar su solución o retirarla para reemplazarla mientras el reto lo permita.
- Evaluación: calificación comunitaria y feedback oficial separados; el organizador responsable evalúa cada criterio y obtiene un resultado ponderado. El reto no se finaliza con soluciones sin evaluación definitiva.
- Historial de revisiones de soluciones a partir de esta versión. El servidor bloquea las ediciones fuera de plazo, las revisiones deshabilitadas y las entregas con evaluación final. Administración mantiene capacidad de corrección.
- Indicadores: período Colombia UTC−5, personas únicas, acciones, media/mediana y distribución de utilidad, cohortes de inicio a entrega, días sin actividad, comparación histórica cuando hay base, tablas paginadas, exportaciones y pendientes de feedback. Los análisis de temas, metodologías, intereses y cohortes se conservan y se consultan al abrir su panel.
- Recuperación: solicitud, reenvío con espera, confirmación de contraseña, mostrar/ocultar, enlaces vencidos o usados, nueva solicitud y cierre opcional de otras sesiones. OAuth GitHub/Google se conserva. Consulta la configuración de correo en docs/historial/ACTUALIZAR_V1.md.
- Avatar vectorial animado: puntos de partida femenino/masculino/neutro, rasgos combinables, rostro, silueta, ojos, vello facial, once peinados, seis prendas y cinco opciones de movimiento. Se guarda en la cuenta, aparece en navegación/perfil/directorio y respeta reducir movimiento.

Se mantienen el catálogo de 45 composiciones interactivas, el editor por bloques, las estructuras anteriores, borradores recuperables, progreso sincronizado, redes y temas de perfil, selector Unicode, proyectos/evaluador independiente, evidencias, chat, invitaciones, moderación y eliminación autorizada.

## Despliegue

Sube **el contenido** del ZIP a la raíz de un repositorio independiente de la organización Makers. Incluye los archivos ocultos como `.gitignore` y `.env.example`. Para comprobar el proyecto localmente, usa Node.js 24 y ejecuta `pnpm install --frozen-lockfile`, `pnpm test` y `pnpm build`.

Si se autoriza un despliegue independiente, configura un proyecto separado en Vercel con el framework Vite, Node.js 24, la raíz del repositorio como directorio base y `dist` como salida. Usa solo las variables del entorno autorizado. Las referencias a `nextone-opal.vercel.app` en los metadatos SEO, el sitemap, robots.txt y el ejemplo de cron corresponden al dominio anterior. Actualízalas cuando se confirme el dominio nuevo. La subida del código y la aplicación de migraciones o del cron son pasos separados.

Variables públicas: VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY y VITE_GOOGLE_LOGIN_ENABLED. El asistente opcional de IA usa además APP_ORIGIN, OPENAI_API_KEY y OPENAI_MODEL solo en Vercel; conserva sus valores si ya funciona. Sin configuración devuelve una explicación y la ficha manual sigue disponible.

## Verificación

Consulta docs/historial/VERIFICACIONES.md. Las pruebas locales cubren reglas SQL/RLS y recorridos en navegador con transporte/Auth de prueba. El correo real, OAuth real, integración de migraciones, Storage alojado y despliegue deben comprobarse en tu cuenta después de actualizar. No se hizo push ni se cambió la base alojada desde esta entrega.
