# nextONE 1.6 — Leer primero

Esta entrega parte de `entrega-repositorio.rar` recibido el 3 de noviembre de 2026. Conserva las mentorías de Claude y las funciones anteriores. No se publicó ni se conectó la base externa de Makers.

## Qué cambia

- Identidad del PDF: Inter local; negro, blanco, lila #8896F5 y verde #5FCD9E; rosa #EEA2F3 y amarillo #FCC368 como complementos. Degradados verde/lila y dibujos de la portada suministrada, sin sustituir los portafolios personales.
- Dos recorridos: maker con código personal, correo confirmado y usuario; aspirante a suscripción con selección de RRHH. GitHub/Google y recuperación de contraseña se conservan.
- Makers: la cuenta se activa automáticamente después de validar código personal + correo confirmado contra el registro privado. El primer perfil sigue siendo obligatorio. El código solo se vincula a una cuenta y las cuentas suspendidas no se reactivan.
- Consulta por correo o celular internacional: envía una verificación al CORREO de la base de Makers. Tras verificar, muestra por separado código personal y referido. No envía SMS. Tiene caducidad de 10 minutos, cinco intentos, un solo uso y límites por contacto y dirección del solicitante.
- CV PDF con texto, DOCX o TXT: lectura local, máximo 5 MB/15 páginas PDF; propone nombre, presentación, habilidades reconocibles y enlaces. Revisión editable antes de completar campos vacíos. No sube el archivo, no usa IA, no hace OCR ni inventa historial laboral. País, región y ciudad siguen siendo declarados por la persona.
- Todos los contenidos tienen audiencia `Solo makers` o `Toda la comunidad`. Los permisos se comprueban en PostgreSQL, incluyendo materiales y antecesores. Los suscriptores pueden acceder al catálogo compartido y a la comunidad. Las mentorías conservan inscripción, confirmación, grabación y encuestas.
- Los eventos exclusivos se muestran a suscriptores solo como título/fecha con candado; no se entregan descripción, archivos ni enlaces privados.
- Beneficios: crear, editar, publicar, vencer y eliminar por administración. Códigos y enlaces solo visibles a makers autorizados. La sección se muestra bloqueada a suscriptores.
- Referido separado del código personal; se comprueba cuando el registro de Makers esté habilitado. Mientras esté desconectado queda pendiente. No evita selección ni concede beneficios. El 25 % del documento no se cobra ni se calcula: pagos apagados.

## Qué permanece pendiente por decisión del equipo

1. Base externa de Makers: NO está conectada. Existe una tabla privada preparada, vacía. No se cargaron correos, celulares ni personas reales.
2. Enlace Nodi: NO inventado. El botón indica que RRHH debe facilitarlo. El CV local no depende de Nodi. La selección, carta de motivación y entrevista pertenecen al proceso externo de RRHH; aquí se registra el inicio del proceso, sin simular resultados.
3. Stripe: NO hay cobros, checkout, renovaciones ni altas automáticas de suscriptores nuevos. Se conserva el acceso de cuentas que ya estén activas. La migración impide activar pagos por un cambio accidental del indicador.
4. Aceptación de RRHH, precio/plan y conexión de pagos requieren trabajo posterior y validación. No se está prometiendo una integración lista con Nodi ni Stripe.
5. Los correos de consulta necesitan remitente con dominio verificado en Resend para destinatarios distintos del dueño de la cuenta. Los avisos ya existentes se conservan.
6. No se añade matching automático de cofundadores, placements ni servicios de inversión; se mantienen directorio, comunidad y proyectos. El programa y beneficios exclusivos no se otorgan a suscriptores.

## Primero prueba, después publica

### 1. Conserva un respaldo

Descarga el código actual y conserva acceso a la base. Usa primero un proyecto Supabase de pruebas y una rama `prueba-lanzamiento` en GitHub Desktop. No reemplaces la base en producción con una instalación desde cero.

### 2. Migración incremental

En Supabase → SQL Editor → New query, ejecuta primero esta consulta de comprobación:

```sql
select to_regprocedure('public.publish_mentorship(jsonb,jsonb,jsonb)') as mentoria,
       to_regprocedure('public.admin_member_monthly(uuid,date,text,text,integer)') as indicadores;
```

- Si `mentoria` tiene valor: 022 ya está instalada. Ejecuta SOLO `supabase/migrations/023_launch_access.sql`, completo.
- Si `mentoria` sale vacío: ejecuta primero `022_mentorships.sql`, completo; luego `023_launch_access.sql`.
- Si `indicadores` sale vacío o hay otro error: detente y revisa la versión instalada. No ejecutes 001–021 otra vez sobre una base existente.
- La 023 está verificada para repetirse sin borrar datos. Conserva usuarios, publicaciones y estados existentes. Por seguridad, el contenido anterior queda solo makers, salvo mentorías que ya estaban compartidas; edita las publicaciones que quieras abrir a toda la comunidad.

Comprueba al terminar:

```sql
select public.launch_config();
select to_regprocedure('public.claim_maker_code(text)'),
       to_regprocedure('public.publish_scoped_content(jsonb,jsonb,jsonb,jsonb,text)');
```

Debes ver `registry_enabled: false`, `nodi_url: null`, `payments_enabled: false`. Es el estado esperado antes de conectar proveedores.

### 3. Copia en GitHub Desktop

Repository → Show in Explorer. En esa carpeta deben quedar directamente `package.json`, `src`, `api`, `public`, `scripts`, `setup` y `supabase`.

Copia el CONTENIDO de la carpeta `nextONE` de este ZIP en esa raíz. Conserva `.git`, tus archivos `.env` privados y la configuración de Vercel. No copies una carpeta `nextONE` dentro de `src`. No subas `node_modules`, `dist`, `.env`, currículums ni la base privada de Makers. `.env.example` sí se puede subir.

Para ver cambios antes de publicarlos: usa la rama de pruebas y un despliegue Preview conectado a Supabase de pruebas. No mezcles Preview con credenciales/base de producción sin evaluar que las escrituras usarían datos reales.

### 4. Ver localmente

Instala Node 24. En una terminal abierta en la raíz:

```text
corepack pnpm install --frozen-lockfile
corepack pnpm dev
```

Abre la dirección que indique la terminal (normalmente http://127.0.0.1:5173). Completa `.env.local` con las variables públicas de tu Supabase de pruebas siguiendo `.env.example`. Nunca pongas `service_role` en variables `VITE_`.

### 5. Publicación

Después de probar: Summary `Preparar lanzamiento 1.6: identidad Makers, doble ingreso y permisos por audiencia`; Commit y Push origin en la rama elegida. El asistente no hizo commit ni push. Mantén Root Directory de Vercel vacío si el proyecto vive en la raíz, Build `npm run build`, Output `dist`.

## Configuración posterior — no hacer hasta tener datos y autorización

- `launch_settings.registry_enabled` y `MAKERS_REGISTRY_ENABLED=true` en Vercel habilitan conjuntamente la consulta. Ambos están apagados por defecto. La tabla privada `maker_registry` debe llenarse desde servidor con un listado autorizado, correos en minúscula y teléfonos E.164. Nunca comitees ese listado ni credenciales de la base externa.
- La base debe contener DOS columnas de código distintas: `access_code` personal (mínimo 8 caracteres) y `referral_code` compartible. Si el sistema actual usa un mismo código público para ambas cosas, no lo reutilices como contraseña de ingreso: genera el personal y acuerda el mapeo con Carlos.
- Para consultar: `APP_ORIGIN` (origen exacto del sitio), `VITE_SUPABASE_URL` o `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `ADMIN_NOTIFICATION_FROM` verificado y `MAKERS_REGISTRY_ENABLED`. Valores solo del servidor, sin prefijo VITE salvo URL pública. No se necesitan claves Stripe ni Nodi para esta entrega.
- Cuando RRHH entregue un enlace HTTPS real, se configura `launch_settings.nodi_url` desde un entorno administrativo. No expongas permisos de escritura de esa tabla al navegador.
- No cambies `payments_enabled`: la futura integración de pagos necesita una nueva migración, estados, pruebas y aprobación del equipo.

## Responsabilidades de Juan Camilo en esta entrega

Implementación y pruebas de interfaz, onboarding, CV alternativo, vinculación segura con códigos, audiencia en base/API/interfaz y beneficios/mentorías; preparar migraciones, respaldo y entrega al repositorio con Carlos. La carga de personas y activación de proveedores se realiza posteriormente con accesos y autorización.

Depende de Carlos: mapeo/listado/códigos y repositorio; de RRHH/Gaby: enlace, selección y resultados; de Santiago/finanzas: activación y condiciones de pagos. No se implementaron campañas de marketing, entrevistas de IA ni cobros como si ya estuvieran aprobados.

## Verificaciones

Consulta `VERIFICACIONES_1.6.md`. Las pruebas locales usan PostgreSQL embebido (PGlite), autenticación/transporte de prueba y Chrome. No equivalen a verificar el Supabase real, emails reales ni las cuentas OAuth del servidor.

Referencias técnicas: [PDF.js](https://mozilla.github.io/pdf.js/api/draft/api.js.html), [Mammoth](https://github.com/mwilliamson/mammoth.js). Solo se extrae texto del CV; nunca se interpreta como HTML.
