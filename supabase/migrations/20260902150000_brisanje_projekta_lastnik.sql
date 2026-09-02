-- BRISANJE PROJEKTA: samo ustvarjalec in admin (Tina, 2. 9. 2026)
--
-- Trdo brisanje iz tabele projects je ze zdaj omejeno na admine. Nase brisanje
-- pa ni trdo: postavimo deleted_at, kar je za bazo navadna sprememba zapisa,
-- politika za spremembe pa dovoli vsakemu clanu, ki projekt vidi. Se pravi, da
-- bi sodelavec lahko odstranil projekt, ki ga ni ustvaril.
--
-- RLS tega ne zna loviti: WITH CHECK vidi samo novo vrstico, ne stare, zato
-- ne more vedeti, da se je deleted_at pravkar spremenil. Sprozilec vidi oboje.

create or replace function public.preveri_brisanje_projekta()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  /* Zanima nas samo prehod iz zivega v izbrisano. Obnovitev (deleted_at nazaj
     na null) in vse ostale spremembe pustimo pri miru. */
  if new.deleted_at is not null and old.deleted_at is null then
    if auth.uid() is null then
      raise exception 'Brisanje zahteva prijavo.' using errcode = '42501';
    end if;
    if new.created_by is distinct from auth.uid()
       and not public.is_organization_admin(new.organization_id) then
      raise exception 'Projekt lahko izbrise samo tisti, ki ga je ustvaril, ali skrbnik.'
        using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists projects_brisanje_lastnik on public.projects;
create trigger projects_brisanje_lastnik
  before update on public.projects
  for each row
  execute function public.preveri_brisanje_projekta();
