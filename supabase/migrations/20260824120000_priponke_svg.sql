-- SVG NAZAJ MED DOVOLJENE PRIPONKE (2026-08-24)
--
-- Prvotna odlocitev je bila SVG zavrniti, ker ga brskalnik IZRISE in lahko
-- pozene skripto v njem. To je res, a napacno sklepanje: nevaren je IZRIS, ne
-- hramba. Oblikovalka logotipe v SVG dobiva ves cas — z zavrnitvijo bi ji vzeli
-- material za delo.
--
-- Zato SVG hranimo, varujemo pa se drugje:
--   1. jeSlika() ga namenoma NE prizna za sliko, zato nikoli ne dobi predogleda;
--   2. povezava do priponke ima Content-Disposition: attachment, zato se v
--      brskalniku ne odpre, ampak prenese;
--   3. ob posiljanju uporabnica dobi opozorilo, da ga nekateri postni strezniki
--      zavrnejo, in predlog, naj ga stisne v .zip.
--
-- Izvrsljive datoteke (exe, msi, bat, cmd, sh, js) ostajajo prepovedane — tam
-- delovnega razloga ni, samo tveganje.

update storage.buckets
set allowed_mime_types = allowed_mime_types || array['image/svg+xml']
where id = 'business-documents'
  and not ('image/svg+xml' = any(allowed_mime_types));
