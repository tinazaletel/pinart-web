/* VPRAŠALNIK O CENAH — ANGLEŠKA BESEDILA
 *
 * Vprašalnik mora biti v obeh jezikih (Tina, 3. 9. 2026: prvi tuji
 * izpolnjevalec je italijanski kolega, ki ga rešuje na telefonu). Slovenski vir
 * ostaja lib/vprasalnikPanoge.ts in se NE spreminja: oznake vprašanj (id) in
 * VREDNOSTI izbir so skupne obema jezikoma, da so odgovori v bazi primerljivi
 * ne glede na jezik izpolnjevanja. Tu so samo besedila za prikaz.
 *
 * Ključ je panoga + oznaka vprašanja, ker se oznake med panogami ponavljajo
 * (»kdo-si-kaj-delas-najvec-1« obstaja v grafiki, 3D in interierju, vsakič z
 * drugim namigom). Test tests/unit/vprasalnikPrevodi.test.ts preverja, da ima
 * VSAKO vprašanje prevod in da nobenega prevoda ni brez vprašanja.
 */

export type PrevodVprasanja = {
  q: string;
  namig?: string;
  /** Po vrstnem redu izvirnih izbir — shrani se izvirna (slovenska) vrednost. */
  izbire?: string[];
  dopolnilo?: string;
};

/* Naslovi sklopov — isti slovenski naslov pomeni isto v vseh panogah. */
export const SKLOPI_EN: Record<string, string> = {
  'Kdo si': 'About you',
  'Logotip': 'Logo',
  'CGP': 'Brand identity',
  'Tiskovine': 'Print',
  'Embalaža': 'Packaging',
  'Ilustracija': 'Illustration',
  'Pravice': 'Rights',
  'Rok in odpoved': 'Deadlines and cancellation',
  'Za konec': 'Finally',
  'Osnovna cena': 'Base rate',
  'Vrsta snemanja': 'Type of shoot',
  'Obdelava': 'Editing',
  'Produkcija': 'Production',
  'Popravki': 'Revisions',
  'Renderji': 'Renders',
  'Model': 'Modelling',
  'Animacija': 'Animation',
  'Izris': 'Rendering',
  'Kako računaš': 'How you charge',
  'Obseg': 'Scope',
  'Prostori': 'Spaces',
  'Vizualizacije': 'Visualisations',
  'Stroški': 'Expenses',
  'Faze': 'Phases',
  'Nadzor': 'Supervision',
  'Družbena omrežja': 'Social media',
  'Oglaševanje': 'Advertising',
  'SEO in email': 'SEO and email',
  'Vsebina': 'Content',
  'Pogodba in pravice': 'Contract and rights',
  'Spletna stran': 'Website',
  'Spletna aplikacija': 'Web application',
  'Mobilna aplikacija': 'Mobile app',
  'Cena dela': 'Rates',
  'Vzdrževanje in gostovanje': 'Maintenance and hosting',
  'Pravice in izročitev': 'Rights and handover',
};

export const UVOD_EN: Record<string, string> = {
  grafika: 'I would like to know your real prices for design — from logos to print.',
  fotografija: 'I would like to know your real prices for shooting and editing.',
  '3d': 'I would like to know your real prices for modelling, renders and animation.',
  interier: 'I would like to know your real prices for concept design and project management.',
  arhitektura: 'I would like to know your real prices by project phase.',
  marketing: 'I would like to know your real prices for running marketing — from social media to advertising.',
  it: 'I would like to know your real prices for development — from websites to apps.',
};

/* Vprašanja, ki se ponovijo v več panogah — enkrat napisana, večkrat uporabljena. */
const KJE_DELAS: PrevodVprasanja = { q: 'Where do you mostly work?', izbire: ['Slovenia', 'abroad', 'both'] };
const PROJEKTOV_NA_LETO: PrevodVprasanja = { q: 'How many projects per year?', namig: 'number' };
const LICENCA_TRAJANJE: PrevodVprasanja = { q: 'How long is the basic licence valid?', izbire: ['1 year', '3 years', 'unlimited'] };
const VELIKA_ZNAMKA: PrevodVprasanja = { q: 'Do you charge more if the client is a large or international brand?', dopolnilo: 'How much' };
const NUJNO: PrevodVprasanja = { q: 'Do you charge a rush surcharge?', dopolnilo: 'How much %' };
const PREDUJEM: PrevodVprasanja = { q: 'Do you ask for a deposit? How much?', namig: '% or EUR' };
const USTAVI_NA_POL: PrevodVprasanja = { q: 'What applies if the client stops the project halfway?', namig: '% of price' };
const KROGOV_VKLJUCENIH: PrevodVprasanja = { q: 'How many rounds of revisions are included?', namig: 'number' };
const DODATNI_KROG: PrevodVprasanja = { q: 'How much do you charge for an extra round?', namig: 'EUR' };
const DODATNI_KROG_POPRAVKOV: PrevodVprasanja = { q: 'How much do you charge for an extra round of revisions?', namig: 'EUR' };
const SPLET_SAMO: PrevodVprasanja = { q: 'How much does web-only usage add?', namig: 'EUR or % of the fee' };
const VIZUALIZACIJE_VKLJUCENE: PrevodVprasanja = { q: 'Are 3D visualisations included or charged separately?', izbire: ['included', 'separately'] };
const ENA_VIZUALIZACIJA: PrevodVprasanja = { q: 'How much do you charge for one visualisation?', namig: 'EUR' };
const POT_IN_OBISKI: PrevodVprasanja = { q: 'How do you charge for travel and site visits?', namig: 'EUR/km, flat fee or included' };
const OBISKOV_VKLJUCENIH: PrevodVprasanja = { q: 'How many visits are included?', namig: 'number' };
const NAJMANJSE_NAROCILO: PrevodVprasanja = { q: 'Do you have a minimum order?', namig: 'EUR' };
const IDEJNA_NA_M2: PrevodVprasanja = { q: 'If per m² — how much for a concept design?', namig: 'EUR/m²' };
const OBJAVA_V_MEDIJIH: PrevodVprasanja = { q: 'Do you charge for publishing the project in the media?', dopolnilo: 'How much' };
const PODCENJUJE: PrevodVprasanja = { q: 'Where do you feel the market undervalues you most?', namig: 'free text' };
const SPREGLEDAJO: PrevodVprasanja = { q: 'Which item do clients most often overlook?', namig: 'free text' };
const MANJKA: PrevodVprasanja = { q: 'What should the calculator ask that is missing here?', namig: 'free text' };

/** Trojica »Za konec« z oznakami, ki se po panogah razlikujejo samo po številki. */
const zaKonec = (a: number, b: number, c: number, kratko = false): Record<string, PrevodVprasanja> => {
  /* Marketing in IT imata oznake skrajšane za en znak (»-po-« namesto »-pod-«). */
  const p = kratko ? 'za-konec-kje-se-ti-zdi-da-te-trg-najbolj-po' : 'za-konec-kje-se-ti-zdi-da-te-trg-najbolj-pod';
  const s = kratko ? 'za-konec-katero-postavko-stranke-najpogost' : 'za-konec-katero-postavko-stranke-najpogostej';
  const m = kratko ? 'za-konec-kaj-bi-moral-kalkulator-vprasati-p' : 'za-konec-kaj-bi-moral-kalkulator-vprasati-pa';
  return { [`${p}-${a}`]: PODCENJUJE, [`${s}-${b}`]: SPREGLEDAJO, [`${m}-${c}`]: MANJKA };
};

export const VPRASANJA_EN: Record<string, Record<string, PrevodVprasanja>> = {
  grafika: {
    'kdo-si-koliko-let-se-ukvarjas-z-oblikovanjem-0': { q: 'How many years have you been designing?', namig: 'years' },
    'kdo-si-kaj-delas-najvec-1': { q: 'What do you do most?', namig: 'logos, brand identity, print, packaging, illustration, web …' },
    'kdo-si-kje-vecinoma-delas-2': KJE_DELAS,
    'kdo-si-koliko-projektov-na-leto-3': PROJEKTOV_NA_LETO,
    'logotip-koliko-zaracunas-za-logotip-z-eno-ja-4': { q: 'How much do you charge for a logo with one clear direction?', namig: 'EUR excl. VAT' },
    'logotip-koliko-ce-pripravis-dva-predloga-5': { q: 'How much if you prepare two proposals?', namig: 'EUR' },
    'logotip-koliko-za-tri-predloge-6': { q: 'How much for three proposals?', namig: 'EUR' },
    'logotip-koliko-krogov-popravkov-je-vkljuceni-7': KROGOV_VKLJUCENIH,
    'logotip-koliko-zaracunas-za-dodatni-krog-pop-8': DODATNI_KROG_POPRAVKOV,
    'logotip-koliko-doda-raziskava-trg-konkurenca-9': { q: 'How much does research add (market, competitors, positioning)?', namig: 'EUR' },
    'logotip-kaj-je-v-osnovni-ceni-vkljuceno-10': { q: 'What is included in the base price?', namig: 'files, basic guidelines, colour versions …' },
    'cgp-koliko-zaracunas-za-celostno-graficno-po-11': { q: 'How much do you charge for a full brand identity with one direction?', namig: 'EUR' },
    'cgp-koliko-za-dve-oziroma-tri-smeri-12': { q: 'How much for two or three directions?', namig: 'EUR' },
    'cgp-kaj-mora-cgp-obvezno-vsebovati-da-je-to--13': { q: 'What must a brand identity include to count as an identity and not just a logo?', namig: 'free text' },
    'cgp-koliko-doda-knjiga-standardov-14': { q: 'How much does a brand manual add?', namig: 'EUR' },
    'tiskovine-koliko-zaracunas-za-publikacijo-do-15': { q: 'How much do you charge for a publication of up to 8 pages?', namig: 'EUR' },
    'tiskovine-koliko-za-9-do-32-strani-16': { q: 'How much for 9 to 32 pages?', namig: 'EUR' },
    'tiskovine-koliko-za-33-do-96-strani-17': { q: 'How much for 33 to 96 pages?', namig: 'EUR' },
    'tiskovine-koliko-zaracunas-na-stran-ko-gre-s-18': { q: 'How much do you charge per page when it is layout only?', namig: 'EUR per page' },
    'tiskovine-koliko-manj-ce-je-zasnova-ze-narej-19': { q: 'How much less if the design already exists and you only adapt it?', namig: '% or EUR' },
    'tiskovine-koliko-doda-druga-jezikovna-razlic-20': { q: 'How much does a second language version add?', namig: '% or EUR' },
    'tiskovine-koliko-zaracunas-samo-za-pripravo--21': { q: 'How much do you charge for print preparation only?', namig: 'EUR or % of price' },
    'embalaza-koliko-zaracunas-za-embalazo-enega--22': { q: 'How much do you charge for the packaging of one product?', namig: 'EUR' },
    'embalaza-koliko-za-2-do-4-variante-23': { q: 'How much for 2 to 4 variants?', namig: 'EUR' },
    'embalaza-koliko-za-5-ali-vec-24': { q: 'How much for 5 or more?', namig: 'EUR' },
    'embalaza-kdo-pri-tebi-pripravi-dieline-in-ko-25': { q: 'Who prepares the dieline and how much does it add?', namig: 'EUR' },
    'ilustracija-koliko-zaracunas-za-eno-ilustrac-26': { q: 'How much do you charge for one illustration?', namig: 'EUR' },
    'ilustracija-koliko-za-serijo-4-do-8-27': { q: 'How much for a series of 4 to 8?', namig: 'EUR total' },
    'ilustracija-koliko-za-9-ali-vec-28': { q: 'How much for 9 or more?', namig: 'EUR total' },
    'ilustracija-se-cena-razlikuje-po-slogu-linij-29': { q: 'Does the price differ by style (line, flat, hand-drawn, 3D)?', dopolnilo: 'How much' },
    'pravice-je-uporaba-licenca-locena-postavka-o-30': { q: 'Is usage (licence) a separate item from the design work?', dopolnilo: 'How' },
    'pravice-koliko-doda-uporaba-samo-na-spletu-31': SPLET_SAMO,
    'pravice-koliko-doda-uporaba-v-vseh-medijih-32': { q: 'How much does all-media usage add?', namig: 'EUR or % of the fee' },
    'pravice-koliko-doda-izkljucnost-oziroma-odku-33': { q: 'How much does exclusivity or a full buyout add?', namig: 'EUR or % of the fee' },
    'pravice-zaracunas-vec-ce-je-narocnik-velika--34': VELIKA_ZNAMKA,
    'pravice-za-koliko-casa-velja-osnovna-licenca-35': LICENCA_TRAJANJE,
    'rok-in-odpoved-zaracunas-pribitek-za-nujno-i-36': NUJNO,
    'rok-in-odpoved-zahtevas-predujem-koliko-37': PREDUJEM,
    'rok-in-odpoved-kaj-velja-ce-narocnik-projekt-38': USTAVI_NA_POL,
    ...zaKonec(39, 40, 41),
  },

  fotografija: {
    'kdo-si-kako-dolgo-se-ukvarjas-s-fotografijo-0': { q: 'How long have you been a photographer?', namig: 'years' },
    'kdo-si-kje-vecinoma-delas-1': KJE_DELAS,
    'kdo-si-katere-vrste-snemanja-delas-2': { q: 'What kinds of shoots do you do?', namig: 'product, portrait, event, interior, food, fashion, architecture, reportage …' },
    'kdo-si-koliko-projektov-na-leto-priblizno-3': { q: 'Roughly how many projects per year?', namig: 'number' },
    'osnovna-cena-koliko-zaracunas-za-pol-dneva-s-4': { q: 'How much do you charge for a half-day shoot (up to 4 hours)?', namig: 'EUR excl. VAT' },
    'osnovna-cena-koliko-za-cel-dan-do-8-ur-5': { q: 'How much for a full day (up to 8 hours)?', namig: 'EUR excl. VAT' },
    'osnovna-cena-koliko-za-dva-dni-ali-vec-cena--6': { q: 'How much for two days or more — price per day?', namig: 'EUR per day' },
    'osnovna-cena-imas-najmanjse-narocilo-pod-kat-7': { q: 'Do you have a minimum order you will not go below?', namig: 'EUR' },
    'osnovna-cena-kaj-je-v-osnovni-ceni-ze-vkljuc-8': { q: 'What is already included in the base price?', namig: 'preparation, equipment, travel up to X km, basic editing …' },
    'osnovna-cena-zaracunavas-po-uri-po-dnevu-ali-9': { q: 'Do you charge by the hour, by the day or per project?', namig: 'and why' },
    'vrsta-snemanja-se-dnevna-cena-razlikuje-po-v-10': { q: 'Does the day rate differ by type of shoot?', dopolnilo: 'How much?' },
    'vrsta-snemanja-ce-da-katera-je-najdrazja-in--11': { q: 'If yes — which is the most expensive and by how much?', namig: 'e.g. food 1.3× more than portrait' },
    'vrsta-snemanja-katera-je-najcenejsa-in-kolik-12': { q: 'Which is the cheapest and how much?', namig: 'EUR or ratio' },
    'obdelava-koliko-obdelanih-fotografij-je-vklj-13': { q: 'How many edited photos are included in the day rate?', namig: 'number' },
    'obdelava-koliko-zaracunas-za-20-do-50-obdela-14': { q: 'How much do you charge for 20 to 50 edited photos?', namig: 'EUR total or surcharge' },
    'obdelava-koliko-za-nad-50-15': { q: 'How much for more than 50?', namig: 'EUR total or surcharge' },
    'obdelava-cena-ene-dodatne-fotografije-cez-do-16': { q: 'Price of one extra photo beyond the agreed number?', namig: 'EUR each' },
    'obdelava-locis-osnovno-obdelavo-in-zahtevnej-17': { q: 'Do you separate basic editing from advanced retouching?', dopolnilo: 'And how much does retouching add' },
    'obdelava-koliko-doda-zahtevna-retusa-koza-se-18': { q: 'How much does advanced retouching add (skin, compositing, removal)?', namig: 'EUR per photo or per hour' },
    'obdelava-ali-oddas-tudi-neobdelane-posnetke--19': { q: 'Do you also hand over unedited files (RAW)?', dopolnilo: 'And at what price' },
    'produkcija-kdaj-zaracunas-asistenta-in-kolik-20': { q: 'When do you charge for an assistant and how much?', namig: 'EUR per day' },
    'produkcija-kdaj-zaracunas-studio-in-koliko-21': { q: 'When do you charge for a studio and how much?', namig: 'EUR per day or hour' },
    'produkcija-kako-zaracunas-pot-22': { q: 'How do you charge for travel?', namig: 'EUR per km / flat fee / included up to X km' },
    'produkcija-kako-zaracunas-dnevnico-in-prenoc-23': { q: 'How do you charge per diems and accommodation?', namig: 'EUR' },
    'produkcija-kdaj-je-potrebna-posebna-oprema-i-24': { q: 'When is special equipment needed and how much does it add?', namig: 'e.g. drone, tilt-shift, lights — EUR' },
    'produkcija-ali-urejas-model-stiliste-rekvizi-25': { q: 'Do you arrange models, stylists, props? How do you charge for that?', namig: 'EUR or % markup' },
    'pravice-je-uporaba-licenca-locena-postavka-o-26': { q: 'Is usage (licence) a separate item from the shoot?', dopolnilo: 'Briefly, how' },
    'pravice-koliko-doda-uporaba-samo-na-spletu-i-27': { q: 'How much does web and social media only usage add?', namig: 'EUR or % of the fee' },
    'pravice-koliko-doda-uporaba-v-vseh-medijih-t-28': { q: 'How much does all-media usage add, including print and outdoor?', namig: 'EUR or % of the fee' },
    'pravice-koliko-doda-izkljucnost-narocnik-edi-29': { q: 'How much does exclusivity add (only the client uses the images)?', namig: 'EUR or % of the fee' },
    'pravice-za-koliko-casa-velja-osnovna-licenca-30': LICENCA_TRAJANJE,
    'pravice-koliko-zaracunas-za-podaljsanje-lice-31': { q: 'How much do you charge for a licence extension?', namig: 'EUR or % of original price' },
    'pravice-ali-zaracunas-vec-ce-je-narocnik-vel-32': VELIKA_ZNAMKA,
    'rok-in-odpoved-zaracunas-pribitek-za-nujno-i-33': NUJNO,
    'rok-in-odpoved-kaj-velja-ob-odpovedi-manj-ko-34': { q: 'What applies for a cancellation less than 48 hours ahead?', namig: '% of price' },
    'rok-in-odpoved-zahtevas-predujem-koliko-35': PREDUJEM,
    'popravki-koliko-krogov-popravkov-obdelave-je-36': { q: 'How many rounds of editing revisions are included?', namig: 'number' },
    'popravki-koliko-zaracunas-za-dodatni-krog-37': DODATNI_KROG,
    ...zaKonec(38, 39, 40),
  },

  '3d': {
    'kdo-si-koliko-let-se-ukvarjas-s-3d-0': { q: 'How many years have you been working in 3D?', namig: 'years' },
    'kdo-si-kaj-delas-najvec-1': { q: 'What do you do most?', namig: 'product renders, architecture, animation, characters, visualisation …' },
    'kdo-si-v-cem-delas-2': { q: 'Which software do you work in?', namig: 'Blender, C4D, 3ds Max, Houdini …' },
    'kdo-si-koliko-projektov-na-leto-3': PROJEKTOV_NA_LETO,
    'renderji-koliko-zaracunas-za-en-render-izdel-4': { q: 'How much do you charge for one product render?', namig: 'EUR excl. VAT' },
    'renderji-koliko-za-4-do-8-pogledov-istega-mo-5': { q: 'How much for 4 to 8 views of the same model?', namig: 'EUR total' },
    'renderji-koliko-za-nad-8-pogledov-6': { q: 'How much for more than 8 views?', namig: 'EUR total' },
    'renderji-koliko-stane-dodaten-pogled-cez-dog-7': { q: 'How much is an extra view beyond the agreed number?', namig: 'EUR each' },
    'renderji-kaj-je-v-ceni-vkljuceno-8': { q: 'What is included in the price?', namig: 'model, materials, lighting, post-production …' },
    'model-koliko-zaracunas-za-modeliranje-prepro-9': { q: 'How much do you charge to model a simple product?', namig: 'EUR' },
    'model-koliko-za-zahtevnega-mehanika-organske-10': { q: 'How much for a complex one (mechanics, organic shapes, many parts)?', namig: 'EUR' },
    'model-koliko-manj-ce-narocnik-da-svoj-cad-al-11': { q: 'How much less if the client supplies their own CAD or model?', namig: '% or EUR' },
    'model-koliko-doda-teksturiranje-in-materiali-12': { q: 'How much do texturing and materials add, if you count them separately?', namig: 'EUR' },
    'model-koliko-doda-scena-oziroma-okolje-okoli-13': { q: 'How much does a scene or environment around the product add?', namig: 'EUR' },
    'animacija-koliko-zaracunas-za-10-sekund-anim-14': { q: 'How much do you charge for 10 seconds of animation?', namig: 'EUR' },
    'animacija-koliko-za-30-sekund-15': { q: 'How much for 30 seconds?', namig: 'EUR' },
    'animacija-koliko-za-nad-minuto-16': { q: 'How much for over a minute?', namig: 'EUR' },
    'animacija-kako-zaracunas-animacijo-na-sekund-17': { q: 'How do you charge for animation — per second, per shot or per project?', namig: 'and why' },
    'animacija-koliko-doda-simulacija-tekocine-tk-18': { q: 'How much does simulation add (fluids, cloth, particles)?', namig: 'EUR' },
    'animacija-koliko-doda-rigging-in-animacija-l-19': { q: 'How much do rigging and character animation add?', namig: 'EUR' },
    'izris-ali-zaracunas-cas-izrisa-render-farm-e-20': { q: 'Do you charge for render time (render farm, electricity, machine time)?', dopolnilo: 'How much' },
    'izris-koliko-doda-4k-ali-vecja-locljivost-21': { q: 'How much does 4K or higher resolution add?', namig: '% or EUR' },
    'izris-koliko-doda-postprodukcija-kompozit-ba-22': { q: 'How much does post-production add (compositing, colour grading)?', namig: 'EUR or %' },
    'popravki-koliko-krogov-popravkov-je-vkljucen-23': KROGOV_VKLJUCENIH,
    'popravki-koliko-zaracunas-za-dodatni-krog-24': DODATNI_KROG,
    'popravki-kaj-velja-ce-narocnik-zahteva-sprem-25': { q: 'What applies if the client requests a model change after approval?', namig: 'EUR or %' },
    'pravice-je-uporaba-licenca-locena-postavka-26': { q: 'Is usage (licence) a separate item?', dopolnilo: 'How' },
    'pravice-koliko-doda-uporaba-samo-na-spletu-27': SPLET_SAMO,
    'pravice-koliko-doda-uporaba-v-vseh-medijih-t-28': { q: 'How much does all-media usage add, including advertising?', namig: 'EUR or % of the fee' },
    'pravice-ali-oddas-izvorne-datoteke-scena-mod-29': { q: 'Do you hand over source files (scene, model)? At what price?', dopolnilo: 'EUR' },
    'pravice-zaracunas-vec-ce-je-narocnik-velika--30': VELIKA_ZNAMKA,
    'rok-in-odpoved-zaracunas-pribitek-za-nujno-i-31': NUJNO,
    'rok-in-odpoved-zahtevas-predujem-koliko-32': PREDUJEM,
    ...zaKonec(33, 34, 35),
  },

  interier: {
    'kdo-si-koliko-let-se-ukvarjas-z-notranjim-ob-0': { q: 'How many years have you been working in interior design?', namig: 'years' },
    'kdo-si-kaj-delas-najvec-1': { q: 'What do you do most?', namig: 'flats, houses, bars and shops, offices, hotels …' },
    'kdo-si-koliko-projektov-na-leto-2': PROJEKTOV_NA_LETO,
    'kako-racunas-racunas-na-kvadratni-meter-na-p-3': { q: 'Do you charge per square metre, per project, per hour or as a percentage of the investment?', namig: 'and why' },
    'kako-racunas-ce-na-m-koliko-za-idejno-zasnov-4': IDEJNA_NA_M2,
    'kako-racunas-ce-na-uro-kaksna-je-tvoja-urna--5': { q: 'If per hour — what is your hourly rate?', namig: 'EUR/hour' },
    'kako-racunas-imas-najmanjse-narocilo-6': NAJMANJSE_NAROCILO,
    'kako-racunas-se-cena-na-m-spreminja-z-veliko-7': { q: 'Does the price per m² change with the size of the space?', dopolnilo: 'How' },
    'obseg-koliko-zaracunas-samo-za-idejno-zasnov-8': { q: 'How much do you charge for a concept design only?', namig: 'EUR or EUR/m²' },
    'obseg-koliko-za-zasnovo-z-izvedbenimi-nacrti-9': { q: 'How much for a design with construction drawings?', namig: 'EUR or EUR/m²' },
    'obseg-koliko-doda-vodenje-izvedbe-in-nadzor--10': { q: 'How much do project management and site supervision add?', namig: 'EUR, % or EUR/visit' },
    'obseg-koliko-doda-izbor-in-nabava-opreme-11': { q: 'How much do furniture selection and procurement add?', namig: 'EUR or % of furniture value' },
    'obseg-koliko-doda-oblikovanje-pohistva-po-me-12': { q: 'How much does custom furniture design add?', namig: 'EUR per piece or total' },
    'prostori-koliko-zaracunas-za-eno-sobo-ozirom-13': { q: 'How much do you charge for a single room or space?', namig: 'EUR' },
    'prostori-koliko-za-celotno-stanovanje-do-60--14': { q: 'How much for a whole flat up to 60 m²?', namig: 'EUR' },
    'prostori-koliko-za-60-do-120-m-15': { q: 'How much for 60 to 120 m²?', namig: 'EUR' },
    'prostori-koliko-za-nad-120-m-16': { q: 'How much for over 120 m²?', namig: 'EUR' },
    'prostori-je-kuhinja-ali-kopalnica-drazja-od--17': { q: 'Is a kitchen or bathroom more expensive than a living room? By how much?', dopolnilo: 'How much' },
    'prostori-se-cena-razlikuje-med-stanovanjskim-18': { q: 'Does the price differ between residential and commercial spaces?', dopolnilo: 'How much' },
    'vizualizacije-so-3d-vizualizacije-vkljucene--19': VIZUALIZACIJE_VKLJUCENE,
    'vizualizacije-koliko-zaracunas-za-eno-vizual-20': ENA_VIZUALIZACIJA,
    'vizualizacije-koliko-jih-je-vkljucenih-v-osn-21': { q: 'How many are included in the base price?', namig: 'number' },
    'popravki-koliko-krogov-popravkov-je-vkljucen-22': KROGOV_VKLJUCENIH,
    'popravki-koliko-zaracunas-za-dodatni-krog-23': DODATNI_KROG,
    'popravki-kaj-velja-ce-narocnik-po-odobritvi--24': { q: 'What applies if the client changes the design after approval?', namig: 'EUR or %' },
    'stroski-kako-zaracunas-pot-in-obiske-na-loka-25': POT_IN_OBISKI,
    'stroski-koliko-obiskov-je-vkljucenih-26': OBISKOV_VKLJUCENIH,
    'stroski-zaracunas-merjenje-in-posnetek-obsto-27': { q: 'Do you charge for measuring and surveying the existing state?', dopolnilo: 'EUR' },
    'pravice-kdo-ima-pravice-do-nacrtov-in-vizual-28': { q: 'Who owns the rights to the drawings and visualisations?', namig: 'free text' },
    'pravice-zaracunas-objavo-projekta-v-medijih--29': { q: 'Do you charge for publishing the project in the media or reusing it?', dopolnilo: 'How much' },
    'rok-in-odpoved-zaracunas-pribitek-za-nujno-i-30': NUJNO,
    'rok-in-odpoved-zahtevas-predujem-koliko-31': PREDUJEM,
    'rok-in-odpoved-kaj-velja-ce-narocnik-projekt-32': USTAVI_NA_POL,
    ...zaKonec(33, 34, 35),
  },

  arhitektura: {
    'kdo-si-koliko-let-se-ukvarjas-z-arhitekturo-0': { q: 'How many years have you been practising architecture?', namig: 'years' },
    'kdo-si-kaj-projektiras-najvec-1': { q: 'What do you design most?', namig: 'single-family houses, multi-family, commercial, public, renovations …' },
    'kdo-si-imas-pooblastilo-zaps-2': { q: 'Do you hold a ZAPS licence (Slovenian Chamber of Architecture)?', dopolnilo: 'How much?' },
    'kdo-si-koliko-projektov-na-leto-3': PROJEKTOV_NA_LETO,
    'kako-racunas-racunas-po-odstotku-investicije-4': { q: 'Do you charge as a percentage of the investment, per m², per project or by a fee scale?', namig: 'and why' },
    'kako-racunas-ce-po-odstotku-koliksen-je-pri--5': { q: 'If a percentage — what is it for a smaller house?', namig: '%' },
    'kako-racunas-in-pri-vecjem-objektu-6': { q: 'And for a larger building?', namig: '%' },
    'kako-racunas-ce-na-m-koliko-za-idejno-zasnov-7': IDEJNA_NA_M2,
    'kako-racunas-kaksna-je-tvoja-urna-postavka-z-8': { q: 'What is your hourly rate for additional work?', namig: 'EUR/hour' },
    'kako-racunas-imas-najmanjse-narocilo-9': NAJMANJSE_NAROCILO,
    'faze-koliko-od-celotne-cene-odpade-na-idejno-10': { q: 'What share of the total fee goes to the concept design (IDZ)?', namig: '% or EUR' },
    'faze-koliko-na-idejni-projekt-idp-11': { q: 'How much to the schematic design (IDP)?', namig: '% or EUR' },
    'faze-koliko-na-projekt-za-gradbeno-dovoljenj-12': { q: 'How much to the building permit design (DGD)?', namig: '% or EUR' },
    'faze-koliko-na-projekt-za-izvedbo-pzi-13': { q: 'How much to the construction design (PZI)?', namig: '% or EUR' },
    'faze-koliko-na-projekt-izvedenih-del-pid-14': { q: 'How much to the as-built documentation (PID)?', namig: '% or EUR' },
    'faze-katera-faza-je-pri-tebi-najbolj-podcenj-15': { q: 'Which phase is most undervalued in your experience?', namig: 'free text' },
    'nadzor-zaracunas-projektantski-nadzor-koliko-16': { q: 'Do you charge for design supervision? How much?', namig: 'EUR, % or EUR/visit' },
    'nadzor-koliko-obiskov-je-vkljucenih-17': OBISKOV_VKLJUCENIH,
    'nadzor-zaracunas-usklajevanje-z-drugimi-proj-18': { q: 'Do you charge for coordination with other designers (mechanical, electrical, structural)?', dopolnilo: 'How much' },
    'obseg-koliko-doda-prenova-v-primerjavi-z-nov-19': { q: 'How much does a renovation add compared with a new build?', namig: '% or EUR' },
    'obseg-koliko-doda-spomenisko-varstvo-ali-var-20': { q: 'How much does heritage protection or a protected area add?', namig: '% or EUR' },
    'obseg-koliko-doda-zahtevna-lokacija-teren-do-21': { q: 'How much does a difficult site add (terrain, access, restrictions)?', namig: '% or EUR' },
    'obseg-koliko-doda-notranja-oprema-ce-jo-dela-22': { q: 'How much does interior design add, if you do it?', namig: '% or EUR' },
    'vizualizacije-so-3d-vizualizacije-vkljucene--23': VIZUALIZACIJE_VKLJUCENE,
    'vizualizacije-koliko-zaracunas-za-eno-vizual-24': ENA_VIZUALIZACIJA,
    'vizualizacije-zaracunas-maketo-koliko-25': { q: 'Do you charge for a physical model? How much?', namig: 'EUR' },
    'popravki-koliko-variant-zasnove-je-vkljuceni-26': { q: 'How many design variants are included?', namig: 'number' },
    'popravki-koliko-zaracunas-za-dodatno-variant-27': { q: 'How much do you charge for an extra variant?', namig: 'EUR or %' },
    'popravki-kaj-velja-ce-narocnik-po-oddaji-dgd-28': { q: 'What applies if the client changes the design after the permit set (DGD) is submitted?', namig: 'EUR or %' },
    'stroski-kako-zaracunas-pot-in-obiske-na-loka-29': POT_IN_OBISKI,
    'stroski-zaracunas-geodetski-posnetek-in-sogl-30': { q: 'Do you charge separately for the land survey and consents?', dopolnilo: 'How' },
    'stroski-kdo-krije-upravne-takse-31': { q: 'Who covers the administrative fees?', namig: 'free text' },
    'pravice-kdo-ima-avtorske-pravice-do-projekta-32': { q: 'Who holds the copyright to the design?', namig: 'free text' },
    'pravice-zaracunas-ponovno-uporabo-projekta-t-33': { q: 'Do you charge for reusing the design (standard house, another site)?', dopolnilo: 'How much' },
    'pravice-zaracunas-objavo-projekta-v-medijih-34': OBJAVA_V_MEDIJIH,
    'rok-in-odpoved-zaracunas-pribitek-za-nujno-i-35': NUJNO,
    'rok-in-odpoved-zahtevas-predujem-koliko-36': PREDUJEM,
    'rok-in-odpoved-kako-je-razdeljeno-placilo-po-37': { q: 'How is payment split across the phases?', namig: 'free text' },
    ...zaKonec(38, 39, 40),
  },

  marketing: {
    'kdo-si-koliko-let-se-ukvarjas-z-marketingom-1': { q: 'How many years have you been working in marketing?', namig: 'years' },
    'kdo-si-kaj-delas-najvec-2': { q: 'What do you do most?', namig: 'social media, advertising, SEO, email, content, full-service marketing …' },
    'kdo-si-kje-vecinoma-delas-3': KJE_DELAS,
    'kdo-si-koliko-strank-vodis-hkrati-4': { q: 'How many clients do you manage at once?', namig: 'number' },
    'druzbena-omrezja-koliko-zaracunas-za-vodenj-5': { q: 'How much do you charge to manage one social network per month?', namig: 'EUR/month' },
    'druzbena-omrezja-koliko-za-vsako-dodatno-om-6': { q: 'How much for each additional network?', namig: 'EUR/month' },
    'druzbena-omrezja-koliko-objav-je-vkljuceni-7': { q: 'How many posts per month are included?', namig: 'number' },
    'druzbena-omrezja-koliko-doda-priprava-lastn-8': { q: 'How much does producing custom visuals add (not just templates)?', namig: 'EUR/month or % markup' },
    'oglasevanje-koliko-zaracunas-za-postavitev-9': { q: 'How much do you charge to set up one campaign?', namig: 'EUR' },
    'oglasevanje-koliko-za-mesecno-vodenje-kampa-10': { q: 'How much for monthly campaign management?', namig: 'EUR/month or % of budget' },
    'oglasevanje-kaksna-je-tvoja-provizija-od-og-11': { q: 'What is your commission on the advertising budget?', namig: '%' },
    'oglasevanje-je-spodnja-meja-honorarja-pod-k-12': { q: 'Is there a minimum fee you will not go below?', namig: 'EUR/month' },
    'seo-in-email-koliko-zaracunas-za-enkratno-s-13': { q: 'How much do you charge for a one-off SEO audit?', namig: 'EUR' },
    'seo-in-email-koliko-za-mesecno-seo-vodenje-14': { q: 'How much for monthly SEO management?', namig: 'EUR/month' },
    'seo-in-email-koliko-zaracunas-za-postavite-15': { q: 'How much do you charge to set up an automated email sequence?', namig: 'EUR' },
    'seo-in-email-koliko-za-mesecno-posiljanje-r-16': { q: 'How much for sending a regular monthly newsletter?', namig: 'EUR/month' },
    'vsebina-koliko-zaracunas-za-en-kos-vsebine-17': { q: 'How much do you charge for one piece of content (post, short video, graphic)?', namig: 'EUR each' },
    'vsebina-koliko-za-mesecni-paket-vsebine-18': { q: 'How much for a monthly content package?', namig: 'EUR/month' },
    'pogodba-in-pravice-je-uporaba-objava-oglas-19': { q: 'Is usage (running the ads, content licence) a separate item from production?', dopolnilo: 'How' },
    'pogodba-in-pravice-kaksen-je-minimalni-cas-20': { q: 'What is the minimum length of engagement?', namig: 'months' },
    'pogodba-in-pravice-zaracunas-vec-ce-je-str-21': { q: 'Do you charge more if the client is a large or international company?', dopolnilo: 'How much' },
    'rok-in-odpoved-zahtevas-predujem-koliko-22': PREDUJEM,
    'rok-in-odpoved-kaksen-je-odpovedni-rok-23': { q: 'What is the notice period?', namig: 'days/months' },
    'rok-in-odpoved-kaj-velja-ce-stranka-odpove-24': { q: 'What applies if the client cancels mid-month?', namig: '% of price' },
    ...zaKonec(25, 26, 27, true),
  },

  it: {
    'kdo-si-koliko-let-se-ukvarjas-z-razvojem-1': { q: 'How many years have you been developing software?', namig: 'years' },
    'kdo-si-kaj-delas-najvec-2': { q: 'What do you do most?', namig: 'websites, web apps, mobile apps, maintenance …' },
    'kdo-si-kje-vecinoma-delas-3': KJE_DELAS,
    'kdo-si-koliko-projektov-na-leto-4': PROJEKTOV_NA_LETO,
    'spletna-stran-koliko-zaracunas-za-preproste-5': { q: 'How much do you charge for a simple brochure website (up to 5 pages)?', namig: 'EUR' },
    'spletna-stran-koliko-za-spletno-trgovino-6': { q: 'How much for an online shop?', namig: 'EUR' },
    'spletna-stran-koliko-doda-vsaka-dodatna-po-7': { q: 'How much does each additional page add?', namig: 'EUR' },
    'spletna-stran-uporabljas-predloge-cms-ali-8': { q: 'Do you use templates/CMS or code from scratch?', namig: 'e.g. WordPress, Webflow, custom …' },
    'spletna-aplikacija-koliko-zaracunas-za-manj-9': { q: 'How much do you charge for a small web app (one user flow)?', namig: 'EUR' },
    'spletna-aplikacija-koliko-za-srednje-veliko-10': { q: 'How much for a medium-sized app (login, database, several views)?', namig: 'EUR' },
    'spletna-aplikacija-koliko-doda-povezava-na-11': { q: 'How much does an integration with an external system add (payments, email, API)?', namig: 'EUR / integration' },
    'mobilna-aplikacija-delas-mobilne-aplikacije-12': { q: 'Do you build mobile apps?', dopolnilo: 'Which (iOS/Android/both)?' },
    'mobilna-aplikacija-koliko-zaracunas-za-prep-13': { q: 'How much do you charge for a simple mobile app?', namig: 'EUR' },
    'cena-dela-kaksna-je-tvoja-urna-postavka-14': { q: 'What is your hourly rate?', namig: 'EUR/hour' },
    'cena-dela-delas-raje-po-projektu-ali-po-ur-15': { q: 'Do you prefer working per project or hourly?', izbire: ['Per project', 'Hourly', 'Both'] },
    'cena-dela-koliko-krogov-popravkov-je-vklju-16': { q: 'How many rounds of revisions are included in the project price?', namig: 'number' },
    'cena-dela-koliko-zaracunas-za-dodatni-krog-17': DODATNI_KROG_POPRAVKOV,
    'vzdrzevanje-in-gostovanje-koliko-zaracunas-18': { q: 'How much do you charge for monthly maintenance?', namig: 'EUR/month' },
    'vzdrzevanje-in-gostovanje-kaj-je-v-vzdrzeva-19': { q: 'What is included in maintenance?', namig: 'updates, backups, minor fixes …' },
    'vzdrzevanje-in-gostovanje-zaracunas-gostov-20': { q: 'Do you charge for hosting separately?', dopolnilo: 'How much' },
    'pravice-in-izrocitev-narocnik-ob-koncu-dob-21': { q: 'Does the client receive the source code at the end?', dopolnilo: 'Always or only on request?' },
    'pravice-in-izrocitev-je-licenca-za-uporabl-22': { q: 'Is the licence for the libraries/templates used a separate item?', dopolnilo: 'How' },
    'rok-in-odpoved-zaracunas-pribitek-za-nujno-23': NUJNO,
    'rok-in-odpoved-zahtevas-predujem-koliko-24': PREDUJEM,
    'rok-in-odpoved-kaj-velja-ce-narocnik-proje-25': USTAVI_NA_POL,
    ...zaKonec(26, 27, 28, true),
  },
};

/** Prevod enega vprašanja; undefined, če ga ni (prikaz pade na slovenščino). */
export const prevodVprasanja = (panogaId: string, vprasanjeId: string): PrevodVprasanja | undefined =>
  VPRASANJA_EN[panogaId]?.[vprasanjeId];
