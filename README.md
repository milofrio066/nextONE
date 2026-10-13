# nextONE · comunidad interactiva

Aplicación consolidada React 19 + TypeScript + Vite + Supabase. La aplicación productiva está ahora en la raíz de este proyecto. La demo antigua se conserva en un ZIP independiente y no interviene en el despliegue.

## Puesta en marcha

Node.js 22 o superior. Desde esta carpeta:

```sh
pnpm install --frozen-lockfile
cp .env.example .env.local
pnpm dev
pnpm check:types
pnpm test
pnpm build
```

En Windows, copia .env.example a .env.local con tu explorador o PowerShell. Completa VITE_SUPABASE_URL y VITE_SUPABASE_PUBLISHABLE_KEY con los valores públicos de tu proyecto. No uses service_role ni un secreto OAuth. Google aparece cuando VITE_GOOGLE_LOGIN_ENABLED=true y el proveedor está habilitado en Supabase.

## Supabase

Si tu base ya tiene las migraciones 001, 002 y 003, esta actualización no requiere SQL adicional. No vuelvas a ejecutar los instaladores sobre tablas existentes.

Para una base nueva, ejecuta supabase/INSTALAR_NEXTONE.sql una vez y después supabase/migrations/003_projects.sql una vez; el instalador ya incluye 001 y 002. Como alternativa, ejecuta 001, 002 y 003 en orden, sin ejecutar el instalador combinado. Después de registrarse, una persona queda pendiente o entra mediante invitación; utiliza supabase/activate-admin.sql con el correo correcto para el primer administrador.

En Authentication → Providers, conserva GitHub y Google y habilita Email con Confirm email activado. Configura un SMTP propio y revisa la entrega de correos de confirmación y recuperación.

Site URL: https://nextone-opal.vercel.app

Redirect URLs autorizadas:

- https://nextone-opal.vercel.app
- https://nextone-opal.vercel.app/?recovery=1
- http://127.0.0.1:5173
- http://127.0.0.1:5173/?recovery=1
- http://127.0.0.1:4173
- http://127.0.0.1:4173/?recovery=1

Si usas localhost o un dominio propio, añade sus URL exactas. Los callbacks de los proveedores OAuth siguen siendo https://TU_PROYECTO.supabase.co/auth/v1/callback. Credenciales de proveedores y SMTP se configuran únicamente en Supabase.

El cliente mantiene PKCE. La confirmación y recuperación deben probarse abriendo el enlace en el mismo navegador desde el que se solicitó. El estado de recuperación se conserva en la URL y el cambio de contraseña requiere una sesión autenticada; el parámetro no concede una sesión ni evita la autorización de Supabase.

## GitHub y Vercel

Sube el contenido de esta carpeta como raíz del repositorio, sustituyendo la estructura antigua después de revisar el diff. No copies solamente archivos nuevos sobre las copias antiguas: quedarían duplicados. Conserva el ZIP de la demo como respaldo independiente.

En el proyecto existente de Vercel cambia Root Directory de nextONE-piloto-backend a la raíz (vacío o ./). Framework: Vite; build: pnpm build; salida: dist. Define las variables de .env.example para cada entorno que uses. Vercel conserva los encabezados de seguridad de vercel.json.

Una vez desplegado, prueba con cuentas reales GitHub, Google (si habilitado), registro por correo, confirmación, ingreso y recuperación. La instalación y pruebas locales no verifican tus credenciales ni la entrega real de SMTP. No se ejecutó push ni despliegue desde esta tarea.

## Contenido interactivo

Nueve tipos: eventos, webinars, recursos, speakers, builder cases, soluciones, proyectos, avances y publicaciones. Cada tipo conserva sus tres estructuras originales y añade cinco nuevas, con objetivos y bloques propios: diapositivas, línea de tiempo, mapa explorable, tarjetas y checklist. Total: 45 nuevas y 27 conservadas.

Studio permite modificar nombres y contenidos de bloques, añadir hasta doce, eliminar, ordenar, cambiar formato y probar la experiencia antes de guardar. Las soluciones utilizan las mismas cinco plantillas mediante el formulario de entrega de un builder case, conforme al flujo original; allí se usa el mismo editor por bloques con vista previa. Los miembros conservan los permisos de creación originales.

Las experiencias se guardan en content.body con una cabecera y separador de bloques. El contenido antiguo conserva su renderizado. No se agrega HTML arbitrario, scripts ni nuevas dependencias de animación. Los checklists reflejan progreso personal durante la visita, no se guardan como logros ni afectan estadísticas. Los cinco diseños se adaptan a móviles y respetan el modo claro/oscuro y la preferencia de movimiento reducido. Es un editor de recorridos estructurados inspirado en presentaciones interactivas; no implementa un lienzo libre de Genially ni edición de video.

## Indicadores

Filtros de sección y título, selección de métrica y orden; comparaciones por contenido, inscripciones/asistencia/accesos y reacciones. Tarjetas de resultados, media ponderada de utilidad, tasa de asistencia y exportación CSV filtrada. Mantiene la tabla detallada y permisos de content_metrics.

Los clics no representan asistencia ni permanencia. La utilidad es una percepción. Los participantes son únicos dentro de cada contenido y no se suman como personas únicas de la comunidad. Los datos son acumulados: no hay series temporales ni un filtro de fecha inventado.

## Verificación

pnpm test ejecuta Vitest y las suites de PostgreSQL/RLS con PGlite. pnpm check:types verifica TypeScript; pnpm build genera producción. El proyecto original no incluye una configuración de ESLint: no se afirma haber ejecutado lint.

Las suites de navegador usan Chrome instalado y Playwright. Para repetirlas, construye temporalmente con VITE_SUPABASE_URL=https://nextone-test.supabase.co, VITE_SUPABASE_PUBLISHABLE_KEY=test-public-key y VITE_GOOGLE_LOGIN_ENABLED=true; ejecuta pnpm preview en otra terminal. Después ejecuta node scripts/pilot-browser-check.mjs y node scripts/email-browser-check.mjs. Todas las respuestas HTTP de Supabase son adaptadores de prueba; la suite de participación ejecuta las RPC contra PostgreSQL/PGlite con RLS real. No uses los valores de prueba para producción.

Referencias de configuración: [Supabase Auth](https://supabase.com/docs/guides/auth/passwords), [Vercel Root Directory](https://vercel.com/docs/project-configuration/general-settings).
