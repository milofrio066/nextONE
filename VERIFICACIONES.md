> Documento histórico. Para esta entrega utiliza ACTUALIZAR_MAKERS.md; sus instrucciones de migración y validación prevalecen.

# Verificaciones · 13 octubre 2026

## Resultado

- Instalación con pnpm y lockfile: correcta. Se usó un almacén dentro del workspace y node-linker hoisted por las restricciones de enlaces de Windows.
- TypeScript estricto: correcto.
- Build de producción Vite: correcto, sin errores.
- 14 pruebas unitarias activas: correctas (45 plantillas, compatibilidad, serialización editable, métricas ponderadas y valores sin datos).
- 9 pruebas de la demo histórica: correctas antes de separar la demo.
- 10 pruebas de PostgreSQL/RLS: correctas (roles, perfiles, permisos, votos, comentarios, cupos, Zoom privado, invitaciones, entregas, suspensión y jerarquía).
- Suite de proyectos PostgreSQL/RLS: correcta (roles, privacidad, solicitudes, aprobación con cupos, tareas, avances y salida).
- Navegador Chrome + PostgreSQL local: correcto (participación, comunidad, proyectos, chat y cinco formatos interactivos; edición, guardado, recarga, filtros y exportación CSV).
- Correo en navegador: correcto con respuestas HTTP simuladas (proveedores preservados, solicitud de ingreso, error de credenciales, registro con nombre, confirmación, recuperación, nueva contraseña y limpieza de retorno).
- Adaptación visual: comprobaciones de desbordamiento en 320, 390, 768, 1024 y 1440 px según la suite; capturas revisadas de experiencias e indicadores.
- ESLint: no configurado en el proyecto de origen. No se afirma que se ejecutó lint.

## Límites de verificación

Supabase Auth HTTP, sesiones y entrega de correo están simulados en las pruebas locales. Las RPC ejecutan PostgreSQL/PGlite con políticas RLS reales. No se han validado proveedores OAuth con cuentas reales, SMTP, configuración de tu base alojada ni despliegue Vercel de esta versión.

Se inspeccionó la web pública nextone-opal.vercel.app sin modificarla. Su pantalla de ingreso actual muestra GitHub, sin correo ni Google visible. Se descargó el repositorio público para compararlo con los adjuntos; no se hizo push, commit remoto ni despliegue.

En este entorno pnpm 11 intenta reinstalar al ejecutar scripts si cambia el almacén local. Los comandos build y test se ejecutaron con --config.verify-deps-before-run=false tras instalar y comprobar el lockfile. La compilación y las pruebas también se ejecutaron directamente con sus herramientas. No es un cambio al código ni una omisión de pruebas.

## Rediseño 0.5

TypeScript y build final correctos. Las 14 pruebas unitarias, comprobaciones de PostgreSQL/RLS, suite de proyectos y pruebas de navegador/correo pasaron. Se añadieron verificaciones de Home, perfiles expandibles, selección de columnas y adaptación móvil, con capturas revisadas en ambos temas. Auth HTTP utiliza respuestas simuladas; no se probó SMTP/OAuth alojado ni se publicó esta versión.

## Integración 0.6

TypeScript estricto y build correctos. 18 pruebas unitarias pasan (incluidas 40 plantillas nuevas y 22 bloques); suites originales de PostgreSQL/RLS y proyectos correctas, y nueva suite de páginas correcta, con rechazo de JSON sin blocks. Navegador Chrome: crear/duplicar/eliminar/guardar diseño, acento, progreso de checklist tras recarga, editor 390/1440 y regresión de la plataforma hasta 320 px. Correo probado con HTTP Auth simulado. No se probó ni migró Supabase alojado, SMTP u OAuth reales. No hay ESLint configurado.

## Versión 0.7

TypeScript, build y 18 pruebas unitarias correctos. Suites PostgreSQL/RLS originales, páginas y proyectos correctas; nueva suite unified-check verifica los nueve tipos, guardado atómico y rollback, autoridad del evento, asignación/revocación de organizadores, revisión oficial con voto comunitario previo, versiones de evaluación, permisos y ocultamiento tras eliminar. Navegador y correo correctos: ver ACTUALIZAR_V07.md para alcance y límites.
