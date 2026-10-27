begin;

create or replace function public.admin_member_monthly(
  p_user uuid,
  p_month date,
  p_kind text default '',
  p_event text default '',
  p_offset integer default 0
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  first_day date := date_trunc('month', p_month)::date;
  start_at timestamptz;
  end_at timestamptz;
  result jsonb;
begin
  if not public.is_admin() then
    raise exception 'Solo administración';
  end if;

  if first_day is null then
    raise exception 'Selecciona un mes';
  end if;

  start_at := first_day::timestamp
    at time zone 'America/Bogota';

  end_at := (first_day + interval '1 month')::timestamp
    at time zone 'America/Bogota';

  with filtered as materialized (
    select
      a.id,
      a.event,
      a.occurred_at,
      a.details,
      c.title,
      c.kind
    from public.activity_history a
    join public.content c on c.id = a.content_id
    where a.user_id = p_user
      and a.occurred_at >= start_at
      and a.occurred_at < end_at
      and (p_kind = '' or c.kind = p_kind)
      and (p_event = '' or a.event = p_event)
  )
  select jsonb_build_object(
    'total',
    (select count(*) from filtered),

    'days',
    (
      select jsonb_agg(to_jsonb(x) order by x.day)
      from (
        select
          d::date as day,
          (
            select count(*)
            from filtered f
            where (
              f.occurred_at at time zone 'America/Bogota'
            )::date = d::date
          ) as actions
        from generate_series(
          first_day::timestamp,
          (
            first_day + interval '1 month' - interval '1 day'
          )::timestamp,
          interval '1 day'
        ) d
      ) x
    ),

    'kinds',
    coalesce(
      (
        select jsonb_agg(to_jsonb(x))
        from (
          select kind, count(*) as actions
          from filtered
          group by kind
          order by count(*) desc
        ) x
      ),
      '[]'::jsonb
    ),

    'events',
    coalesce(
      (
        select jsonb_agg(
          to_jsonb(x)
          order by x.occurred_at desc, x.id desc
        )
        from (
          select *
          from filtered
          order by occurred_at desc, id desc
          offset greatest(0, p_offset)
          limit 50
        ) x
      ),
      '[]'::jsonb
    )
  )
  into result;

  insert into public.audit_log(
    actor_id,
    action,
    target_id,
    details
  )
  values (
    auth.uid(),
    'member_monthly_consulted',
    p_user,
    'Consulta mensual: ' || first_day::text
  );

  return result;
end;
$$;

revoke all on function public.admin_member_monthly(
  uuid, date, text, text, integer
) from public, anon;

grant execute on function public.admin_member_monthly(
  uuid, date, text, text, integer
) to authenticated;

commit;