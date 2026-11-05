# nextONE 1.8 — Leer primero

Parte de la 1.7. Hay **una migración nueva**, `024_peers_segments_polls.sql`. Es aditiva y se puede repetir: no borra datos. Se aplica **después de la 023**.

## Qué cambia

- **Tres audiencias.** Cada contenido puede ser *solo makers*, *solo peers* o *makers + peers*. La regla se aplica en la base de datos, en lectura, comentarios, materiales hijos e inscripciones, no solo en el menú. El equipo (administración, organización y mentores) ve las tres audiencias. El mentor asignado a una sesión solo para peers la ve aunque sea maker.
- **«Peers» en toda la interfaz.** Los suscriptores se llaman *peers* (Peers Community Pass). En la base siguen siendo `access_tier='subscriber'`, para no romper datos ni la integración con Nodi.
- **«¿Qué buscas?»: seguimiento por persona.** Cada maker o peer elige objetivos, retos, formatos, horario y etapa. El cuestionario aparece en Comunidad (una vez) y en Mi perfil. Solo lo ve administración.
- **Segmentos y mentorías grupales por necesidad.** En Indicadores y en Administración, «Qué busca la comunidad» muestra gráficos de objetivos, retos y formatos, junto con la tabla de personas. Desde ahí se asignan segmentos a una o varias personas y se exporta a CSV. También sugiere grupos de unas 10 personas con retos parecidos (tamaño ajustable), como se decidió el 4 de noviembre.
- **Encuestas en Comunidad.** Nueva pestaña *Encuestas*. Administración y organización crean encuestas con preguntas de opción única, varias opciones, escala 1–5 o texto. Se dirigen a una audiencia y, si se quiere, a un segmento. Pueden ser anónimas, tener cierre automático y mostrar resultados a quien ya respondió. Cada persona responde una vez. Las respuestas abiertas solo las ve el equipo y nunca con el nombre.
- **Indicadores visuales.** Tarjetas de color con mini tendencia, área con detalle por día (cursor o flechas del teclado), donas, medidores, embudo y barras. Usan los colores de Makers, validados para daltonismo en claro y oscuro, y cada gráfico trae texto alternativo o tabla.
- **Avatar.** Estudio con pestañas (rostro, cabello, ropa, accesorios y pose), 8 estilos de partida diversos y 10 tonos de piel. Nuevos peinados (locs, rizos afro largos, largo ondulado, raya al lado, rapado y puff alto) y prendas (blusa, enterizo y cárdigan). También hiyab, turbante, argollas, perlas, flor y audífono auditivo, rostro corazón, silueta con curvas, maquillaje (pestañas o labios con color), pecas, lunar y rubor. Se guarda con `save_profile_avatar_v4`; los perfiles anteriores se siguen viendo igual.
- **Calendario al inscribirse.** Al inscribirse en un evento o una mentoría aparece «¡Listo! Guárdalo en tu calendario», con Google Calendar, Outlook, Outlook de trabajo y archivo .ics (Apple), que incluye un recordatorio 30 minutos antes. No se piden permisos ni se conecta ninguna cuenta.

## Instalación en Supabase

1. Comprueba que la 023 esté aplicada: `select to_regclass('public.maker_registry');` debe devolver un valor.
2. Haz una copia de seguridad.
3. Ejecuta **solo** `supabase/migrations/024_peers_segments_polls.sql`, completo, en el SQL Editor.
4. Comprueba: `select to_regclass('public.community_polls'), to_regclass('public.member_intents');`

Reversión: `supabase/rollback/024_revert.sql`. **Borra encuestas, respuestas y seguimiento**, y pasa el contenido «solo peers» a «solo makers».

No ejecutes `INSTALAR_NEXTONE.sql` sobre una base existente. En un proyecto nuevo y vacío: primero el instalador y después todas las migraciones de `supabase/migrations/`, en orden.

## Verificaciones

- `pnpm build` (estructura, TypeScript y Vite), `pnpm test` y `pnpm test:seo`: correctos. `pnpm test` incluye ahora `scripts/peers-check.mjs`, que prueba la 024 con PostgreSQL y RLS locales: audiencias, segmentos, encuestas, avatar v4, repetición de la migración y reversión.
- Navegador (Chrome, base local PGlite con RLS real y transporte de prueba): `test:peers-browser` (nuevo), `test:mentorship-browser`, `test:launch-browser`, `test:profile-browser` y `test:fellowship-browser`, correctos. Para ejecutarlos, compila antes con `VITE_SUPABASE_URL=https://nextone-test.supabase.co`, `VITE_SUPABASE_PUBLISHABLE_KEY=test-only` y `VITE_GOOGLE_LOGIN_ENABLED=true`.
- `test:admin-browser` y `test:onboarding-browser` ya fallaban en la 1.7: esperan la pantalla «Tu solicitud está pendiente», que no existe desde la 1.6. No se corrigieron en esta entrega.
- No se probaron Supabase real, Google u Outlook reales ni correos reales.
