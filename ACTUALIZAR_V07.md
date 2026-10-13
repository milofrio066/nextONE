# nextONE 0.7 · creación unificada, evaluación y eliminación

## Actualizar tu web existente

1. Guarda una copia del proyecto y descomprime nextONE-contenido-unificado-v07.zip.
2. Abre la carpeta nextONE y sube SU CONTENIDO a la raíz del mismo repositorio milofrio066/nextONE, reemplazando archivos con el mismo nombre. No subas el ZIP ni crees otra carpeta nextONE dentro del repositorio.
3. Conserva tu proyecto y variables en Vercel, tus .env locales y .git. No subas node_modules, dist ni supabase/.temp.
4. Guarda el commit en main. Con tu integración actual, Supabase aplicará la nueva migración 005_unified_content.sql y Vercel publicará la interfaz. Si todavía no subiste la versión 0.6, aplicará primero 004 y después 005. Las migraciones 001–004 no se modificaron.
5. No ejecutes las migraciones en SQL Editor ni las marques aplicadas manualmente. No ejecutes INSTALAR_NEXTONE.sql en tu base existente.
6. Espera los checks del nuevo commit. Si falla alguno, comparte su error antes de cambiar el historial.

No se realizó push, despliegue ni cambios en tu Supabase alojado desde esta tarea. No se necesitan dependencias ni variables nuevas.

## Crear y editar

Desde cada sección pulsa Crear contenido, Crear proyecto o Crear publicación. El editor presenta cinco plantillas interactivas o empezar en blanco. Se incluyen Eventos, Webinars, Aprendizaje, Speakers, Builder cases, Soluciones, Proyectos, Avances y Comunidad: 45 plantillas, 22 tipos de bloques.

Completa los datos de publicación: título, descripción, vínculo, enlaces y fechas cuando correspondan. Puedes plegar ese apartado para editar los bloques junto a la vista previa. Permite cambiar textos y listas, enlaces, datos de gráficos, color de acento libre o predefinido, duplicar, mover, añadir y eliminar bloques.

Contenido y diseño se guardan en una operación atómica. Los campos especiales de eventos y los permisos de publicación se mantienen. Los diseños anteriores se conservan y pueden abrirse con Editar contenido y diseño. Las estructuras de texto antiguas permanecen legibles y se pueden editar en Descripción anterior.

Para entregar una solución: entra al builder case, pulsa Iniciar builder case y después Crear solución interactiva. Completa el prototipo HTTPS y guarda. Se mantiene una entrega por participante y el plazo del case. Los avances se crean desde Documentar avance del proyecto y tienen cinco plantillas propias.

Mi perfil sigue siendo el formulario de perfil: no es una publicación evaluable. La personalización es mediante los bloques admitidos, sin ejecutar HTML/JavaScript aportado por usuarios ni subir imágenes. Las cifras de plantillas las configura el autor; Indicadores conserva las métricas reales.

## Calificación comunitaria y feedback definitivo

En los nueve tipos de contenido se muestran dos evaluaciones independientes:

- Comunidad: puntuación de 1 a 5, reacciones y comentarios. Cada miembro puede actualizar su propia opinión.
- Organizadores: puntuación oficial de 1 a 5, fortalezas, oportunidades de mejora y conclusión definitiva. Solo se publica después de al menos una calificación comunitaria. No mezcla su promedio con la calificación comunitaria.

Vincula el case o proyecto con su evento/webinar al publicarlo. Las soluciones heredan el evento a través del case y los avances a través del proyecto. La evaluación oficial puede emitirla el responsable del evento, un organizador asignado o administración; los permisos se validan en la base, no solo en los botones.

Para asignar otro evaluador, entra al evento como responsable o administrador y usa Organizadores que evalúan. El usuario debe estar activo y tener rol organizer. Primero puedes asignarle ese rol desde Administración. No basta con tener rol organizer para evaluar un evento ajeno.

Si no hay evento/webinar asociado, administración puede evaluar; también un organizador que sea responsable del contenido o de un padre en su jerarquía. Autores miembros y mentores sin responsabilidad de evento no pueden autoproclamarse evaluadores oficiales.

El feedback definitivo es visible para quienes tengan acceso al contenido. Puede revisarse por evaluadores autorizados; muestra responsable, fecha y número de revisión, y guarda cada cambio en auditoría. No hay notificaciones por correo añadidas.

## Eliminar publicaciones

En el detalle, el autor y administración disponen de Eliminar contenido con confirmación. Se oculta de la comunidad, el diseño, las evaluaciones y los indicadores; se conserva un registro interno para no destruir auditoría, entregas y relaciones. No hay restauración desde la interfaz en esta versión.

No se elimina automáticamente una publicación con contenido relacionado activo. Primero hay que desvincular o eliminar sus hijos con los permisos correspondientes. Así el responsable de un evento no elimina accidentalmente las soluciones de otros participantes. Un administrador puede resolver esas relaciones.

## Verificación

TypeScript estricto, build, 18 pruebas unitarias (incluyendo render de las 45 plantillas), suites PostgreSQL/RLS, proyectos y páginas pasan. La nueva suite verifica guardado atómico, entrega, evaluación previa de comunidad, revisiones oficiales, organizadores asignados y revocados, rechazo de intrusos, permisos de autor/admin, eliminación y privacidad de todos los tipos, y exclusión de eliminados en indicadores.

Navegador Chrome con PostgreSQL local: nueve tipos, plantilla/blanco, edición de metadatos y bloques, progreso tras recarga, entrega de solución, registro a evento, calificación comunitaria, feedback oficial visible para el autor, borrado, proyectos, indicadores/CSV, Home, directorio y anchos de 320–1440 px. También pasa la prueba de correo con Auth HTTP simulado.

No se ha validado SMTP ni OAuth reales ni ejecutado 005 en tu Supabase alojado. El progreso de bloques sigue siendo local al navegador y cuenta, sin sincronización entre dispositivos. No hay ESLint configurado.
