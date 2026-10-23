# Actualización nextONE para Makers

Esta entrega conserva el catálogo y los flujos existentes. Se preparó a partir del commit d6eca48d73a0e09816481b2544bb730882598b5a. No incluye credenciales, dependencias instaladas ni un despliegue de producción.

## Aplicar a una instalación existente

1. Guarda un respaldo de archivos y una copia de seguridad de la base. Prueba primero en un proyecto Supabase de ensayo.
2. Comprueba las migraciones aplicadas. Si ya tienes 001–005, aplica **solo `supabase/migrations/006_makers.sql`**, una vez. Si falta alguna, aplica las pendientes en orden antes de 006. No ejecutes el instalador combinado sobre tablas existentes.
3. Sustituye los archivos del proyecto por los del ZIP completo o aplica el ZIP de cambios sobre la revisión base indicada. Conserva tus variables de entorno y archivos propios. Si tienes cambios posteriores a esa revisión, compara antes de sustituir archivos.
4. Usa Node 24 y pnpm 11.25.0. Ejecuta `pnpm install --frozen-lockfile`, `pnpm check:types`, `pnpm test` y `pnpm build`.
5. En Vercel conserva raíz del proyecto, salida `dist` y tus valores reales de `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY`. Nunca incluyas una clave `service_role` en el navegador. La base debe estar actualizada antes de desplegar el frontend.
6. Comprueba con cuentas de miembro, organizador y administrador: entrar por enlace de contenido, recuperar borrador, editar y ver el resultado, inscripción, asistencia, intereses, cohortes, quizzes y métricas. Verifica por separado OAuth y entrega real de correo.

## Instalar una base nueva

Ejecuta **001, 002, 003, 004, 005 y 006**, una vez cada una y en ese orden. No combines esta ruta con `INSTALAR_NEXTONE.sql`. Activa al primer administrador con el procedimiento existente de `activate-admin.sql`, tras sustituir el correo de ejemplo. Configura proveedores, SMTP y URLs de redirección como indica README.

## Cambios incluidos

- Mi participación consulta exclusivamente al usuario actual, incluso con rol organizador o administrador.
- El diseño se invalida específicamente después de guardarlo; un comentario o una reacción no reinicia las interacciones de la página.
- El editor conserva un borrador por cuenta y contenido; permite recuperarlo o descartarlo y avisa al salir con cambios. Incluye título, descripción, clasificación, fechas, cupos, padre y estado de publicación. El enlace privado de acceso se excluye del borrador local por privacidad: vuelve a introducirlo si no se había guardado en servidor.
- Publicación, diseño y clasificación se guardan en una transacción mediante `publish_makers_content`. Los fallos mantienen el editor y el borrador.
- Temas, metodología y público objetivo opcionales; filtros en los catálogos. Intereses declarados en el perfil y cohorte administrada desde Administración.
- Historial de cambios de inscripción, acceso, asistencia, feedback, comentarios, inicio/entrega de cases y finalización de quizzes/checklists. Incluye clasificación y cohorte al ocurrir la acción.
- Nuevo panel por período, tema, metodología y cohorte; personas únicas, retorno, actividad diaria, utilidad y tamaño de muestra. Los acumulados actuales permanecen separados.
- Progreso de checklist y resultado del quiz sincronizados por cuenta, contenido, revisión y bloque. El servidor calcula el resultado y registra una finalización por bloque y revisión. Una revisión nueva del diseño inicia un progreso separado.
- Enlaces `?page=...&content=...`, recarga, historial del navegador y conservación del destino tras OAuth. Abrir un enlace respeta permisos; no publica contenido privado.
- Agenda dentro de la app para inscripciones de las próximas 24 horas, actualizada cada minuto; archivo de calendario con aviso 30 minutos antes. No se envían correos ni notificaciones del sistema. El aviso externo depende de importar el archivo y permitir recordatorios en la aplicación de calendario.
- Lecturas por lotes de 200 con orden estable; filtros por contenido/proyecto/persona en los detalles y actualización selectiva tras mutaciones. El catálogo inicial aún reúne los contenidos visibles: no se sustituyó la arquitectura por un buscador remoto.
- Portada y pie orientados a Makers y desarrollo independiente, sin afirmar acuerdos adicionales.
- Verificación automática en GitHub Actions, pruebas de regresión y adaptadores de navegador que sirven los archivos compilados sin un servidor externo.

## Interpretación y límites de los datos

- No se rellenó historia ficticia. Las tendencias empiezan con las acciones posteriores a 006. Las inscripciones previas solo generan historia cuando cambian.
- Acceso significa que una persona obtuvo el enlace; no demuestra entrada al evento ni asistencia. La asistencia sigue siendo verificada por el organizador.
- Las personas con opinión en el tablero acumulado dejaron feedback o comentarios. Los identificadores técnicos `access_clicks` y `participants` se conservan para compatibilidad; las etiquetas y cabeceras CSV explican su significado.
- Las cuentas habilitadas no equivalen a usuarios activos recientes.
- El retorno significa que la persona tuvo actividad registrada antes del período dentro de los contenidos y filtros que el consultante puede administrar. No incluye actividad anterior a 006.
- La utilidad histórica toma la última valoración por persona y contenido dentro del período. Las comparaciones son descriptivas, no causales. Las personas y acciones por tema no se deben sumar para obtener únicos globales.
- Los quizzes son ejercicios formativos con respuestas visibles para el participante; su resultado no es una evaluación supervisada. No se registran movimientos del ratón, permanencia ni toda interacción exploratoria.
- El progreso local anterior no se importa automáticamente al servidor; la sincronización empieza con la nueva versión. Los borradores locales no se publican solos ni se sincronizan entre dispositivos.
- El historial bruto no es accesible desde el navegador. Los agregados están limitados al administrador o a los contenidos propios del organizador, manteniendo el alcance anterior de Indicadores.
- El propietario confirma 47 plantillas funcionales. El catálogo versionado de esta revisión contiene 45 composiciones interactivas, más lienzo en blanco y estructuras heredadas. Se conserva íntegro, sin añadir ni eliminar plantillas para forzar una cifra.

## Pruebas

`pnpm test` incluye las pruebas de componentes/modelos existentes, nuevos casos de calendario/borradores/paginación y suites locales PostgreSQL/RLS, incluida `makers-check.mjs`.

Para navegador, compila con URL `https://nextone-test.supabase.co`, clave `test-public-key` y Google habilitado; ejecuta `pnpm test:browser` y `pnpm test:email`. Los adaptadores interceptan autenticación y transporte HTTP y utilizan PostgreSQL local. No prueban las credenciales, OAuth ni SMTP de producción. Chrome se usa por defecto; `NEXTONE_BROWSER_CHANNEL=chromium` permite usar Chromium instalado con Playwright. El flujo CI ya prepara ese entorno.

## Reversión

El frontend anterior puede volver a desplegarse con 006 aplicada: se mantienen las RPC y columnas originales. Conserva los datos nuevos; no borres tablas ni reviertas migraciones en producción sin un respaldo y una revisión de sus dependencias.
