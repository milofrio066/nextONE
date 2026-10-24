# Actualizar nextONE a 1.0

Esta entrega parte del proyecto corregido 0.10. No crea otra aplicación ni otro proyecto Vercel. Guarda tu respaldo y revisa los cambios antes de reemplazar los archivos del repositorio.

## 1. Archivos que debes subir

1. Descomprime nextONE-v1.0-completo.zip.
2. Entra en la carpeta nextONE y sube SU CONTENIDO a la raíz del mismo repositorio milofrio066/nextONE, reemplazando los archivos de igual nombre.
3. En la raíz deben quedar package.json, pnpm-lock.yaml, index.html, vercel.json y las carpetas src, public, supabase y api. No subas otra carpeta nextONE dentro del repositorio ni el ZIP.
4. Conserva el único proyecto Vercel y su dominio nextone-opal.vercel.app. Root Directory debe ser raíz, Node.js 24, salida dist y compilación npm run build. No vuelvas a importar el repositorio.
5. Conserva las variables que ya funcionan. No subas .env reales, node_modules, dist, .git ni supabase/.temp.

La versión declara Node 24 para que desarrollo, compilación y servidor usen una versión compatible. No se añadieron librerías de ejecución ni se modificó el archivo de versiones pnpm-lock.yaml. [Versiones Node admitidas en Vercel](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions).

## 2. Base de datos: actualización incremental

Si ya está aplicada 0.10, las novedades son únicamente:

- 011_challenges_admin_analytics.sql: permisos administrativos, reportes, reglas/fases/cupos de retos, entregas/versiones/retiro, evaluación ponderada e índices.
- 012_avatar_studio.sql: guardado validado del avatar ampliado, compatible con perfiles anteriores.

Las migraciones 001–010 no se editaron. Al subir el commit, deja que la integración Supabase/GitHub existente aplique las pendientes en orden. Revisa los checks del nuevo commit. Si tienes una versión anterior, primero deben aplicarse sus migraciones pendientes reales.

No ejecutes el instalador histórico ni marques migraciones como aplicadas sin verificar el esquema. No combines una ejecución manual en SQL Editor con la integración automática para las mismas migraciones. Un fallo exige leer el error actual antes de reintentar. No se borran usuarios ni tablas existentes en 011/012; hay funciones nuevas y sustituciones de funciones de indicadores y entregas.

Antes de abrir la nueva interfaz a la comunidad, confirma que 011 y 012 estén aplicadas. Una interfaz publicada con una migración pendiente mostrará errores de funciones/tablas, no puede suplirla desde el navegador.

## 3. Recuperar contraseña: configuración real

En Supabase conserva GitHub/Google y habilita Email. Mantén Site URL en tu dominio final, sin barra final, y autoriza las URL de retorno que uses, incluida https://nextone-opal.vercel.app/?recovery=1. Para desarrollo añade los equivalentes de 127.0.0.1:5173. Usa SMTP propio con remitente y dominio configurados y comprueba spam/entrega.

El código admite dos caminos:

- Plantilla predeterminada y PKCE: solicita el correo y abre su enlace en el mismo navegador. No funciona en otro navegador si falta el verificador de la solicitud original.
- Plantilla incluida para otro navegador/dispositivo: copia el contenido de supabase/email/recovery.html a la plantilla **Reset password** en Authentication → Email Templates. Usa .SiteURL y .TokenHash para dirigir al formulario que verifica el token de un solo uso antes de cambiar la contraseña. Site URL debe apuntar al dominio final de esta aplicación. No reemplaces las plantillas de registro o invitación con este HTML.

Este cambio de plantilla es configuración de tu cuenta; subir el ZIP a GitHub no lo activa. La versión comprueba errores/vencimiento, quita el token de la dirección después de verificarlo y permite solicitar uno nuevo. Se probó con respuestas Auth controladas, no se envió correo real desde tu Supabase.

[Contraseñas en Supabase](https://supabase.com/docs/guides/auth/passwords) · [Plantillas de correo y variables](https://supabase.com/docs/guides/auth/auth-email-templates).

## 4. Recorrido que debes revisar con tus cuentas

1. Administrador: ve Indicadores y Administración. Miembro y organizador: no ven Indicadores; abrir ?page=metrics tampoco concede acceso.
2. Publica un reto con instrucciones, dos o más criterios que sumen 100%, fechas válidas, cupo y un diseño. Comprueba que al editar conserva reglas y diseño.
3. Miembro: entra al reto, inicia participación, crea solución con plantilla o en blanco y un enlace HTTPS. Recarga y comprueba que sigue guardada.
4. Antes del cierre y si se permiten revisiones: edita y consulta versiones. Retira una entrega para reemplazarla o sal del reto si aún no entregaste.
5. Comunidad: deja una valoración. Administrador u organizador responsable: califica todos los criterios y publica fortalezas, mejoras y conclusión. Un organizador asignado a otro evento no obtiene permisos por su rol global.
6. Pasa el reto a revisión y después a finalizado. El cierre definitivo requiere feedback para todas las soluciones activas. Administración puede corregir entregas; los participantes quedan sujetos a plazo, reglas y feedback final.
7. Indicadores: aplica período/sección/búsqueda, selecciona un día, exporta CSV y abre análisis por temas/metodologías/cohortes. Confirma que actividad del período y acumulados actuales se interpretan por separado.
8. Perfil: elige un punto de partida de avatar, cambia rasgos/colores/movimiento, guarda y recarga. Revisa el directorio desde otra cuenta.
9. Acceso: solicita recuperación, abre un correo real, confirma la nueva contraseña, ingresa con ella y comprueba que el enlace reutilizado deja de funcionar. Prueba GitHub/Google también.
10. Revisa los flujos existentes que uses: inscripción/cancelación, enlace privado, asistencia, comentarios, eliminar publicación propia, proyectos/evaluador, evidencias y chat.

## 5. Qué está medido y qué no

Los indicadores usan registros reales de actividad y tablas vigentes, no gráficos de ejemplo. Se muestran datos faltantes como —, las personas únicas no se suman entre grupos y los tiempos de entrega no significan horas de trabajo activo. El historial no reconstruye acciones anteriores a su instalación. Los porcentajes de cambio solo aparecen cuando hay base histórica. Retirar/eliminar una solución cambia sus acumulados vigentes; su actividad histórica puede seguir registrada.

Los avatares son ilustraciones SVG/CSS originales, sin carga de modelos 3D ni imágenes externas. Los rasgos se pueden combinar sin restricciones de género. Las animaciones respetan reducir movimiento.

El ZIP está verificado localmente; el funcionamiento de SMTP, proveedores OAuth, secretos del asistente IA y configuración del alojamiento depende de tu cuenta. No se hizo push, despliegue ni modificación de tu Supabase alojado desde esta tarea.
