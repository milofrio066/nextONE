-- Ejemplo explícito de prueba. No crea usuarios, votos ni asistencias ficticias.
-- Ejecutar en SQL Editor con el rol postgres. Puede repetirse sin duplicar contenido.
begin;
do $$
declare fundador uuid; inicio timestamptz:=now()+interval '10 minutes';
begin
 select p.id into fundador from public.profiles p join auth.users u on u.id=p.id
 where u.raw_user_meta_data->>'user_name'='milofrio066' and p.role='admin' and p.status='active';
 if fundador is null then raise exception 'Primero activa milofrio066 como administrador';end if;
 insert into public.content(id,kind,title,body,owner_id,parent_id,starts_at,ends_at,capacity,published) values
 ('f1000000-0000-4000-8000-000000000001','event','[PRUEBA] Laboratorio de ideas de negocio',
 'Evento de demostración de nextONE, sin convocatoria real. Objetivo: practicar inscripciones, comentarios y evaluaciones. Dinámica: presentar un problema, proponer una solución y recibir feedback. No hay videollamada configurada; el organizador debe añadir su enlace real de Zoom desde Editar.',fundador,null,inicio,inicio+interval '2 hours',30,true),
 ('f1000000-0000-4000-8000-000000000002','webinar','[PRUEBA] De una idea a una propuesta de valor',
 'Webinar de ejemplo. Aprendizaje esperado: identificar cliente, problema y propuesta de valor. Agenda: contexto (15 min), explicación (30 min), ejercicio (45 min) y conversación (30 min). Evalúa el webinar y su speaker por separado. No contiene transmisión ni grabación real.',fundador,'f1000000-0000-4000-8000-000000000001',inicio,inicio+interval '2 hours',30,true),
 ('f1000000-0000-4000-8000-000000000003','speaker','[PRUEBA] Speaker por confirmar',
 'Ficha de ejemplo para probar la evaluación individual del speaker. No representa a Daniel ni a un mentor real. En un evento real, reemplaza el título por el nombre del speaker y describe su experiencia. Comenta claridad, aplicabilidad y qué tema te gustaría aprender después.',fundador,'f1000000-0000-4000-8000-000000000002',null,null,null,true),
 ('f1000000-0000-4000-8000-000000000004','resource','[PRUEBA] Guía para validar una idea',
 E'Material de práctica asociado al webinar.\n1. Describe un cliente concreto.\n2. Identifica un problema frecuente.\n3. Formula una propuesta de valor en una frase.\n4. Diseña un experimento pequeño.\n5. Define una señal de éxito observable.\nComenta tu aprendizaje y evalúa la utilidad del material. Si tienes una grabación real, edita este recurso y añade su enlace de YouTube.',fundador,'f1000000-0000-4000-8000-000000000002',null,null,null,true),
 ('f1000000-0000-4000-8000-000000000005','case','[PRUEBA] Builder case: validar una reserva de coworking',
 'Problema de práctica: emprendedores quieren saber si hay espacio disponible antes de ir a un coworking. Construye una demo navegable de reserva, explica a quién ayuda y cómo validarías el negocio. Pulsa Iniciar builder case antes de trabajar. Entrega un enlace HTTPS a tu solución funcional, no un PDF. La comunidad podrá probarla, comentar y evaluar. El tiempo registrado es el intervalo entre inicio y entrega.',fundador,'f1000000-0000-4000-8000-000000000001',now()-interval '1 minute',now()+interval '7 days',null,true),
 ('f1000000-0000-4000-8000-000000000006','project','[PRUEBA] Semillero de validación de negocios',
 'Proyecto de muestra para el futuro espacio universitario. Objetivo: documentar entrevistas, hipótesis y resultados de un prototipo. Este ejemplo no implica una alianza real con una universidad ni con Makers. Los avances se vinculan como contenidos independientes y reciben feedback.',fundador,null,null,null,null,true),
 ('f1000000-0000-4000-8000-000000000007','update','[PRUEBA] Avance inicial: hipótesis por validar',
 'Avance de ejemplo, sin resultados inventados. Hipótesis: conocer disponibilidad de un coworking antes de desplazarse podría reducir fricción. Siguiente paso: entrevistar usuarios reales. Evidencia pendiente: entrevistas, prueba del prototipo y decisiones documentadas.',fundador,'f1000000-0000-4000-8000-000000000006',null,null,null,true),
 ('f1000000-0000-4000-8000-000000000008','post','[PRUEBA] ¿Qué tema quieres para el próximo encuentro?',
 'Publicación para probar la conversación general. Comparte un tema relacionado con negocios, startups o tecnología. Prueba Me gusta, No me gusta, utilidad y comentarios. Las estadísticas solo crecerán cuando personas reales participen.',fundador,null,null,null,null,true)
 on conflict(id) do nothing;
end $$;
commit;
select kind,title from public.content where id::text like 'f1000000-%' order by id;
