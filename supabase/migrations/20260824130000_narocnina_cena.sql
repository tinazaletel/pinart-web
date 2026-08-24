-- CENA SE ZAPIŠE NA NAROČNINO (2026-08-24)
--
-- Uporabnici obljubimo: »cena ostane enaka ves čas neprekinjene naročnine«.
-- Če bi ceno ob vsakem obračunu brali iz veljavnega cenika, bi jim prvi dvig
-- ceno tiho povišal in obljuba bi padla. Zato se cena ob prijavi zaklene TU in
-- se od tod bere do konca naročnine.
--
-- veljavna_do = NULL pomeni TRAJNO (ustanovna in uvodna ponudba). To ni
-- pozabljen podatek — je namerna oblika obljube.
--
-- prekinjena = ali je bila naročnina kdaj prekinjena. Ob vrnitvi po prekinitvi
-- velja takratna redna cena, kar je zapisano tudi v ceniku; koda mora ravnati
-- enako, sicer se pisana obljuba in izvedba razideta.
--
-- Piše samo service_role (spletni klic ponudnika plačil). Član organizacije
-- svojo ceno vidi, spremeniti je ne more — to je zapis o denarju.

alter table if exists public.organization_subscriptions
  add column if not exists cena_ponudba text
    check (cena_ponudba is null or cena_ponudba in ('ustanovna', 'uvodna', 'redna')),
  add column if not exists cena_znesek numeric(10, 2)
    check (cena_znesek is null or cena_znesek >= 0),
  add column if not exists cena_valuta text
    check (cena_valuta is null or char_length(cena_valuta) = 3),
  add column if not exists cena_obdobje text
    check (cena_obdobje is null or cena_obdobje in ('mesec', 'leto')),
  add column if not exists cena_veljavna_do timestamptz,
  add column if not exists cena_zaklenjena_ob timestamptz,
  add column if not exists prekinjena boolean not null default false;

comment on column public.organization_subscriptions.cena_znesek is
  'Zaklenjena cena ob prijavi. Obračun bere TO, ne veljavnega cenika.';
comment on column public.organization_subscriptions.cena_veljavna_do is
  'NULL = trajno ob neprekinjeni naročnini. Namerno, ne pozabljeno.';
comment on column public.organization_subscriptions.prekinjena is
  'Ob vrnitvi po prekinitvi zaklenjena cena ne velja več.';

-- Pravice ostanejo, kot so bile: član bere, piše samo service_role.
revoke insert, update, delete on public.organization_subscriptions from authenticated;
