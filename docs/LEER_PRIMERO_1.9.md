# nextONE 1.9 — Leer primero

Parte de la 1.8. Hay **una migración nueva**, `025_teaser_survey_reviews.sql`. Es aditiva y se puede repetir. Se aplica **después de la 024**.

## Qué cambia

- **Quién ve y quién entra.** Al publicar hay cinco opciones, con una vista previa de lo que verá cada grupo:
  - Pueden ver y entrar todos (makers + peers).
  - Solo makers.
  - Solo peers.
  - Entran los makers · los peers lo ven bloqueado.
  - Entran los peers · los makers lo ven bloqueado.

  El grupo bloqueado ve título, resumen, fecha y temas en una tarjeta con candado («También está pasando entre makers/peers»), en Inicio y en cada sección. No puede abrir el contenido, inscribirse, comentar ni ver enlaces; la base de datos lo impide, no solo la interfaz. Los eventos «solo makers» que ya existían quedan como «los peers lo ven bloqueado», que es como se comportaban en la 1.6–1.8. Los nuevos «solo makers» quedan ocultos para los peers, salvo que se elija la vista bloqueada.
- **Panel del organizador.** Reemplaza los tres bloques sueltos («Organizadores que evalúan», «Seguimiento de inscritos…» y «Registro y asistencia verificada…»). Incluye:
  - Indicadores de inscritos, confirmados, asistencia verificada y encuestas.
  - Embudo de participación.
  - Lista con filtros (por confirmar, confirmados, asistieron, cancelados), búsqueda y el recorrido de cada persona: inscrito, confirmó, enlace, asistió y encuesta.
  - Botón para verificar asistencia, una por una o todas las confirmadas.
  - Resultados de la encuesta, con satisfacción, NPS, distribución y comentarios sin nombre.
  - Organizadores asignados y la integración con Zoom o Meet, plegada.
  - Exportación a CSV.

  Lo ven y lo usan administración, quien publicó el evento y, desde ahora, los organizadores asignados. Asignar organizadores sigue siendo solo del responsable y de administración.
- **Encuesta de satisfacción.** Aparece **3 horas después de que termina** el evento y **solo** para quien confirmó su inscripción o tiene la asistencia verificada; antes la recibía cualquier inscrito justo al terminar. Es un recorrido por pasos: ¿asististe?, utilidad con caras de 1 a 5, recomendación de 0 a 10 y un comentario opcional. Sigue siendo obligatoria para continuar en la plataforma.
- **Feedback definitivo privado.** Lo ven solo administración, los organizadores responsables del evento o reto y la persona evaluada, que es quien publicó la solución o el contenido. Miembros y mentores no lo ven; la regla está en la base de datos (`final_reviews`). Nuevo diseño: anillo con la calificación, criterios y tres tarjetas (fortalezas, oportunidades y conclusión). La calificación se elige con estrellas.

## Instalación en Supabase

1. Comprueba que la 024 esté aplicada: `select to_regclass('public.community_polls');` debe devolver un valor.
2. Haz una copia de seguridad.
3. Ejecuta **solo** `supabase/migrations/025_teaser_survey_reviews.sql`, completo, en el SQL Editor.
4. Comprueba: `select count(*) from information_schema.columns where table_name='content' and column_name='teaser';` debe dar 1.

Reversión: `supabase/rollback/025_revert.sql`. Vuelve a las reglas anteriores y conserva las respuestas de encuestas.

Despliega el código después de aplicar la 025: la interfaz nueva llama a `publish_scoped_content_v2`, `locked_catalog`, `event_survey_summary`, `can_run_event` y `can_view_final_review`.

## Verificaciones

- `pnpm build`, `pnpm test` (81 pruebas de componentes y 29 suites de base de datos) y `pnpm test:seo`: correctos. Nueva prueba `scripts/teaser-check.mjs`: vista bloqueada sin exponer enlaces, encuesta a las 3 horas solo para confirmados, privacidad del feedback, panel del organizador, repetición y reversión.
- Ajustes de pruebas existentes por las reglas nuevas: `launch-check` (la vista bloqueada ahora es explícita), `mentorship-check` y `fellowship-browser-check` (la encuesta espera 3 horas y exige confirmación).
- Navegador (Chrome, base local con RLS real): `test:teaser-browser` (nuevo), `test:fellowship-browser`, `test:mentorship-browser`, `test:peers-browser`, `test:launch-browser` y `test:profile-browser`, correctos. Compila antes con `VITE_SUPABASE_URL=https://nextone-test.supabase.co`, `VITE_SUPABASE_PUBLISHABLE_KEY=test-only` y `VITE_GOOGLE_LOGIN_ENABLED=true`.
- No se probó contra el Supabase real.
