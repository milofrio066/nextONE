# nextONE · diseño y colaboración v0.3

## Actualizar el piloto que ya está publicado

1. En Supabase SQL Editor ejecutar **solo** `supabase/migrations/003_projects.sql` una vez. No volver a ejecutar `INSTALAR_NEXTONE.sql`, 001 ni 002 en el proyecto existente. La migración agrega equipos, tareas y conversación privada; conserva usuarios, eventos, comentarios, votos e invitaciones.
2. Extraer el paquete y subir la carpeta `nextONE-piloto-backend` a la raíz del repositorio GitHub existente, reemplazando los archivos de esa misma carpeta. Root Directory de Vercel continúa siendo `nextONE-piloto-backend`.
3. Esperar el despliegue Ready y recargar la página. Las dos variables de Supabase ya configuradas permanecen iguales. No agregar secretos al frontend.
4. Probar con administrador y un miembro: crear proyecto con plantilla, agregar un rol con cupo, postular al miembro, aprobarlo, asignar tarea, enviar mensaje privado y documentar un avance.

## Cambios de esta versión

- Identidad visual azul/cian/violeta basada en el logo suministrado; tarjetas con portadas, buscador, navegación móvil y modos claro/oscuro.
- Valoración “señal de impacto” con cinco estados visuales y etiquetas; preserva la escala, los votos existentes y las métricas. Se puede cambiar o retirar una respuesta.
- 27 plantillas editables: tres por cada tipo de contenido (incluidas soluciones). Studio ofrece selección, personalización y vista previa para eventos, webinars, speakers, recursos, cases, proyectos, avances y publicaciones. Las soluciones ofrecen una selección de estructura en el formulario de entrega del case.
- Studio usa texto y formularios seguros; no admite HTML arbitrario, scripts ni embeds libres. Es un editor de plantillas de contenido, no un editor libre de animaciones como Genially.
- Comunidad con conversaciones, temas, búsqueda, directorio de miembros/habilidades y oportunidades de colaboración.
- Proyectos orientados a negocio o semilleros: definición de roles/cupos, solicitudes, aprobación por el líder, tablero de tareas, responsables, fechas, avances y conversación privada.
- El servidor impide la autoaprobación, superar los cupos y consultar tareas/chat de otros equipos. Salidas con motivo y decisiones registradas. No hay Realtime ni servicios de pago nuevos; el chat se actualiza al enviar o pulsar Actualizar conversación.
- Verificación local en Chrome contra PostgreSQL de prueba y comprobación de pantallas de 320, 390, 768, 1024 y 1440 píxeles. La prueba de sesión usa un adaptador local; OAuth alojado requiere comprobación con cuentas reales después de publicar.

## Arquitectura del piloto

Web de comunidad enfocada en eventos, webinars, aprendizaje y builder cases. Frontend React + TypeScript + Vite. Backend Supabase (Auth, PostgreSQL, RPC y Row Level Security). Sin datos ficticios en la web publicada y sin claves secretas en el navegador.

## Funciones del piloto

- Ingreso por Google o GitHub una vez habilitado el proveedor en Supabase.
- Solicitudes pendientes y aprobación del administrador; roles miembro, mentor, organizador y administrador; suspensión y registro de decisiones.
- Invitaciones con origen, vencimiento, revocación y cupos. Invitación individual: correo verificado y un uso. Invitación de cohorte: cupo compartido. Aprobar directamente o mantener pendiente.
- Crear y editar eventos, webinars, speakers, recursos, builder cases, publicaciones, proyectos de semillero y avances. Vincular contenidos y guardar borradores.
- Registro de eventos, cancelación y control de cupos en el servidor. Acceso privado de Zoom desde cinco minutos antes hasta el cierre. Asistencia confirmada por el organizador.
- Me gusta / no me gusta excluyentes, valoración de utilidad con cinco etiquetas, distribución, comentarios, retirada de votos y moderación en TODOS los tipos de contenido.
- Builder cases: inicio y entrega con hora del servidor, una solución por persona, enlace a una demo que se puede probar y comentarios/evaluaciones sobre la solución.
- Grabaciones como recursos enlazados al webinar. Reproductor integrado para enlaces de YouTube. El speaker sube su grabación a su cuenta externa; nextONE no almacena videos.
- Estadísticas por contenido, participantes únicos, utilidad, registros, asistencia, accesos, entregas y tiempo transcurrido. Exportación CSV. Actividad personal.
- Interfaz en español, adaptable a móvil y modo claro/oscuro. La traducción completa al inglés, IA, coworking en video nativo e integraciones universitarias avanzadas quedan fuera de este piloto.

## Instalación de Supabase (ya ejecutada en el proyecto de Camilo)

Proyecto: `aswvchwbuhazabbblbqs`.

En un proyecto NUEVO, ejecutar `supabase/INSTALAR_NEXTONE.sql` una sola vez y después `supabase/migrations/003_projects.sql` una sola vez en SQL Editor. Es la combinación de las migraciones 001 y 002. No ejecutarlas otra vez si ya se instaló el archivo combinado. No pegar claves secretas en ningún archivo del frontend.

### URLs de autenticación

Authentication → URL Configuration:

- Site URL: `https://nextone-opal.vercel.app`
- Redirect URLs: `https://nextone-opal.vercel.app` y `http://127.0.0.1:4173`
- Para desarrollo con Vite, añadir también `http://127.0.0.1:5173`.

### Ingreso con GitHub

1. GitHub → Settings → Developer settings → OAuth Apps → New OAuth App.
2. Nombre: nextONE. Homepage URL: `https://nextone-opal.vercel.app`.
3. Authorization callback URL: `https://aswvchwbuhazabbblbqs.supabase.co/auth/v1/callback`.
4. Registrar y generar Client secret. Introducir Client ID y Client secret SOLO en Supabase → Authentication → Sign In / Providers → GitHub → Enabled → Save.
5. No compartir ese secret por chat, GitHub, Vercel ni el código de la aplicación.

Google es opcional: añadir `VITE_GOOGLE_LOGIN_ENABLED=true` después de habilitarlo con las credenciales OAuth de tu proyecto de Google siguiendo https://supabase.com/docs/guides/auth/social-login/auth-google. No requiere un proveedor de correo para el flujo OAuth.

### Primer administrador

Después del primer ingreso a nextONE, la cuenta queda pendiente. En SQL Editor ejecutar `supabase/activate-admin.sql`, reemplazando `REEMPLAZAR_TU_CORREO` por el correo del usuario que acaba de iniciar sesión. El script solo activa ese usuario como fundador. No ejecutarlo sin revisar el correo.

Después, refrescar nextONE. Crear el primer evento desde la interfaz y gestionar los demás miembros desde Administración. No se importan ni se inventan participantes de Makers.

## Configuración local

Crear `.env.local` (no se sube a GitHub), con las dos variables de `.env.example`:

- `VITE_SUPABASE_URL`: URL pública del proyecto.
- `VITE_SUPABASE_PUBLISHABLE_KEY`: clave pública publishable o anon. NUNCA secret ni service_role.

```
pnpm install
pnpm dev
pnpm build
pnpm preview
```

## Vercel

Settings → Environment Variables: añadir las mismas dos variables para Production y Preview y volver a desplegar. Framework Vite, Build Command `npm run build`, Output Directory `dist`, Root Directory la raíz del repositorio. Vercel entrega el frontend; Supabase sigue siendo el backend aunque se cambie de alojamiento.

No es necesario pagar un servidor, dominio ni almacenamiento de video para este piloto. Confirmar que las cuentas estén en Free/Hobby y no activar upgrades. Vercel Hobby está destinado a uso personal no comercial; revisar el plan al pasar a uso institucional o comercial. Alternativa: Cloudflare Pages para el frontend estático.

## Seguridad y límites prácticos

- El servidor valida los roles, los cupos, los votos y los plazos. RLS protege lectura; no se permite escritura directa por REST. Los cambios se hacen mediante RPC autenticadas.
- El enlace privado de Zoom no aparece en consultas públicas ni en el contenido. Una vez mostrado, el usuario puede copiarlo: no se garantiza impedir su reenvío. La sala de espera y el control de acceso de Zoom siguen siendo necesarios.
- Obtener un enlace mide un acceso; no mide permanencia. La asistencia se verifica manualmente. Una nota expresa utilidad percibida, no demuestra aprendizaje. El tiempo del case es el intervalo inicio/entrega, no tiempo de trabajo activo.
- Este piloto usa consultas normales y actualización manual; no abre cientos de conexiones de Realtime. Los listados están pensados para un grupo pequeño, con el límite estándar de respuesta de Supabase. No está certificado para 1000 personas simultáneas.
- Free tiene límites de base de datos y transferencia y puede pausarse por inactividad. No ofrece una garantía de servicio 24/7 ni copias automáticas del plan Pro. Exportar la base antes de una presentación importante desde las herramientas de Supabase.
- Zoom gratuito tiene sus propios límites. Una sesión de 1000 personas durante dos horas requiere una licencia adecuada o una estrategia de transmisión externa. nextONE no elimina ese límite.
- No hay pagos, notificaciones masivas por correo, grabación nativa, IA de pago, archivos de hojas de vida ni información sensible en este piloto. El perfil permite describir experiencia y enlazar portafolio/LinkedIn.
- Reportes: revisión humana y decisiones registradas; no se suspende por el simple hecho de recibir un reporte.

## Validación

```
pnpm test
node scripts/backend-check.mjs
```

Las pruebas de backend ejecutan PostgreSQL local con PGlite: migración, RLS, roles, votos, comentarios, cupos, enlaces privados, invitaciones, entregas y suspensión. `scripts/pilot-browser-check.mjs` prueba la web en Chrome contra ese PostgreSQL con un adaptador de transporte y sesión SOLO para pruebas. Usar `NEXTONE_PLAYWRIGHT` si Playwright está instalado fuera del proyecto. No se introduce ese adaptador en el frontend ni en el despliegue.

La prueba local no sustituye verificar OAuth y el flujo completo contra el Supabase alojado con dos cuentas reales. `scripts/hosted-check.mjs` verifica con la clave pública la existencia y restricción de lectura anónima de tablas, sin privilegios de administrador.

Código de la demo anterior: `src/App.tsx` y `src/domain.ts`; se conserva como referencia y NO se monta en `src/main.tsx`. El piloto actual está en `src/pilot/`.

