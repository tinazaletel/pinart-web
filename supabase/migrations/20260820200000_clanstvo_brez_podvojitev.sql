-- ENO ČLANSTVO NA UPORABNIKA V ORGANIZACIJI (20. 8. 2026)
--
-- Simptom: »Za to dejanje nimaš dovoljenja«, čeprav si lastnica — pri
-- shranjevanju AI ključa in pri nastavitvi oznake za obrazec povpraševanja.
--
-- Vzrok NI v pravicah, ampak v podatkih. Dvanajst zalednih poti bere članstvo z
-- .maybeSingle(), kar zahteva NATANKO eno vrstico. Če jih je za isti par
-- (organizacija, uporabnik) več, poizvedba ne vrne nobene in koda to razume kot
-- »ni član«. Ena podvojena vrstica torej podre ducat funkcij naenkrat.
--
-- Zato tega ne popravljamo v dvanajstih datotekah, ampak pri viru: odstranimo
-- podvojitve in postavimo pravilo, da nastati ne morejo.

-- 1) Obdrži NAJMOČNEJŠO vlogo na par (organizacija, uporabnik), ostale odstrani.
--    Vrstni red: owner > admin > member > karkoli drugega; ob izenačenju obdrži
--    najstarejšo (prva dodelitev je praviloma prava).
delete from public.organization_members m
where m.ctid not in (
  select distinct on (organization_id, user_id) ctid
  from public.organization_members
  order by organization_id, user_id,
    case role when 'owner' then 0 when 'admin' then 1 when 'member' then 2 else 3 end,
    created_at nulls last
);

-- 2) Odslej podvojitev ni več mogoča.
create unique index if not exists organization_members_org_user_uniq
  on public.organization_members (organization_id, user_id);
