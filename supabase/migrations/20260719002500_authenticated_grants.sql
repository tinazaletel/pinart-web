grant usage on schema public to authenticated;

grant select, insert, update, delete on table
  public.organizations,
  public.profiles,
  public.organization_members,
  public.clients,
  public.offers,
  public.contracts,
  public.invoices,
  public.expenses,
  public.business_goals,
  public.accounting_exports
to authenticated;

grant execute on function public.is_organization_member(uuid) to authenticated;
grant execute on function public.is_organization_admin(uuid) to authenticated;

revoke all on table
  public.organizations,
  public.profiles,
  public.organization_members,
  public.clients,
  public.offers,
  public.contracts,
  public.invoices,
  public.expenses,
  public.business_goals,
  public.accounting_exports
from anon;
