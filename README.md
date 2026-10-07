# nextONE — piloto personal

«El próximo número 1». Comunidad tecnológica para encontrar equipo, construir proyectos y aprender colaborando. Iniciativa independiente; ninguna alianza o participación real de Makers está confirmada por este MVP.

## Qué es esta entrega

Una demo web interactiva para presentar el viernes **9 de octubre de 2026**. React, TypeScript y Vite. Se puede alojar como sitio estático en Vercel sin Supabase. Los ejemplos son ficticios y los cambios se guardan en el navegador con localStorage.

**No es una plataforma multiusuario ni un sistema de autenticación.** El selector DEMO permite recorrer roles. Todas las personas que abren la demo pueden cambiar de rol y restablecer sus datos. No ingresar hojas de vida, correos o información privada real. Los controles de acceso son una demostración de interfaz, no protección de datos frente a quien inspeccione el navegador.

## Funciones operativas en la demo

- Crear y revocar invitaciones con cupo y vencimiento. Invitaciones del fundador, mentores y cohortes Makers admiten directamente; solicitudes ordinarias requieren revisión. Conservar referente y origen.
- Registrar solicitudes y aprobarlas/rechazarlas desde administración.
- Editar perfiles técnicos y disponibilidad.
- Crear proyectos, solicitar ingreso, aprobar/rechazar integrantes, publicar avances y marcar finalización.
- Tareas diarias/semanales/mensuales, cambio de estado, documentación editable por líder y lectura por equipo.
- Conversaciones por canales del equipo y foro comunitario, persistentes solo en este navegador.
- Retos, soluciones y conversión de propuesta seleccionada a proyecto con creador destacado.
- Proponer recursos, revisión editorial, inscripción y registro de asistencia por el mentor.
- Reportes, resolución con justificación, suspensión/restablecimiento y bitácora.
- Español e inglés en interfaz, temas claro/oscuro y tres colores de acento. Contenido aportado por usuarios y ejemplos no se traduce automáticamente.

## Funciones demostrativas o pendientes

- Copilot: reglas locales y similitud de palabras. No usa un modelo de IA, no analiza CV y no emite aprobación real de IA.
- Recomendación de talento: coincidencia de etiquetas de habilidades.
- Voz integrada, permisos granulares por rol, suspensión temporal automática, administradores delegados y subida de imágenes/archivos: pendientes.
- Videos y reuniones: enlaces externos. No hay grabación ni alojamiento de videos.
- Invitaciones compartidas: no sincronizan usos o solicitudes entre navegadores. El backend futuro deberá validar y consumir cupos mediante transacciones.
- La biblioteca contiene enlaces externos; las fuentes web requieren conexión. Las tipografías tienen fallback local.

## Ejecutar

Con Node.js 22 o superior y pnpm:

```sh
pnpm install
pnpm dev
pnpm test
pnpm build
pnpm preview
```

`pnpm-workspace.yaml` permite el script de instalación de esbuild. El lockfile registra las versiones instaladas.

## Publicar en Vercel

1. Crear un repositorio de GitHub con **el contenido de la carpeta nextone**, sin node_modules ni dist.
2. Importarlo en Vercel, con preset Vite. Si el repositorio incluye esta carpeta dentro de otra, seleccionar `nextone` como Root Directory.
3. Usar instalación `pnpm install --frozen-lockfile`, build `pnpm build`, salida `dist`. No necesita variables de entorno.
4. Compartir la URL asignada `*.vercel.app`. No hace falta dominio propio.
5. Mantener visible el aviso de demo. El plan Hobby exige uso personal no comercial; revisar condiciones antes de convertirlo en programa de una organización.

## Guion de presentación — 7 minutos

1. Inicio: explicar el problema, el propósito de nextONE y la meta de 30 miembros. Las cifras en pantalla corresponden a los ejemplos existentes.
2. Invitaciones: mostrar cupos por mentor y cohorte, y la diferencia entre ingreso directo y revisión.
3. Proyectos: crear una propuesta y ejecutar la revisión del Copilot. Aclarar que es una demostración del flujo de IA.
4. Cambiar a un miembro, solicitar ingreso; volver al líder y aprobar. Mostrar tareas, conversación y documentación.
5. Retos: seleccionar una solución y convertirla en proyecto.
6. Aprendizaje: mostrar recurso, inscripción y revisión editorial.
7. Administración: procedencia y moderación. Cerrar proponiendo validar el piloto con Daniel y una primera cohorte.

## Próxima etapa: backend real

Supabase para usuarios, PostgreSQL, almacenamiento y políticas RLS. Requiere cuenta propia. El backend deberá controlar roles, invitaciones de un solo uso o cupos, procedencia, permisos por canal, privacidad de CV, moderación y auditoría; no se pueden trasladar los controles del navegador como si fueran seguridad real. Configurar correo de autenticación o proveedor OAuth antes de invitar usuarios reales. Mantener CV privados y solicitar consentimiento antes de enviarlos a un proveedor de IA.

El objetivo de costo cero corresponde a esta demo estática. No garantiza que IA, voz, correo y operación multiusuario futura permanezcan gratis.

## Verificación

Pruebas unitarias: admisión directa por origen, revisión ordinaria, límites y revocación, duplicados, expiración, acceso de equipos, suspensión, similitud y enlaces seguros.

`scripts/browser-check.cjs` usa Playwright disponible en el entorno de desarrollo (no dependencia de producción). Verifica el recorrido interactivo en Chromium y guarda capturas en `artifacts`. Puede ejecutarse con `NEXTONE_PLAYWRIGHT` apuntando al paquete Playwright instalado y con el preview en puerto 4173.
