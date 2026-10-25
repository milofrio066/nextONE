# nextONE 1.2.1 · SEO y adaptación a pantallas

Base: nextONE-v1_2.zip. Cambios limitados a SEO, presentación adaptable y mantenimiento de pruebas.

## Qué cambia
- Próximos eventos, webinars y agenda: títulos y fechas se ajustan dentro de sus tarjetas y botones.
- Inicio: columnas según el espacio disponible y margen interior de la bienvenida.
- Perfil: controles de colores en móvil sin desbordar, formularios con campos que pueden encogerse.
- Editor: fechas, encabezados y herramientas de bloques accesibles en pantallas pequeñas; tarjetas y gráficos adaptables. Tablas y series temporales conservan desplazamiento dentro de su propio panel.
- SEO: título y descripción, canonical, Open Graph, Twitter, datos WebSite de schema.org y contenido público legible incluso antes de ejecutar JavaScript.
- robots.txt y sitemap.xml con solo la portada pública. Rutas internas, invitaciones y recuperación llevan noindex; los permisos de Supabase siguen siendo la protección real de los datos.
- Pruebas de navegador heredadas actualizadas para los nombres de controles y migraciones 015/016 que ya venían en 1.2.

## Subir a GitHub
1. Para actualizar la versión 1.2 usa el ZIP SOLO-CAMBIOS. Extrae su contenido y súbelo a la raíz del repositorio, conservando las rutas public/, src/ y scripts/. Reemplaza los archivos existentes.
2. El ZIP COMPLETO es una alternativa con todo el proyecto. En GitHub sube el CONTENIDO de nextONE/, donde está package.json; evita crear otra carpeta nextONE dentro del repositorio.
3. Vercel: Root Directory vacío (raíz), build npm run build, salida dist y Node 24. Conserva todas las variables actuales. Si Google ya está habilitado, conserva VITE_GOOGLE_LOGIN_ENABLED=true.
4. Espera a Ready y prueba desde el celular o en una ventana privada para evitar una pestaña con archivos anteriores.

No hay nuevas migraciones en esta actualización. Las 001–016 permanecen idénticas al ZIP 1.2. No vuelvas a ejecutarlas si ya estaban aplicadas. Si vienes de una versión anterior a 1.2, el parche no es suficiente.
No se modificaron los endpoints de correo, autenticación, permisos ni datos. No se ha publicado ni hecho push.

## Activar Google desde cero
El sitio preparado para indexación es https://nextone-opal.vercel.app/. Si cambias el dominio, actualiza index.html, robots.txt, sitemap.xml y scripts/seo-check.mjs.

1. Publica esta versión y confirma que abre la portada SIN iniciar sesión.
2. Entra en https://search.google.com/search-console y añade una propiedad de tipo «Prefijo de la URL»: https://nextone-opal.vercel.app/.
3. En «Otros métodos de verificación» elige «Etiqueta HTML». Google te dará una etiqueta meta google-site-verification. Copia la etiqueta completa dentro de index.html antes de </head>, súbelo a GitHub y espera el despliegue. Regresa a Search Console y pulsa Verificar. No elimines después esa etiqueta.
4. En «Sitemaps», envía sitemap.xml. Su dirección completa es https://nextone-opal.vercel.app/sitemap.xml.
5. En «Inspección de URLs», pega https://nextone-opal.vercel.app/, prueba la URL publicada y solicita indexación.
6. Revisa el estado en Search Console. Google decide si indexa y cuándo: el SEO y el sitemap no garantizan aparición inmediata ni una posición determinada.

Solo se indexa la explicación pública de nextONE. Los eventos y perfiles privados no se convierten en páginas públicas mediante este cambio. No se inventaron valoraciones, números de miembros ni reseñas para Google.

Fuentes: https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics y https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap.

## Comprobaciones realizadas
- TypeScript y compilación Vite: correctos.
- 47 pruebas unitarias: correctas.
- Suites SQL/RLS, proyectos, páginas, workspace, perfiles, retos, administración, builder case y avatar: correctas.
- 3 pruebas de API de IA/correo con transporte simulado: correctas.
- 5 suites de navegador: navegación general, perfil, acceso/correo, retos/soluciones e indicadores y administración: correctas. Los scripts heredados requirieron actualizar controles renombrados y cargar las migraciones 015/016 que ya existían.
- Nueva revisión responsive en Chrome: 78 combinaciones de vista y ancho (320, 390, 600, 768, 1024 y 1440 px), más portada pública, galería y editor a 320/390/768/1024. Títulos largos y enlace largo, tema claro del perfil y datos SQL locales.
- SEO: contenido HTML, metadata, canonical, sitemap, robots y hash de JSON-LD compatible con la política CSP: correctos.
- No se desactivaron las medidas de seguridad para permitir JSON-LD: se añadió su hash concreto a la política existente.

Límites: navegador Chrome automatizado, no dispositivos físicos ni Safari/iOS. Las pruebas de servidor usan PostgreSQL local (PGlite) y adaptadores de autenticación/HTTP; no se usaron tus credenciales ni se modificó Supabase real. OAuth, envío real por Resend y configuración efectiva de cabeceras en Vercel deben comprobarse tras publicar. No hay comando lint configurado en el proyecto; se verificó TypeScript.
La instalación desde red no terminó en este entorno. Se reutilizaron las dependencias locales previamente instaladas: pnpm-lock.yaml coincide exactamente con el de 1.2, sin añadir dependencias ni cambiar el lockfile.

## Ver en tu equipo
Con Node 24: instala dependencias con pnpm install --frozen-lockfile, copia .env.example a .env.local y configura únicamente las variables públicas de Supabase. Ejecuta pnpm dev y abre la dirección que indique. Ese modo conecta al proyecto Supabase que configures: utiliza un proyecto de pruebas si vas a crear o modificar datos.

Para pruebas: pnpm check:types, pnpm test y pnpm test:seo. Los tests de navegador necesitan una compilación con VITE_SUPABASE_URL=https://nextone-test.supabase.co, VITE_SUPABASE_PUBLISHABLE_KEY=test-only y VITE_GOOGLE_LOGIN_ENABLED=true; después pnpm test:browser:all y pnpm test:responsive. Esos valores son ficticios y solo sirven para las pruebas. No los configures en Vercel.
