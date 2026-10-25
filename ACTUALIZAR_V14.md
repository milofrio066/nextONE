# nextONE 1.4 · Administración y bienvenida guiada

Base: versión 1.3 entregada anteriormente. Cambios centrados en gestión de miembros, justificaciones y primer ingreso.

## Qué cambia en administración
Las secciones quedan cerradas inicialmente para una vista más limpia: Ingresos y miembros → Invitaciones a Makers → Solicitudes de nombre → Reportes y moderación.
En la ficha de cada persona:
1. Elige todos los cambios de acceso, rol y cohorte. Todavía no se aplica nada.
2. Pulsa «Revisar cambios». Se muestra la comparación antes/después.
3. Escribe el motivo (mínimo 10 caracteres) y pulsa «Confirmar y guardar». Puedes volver atrás sin perder la propuesta.

Acceso, rol, cohorte y nota se guardan juntos. Si falla una validación, no se aplica una parte del cambio. Si otra persona cambió la cuenta mientras la revisabas, debes cargar los datos actuales antes de confirmar. Se conserva la protección que impide quitarte tu propio acceso de administración y la exigencia de correo confirmado para aprobar.
Para aprobar un ingreso, elige «Activo · aprobar acceso» en el campo Acceso, revisa los demás campos y continúa con la justificación. Una cuenta recién aprobada todavía debe crear su perfil antes de navegar.

## Dónde quedan las justificaciones
En la misma ficha abre «Historial privado de decisiones»:
- Nota escrita, administrador que la registró y fecha.
- Acceso, rol y cohorte anteriores y nuevos.
- Notas antiguas recuperadas de la auditoría que ya existía. Esos registros no incluyen una comparación de valores porque antes no se guardaba.

Solo los administradores pueden leer este historial. No aparece en el perfil público del miembro ni se envía por correo. Los registros nuevos se guardan en member_decisions y se mantiene la auditoría existente. El panel muestra hasta 100 registros recientes por persona.

## Registro y primer ingreso
El recorrido nuevo es:
Registro y confirmación de correo → espera de aprobación → bienvenida guiada → creación del perfil → navegación.

Mientras está pendiente, la persona solo ve el estado de la solicitud y, si corresponde, el campo para usar una invitación. No puede editar biografía, habilidades, intereses ni ubicación; también se bloquean los métodos antiguos de guardado en el servidor.
Después de la aprobación aparecen tres pasos:
1. Preséntate: nombre, apodo opcional, presentación de al menos 20 caracteres y habilidades.
2. Conecta y personaliza: intereses, enlaces y ubicación opcionales; avatar y tema como punto de partida.
3. Revisa tu perfil: vista previa y «Guardar perfil y entrar».

El perfil completo se guarda en una transacción. Si hay un error, la cuenta sigue en onboarding; no se habilita acceso a medias. Cambiar la URL no permite saltarse esta etapa. Las personalizaciones detalladas siguen disponibles en Mi perfil y actividad después de entrar.
La primera configuración sigue la regla existente de cambios de nombre. Si una cuenta antigua ya había consumido su cambio, conserva el nombre y podrá solicitar otro desde su perfil.
La aprobación se conserva si se cierra la página. Los datos del asistente que aún no se hayan guardado deberán volver a introducirse.

Las cuentas que YA ESTABAN ACTIVAS al instalar 018 conservan su acceso, perfiles y datos. No se obliga a los miembros actuales a repetir el registro ni se bloquea a los administradores existentes. Las cuentas pendientes y las nuevas aprobaciones sí pasan por la bienvenida. Repetir 018 no marca como completos a nuevos miembros que todavía están en el asistente.

## Instalar sobre la versión 1.3
1. En el proyecto correcto de Supabase, abre SQL Editor → New query.
2. Copia y ejecuta TODO supabase/migrations/018_onboarding_and_member_decisions.sql. Requiere 001–017 ya aplicadas. No vuelvas a ejecutar las anteriores.
3. Si aparece Success, continúa con el código. Esta migración admite repetición segura si la integración de GitHub también la procesa después.
4. Extrae el ZIP COMPLETO y sube el CONTENIDO de nextONE/ a la raíz de tu repositorio, reemplazando los archivos. No crees una segunda carpeta nextONE dentro del repositorio.
5. Como alternativa, usa SOLO-CAMBIOS exclusivamente sobre 1.3 y conserva sus rutas. No subas ambos paquetes.
6. Vercel: Node 24, Root Directory vacío, build npm run build, salida dist. Conserva todas tus variables actuales y cualquier etiqueta personal de verificación de Google que hayas añadido a index.html.
7. Espera Ready antes de probar nuevas aprobaciones. No necesitas claves nuevas ni cambios de Resend/webhooks.

El ZIP conserva las migraciones 001–017 y el lockfile sin cambios. Las portadas existentes, la sincronización, el SEO y los datos del servidor se conservan. Las instrucciones de entregas anteriores quedan como referencia histórica; para esta actualización sigue este documento.

## Comprobar después de publicar
- En tu cuenta administradora, abre una ficha. Comprueba que el motivo aparece DESPUÉS de elegir y revisar los cambios.
- Confirma un cambio y abre el historial privado de esa persona.
- Prueba con una cuenta nueva: antes de aprobar no debe aparecer el editor del perfil.
- Aprueba el ingreso. En la cuenta nueva debe aparecer la bienvenida, no el catálogo.
- Completa los tres pasos, guarda y verifica que ahora puede navegar. Al recargar no debe repetirse el asistente.
- Comprueba tu cuenta actual: debe seguir entrando normalmente.

## Verificaciones realizadas
- TypeScript y compilación Vite correctos.
- 50 pruebas unitarias.
- Suites SQL/RLS existentes y nueva suite de onboarding/decisiones: bloqueo de escrituras pendientes, acceso al contenido condicionado al perfil inicial, correo verificado, guardado atómico de perfil/avatar/ubicación, reintento idempotente, conservación de cuentas existentes y repetición segura de 018.
- Historial privado y notas antiguas, bloqueo de decisiones obsoletas y protección de administración propia.
- Flujos de navegador de acceso, perfil, publicaciones, retos/soluciones y administración; portadas y actualización entre sesiones conservadas.
- Prueba nueva en navegador: espera sin edición, aprobación, revisión/retorno/justificación, consulta de historial, transición automática al onboarding, bloqueo por URL, avatar/enlaces/ubicación y acceso persistente al terminar.
- Responsive general en 78 combinaciones de vista/ancho y pruebas del asistente en 320, 390, 768 y 1440 píxeles.
- SEO y tres pruebas de API con transporte simulado.

Las verificaciones usan Chrome automatizado y PostgreSQL local con permisos RLS. Los transportes de Auth, Storage y WebSocket se simulan; no se han modificado ni comprobado las conexiones de tu Supabase real, tu correo o tu despliegue. No se hizo push. No hay comando lint configurado; se verificó TypeScript. No se añadieron dependencias.

Pruebas: pnpm check:types, pnpm test y pnpm test:seo. Para navegador, compila primero con los valores ficticios VITE_SUPABASE_URL=https://nextone-test.supabase.co, VITE_SUPABASE_PUBLISHABLE_KEY=test-only y VITE_GOOGLE_LOGIN_ENABLED=true; luego pnpm test:browser:all, pnpm test:responsive, pnpm test:community-browser y pnpm test:onboarding-browser. No uses estos valores ficticios en Vercel.
