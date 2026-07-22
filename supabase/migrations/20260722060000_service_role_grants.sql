/*
  Pravice za service_role na tabelah Flowa.

  Migracija 20260719002500 je pravice dala samo vlogi `authenticated` in jih
  vzela `anon`; na `service_role` se je pozabilo. Posledica: admin (edini, ki
  bere s service-role kljucem) je na `organizations` dobil "permission denied"
  in seznam racunov je ostal prazen — brez sporocila o napaki, ker RLS in
  manjkajoc grant vrneta prazno oz. napako, ki jo je stran pozrla.

  service_role obide RLS, zato tu ne dodajamo politik — samo pravico do tabele.
  Namenoma so nasteje vse tabele Flowa in ne "all tables in schema": nove
  tabele naj se odlocijo zavestno, ne po tihem.
*/

grant usage on schema public to service_role;

grant select, insert, update, delete on table
  public.organizations,
  public.profiles,
  public.organization_members,
  public.organization_subscriptions,
  public.clients,
  public.offers,
  public.contracts,
  public.invoices,
  public.expenses,
  public.business_goals,
  public.accounting_exports,
  public.organization_settings,
  public.retainers,
  public.business_plans,
  public.business_canvases
to service_role;

/* private_time_entries je namenoma izpuscen: dnevnik ur je zaseben in ga
   admin ne bere. */

