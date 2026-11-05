---
name: nextone-security
description: Auditar seguridad de nextONE con evidencia de código y pruebas locales sin atacar servicios reales.
---
Por defecto realiza una auditoría de lectura. Delimita el flujo y revisa src/pilot/backend.ts, endpoints api/ y políticas/funciones SQL relevantes sin leer archivos de secretos.
Busca autorización ausente, escalamiento de rol, acceso entre usuarios, RLS y SECURITY DEFINER, exposición de claves privilegiadas, XSS, validación de entradas, firmas de webhooks, repetición de eventos, idempotencia, CORS y redirecciones. Distingue hallazgo confirmado de hipótesis.
Para cada hallazgo incluye gravedad, archivo/línea, condición de explotación, impacto y corrección mínima. Usa cargas inertes y datos sintéticos para reproducir localmente. No realices escaneos activos, envíos, cambios de cuenta ni consultas a datos reales sin autorización concreta.
No imprimas credenciales si aparecen accidentalmente: redacta el valor e informa solo ubicación y categoría. No afirmes que el sistema es seguro por ausencia de hallazgos.
Propón parches sensibles para revisión y confirma antes de aplicarlos cuando no estén ya autorizados. Una auditoría no autoriza despliegues, rotaciones de claves ni cambios en Supabase remoto.
