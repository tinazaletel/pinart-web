/*
  Uvodna nastavitev (onboarding).

  En jsonb stolpec namesto stiri locenih: vprasanja se bodo se spreminjala,
  vsako novo pa bi sicer pomenilo novo migracijo in nov deploy. `onboarding`
  hrani odgovore, `onboarding_done_at` pove, ali je uporabnik koncal — ta je
  locen, ker "prazen odgovor" in "se ni koncal" nista isto.

  Odgovori so uporabnikovi in ostanejo v njegovem racunu. V anonimno
  statistiko gre locen zapis prek /api/dogodek, brez povezave na osebo.
*/

alter table public.organization_settings
  add column if not exists onboarding jsonb not null default '{}'::jsonb,
  add column if not exists onboarding_done_at timestamptz;
