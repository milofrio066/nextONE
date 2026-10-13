# nextONE 0.6 · plantillas interactivas integradas

## Cómo actualizar el proyecto existente

1. Guarda una copia de tu versión actual. Descomprime nextONE-plantillas-integradas-v06.zip.
2. Abre la carpeta nextONE del ZIP. Sube SU CONTENIDO a la raíz de milofrio066/nextONE, reemplazando los archivos de igual nombre. Deben quedar package.json, src y supabase directamente en la raíz. No subas el ZIP ni agregues otra carpeta nextONE.
3. Conserva tu .git, archivos .env locales y las variables actuales de Vercel. No subas node_modules, dist, capturas ni supabase/.temp.
4. Haz un commit en main. La integración de Supabase que ya tienes activa debe aplicar automáticamente SOLO 004_interactive_pages.sql: 001/002/003 permanecen intactas y registradas.
5. NO ejecutes 004 por separado en SQL Editor, NO la marques aplicada antes de ejecutarse y NO ejecutes INSTALAR_NEXTONE.sql en tu base existente. Así evitamos repetir el desajuste del historial.
6. Espera los checks de Supabase y Vercel. Si alguno falla, revisa el error de ese nuevo commit antes de reintentar o cambiar el historial.
7. En la web abre un contenido tuyo, pulsa Crear diseño interactivo, elige una plantilla, personaliza, guarda y recarga. Prueba también desde otro usuario: puede verlo si tiene acceso al contenido, pero no modificarlo.

## Qué incluye

40 plantillas adicionales para Eventos, Webinars, Aprendizaje, Speakers, Builder cases, Soluciones, Proyectos y Comunidad; 22 tipos de bloques. Son independientes del Studio y las 72 estructuras anteriores. No incluyen plantillas para Mi perfil ni para Avances.

Editor con acento de color, reordenación, duplicado, eliminación, bloques adicionales y vista previa. Se conservaron Home, tarjetas, directorio, analíticas reales, correo, GitHub/Google y la arquitectura de la versión 0.5.

## Correcciones a la entrega original

- Integración selectiva sin reemplazar la aplicación por la antigua versión 0.3.
- Migración 004 transaccional; exige blocks y bloquea filas durante cambios. RLS, acceso por propietario/administrador y auditoría.
- Carga fallida visible, con reintento y bloqueo del editor mientras no pueda leer el diseño.
- Las respuestas locales se separan por usuario, contenido y bloque; se comprueban los tipos básicos al recuperar almacenamiento.
- Normalización descarta nombres heredados de Object.prototype y enlaces inseguros.
- Foco de teclado contenido en el editor, Escape y restauración del desplazamiento.
- Las cifras del diseño se distinguen de Indicadores: el autor debe sustituir los ejemplos. No se conectan automáticamente a métricas reales.

## Configuración y límites

No hay nuevas variables de entorno ni dependencias. Mantén el proyecto Vercel existente, Root Directory raíz, salida dist y sus variables Supabase. La única migración nueva es 004.

Los diseños se guardan en Supabase; el progreso personal de agenda/checklist/Kanban se guarda en ese navegador, no se sincroniza entre dispositivos. Quiz y otras selecciones pueden ser temporales según el bloque. Compartir cuenta comparte su almacenamiento local. No hay cargas de imágenes ni resultados colectivos de votación.

Las pruebas usan Auth/HTTP simulados y PostgreSQL local con RLS. No se ha ejecutado 004 en tu Supabase alojado ni se ha publicado desde esta tarea.
