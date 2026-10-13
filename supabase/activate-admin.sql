-- Execute AFTER your first successful login in nextONE.
-- Replace the email below with YOUR Google login email. Never promote another person by accident.
do $$
declare target uuid;
begin
 select id into target from auth.users where lower(email)=lower('REEMPLAZAR_TU_CORREO');
 if target is null then raise exception 'Primero inicia sesión en nextONE y reemplaza el correo';end if;
 update public.profiles set role='admin',status='active',source='Fundador nextONE' where id=target;
end $$;
