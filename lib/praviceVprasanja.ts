/**
 * PRAVICE UPORABE — vprašanja po storitvah.
 *
 * Zakaj podatkovna tabela in ne obrazec na storitev: storitev je 26 in vsaka
 * ima svoja vprašanja. Če bi jih pisali ročno v vmesnik, bi bila sprememba
 * besedila trideset mest, angleščina pa druga koda. Tu je vse na enem mestu:
 * vprašanje, možnosti in — najpomembneje — KAM gre odgovor.
 *
 * Ločnica, ki jo je postavila Tina (26. 8. 2026):
 *  - specifikacija storitve = kaj izdelaš in predaš (vpraša se enkrat, drugje),
 *  - PRAVICE (ta datoteka) = za kaj in v kakšnem obsegu bo naročnik delo
 *    uporabljal; samo vprašanja, ki dajo predlog zneska ali kratek zapis
 *    uporabe v ponudbi,
 *  - pogodba = kdo vzdržuje, kdo nadaljuje, kdo odgovarja; te prevzame iz
 *    že podanih odgovorov.
 *
 * PRAVILO: odgovori določajo dogovorjeni OBSEG, ne cene. Novih cenovnih
 * množiteljev brez Tinine potrditve ne uvajamo — zato polje `kam` ne pozna
 * vrednosti 'cena'.
 */

export type PravOpcija = { id: string; sl: string; en: string };

export type PravVprasanje = {
  id: string;
  sl: string;
  en: string;
  /* več izbir hkrati (»Kje bo uporabljal« je skoraj vedno več) */
  vec?: boolean;
  /* osnovno = pokaže se takoj; ostalo je pod »Podrobnosti uporabe«.
     Na storitev največ tri osnovna, sicer korak s ceno postane vprašalnik. */
  osnovno?: boolean;
  /* kam gre odgovor: v stavek v ponudbi, v člen pogodbe ali samo v zapis */
  kam: 'ponudba' | 'pogodba' | 'zapis';
  opcije: PravOpcija[];
  namig?: { sl: string; en: string };
  /* Odgovor pove tudi, ali gre za celotno znamko ali za posamezen projekt.
     Kjer je preslikava jasna, genericnega vprasanja ne postavljamo dvakrat
     (Codex + Tina, 26. 8. 2026). */
  preslikavaRabe?: Record<string, 'znamka' | 'projekt'>;
};

/* Povsod na voljo: manjkajoč odgovor NI privolitev v neomejeno uporabo. */
export const PRAV_STALNE: PravOpcija[] = [
  { id: 'nedogovorjeno', sl: 'Še ni dogovorjeno', en: 'Not agreed yet' },
  { id: 'drugo', sl: 'Drugo', en: 'Other' },
];

const kje = (opcije: PravOpcija[], sl = 'Kje bo naročnik uporabljal delo?', en = 'Where will the client use the work?'): PravVprasanje => ({
  id: 'kje', sl, en, vec: true, osnovno: true, kam: 'ponudba', opcije,
});

export const PRAV_VPRASANJA: Record<string, PravVprasanje[]> = {
  logo: [
    {
      id: 'kaj-predstavlja', sl: 'Kaj bo logotip predstavljal?', en: 'What will the logo represent?',
      osnovno: true, kam: 'ponudba',
      preslikavaRabe: { podjetje: 'znamka', podznamka: 'znamka', izdelek: 'projekt', dogodek: 'projekt' },
      opcije: [
        { id: 'podjetje', sl: 'Celotno podjetje ali znamko', en: 'The whole company or brand' },
        { id: 'podznamka', sl: 'Podznamko ali produktno linijo', en: 'A sub-brand or product line' },
        { id: 'izdelek', sl: 'Posamezen izdelek ali storitev', en: 'A single product or service' },
        { id: 'dogodek', sl: 'Dogodek ali projekt', en: 'An event or project' },
      ],
    },
    kje([
      { id: 'splet', sl: 'Splet in družbena omrežja', en: 'Web and social media' },
      { id: 'tisk', sl: 'Poslovne in promocijske tiskovine', en: 'Business and promotional print' },
      { id: 'embalaza', sl: 'Embalaža', en: 'Packaging' },
      { id: 'izdelki', sl: 'Izdelki za prodajo', en: 'Products for sale' },
      { id: 'prostori', sl: 'Prostori, označbe in vozila', en: 'Premises, signage and vehicles' },
    ], 'Kje bo naročnik uporabljal logotip?', 'Where will the client use the logo?'),
    {
      id: 'kdo', sl: 'Kdo ga bo uporabljal?', en: 'Who will use it?',
      osnovno: true, kam: 'ponudba',
      opcije: [
        { id: 'narocnik', sl: 'Samo naročnik', en: 'The client only' },
        { id: 'povezane', sl: 'Tudi povezane družbe ali franšize', en: 'Also affiliates or franchises' },
        { id: 'partnerji', sl: 'Tudi partnerji in distributerji', en: 'Also partners and distributors' },
      ],
      namig: {
        sl: 'Če je logotip že vključen v celostno grafično podobo, iste uporabe ne obračunaj dvakrat.',
        en: 'If the logo is already part of the brand identity, do not charge the same use twice.',
      },
    },
  ],

  cgp: [
    {
      id: 'za-kaj', sl: 'Za kaj velja celostna podoba?', en: 'What does the identity cover?',
      osnovno: true, kam: 'ponudba',
      preslikavaRabe: { podjetje: 'znamka', podznamka: 'znamka', linija: 'projekt', dogodek: 'projekt' },
      opcije: [
        { id: 'podjetje', sl: 'Celotno podjetje ali znamko', en: 'The whole company or brand' },
        { id: 'podznamka', sl: 'Podznamko', en: 'A sub-brand' },
        { id: 'linija', sl: 'Produktno linijo', en: 'A product line' },
        { id: 'dogodek', sl: 'Dogodek ali projekt', en: 'An event or project' },
      ],
    },
    {
      id: 'nadaljnja-uporaba', sl: 'Kako bo naročnik podobo uporabljal naprej?', en: 'How will the client use the identity further?',
      vec: true, osnovno: true, kam: 'ponudba',
      opcije: [
        { id: 'pripravljena', sl: 'Uporabljal bo pripravljena gradiva', en: 'Will use the prepared materials' },
        { id: 'nova', sl: 'Po priročniku bo ustvarjal nova gradiva', en: 'Will create new materials following the guidelines' },
        { id: 'vec-znamk', sl: 'Uporabljal jo bo na več znamkah ali povezanih družbah', en: 'Will use it across several brands or affiliates' },
      ],
    },
    {
      id: 'kdo-pripravlja', sl: 'Kdo bo pripravljal nadaljnja gradiva?', en: 'Who will produce the further materials?',
      kam: 'pogodba',
      opcije: [
        { id: 'jaz', sl: 'Ti', en: 'You' },
        { id: 'narocnik', sl: 'Naročnikova ekipa', en: 'The client team' },
        { id: 'drugi', sl: 'Tudi drugi izvajalci', en: 'Also other contractors' },
      ],
    },
  ],

  web: [
    {
      id: 'ponovna-uporaba', sl: 'Kje bo naročnik ponovno uporabljal rešitev?', en: 'Where will the client reuse the solution?',
      vec: true, osnovno: true, kam: 'ponudba',
      opcije: [
        { id: 'dogovorjena', sl: 'Samo na dogovorjeni spletni strani', en: 'Only on the agreed website' },
        { id: 'vec-strani', sl: 'Tudi na drugih svojih spletnih straneh', en: 'Also on their other websites' },
        { id: 'izdelki', sl: 'Tudi v aplikacijah ali drugih izdelkih', en: 'Also in apps or other products' },
        { id: 'naprej', sl: 'Ponujal jo bo drugim naročnikom', en: 'Will offer it to their own clients' },
      ],
      namig: {
        sl: 'Kaj pri strani je tvoje izvirno delo, poveš v podrobnostih storitve — tu se to ne sprašuje znova.',
        en: 'Which parts of the site are your original work is set in the service details — it is not asked again here.',
      },
    },
    {
      id: 'licenca-predloge', sl: 'Kdo zagotovi licenco predloge, pisav in fotografij?', en: 'Who provides the licence for the template, fonts and photos?',
      osnovno: true, kam: 'ponudba',
      opcije: [
        { id: 'narocnik', sl: 'Naročnik', en: 'The client' },
        { id: 'jaz', sl: 'Ti', en: 'You' },
        { id: 'ni-predloge', sl: 'Predloge ne uporabljam', en: 'No template is used' },
      ],
      namig: {
        sl: 'Dogovor za tvoje izvirne dele je ločen od pogojev predloge, pisav in vtičnikov.',
        en: 'The agreement for your original parts is separate from the terms of the template, fonts and plugins.',
      },
    },
  ],

  ilustracija: [
    kje([
      { id: 'publikacija', sl: 'Publikacija', en: 'Publication' },
      { id: 'splet', sl: 'Splet in družbena omrežja', en: 'Web and social media' },
      { id: 'kampanja', sl: 'Oglasna kampanja', en: 'Advertising campaign' },
      { id: 'embalaza', sl: 'Embalaža', en: 'Packaging' },
      { id: 'izdelki', sl: 'Izdelki za prodajo', en: 'Products for sale' },
      { id: 'prostori', sl: 'Prostori in razstave', en: 'Spaces and exhibitions' },
    ], 'Kje bo ilustracija uporabljena?', 'Where will the illustration be used?'),
    {
      id: 'razvoj', sl: 'Ali jo bo naročnik razvijal naprej?', en: 'Will the client develop it further?',
      osnovno: true, kam: 'ponudba',
      opcije: [
        { id: 'koncna', sl: 'Uporabljal bo končno ilustracijo', en: 'Will use the final illustration' },
        { id: 'izrezi', sl: 'Pripravljal bo izreze in prilagoditve', en: 'Will make crops and adaptations' },
        { id: 'motivi', sl: 'Razvijal bo nove motive ali like', en: 'Will develop new motifs or characters' },
        { id: 'animacija', sl: 'Uporabljal jo bo tudi v animaciji', en: 'Will also use it in animation' },
      ],
    },
  ],

  fotografija: [
    kje([
      { id: 'splet', sl: 'Splet in družbena omrežja naročnika', en: 'The client web and social media' },
      { id: 'tisk', sl: 'Katalogi in tiskovine', en: 'Catalogues and print' },
      { id: 'oglasi', sl: 'Plačano oglaševanje', en: 'Paid advertising' },
      { id: 'embalaza', sl: 'Embalaža', en: 'Packaging' },
      { id: 'izdelki', sl: 'Izdelki za prodajo', en: 'Products for sale' },
      { id: 'mediji', sl: 'Posredovanje medijem za objavo', en: 'Distribution to media for publication' },
    ], 'Za kaj bodo fotografije uporabljene?', 'What will the photos be used for?'),
    {
      id: 'kdo', sl: 'Kdo jih bo uporabljal?', en: 'Who will use them?',
      vec: true, osnovno: true, kam: 'ponudba',
      opcije: [
        { id: 'narocnik', sl: 'Samo naročnik', en: 'The client only' },
        { id: 'povezane', sl: 'Povezane družbe', en: 'Affiliates' },
        { id: 'partnerji', sl: 'Partnerji in distributerji', en: 'Partners and distributors' },
      ],
    },
    {
      id: 'obdelave', sl: 'Katere obdelave so dogovorjene?', en: 'Which edits are agreed?',
      vec: true, kam: 'ponudba',
      opcije: [
        { id: 'izrez', sl: 'Izrez in sprememba velikosti', en: 'Cropping and resizing' },
        { id: 'grafika', sl: 'Dodajanje besedila ali grafike', en: 'Adding text or graphics' },
        { id: 'retusa', sl: 'Nadaljnja retuša', en: 'Further retouching' },
        { id: 'posebej', sl: 'Predelave se dogovorijo posebej', en: 'Alterations agreed separately' },
      ],
    },
  ],
};

/**
 * Raba (celotna znamka / posamezen projekt) iz ze podanih odgovorov.
 * Vrne undefined, kadar odgovora ni ali kadar preslikava ni enolicna — takrat
 * uporabnico vprasamo posebej.
 */
export function rabaIzOdgovorov(sid: string, odgovori: PravOdgovori | undefined): 'znamka' | 'projekt' | undefined {
  if (!odgovori) return undefined;
  const zadetki = new Set<'znamka' | 'projekt'>();
  (PRAV_VPRASANJA[sid] ?? []).forEach(v => {
    if (!v.preslikavaRabe) return;
    (odgovori[v.id] || '').split(' + ').filter(Boolean).forEach(id => {
      const r = v.preslikavaRabe?.[id];
      if (r) zadetki.add(r);
    });
  });
  return zadetki.size === 1 ? [...zadetki][0] : undefined;
}

export function vprasanjaZa(sid: string): PravVprasanje[] {
  return PRAV_VPRASANJA[sid] ?? [];
}

/* Vprašanja, ki stojijo takoj (največ tri), in tista pod »Podrobnosti uporabe«. */
export function osnovnaVprasanja(sid: string): PravVprasanje[] {
  return vprasanjaZa(sid).filter(v => v.osnovno);
}
export function dodatnaVprasanja(sid: string): PravVprasanje[] {
  return vprasanjaZa(sid).filter(v => !v.osnovno);
}

/* Odgovori: id vprašanja -> id-ji izbir (ločeni z ' + '). */
export type PravOdgovori = Record<string, string>;

export const imeOpcije = (v: PravVprasanje, id: string, jeEn: boolean): string => {
  const o = [...v.opcije, ...PRAV_STALNE].find(x => x.id === id);
  return o ? (jeEn ? o.en : o.sl) : id;
};

/**
 * Kratek zapis dogovorjene uporabe za ponudbo. Gre SAMO v besedilo — na ceno
 * ne vpliva. Nedogovorjeno se izpiše kot nedogovorjeno, ne kot dovoljeno.
 */
export function povzetekUporabe(sid: string, odgovori: PravOdgovori | undefined, jeEn = false): string {
  if (!odgovori) return '';
  const deli: string[] = [];
  vprasanjaZa(sid).filter(v => v.kam === 'ponudba').forEach(v => {
    const izbire = (odgovori[v.id] || '').split(' + ').filter(Boolean);
    if (!izbire.length) return;
    const imena = izbire.map(id => imeOpcije(v, id, jeEn).toLowerCase());
    deli.push(`${jeEn ? v.en : v.sl} ${imena.join(', ')}`);
  });
  return deli.join(' · ');
}

/* Vprašanja brez odgovora — pred pošiljanjem ponudbe jih pokažemo, da nihče
   ne bere praznega polja kot dovoljenja. */
export function nedogovorjena(sid: string, odgovori: PravOdgovori | undefined): PravVprasanje[] {
  return vprasanjaZa(sid).filter(v => {
    const a = (odgovori?.[v.id] || '').trim();
    return !a || a === 'nedogovorjeno';
  });
}
