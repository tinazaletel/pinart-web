/* Strukturiran podpis e-pošte: uporabnica izpolni polja, Flow pa sestavi
   OBLIKOVAN, email-varen HTML podpis s klikabilnimi povezavami (tel:, mailto:,
   https:). Ikone so monokromatski BMP dingbati s tekst-varianto (VS15), da jih
   Outlook/Office izriše enako. Shranjeno v K_NAST kot `podpisPodatki`. Star
   prosti `podpisMaila` (navadno besedilo) ostane kot nadomestni fallback. */

export interface PodpisPovezava {
  oznaka: string;   /* npr. "Instagram", "Behance", "Portfelj", "Spletna stran 2" */
  url: string;
}

export interface PodpisPodatki {
  ime?: string;
  funkcija?: string;   /* funkcija / naziv, npr. "Direktorica", "Oblikovalka" */
  naziv?: string;      /* podjetje, npr. "Pinart d.o.o." */
  naslov?: string;     /* naslov podjetja, npr. "Mladinska ulica 63, 1000 Ljubljana" */
  telefon?: string;
  email?: string;
  splet?: string;      /* glavna spletna stran */
  povezave?: PodpisPovezava[]; /* dodatne povezave: druge spletne strani, socialna omrežja, portfelj */
  logo?: boolean;      /* vključi logo (uporabi obstoječi logo dokumentov) */
  pripis?: string;     /* neobvezna zaključna vrstica */
  banner?: string;     /* oglasni banner (data URI slike) na dnu podpisa */
  bannerLink?: string; /* povezava, na katero banner vodi */
  barva?: string;      /* barva povezav/ikon (izbirna; sicer barva poudarka dokumentov) */
}

const esc = (s: string) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/* Ali je podpis dejansko prazen (nobenega uporabnega polja). */
export function podpisPrazen(p?: PodpisPodatki | null): boolean {
  if (!p) return true;
  const imaPovezavo = (p.povezave || []).some(v => (v?.url || '').trim());
  return !((p.ime || '').trim() || (p.funkcija || '').trim() || (p.naziv || '').trim() || (p.naslov || '').trim() || (p.telefon || '').trim() || (p.email || '').trim() || (p.splet || '').trim() || imaPovezavo || (p.pripis || '').trim() || (p.banner || '').trim());
}

/* Sestavi email-varen HTML podpis (inline stili + tabela za poravnavo logotipa).
   `logoUrl` je absoluten/data URI logotip (le če p.logo), `akcent` je barva povezav. */
export function podpisHtml(p: PodpisPodatki, logoUrl = '', akcent = '#1a73e8'): string {
  if (podpisPrazen(p)) return '';
  const tel = (p.telefon || '').trim();
  const em = (p.email || '').trim();
  const akc = (p.barva || '').trim() || akcent;
  const link = `color:${akc};text-decoration:none`;
  const ikona = (znak: string) => `<span style="opacity:.65">${znak}</span>&nbsp;`;
  const naHref = (w: string) => (/^https?:\/\//.test(w) ? w : 'https://' + w);
  const brezProtokola = (w: string) => w.replace(/^https?:\/\//, '').replace(/\/$/, '');

  const vrstice: string[] = [];
  if (tel) vrstice.push(`<a href="tel:${esc(tel.replace(/\s+/g, ''))}" style="color:#333;text-decoration:none">${ikona('&#9742;&#65038;')}${esc(tel)}</a>`);
  if (em) vrstice.push(`<a href="mailto:${esc(em)}" style="${link}">${ikona('&#9993;&#65038;')}${esc(em)}</a>`);
  const splet = (p.splet || '').trim();
  if (splet) vrstice.push(`<a href="${esc(naHref(splet))}" style="${link}">${ikona('&#8599;&#65038;')}${esc(brezProtokola(splet))}</a>`);
  (p.povezave || []).forEach(v => {
    const url = (v?.url || '').trim();
    if (!url) return;
    const oznaka = (v?.oznaka || '').trim() || brezProtokola(url);
    vrstice.push(`<a href="${esc(naHref(url))}" style="${link}">${ikona('&#8599;&#65038;')}${esc(oznaka)}</a>`);
  });
  const kontakt = vrstice.join('&nbsp;&nbsp;&middot;&nbsp;&nbsp;');

  const logoCell = (p.logo && logoUrl)
    ? `<td style="padding-right:14px;vertical-align:middle"><img src="${esc(logoUrl)}" alt="" width="52" style="width:52px;height:auto;display:block;border-radius:6px" /></td>`
    : '';

  const ime = (p.ime || '').trim();
  const funkcija = (p.funkcija || '').trim();
  const naziv = (p.naziv || '').trim();
  const naslov = (p.naslov || '').trim();
  const pripis = (p.pripis || '').trim();
  const banner = (p.banner || '').trim();
  const bannerHref = (p.bannerLink || '').trim() ? naHref((p.bannerLink || '').trim()) : '';
  const bannerImg = `<img src="${esc(banner)}" width="600" alt="" style="width:100%;max-width:600px;height:auto;display:block;border-radius:8px" />`;

  return `<div style="font-family:-apple-system,system-ui,'Segoe UI',sans-serif;font-size:14px;line-height:1.5;color:#1a1a1a">`
    + `<table cellpadding="0" cellspacing="0" style="border-collapse:collapse"><tr>${logoCell}<td style="vertical-align:middle">`
    + (ime ? `<div style="font-weight:700;font-size:15px;color:#111">${esc(ime)}</div>` : '')
    + (funkcija ? `<div style="color:#555;font-size:13px">${esc(funkcija)}</div>` : '')
    + (naziv ? `<div style="color:#666;font-size:13px">${esc(naziv)}</div>` : '')
    + (naslov ? `<div style="color:#888;font-size:12px">${esc(naslov)}</div>` : '')
    + (kontakt ? `<div style="font-size:13px;margin-top:3px">${kontakt}</div>` : '')
    + `</td></tr></table>`
    + (pripis ? `<div style="color:#888;font-size:12px;margin-top:8px">${esc(pripis)}</div>` : '')
    + (banner ? `<div style="margin-top:14px">${bannerHref ? `<a href="${esc(bannerHref)}">${bannerImg}</a>` : bannerImg}</div>` : '')
    + `</div>`;
}
