# nextONE 0.10 · botones corregidos y perfil personalizable

## Actualizar sobre tu versión 0.9

1. Guarda una copia de tu proyecto actual y descomprime nextONE-v0.10-corregido.zip.
2. Abre la carpeta nextONE y sube SU CONTENIDO a la raíz del mismo repositorio milofrio066/nextONE, reemplazando archivos de igual nombre. package.json, src, public y supabase deben quedar directamente en la raíz. No subas el ZIP ni crees otra carpeta nextONE.
3. Conserva el proyecto Vercel, su Root Directory raíz, sus variables Supabase y las claves privadas que tengas configuradas para IA. No subas .env locales, .git, node_modules, dist ni supabase/.temp.
4. Haz commit en main. Con la integración de Supabase que configuramos activa para producción, se aplicará la nueva migración 010_profile_appearance.sql y Vercel publicará la interfaz. Si hay migraciones previas pendientes, la integración las aplicará en orden; las existentes 001–009 no se editaron.
5. No ejecutes 010 por separado en SQL Editor, no la marques como aplicada manualmente y no vuelvas a ejecutar INSTALAR_NEXTONE.sql en tu base existente.
6. Espera los checks del nuevo commit. Si falla alguno, revisa su error antes de reintentar o modificar el historial.

No hay nuevas dependencias de ejecución ni variables de entorno. No se hizo push ni se modificó tu Supabase alojado desde esta tarea.

## Botones de plantillas

El fallo de tu captura se producía porque la URL www.linkedin.com no empezaba con https:// y el motor ocultaba el botón. Ahora se aceptan dominios web como github.com/usuario o www.linkedin.com/in/usuario y se completan con HTTPS. Se aplica a Portada, Llamado a la acción y bloques de Enlaces; los enlaces antiguos válidos sin prefijo también funcionan al renderizarse.

El editor normaliza las URL al salir del campo y antes de guardar, y rechaza direcciones inseguras como javascript:, data:, HTTP o URLs con credenciales. Un botón con texto pero sin destino ya no desaparece: aparece desactivado con una explicación para configurarlo. No se inventan destinos para botones incompletos.

Se corrigió el contraste del texto del botón según su color y se impide que las formas decorativas intercepten clics. También se corrigió el portafolio del directorio: la cabecera ya no tapa su botón de cerrar y el foco de teclado permanece dentro del diálogo.

## Mi perfil y actividad

- Identidad: nombre, apodo con emojis, biografía, habilidades e intereses. Pulsa Guardar perfil para estos datos.
- Redes y desarrollos: botones separados para LinkedIn, GitHub, portafolio, desarrollo y otros enlaces; hasta ocho, con etiqueta y URL editables. Aparecen como enlaces funcionales en la vista previa y en el portafolio público.
- Fuente: Moderna, Geométrica, Redondeada, Tecnológica, Editorial e Impacto. Son pilas de fuentes del sistema: funcionan sin descargar fuentes externas y pueden variar ligeramente según el dispositivo.
- Apodo grande: contorno, sólido o gradiente.
- Temas: Neón, Aurora, Brasa, Mono y Propio. Puedes cambiar acento, fondo general y fondo/texto de Presentación, Qué hago, Intereses, Sobre mí y Redes/enlaces. Al elegir un tema predefinido se restablecen sus colores de sección.
- Avatar original de estilo vectorial: peinados, tono de piel, color de cabello y ropa, chaqueta/sudadera/camiseta, gafas/audífonos/gorra, expresión y movimiento. Se muestra en el perfil, el portafolio, las tarjetas del directorio y la navegación. Permite respirar/flotar, saludar o quedar quieto. Respeta reducir movimiento del sistema.

Pulsa Guardar portafolio y avatar para guardar redes, fuente, colores y avatar. Estos ajustes se guardan en Supabase, no únicamente en tu navegador. La vista previa permite comprobarlos antes de guardar. Los enlaces incompletos deben completarse o quitarse.

El avatar es una ilustración animada original en SVG/CSS, no un modelo 3D ni un personaje de Xbox. No necesita subir fotos ni cargar imágenes externas.

## Emojis

El menú Elegir emoji permite buscar en español o inglés y filtrar categorías: caras, personas, naturaleza, comida, viajes, actividades, objetos, símbolos y banderas. Incluye los 3.963 emojis y variantes fully-qualified del catálogo Unicode 18.0, con tonos de piel y secuencias compuestas. Los resultados se muestran por lotes para no cargar miles de botones a la vez; Mostrar más permite recorrerlos todos.

Se conservan secuencias como 👩🏽‍💻 al insertarlas en el cursor del apodo. El límite de 40 caracteres del servidor se mantiene sin cortar una secuencia a la mitad. La representación de cada emoji depende de las fuentes y del sistema operativo; algunos símbolos recientes o banderas pueden mostrarse como letras/cuadrados en equipos sin soporte. No son imágenes descargadas.

Los datos del selector están incluidos localmente en public/emoji-catalog.json y se cargan solo al abrirlo. No se consulta un servicio externo ni se envía tu búsqueda.

Fuentes de los datos: https://unicode.org/Public/emoji/latest/emoji-test.txt y las anotaciones CLDR en español de https://github.com/unicode-org/cldr-json. Se incluye su licencia en public/LICENSE-UNICODE.txt.

## Correcciones y comprobaciones

Además de los botones: protección contra respuestas de progreso antiguas al cambiar de contenido/revisión, sincronización del nombre aprobado en el perfil, conservación de estilos ampliados al usar la función antigua de temas, validación de configuración en servidor y pruebas de navegador actualizadas a las migraciones reales.

Instalación con lockfile congelado y caché local, TypeScript y build correctos. Pasan 29 pruebas unitarias, 2 pruebas de la API de IA y las suites PostgreSQL/RLS de backend, proyectos, páginas, contenido unificado, Makers, workspace, eliminación y perfil. La nueva suite comprueba ocho enlaces, fuentes/avatar, aislamiento de usuarios, cuentas suspendidas y rechazo de datos maliciosos.

Navegador Chrome con PostgreSQL local: funciones existentes, correo, búsqueda de emojis/banderas, selección y guardado de avatar/temas, recarga, directorio, móvil de 320 a 1440 px, CTA/Portada/Enlaces y apertura de destinos en pestañas interceptadas, tanto en vista previa como publicado. Se revisaron capturas de escritorio y móvil.

Auth, transporte HTTP, destinos externos y la API de IA se simulan en pruebas. No se enviaron correos ni se probaron cuentas OAuth, facturación de IA o ejecución de 010 en tu Supabase alojado. No hay configuración ESLint en el proyecto. Estas verificaciones cubren los recorridos probados; no constituyen una garantía de ausencia de cualquier fallo posible.
