# Pinart Flow · Supabase

Migracije se izvedejo po imenu oziroma časovnem žigu:

1. `20260718234000_pinart_flow_foundation.sql`
2. `20260719002500_authenticated_grants.sql`
3. `20260719011000_legacy_ids_retainers_settings.sql`
4. `20260719013000_subscription_entitlements.sql`
5. `20260719134500_business_plan_private_time.sql`
6. `20260719171500_business_canvas.sql`
7. `20260722040000_analitika.sql` — anonimno zbiranje podatkov, glej `docs/ANALITIKA.md`
8. `20260722060000_service_role_grants.sql`
9. `20260722070000_onboarding.sql`
10. `20260723143000_multiple_business_canvases.sql` — več Canvasov in blagovnih znamk brez izgube obstoječega

Zadnja migracija doda varne pakete `free/pro`. Uporabnik lahko svoj paket
prebere, ne more pa ga spreminjati iz brskalnika. Plačilni ponudnik ga bo
pozneje posodabljal prek strežniškega webhooka.

Za lokalni razvoj sta v `.env.local` obvezna:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

Samodejno pošiljanje računovodskega ZIP-a zahteva še:

```env
RESEND_API_KEY=
ACCOUNTING_FROM_EMAIL=
```
