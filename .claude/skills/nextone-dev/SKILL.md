---
name: nextone-dev
description: Desarrollar funciones de nextONE con React, Vite, TypeScript y Supabase según su arquitectura real.
---
Comprueba package.json y el flujo afectado antes de editar. Este proyecto no usa Next.js: no crees app/, Server Actions ni middleware de Next sin una migración aprobada.
Sigue el recorrido componente/modelo en src/pilot → backend.ts/RPC o api/ → SQL en supabase/migrations. Reutiliza tipos y validaciones existentes. Trata VITE_ como información pública; mantén claves privilegiadas exclusivamente en servidor.
Inspecciona la autorización en servidor y RLS, además de los controles visuales. Antes de cambiar auth, permisos, RLS o esquema, prepara una propuesta concreta con impacto y reversión y solicita confirmación si no está ya autorizada.
No ejecutes migraciones ni scripts de setup contra servicios remotos. No uses INSTALAR_NEXTONE.sql en bases existentes. Las integraciones opcionales se implementan con dobles de prueba hasta que se autorice su conexión.
Haz el cambio mínimo, añade o ajusta pruebas de comportamiento cuando aporten cobertura y ejecuta las comprobaciones pertinentes de package.json. No actualices dependencias o lockfile sin necesidad justificada.
