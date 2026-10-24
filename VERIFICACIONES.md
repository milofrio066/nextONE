# Verificación de nextONE 1.0

Base: paquete 0.10 corregido. Entorno principal de verificación: Node.js 24.22.1, TypeScript 5.7.3, Vite 6.4.4, Vitest 4.1.12, PostgreSQL local con PGlite y Chrome de escritorio.

- Instalación npm sin scripts y sin crear package-lock: correcta; dependencias disponibles y consistentes. pnpm con frozen-lockfile no pudo completar el registro por la restricción Windows de enlaces simbólicos (EPERM). No se cambió pnpm-lock.yaml; npm permitió continuar. No se verificó una instalación limpia en una máquina vacía.
- Comprobación TypeScript y build de producción.
- 37 pruebas unitarias: plantillas, datos, navegación, progreso, enlaces/temas/Unicode, fechas de indicadores, fórmulas CSV, estados de retos, rúbrica y recuperación.
- Suites PostgreSQL/RLS: acceso y roles, cupos/registro/cancelación, acceso privado, invitaciones, comentarios/reacciones, proyectos, diseños, contenido unificado, historial de actividad, workspace, evidencias, eliminación y apariencia.
- Nueva suite release-check: migraciones 001–012 sobre base vacía, bloqueo de tres funciones de indicadores y exportación para miembros/organizadores, filtros y cifras, cupos, salida, retiro, versiones, plazos, evaluación ponderada, cierre condicionado a feedback, guardado atómico con rollback y avatar ampliado con datos maliciosos/aislamiento/suspensión.
- Dos pruebas del asistente IA con transporte controlado: formato, origen, sesión, cuota, tiempo de espera y respuesta segura.
- Navegador general: nueve tipos, plantilla/en blanco, edición, borrador recuperado, fallo de guardado y reintento, progreso entre contextos, opiniones, evaluación, borrado, roles de proyecto, ficha, chat, nombres, directorio y móvil.
- Navegador de perfil: emojis y banderas, redes separadas, fuentes y colores persistentes, nuevo avatar, abrir enlaces, editor y botones visibles, recarga y directorio.
- Navegador de acceso: proveedores conservados, error de ingreso, registro, solicitud de recuperación, confirmación, sesiones ausentes/enlaces vencidos, token-hash en contexto nuevo, verificación única, recarga, rechazo de contraseñas distintas y cierre de otras sesiones.
- Navegador de versión: miembro/organizador sin indicadores, reto/participación/entrega/retiro/versiones, bloqueo al pasar a revisión, filtros de reporte, detalle de día, exportación y estado vacío. Anchos 320, 390, 768 y 1440 sin desbordamiento de página.

Comandos: npm run check:types; npm test; npm run build; npm run test:browser:all. El proyecto no trae ESLint configurado: se usó comprobación estricta de TypeScript y las pruebas indicadas, no se declara un lint inexistente.

Los navegadores usan el build real, RLS/funciones PostgreSQL reales en una base local y un adaptador HTTP/Auth de prueba. No son un despliegue ni una conexión a producción. No se comprobó entrega SMTP real, credenciales OAuth, migraciones en el Supabase alojado, carga de evidencias al Storage alojado ni respuesta real de OpenAI. Deben validarse después de actualizar según ACTUALIZAR_V1.md. Las capturas entregadas usan cuentas y contenido de prueba.
