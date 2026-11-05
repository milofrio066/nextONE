# makers x nextONE · entorno de desarrollo

## Base y arquitectura verificadas
Makers Fellowship by nextONE 1.8.0 (sobre la 1.7 de nextONE-main, zip del 5 de noviembre de 2026). Lee docs/LEER_PRIMERO_1.8.md (migración 024: audiencias makers/peers, seguimiento, encuestas y avatar v4), luego 1.7 y 1.6; las guías antiguas están en docs/historial/. No incluye .git ni archivos privados de entorno.
React 19 + TypeScript + Vite 6; NO es Next.js. Entrada src/main.tsx; aplicación src/pilot/PilotApp.tsx; componentes, modelos, pruebas y CSS en src/pilot/; contenido interactivo en src/pilot/interactive/. Cliente Supabase y RPC en src/pilot/backend.ts; endpoints servidor en api/; SQL en supabase/; automatización en scripts/ y setup/.

## Trabajo y límites
Responde en español. Reutiliza patrones y dependencias existentes (lucide-react, CSS y Supabase). No migres a Next.js, no añadas dependencias ni reorganices la arquitectura sin justificarlo y obtener acuerdo.
Lee solo los archivos relevantes. No abras .env reales, credenciales, sesiones o datos personales; usa .env.example para nombres. Nunca expongas secretos ni claves de servicio en VITE_.
Antes de modificar auth, RLS, permisos, esquema, migraciones o configuración de seguridad, presenta el cambio concreto y pide confirmación. También antes de instalar software global, conectar servicios, desplegar, enviar correos, operar bases remotas o realizar acciones destructivas. La aprobación de una tarea específica evita pedirla de nuevo para esa misma acción.
Conserva cambios del usuario. No hagas commit, push ni despliegues sin solicitud. No ejecutes SQL de instalación sobre bases existentes.

## Comandos y comprobaciones
Requiere Node 24.x y pnpm compatible con lockfile v9. Instalación local: pnpm install --frozen-lockfile. Desarrollo: pnpm dev (127.0.0.1). Validación: pnpm check:structure, pnpm check:types, pnpm test y pnpm test:seo, según alcance.
pnpm build ejecuta la comprobación de estructura, TypeScript y Vite. Revisa los scripts de navegador antes de ejecutarlos; usa cuentas y servicios de prueba, nunca producción.
Informa qué cambió, comprobaciones realmente ejecutadas y pendientes. No presentes pruebas simuladas como verificación de servicios reales.

## Skills locales
/nextone-ui-ux · /nextone-dev · /nextone-security · /nextone-qa · /nextone-contexto
Carga únicamente la skill necesaria; las instrucciones no sustituyen controles de permisos.
