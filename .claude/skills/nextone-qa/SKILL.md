---
name: nextone-qa
description: Verificar cambios de nextONE con pruebas de componentes, SQL, APIs y navegador proporcionales al alcance.
---
Lee scripts en package.json y la prueba candidata antes de ejecutarla. Elige la cobertura que reproduzca el comportamiento afectado: Vitest en src/pilot, scripts de API/SQL y Playwright en scripts/.
Confirma que el script usa datos ficticios, servidor local y dobles de proveedores; detente antes de cualquier acceso remoto o efecto real no autorizado. Las suites PGlite no prueban una instancia Supabase hospedada.
Empieza por estructura/tipos y la prueba específica cuando sea pertinente; amplía a pnpm test al cambiar comportamiento compartido. Para UI comprueba escritorio/móvil, teclado, temas y estados de error. No instales herramientas o dependencias nuevas solo para verificar documentación.
pnpm build comprueba estructura, tipos y compila con Vite. Conserva y diferencia los cambios previos del usuario. No ejecutes instaladores SQL como parte de QA.
Reporta comando, resultado y limitaciones. Si falta Node 24, pnpm, dependencias o un navegador, describe el requisito pendiente; no declares la prueba aprobada.
