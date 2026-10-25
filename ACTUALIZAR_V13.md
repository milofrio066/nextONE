# nextONE 1.3 · Portafolios, portadas y actualización entre miembros

Basada en la entrega 1.2.1 (que conserva las funciones de tu ZIP 1.2). Lee esta guía para esta actualización; los documentos de versiones anteriores quedan como referencia histórica.

## Instalar sobre tu proyecto actual
1. En Supabase, abre el proyecto correcto de nextONE → SQL Editor → nueva consulta.
2. Abre supabase/migrations/017_covers_and_community_sync.sql del ZIP, copia TODO su contenido, pégalo en la consulta y pulsa Run. Requiere las migraciones 001–016 ya aplicadas. No vuelvas a ejecutar las anteriores.
3. La 017 es incremental y se comprobó que puede ejecutarse nuevamente sin duplicar sus objetos. Si la integración GitHub/Supabase la procesa después de aplicarla manualmente, sus comprobaciones evitan los duplicados. Conserva el archivo en el repositorio.
4. Extrae el ZIP COMPLETO. En GitHub sube el CONTENIDO de nextONE/, donde está package.json, a la raíz existente. Reemplaza los archivos y conserva las carpetas src/, public/, scripts/, api/ y supabase/. No crees otra carpeta nextONE dentro del repositorio.
5. Vercel: Root Directory vacío (raíz), Node 24, build npm run build y salida dist. Conserva todas tus variables actuales, incluidas las de Supabase y correo. No se necesitan secretos nuevos.
6. Espera Ready y abre el sitio en una ventana privada. Si añadiste una etiqueta propia de verificación de Google a index.html, consérvala al reemplazar ese archivo. SEO, robots y sitemap de la entrega anterior se mantienen.

El ZIP SOLO-CAMBIOS es opcional y se aplica exclusivamente sobre 1.2.1; no subas ambos ZIP. Ninguno contiene node_modules, dist ni claves reales.

## Colores de los portafolios
Se mantienen el modo claro y el oscuro de la plataforma. Cada tarjeta y portafolio conserva la paleta que eligió su autor al cambiar el tema global: la interfaz cambia de tema, la identidad personal permanece.
Se corrigió la regla que convertía el fondo del directorio en blanco dejando los textos claros. Se ajusta el brillo del color mostrado cuando no alcanza contraste suficiente, sin reescribir los colores guardados. También se verifican los fondos de cada sección. Los títulos mantienen los estilos de fuente, contorno, sólido o gradiente.

## Portadas de todos los contenidos
En Crear/Editar contenido y diseño → Datos de publicación aparece «Portada del contenido»:
- Sube JPG, PNG o WebP de hasta 8 MB. Se convierte localmente a WebP, con lado mayor de hasta 1600 px y archivo final de hasta 2 MB.
- Añade una descripción y selecciona el enfoque: superior, centro o inferior. Recomendación: imagen horizontal 16:9.
- Guarda los cambios: la portada y el contenido se vinculan en una misma transacción. Si falla la publicación, no aparece un contenido incompleto.
- Quitar portada retira la vinculación cuando guardas. Al reemplazarla, se mantiene la anterior hasta guardar los cambios.

Disponible para eventos, webinars, aprendizaje, speakers, retos, soluciones, builder cases, proyectos, publicaciones y avances, respetando quién puede crear o editar cada tipo. Se muestra en catálogo/directorio de contenidos, feed, galería de retos/soluciones, detalle y accesos de Inicio que tengan imagen. Las personas conservan su avatar y portafolio personalizados.
Sin imagen se genera una portada con el título y una variante visual estable, de modo que los contenidos existentes sigan funcionando.
Las imágenes son privadas en el bucket content-covers. Los miembros solo pueden obtenerlas si tienen permiso para el contenido; un borrador no se expone a otros miembros. Se usan enlaces firmados de una hora con renovación y caché temporal por sesión. Un enlace ya firmado puede seguir siendo válido hasta su vencimiento, aunque cambie después el acceso.
Al cerrar el editor se intenta eliminar las subidas de esa edición que no quedaron vinculadas. Las imágenes aún utilizadas no se pueden borrar con esa operación. Si se cierra el navegador durante una subida o se reemplaza una portada antigua, pueden quedar archivos privados sin uso; el administrador puede revisarlos en Storage.

## Actualización entre miembros
La migración agrega tres señales de versión (perfiles, contenidos y actividad), que se publican mediante Supabase Realtime. Nunca se incluyen filas completas de perfiles, reportes o mensajes privados en esas señales: cada sesión vuelve a pedir solo los datos autorizados por sus permisos.
Los cambios se agrupan antes de actualizar para evitar peticiones por cada pulsación. Si Realtime falla, se comprueban las versiones cada 30 segundos mientras la pestaña está visible. Si nada cambió, no se descarga otra vez todo el catálogo. Al volver a la pestaña o recuperar conexión se vuelve a comprobar el contenido.
El pie muestra «Actualización en vivo», «Actualización automática» o «Sin conexión». La sincronización respeta los formularios: se aplaza mientras editas un contenido o tienes un campo enfocado, y continúa al terminar. No sobrescribe texto sin guardar. El chat conserva además sus comprobaciones periódicas existentes.
Si siempre aparece actualización automática, la plataforma conserva el respaldo periódico. Comprueba en Supabase que Realtime esté habilitado y que Database → Publications → supabase_realtime incluya public.community_updates. No hace falta añadir perfiles ni contenidos privados a esa publicación.

## Verificación rápida después de publicar
1. Abre dos cuentas distintas, una en una ventana privada.
2. Como organizador/admin, crea un evento con portada y guárdalo. La otra cuenta debe verlo sin pulsar Actualizar.
3. Edita el título o cambia la portada y comprueba el catálogo y el detalle en la otra cuenta.
4. Cambia un apodo o portafolio y revisa el directorio desde la otra sesión.
5. Cambia claro/oscuro: textos y botones del portafolio deben seguir legibles.
6. Comprueba un borrador con otra cuenta: ni el borrador ni su imagen deben estar disponibles.

## Validaciones locales
- TypeScript y build Vite correctos; no se añadieron dependencias y el lockfile se conserva.
- 50 pruebas unitarias, incluidas combinaciones difíciles de contraste y conservación de los colores originales.
- Suites SQL/RLS existentes y nueva suite de portadas/sincronización: permisos, imágenes de borradores, rutas inválidas, operaciones atómicas, publicación Realtime y repetición segura de 017.
- APIs de correo e IA: tres pruebas con transporte simulado.
- Cinco suites de navegador: acceso/recuperación, perfil, navegación/publicación, retos/soluciones e indicadores y administración.
- Revisión responsive: 78 combinaciones de vistas/ancho, más galería/editor y portada pública.
- Nueva prueba con dos sesiones: subida real desde el navegador, conversión a WebP, publicación, imagen firmada, propagación de título/perfil mediante WebSocket, respaldo periódico, formularios intactos y banner móvil.
- SEO/canonical/robots/sitemap/CSP comprobados. La política CSP incorpora WebSockets e imágenes únicamente del proveedor Supabase, sin permitir imágenes arbitrarias de Internet.

Las pruebas usan Chrome automatizado, PostgreSQL local con RLS y adaptadores HTTP/WebSocket/Storage simulados. No se han probado tus conexiones reales de Supabase, Storage, Realtime ni Resend, ni dispositivos físicos Safari/iOS. No se hizo push ni se modificó el servidor. Verifica los pasos anteriores tras instalar la migración y desplegar.
No hay un comando lint configurado en el proyecto; se verificó TypeScript. Las dependencias locales reutilizadas coinciden con el archivo pnpm-lock.yaml original.

## Ejecutar y probar el código
Node 24. Instala con pnpm install --frozen-lockfile. Configura .env.local usando .env.example y tus valores públicos de Supabase, y ejecuta pnpm dev. Esta vista conecta al proyecto que indiques; usa una base de pruebas si vas a modificar datos.
Pruebas: pnpm check:types, pnpm test, pnpm test:seo. Para navegador, primero compila con VITE_SUPABASE_URL=https://nextone-test.supabase.co, VITE_SUPABASE_PUBLISHABLE_KEY=test-only y VITE_GOOGLE_LOGIN_ENABLED=true; después pnpm test:browser:all, pnpm test:responsive y pnpm test:community-browser. Esos valores ficticios solo sirven para las pruebas; no los pongas en Vercel.

Referencias técnicas oficiales: https://supabase.com/docs/guides/realtime/postgres-changes y https://supabase.com/docs/guides/storage/security/access-control.
