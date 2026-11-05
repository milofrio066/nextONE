# nextONE 0.8 · Inicio, proyectos y comunidad

## Instalación y actualización

Esta versión incluye los cambios de la primera entrega y los nuevos de esta solicitud. El ZIP completo contiene el proyecto fuente. El ZIP de cambios se compara contra la primera entrega corregida de esta conversación; revisa tus modificaciones propias antes de superponerlo.

1. Respalda archivos y base de datos. Comprueba las migraciones aplicadas en tu proyecto Supabase.
2. Si ya aplicaste 001–006, ejecuta **007_workspace.sql** y después **008_evidence_storage.sql**, una vez cada una. 008 configura el bucket privado de evidencias y utiliza el esquema `storage` que suministra Supabase. No ejecutes instaladores combinados ni repitas migraciones previas.
3. Si vienes de la versión original con 001–005, aplica **006, 007 y 008**, en orden. Para una instalación nueva usa las ocho migraciones individuales en orden.
4. Sustituye los archivos de aplicación, conservando tus variables de entorno. Node 24, pnpm 11.25.0: `pnpm install --frozen-lockfile`, `pnpm check:types`, `pnpm test`, `pnpm build`.
5. Actualiza Supabase antes del frontend y prueba con cuentas de estudiante, evaluador, miembro externo y administrador. Vercel conserva raíz del proyecto, `dist` y la configuración Vite. La carpeta `api/` debe estar presente para desplegar la función de IA.

No se hizo push, despliegue ni modificación de una base real desde esta entrega.

## Cambios visibles

- **Inicio:** agenda personal de las próximas 24 horas, hasta tres próximos eventos y tres webinars, novedades de cada sección y tarjetas que abren la sección directamente. Se eliminaron los pasos de seleccionar una tarjeta y buscar un botón al final.
- **Editor en todos los tipos:** barra superior con `Guardar borrador` incluso antes de completar los datos o elegir plantilla. Guarda en el navegador y en la cuenta. `Guardar cambios` publica los datos válidos sin cerrar ni duplicar el contenido. `Guardar y cerrar` termina la edición. Guardar borrador no equivale a publicar.
- **Desvincular:** controles en Contenido relacionado para enlaces opcionales, sujetos a autoría o administración. Los avances y las soluciones conservan su relación obligatoria con proyecto/reto. No se elimina contenido ajeno automáticamente.
- **Proyectos y semilleros:** tipo de iniciativa, problema, objetivo, alcance, V1, V2, evidencia de éxito y riesgos. Se elige evaluador en el menú de personas activas, excluyendo al responsable. Las solicitudes de equipo siguen requiriendo aprobación del responsable; el evaluador no puede incorporarse al equipo de estudiantes de ese proyecto.
- **Feedback privado:** el evaluador asignado o administración registra feedback fechado. Solo el responsable, los miembros aprobados, el evaluador vigente y administración pueden leerlo. Los comentarios comunitarios son una función diferente y pública dentro de la comunidad.
- **Evidencias:** enlaces HTTPS o archivos PDF, DOCX y TXT de hasta 10 MB en un bucket privado. Descargas con autorización y enlace firmado de 60 segundos. El espacio reúne evidencia y revisiones; el desarrollo se hace en las herramientas del equipo.
- **Soluciones:** muestra primero retos y demostraciones. Una solución requiere un enlace HTTPS a un prototipo o demostración; no se aceptan entregas nuevas solo de texto. Administración, el responsable del reto o el evaluador del proyecto vinculado pueden destacar una solución por reto. El enlace debe comprobarse humanamente: no se rastrean sitios externos desde el servidor.
- **Comunidad:** chat general, apodos en perfiles y mensajes, chats de eventos/webinars desde siete días antes hasta 24 horas después. Se muestran los últimos 60 mensajes y se actualizan cada 15 segundos mientras la página está visible. Hay retirada y reporte de mensajes, filtro de términos en servidor y límites de envío.
- **Perfil:** presentación visual, porcentaje de campos completados, apodo editable con emojis y un cambio de nombre directo. Los cambios siguientes son solicitudes con motivo; administración aprueba y el nombre se aplica automáticamente. Se impide saltar esta regla usando la RPC antigua de perfil.
- **Móvil:** cabecera reorganizada, acciones visibles sin superposición, rejillas adaptadas y comprobaciones en claro/oscuro a 320, 390 y 768 píxeles, además del recorrido de escritorio a 1440.

Los proyectos existentes conservan su contenido. Su responsable debe completar el evaluador y la ficha antes de volver a publicarlos mediante el editor nuevo. Las RPC anteriores se mantienen por compatibilidad y siguen sujetas a autorización; las nuevas funciones de evaluación privada exigen una asignación válida.

## Activar el asistente IA

No se entrenó un modelo desde cero. Se implementó un asistente de planificación con un modelo configurable, salida estructurada y validación de servidor. La propuesta es editable y no publica, asigna personas ni aprueba miembros.

En **variables de servidor de Vercel**, configura:

- `OPENAI_API_KEY`: tu clave de API. Nunca uses el prefijo `VITE_` para este secreto.
- `OPENAI_MODEL`: identificador de un modelo de tu cuenta compatible con Responses y Structured Outputs. No se fija ni se inventa un modelo predeterminado.
- `APP_ORIGIN`: origen exacto de tu app, sin barra final, por ejemplo `https://nextone-opal.vercel.app`.
- La función reutiliza `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY`; también admite las equivalentes `SUPABASE_URL` y `SUPABASE_PUBLISHABLE_KEY` de servidor.

El asistente envía únicamente la idea, tipo y restricciones que la persona introduce explícitamente. No lee ni envía archivos, miembros, feedback privado ni el resto de la base. Autentica el token con Supabase, exige acceso activo, limita a ocho propuestas por hora y mantiene la clave del proveedor en servidor. La respuesta se valida como datos antes de mostrarla. No hay herramientas del modelo ni ejecución de código generado. `store:false` se solicita al proveedor; revisa sus políticas de tratamiento de datos si usarás información sensible.

Sin esas variables aparece un aviso y la ficha manual sigue funcionando. La conexión real a OpenAI no se probó porque no se suministraron credenciales; sus pruebas usan transporte simulado. Documentación de implementación: https://developers.openai.com/api/docs/guides/structured-outputs.

## Seguridad y límites comprobados

Consulta `SEGURIDAD_V08.md`. Se revisaron permisos, entradas, claves, enlaces, almacenamiento y avisos de dependencias. Vite pasó a 6.4.4 y Vitest a 4.1.12; el archivo de dependencias está actualizado. La auditoría completa, incluidas herramientas de desarrollo, reportó cero avisos conocidos al preparar esta entrega.

Esto no garantiza ausencia absoluta de vulnerabilidades. Las políticas de almacenamiento se probaron contra un esquema local compatible; se debe comprobar la carga y descarga en tu Supabase real. No hay motor antivirus: el bucket y la aplicación limitan formatos y tamaño, fuerzan descarga y no ejecutan documentos. El filtro de lenguaje es básico y configurable en la base; puede tener omisiones o falsos positivos y se complementa con reportes y revisión humana. No se afirma haber realizado un pentest de la infraestructura desplegada.

Los chats temporales se cierran por autorización de servidor; no se promete borrado físico a las 24 horas. Las filas se conservan para revisión operativa con acceso directo autorizado a la base. No se envían notificaciones ni correos automáticos.

## Verificación

`pnpm test` ejecuta las 23 pruebas Vitest, las suites PostgreSQL/RLS anteriores, `workspace-check.mjs` y dos casos de API IA con transporte simulado. Los navegadores verifican los flujos nuevos además de los existentes. `pnpm test:browser` y `pnpm test:email` usan el build de prueba y autenticación simulada; no requieren producción ni un servidor externo.

La descarga de evidencias real, SMTP, proveedores OAuth y la respuesta del modelo elegido requieren configuración y validación en tu entorno. El flujo de GitHub Actions está incluido y correrá cuando subas los archivos; no se ejecutó remotamente aquí.
