# Makers Fellowship by nextONE · versión 1.5

## Qué cambia

- Identidad Makers verde, turquesa y lavanda usando los logos originales proporcionados. nextONE conserva su logo y aparece en «Fellowship by nextONE». Crédito discreto: «Founder de nextONE: Juan Camilo Marin». Los portafolios conservan sus temas personales.
- Indicadores exclusivos de administradores: tarjetas, actividad diaria seleccionable con ratón, toque o teclado, recorrido de inscritos/confirmados/acceso/asistencia, satisfacción, NPS y actividad por sección. Los informes anteriores, geografía y CSV siguen en un desplegable independiente con sus propios filtros.
- Trazabilidad privada por miembro con búsqueda, ubicación, últimas inscripciones y línea de interacciones paginada. Las consultas administrativas quedan auditadas. Las consultas de contenido se deduplican durante 15 minutos. Las reacciones, comentarios, registros, entregas y actividades interactivas compatibles conservan su historial existente.
- País, región/departamento y ciudad obligatorios también para miembros existentes. Los datos son declarados, privados para administración; no se usa GPS ni IP. Si ya existía una ubicación completa se conserva.
- Encuesta después de terminar cada evento/webinar nuevo al que la persona está inscrita. Bloquea navegación y operaciones protegidas hasta responder. Permite «No asistí», sin valoración inventada ni asistencia automática. Varias encuestas se responden una a una. En sesiones abiertas se revisan pendientes cada 30 segundos y al recuperar el foco. No se exigen encuestas retroactivas de eventos terminados antes de instalar 019.
- Confirmación voluntaria de participación separada de inscripción. Cancelar elimina la confirmación vigente. Las etapas se cuentan por separado: la asistencia importada no implica haber abierto el enlace desde nextONE.
- Reunión asociada a cada evento y listado comparativo. Zoom: webhook firmado, idempotente, coincidencia exacta por correo verificado de inscritos. Google Meet: sincronización mediante su API y la identidad Google vinculada a nextONE; nunca se comparan nombres. Se mantiene la verificación manual del organizador como alternativa.
- Aprendizaje reproduce enlaces YouTube válidos dentro de la plataforma (watch, youtu.be, live, shorts y embed). Ya no ofrece el botón externo para esos vídeos. YouTube puede conservar sus controles y enlaces propios y el autor debe permitir inserción; un vídeo privado o con inserción deshabilitada no puede forzarse a reproducir.
- Cola de correo de satisfacción elegible desde dos horas después del fin. Exclusión de cancelados, suspendidos y encuestas ya respondidas; bloqueo de procesamiento simultáneo e idempotencia del proveedor. Cinco intentos como máximo.

## Antes de actualizar

Conserva una copia de tu versión actual y un respaldo de la base. Prueba preferiblemente con otra base Supabase y un despliegue de prueba. Una Preview que comparte la base de producción también afecta datos reales.

No sobrescribas variables de Vercel ni el webhook administrativo anterior. Conserva cualquier etiqueta personal de verificación de Google Search Console añadida al HTML de tu repositorio.

## Archivos y orden

1. El ZIP completo contiene `nextONE/`: sube SU CONTENIDO a la raíz del repositorio. No subas la carpeta contenedora, `node_modules`, `dist` ni archivos `.env` privados. El ZIP de cambios sobre 1.3 ya incluye los cambios de 1.4.
2. Si todavía no aplicaste 018, aplica únicamente `018_onboarding_and_member_decisions.sql` antes de continuar. Para comprobarlo: `select column_name from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='onboarding_completed_at';`. Una fila significa que 018 está instalada. No repitas 001–017.
3. Publica el código 1.5 y espera Ready. El código permite la transición desde 018 mientras falta la nueva columna. Los indicadores nuevos requieren 019.
4. En SQL Editor, consulta nueva: ejecuta `019_fellowship.sql` una sola vez. Luego otra consulta: `020_event_delivery.sql` una sola vez. No ejecutes 018 de nuevo después de 019: reemplazaría funciones de acceso más recientes. Reserva una ventana breve para completar estas dos migraciones y revisar el resultado.
5. Recarga nextONE. Si tu ubicación estaba incompleta, el administrador también tendrá que completarla para acceder. Prueba una cuenta administradora y otra miembro.

Las migraciones añaden tablas/campos y sustituyen funciones de acceso; no eliminan publicaciones ni miembros. 019 renombra el RPC de onboarding para envolverlo con la validación obligatoria. No elimina la ubicación existente. 019 y 020 se ejecutan en transacciones; no se deben repetir tras Success.

Verificación sin datos personales:

```sql
select to_regclass('public.event_surveys') as encuestas,
       to_regclass('public.event_meetings') as reuniones,
       to_regclass('public.event_email_deliveries') as correos;
```

## Correo de satisfacción: configuración pendiente

Los avisos administrativos anteriores siguen funcionando por separado.

En Vercel, solo servidor, sin prefijo VITE_:

- `RESEND_API_KEY`: conserva la existente.
- `SUPABASE_SERVICE_ROLE_KEY`: conserva la existente.
- `APP_ORIGIN`: conserva `https://nextone-opal.vercel.app`.
- `EVENT_NOTIFICATION_FROM`: remitente de un dominio que hayas verificado en Resend, por ejemplo `Makers <comunidad@tu-dominio.com>`. El ejemplo no es una dirección real tuya. `onboarding@resend.dev` no sirve para enviar a toda la comunidad.
- `CRON_SECRET`: nuevo secreto aleatorio largo, diferente del secreto del webhook administrativo.

Después de guardar variables hay que volver a desplegar. Habilita Supabase Cron y pg_net. Crea en Vault los secretos `nextone_app_origin` y `nextone_cron_secret`; el segundo debe tener exactamente el valor de CRON_SECRET. Luego ejecuta `setup/event-reminders-cron.sql`, que contiene referencias a Vault, sin claves reales. Ejecuta primero una prueba con tu propia cuenta y revisa los registros de Vercel/Resend.

La tarea corre cada cinco minutos: el primer intento será entre dos horas y dos horas cinco minutos después del fin, salvo retrasos del proveedor o cola. Procesa hasta 20 por ejecución; grandes eventos pueden requerir ampliar el procesamiento. Una respuesta HTTP aceptada por Resend no garantiza entrega en bandeja de entrada. No hay SMS: elegimos correo conforme a la solicitud; SMS requeriría proveedor, número y consentimiento adicional.

## Zoom: configuración pendiente

1. En la cuenta Zoom del organizador, configura una app con suscripciones de eventos y `meeting.participant_joined`.
2. URL: `https://nextone-opal.vercel.app/api/zoom-attendance`.
3. Guarda su secreto en Vercel como `ZOOM_WEBHOOK_SECRET` y vuelve a desplegar. Nunca lo publiques en GitHub ni en el navegador.
4. En el detalle del evento → seguimiento → Zoom, guarda el ID numérico de esa reunión.
5. Prueba una entrada real. Solo se confirma automáticamente si Zoom entrega un correo que coincide exactamente con una cuenta verificada e inscrita. Participantes sin correo o sin coincidencia requieren revisión. No reutilices el mismo ID para eventos simultáneos.

Documentación: https://developers.zoom.us/docs/api/meetings/events/

## Google Meet: configuración pendiente

La sincronización es un botón para consultar el informe real, sin marcar cada participante manualmente. No está conectada todavía a una cuenta organizadora.

1. Autoriza una cuenta organizadora mediante OAuth de Google con acceso a Google Meet REST API y el permiso `https://www.googleapis.com/auth/meetings.space.readonly`.
2. Guarda en Vercel `GOOGLE_MEET_CLIENT_ID`, `GOOGLE_MEET_CLIENT_SECRET` y `GOOGLE_MEET_REFRESH_TOKEN` (estos dos últimos Secret). Se requiere acceso sin conexión para renovar la autorización.
3. En seguimiento del evento → Meet, configura el identificador `conferenceRecords/…` de ESA sesión, obtenido del informe de Meet; no es el enlace `meet.google.com/...`.
4. Pulsa «Sincronizar asistencia de Google Meet». Se consultan todas las páginas del informe.
5. La identidad Google del participante debe estar vinculada a su cuenta nextONE. Usuarios anónimos, telefónicos o con otra cuenta quedan sin identificar. No se infiere asistencia por un clic ni por nombre.

Documentación: https://developers.google.com/workspace/meet/api/guides/participants

## Datos y límites

El aviso del pie de página explica el seguimiento. No se capturan pulsaciones, contraseñas, texto de conversaciones privadas, IP ni navegación fuera de nextONE. No existe reconstrucción de actividad anterior a su registro. El historial devuelve 50 acciones por página y las últimas 100 inscripciones por persona. Los responsables pueden ver la lista de sus eventos; solo administradores ven trazabilidad individual global.

La encuesta mide experiencia declarada; no certifica aprendizaje ni asistencia. NPS se calcula solo con respuestas de asistentes: porcentaje de 9–10 menos porcentaje de 0–6. Sin muestra se muestra «—». Las métricas históricas y los conteos actuales son conceptos separados.

## Comprobaciones

TypeScript, build de producción y SEO pasan. 51 pruebas unitarias y las suites SQL/API existentes pasan, además de las nuevas verificaciones de ubicación, bloqueo de encuesta, permisos, deduplicación de visitas, identidad de Meet, recibos de Zoom y cola de correo. Chrome local: indicadores y desbordamiento a 320/390/768/1440 px, trazabilidad administrativa, ubicación de miembro existente y encuesta con «No asistí».

Autenticación, transporte de Supabase y proveedores se simularon en pruebas; se usó SQL/RLS real en PostgreSQL local. No se han verificado tus cuentas hospedadas ni entrega real de correo, llamadas reales a Meet o webhooks reales de Zoom. No se ha publicado ni hecho push. El proyecto no define lint separado; se comprobó TypeScript.

Para repetir: `npm run build`, `npm test`, `npm run test:seo`, `npm run test:fellowship-browser`. La prueba del navegador necesita un build con las variables ficticias indicadas en el script y Chrome instalado.
