-- PREMIUM V ENUM IN SLED DO STRIPOVE CENE (2026-08-27)
--
-- Enum public.subscription_tier je nastal julija, ko sta bila paketa dva
-- (free, pro). Cenik ima od 26. 8. tri — free, premium, pro — in webhook bi ob
-- prvem plačilu Premiuma padel na tipu, ne na logiki. Napaka bi bila tiha za
-- uporabnika in glasna šele v dnevniku: plačilo bi šlo skozi pri Stripu,
-- paket pa se ne bi dodelil. Zato gre vrednost v enum PRED prvim plačilom.
--
-- ALTER TYPE ... ADD VALUE sme v transakciji od PG12 naprej, dokler nove
-- vrednosti v isti transakciji ne uporabimo. Tu je ne — samo dodamo jo.
alter type public.subscription_tier add value if not exists 'premium';

-- Katera Stripova lestvica je ceno zaklenila. Ni okras: ko čez leto dni nekdo
-- vpraša, zakaj plačuje 9 € in ne 19 €, mora obstajati zapis, KATERA ponudba
-- mu je bila dodeljena in po kateri lestvici — brez brskanja po Stripu.
alter table if exists public.organization_subscriptions
  add column if not exists cena_lookup_key text;

comment on column public.organization_subscriptions.cena_lookup_key is
  'Stripova lookup key lestvice, po kateri je bila cena zaklenjena (npr. premium_ustanovna).';

-- Pravice ostajajo nespremenjene: član bere, piše samo service_role (webhook).
revoke insert, update, delete on public.organization_subscriptions from authenticated;

-- Dogovor o enoti zneska, zapisan tu, da ga čez pol leta ni treba ugibati:
-- cena_znesek je znesek NA OBRAČUN, tak kot na računu (15,00 mesečno oz.
-- 180,00 letno), ne cena na mesec. Mesečno ceno se izpelje iz cena_obdobje.
comment on column public.organization_subscriptions.cena_znesek is
  'Zaklenjena cena NA OBRAČUN, kot na računu (mesečna: 15,00; letna: 180,00). Obračun bere TO, ne veljavnega cenika.';
