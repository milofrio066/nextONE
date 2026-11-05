# Revisión de seguridad · nextONE 0.8

Revisión de código y pruebas locales, 22 de octubre de 2026. No es una certificación de invulnerabilidad ni un pentest del despliegue.

| Superficie | Control y evidencia |
| --- | --- |
| Roles y escritura | RLS y RPC con `search_path` vacío. Escritura directa de perfiles, feedback privado, borradores y evidencias denegada. Las funciones auxiliares y triggers no se pueden invocar desde el navegador. |
| Cambios de nombre | Trigger de servidor contabiliza el primer cambio. Una aprobación administrativa pendiente de aplicar es necesaria para los siguientes. La aprobación se consume y queda registrada; la RPC antigua no elude la regla. |
| Evaluación | Evaluador activo distinto al responsable y sin membresía de estudiante. Asignación y solicitudes se serializan sobre el proyecto. Autor de feedback validado en servidor. |
| Feedback y evidencias | Lecturas privadas por proyecto; miembro externo obtiene cero filas. El feedback legado de proyectos también queda privado. La prueba incluye rol externo, miembro aprobado y evaluador. |
| Archivos | Bucket no público, RLS por proyecto y autor, extensiones permitidas, MIME y límite de 10 MB. Sin sustitución arbitraria de objetos. Enlace de descarga firmado por 60 segundos y sin ejecución o previsualización embebida. No incluye antivirus ni puede garantizar inocuidad de un documento descargado. |
| Chats | Requieren acceso activo y ventana temporal validada en servidor. Límite de 15 mensajes/minuto por cuenta, texto acotado, retirada autorizada y reportes. No se basa solo en ocultar botones. |
| Lenguaje | Filtro en servidor para mensajes, comentarios, publicaciones y diseños; no se puede evitar llamando la RPC desde otro cliente. Es un filtro básico de términos, no una detección semántica exhaustiva. |
| Inyección SQL | Operaciones con parámetros; no se construye SQL con entradas del usuario. El único SQL dinámico nuevo recorre firmas internas para establecer permisos. |
| XSS | Contenido y mensajes se representan como texto React. No se introduce HTML arbitrario, `eval`, `new Function` ni `dangerouslySetInnerHTML`. Se mantienen los casos existentes de enlaces maliciosos y bloques desconocidos. |
| Enlaces | Enlaces de evidencia y demostración HTTPS; `noopener noreferrer` al abrir externos. Los archivos se descargan desde Storage privado. El servidor de IA solo llama un endpoint fijo; no rastrea URLs suministradas por el usuario. |
| IA | Clave solo de servidor, origen exacto, verificación real de token con Supabase, cuota persistente por cuenta, límite de entrada y tiempo de espera, salida estructurada validada. No tiene herramientas ni permisos para modificar la base. Pruebas HTTP simuladas de 401/403/429/503 y respuesta válida. |
| Borradores | Lectura limitada a la cuenta, límite de tamaño y número; enlace de acceso privado excluido del snapshot. Un borrador no publica datos ni concede permisos. |
| Dependencias | Auditoría completa sin avisos conocidos tras actualizar Vite y Vitest. Eso no detecta vulnerabilidades aún desconocidas ni sustituye actualizaciones futuras. |
| Cabeceras | Se conservan CSP, protección contra framing, `nosniff`, política de referencias y restricciones de permisos en Vercel. No se añadieron excepciones para scripts arbitrarios. |

## Comprobaciones pendientes en el entorno real

- Aplicar las migraciones en ensayo, verificar bucket privado y probar carga, descarga y revocación de membresía con cuentas reales.
- Configurar las variables de servidor y probar el modelo elegido. Las pruebas no consumieron una API real ni expusieron una clave.
- Verificar configuración de Supabase/Vercel, OAuth, SMTP, backups y acceso administrativo. Estos servicios no se inspeccionaron con credenciales.
- Decidir la política de retención de chats/evidencias y si se necesita análisis antivirus antes de ampliar los formatos admitidos.

Los enlaces firmados ya emitidos pueden seguir siendo utilizables hasta su vencimiento de 60 segundos. Cambiar permisos no revoca un enlace previamente descargado. Las demostraciones externas requieren revisión humana.
