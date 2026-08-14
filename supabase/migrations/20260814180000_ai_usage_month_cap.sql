-- Mesecna kapa Pupine porabe (financna varnost): presteje zahteve organizacije v
-- tekocem KOLEDARSKEM mesecu. Vezano v app/api/pupa (fail-open). Aditivno.
-- Dopolnjuje urno kapo (ai_rate_check) — ta omeji sunke, mesecna pa skupno porabo.
-- Sledi pravilom docs/CODEX-NALOGE-launch.md: security definer, membership guard,
-- eksplicitni grant (nikoli grant on all).

create or replace function public.ai_usage_month_count(p_organization_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select case
    when public.is_organization_member(p_organization_id) then (
      select count(*)::integer
      from public.ai_usage
      where organization_id = p_organization_id
        and created_at >= date_trunc('month', now())
    )
    else 0
  end;
$$;

revoke all on function public.ai_usage_month_count(uuid) from public;
grant execute on function public.ai_usage_month_count(uuid) to authenticated;
