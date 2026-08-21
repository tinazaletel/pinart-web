/* TISK DOKUMENTA — odpre novo okno s kopijo stilov in natisne en element.
 *
 * Tina, 21. 8. 2026: »kaj če hočem sprintat business canvas za današnji
 * sestanek ali pa poslovni načrt.«
 *
 * Zakaj novo okno in ne `@media print` na strani: dokument živi znotraj lupine
 * z levim menijem, glavo in auroro. Skrivanje vsega tega prek `:global()` bi
 * pomenilo, da vsaka nova stran lupine podre tisk, ne da bi kdo opazil — tiho
 * in šele takrat, ko uporabnica stoji pred stranko. Novo okno vsebuje SAMO
 * dokument, zato ga lupina ne more pokvariti.
 *
 * Stile kopiramo iz žive strani (`<style>` in `<link rel=stylesheet>`), da je
 * natisnjeno enako videnemu — vključno s styled-jsx razredi, ki jih ni mogoče
 * ponoviti ročno.
 *
 * Vzorec je preizkušen v ArhivWorkspace (gumb PDF pri ponudbi); tu je izluščen,
 * da ga ne pišemo tretjič.
 */

export type TiskMoznosti = {
  /* Robovi strani. A4 ima privzeto 14 mm; širši dokumenti (canvas) prenesejo manj. */
  robMm?: number;
  /* Vodoravno za mreže, ki so širše kot visoke — npr. Business Canvas. */
  lezece?: boolean;
  /* Sporočilo, če brskalnik zavrne pojavno okno. */
  opozorilo?: string;
};

export const natisniElement = (elementId: string, naslov: string, moznosti: TiskMoznosti = {}): boolean => {
  if (typeof document === 'undefined') return false;
  const el = document.getElementById(elementId);
  if (!el) return false;

  const { robMm = 14, lezece = false, opozorilo = 'Za tiskanje omogoči pojavna okna (pop-up).' } = moznosti;
  const stili = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
    .map(s => s.outerHTML).join('\n');

  const okno = window.open('', '_blank', 'width=1100,height=1400');
  if (!okno) { window.alert(opozorilo); return false; }

  /* Naslov okna postane privzeto ime datoteke, ko uporabnica izbere
     »Shrani kot PDF« — zato ni okrasek, ampak ime dokumenta. */
  const varenNaslov = naslov.replace(/[<>&]/g, '').slice(0, 120);

  /* PAST, ki bi se pokazala sele na papirju: `outerHTML` vrne ZACETNO stanje
     polj, ne tega, kar je uporabnica vpisala — vrednost `input`/`textarea`
     zivi v lastnosti DOM, ne v atributu. Nepopravljeno bi se natisnili prazni
     okvirji. Zato delamo klon in polja zamenjamo z navadnim besedilom. */
  const kopija = el.cloneNode(true) as HTMLElement;
  const ziva = el.querySelectorAll('input, textarea, select');
  const klonirana = kopija.querySelectorAll('input, textarea, select');
  ziva.forEach((polje, i) => {
    const klon = klonirana[i];
    if (!klon) return;
    let vrednost = '';
    if (polje instanceof HTMLSelectElement) {
      vrednost = polje.options[polje.selectedIndex]?.text || '';
    } else if (polje instanceof HTMLInputElement) {
      if (polje.type === 'checkbox' || polje.type === 'radio') vrednost = polje.checked ? '✓' : '—';
      else vrednost = polje.value;
    } else if (polje instanceof HTMLTextAreaElement) {
      vrednost = polje.value;
    }
    const nadomestek = document.createElement('div');
    nadomestek.setAttribute('style', 'white-space:pre-wrap;line-height:1.5;color:#111');
    nadomestek.textContent = vrednost.trim() || '—';
    klon.replaceWith(nadomestek);
  });

  okno.document.write(`<!doctype html><html lang="sl"><head><meta charset="utf-8"><title>${varenNaslov}</title>${stili}
<style>
  @page { margin: ${robMm}mm; size: A4 ${lezece ? 'landscape' : 'portrait'}; }
  html, body { margin: 0; background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  /* Dokument mora zavzeti celo stran, brez sence in omejitev iz vmesnika. */
  #${elementId} { box-shadow: none !important; border: none !important; margin: 0 !important; max-width: none !important; width: 100% !important; background: #fff !important; }
  /* Gumbi in polja za vnos na papirju nimajo kaj iskati. */
  #${elementId} button, #${elementId} [data-brez-tiska] { display: none !important; }
  /* Vnosna polja natisnemo kot besedilo, sicer se izpišejo prazni okvirji. */
  #${elementId} input, #${elementId} textarea, #${elementId} select {
    border: 0 !important; background: transparent !important; padding: 0 !important;
    resize: none !important; appearance: none !important; color: #111 !important;
  }
  #${elementId} textarea { height: auto !important; min-height: 0 !important; overflow: visible !important; }
  /* Odstavka ne trgamo čez stran, naslova ne puščamo samega na dnu. */
  #${elementId} h1, #${elementId} h2, #${elementId} h3 { break-after: avoid; }
  #${elementId} section, #${elementId} article, #${elementId} tr { break-inside: avoid; }
</style></head><body>${kopija.outerHTML}</body></html>`);
  okno.document.close();
  okno.focus();

  /* Pol sekunde za pisave in slike. Brez zamika se natisne prazna stran. */
  window.setTimeout(() => { try { okno.print(); } catch { /* uporabnik lahko natisne rocno */ } }, 500);
  return true;
};
