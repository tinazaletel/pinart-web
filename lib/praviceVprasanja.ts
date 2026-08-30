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
  /* Razlaga pod vprasajem (krogec ob vprasanju). Tam, kjer se moznosti
     razlikujejo v zargonu — »ne vem razlike« ne sme biti razlog za napacen
     odgovor (Tina, 26. 8. 2026). */
  razlaga?: { sl: string; en: string };
  /* Odgovor pove tudi, ali gre za celotno znamko ali za posamezen projekt.
     Kjer je preslikava jasna, genericnega vprasanja ne postavljamo dvakrat
     (Codex + Tina, 26. 8. 2026). */
  preslikavaRabe?: Record<string, 'znamka' | 'projekt'>;
  /* Kako se odgovor bere v PogodbI: cel stavek na izbrano moznost. Moznosti so
     pisane uporabnici (»Ti«), pogodba pa govori o izvajalcu — zato lastna
     besedila in ne mehansko sestavljanje. */
  clen?: Record<string, { sl: string; en: string }>;
  /* Kako se odgovor bere v ponudbi. V dokument gre STAVEK, ne vprašanje z
     odgovorom: »Logotip predstavlja: celotno podjetje ali znamko.« */
  stavek?: { sl: string; en: string };
};

/* Povsod na voljo: manjkajoč odgovor NI privolitev v neomejeno uporabo. */
export const PRAV_STALNE: PravOpcija[] = [
  { id: 'nedogovorjeno', sl: 'Še ni dogovorjeno', en: 'Not agreed yet' },
  { id: 'drugo', sl: 'Drugo', en: 'Other' },
];

const kje = (opcije: PravOpcija[], sl = 'Kje bo naročnik uporabljal delo?', en = 'Where will the client use the work?'): PravVprasanje => ({
  id: 'kje', sl, en, vec: true, osnovno: true, kam: 'ponudba', opcije,
  stavek: { sl: 'Uporaba', en: 'Use' },
});

export const PRAV_VPRASANJA: Record<string, PravVprasanje[]> = {
  logo: [
    {
      id: 'kaj-predstavlja', sl: 'Kaj bo logotip predstavljal?', en: 'What will the logo represent?',
      stavek: { sl: 'Logotip predstavlja', en: 'The logo represents' },
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
      stavek: { sl: 'Logotip uporabljajo', en: 'The logo is used by' },
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
      stavek: { sl: 'Celostna podoba velja za', en: 'The identity covers' },
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
      /* Prevprasano v obicajno slovenscino (Tina, 30. 8. 2026): »Kako bo
         uporabljal naprej« je abstraktno — clovek ne ve, kaj se od njega hoce.
         Vprasanje je v resnici: sme samo uporabljati, kar dobi, ali sme s tem
         tudi delati novo in siriti na druge znamke? Od tega je odvisen obseg
         pravic in cena. */
      id: 'nadaljnja-uporaba', sl: 'Kaj bo naročnik smel delati z gradivom?', en: 'What will the client be allowed to do with the materials?',
      namig: {
        sl: 'Več kot dela sam, širše pravice — in višja cena.',
        en: 'The more they do themselves, the broader the rights — and the higher the price.',
      },
      stavek: { sl: 'Naročnik podobo uporablja tako', en: 'The client uses the identity as follows' },
      vec: true, osnovno: true, kam: 'ponudba',
      opcije: [
        { id: 'pripravljena', sl: 'Uporabljal bo samo to, kar mu izročim', en: 'Will only use what I hand over' },
        { id: 'nova', sl: 'Sam bo delal nova gradiva po priročniku', en: 'Will create new materials themselves, following the guidelines' },
        { id: 'vec-znamk', sl: 'Uporabljal bo na več znamkah ali v povezanih podjetjih', en: 'Will use it across several brands or affiliated companies' },
      ],
    },
    {
      id: 'kdo-pripravlja', sl: 'Kdo bo pripravljal nadaljnja gradiva?', en: 'Who will produce the further materials?',
      clen: {
        jaz: { sl: 'Nadaljnja gradiva po celostni podobi pripravlja izvajalec; naročnik jih naroči po dogovorjeni ceni.', en: 'Further materials based on the brand identity are produced by the contractor; the client orders them at the agreed price.' },
        narocnik: { sl: 'Nadaljnja gradiva po celostni podobi pripravlja naročnikova ekipa v skladu s predanim priročnikom.', en: 'Further materials based on the brand identity are produced by the client\'s own team in line with the delivered guidelines.' },
        drugi: { sl: 'Nadaljnja gradiva po celostni podobi smejo pripravljati tudi drugi izvajalci naročnika v skladu s predanim priročnikom.', en: 'Further materials based on the brand identity may also be produced by other contractors engaged by the client, in line with the delivered guidelines.' },
      },
      stavek: { sl: 'Nadaljnja gradiva pripravlja', en: 'Further materials are produced by' },
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
      stavek: { sl: 'Rešitev se uporablja', en: 'The solution is used' },
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
      stavek: { sl: 'Licenco predloge, pisav in fotografij zagotovi', en: 'The licence for the template, fonts and photos is provided by' },
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
      stavek: { sl: 'Naročnik ilustracijo', en: 'The client uses the illustration as follows' },
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
      stavek: { sl: 'Fotografije uporabljajo', en: 'The photos are used by' },
      vec: true, osnovno: true, kam: 'ponudba',
      opcije: [
        { id: 'narocnik', sl: 'Samo naročnik', en: 'The client only' },
        { id: 'povezane', sl: 'Povezane družbe', en: 'Affiliates' },
        { id: 'partnerji', sl: 'Partnerji in distributerji', en: 'Partners and distributors' },
      ],
    },
    {
      id: 'obdelave', sl: 'Katere obdelave so dogovorjene?', en: 'Which edits are agreed?',
      stavek: { sl: 'Dovoljene obdelave', en: 'Permitted edits' },
      vec: true, kam: 'ponudba',
      opcije: [
        { id: 'izrez', sl: 'Izrez in sprememba velikosti', en: 'Cropping and resizing' },
        { id: 'grafika', sl: 'Dodajanje besedila ali grafike', en: 'Adding text or graphics' },
        { id: 'retusa', sl: 'Nadaljnja retuša', en: 'Further retouching' },
        { id: 'posebej', sl: 'Predelave se dogovorijo posebej', en: 'Alterations agreed separately' },
      ],
    },
  ],

  kampanja: [
    {
      id: 'obseg-kampanje', sl: 'Za kakšno uporabo velja kreativna rešitev?', en: 'What use does the creative solution cover?',
      osnovno: true, kam: 'ponudba', stavek: { sl: 'Rešitev velja za', en: 'The solution covers' },
      preslikavaRabe: { ena: 'projekt', vec_valov: 'projekt', vec_kampanj: 'znamka', dolgorocno: 'znamka' },
      opcije: [
        { id: 'ena', sl: 'Eno kampanjo', en: 'One campaign' },
        { id: 'vec_valov', sl: 'Več valov iste kampanje', en: 'Several waves of the same campaign' },
        { id: 'vec_kampanj', sl: 'Več različnih kampanj', en: 'Several different campaigns' },
        { id: 'dolgorocno', sl: 'Dolgoročno komunikacijo znamke', en: 'Long-term brand communication' },
      ],
    },
    {
      id: 'kanali', sl: 'Kje bodo oglasi objavljeni?', en: 'Where will the ads run?',
      vec: true, osnovno: true, kam: 'ponudba', stavek: { sl: 'Objava', en: 'Placement' },
      opcije: [
        { id: 'lastni', sl: 'Naročnikovi spletni kanali', en: 'The client own online channels' },
        { id: 'placani', sl: 'Plačani spletni oglasi', en: 'Paid online ads' },
        { id: 'tisk', sl: 'Tiskani mediji', en: 'Print media' },
        { id: 'zunanje', sl: 'Zunanje oglaševanje', en: 'Outdoor advertising' },
        { id: 'tv', sl: 'Televizija ali kino', en: 'TV or cinema' },
        { id: 'prodajna', sl: 'Prodajna mesta in dogodki', en: 'Points of sale and events' },
      ],
    },
    {
      id: 'prilagoditve', sl: 'Katere nadaljnje prilagoditve so dogovorjene?', en: 'Which further adaptations are agreed?',
      vec: true, kam: 'ponudba', stavek: { sl: 'Dogovorjene prilagoditve', en: 'Agreed adaptations' },
      opcije: [
        { id: 'samo', sl: 'Samo pripravljeni oglasi', en: 'Only the prepared ads' },
        { id: 'formati', sl: 'Dodatni formati', en: 'Additional formats' },
        { id: 'jeziki', sl: 'Jezikovne različice', en: 'Language versions' },
        { id: 'nove', sl: 'Nove vsebinske različice', en: 'New content versions' },
      ],
    },
  ],

  marketing: [
    {
      id: 'obseg-kampanje', sl: 'Za kakšno uporabo velja gradivo?', en: 'What use does the material cover?',
      osnovno: true, kam: 'ponudba', stavek: { sl: 'Gradivo velja za', en: 'The material covers' },
      preslikavaRabe: { ena: 'projekt', vec_valov: 'projekt', dolgorocno: 'znamka' },
      opcije: [
        { id: 'ena', sl: 'Eno akcijo ali objavo', en: 'One campaign or post' },
        { id: 'vec_valov', sl: 'Več objav iste akcije', en: 'Several posts of the same campaign' },
        { id: 'dolgorocno', sl: 'Dolgoročno komunikacijo znamke', en: 'Long-term brand communication' },
      ],
    },
    {
      id: 'kanali', sl: 'Kje bo gradivo objavljeno?', en: 'Where will the material be published?',
      vec: true, osnovno: true, kam: 'ponudba', stavek: { sl: 'Objava', en: 'Placement' },
      opcije: [
        { id: 'lastni', sl: 'Naročnikovi kanali', en: 'The client own channels' },
        { id: 'placani', sl: 'Plačani oglasi', en: 'Paid ads' },
        { id: 'tisk', sl: 'Tiskovine', en: 'Print' },
        { id: 'epota', sl: 'E-pošta', en: 'Email' },
      ],
    },
  ],

  publikacija: [
    {
      id: 'oblika-izdaje', sl: 'V kakšni obliki bo publikacija izdana?', en: 'In what form will the publication be issued?',
      vec: true, osnovno: true, kam: 'ponudba', stavek: { sl: 'Izdaja', en: 'Edition' },
      opcije: [
        { id: 'tisk', sl: 'Tisk', en: 'Print' },
        { id: 'digitalna', sl: 'Digitalna izdaja', en: 'Digital edition' },
      ],
    },
    {
      id: 'izdaje', sl: 'Za katere izdaje velja oblikovanje?', en: 'Which editions does the design cover?',
      vec: true, osnovno: true, kam: 'ponudba', stavek: { sl: 'Oblikovanje velja za', en: 'The design covers' },
      preslikavaRabe: { ena: 'projekt', ponatis: 'projekt', posodobljene: 'projekt', druge: 'znamka' },
      opcije: [
        { id: 'ena', sl: 'Eno izdajo', en: 'One edition' },
        { id: 'ponatis', sl: 'Ponatis iste izdaje', en: 'A reprint of the same edition' },
        { id: 'posodobljene', sl: 'Posodobljene ali jezikovne izdaje', en: 'Updated or language editions' },
        { id: 'druge', sl: 'Druge publikacije po isti predlogi', en: 'Other publications using the same template' },
      ],
    },
  ],

  embalaza: [
    {
      id: 'obseg-izdelkov', sl: 'Za koliko izdelkov velja oblikovanje?', en: 'How many products does the design cover?',
      osnovno: true, kam: 'ponudba', stavek: { sl: 'Oblikovanje velja za', en: 'The design covers' },
      preslikavaRabe: { en_izdelek: 'projekt', razlicice: 'projekt', linija: 'projekt', vec_linij: 'znamka' },
      opcije: [
        { id: 'en_izdelek', sl: 'En izdelek', en: 'One product' },
        { id: 'razlicice', sl: 'Več različic istega izdelka', en: 'Several versions of the same product' },
        { id: 'linija', sl: 'Produktno linijo', en: 'A product line' },
        { id: 'vec_linij', sl: 'Več produktnih linij', en: 'Several product lines' },
      ],
    },
    {
      id: 'prilagoditve', sl: 'Katere prilagoditve so vključene?', en: 'Which adaptations are included?',
      vec: true, osnovno: true, kam: 'ponudba', stavek: { sl: 'Vključene prilagoditve', en: 'Included adaptations' },
      opcije: [
        { id: 'samo', sl: 'Samo potrjena izvedba', en: 'Only the approved version' },
        { id: 'velikosti', sl: 'Druge velikosti embalaže', en: 'Other packaging sizes' },
        { id: 'jeziki', sl: 'Jezikovne različice', en: 'Language versions' },
        { id: 'drugi_izdelki', sl: 'Prenos oblikovanja na druge izdelke', en: 'Transfer of the design to other products' },
      ],
    },
    {
      id: 'proizvodnja', sl: 'Za kakšen obseg proizvodnje se dogovarjata?', en: 'What production volume is agreed?',
      kam: 'ponudba', stavek: { sl: 'Obseg proizvodnje', en: 'Production volume' },
      opcije: [
        { id: 'stevilo', sl: 'Določeno število kosov', en: 'A defined number of units' },
        { id: 'obdobje', sl: 'Proizvodnjo v dogovorjenem obdobju', en: 'Production within an agreed period' },
        { id: 'brez', sl: 'Brez količinske omejitve', en: 'No quantity limit' },
      ],
    },
  ],

  copy: [
    {
      id: 'kje-objava', sl: 'Kje bodo besedila uporabljena?', en: 'Where will the texts be used?',
      vec: true, osnovno: true, kam: 'ponudba', stavek: { sl: 'Uporaba', en: 'Use' },
      opcije: [
        { id: 'splet', sl: 'Spletna stran', en: 'Website' },
        { id: 'oglasi', sl: 'Oglasi in kampanje', en: 'Ads and campaigns' },
        { id: 'tisk', sl: 'Publikacije in tiskovine', en: 'Publications and print' },
        { id: 'epota', sl: 'E-pošta in družbena omrežja', en: 'Email and social media' },
        { id: 'embalaza', sl: 'Embalaža', en: 'Packaging' },
        { id: 'govor', sl: 'Govor, video ali zvočni posnetek', en: 'Speech, video or audio' },
      ],
    },
    {
      id: 'nadaljnje', sl: 'Katere nadaljnje uporabe so dogovorjene?', en: 'Which further uses are agreed?',
      vec: true, osnovno: true, kam: 'ponudba', stavek: { sl: 'Dogovorjena nadaljnja uporaba', en: 'Agreed further use' },
      opcije: [
        { id: 'samo', sl: 'Samo dogovorjene objave', en: 'Only the agreed publications' },
        { id: 'ponovna', sl: 'Ponovna uporaba v drugih gradivih', en: 'Reuse in other materials' },
        { id: 'prevodi', sl: 'Prevodi', en: 'Translations' },
        { id: 'predelave', sl: 'Vsebinske predelave in krajšanje', en: 'Content edits and shortening' },
      ],
    },
  ],

  video: [
    {
      id: 'predvajanje', sl: 'Kje bo video predvajan?', en: 'Where will the video be shown?',
      vec: true, osnovno: true, kam: 'ponudba', stavek: { sl: 'Predvajanje', en: 'Distribution' },
      opcije: [
        { id: 'lastni', sl: 'Naročnikovi spletni kanali', en: 'The client online channels' },
        { id: 'placani', sl: 'Plačani spletni oglasi', en: 'Paid online ads' },
        { id: 'dogodki', sl: 'Dogodki in predstavitve', en: 'Events and presentations' },
        { id: 'tv', sl: 'Televizija', en: 'Television' },
        { id: 'kino', sl: 'Kino', en: 'Cinema' },
        { id: 'zasloni', sl: 'Javni in prodajni zasloni', en: 'Public and retail screens' },
      ],
    },
    {
      id: 'razlicice', sl: 'Katere različice sme naročnik uporabljati?', en: 'Which versions may the client use?',
      vec: true, osnovno: true, kam: 'ponudba', stavek: { sl: 'Dogovorjene različice', en: 'Agreed versions' },
      opcije: [
        { id: 'koncni', sl: 'Končni dogovorjeni video', en: 'The final agreed video' },
        { id: 'izseki', sl: 'Dogovorjene krajše izseke', en: 'Agreed shorter cuts' },
        { id: 'jeziki', sl: 'Jezikovne različice', en: 'Language versions' },
        { id: 'nove', sl: 'Nove montaže iz posnetega gradiva', en: 'New edits from the recorded material' },
      ],
      namig: {
        sl: 'Glasba, nastopajoči in kupljeni posnetki imajo lahko svoje pogoje uporabe; predajo surovih posnetkov dogovori posebej.',
        en: 'Music, performers and stock footage may carry their own terms; agree the handover of raw footage separately.',
      },
    },
  ],

  motion: [
    {
      id: 'namen', sl: 'Za kaj bo animacija uporabljena?', en: 'What will the animation be used for?',
      vec: true, osnovno: true, kam: 'ponudba', stavek: { sl: 'Namen', en: 'Purpose' },
      preslikavaRabe: { znamka: 'znamka', kampanja: 'projekt' },
      opcije: [
        { id: 'znamka', sl: 'Predstavitev znamke ali logotipa', en: 'Brand or logo presentation' },
        { id: 'kampanja', sl: 'Oglasna kampanja', en: 'Advertising campaign' },
        { id: 'razlagalni', sl: 'Razlagalni video', en: 'Explainer video' },
        { id: 'izdelek', sl: 'Spletna stran ali aplikacija', en: 'Website or app' },
        { id: 'dogodek', sl: 'Dogodek ali projekcija', en: 'Event or projection' },
      ],
    },
    {
      id: 'elementi', sl: 'Kaj sme naročnik uporabiti tudi drugje?', en: 'What may the client reuse elsewhere?',
      vec: true, osnovno: true, kam: 'ponudba', stavek: { sl: 'Dogovorjena ponovna uporaba', en: 'Agreed reuse' },
      opcije: [
        { id: 'koncna', sl: 'Samo končno animacijo', en: 'Only the final animation' },
        { id: 'elementi', sl: 'Posamezne animirane elemente', en: 'Individual animated elements' },
        { id: 'liki', sl: 'Like in ilustracije', en: 'Characters and illustrations' },
        { id: 'predloge', sl: 'Prilagodljive animacijske predloge', en: 'Editable animation templates' },
      ],
    },
  ],

  uxui: [
    {
      id: 'izdelek', sl: 'Za kateri izdelek velja oblikovanje?', en: 'Which product does the design cover?',
      osnovno: true, kam: 'ponudba', stavek: { sl: 'Oblikovanje velja za', en: 'The design covers' },
      razlaga: {
        sl: 'Spletna stran predstavlja podjetje — obiskovalec bere in se poveže (predstavitvena stran, trgovina, blog). '
          + 'Spletna aplikacija je orodje v brskalniku, v katerem uporabnik dela: prijava, vnašanje podatkov, zasloni s seznami in obrazci (portal, rezervacije, nadzorna plošča). '
          + 'Mobilna aplikacija je isto, le da se namesti na telefon. '
          + '»Več povezanih izdelkov« izberi, kadar dela ni mogoče ločiti — na primer stran in aplikacija z isto grafično govorico ali dizajn sistem, ki velja za vse.',
        en: 'A website presents the company — the visitor reads and gets in touch (a presentation site, a shop, a blog). '
          + 'A web app is a tool inside the browser where the user works: sign-in, entering data, screens with lists and forms (a portal, bookings, a dashboard). '
          + 'A mobile app is the same thing, installed on the phone. '
          + 'Pick «Several connected products» when the work cannot be split — for example a site and an app sharing one visual language, or a design system that covers everything.',
      },
      preslikavaRabe: { stran: 'projekt', spletna: 'projekt', mobilna: 'projekt', vec: 'znamka' },
      opcije: [
        { id: 'stran', sl: 'Spletno stran', en: 'A website' },
        { id: 'spletna', sl: 'Spletno aplikacijo', en: 'A web app' },
        { id: 'mobilna', sl: 'Mobilno aplikacijo', en: 'A mobile app' },
        { id: 'vec', sl: 'Več povezanih izdelkov', en: 'Several connected products' },
      ],
    },
    {
      id: 'ponovna', sl: 'Kaj sme naročnik ponovno uporabiti?', en: 'What may the client reuse?',
      vec: true, osnovno: true, kam: 'ponudba', stavek: { sl: 'Dogovorjena ponovna uporaba', en: 'Agreed reuse' },
      opcije: [
        { id: 'zasloni', sl: 'Dogovorjene zaslone', en: 'The agreed screens' },
        { id: 'nadgradnje', sl: 'Komponente pri nadgradnjah istega izdelka', en: 'Components in upgrades of the same product' },
        { id: 'drugi', sl: 'Komponente tudi v drugih izdelkih', en: 'Components in other products too' },
      ],
    },
    {
      id: 'razvija', sl: 'Kdo bo oblikovanje razvijal naprej?', en: 'Who will develop the design further?',
      clen: {
        jaz: { sl: 'Oblikovanje izdelka razvija naprej izvajalec; nadaljnje delo se naroči posebej.', en: 'The product design is developed further by the contractor; further work is commissioned separately.' },
        narocnik: { sl: 'Oblikovanje izdelka sme naročnikova ekipa razvijati naprej v okviru dogovorjene uporabe.', en: 'The client\'s team may develop the product design further within the agreed scope of use.' },
        drugi: { sl: 'Oblikovanje izdelka smejo razvijati naprej tudi drugi izvajalci naročnika v okviru dogovorjene uporabe.', en: 'Other contractors engaged by the client may also develop the product design further, within the agreed scope of use.' },
      },
      kam: 'pogodba', stavek: { sl: 'Oblikovanje razvija naprej', en: 'The design is developed further by' },
      opcije: [
        { id: 'jaz', sl: 'Ti', en: 'You' },
        { id: 'narocnik', sl: 'Naročnikova ekipa', en: 'The client team' },
        { id: 'drugi', sl: 'Tudi drugi izvajalci', en: 'Also other contractors' },
      ],
    },
  ],

  aplikacija: [
    {
      id: 'uporaba', sl: 'Kako bo naročnik uporabljal aplikacijo?', en: 'How will the client use the app?',
      osnovno: true, kam: 'ponudba', stavek: { sl: 'Aplikacija se uporablja', en: 'The app is used' },
      preslikavaRabe: { interno: 'projekt', storitev: 'znamka', prodaja: 'znamka' },
      opcije: [
        { id: 'interno', sl: 'Za interno delo', en: 'For internal work' },
        { id: 'storitev', sl: 'Kot storitev za svoje uporabnike', en: 'As a service for their users' },
        { id: 'prodaja', sl: 'Prodajal jo bo drugim podjetjem', en: 'Will sell it to other companies' },
        { id: 'prilagajanje', sl: 'Prilagajal jo bo za različne naročnike', en: 'Will adapt it for different clients' },
      ],
    },
    {
      id: 'nadaljnji-razvoj', sl: 'Kaj je dogovorjeno za nadaljnji razvoj?', en: 'What is agreed for further development?',
      clen: {
        jaz: { sl: 'Vzdrževanje in nadaljnji razvoj aplikacije ostaneta pri izvajalcu; obseg in cena se dogovorita posebej.', en: 'Maintenance and further development of the application stay with the contractor; scope and price are agreed separately.' },
        narocnik: { sl: 'Nadaljnji razvoj aplikacije prevzame naročnik; izvajalec mu ob predaji izroči izvorno kodo in dokumentacijo v dogovorjenem obsegu.', en: 'The client takes over further development of the application; on handover the contractor delivers the source code and documentation in the agreed scope.' },
        drugi: { sl: 'Nadaljnji razvoj aplikacije sme prevzeti tudi drug izvajalec naročnika; izvajalec mu ob predaji izroči izvorno kodo in dokumentacijo v dogovorjenem obsegu.', en: 'Another contractor engaged by the client may also take over further development; on handover the contractor delivers the source code and documentation in the agreed scope.' },
      },
      osnovno: true, kam: 'pogodba', stavek: { sl: 'Nadaljnji razvoj', en: 'Further development' },
      opcije: [
        { id: 'jaz', sl: 'Vzdrževanje in razvoj ostaneta pri tebi', en: 'Maintenance and development stay with you' },
        { id: 'narocnik', sl: 'Naročnik prevzame razvoj', en: 'The client takes over development' },
        { id: 'drugi', sl: 'Razvoj lahko prevzame drug izvajalec', en: 'Another contractor may take over' },
      ],
      namig: {
        sl: 'Predajo izvorne kode ter pogoje zunanjih in odprtokodnih komponent dogovorita ločeno.',
        en: 'Agree the handover of source code and the terms of third-party and open-source components separately.',
      },
    },
  ],

  dizajnsistem: [
    {
      id: 'obseg', sl: 'Za koliko izdelkov je sistem namenjen?', en: 'How many products is the system for?',
      osnovno: true, kam: 'ponudba', stavek: { sl: 'Sistem je namenjen', en: 'The system covers' },
      preslikavaRabe: { en: 'projekt', vec: 'znamka', znamka: 'znamka', vec_znamk: 'znamka' },
      opcije: [
        { id: 'en', sl: 'En izdelek', en: 'One product' },
        { id: 'vec', sl: 'Več povezanih izdelkov', en: 'Several connected products' },
        { id: 'znamka', sl: 'Vse izdelke ene znamke', en: 'All products of one brand' },
        { id: 'vec_znamk', sl: 'Več znamk', en: 'Several brands' },
      ],
    },
    {
      id: 'kdo-uporablja', sl: 'Kdo bo sistem uporabljal?', en: 'Who will use the system?',
      vec: true, osnovno: true, kam: 'ponudba', stavek: { sl: 'Sistem uporabljajo', en: 'The system is used by' },
      opcije: [
        { id: 'ena', sl: 'Ena naročnikova ekipa', en: 'One client team' },
        { id: 'vec', sl: 'Več naročnikovih ekip', en: 'Several client teams' },
        { id: 'zunanji', sl: 'Tudi zunanji izvajalci', en: 'Also external contractors' },
      ],
    },
    {
      id: 'sirjenje', sl: 'Ali smejo sistem širiti in prilagajati?', en: 'May they extend and adapt the system?',
      vec: true, kam: 'ponudba', stavek: { sl: 'Dogovorjeno širjenje', en: 'Agreed extension' },
      opcije: [
        { id: 'pripravljene', sl: 'Uporabljajo pripravljene komponente', en: 'They use the prepared components' },
        { id: 'nove', sl: 'Dodajajo nove komponente', en: 'They add new components' },
        { id: 'druge', sl: 'Prilagajajo sistem drugim izdelkom ali znamkam', en: 'They adapt it to other products or brands' },
      ],
    },
  ],

  render3d: [
    {
      id: 'namen', sl: 'Za kaj bodo vizualizacije uporabljene?', en: 'What will the visualisations be used for?',
      vec: true, osnovno: true, kam: 'ponudba', stavek: { sl: 'Uporaba', en: 'Use' },
      opcije: [
        { id: 'interno', sl: 'Interno načrtovanje', en: 'Internal planning' },
        { id: 'predstavitev', sl: 'Predstavitev projekta ali izdelka', en: 'Project or product presentation' },
        { id: 'prodaja', sl: 'Prodaja in oglaševanje', en: 'Sales and advertising' },
        { id: 'interaktivno', sl: 'Interaktivni prikaz', en: 'Interactive display' },
      ],
    },
    {
      id: 'predmet', sl: 'Kaj je predmet predaje?', en: 'What is handed over?',
      vec: true, osnovno: true, kam: 'ponudba', stavek: { sl: 'Predaja zajema', en: 'The handover covers' },
      opcije: [
        { id: 'slike', sl: 'Končne slike', en: 'Final images' },
        { id: 'video', sl: 'Končni video', en: 'Final video' },
        { id: 'interaktivno', sl: 'Interaktivno vsebino', en: 'Interactive content' },
        { id: 'model', sl: 'Tudi 3D-model', en: 'The 3D model as well' },
      ],
    },
  ],

  interier: [
    {
      id: 'prostor', sl: 'Za kateri prostor velja zasnova?', en: 'Which space does the design cover?',
      osnovno: true, kam: 'ponudba', stavek: { sl: 'Zasnova velja za', en: 'The design covers' },
      preslikavaRabe: { en: 'projekt', vec_prostorov: 'projekt', vec_lokacij: 'znamka', tipska: 'znamka' },
      opcije: [
        { id: 'en', sl: 'En konkreten prostor ali objekt', en: 'One specific space or building' },
        { id: 'vec_prostorov', sl: 'Več prostorov na isti lokaciji', en: 'Several spaces at the same location' },
        { id: 'vec_lokacij', sl: 'Več naročnikovih lokacij', en: 'Several client locations' },
        { id: 'tipska', sl: 'Tipsko ureditev za ponavljanje', en: 'A repeatable standard layout' },
      ],
    },
    {
      id: 'ponovitev', sl: 'Ali sme naročnik zasnovo ponovno izvesti?', en: 'May the client build the design again?',
      osnovno: true, kam: 'ponudba', stavek: { sl: 'Ponovna izvedba', en: 'Repeat build' },
      opcije: [
        { id: 'samo', sl: 'Samo na dogovorjeni lokaciji', en: 'Only at the agreed location' },
        { id: 'dodatne', sl: 'Na dodatnih navedenih lokacijah', en: 'At additional named locations' },
        { id: 'posebej', sl: 'Ponovitev se dogovori posebej', en: 'Repeats are agreed separately' },
      ],
    },
  ],

  arhitektura: [
    {
      id: 'izvedba', sl: 'Za katero izvedbo velja rešitev?', en: 'Which build does the solution cover?',
      osnovno: true, kam: 'ponudba', stavek: { sl: 'Rešitev velja za', en: 'The solution covers' },
      preslikavaRabe: { en: 'projekt', vec: 'projekt', tipski: 'znamka' },
      opcije: [
        { id: 'en', sl: 'En določen objekt', en: 'One specific building' },
        { id: 'vec', sl: 'Več določenih objektov', en: 'Several specific buildings' },
        { id: 'tipski', sl: 'Tipski objekt za večkratno izvedbo', en: 'A standard building for repeated construction' },
      ],
    },
    {
      id: 'gradiva', sl: 'Kako bo naročnik uporabljal predstavitvena gradiva?', en: 'How will the client use the presentation materials?',
      vec: true, osnovno: true, kam: 'ponudba', stavek: { sl: 'Predstavitvena gradiva', en: 'Presentation materials' },
      opcije: [
        { id: 'izvedba', sl: 'Za razvoj in izvedbo projekta', en: 'For developing and building the project' },
        { id: 'prodaja', sl: 'Tudi za prodajo ali promocijo objekta', en: 'Also to sell or promote the building' },
        { id: 'drugi', sl: 'Tudi za predstavitev drugih projektov', en: 'Also to present other projects' },
      ],
      namig: {
        sl: 'Dogovor o uporabi gradiv ne nadomešča dogovora o projektantskih nalogah in odgovornostih.',
        en: 'An agreement on the use of materials does not replace the agreement on design tasks and responsibilities.',
      },
    },
  ],

  razstava: [
    {
      id: 'uporaba', sl: 'Za kakšno uporabo je zasnova namenjena?', en: 'What use is the design intended for?',
      osnovno: true, kam: 'ponudba', stavek: { sl: 'Zasnova je namenjena', en: 'The design is intended for' },
      preslikavaRabe: { en: 'projekt', ponovitve: 'projekt', gostovanje: 'projekt', trajna: 'znamka' },
      opcije: [
        { id: 'en', sl: 'En dogodek ali postavitev', en: 'One event or installation' },
        { id: 'ponovitve', sl: 'Več ponovitev istega dogodka', en: 'Several repeats of the same event' },
        { id: 'gostovanje', sl: 'Gostovanje na več lokacijah', en: 'Touring several locations' },
        { id: 'trajna', sl: 'Trajno postavitev', en: 'A permanent installation' },
      ],
    },
    {
      id: 'spremembe', sl: 'Ali bodo zasnovo pri ponovitvah spreminjali?', en: 'Will the design change on repeats?',
      vec: true, osnovno: true, kam: 'ponudba', stavek: { sl: 'Pri ponovitvah', en: 'On repeats' },
      opcije: [
        { id: 'ista', sl: 'Uporabili bodo isto izvedbo', en: 'They will use the same build' },
        { id: 'prostor', sl: 'Prilagajali jo bodo prostoru', en: 'They will adapt it to the space' },
        { id: 'elementi', sl: 'Uporabljali bodo posamezne elemente', en: 'They will use individual elements' },
        { id: 'nove', sl: 'Pripravljali bodo nove izvedbe na njeni osnovi', en: 'They will create new builds based on it' },
      ],
    },
  ],

  produktni: [
    {
      id: 'proizvodnja', sl: 'Za kakšno proizvodnjo je rešitev namenjena?', en: 'What production is the solution intended for?',
      osnovno: true, kam: 'ponudba', stavek: { sl: 'Rešitev je namenjena', en: 'The solution is intended for' },
      preslikavaRabe: { unikat: 'projekt', serija: 'projekt', serijska: 'znamka' },
      opcije: [
        { id: 'unikat', sl: 'En unikat', en: 'A single unique piece' },
        { id: 'serija', sl: 'Omejeno serijo', en: 'A limited series' },
        { id: 'serijska', sl: 'Serijsko proizvodnjo', en: 'Mass production' },
      ],
    },
    {
      id: 'izdelki', sl: 'Kaj sme proizvajalec izdelovati na njeni osnovi?', en: 'What may the manufacturer produce from it?',
      vec: true, osnovno: true, kam: 'ponudba', stavek: { sl: 'Dogovorjena proizvodnja', en: 'Agreed production' },
      opcije: [
        { id: 'dogovorjeni', sl: 'Dogovorjeni izdelek', en: 'The agreed product' },
        { id: 'razlicice', sl: 'Različice istega izdelka', en: 'Versions of the same product' },
        { id: 'druzina', sl: 'Celotno družino izdelkov', en: 'A whole product family' },
      ],
    },
    {
      id: 'kdo-proizvaja', sl: 'Kdo sme izdelek proizvajati?', en: 'Who may manufacture the product?',
      vec: true, kam: 'ponudba', stavek: { sl: 'Izdelek proizvaja', en: 'The product is manufactured by' },
      opcije: [
        { id: 'narocnik', sl: 'Naročnik', en: 'The client' },
        { id: 'pogodbeni', sl: 'Navedeni pogodbeni proizvajalci', en: 'Named contract manufacturers' },
        { id: 'drugi', sl: 'Tudi drugi po dodatnem dogovoru', en: 'Others, subject to further agreement' },
      ],
    },
  ],

  direkcija: [
    {
      id: 'predaja', sl: 'Kaj poleg vodenja predajaš naročniku?', en: 'What besides direction do you hand over?',
      vec: true, osnovno: true, kam: 'ponudba', stavek: { sl: 'Predaja zajema', en: 'The handover covers' },
      opcije: [
        { id: 'koncept', sl: 'Kreativni koncept', en: 'The creative concept' },
        { id: 'smernice', sl: 'Vizualne smernice', en: 'Visual guidelines' },
        { id: 'scenarij', sl: 'Scenarij ali storyboard', en: 'A script or storyboard' },
        { id: 'vizuali', sl: 'Konkretne vizuale oziroma gradiva', en: 'Specific visuals or materials' },
        { id: 'samo_vodenje', sl: 'Samo svetovanje in vodenje', en: 'Advice and direction only' },
      ],
      namig: {
        sl: 'Če gre samo za vodenje, pravic ne zaračunaj; posamezna gradiva poveži z njihovimi storitvami.',
        en: 'If it is direction only, do not charge rights; connect individual materials to their own services.',
      },
    },
    {
      id: 'obseg', sl: 'Za kaj sme naročnik uporabiti rešitev?', en: 'What may the client use the solution for?',
      osnovno: true, kam: 'ponudba', stavek: { sl: 'Rešitev se uporablja za', en: 'The solution is used for' },
      preslikavaRabe: { projekt: 'projekt', nadaljevanja: 'projekt', drugi: 'znamka', dolgorocno: 'znamka' },
      opcije: [
        { id: 'projekt', sl: 'Dogovorjeni projekt', en: 'The agreed project' },
        { id: 'nadaljevanja', sl: 'Nadaljevanja istega projekta', en: 'Continuations of the same project' },
        { id: 'drugi', sl: 'Druge projekte ali kampanje', en: 'Other projects or campaigns' },
        { id: 'dolgorocno', sl: 'Dolgoročno komunikacijo znamke', en: 'Long-term brand communication' },
      ],
    },
  ],

  strategija: [
    {
      id: 'gradiva', sl: 'Katera gradiva so predmet dogovora?', en: 'Which materials does the agreement cover?',
      vec: true, osnovno: true, kam: 'ponudba', stavek: { sl: 'Dogovor zajema', en: 'The agreement covers' },
      opcije: [
        { id: 'dokument', sl: 'Strateški dokument', en: 'The strategy document' },
        { id: 'pozicioniranje', sl: 'Pozicioniranje in sporočilni okvir', en: 'Positioning and messaging framework' },
        { id: 'ime', sl: 'Ime in slogan', en: 'Name and tagline' },
        { id: 'poimenovanje', sl: 'Poimenovalni sistem', en: 'Naming system' },
      ],
      namig: {
        sl: 'Dogovor naj se nanaša na konkretna gradiva, ne na izključnost nad splošnimi idejami ali metodami.',
        en: 'The agreement should cover specific materials, not exclusivity over general ideas or methods.',
      },
    },
    {
      id: 'za-koga', sl: 'Za koga je strategija pripravljena?', en: 'Who is the strategy prepared for?',
      osnovno: true, kam: 'ponudba', stavek: { sl: 'Strategija je pripravljena za', en: 'The strategy is prepared for' },
      preslikavaRabe: { znamka: 'znamka', podznamka: 'projekt', vec: 'znamka' },
      opcije: [
        { id: 'znamka', sl: 'Eno znamko', en: 'One brand' },
        { id: 'podznamka', sl: 'Podznamko ali produktno linijo', en: 'A sub-brand or product line' },
        { id: 'vec', sl: 'Več znamk istega naročnika', en: 'Several brands of the same client' },
      ],
    },
  ],

  smm: [
    {
      id: 'vsebine', sl: 'Ali poleg vodenja ustvarjaš tudi izvirne vsebine?', en: 'Besides managing, do you create original content?',
      vec: true, osnovno: true, kam: 'ponudba', stavek: { sl: 'Nastajajo', en: 'Created materials' },
      opcije: [
        { id: 'ne', sl: 'Ne, uporabljam naročnikova gradiva', en: 'No, I use the client materials' },
        { id: 'besedila', sl: 'Besedila', en: 'Texts' },
        { id: 'vizuali', sl: 'Vizuali', en: 'Visuals' },
        { id: 'foto', sl: 'Fotografije', en: 'Photos' },
        { id: 'video', sl: 'Video ali animacije', en: 'Video or animation' },
      ],
      namig: {
        sl: 'Če so fotografiranje, video ali besedila že samostojne postavke, uporabi njihove pogoje in ne podvajaj obračuna.',
        en: 'If photography, video or copy are already separate items, use their terms and do not charge twice.',
      },
    },
    {
      id: 'po-koncu', sl: 'Ali je dogovorjena uporaba po koncu sodelovanja?', en: 'Is use after the engagement agreed?',
      osnovno: true, kam: 'ponudba', stavek: { sl: 'Po koncu sodelovanja', en: 'After the engagement' },
      opcije: [
        { id: 'da', sl: 'Da, v dogovorjenem obsegu', en: 'Yes, within the agreed scope' },
        { id: 'objavljene', sl: 'Samo že objavljene vsebine ostanejo objavljene', en: 'Only already published content stays online' },
      ],
    },
  ],

  seo: [
    {
      id: 'gradiva', sl: 'Ali v okviru SEO nastajajo tudi nova gradiva?', en: 'Does the SEO work create new materials?',
      vec: true, osnovno: true, kam: 'ponudba', stavek: { sl: 'Nastajajo', en: 'Created materials' },
      opcije: [
        { id: 'ne', sl: 'Ne, samo analiza in tehnična optimizacija', en: 'No, only analysis and technical optimisation' },
        { id: 'besedila', sl: 'Nova besedila', en: 'New texts' },
        { id: 'predelave', sl: 'Predelave obstoječih besedil', en: 'Edits of existing texts' },
        { id: 'orodja', sl: 'Lastna orodja ali skripte', en: 'Own tools or scripts' },
      ],
      namig: {
        sl: 'Za besedila uporabi pogoje storitve »Besedila«; za samo tehnično optimizacijo pravic ne zaračunaj.',
        en: 'For texts use the terms of the copywriting service; for technical optimisation alone, do not charge rights.',
      },
    },
  ],

  email: [
    {
      id: 'kaj-pripravljas', sl: 'Kaj pripravljaš poleg pošiljanja?', en: 'What do you prepare besides sending?',
      vec: true, osnovno: true, kam: 'ponudba', stavek: { sl: 'Pripravljaš', en: 'You prepare' },
      opcije: [
        { id: 'besedila', sl: 'Besedila sporočil', en: 'Message copy' },
        { id: 'predloge', sl: 'Vizualne predloge', en: 'Visual templates' },
        { id: 'koda', sl: 'Lastno HTML-kodo predlog', en: 'Own HTML template code' },
        { id: 'samo_sistem', sl: 'Samo nastavitev in upravljanje sistema', en: 'Only setup and system management' },
      ],
    },
    {
      id: 'ponovna', sl: 'Kako sme naročnik predloge ponovno uporabljati?', en: 'How may the client reuse the templates?',
      osnovno: true, kam: 'ponudba', stavek: { sl: 'Ponovna uporaba predlog', en: 'Template reuse' },
      preslikavaRabe: { kampanja: 'projekt', znamka: 'znamka', vec_znamk: 'znamka' },
      opcije: [
        { id: 'kampanja', sl: 'Za dogovorjeno kampanjo', en: 'For the agreed campaign' },
        { id: 'znamka', sl: 'Za nadaljnja sporočila iste znamke', en: 'For further messages of the same brand' },
        { id: 'vec_znamk', sl: 'Tudi za druge znamke', en: 'Also for other brands' },
      ],
    },
  ],

  pr: [
    {
      id: 'gradiva', sl: 'Katera gradiva pripraviš?', en: 'Which materials do you prepare?',
      vec: true, osnovno: true, kam: 'ponudba', stavek: { sl: 'Pripravljena gradiva', en: 'Prepared materials' },
      opcije: [
        { id: 'sporocila', sl: 'Sporočila za javnost', en: 'Press releases' },
        { id: 'govori', sl: 'Govore in predstavitvena besedila', en: 'Speeches and presentation texts' },
        { id: 'mapa', sl: 'Novinarsko mapo', en: 'A press kit' },
        { id: 'vizuali', sl: 'Fotografije ali vizuale', en: 'Photos or visuals' },
        { id: 'samo_svetovanje', sl: 'Samo svetovanje in odnose z mediji', en: 'Advice and media relations only' },
      ],
    },
    {
      id: 'komu', sl: 'Komu so gradiva namenjena?', en: 'Who are the materials for?',
      vec: true, osnovno: true, kam: 'ponudba', stavek: { sl: 'Gradiva so namenjena', en: 'The materials are for' },
      opcije: [
        { id: 'narocnik', sl: 'Naročniku za lastne objave', en: 'The client for their own publications' },
        { id: 'mediji', sl: 'Medijem za objavo', en: 'Media for publication' },
        { id: 'partnerji', sl: 'Partnerjem za nadaljnje posredovanje', en: 'Partners for further distribution' },
      ],
      namig: {
        sl: 'Pogoji naj upoštevajo predvideno posredovanje medijem, ne samo uporabe naročnika.',
        en: 'The terms should account for distribution to the media, not just the client own use.',
      },
    },
  ],

  drugo: [
    {
      id: 'kje', sl: 'Kje in v kakšnem obsegu sme naročnik delo uporabljati?', en: 'Where and to what extent may the client use the work?',
      vec: true, osnovno: true, kam: 'ponudba', stavek: { sl: 'Uporaba', en: 'Use' },
      opcije: [
        { id: 'splet', sl: 'Splet in družbena omrežja', en: 'Web and social media' },
        { id: 'tisk', sl: 'Tiskovine', en: 'Print' },
        { id: 'oglasi', sl: 'Oglasi in kampanje', en: 'Ads and campaigns' },
        { id: 'izdelki', sl: 'Izdelki ali embalaža', en: 'Products or packaging' },
        { id: 'prostori', sl: 'Prostori in dogodki', en: 'Spaces and events' },
      ],
    },
    {
      id: 'tuja', sl: 'Ali delo vključuje tudi gradiva drugih ponudnikov?', en: 'Does the work include third-party materials?',
      osnovno: true, kam: 'ponudba', stavek: { sl: 'Tuja gradiva', en: 'Third-party materials' },
      opcije: [
        { id: 'ne', sl: 'Ne', en: 'No' },
        { id: 'da', sl: 'Da, navedena v opombi', en: 'Yes, listed in the note' },
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
  return vprasanjaZa(sid).filter(v => v.osnovno && v.kam !== 'pogodba');
}
export function dodatnaVprasanja(sid: string): PravVprasanje[] {
  return vprasanjaZa(sid).filter(v => !v.osnovno && v.kam !== 'pogodba');
}
/* Vprasanja, ki so namenjena pogodbi in se v koraku s ceno ne prikazejo. */
export function pogodbenaVprasanja(sid: string): PravVprasanje[] {
  return vprasanjaZa(sid).filter(v => v.kam === 'pogodba');
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
    /* »Drugo« brez opisa v ponudbo ne gre — »Izdaja: drugo.« ni dogovor. */
    const izbrane = izbire.filter(id => id !== 'drugo' || (odgovori[`${v.id}:drugo`] || '').trim());
    if (!izbrane.length) return;
    const imena = izbrane.map(id => (
      id === 'drugo' && (odgovori[`${v.id}:drugo`] || '').trim()
        ? (odgovori[`${v.id}:drugo`] || '').trim()
        : imeOpcije(v, id, jeEn).toLowerCase()
    ));
    const uvod = v.stavek ? (jeEn ? v.stavek.en : v.stavek.sl) : (jeEn ? v.en : v.sl);
    deli.push(`${uvod}: ${imena.join(', ')}`);
  });
  if (!deli.length) return '';
  const stavek = deli.join('; ');
  return `${stavek.charAt(0).toUpperCase()}${stavek.slice(1)}.`;
}

/* Vprašanja brez odgovora — pred pošiljanjem ponudbe jih pokažemo, da nihče
   ne bere praznega polja kot dovoljenja. */
/**
 * Stavki za pogodbo iz ze danih odgovorov. Vrne prazno, kadar odgovora ni —
 * pogodba ne sme trditi necesa, o cemer se nista dogovorila.
 */
export function clenIzOdgovorov(sid: string, odgovori: PravOdgovori | undefined, jeEn = false): string[] {
  if (!odgovori) return [];
  const ven: string[] = [];
  pogodbenaVprasanja(sid).forEach(v => {
    const izbire = (odgovori[v.id] || '').split(' + ').filter(Boolean);
    izbire.forEach(id => {
      if (id === 'nedogovorjeno') return;
      if (id === 'drugo') {
        const lastno = (odgovori[`${v.id}:drugo`] || '').trim();
        if (lastno) ven.push(lastno.endsWith('.') ? lastno : lastno + '.');
        return;
      }
      const b = v.clen?.[id];
      if (b) ven.push(jeEn ? b.en : b.sl);
    });
  });
  return ven;
}

export function nedogovorjena(sid: string, odgovori: PravOdgovori | undefined): PravVprasanje[] {
  return vprasanjaZa(sid).filter(v => {
    const a = (odgovori?.[v.id] || '').trim();
    if (!a || a === 'nedogovorjeno') return true;
    /* »Drugo« brez zapisanega opisa ni odgovor */
    if (a === 'drugo' && !(odgovori?.[`${v.id}:drugo`] || '').trim()) return true;
    return false;
  });
}
