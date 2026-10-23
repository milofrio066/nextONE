# nextONE 0.9 · Borrado fiable, portafolios y estilo cyberpunk

## Instalación
1. Respalda. Ejecuta **supabase/migrations/009_delete_and_profile_theme.sql** una sola vez (después de 008).
2. Sustituye los archivos, `pnpm install --frozen-lockfile`, `pnpm test`, `pnpm build`.
3. Sube a GitHub; Vercel despliega solo. Prueba con una cuenta admin, un organizador y un miembro.

## Bugs corregidos
- **No se podía guardar ni borrar** un contenido sin diseño interactivo (como "[PRUEBA] Laboratorio de ideas de negocio"): `Guardar cambios` quedaba desactivado, por lo que no se podían quitar vínculos. Ahora guarda siempre.
- **Borrado bloqueado por vínculos.** Ya no exige desvincular antes. Al eliminar: lo vinculado que puede existir solo se desvincula (no se borra contenido ajeno); soluciones y avances, que exigen su reto/proyecto, se archivan con él. Se pide confirmación indicando cuántas piezas se afectan.
- **Quién puede borrar:** administración, autor u organizador asignado al evento. Lo decide el servidor (`can_manage_content`), no solo la interfaz. Queda en el registro de auditoría.

## Novedades
- Inicio con estética cyberpunk: rejilla animada, foco que sigue el cursor, contadores que llevan a cada sección.
- **Personas:** tarjetas tipo cartel; al hacer clic se abre el portafolio (titular, frase, cifras, habilidades, intereses, enlaces).
- **Mi perfil:** 5 plantillas (Neón, Aurora, Brasa, Mono, Propio), color propio, titular, frase y hasta 4 enlaces HTTPS, con vista previa en vivo.

## Seguridad
- Validación en servidor del perfil: plantilla, color hexadecimal, longitud, filtro de lenguaje, solo enlaces HTTPS.
- Cabeceras nuevas en Vercel: HSTS y Cross-Origin-Opener-Policy.
- Sin `dangerouslySetInnerHTML`, `eval` ni secretos en el cliente (revisado por búsqueda en el código).
- Nueva prueba `scripts/delete-check.mjs` (en `pnpm test`).

## No verificado
- No hay navegador en este entorno: **no se revisó visualmente** el diseño nuevo ni el móvil. Revisa Inicio, Personas y Mi perfil en claro/oscuro a 360 px y 1440 px.
- La migración 009 se probó en PostgreSQL local (PGlite), no en tu Supabase.
- No es un pentest ni garantiza ausencia de vulnerabilidades.
