-- FIX: strežniška koda (service_role prek createAdminClient) mora pisati/brati
-- project_inbox in project_mail:
--   - odhodno: zagotoviInboxToken() ustvari/najde inbox token (project_inbox) + zapiše
--     poslano v project_mail(out);
--   - dohodno: /api/posta/prejeto bere project_inbox po tokenu in vpiše prejeto v project_mail(in).
-- Prvotna migracija (20260730170000) je dala grant samo `authenticated`, zato je
-- service_role dobil "permission denied for table project_inbox". Dodamo grante.
grant all on public.project_inbox to service_role;
grant all on public.project_mail to service_role;
