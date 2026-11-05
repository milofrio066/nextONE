# nextONE · Makers Fellowship 1.5.1

## Cambios

- Makers y nextONE comparten tamaño de texto, altura de símbolos y presencia en la cabecera. «by» queda como conector secundario.
- Banner de inicio con degradado visible verde/turquesa/lavanda; se conservan la cuadrícula y las interacciones existentes. Los portafolios conservan sus colores personales.
- Se elimina el menú grande de indicadores que seguía al desplazamiento. Un botón flotante abre las secciones; se cierra al elegir, pulsar fuera o usar Escape. Respeta la preferencia de movimiento reducido.
- Metodologías, temas, intereses, actividad diaria y geografía tienen vistas Gráfico / Registros con los mismos datos filtrados. Las tablas detalladas permanecen en desplegables.
- Calendario de interacciones por individuo, con selección de mes, sección y tipo de acción, conteo por día y registros exactos paginados. El conteo consulta todo el mes, no solo los primeros 50 registros. Fechas en Colombia (UTC−5). Cada consulta requiere administración y queda auditada.
- Tarjetas con acentos y degradados más visibles. Nuevos componentes visuales sin dependencias adicionales.

## Instalar sobre la versión 1.5

1. Supabase → SQL Editor → New query: ejecuta **solo `021_member_monthly_visuals.sql`**, una sola vez. Es una función nueva de consulta y auditoría; no elimina tablas ni datos y es compatible con la interfaz 1.5 actual.
2. No repitas 018, 019 ni 020. Ya estaban instaladas según las comprobaciones realizadas.
3. Extrae el ZIP de cambios y copia su contenido en la carpeta del repositorio abierto con GitHub Desktop, reemplazando archivos. No agregues otra carpeta contenedora.
4. Revisa Changes, escribe `Mejorar identidad visual e indicadores 1.5.1`, pulsa Commit to main y después Push origin cuando decidas publicar. No se hizo push desde esta tarea.
5. Espera Ready en Vercel y recarga la plataforma con Ctrl+Shift+R.
6. Comprueba cabecera, banner, botón flotante y, como administrador, Indicadores → Trazabilidad individual → seleccionar miembro → Interacción mensual.

Comprobación de instalación sin datos personales:

```sql
select to_regprocedure('public.admin_member_monthly(uuid,date,text,text,integer)') as historial_mensual;
```

Debe devolver el nombre de la función, no NULL.

El ZIP completo también está disponible; copia el contenido de `nextONE/` a la raíz. El ZIP de cambios está calculado exactamente contra el ZIP 1.5 entregado anteriormente. No hay archivos que borrar, ni cambios de dependencias, claves o configuración de los proveedores.

## Verificaciones

TypeScript y build pasan. Pasan 51 pruebas unitarias y todas las suites SQL/API del proyecto. La prueba SQL nueva comprueba permisos, filtros exactos, agregación mensual completa con más de 50 acciones y paginación. Chrome local comprueba gráficos y calendario sin desbordamiento a 320, 390, 768 y 1440 píxeles, menú flotante, cambio entre diagrama y registros, ubicación obligatoria y encuesta posterior al evento.

Se usó PostgreSQL local con SQL/RLS reales y adaptadores de autenticación/transporte. Las capturas usan cuentas y actividad de prueba, no son estadísticas de tu comunidad. No se modificó Supabase hospedado ni se publicó código. Las conexiones externas pendientes de la versión 1.5 siguen pendientes; esta actualización no las sustituye.
