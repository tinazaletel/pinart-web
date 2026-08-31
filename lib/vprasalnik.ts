/* VPRAŠALNIK ZA STRANKO — oblike, privzeta vprašanja in preverjanje odgovorov.
 *
 * Čista logika brez omrežja, da je preverljiva s testi: kaj je veljavno
 * vprašanje, kaj je veljaven odgovor in kaj se sme zapisati.
 *
 * Zakaj privzeta vprašanja in ne prazen obrazec: prazen obrazec je delo, ki ga
 * uporabnica ne bo opravila. Nabor spodaj je tisto, kar kreativec tako ali tako
 * vpraša na prvem sestanku — in prav ta sestanek naj vprašalnik prihrani.
 */

export const ZETON_PREDPONA = 'vp_';

export type VprasanjeTip = 'kratko' | 'dolgo' | 'izbira' | 'vec' | 'datum' | 'stevilka';

export type Vprasanje = {
  id: string;
  tip: VprasanjeTip;
  besedilo: string;
  /* brez odgovora obrazca ni mogoče oddati */
  obvezno?: boolean;
  /* samo pri 'izbira' in 'vec' */
  moznosti?: string[];
  /* namig pod poljem */
  namig?: string;
};

export type Vprasalnik = {
  id: string;
  naslov: string;
  uvod?: string;
  vprasanja: Vprasanje[];
  odprt: boolean;
  /* lokalni id projekta (Projekt.id); prazno = splosno povprasevanje */
  projekt?: string;
  /* povezavo vidiš samo ob nastanku ali ob ponovni izdaji */
  zeton?: string;
  odgovorov?: number;
  ustvarjen?: string;
};

export type Odgovor = {
  id: string;
  projekt?: string;
  odgovori: Record<string, string | string[]>;
  ime?: string;
  eposta?: string;
  podjetje?: string;
  pregledano: boolean;
  ustvarjen: string;
};

/* ── privzeti nabor ──────────────────────────────────────────────────────── */

/** Vprašanja, ki jih kreativec postavi na prvem sestanku. Uporabnica jih uredi. */
export function privzetaVprasanja(jeEn = false): Vprasanje[] {
  const L = (sl: string, en: string) => (jeEn ? en : sl);
  return [
    { id: 'podjetje', tip: 'kratko', besedilo: L('Ime podjetja ali blagovne znamke', 'Company or brand name'), obvezno: true },
    { id: 'oseba', tip: 'kratko', besedilo: L('Ime in priimek kontaktne osebe', 'Contact person'), obvezno: true },
    { id: 'eposta', tip: 'kratko', besedilo: L('E-naslov', 'Email'), obvezno: true },
    {
      id: 'storitve', tip: 'vec', besedilo: L('Kaj potrebujete?', 'What do you need?'), obvezno: true,
      moznosti: jeEn
        ? ['Logo', 'Full visual identity', 'Website', 'Packaging', 'Print materials', 'Social media', 'Illustration', 'Something else']
        : ['Logotip', 'Celostna grafična podoba', 'Spletna stran', 'Embalaža', 'Tiskovine', 'Družbena omrežja', 'Ilustracija', 'Nekaj drugega'],
    },
    { id: 'opis', tip: 'dolgo', besedilo: L('Na kratko opišite projekt', 'Briefly describe the project'), obvezno: true,
      namig: L('Kaj delate, kaj želite doseči, kaj vas je pripeljalo do tega koraka.', 'What you do, what you want to achieve, what brought you here.') },
    { id: 'publika', tip: 'dolgo', besedilo: L('Komu je namenjeno? Kdo je vaša stranka?', 'Who is it for? Who is your customer?') },
    { id: 'rok', tip: 'datum', besedilo: L('Do kdaj bi radi imeli izdelano?', 'When would you like it finished?') },
    {
      id: 'proracun', tip: 'izbira', besedilo: L('Okvirni proračun', 'Approximate budget'),
      namig: L('Ni zavezujoč. Pomaga, da vam pripravim predlog v pravem obsegu.', 'Not binding. It helps me propose the right scope.'),
      moznosti: jeEn
        ? ['Up to 1,000 €', '1,000–3,000 €', '3,000–7,000 €', 'Over 7,000 €', 'I do not know yet']
        : ['Do 1.000 €', '1.000–3.000 €', '3.000–7.000 €', 'Nad 7.000 €', 'Še ne vem'],
    },
    { id: 'gradiva', tip: 'dolgo', besedilo: L('Ali že imate gradiva (logotip, fotografije, besedila)?', 'Do you already have materials (logo, photos, copy)?') },
    { id: 'vzori', tip: 'dolgo', besedilo: L('Primeri, ki so vam všeč', 'Examples you like'),
      namig: L('Povezave ali imena znamk — tudi če so iz druge panoge.', 'Links or brand names — other industries count too.') },
  ];
}

/* ── NABORI ──────────────────────────────────────────────────────────────
   Brief za celostno podobo in povprasevanje za spletno stran nista isti
   pogovor: prvi sprasuje po znamki in obcutku, drugi po straneh in funkcijah.
   Zato ob novem vprasalniku izberes nabor, ne enega samega splosnega
   (Tina, 31. 8. 2026). Vsak nabor je le izhodisce — vprasanja ureja sama. */

export type NaborId = 'povprasevanje' | 'spletna' | 'cgp' | 'brief'
  | 'marketing' | 'foto' | 'prostor' | 'direkcija' | 'pr';

export type Nabor = {
  id: NaborId;
  ime: string; imeEn: string;
  opis: string; opisEn: string;
  naslov: string; naslovEn: string;
  uvod: string; uvodEn: string;
  vprasanja: (jeEn: boolean) => Vprasanje[];
};

/* Kdo si in kako te dobim — enako pri vseh naborih. */
function kontaktna(jeEn: boolean): Vprasanje[] {
  const L = (sl: string, en: string) => (jeEn ? en : sl);
  return [
    { id: 'podjetje', tip: 'kratko', besedilo: L('Ime podjetja ali blagovne znamke', 'Company or brand name'), obvezno: true },
    { id: 'oseba', tip: 'kratko', besedilo: L('Ime in priimek kontaktne osebe', 'Contact person'), obvezno: true },
    { id: 'eposta', tip: 'kratko', besedilo: L('E-naslov', 'Email'), obvezno: true },
  ];
}

function rokInProracun(jeEn: boolean): Vprasanje[] {
  const L = (sl: string, en: string) => (jeEn ? en : sl);
  return [
    { id: 'rok', tip: 'datum', besedilo: L('Do kdaj bi radi imeli izdelano?', 'When would you like it finished?') },
    {
      id: 'proracun', tip: 'izbira', besedilo: L('Okvirni proračun', 'Approximate budget'),
      namig: L('Ni zavezujoč. Pomaga, da vam pripravim predlog v pravem obsegu.', 'Not binding. It helps me propose the right scope.'),
      moznosti: jeEn
        ? ['Up to 1,000 €', '1,000–3,000 €', '3,000–7,000 €', 'Over 7,000 €', 'I do not know yet']
        : ['Do 1.000 €', '1.000–3.000 €', '3.000–7.000 €', 'Nad 7.000 €', 'Še ne vem'],
    },
  ];
}

export const NABORI: Nabor[] = [
  {
    id: 'povprasevanje',
    ime: 'Splošno povpraševanje', imeEn: 'General inquiry',
    opis: 'Za objavo na strani: kdo si, kaj rabiš, rok in proračun.',
    opisEn: 'To publish on your site: who you are, what you need, deadline and budget.',
    naslov: 'Povpraševanje za projekt', naslovEn: 'Project inquiry',
    uvod: 'Nekaj vprašanj, da razumem, kaj potrebujete. Vzame vam pet minut, meni pa prihrani sestanek — in vam hitrejšo ponudbo.',
    uvodEn: 'A few questions so I understand what you need. Five minutes for you, one meeting saved for me — and a faster quote for you.',
    vprasanja: (en) => {
      const L = (sl: string, e: string) => (en ? e : sl);
      return [
        ...kontaktna(en),
        {
          id: 'storitve', tip: 'vec', besedilo: L('Kaj potrebujete?', 'What do you need?'), obvezno: true,
          moznosti: en
            ? ['Logo', 'Full visual identity', 'Website', 'Packaging', 'Print materials', 'Social media', 'Illustration', 'Something else']
            : ['Logotip', 'Celostna grafična podoba', 'Spletna stran', 'Embalaža', 'Tiskovine', 'Družbena omrežja', 'Ilustracija', 'Nekaj drugega'],
        },
        { id: 'opis', tip: 'dolgo', besedilo: L('Na kratko opišite projekt', 'Briefly describe the project'), obvezno: true,
          namig: L('Kaj delate, kaj želite doseči, kaj vas je pripeljalo do tega koraka.', 'What you do, what you want to achieve, what brought you here.') },
        { id: 'publika', tip: 'dolgo', besedilo: L('Komu je namenjeno? Kdo je vaša stranka?', 'Who is it for? Who is your customer?') },
        ...rokInProracun(en),
        { id: 'gradiva', tip: 'dolgo', besedilo: L('Ali že imate gradiva (logotip, fotografije, besedila)?', 'Do you already have materials (logo, photos, copy)?') },
        { id: 'vzori', tip: 'dolgo', besedilo: L('Primeri, ki so vam všeč', 'Examples you like'),
          namig: L('Povezave ali imena znamk — tudi če so iz druge panoge.', 'Links or brand names — other industries count too.') },
      ];
    },
  },
  {
    id: 'spletna',
    ime: 'Spletna stran', imeEn: 'Website',
    opis: 'Obseg strani: koliko podstrani, kaj mora znati, kdo piše besedila.',
    opisEn: 'Website scope: how many pages, what it must do, who writes the copy.',
    naslov: 'Povpraševanje za spletno stran', naslovEn: 'Website inquiry',
    uvod: 'Da vam pripravim ponudbo za spletno stran, potrebujem nekaj podatkov o obsegu.',
    uvodEn: 'To prepare a quote for your website, I need a few details about the scope.',
    vprasanja: (en) => {
      const L = (sl: string, e: string) => (en ? e : sl);
      return [
        ...kontaktna(en),
        { id: 'obstojeca', tip: 'kratko', besedilo: L('Naslov obstoječe strani (če jo imate)', 'Address of your current site (if any)') },
        { id: 'namen', tip: 'dolgo', besedilo: L('Kaj naj stran doseže?', 'What should the site achieve?'), obvezno: true,
          namig: L('Na primer: več povpraševanj, prodaja, predstavitev, rezervacije.', 'For example: more inquiries, sales, presentation, bookings.') },
        {
          id: 'obseg', tip: 'izbira', besedilo: L('Koliko podstrani predvidevate?', 'How many pages do you expect?'),
          moznosti: en ? ['One page', '2–5', '6–10', 'More than 10', 'I do not know'] : ['Ena stran', '2–5', '6–10', 'Več kot 10', 'Ne vem'],
        },
        {
          id: 'funkcije', tip: 'vec', besedilo: L('Kaj mora stran znati?', 'What must the site do?'),
          moznosti: en
            ? ['Contact form', 'Blog or news', 'Online store', 'Booking or scheduling', 'Multiple languages', 'Newsletter sign-up', 'Login area']
            : ['Kontaktni obrazec', 'Blog ali novice', 'Spletna trgovina', 'Rezervacije ali naročanje', 'Več jezikov', 'Prijava na e-novice', 'Zaprt del za prijavljene'],
        },
        {
          id: 'vsebina', tip: 'izbira', besedilo: L('Kdo pripravi besedila in fotografije?', 'Who provides the copy and photos?'),
          moznosti: en ? ['We do', 'I would like you to', 'Partly each'] : ['Mi', 'Želimo, da vi', 'Deloma vsak'],
        },
        ...rokInProracun(en),
        { id: 'vzori', tip: 'dolgo', besedilo: L('Strani, ki so vam všeč', 'Sites you like'), namig: L('Povezave in kaj vam je pri njih všeč.', 'Links, and what you like about them.') },
      ];
    },
  },
  {
    id: 'cgp',
    ime: 'Celostna podoba', imeEn: 'Visual identity',
    opis: 'Znamka: kaj že obstaja, kje se pojavlja, kakšen občutek naj daje.',
    opisEn: 'Brand: what exists, where it appears, what it should feel like.',
    naslov: 'Povpraševanje za celostno podobo', naslovEn: 'Visual identity inquiry',
    uvod: 'Nekaj vprašanj o vaši znamki, da razumem, kaj gradimo — in kje vse se bo pojavljala.',
    uvodEn: 'A few questions about your brand, so I understand what we are building — and where it will appear.',
    vprasanja: (en) => {
      const L = (sl: string, e: string) => (en ? e : sl);
      return [
        ...kontaktna(en),
        { id: 'dejavnost', tip: 'dolgo', besedilo: L('S čim se ukvarjate?', 'What do you do?'), obvezno: true },
        {
          id: 'stanje', tip: 'izbira', besedilo: L('Kaj že obstaja?', 'What already exists?'),
          moznosti: en
            ? ['Nothing yet — starting from scratch', 'A logo only', 'A logo and some materials', 'A full identity that needs a refresh']
            : ['Še nič — začenjamo na novo', 'Samo logotip', 'Logotip in nekaj gradiv', 'Cela podoba, ki jo je treba prenoviti'],
        },
        {
          id: 'nosilci', tip: 'vec', besedilo: L('Kje vse se bo podoba pojavljala?', 'Where will the identity appear?'),
          moznosti: en
            ? ['Website', 'Social media', 'Packaging', 'Print materials', 'Signage or vehicles', 'Clothing', 'Presentations']
            : ['Spletna stran', 'Družbena omrežja', 'Embalaža', 'Tiskovine', 'Oznake ali vozila', 'Oblačila', 'Predstavitve'],
        },
        { id: 'obcutek', tip: 'dolgo', besedilo: L('Kakšen občutek naj daje?', 'What should it feel like?'),
          namig: L('Tri besede so dovolj. Na primer: mirno, drago, domače.', 'Three words are enough. For example: calm, premium, homely.') },
        { id: 'publika', tip: 'dolgo', besedilo: L('Komu govorite?', 'Who are you speaking to?') },
        { id: 'konkurenca', tip: 'dolgo', besedilo: L('Kdo je vaša konkurenca in kaj vas loči od nje?', 'Who are your competitors and what sets you apart?') },
        ...rokInProracun(en),
      ];
    },
  },
  {
    id: 'brief',
    ime: 'Brief projekta', imeEn: 'Project brief',
    opis: 'Za stranko, ki je že tvoja: poglobljena vprašanja pred začetkom dela.',
    opisEn: 'For a client you already have: deeper questions before the work starts.',
    naslov: 'Brief projekta', naslovEn: 'Project brief',
    uvod: 'Preden začnem, potrebujem nekaj odgovorov. Čim bolj konkretno — od tega je odvisno, kako dobro bo delo.',
    uvodEn: 'Before I start, I need a few answers. The more specific, the better the work.',
    vprasanja: (en) => {
      const L = (sl: string, e: string) => (en ? e : sl);
      return [
        ...kontaktna(en),
        { id: 'cilj', tip: 'dolgo', besedilo: L('Kaj mora ta projekt doseči?', 'What must this project achieve?'), obvezno: true,
          namig: L('Kako bova čez pol leta vedela, da je uspel?', 'How will we know in six months that it worked?') },
        { id: 'publika', tip: 'dolgo', besedilo: L('Komu je namenjeno? Opišite tipično stranko.', 'Who is it for? Describe a typical customer.'), obvezno: true },
        { id: 'sporocilo', tip: 'dolgo', besedilo: L('Kaj naj si človek zapomni?', 'What should a person remember?') },
        { id: 'ton', tip: 'dolgo', besedilo: L('Kako govorite s strankami?', 'How do you speak to your customers?'),
          namig: L('Uradno, sproščeno, strokovno, hudomušno …', 'Formal, relaxed, expert, playful …') },
        { id: 'konkurenca', tip: 'dolgo', besedilo: L('Konkurenca in kaj vas loči', 'Competitors and what sets you apart') },
        { id: 'nesme', tip: 'dolgo', besedilo: L('Česa si ne želite?', 'What do you not want?'),
          namig: L('Barve, slogi, primeri, ki jih ne maram — to prihrani dva kroga popravkov.', 'Colours, styles, examples you dislike — this saves two rounds of revisions.') },
        { id: 'gradiva', tip: 'dolgo', besedilo: L('Kaj že imate in kje je to shranjeno?', 'What do you already have and where is it kept?') },
        { id: 'odlocevalci', tip: 'kratko', besedilo: L('Kdo pri vas potrjuje delo?', 'Who approves the work on your side?') },
        { id: 'rok', tip: 'datum', besedilo: L('Do kdaj mora biti končano?', 'When must it be finished?') },
      ];
    },
  },
];

/* ── NABORI PO PODROCJIH ──────────────────────────────────────────────────
   Vsebina je iz kataloga vprasanj po storitvah (lib/vprasanjaPoStoritvi), glas
   pa OBRNJEN: tam sprasujemo kreativca o narocniku (»kaksen je budget
   narocnika«), tu sprasuje kreativec stranko (»kaksen je vas proracun«).
   Dobesedno prenasanje bi zvenelo, kot da stranka izpolnjuje tvoj interni
   obrazec (Tina, 31. 8. 2026). */

const NABORI_PODROCJA: Nabor[] = [
  {
    id: 'marketing',
    ime: 'Marketing in oglasi', imeEn: 'Marketing and ads',
    opis: 'Kampanja, oglasi, vsebine: cilj, kanali, občinstvo, meritve.',
    opisEn: 'Campaign, ads, content: goal, channels, audience, measurement.',
    naslov: 'Povpraševanje za marketing', naslovEn: 'Marketing inquiry',
    uvod: 'Nekaj vprašanj, da razumem, kaj želite doseči in kje vas ljudje iščejo.',
    uvodEn: 'A few questions so I understand what you want to achieve and where people look for you.',
    vprasanja: (en) => {
      const L = (sl: string, e: string) => (en ? e : sl);
      return [
        ...kontaktna(en),
        { id: 'cilj', tip: 'dolgo', besedilo: L('Kaj želite doseči?', 'What do you want to achieve?'), obvezno: true,
          namig: L('Več povpraševanj, prodaja, prepoznavnost, dogodek …', 'More inquiries, sales, awareness, an event …') },
        {
          id: 'kanali', tip: 'vec', besedilo: L('Kje ste prisotni ali bi radi bili?', 'Where are you present, or want to be?'),
          moznosti: en
            ? ['Instagram', 'Facebook', 'LinkedIn', 'TikTok', 'YouTube', 'Newsletter', 'Google ads', 'Print', 'Not sure yet']
            : ['Instagram', 'Facebook', 'LinkedIn', 'TikTok', 'YouTube', 'E-novice', 'Google oglasi', 'Tisk', 'Še ne vem'],
        },
        { id: 'publika', tip: 'dolgo', besedilo: L('Komu govorite? Opišite tipično stranko.', 'Who are you speaking to? Describe a typical customer.'), obvezno: true },
        { id: 'ponudba', tip: 'dolgo', besedilo: L('Kaj konkretno želite promovirati?', 'What exactly do you want to promote?') },
        { id: 'vsebina', tip: 'izbira', besedilo: L('Kdo pripravi vsebine (besedila, fotografije)?', 'Who provides the content (copy, photos)?'),
          moznosti: en ? ['We do', 'I would like you to', 'Partly each'] : ['Mi', 'Želimo, da vi', 'Deloma vsak'] },
        { id: 'merilo', tip: 'dolgo', besedilo: L('Kako bomo vedeli, da je uspelo?', 'How will we know it worked?'),
          namig: L('Število povpraševanj, prodaja, obisk strani, sledilci …', 'Inquiries, sales, site visits, followers …') },
        ...rokInProracun(en),
      ];
    },
  },
  {
    id: 'foto',
    ime: 'Foto, video, motion', imeEn: 'Photo, video, motion',
    opis: 'Snemanje: kaj, kje, koliko, za kateri kanal in kdo nastopa.',
    opisEn: 'Shoot: what, where, how much, for which channel and who appears.',
    naslov: 'Povpraševanje za fotografijo ali video', naslovEn: 'Photo or video inquiry',
    uvod: 'Da pripravim ponudbo za snemanje, potrebujem nekaj podatkov o obsegu.',
    uvodEn: 'To prepare a quote for a shoot, I need a few details about the scope.',
    vprasanja: (en) => {
      const L = (sl: string, e: string) => (en ? e : sl);
      return [
        ...kontaktna(en),
        {
          id: 'kaj', tip: 'vec', besedilo: L('Kaj potrebujete?', 'What do you need?'), obvezno: true,
          moznosti: en
            ? ['Product photos', 'People / team portraits', 'Space or interior', 'Event', 'Short video', 'Reels for social', 'Animation / motion']
            : ['Fotografije izdelkov', 'Portreti ljudi ali ekipe', 'Prostor ali interier', 'Dogodek', 'Krajši video', 'Reels za omrežja', 'Animacija / motion'],
        },
        { id: 'obseg', tip: 'kratko', besedilo: L('Koliko posnetkov ali koliko minut?', 'How many shots, or how many minutes?'),
          namig: L('Če ne veste, napišite približek.', 'A rough estimate is fine.') },
        { id: 'lokacija', tip: 'kratko', besedilo: L('Kje bi snemali?', 'Where would we shoot?'), namig: L('Vaš prostor, studio, na terenu …', 'Your space, a studio, on location …') },
        { id: 'ljudje', tip: 'izbira', besedilo: L('Bodo na posnetkih ljudje?', 'Will people appear?'),
          moznosti: en ? ['Yes, our team', 'Yes, hired models', 'No people'] : ['Da, naša ekipa', 'Da, najeti modeli', 'Brez ljudi'] },
        { id: 'uporaba', tip: 'dolgo', besedilo: L('Kje boste gradivo uporabljali?', 'Where will you use the material?'),
          namig: L('Spletna stran, omrežja, oglasi, tisk — to vpliva na pravice uporabe.', 'Website, social, ads, print — this affects usage rights.') },
        ...rokInProracun(en),
      ];
    },
  },
  {
    id: 'prostor',
    ime: 'Prostor in arhitektura', imeEn: 'Space and architecture',
    opis: 'Interier ali razstavni prostor: kvadratura, faza, stanje, namen.',
    opisEn: 'Interior or exhibition space: size, phase, condition, purpose.',
    naslov: 'Povpraševanje za oblikovanje prostora', naslovEn: 'Space design inquiry',
    uvod: 'Nekaj vprašanj o prostoru, da vem, kako obsežen je projekt.',
    uvodEn: 'A few questions about the space, so I know how large the project is.',
    vprasanja: (en) => {
      const L = (sl: string, e: string) => (en ? e : sl);
      return [
        ...kontaktna(en),
        { id: 'namen', tip: 'dolgo', besedilo: L('Za kakšen prostor gre in čemu služi?', 'What kind of space is it, and what is it for?'), obvezno: true,
          namig: L('Stanovanje, lokal, pisarna, razstava, stojnica …', 'Home, café, office, exhibition, stand …') },
        { id: 'kvadratura', tip: 'stevilka', besedilo: L('Približna kvadratura (m²)', 'Approximate size (m²)') },
        { id: 'stanje', tip: 'izbira', besedilo: L('V kakšnem stanju je prostor?', 'What condition is the space in?'),
          moznosti: en ? ['New build', 'Full renovation', 'Cosmetic refresh', 'Furnishing only'] : ['Novogradnja', 'Celovita prenova', 'Osvežitev', 'Samo oprema'] },
        {
          id: 'faze', tip: 'vec', besedilo: L('Kaj potrebujete?', 'What do you need?'),
          moznosti: en
            ? ['Concept and layout', 'Design drawings', 'Documentation for permits', 'Furniture selection', 'Site supervision']
            : ['Zasnova in tloris', 'Idejni projekt', 'Dokumentacija za dovoljenja', 'Izbor opreme', 'Nadzor izvedbe'],
        },
        { id: 'obcutek', tip: 'dolgo', besedilo: L('Kakšen občutek naj prostor daje?', 'What should the space feel like?') },
        ...rokInProracun(en),
      ];
    },
  },
  {
    id: 'direkcija',
    ime: 'Strategija in direkcija', imeEn: 'Strategy and direction',
    opis: 'Za večje projekte: položaj znamke, konkurenca, odločevalci.',
    opisEn: 'For larger projects: brand position, competition, decision makers.',
    naslov: 'Povpraševanje za strategijo', naslovEn: 'Strategy inquiry',
    uvod: 'Nekaj vprašanj o vaši znamki in trgu, da vidim, kje je največ dela.',
    uvodEn: 'A few questions about your brand and market, so I can see where the work is.',
    vprasanja: (en) => {
      const L = (sl: string, e: string) => (en ? e : sl);
      return [
        ...kontaktna(en),
        { id: 'polozaj', tip: 'dolgo', besedilo: L('Kje ste danes in kam želite priti?', 'Where are you today and where do you want to be?'), obvezno: true },
        { id: 'konkurenca', tip: 'dolgo', besedilo: L('Kdo je vaša konkurenca in kaj vas loči?', 'Who are your competitors and what sets you apart?') },
        { id: 'publika', tip: 'dolgo', besedilo: L('Komu prodajate?', 'Who do you sell to?') },
        { id: 'ovire', tip: 'dolgo', besedilo: L('Kaj vas najbolj ovira?', 'What is holding you back most?') },
        { id: 'odlocevalci', tip: 'kratko', besedilo: L('Kdo pri vas odloča o tem projektu?', 'Who decides on this project?') },
        ...rokInProracun(en),
      ];
    },
  },
  {
    id: 'pr',
    ime: 'PR in odnosi z javnostmi', imeEn: 'PR and public relations',
    opis: 'Sporočila, mediji, dogodki: kaj sporočate in komu.',
    opisEn: 'Statements, media, events: what you announce and to whom.',
    naslov: 'Povpraševanje za PR', naslovEn: 'PR inquiry',
    uvod: 'Da pripravim predlog, potrebujem nekaj podatkov o tem, kaj sporočate.',
    uvodEn: 'To prepare a proposal, I need a few details about what you are announcing.',
    vprasanja: (en) => {
      const L = (sl: string, e: string) => (en ? e : sl);
      return [
        ...kontaktna(en),
        { id: 'povod', tip: 'dolgo', besedilo: L('Kaj je povod?', 'What is the occasion?'), obvezno: true,
          namig: L('Nov izdelek, dogodek, sprememba v podjetju, kriza …', 'A new product, an event, a company change, a crisis …') },
        { id: 'sporocilo', tip: 'dolgo', besedilo: L('Kaj naj ljudje odnesejo?', 'What should people take away?') },
        {
          id: 'mediji', tip: 'vec', besedilo: L('Kje bi radi bili objavljeni?', 'Where would you like to appear?'),
          moznosti: en
            ? ['National media', 'Local media', 'Trade press', 'Podcasts', 'Influencers', 'Not sure yet']
            : ['Nacionalni mediji', 'Lokalni mediji', 'Strokovne revije', 'Podkasti', 'Vplivneži', 'Še ne vem'],
        },
        { id: 'gradivo', tip: 'dolgo', besedilo: L('Kaj že imate?', 'What do you already have?'),
          namig: L('Sporočilo za javnost, fotografije, podatki, izjave.', 'A press release, photos, data, quotes.') },
        ...rokInProracun(en),
      ];
    },
  },
];

export function nabor(id: NaborId | string | undefined): Nabor {
  return VSI_NABORI.find(n => n.id === id) || VSI_NABORI[0];
}

/* Stirje osnovni + po podrocjih; vrstni red je vrstni red v izbirniku. */
export const VSI_NABORI: Nabor[] = [...NABORI, ...NABORI_PODROCJA];

/* ── preverjanje ─────────────────────────────────────────────────────────── */

const TIPI: VprasanjeTip[] = ['kratko', 'dolgo', 'izbira', 'vec', 'datum', 'stevilka'];

/** Očisti vprašanja iz vmesnika: obdrži samo, kar razumemo in kar ima besedilo. */
export function ocistiVprasanja(vhod: unknown): Vprasanje[] {
  if (!Array.isArray(vhod)) return [];
  const videni = new Set<string>();
  const ven: Vprasanje[] = [];
  for (const v of vhod.slice(0, 40)) {
    if (!v || typeof v !== 'object') continue;
    const o = v as Record<string, unknown>;
    const besedilo = String(o.besedilo || '').trim().slice(0, 300);
    if (!besedilo) continue;
    const tip = TIPI.includes(o.tip as VprasanjeTip) ? (o.tip as VprasanjeTip) : 'kratko';
    /* id mora biti stabilen in enolicen — po njem se veže odgovor */
    let id = String(o.id || '').replace(/[^a-z0-9_-]/gi, '').slice(0, 40) || `v${ven.length + 1}`;
    while (videni.has(id)) id = `${id}_`;
    videni.add(id);
    const moznosti = (tip === 'izbira' || tip === 'vec') && Array.isArray(o.moznosti)
      ? o.moznosti.map(m => String(m).trim().slice(0, 120)).filter(Boolean).slice(0, 20)
      : undefined;
    ven.push({
      id, tip, besedilo,
      obvezno: !!o.obvezno,
      ...(moznosti?.length ? { moznosti } : {}),
      ...(o.namig ? { namig: String(o.namig).trim().slice(0, 300) } : {}),
    });
  }
  return ven;
}

export type Napaka = { id: string; sporocilo: string };

/**
 * Preveri odgovore stranke proti vprašanjem. Vrne očiščene odgovore ali napake.
 * Preverja STREŽNIK — obrazec v brskalniku je vljudnost, ne varovalka.
 */
export function preveriOdgovore(
  vprasanja: Vprasanje[],
  vhod: unknown,
  jeEn = false,
): { ok: true; odgovori: Record<string, string | string[]> } | { ok: false; napake: Napaka[] } {
  const L = (sl: string, en: string) => (jeEn ? en : sl);
  const surov = (vhod && typeof vhod === 'object' ? vhod : {}) as Record<string, unknown>;
  const odgovori: Record<string, string | string[]> = {};
  const napake: Napaka[] = [];

  for (const v of vprasanja) {
    const surovo = surov[v.id];

    if (v.tip === 'vec') {
      const izbrano = Array.isArray(surovo)
        ? surovo.map(x => String(x)).filter(x => (v.moznosti || []).includes(x)).slice(0, 20)
        : [];
      if (v.obvezno && !izbrano.length) napake.push({ id: v.id, sporocilo: L('Izberi vsaj eno možnost.', 'Pick at least one option.') });
      if (izbrano.length) odgovori[v.id] = izbrano;
      continue;
    }

    const besedilo = String(surovo ?? '').trim().slice(0, v.tip === 'dolgo' ? 4000 : 400);

    if (!besedilo) {
      if (v.obvezno) napake.push({ id: v.id, sporocilo: L('To polje je obvezno.', 'This field is required.') });
      continue;
    }
    if (v.tip === 'izbira' && !(v.moznosti || []).includes(besedilo)) {
      napake.push({ id: v.id, sporocilo: L('Izberi eno od ponujenih možnosti.', 'Pick one of the offered options.') });
      continue;
    }
    if (v.tip === 'datum' && !/^\d{4}-\d{2}-\d{2}$/.test(besedilo)) {
      napake.push({ id: v.id, sporocilo: L('Vpiši veljaven datum.', 'Enter a valid date.') });
      continue;
    }
    if (v.tip === 'stevilka' && !Number.isFinite(Number(besedilo.replace(',', '.')))) {
      napake.push({ id: v.id, sporocilo: L('Vpiši številko.', 'Enter a number.') });
      continue;
    }
    /* E-naslov je edino polje, kjer napačen vnos pomeni, da stranke ne moreš
       kontaktirati — zato ga preverimo, čeprav je tip 'kratko'. */
    if (v.id === 'eposta' && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(besedilo)) {
      napake.push({ id: v.id, sporocilo: L('Vpiši veljaven e-naslov.', 'Enter a valid email.') });
      continue;
    }
    odgovori[v.id] = besedilo;
  }

  return napake.length ? { ok: false, napake } : { ok: true, odgovori };
}

/** Iz odgovorov izlušči ime, e-pošto in podjetje, da seznam ni brez imena. */
export function izlusciKontakt(odgovori: Record<string, string | string[]>): {
  ime?: string; eposta?: string; podjetje?: string;
} {
  const beri = (id: string) => {
    const v = odgovori[id];
    return typeof v === 'string' && v.trim() ? v.trim().slice(0, 200) : undefined;
  };
  return { ime: beri('oseba'), eposta: beri('eposta'), podjetje: beri('podjetje') };
}
