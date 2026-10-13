# nextONE 0.5 · rediseño Next Era

## Qué cambió

- Home público y de miembros con explicación de nueve espacios, navegación, guía Conecta/Construye/Evoluciona y accesos al registro existente.
- Inicio como primera pantalla de miembros; botón Personas para acceder al directorio.
- Paleta oscura carbón/violeta con cian, coral y azul; alternativa clara con contraste ajustado.
- Fondos ambientales suaves, escultura de marca y elementos flotantes hechos con CSS, sin videos de fondo ni librerías gráficas adicionales.
- Tarjetas de contenido y proyectos con volumen, luz y movimiento de inclinación al pasar el cursor; las acciones originales abren el contenido.
- Tarjetas de personas con monogramas derivados de sus nombres, habilidades y perfil expandible mediante clic, toque o teclado. No se inventan retratos ni datos personales.
- Indicadores con anillos de asistencia, utilidad y reacciones positivas; columnas con volumen y detalles seleccionables, métricas y filtros existentes.
- Estilos compartidos en todas las pantallas: acceso, catálogo, detalle, comunidad, editor, proyectos y analíticas.
- Navegación vuelve al principio al cambiar de pantalla; al salir se restablece Inicio.

## Qué permanece

Login correo/GitHub/Google, Supabase PKCE, admisión, invitaciones, roles, RLS, registro/asistencia, feedback, comentarios, moderación, builder cases, soluciones, equipos, tareas, chat y las 72 estructuras de contenido. No se modificaron SQL ni variables de entorno; no se agregaron dependencias de ejecución.

## Publicar sobre la versión que ya funciona

1. Guarda una copia de la versión actual.
2. Descomprime nextONE-diseno-v05.zip.
3. Dentro de nextONE, copia los archivos a la raíz de tu repositorio y reemplaza los de igual nombre. No crees otra carpeta nextONE dentro de la existente.
4. No elimines el repositorio, el proyecto de Vercel, tu .git ni tus archivos locales .env.
5. Conserva el proyecto nextone / nextone-opal.vercel.app, Root Directory raíz, salida dist y las variables de Supabase que ya funcionan.
6. Revisa y sube el cambio a GitHub; Vercel realizará el despliegue según tu integración existente.

Esta versión no necesita migraciones de Supabase ni un proyecto nuevo en Vercel. No se realizó push ni despliegue desde esta tarea.

## Verificación y límites

TypeScript y build correctos; 14 pruebas unitarias; 10 comprobaciones de PostgreSQL/RLS y suite de proyectos correctas. Se ejecutó la suite de navegador para participación, plantillas, soluciones, proyectos, chat, Home, directorio expandible, filtros, columnas y CSV; pantallas de 320/390/768/1024/1440 px. También se verificó registro por correo y recuperación con respuestas Auth simuladas.

Los monogramas son visuales decorativos, no fotografías. Los checklists mantienen progreso durante la visita como en la versión anterior. Los gráficos usan datos acumulados reales de la RPC: no hay series por fecha ni cifras inventadas. Las columnas muestran hasta ocho contenidos conforme al orden seleccionado; la tabla y CSV incluyen todos los resultados filtrados. No se afirma haber probado SMTP ni OAuth alojados con cuentas reales en esta actualización.

El movimiento se desactiva con la preferencia del sistema de reducir animaciones; las tarjetas no inclinan en dispositivos táctiles. Se mantiene la edición por bloques y la CSP existente. Las capturas corresponden a datos locales de prueba.

## Referencias visuales revisadas

[Composición y tarjetas](https://pin.it/5bQpE3TxV), [volumen e interacción](https://pin.it/6x4Olhp3G), [fondos](https://pin.it/3ruJcqW8f), [analíticas](https://pin.it/5bRETNvsu), [Home](https://pin.it/7rT0z5FBp), [Luma](https://luma.com/), más la paleta de gradientes que compartiste. Se reinterpretan en un sistema visual propio de nextONE, sin copiar imágenes, videos ni activos de esas páginas.
