# Verificaciones de nextONE 1.6 — 3 de noviembre de 2026

- Instalación con pnpm y lockfile actualizado: completada; Node 24.
- Estructura: correcta; una raíz y fuentes en src/pilot, sin src/src ni SQL suelto.
- TypeScript: pasa `tsc -b`.
- Compilación de producción: pasa. Vite avisa de un bloque de unos 505 KB; el lector PDF, su worker y DOCX se cargan a demanda al importar el CV. No se ocultó la advertencia.
- Vitest: 65 pruebas, 14 archivos, todas correctas.
- Suites PostgreSQL/PGlite previas: pasan; perfiles, administración, contenido, proyectos, retos, portafolios, almacenamiento, notificaciones y fellowship.
- Migración 023: instalación y segunda ejecución correctas en la base local.
- Nuevas pruebas de base: usuario único; metadatos no otorgan rol ni acceso; correo confirmado obligatorio; código personal distinto de referido; vinculación por identidad y única; lectura privada del registro; límites/intentos/uso único de OTP; contenido compartido; protección de antecesores y materiales; inscripción/feedback de suscriptores; audiencia atómica y cambio de audiencia de mentorías; sponsors privados; pagos imposibles de activar mediante el indicador.
- API consulta: métodos, origen, configuración apagada, formato, hash de verificación, correo simulado, consultas no encontradas y respuesta sin revelar el correo. No se enviaron correos reales.
- Chrome: extracción REAL de TXT, DOCX sintético y PDF suministrado; sugerencias editables; nombre existente conservado; enlaces sugeridos incorporados a campos vacíos; beneficios de maker y bloqueo de suscriptor; webinars compartidos; estado Nodi pendiente; rutas públicas de registro.
- Responsive: Chrome en 320, 390, 768 y 1440 píxeles; sin desbordamiento horizontal en las vistas comprobadas. Modo claro y oscuro.
- SEO existente: pasa, incluidos canonical, datos estructurados/CSP, sitemap y privacidad de consultas.
- No hay comando lint configurado en el repositorio recibido; no se presenta como ejecutado.

Límites de la validación: autenticación y transporte HTTP de navegador simulados, permisos SQL ejecutados contra PGlite. No se verificaron OAuth real, Supabase alojado, entrega real de Resend ni el origen externo de Makers. No se conectó Nodi ni Stripe. No se probó cada dispositivo físico ni todos los formatos posibles de CV; PDFs escaneados requieren OCR externo o completar manualmente.

No se modificó el checkout de GitHub del usuario. No se ejecutaron commit, push, migraciones remotas ni despliegues.
