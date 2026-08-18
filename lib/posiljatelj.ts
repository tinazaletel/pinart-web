/* Naslov posiljatelja za Resend (RESEND_FROM).

   Resend zahteva obliko "email@example.com" ALI "Ime <email@example.com>".
   Ce v spremenljivki okolja manjka zaklepaj (npr. "Pinart Flow <hello@pinartflow.com"),
   Resend vrne 422 validation_error in mail se NE poslje — tiho, brez sledi v seznamu
   poslanih. To se je zgodilo 19.8.2026 (vabila v ekipo). Zato tu obliko popravimo,
   namesto da bi se zanasali na rocni vnos. */
export function posiljatelj(privzeti = 'Pinart Flow <onboarding@resend.dev>'): string {
  const surov = (process.env.RESEND_FROM || '').trim();
  if (!surov) return privzeti;
  /* ze pravilna oblika: "ime@domena" ali "Ime <ime@domena>" */
  if (/^[^<>@\s]+@[^<>@\s]+$/.test(surov)) return surov;
  if (/^.+<[^<>@\s]+@[^<>@\s]+>$/.test(surov)) return surov;
  /* manjka zaklepaj -> dodamo ga */
  const brezZaklepaja = surov.match(/^(.+)<([^<>@\s]+@[^<>@\s]+)>?$/);
  if (brezZaklepaja) return `${brezZaklepaja[1].trim()} <${brezZaklepaja[2]}>`;
  /* nerazpoznavno -> raje privzeti, kot da posiljanje pade */
  console.error('RESEND_FROM ni v veljavni obliki, uporabljam privzetega:', surov);
  return privzeti;
}
