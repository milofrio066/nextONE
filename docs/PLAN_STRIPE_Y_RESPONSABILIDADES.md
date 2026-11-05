# Pagos con Stripe: qué implica para nextONE y responsabilidades

Documento de trabajo, 3 de noviembre de 2026. Basado en el resumen de reuniones del 2 de noviembre (lanzamiento de la suscripción). **En esta versión los pagos siguen apagados**: no hay checkout, cobros, renovaciones ni altas automáticas de suscriptores. La migración 023 impide activar `payments_enabled` por un cambio accidental; activarlos exige una migración nueva, pruebas y aprobación del equipo.

## Lo que ya está listo en la plataforma

| Pieza | Estado |
|---|---|
| Dos onboardings (maker con código único y aspirante a suscripción) | Listo |
| Consulta del código de maker por correo o celular, con verificación al correo de la base | Listo, apagado hasta vincular la base de Makers |
| Registro único: usuario, contraseña y código; activación automática al validar | Listo, sin aprobación manual cuando la base esté vinculada |
| Redirección del aspirante a Nodi AI | Preparada; falta el enlace de RRHH (`launch_settings.nodi_url`) |
| CV con lectura local y campos editables, sin depender de Nodi | Listo (PDF con texto, DOCX o TXT) |
| Audiencia por publicación: solo makers o toda la comunidad, con candado para suscriptores | Listo |
| Código de referido separado del código personal | Listo; el 25 % no se calcula porque no hay cobros |
| Pagos con Stripe | **Pendiente**: este documento |

## Qué implica integrar Stripe en nextONE

1. **Producto y precio.** Un producto en Stripe con precio mensual de US$30. El nombre («Peers» o «Community Pass»), el plan anual y la preventa de los primeros 50 cupos siguen pendientes.
2. **Pago solo para aceptados.** El enlace de pago se habilita únicamente cuando la selección marca a la persona como aceptada. Hoy esa marca no existe: hay que acordar cómo llega desde Nodi (API, webhook o archivo) o si la registra RRHH en administración.
3. **Checkout en el servidor.** Un endpoint en `api/` crea la sesión de Stripe Checkout para la persona autenticada y aceptada. Nunca se crean cobros desde el navegador ni con claves públicas.
4. **Webhook de Stripe.** Un endpoint verifica la firma (`STRIPE_WEBHOOK_SECRET`), descarta eventos repetidos y actualiza la suscripción con `checkout.session.completed`, `customer.subscription.updated`/`deleted`, `invoice.paid` e `invoice.payment_failed`. El acceso se deriva de ese estado, no del navegador.
5. **Migración nueva (024).** Necesita una tabla de suscripciones (cliente, suscripción, estado y fin del periodo), un registro de eventos del webhook y una función que active o retire el acceso de suscriptor. Se prueba antes en PGlite y en un Supabase de pruebas.
6. **Descuentos.** El referido de un maker (25 %) se aplica con un cupón o código promocional de Stripe, después de validar el código en nextONE. Nunca salta la selección.
7. **Becas y embajadores.** La suscripción gratis por cada diez y el acceso de embajadores no deben pasar por cobro. Se registran como acceso sin pago con su origen, para medirlos aparte.
8. **Paso a maker.** Si un suscriptor entra a una cohorte, se cancela la renovación en Stripe y su cuenta pasa a maker. Falta decidir si el cobro se corta al seleccionarlo o al iniciar la cohorte.
9. **Gestión de la tarjeta.** El portal de cliente de Stripe permite actualizar la tarjeta y cancelar sin intervención del equipo.
10. **Pagos fallidos.** Un periodo de gracia, con avisos, antes de retirar el acceso. La duración se decide con finanzas.
11. **Seguimiento.** Registrar el paso en que abandona cada persona (registro, selección o pago) para los correos de Gaby, y medir registro, pago y participación hacia la meta de 300 suscriptores al 20 de noviembre.
12. **Respaldo manual.** Si la integración no llega al 9 de noviembre, se pueden enviar enlaces de pago de Stripe a mano y dar el alta desde administración. La decisión es de Santiago.
13. **Seguridad.** `STRIPE_SECRET_KEY` y `STRIPE_WEBHOOK_SECRET` solo en el servidor (Vercel), nunca con prefijo `VITE_`. nextONE no guarda datos de tarjeta. Primero modo de prueba; impuestos y facturación por país se definen con finanzas.

## Responsabilidades de Juan Camilo

| Fecha | Tarea |
|---|---|
| Mar 3 nov | Punto de control con Santiago: acceso a la base de Makers, a Nodi y a Stripe en modo de prueba |
| Mié 4 nov | Perfil prellenado con Nodi o, si no se conecta, con el CV (ya implementado) |
| Jue 5 nov | Código único de makers con consulta por correo o teléfono (implementado; falta vincular la base con Carlos) |
| Vie 6 nov | Visibilidad por público en cada publicación (implementada) |
| Lun 9 nov | Pagos activados y cancelación al entrar a una cohorte: endpoints, webhook, migración 024 y pruebas |
| Mié 11 nov | Colores y logos para modo claro y oscuro; métricas de registro, pago y participación |
| Jue 12 nov | Prueba de punta a punta de ambos públicos, corrección de datos, accesos y cobros, y respaldo |
| Esta semana | Subir el código al repositorio de Makers con Carlos |

## Lo que depende de otras personas

| Responsable | Necesario para pagos |
|---|---|
| Santiago | Cuenta de Stripe, decisión de cuándo se corta el cobro, respaldo con enlaces manuales, nombre del producto |
| Santiago y finanzas | Plan anual, preventa, periodo de gracia, reembolsos e impuestos |
| César | Flujo de pagos acordado |
| Gaby y RRHH | Enlace de Nodi y cómo se comunica que una persona fue aceptada |
| Carlos | Base de Makers, códigos personales y de referido |

## Para empezar la integración, Juan Camilo necesita

1. Acceso a la cuenta de Stripe en modo de prueba, con claves de prueba.
2. Producto y precio creados, o permiso para crearlos.
3. La regla de corte del cobro al pasar a maker.
4. La forma en que Nodi marca a una persona como aceptada.
5. Un proyecto de Supabase de pruebas, para no tocar datos reales.

## Riesgos

- Si la marca de «aceptado» no llega de Nodi, nadie puede pagar sin un proceso manual de RRHH.
- Sin el webhook verificado, un pago podría no reflejarse en el acceso, o al revés.
- Activar cobros sin probar la cancelación al pasar a maker puede generar cobros dobles.
