# Auditoría de estructura · 13 octubre 2026

Origen: nextONE-main.zip y nextONE-login-correo.zip, y comparación del repositorio público milofrio066/nextONE en HEAD d2ab196e5a485e83afcd6f9917a5525340267b4b.

La comparación normalizando finales de línea confirmó que el repositorio público coincide con nextONE-main.zip y añade solamente EmailAuth.tsx, auth.css y PilotApp.tsx sueltos en la raíz. No estaban conectados a src/main.tsx de la aplicación productiva.

Las carpetas nextONE-piloto-backend y nextONE-v03-diseno-comunidad-proyectos/nextONE-piloto-backend son idénticas byte por byte. Se conserva una única aplicación productiva en la raíz de nextONE. Se integra el login de Claude dentro de src/pilot y se eliminan los archivos de demo no usados en el proyecto activo. Se conserva la demo original en nextONE-demo-legacy.zip.

Arquitectura preservada: entrypoint PilotApp, Supabase Auth PKCE, tablas y RPC, migraciones 001/002/003, RLS, invitaciones, moderación, asistencia, feedback, cases, proyectos, equipos, tareas y chat. No se cambió el SQL ni se modificó la base alojada. El ZIP no contiene node_modules, .env.local, secretos, .git, dist ni la configuración local de las pruebas.

Mejoras: login correo, recuperación con retorno explícito; 45 nuevas plantillas; editor por bloques y vista previa; 5 presentaciones interactivas; indicadores gráficos y exportación filtrada; persistencia del tema; extractos limpios de contenido; foco y movimiento reducido.

Vercel: Root Directory debe cambiar a la raíz de nextONE. Revisar README antes de desplegar. No se ha hecho push a GitHub ni modificado Vercel.
