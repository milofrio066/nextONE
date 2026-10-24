# Verificaciones nextONE 1.1

- TypeScript y compilación de producción con Node 24.22.1.
- 38 pruebas unitarias: se conservan las 37 de 1.0 y se comprueba el catálogo de países.
- Suites anteriores de PostgreSQL/RLS y dos pruebas del asistente IA conservadas.
- Nueva suite SQL de administración: aplica 001–014 en una base local; comprueba permisos de bandejas, alertas y geografía; privacidad de ubicación; altas verificadas; campañas sin acceso automático; correo destinatario; cupos idempotentes; bloqueo de suspendidos; historial de reportes; estadísticas; lectura de avisos por administrador; envío de correo limitado a servicio.
- Nueva prueba de API de correo: requiere sesión/rol/origen o secreto de webhook; rechaza eventos inválidos; comprueba configuración, cuerpo mínimo, destinatarios de entorno, clave idempotente, bloqueo temporal, resultado del proveedor y fallo recuperable. Usa respuestas de prueba, sin correos reales.
- Navegador general, perfil, acceso y versión 1 conservados, con la cadena completa de migraciones y el catálogo compacto.
- Nuevo recorrido en navegador: aprobación de ingreso, solicitudes de nombre, campaña nueva, comprobación y reclamación sin aprobación automática, seguimiento, responsable/prioridad/nota de reporte, resolución e historial, ubicación privada persistente, regiones/ciudades y CSV, acceso restringido, descripción completa al abrir contenido y pantallas de 320/390/768/1440.
- Capturas con cuentas de prueba; revisión visual de resumen, bandejas y distribución geográfica.

La nueva migración no modifica 001–012. No se añadieron dependencias ni se cambió pnpm-lock.yaml. No hay ESLint configurado; no se declara una ejecución de lint.

No se realizaron push, despliegue, cambios de configuración alojada, envío real por Resend ni mediciones de carga de producción. El webhook, remitente/dominio y secretos deben configurarse y probarse en tus cuentas. La comprobación de presencia de variables no acredita entrega de correo.
