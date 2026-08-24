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

/* Naslov, na katerega pridejo ODGOVORI na sistemska sporocila (obvescanje,
   vabila, potrditve). Brez tega gre odgovor na RESEND_FROM (noreply@...), ki
   ga dohodni Cloudflare Worker ne pozna in ga ZAVRNE — posiljatelj dobi
   "555 5.7.1 Neznan prejemnik" (Tina, 24. 8. 2026, odgovor prek Yahooja).
   Ljudje na maile odgovarjajo, tudi na enovice; odboj izgleda kot pokvarjeno
   podjetje. Projektna posta (app/api/posta) ima svoj, pametnejsi reply-to
   (projektni token) in tega NE uporablja. */
export function odgovorNaslov(privzeti = 'tina@pinart.si'): string {
  const surov = (process.env.RESEND_REPLY_TO || '').trim();
  return /^[^<>@\s]+@[^<>@\s]+$/.test(surov) ? surov : privzeti;
}
