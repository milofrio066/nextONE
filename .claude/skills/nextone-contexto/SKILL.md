---
name: nextone-contexto
description: Reducir contexto y preparar una continuación breve del trabajo en nextONE.
---
Delimita el objetivo y busca símbolos/rutas con rg antes de leer archivos completos. Excluye node_modules, dist, lockfiles, catálogos voluminosos, medios, secretos y registros salvo necesidad concreta. Lee porciones relevantes y evita repetir salidas de pruebas.
Mantén CLAUDE.md como mapa estable y breve; no lo conviertas en historial de conversación. Carga solo las skills necesarias. No inicies subagentes ni auditorías amplias para una tarea pequeña salvo petición.
Antes de /compact o de continuar en otra sesión, resume objetivo, decisiones, archivos cambiados, comprobaciones ejecutadas y siguiente acción; incluye pendientes de autorización sin secretos. Guarda una nota solo si se solicita.
Usa /context para revisar consumo si está disponible. No prometas un ahorro fijo de tokens: depende de lecturas, modelo y duración de sesión. No omitas verificaciones necesarias para ahorrar contexto.
