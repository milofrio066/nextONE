# nextONE 1.1 · administración y comunidad global

Esta versión continúa la entrega 1.0. Conserva el mismo repositorio, proyecto Vercel, dominio y datos. El diseño adapta la referencia del panel oscuro a nextONE: tarjetas de resumen, gráficos descriptivos y secciones desplegables.

## Archivos y migraciones

Descomprime nextONE-v1.1-administracion.zip. Sube el contenido de su carpeta nextONE a la raíz del mismo repositorio, reemplazando archivos coincidentes. No subas otra carpeta nextONE, el ZIP, node_modules, dist, archivos .env reales ni supabase/.temp. Conserva Vercel en raíz, Node 24, salida dist y npm run build.

Las migraciones 001–012 se conservaron sin cambios. Esta actualización añade:

- 013_admin_operations_geography.sql: bandejas/alertas administrativas, verificación y seguimiento de invitaciones, reportes con historial, ubicación voluntaria privada, estadísticas geográficas, resumen gráfico y catálogo compacto.
- 014_admin_email_outbox.sql: cola de avisos, permisos del trabajador de correo, intentos y registro del resultado.

Usa la integración Supabase/GitHub que ya tienes para aplicar las pendientes en orden. No ejecutes nuevamente las anteriores, el instalador histórico ni repares el historial marcando archivos sin comprobar el esquema. Confirma los checks del nuevo commit y la aplicación de 013/014 antes de dar uso a la nueva interfaz. No se hizo push ni se alteró tu Supabase alojado durante la preparación.

## Administración

Las tarjetas de la cabecera abren su bandeja. Ingresos y miembros comienza desplegada; las demás secciones se abren cuando las necesitas. Las bandejas muestran hasta 20 registros por página, con filtros de estado y búsqueda. Despliega una persona o reporte para leer contexto y actuar.

Para aprobar un ingreso se comprueba en el servidor que el correo esté verificado. Registra un motivo; el cambio queda auditado. Los permisos y cohortes quedan en un apartado avanzado. No aprobar deja la cuenta sin acceso: no elimina sus datos. Cambiar a administrador requiere confirmación explícita en la interfaz y permisos de administración en la base. La cuenta pendiente comprueba cambios de acceso cada 30 segundos mientras la pestaña esté visible y al recuperar el foco.

Las solicitudes de nombre conservan el motivo y el flujo anterior de aprobación/rechazo.

Los reportes tienen prioridad normal/alta/urgente, responsable administrador, estados abierto/en revisión/resuelto/descartado y notas sucesivas. Pueden reabrirse con una nueva nota. Resolver no elimina contenido ni suspende automáticamente: primero revisa su contexto y usa las acciones específicas del contenido cuando proceda. El historial anterior a esta versión no se reconstruye; las decisiones antiguas se conservan en su registro.

## Invitaciones y seguridad de ingreso

Las nuevas invitaciones individuales se ligan a un correo específico y un cupo. Las campañas admiten varios cupos. Ambas requieren correo verificado y aprobación administrativa. Límite de vigencia: 90 días.

Un enlace reenviado no concede acceso por sí solo. Una cuenta suspendida no puede reactivarse reclamando una invitación. Las campañas compartidas antiguas también pasan a requerir aprobación para nuevos usuarios; no se expulsa a miembros ya activos. Las invitaciones individuales antiguas conservan su política de ingreso directo si la tenían, solo para su destinatario verificado.

El seguimiento muestra reclamaciones y estado actual de sus miembros, más verificaciones autenticadas válidas/fallidas. No son clics anónimos ni una medida de personas únicas. El botón Verificar invitación permite comprobarla antes de reclamarla. Las comprobaciones se limitan por cuenta para reducir abuso. Revocar bloquea nuevas reclamaciones; no retira accesos ya aprobados.

Al abrir el detalle se muestran hasta 100 reclamaciones y 100 comprobaciones recientes; las cifras globales sí incluyen todos los registros. La condición de miembro activo refleja su estado actual, no una aprobación histórica atribuida necesariamente a ese enlace.

## Alertas internas

La campana muestra avisos nuevos y cantidades pendientes. Se actualiza cada 30 segundos con la pestaña visible y al recuperar el foco. Puedes abrir Administración o marcar avisos como leídos. Leer un aviso no resuelve una solicitud. Cada administrador tiene su propio estado de lectura.

Se registran solicitudes de ingreso con correo verificado, solicitudes de nombre y reportes nuevos. Las cuentas sin verificar aparecen en la bandeja, pero su aviso de ingreso se genera cuando verifican el correo. No se envían avisos antiguos en bloque al instalar las migraciones.

## Activar avisos por correo

Esta parte requiere configuración privada. El código no trae claves ni destinatarios incrustados. Usa estas variables SOLO en Vercel:

- APP_ORIGIN: origen HTTPS del sitio, por ejemplo https://nextone-opal.vercel.app.
- SUPABASE_URL: URL del mismo proyecto (también se admite VITE_SUPABASE_URL ya existente).
- SUPABASE_PUBLISHABLE_KEY: clave pública (también se admite VITE_SUPABASE_PUBLISHABLE_KEY).
- SUPABASE_SERVICE_ROLE_KEY: clave de servidor con privilegios de servicio; nunca uses prefijo VITE_ ni la pongas en GitHub.
- RESEND_API_KEY: clave del proveedor Resend.
- ADMIN_NOTIFICATION_FROM: remitente con un dominio verificado en Resend.
- ADMIN_NOTIFICATION_EMAILS: de uno a diez correos administrativos separados por coma. No se toma de los perfiles públicos.
- NOTIFICATION_WEBHOOK_SECRET: secreto aleatorio de al menos 32 caracteres, compartido solo entre Vercel y el webhook de Supabase.

Después de configurar las variables y desplegar, crea un Database Webhook en Supabase para la tabla public.admin_email_outbox, evento INSERT, método POST y URL https://TU_DOMINIO/api/admin-notifications. Encabezados: Content-Type: application/json y Authorization: Bearer TU_NOTIFICATION_WEBHOOK_SECRET. Mantén el formato normal de evento de Supabase, incluido record.id y table. Configura un tiempo de espera suficiente para la llamada al proveedor si tu configuración lo permite.

El webhook llama a la función de Vercel incluso si ningún administrador tiene la página abierta. No hace falta una tarea periódica de pago para que el navegador detecte solicitudes. Este webhook es adicional a la integración GitHub de las migraciones: no reemplaces ni desactives esa integración.

La función toma un aviso de la cola con bloqueo temporal y envía un correo mínimo con un enlace a Administración; no incluye biografías, direcciones de miembros ni texto de reportes. Se usa una clave de idempotencia por aviso y se registran resultados del proveedor. Esa protección depende también de las condiciones de idempotencia del proveedor; no se promete entrega exactamente una vez.

Si falla, queda registrado. Desde Administración puedes reintentar avisos en cola, como administrador autenticado, con hasta cinco intentos por aviso. Si el webhook no se configuró, los avisos quedarán pendientes. Si se agotaron los intentos o hay un error de credenciales, revisa primero la configuración antes de insistir. «Aceptado por el proveedor» no significa entregado, leído ni libre de spam.

El panel detecta la presencia de las variables; no puede certificar por sí mismo que el remitente esté verificado o que el webhook exista. Revisa el panel de webhooks de Supabase y los registros de Resend. Genera una solicitud real de prueba y confirma la llegada al buzón administrativo antes de considerarlo activado. No se enviaron correos reales ni se configuró tu cuenta durante esta entrega.

Fuentes de configuración: [Database Webhooks de Supabase](https://supabase.com/docs/guides/database/webhooks) y [API de envío de Resend](https://resend.com/docs/api-reference/emails/send-email).

## Países, regiones y ciudades

En Mi perfil y actividad, cada miembro puede declarar opcionalmente su país, región/departamento y ciudad. El país se elige de un catálogo de 249 códigos ISO. También se puede guardar mientras el ingreso está pendiente. La ubicación se guarda aparte, con lectura solo del propio usuario y de administración; no aparece en el portafolio público. El usuario puede borrarla eligiendo Prefiero no indicarlo y guardando.

El panel global está en Administración y en Indicadores. Compara miembros activos, personas con actividad y acciones registradas en el período elegido. Muestra cobertura de país declarado y cantidad sin dato. Puedes pasar de país a región y de región a ciudad, o usar los filtros, y exportar un CSV agregado sin nombres ni correos de miembros.

No se captura IP ni geolocalización del dispositivo. La actividad son acciones registradas de miembros activos, no visitantes anónimos. La ubicación es su declaración actual, incluso para actividad pasada; no es un historial de mudanzas. Regiones y ciudades son texto libre y pueden contener variaciones de nombre. Los gráficos muestran los primeros 20 grupos y la tabla/CSV todos los grupos consultados.

## Optimización y verificación

Administración, Indicadores y el editor de perfil se cargan al abrirlos. El catálogo inicial reduce las descripciones a 600 caracteres y omite el plan completo del proyecto; al abrir un contenido se obtiene el registro íntegro. No se recortan los datos guardados. Se añadieron índices para solicitudes, avisos, reportes y ubicaciones. Las bandejas administrativas se filtran y paginan en el servidor y sus detalles se cargan al desplegarlos.

En la compilación de prueba, el módulo principal pasó de aproximadamente 451 KB / 137 KB gzip en 1.0 a 424 KB / 129 KB gzip en 1.1. No equivale a una mejora medida de tiempo de carga: falta medir la red, dispositivos y volumen real en producción. El catálogo y directorio todavía conservan sus metadatos autorizados en memoria.

Consulta VERIFICACIONES_V11.md. Después de actualizar, comprueba con cuentas reales: solicitud/verificación/aprobación, enlace reenviado con otro correo, cuenta suspendida, reporte/revisión/cierre, correo automático real, ubicación guardada y distribución agregada. Se mantuvieron los flujos de acceso, retos, soluciones, perfiles, proyectos, plantillas, progreso e indicadores.
