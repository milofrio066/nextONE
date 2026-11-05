# nextONE 1.7 — Leer primero

Parte del commit `6fc3f0e` (1.6) del 3 de noviembre de 2026. Conserva el doble onboarding, el CV, la consulta de códigos, los permisos por audiencia, los beneficios y las mentorías. **No hay migraciones nuevas**: en Supabase solo deben estar aplicadas 022 y 023, como indica `LEER_PRIMERO_1.6.md`.

## Qué cambia

- **Identidad de la guía de marca (TEMPLATE MAKERS):** negro y blanco como base, lila #8896F5 y verde #5FCD9E como principales, rosa y amarillo de complemento, degradado verde→lila e Inter Black en títulos.
- **Modo claro corregido:** las portadas de todas las secciones tenían el título blanco sobre fondo claro (contraste 1:1). Ahora cada tema tiene su versión: negra con dibujos en oscuro y clara con el mismo dibujo en claro. También se corrigieron el botón eliminar, la tabla de indicadores, el anillo de satisfacción, los avatares y las barras de progreso.
- **Dibujos de la portada del PDF** con fondo transparente (`public/brand/doodles-side.webp`). Sustituyen a `makers-doodles.webp`, que tenía fondo negro y no podía usarse en modo claro.
- **Interfaz más interactiva:** entrada suave del contenido, dibujos que flotan, tarjetas que se elevan con la línea del degradado, botones con degradado al pasar el cursor, íconos con la paleta del kit y portadas sin imagen en colores de marca. Todo se apaga con movimiento reducido.
- **Ingreso:** la pantalla «Vincula tu cuenta de maker» usa la portada de marca, marca qué recorrido está elegido y muestra la selección de suscripción como pasos numerados.
- **Pruebas de mentorías recuperadas:** no estaban en el repositorio. Vuelven a `pnpm test` y a `test:mentorship-browser`, adaptadas a las reglas 1.6.
- **Pagos:** `PLAN_STRIPE_Y_RESPONSABILIDADES.md` explica qué implica Stripe para la plataforma, qué hace Juan Camilo y qué depende de otras personas. Los pagos siguen apagados.

## Verificaciones

- Estructura, TypeScript, `pnpm test` (65 pruebas de componentes y 27 suites de base de datos), SEO y build: correctos.
- Auditoría de contraste en Chrome: 22 vistas en claro y oscuro, a 1280 y 390 píxeles. Ningún texto queda por debajo de AA. La única alerta es el anillo de satisfacción, revisado a ojo.
- `test:launch-browser` y `test:mentorship-browser`: correctos.
- `test:responsive` y `test:browser` fallan igual que en la 1.6 original: buscan títulos y pasos que la interfaz ya no tiene. No se corrigieron en esta entrega.
- No se probaron Supabase real, correos reales, Nodi ni Stripe.

## Copia al repositorio

Copia el **contenido** de esta carpeta en la raíz del repositorio, conservando `.git` y tus `.env`. GitHub Desktop debe mostrar solo los archivos listados en la respuesta de entrega.
