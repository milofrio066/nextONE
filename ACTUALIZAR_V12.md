# nextONE 1.2 — Retos y soluciones unificado, Builder case, avatar ampliado e Indicadores más claros

## Antes de desplegar
1. Respalda tu base de datos.
2. En Supabase → SQL Editor ejecuta, **una sola vez y en orden**, `015_builder_case.sql` y después `016_avatar_wardrobe.sql`. No vuelvas a ejecutar las anteriores.
3. Despliega el frontend (`pnpm install --frozen-lockfile && pnpm build`).
Si despliegas el frontend sin la 015 no podrás publicar Builder cases; sin la 016 el guardado del avatar fallará con un mensaje de función no encontrada.

## Qué cambió
**Retos y soluciones (una sola entrada).** El menú ya no tiene "Retos" y "Soluciones" por separado: ambas abrían el mismo panel. Ahora hay una entrada, "Retos y soluciones", con las pestañas Retos / Soluciones. Los enlaces antiguos `?page=solution` siguen funcionando. En la creación, el tipo `case` se llama ahora "Reto" y los mensajes del servidor ya no lo llaman "builder case".

**Builder case (nueva sección).** Tipo de contenido propio (`builder`): cualquier miembro activo puede publicar el suyo; el autor o administración lo edita; los borradores no son visibles. Seis plantillas guiadas con preguntas en cada sección, según la estructura que usa Makers: Builder case completo (12 secciones), Pitch de 3 minutos, Validación del problema, MVP y experimentos, Modelo de negocio y Caso B2B o sector; más cinco composiciones interactivas. Aparece en Indicadores como sección filtrable.

**Avatar.** 12 prendas superiores (camisa, esqueleto, traje con corbata, abrigo largo, overol, conjunto deportivo…), parte inferior (jean, pantalón, short, falda) y calzado (tenis, botas, bailarinas) con color propio; 16 peinados; 8 expresiones (carcajada, guiño, sorpresa, pícara, tranquila…); 7 gestos (saludo, manos a la cintura, victoria, pensando, pulgar arriba, saludo militar); 10 complementos (gafas de sol, gorro, diadema, corona, bufanda, cadena, aretes…). Al hacer clic el avatar reacciona con un emoji (respeta "reducir movimiento"). Seguridad: el servidor solo acepta catálogos cerrados y colores hexadecimales; el cliente normaliza cualquier dato antes de dibujar, así que un valor manipulado no llega al SVG. Los avatares guardados antes siguen funcionando.

**Indicadores (solo interfaz; mismos datos y consultas).** Períodos rápidos (7, 30, 90 días, este mes, 12 meses), resumen de filtros activos con "Restablecer filtros", navegación fija por secciones con resaltado de la sección visible, indicador de tendencia ▲/▼ con texto (no solo color) en participantes y acciones, máximo y total diarios en el gráfico, encabezados de tabla ordenables y fijos, estado de carga con esqueletos, error con botón "Reintentar" y aviso cuando no hay soluciones pendientes.

## Pruebas ejecutadas en este entorno
Tipos (`tsc`), 47 pruebas unitarias, las suites SQL con PGlite (incluidas las nuevas `builder-check` y `avatar-check`) y `vite build`. El dibujo del avatar se rasterizó a imagen para revisar prendas y gestos.

## No verificado
Recorridos en navegador (los scripts `*-browser-check` se actualizaron para el menú nuevo pero **no se ejecutaron**: aquí no hay Chrome); la apariencia real de Indicadores en pantallas reales; las migraciones 015 y 016 contra tu base alojada; rendimiento con datos reales.
