/* Strukturiran podpis e-pošte: uporabnica izpolni polja (ime, naziv, telefon,
   email, splet, logo), Flow pa sestavi OBLIKOVAN, email-varen HTML podpis s
   klikabilnimi povezavami (tel:, mailto:, https:). Shranjeno v K_NAST kot
   `podpisPodatki`. Stari prosti `podpisMaila` (navadno besedilo) ostane kot
   nadomestni fallback, da obstoječi podpisi delujejo naprej. */

export interface PodpisPodatki {
  ime?: string;
  naziv?: string;      /* vloga / podjetje, npr. "Pinart · oblikovanje" */
  telefon?: string;
  email?: string;
  splet?: string;
  logo?: boolean;      /* vključi logo (uporabi obstoječi logo dokumentov) */
  pripis?: string;     /* neobvezna zaključna vrstica, npr. "Prosim, odgovorite na to sporočilo." */
}

const esc = (s: string) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/* Ali je podpis dejansko prazen (nobenega uporabnega polja). */
export function podpisPrazen(p?: PodpisPodatki | null): boolean {
  if (!p) return true;
  return !((p.ime || '').trim() || (p.naziv || '').trim() || (p.telefon || '').trim() || (p.email || '').trim() || (p.splet || '').trim() || (p.pripis || '').trim());
}

/* Sestavi email-varen HTML podpis (inline stili + tabela za poravnavo logotipa).
   `logoUrl` je absoluten/data URI logotip (le če p.logo), `akcent` je barva povezav. */
export function podpisHtml(p: PodpisPodatki, logoUrl = '', akcent = '#6E4FA6'): string {
  if (podpisPrazen(p)) return '';
  const tel = (p.telefon || '').trim();
  const em = (p.email || '').trim();
  const web = (p.splet || '').trim();
  const webHref = web ? (/^https?:\/\//.test(web) ? web : 'https://' + web) : '';
  const link = `color:${akcent};text-decoration:none`;

  const vrstice: string[] = [];
  if (tel) vrstice.push(`<a href="tel:${esc(tel.replace(/\s+/g, ''))}" style="color:#333;text-decoration:none">${esc(tel)}</a>`);
  if (em) vrstice.push(`<a href="mailto:${esc(em)}" style="${link}"><span style="opacity:.7">&#9993;</span>&nbsp;${esc(em)}</a>`);
  if (webHref) vrstice.push(`<a href="${esc(webHref)}" style="${link}">${esc(web.replace(/^https?:\/\//, '').replace(/\/$/, ''))}</a>`);
  const kontakt = vrstice.join('&nbsp;&nbsp;&middot;&nbsp;&nbsp;');

  const logoCell = (p.logo && logoUrl)
    ? `<td style="padding-right:14px;vertical-align:middle"><img src="${esc(logoUrl)}" alt="" width="52" style="width:52px;height:auto;display:block;border-radius:6px" /></td>`
    : '';

  const ime = (p.ime || '').trim();
  const naziv = (p.naziv || '').trim();
  const pripis = (p.pripis || '').trim();

  return `<div style="font-family:-apple-system,system-ui,'Segoe UI',sans-serif;font-size:14px;line-height:1.5;color:#1a1a1a">`
    + `<table cellpadding="0" cellspacing="0" style="border-collapse:collapse"><tr>${logoCell}<td style="vertical-align:middle">`
    + (ime ? `<div style="font-weight:700;font-size:15px;color:#111">${esc(ime)}</div>` : '')
    + (naziv ? `<div style="color:#666;font-size:13px">${esc(naziv)}</div>` : '')
    + (kontakt ? `<div style="font-size:13px;margin-top:3px">${kontakt}</div>` : '')
    + `</td></tr></table>`
    + (pripis ? `<div style="color:#888;font-size:12px;margin-top:8px">${esc(pripis)}</div>` : '')
    + `</div>`;
}
