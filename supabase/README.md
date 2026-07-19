# Pinart Flow · Supabase

Migracije se izvedejo po imenu oziroma časovnem žigu:

1. `20260718234000_pinart_flow_foundation.sql`
2. `20260719002500_authenticated_grants.sql`
3. `20260719011000_legacy_ids_retainers_settings.sql`
4. `20260719013000_subscription_entitlements.sql`

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
