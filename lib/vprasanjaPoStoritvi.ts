import { PRICING_SERVICES } from '@/lib/pricingCatalog';

/* BUDGETNI RAZPONI SE IZPELJEJO IZ CENIKA, ne vpisujejo rocno.
 *
 * Tina, 21. 8. 2026: »logo tudi previsoko, halo. Trzne raziskave se drzi.«
 * Imela je prav dvakrat: rocno vpisani razponi so bili previsoki, predvsem pa
 * so se lahko kadarkoli razsli s cenikom, ki je rezultat raziskave. Rocni
 * seznam je treba popravljati na 24 mestih; izpeljan se popravi sam.
 *
 * Pravilo: 0,6x / 1,5x / 3x izhodiscne cene storitve.
 *  - pod 0,6x  = narocnik ne dosega niti vstopne cene -> jasen signal neujemanja
 *  - 0,6-1,5x  = okoli vstopne cene
 *  - 1,5-3x    = udoben obseg
 *  - nad 3x    = velik projekt
 *
 * Preverjeno na CGP: izhodisce 1350 -> 800 / 2.000 / 4.000, kar se ujema s
 * tem, kar sva s Tino izbrala rocno, preden je pravilo obstajalo.
 */
const zaokrozeno = (v: number): number =>
  v < 1000 ? Math.round(v / 50) * 50
    : v < 5000 ? Math.round(v / 100) * 100
      : Math.round(v / 500) * 500;

const evro = (v: number, en: boolean) =>
  en ? `€${v.toLocaleString('en-US')}` : `${v.toLocaleString('sl-SI')} €`;

export const budgetIzbire = (sid: string, en = false): string[] | undefined => {
  const osnova = PRICING_SERVICES.find(s => s.id === sid)?.osnova || 0;
  if (osnova <= 0) return undefined; /* npr. 'drugo' brez cene — pustimo prosto polje */
  const a = zaokrozeno(osnova * 0.6);
  const b = zaokrozeno(osnova * 1.5);
  const c = zaokrozeno(osnova * 3);
  return en
    ? [`Up to ${evro(a, true)}`, `${evro(a, true)} to ${evro(b, true)}`, `${evro(b, true)} to ${evro(c, true)}`, `Over ${evro(c, true)}`, 'Not sure yet']
    : [`Do ${evro(a, false)}`, `${evro(a, false)} do ${evro(b, false)}`, `${evro(b, false)} do ${evro(c, false)}`, `Nad ${evro(c, false)}`, 'Še ne vem'];
};

export type ProjektnoVprasanje = { id: string; label: string; placeholder?: string; izbire?: string[]; vec?: boolean; svoje?: string; vse?: boolean };

export const VPRASANJA_PO_STORITVI: Record<string, ProjektnoVprasanje[]> = {
  logo: [
    { id: 'cilj', label: 'Kaj mora nov znak sporočati?', placeholder: 'npr. bolj premium, bolj zaupanja vredno, bolj igrivo' },
    { id: 'kompleksnost', label: 'Kako kompleksen naj bo logotip?', izbire: ['Enostaven napis ali znak', 'Znak + tipografija (kombiniran)', 'Družina znakov / več različic'] },
    { id: 'uporaba', label: 'Kje se bo najpogosteje uporabljal?', placeholder: 'splet, embalaža, tabla, app ikona, vozila ...' },
    { id: 'omejitve', label: 'Ali obstajajo barve, pisave ali simboli, ki morajo ostati?', izbire: ['Barvna paleta', 'Tipografija (kupljena pisava)', 'Simbol / znak', 'Nič, začnemo sveže'], vec: true, svoje: 'dopiši, če še kaj manjka ...' },
    { id: 'budget', label: 'Kakšen je okvirni budget naročnika?', izbire: ['Do 1.000 €', '1.000 do 2.500 €', 'Nad 2.500 €', 'Še ne vem'], svoje: 'ali vpiši svoj znesek ...' },
  ],
  cgp: [
    { id: 'stanje', label: 'Ali že obstaja logotip ali predhodni CGP?', izbire: ['Začenjamo iz nič', 'Imamo samo logotip', 'Imamo star CGP'], svoje: 'ali dopiši trenutno stanje ...' },
    { id: 'tip-projekta', label: 'Gre za novo identiteto ali osvežitev obstoječe?', izbire: ['Nova identiteta', 'Osvežitev obstoječe', 'Razširitev sistema'], svoje: 'ali na kratko pojasni ...' },
    { id: 'smeri', label: 'Koliko različnih kreativnih smeri pričakuješ?', izbire: ['1 jasna smer', '2 predloga', '3 predlogi', '6 širših raziskav'] },
    { id: 'stil', label: 'Če že veš, kakšen slog želiš, označi.', izbire: ['Minimalistično', 'Retro', 'Editorial', 'Luksuzno', 'Igrivo', 'Tehnološko', 'Organsko', 'Drzno', 'Še ne vem'], vec: true, svoje: 'ali dopiši slog / reference ...' },
    { id: 'omejitve', label: 'Ali obstajajo barve, tipografije ali ideje, ki jih je treba upoštevati?', izbire: ['Barvna paleta', 'Tipografija (kupljena pisava)', 'Simbol / znak', 'Moodboard ali smernice', 'Nič, začnemo sveže'], vec: true, svoje: 'dopiši, če še kaj manjka ...' },
    { id: 'obseg', label: 'Katere aplikacije naj pripravim?', izbire: ['Vizitke in dopisi', 'Predloge za družbena omrežja', 'Predstavitvena predloga', 'Embalaža', 'Tabla / označevanje', 'Vozila', 'Oblačila / merch'], vec: true, vse: true, svoje: 'dopiši svoje ...' },
    { id: 'budget', label: 'Kakšen je okvirni budget naročnika?', izbire: ['Do 800 €', '800 do 2.000 €', '2.000 do 4.000 €', 'Nad 4.000 €', 'Še ne vem'], svoje: 'ali vpiši svoj znesek ...' },
    { id: 'opomba', label: 'Opomba (neobvezno)', placeholder: 'karkoli, kar naj upoštevam vnaprej ...' },
  ],
  web: [
    { id: 'ima-cgp', label: 'Ali ima naročnik celostno grafično podobo (CGP)?', izbire: ['Da, upoštevam obstoječo', 'Ne, oblikujem svobodno', 'Ne, potrebuje tudi novo CGP'] },
    { id: 'tip', label: 'Kaj ustvarjamo ali prenavljamo?', izbire: ['Nova spletna stran', 'Prenova (redesign)', 'Landing page', 'Portfolio', 'Spletna trgovina', 'Custom aplikacija'], vec: true },
    { id: 'ux-ui', label: 'Kaj od UX/UI procesa prevzameš?', izbire: ['Samo postavitev (dizajn že obstaja)', 'UI oblikovanje strani', 'UX zasnova: struktura in user flow', 'Prototip za testiranje', 'Style guide / design system'], vec: true, svoje: 'ali dopiši ...' },
    { id: 'stil', label: 'Če že veš, kakšen slog želiš za spletno stran, označi.', izbire: ['Minimalistično', 'Retro', 'Editorial', 'Luksuzno', 'Igrivo', 'Tehnološko', 'Organsko', 'Drzno', 'Še ne vem'], vec: true, svoje: 'ali opiši reference ...' },
    { id: 'kompleksnost', label: 'Kako kompleksen je projekt?' },
    { id: 'strani', label: 'Koliko ločenih podstrani bo imela stran? (Sekcije, do katerih poskrolaš, štejejo kot ena stran.)', izbire: ['Ena stran z več sekcijami (one-pager)', 'Do 5 podstrani', '6 do 10', '11 do 20', 'Nad 20'], svoje: 'ali opiši: npr. one-pager z 8 sekcijami + 2 podstrani ...' },
    { id: 'funkcije', label: 'Katere funkcionalnosti so nujne?' },
    { id: 'budget', label: 'Kakšen je okvirni budget?' },
    { id: 'rok', label: 'Kdaj mora stran zaživeti?', izbire: ['1 mesec', '2-3 mesece', '6 mesecev'], svoje: 'ali vpiši datum ...' },
    { id: 'dodatno', label: 'Ali potrebuješ dodatne storitve?' },
    { id: 'vsebina', label: 'Kdo pripravi besedila, slike in strukturo vsebine?' },
    { id: 'fonti', label: 'Pisave: je licenca za splet (webfont) urejena?', izbire: ['Da, imamo webfont licenco', 'Uporabimo Google Fonts / odprtokodne', 'Treba jo bo urediti', 'Ne vem še'] },
  ],
  kampanja: [
    { id: 'kanali', label: 'Na katerih kanalih bo kampanja tekla?', izbire: ['Meta (FB/IG)', 'Google', 'TikTok', 'LinkedIn', 'YouTube', 'TV', 'Radio', 'Tisk', 'Zunanje (plakati, avtobusi)'], vec: true, svoje: 'dopiši svoje ...' },
    { id: 'formati', label: 'Katere formate potrebuješ?', izbire: ['Story / Reel', 'Feed objave', 'Spletne pasice', 'Video oglas', 'Tiskani oglas', 'Plakat / city light', 'TV spot'], vec: true, svoje: 'dopiši svoje ...' },
    { id: 'stevilo', label: 'Koliko oglasov (vizualov) potrebuješ?', izbire: ['Do 5', '6 do 15', '16 do 30', 'Nad 30'], svoje: 'ali vpiši število ...' },
    { id: 'cilj', label: 'Kaj je glavni cilj kampanje?', izbire: ['Prodaja', 'Prepoznavnost', 'Prijave / leadi', 'Lansiranje novega', 'Rebranding'], svoje: 'ali opiši po svoje ...' },
    { id: 'trajanje', label: 'Kakšna je časovnica kampanje?', izbire: ['Do 2 tedna', '1 mesec', '3 mesece', 'Celoletna'], svoje: 'ali opiši ...' },
    { id: 'regija', label: 'Katero regijo pokriva?', izbire: ['Lokalno', 'Slovenija', 'Adria regija', 'EU', 'Globalno'], vec: true },
    { id: 'influencerji', label: 'Ali vključimo influencerje?', izbire: ['Da', 'Ne', 'Morda'], svoje: 'kateri, če že veš ...' },
    { id: 'email', label: 'Ali potrebuješ tudi email marketing (newsletter)?', izbire: ['Da, kot posebna postavka', 'Ne', 'Še ne vem'] },
    { id: 'budget', label: 'Okvirni budget naročnika za oblikovanje kampanje?', izbire: ['Do 2.000 €', '2.000 do 5.000 €', '5.000 do 15.000 €', 'Nad 15.000 €', 'Še ne vem'], svoje: 'ali vpiši svoj znesek ...' },
    { id: 'opomba', label: 'Opomba (neobvezno)', placeholder: 'karkoli, kar naj upoštevam vnaprej ...' },
  ],
  publikacija: [
    { id: 'obseg', label: 'Kakšen je obseg tvojega dela?', izbire: ['Kreativa od nič', 'Preoblikovanje po obstoječem dizajnu', 'Samo prelom (postavitev vsebine)', 'Samo priprava za tisk'], svoje: 'ali dopiši ...' },
    { id: 'tip', label: 'Kakšna publikacija je?', izbire: ['Knjiga', 'Brošura', 'Katalog', 'Revija', 'Letak', 'Priročnik'], svoje: 'ali dopiši ...' },
    { id: 'format', label: 'Kakšen format?', izbire: ['A4', 'A5', 'A6', 'Kvadratni', 'DL (letak)'], svoje: 'ali vpiši mere ...' },
    { id: 'izhod', label: 'Za tisk, digital ali oboje?', izbire: ['PDF za tisk', 'PDF za splet', 'ePub', 'Interaktivni PDF'], vec: true },
    { id: 'strani', label: 'Koliko strani (okvirno)?', izbire: ['Do 8', '9 do 32', '33 do 96', 'Nad 96'], svoje: 'ali vpiši ...' },
    { id: 'besedila', label: 'Ali so besedila pripravljena in lektorirana?', izbire: ['Da, lektorirana', 'Pripravljena, brez lekture', 'Še nastajajo'] },
    { id: 'slike', label: 'Ali so slike in grafike že pripravljene?', izbire: ['Da, vse imamo', 'Delno', 'Še nič'] },
    { id: 'vir-slik', label: 'Če slik ni: kako jih pridobimo?', izbire: ['Fotografiranje', 'Ilustracije', 'AI slike', 'Stock fotografije'], vec: true, svoje: 'opombe ...' },
    { id: 'kolicina-slik', label: 'Koliko stock ali AI slik (okvirno)?', izbire: ['Brez', 'Do 10', '10 do 30', 'Nad 30'], svoje: 'ali vpiši ...' },
    { id: 'fonti', label: 'Pisave: so licence urejene za predvideno rabo (tisk/splet/app)?', izbire: ['Naročnik jih ima za to rabo', 'Treba jih bo kupiti / nadgraditi', 'Uporabimo odprtokodne (npr. Google Fonts)', 'Ne vem še'] },
    { id: 'jeziki', label: 'Koliko jezikovnih različic?', izbire: ['1', '2', '3 ali več'] },
    { id: 'naklada', label: 'Predvidena naklada tiska?', izbire: ['Samo digital', 'Do 100', '100 do 500', 'Nad 500'], svoje: 'ali vpiši ...' },
    { id: 'proof', label: 'Ali potrebujete tiskarski proof (poskusni odtis)?', izbire: ['Da', 'Ne', 'Ne vem še'] },
    { id: 'tisk', label: 'Vključimo pripravo za tisk in komunikacijo s tiskarjem?', izbire: ['Da, vključi', 'Ne, uredijo sami'] },
    { id: 'dodatne', label: 'Katere dodatne storitve prevzameš?', izbire: ['Prevod besedil', 'Lektura', 'Priprava za tisk', 'Vnos podatkov / cen', 'Retuša fotografij'], vec: true, svoje: 'dopiši ...' },
    { id: 'opomba', label: 'Opomba (neobvezno)', placeholder: 'karkoli, kar naj upoštevam vnaprej ...' },
  ],
  embalaza: [
    { id: 'tip', label: 'Kakšna embalaža je?', izbire: ['Škatla', 'Etiketa', 'Vrečka', 'Tuba / steklenička', 'Ovitek'], svoje: 'ali dopiši ...' },
    { id: 'izdelki', label: 'Za koliko izdelkov ali variant gre?', izbire: ['1 izdelek', '2 do 4', '5 ali več'], svoje: 'ali vpiši ...' },
    { id: 'tehnika', label: 'Ali že obstaja dieline / tehnična skica?', izbire: ['Da, obstaja', 'Treba jo bo izdelati', 'Ne vem še'] },
    { id: 'trg', label: 'Kje se bo izdelek prodajal?', izbire: ['Splet', 'Trgovine', 'Premium butik', 'HoReCa', 'Lekarne'], vec: true, svoje: 'dopiši ...' },
    { id: 'oznake', label: 'Zakonske oznake (deklaracije, sestavine)?', izbire: ['Pripravljene', 'Treba jih bo urediti', 'Ne vem še'] },
    { id: 'budget', label: 'Okvirni budget naročnika?', izbire: ['Do 1.500 €', '1.500 do 4.000 €', 'Nad 4.000 €', 'Še ne vem'], svoje: 'ali vpiši svoj znesek ...' },
    { id: 'opomba', label: 'Opomba (neobvezno)', placeholder: 'karkoli, kar naj upoštevam vnaprej ...' },
  ],
  ilustracija: [
    { id: 'stil', label: 'Kakšen slog ilustracije želiš?', izbire: ['Editorial', 'Otroško', 'Luksuzno', 'Tehnično', '3D', 'Ročno risano'], vec: true, svoje: 'ali opiši ...' },
    { id: 'tehnika', label: 'Kakšna tehnika?', izbire: ['Ročno (akvarel, tempera, akril, kreda ...)', 'Računalniška grafika (vektor, digital painting ...)'], svoje: 'ali natančneje opiši tehniko in format ...' },
    { id: 'kolicina', label: 'Koliko ilustracij ali likov?', izbire: ['1 do 3', '4 do 8', '9 ali več'], svoje: 'ali vpiši ...' },
    { id: 'barvnost', label: 'Črtne ali barvne?', izbire: ['Črtne', 'Barvne', 'Oboje'] },
    { id: 'pravice', label: 'Kje in koliko časa se bodo uporabljale?', izbire: ['Ena objava / kampanja', 'Splet neomejeno', 'Vsi mediji neomejeno'], svoje: 'ali opiši ...' },
    { id: 'budget', label: 'Okvirni budget naročnika?', izbire: ['Do 800 €', '800 do 2.000 €', 'Nad 2.000 €', 'Še ne vem'], svoje: 'ali vpiši svoj znesek ...' },
    { id: 'opomba', label: 'Opomba (neobvezno)', placeholder: 'karkoli, kar naj upoštevam vnaprej ...' },
  ],
  direkcija: [
    { id: 'vloga', label: 'Kaj naj kreativna direkcija pokrije?', izbire: ['Koncept in strategija', 'Art direction', 'Vodenje izvajalcev', 'Nadzor izvedbe'], vec: true, svoje: 'dopiši ...' },
    { id: 'ekipa', label: 'Ali vodim tudi zunanje izvajalce?', izbire: ['Da', 'Ne', 'Delno'], svoje: 'kdo je že v ekipi ...' },
    { id: 'trajanje', label: 'Kakšno sodelovanje?', izbire: ['Enkraten projekt', '3-mesečno', '6-mesečno ali več'], svoje: 'ali opiši ...' },
    { id: 'srecanja', label: 'Kako pogosta srečanja?', izbire: ['Tedensko', 'Mesečno', 'Po potrebi'] },
    { id: 'budget', label: 'Okvirni mesečni budget naročnika?', izbire: ['Do 800 €', '800 do 2.000 €', 'Nad 2.000 €', 'Še ne vem'], svoje: 'ali vpiši svoj znesek ...' },
    { id: 'opomba', label: 'Opomba (neobvezno)', placeholder: 'karkoli, kar naj upoštevam vnaprej ...' },
  ],
  fotografija: [
    { id: 'tip', label: 'Kaj se fotografira?', izbire: ['Produkti', 'Portreti / ekipa', 'Prostori', 'Dogodek', 'Hrana', 'Kampanja'], vec: true, svoje: 'dopiši ...' },
    { id: 'trajanje', label: 'Koliko fotografiranja?', izbire: ['Pol dneva', '1 dan', '2 ali več dni'], svoje: 'ali opiši ...' },
    { id: 'lokacija', label: 'Kje?', izbire: ['V studiu', 'Pri naročniku', 'Na zunanji lokaciji', 'Več lokacij'] },
    { id: 'najem', label: 'Bo treba najeti studio, opremo ali lokacijo?', izbire: ['Ne', 'Da, studio', 'Da, luči / opremo', 'Da, lokacijo', 'Ne vem še'], vec: true },
    { id: 'post', label: 'Koliko obdelanih fotografij za predajo?', izbire: ['Do 20', '20 do 50', 'Nad 50'], svoje: 'ali vpiši ...' },
    { id: 'obdelava', label: 'Kakšna obdelava?', izbire: ['Osnovna', 'Napredna retuša'] },
    { id: 'raba', label: 'Kje se bodo uporabljale?', izbire: ['Splet / social', 'Tisk', 'Oglaševanje'], vec: true },
    { id: 'budget', label: 'Okvirni budget naročnika?', izbire: ['Do 500 €', '500 do 1.500 €', 'Nad 1.500 €', 'Še ne vem'], svoje: 'ali vpiši svoj znesek ...' },
    { id: 'opomba', label: 'Opomba (neobvezno)', placeholder: 'karkoli, kar naj upoštevam vnaprej ...' },
  ],
  copy: [
    { id: 'kanal', label: 'Za kateri kanal nastajajo besedila?', izbire: ['Spletna stran', 'Blog', 'Oglasi', 'Email', 'Social', 'PR', 'Naming / slogan'], vec: true, svoje: 'dopiši ...' },
    { id: 'kolicina', label: 'Koliko besedil ali strani?', izbire: ['Do 5 strani', '6 do 15 strani', 'Nad 15 strani'], svoje: 'ali vpiši ...' },
    { id: 'ton', label: 'Kakšen ton znamke?', izbire: ['Formalno', 'Toplo', 'Drzno', 'Strokovno', 'Igrivo'], vec: true, svoje: 'ali opiši ...' },
    { id: 'seo', label: 'SEO optimizacija?', izbire: ['Da', 'Ne', 'Svetuj mi'] },
    { id: 'jeziki', label: 'V katerih jezikih?', izbire: ['Slovenščina', 'Slovenščina + angleščina', 'Več jezikov'], svoje: 'kateri ...' },
    { id: 'gradiva', label: 'Kakšna so izhodišča?', izbire: ['Imajo iztočnice', 'Potreben intervju', 'Začnemo iz nič'] },
    { id: 'budget', label: 'Okvirni budget naročnika?', izbire: ['Do 500 €', '500 do 1.500 €', 'Nad 1.500 €', 'Še ne vem'], svoje: 'ali vpiši svoj znesek ...' },
    { id: 'opomba', label: 'Opomba (neobvezno)', placeholder: 'karkoli, kar naj upoštevam vnaprej ...' },
  ],
  interier: [
    { id: 'prostor', label: 'Kateri prostor urejamo?', izbire: ['Stanovanje', 'Poslovni prostor', 'Gostinski lokal', 'Trgovina', 'Razstavni prostor'], vec: true, svoje: 'dopiši ...' },
    { id: 'obseg', label: 'Kolikšna kvadratura?', izbire: ['Do 45 m²', '45 do 80 m²', '80 do 130 m²', 'Nad 130 m²'], svoje: 'ali vpiši m² (npr. poslovni prostor) ...' },
    { id: 'faza', label: 'V kateri fazi je projekt?', izbire: ['Novogradnja (napeljave fiksne)', 'Prenova (spremembe prostorov/napeljav)', 'Samo oprema / styling', 'Mizarsko / pohištvo po meri'] },
    { id: 'storitve', label: 'Katere faze vključuje?', izbire: ['Idejni tloris', 'Look & feel (moodboard)', 'Kosovna oprema in delavniški načrti', '3D vizualizacija', 'Nadzor izvedbe (ločena ponudba)'], vec: true, svoje: 'dopiši ...' },
    { id: 'budget', label: 'Okvirni budget naročnika?', izbire: ['Do 2.000 €', '2.000 do 6.000 €', 'Nad 6.000 €', 'Še ne vem'], svoje: 'ali vpiši svoj znesek ...' },
    { id: 'opomba', label: 'Opomba (neobvezno)', placeholder: 'karkoli, kar naj upoštevam vnaprej ...' },
  ],
  arhitektura: [
    { id: 'vrsta', label: 'Katera vrsta arhitekture?', izbire: ['Stavbna', 'Notranja', 'Krajinska'], svoje: 'dopiši ...' },
    { id: 'tip', label: 'Kaj oblikujemo?', izbire: ['Stanovanjski objekt', 'Poslovni objekt', 'Prizidek / prenova', 'Zunanja ureditev'], vec: true, svoje: 'dopiši ...' },
    { id: 'faza', label: 'Katere faze vključuje?', izbire: ['Idejna zasnova (IDZ)', 'Dokumentacija (IZP / PGD)', 'Izvedbeni načrti (PZI)', 'Nadzor (ločena ponudba)'], vec: true, svoje: 'dopiši ...' },
    { id: 'povrsina', label: 'Okvirna površina?', izbire: ['Do 100 m²', '100 do 300 m²', 'Nad 300 m²'], svoje: 'ali vpiši ...' },
    { id: 'vizualizacije', label: 'Kakšna vizualizacija?', izbire: ['2D izris', '3D render'], vec: true, svoje: 'dopiši ...' },
    { id: 'budget', label: 'Okvirni budget naročnika?', izbire: ['Do 3.000 €', '3.000 do 8.000 €', 'Nad 8.000 €', 'Še ne vem'], svoje: 'ali vpiši svoj znesek ...' },
    { id: 'opomba', label: 'Opomba (neobvezno)', placeholder: 'karkoli, kar naj upoštevam vnaprej ...' },
  ],
  razstava: [
    { id: 'tip', label: 'Kaj oblikujemo?', izbire: ['Razstavni prostor / sejem', 'Muzejska postavitev', 'Scenografija dogodka', 'Instalacija'], vec: true, svoje: 'dopiši ...' },
    { id: 'obseg', label: 'Velikost prostora?', izbire: ['Do 20 m²', '20 do 60 m²', 'Nad 60 m²'], svoje: 'ali vpiši ...' },
    { id: 'storitve', label: 'Kaj vključuje?', izbire: ['Koncept', 'Tlorisi', '3D vizualizacije', 'Grafika', 'Nadzor postavitve'], vec: true },
    { id: 'trajanje', label: 'Koliko časa stoji?', izbire: ['Enkraten dogodek', 'Do 1 mesec', 'Stalna postavitev'] },
    { id: 'budget', label: 'Okvirni budget naročnika?', izbire: ['Do 2.000 €', '2.000 do 6.000 €', 'Nad 6.000 €', 'Še ne vem'], svoje: 'ali vpiši svoj znesek ...' },
    { id: 'opomba', label: 'Opomba (neobvezno)', placeholder: 'karkoli, kar naj upoštevam vnaprej ...' },
  ],
  produktni: [
    { id: 'tip', label: 'Kaj oblikujemo?', izbire: ['Kos pohištva', 'Serija izdelkov', 'Razsvetljava', 'Uporabni predmet'], vec: true, svoje: 'dopiši ...' },
    { id: 'kolicina', label: 'Koliko izdelkov ali variant?', izbire: ['1', '2 do 4', '5 ali več'], svoje: 'ali vpiši ...' },
    { id: 'storitve', label: 'Kaj vključuje?', izbire: ['Koncept', 'Tehnična dokumentacija', '3D model', 'Prototip', 'Nadzor proizvodnje'], vec: true },
    { id: 'proizvodnja', label: 'Je proizvajalec znan?', izbire: ['Da', 'Ne', 'Iščemo ga'] },
    { id: 'budget', label: 'Okvirni budget naročnika?', izbire: ['Do 2.000 €', '2.000 do 6.000 €', 'Nad 6.000 €', 'Še ne vem'], svoje: 'ali vpiši svoj znesek ...' },
    { id: 'opomba', label: 'Opomba (neobvezno)', placeholder: 'karkoli, kar naj upoštevam vnaprej ...' },
  ],
  uxui: [
    { id: 'tip', label: 'Kaj oblikujemo?', izbire: ['Spletna stran', 'Spletna aplikacija', 'Mobilna aplikacija', 'Dashboard / SaaS'], vec: true, svoje: 'dopiši ...' },
    { id: 'obseg', label: 'Koliko ekranov ali pogledov?', izbire: ['Do 5', '6 do 15', '16 do 30', 'Nad 30'], svoje: 'ali vpiši ...' },
    { id: 'storitve', label: 'Kaj vključuje?', izbire: ['UX raziskava', 'Uporabniške poti', 'Žični okvirji (wireframe)', 'UI dizajn', 'Prototip', 'Design system'], vec: true },
    { id: 'osnova', label: 'Iz česa izhajamo?', izbire: ['Iz nič', 'Obstaja CGP', 'Obstaja star dizajn'] },
    { id: 'test', label: 'Uporabniško testiranje?', izbire: ['Da', 'Ne', 'Svetuj mi'] },
    { id: 'fonti', label: 'Pisave: je licenca za vgradnjo v aplikacijo urejena?', izbire: ['Da, urejena za app', 'Uporabimo odprtokodne (npr. Google Fonts)', 'Treba jo bo urediti', 'Ne vem še'] },
    { id: 'budget', label: 'Okvirni budget naročnika?', izbire: ['Do 1.500 €', '1.500 do 4.000 €', 'Nad 4.000 €', 'Še ne vem'], svoje: 'ali vpiši svoj znesek ...' },
    { id: 'opomba', label: 'Opomba (neobvezno)', placeholder: 'karkoli, kar naj upoštevam vnaprej ...' },
  ],
  aplikacija: [
    { id: 'platforma', label: 'Za katere platforme?', izbire: ['iOS', 'Android', 'Oboje', 'Spletna (PWA)'], vec: true },
    { id: 'obseg', label: 'Koliko ključnih funkcij ali ekranov?', izbire: ['Do 5', '6 do 15', 'Nad 15'], svoje: 'ali vpiši ...' },
    { id: 'storitve', label: 'Kaj prevzameš?', izbire: ['Razvoj sprednjega dela', 'Razvoj zaledja', 'Povezave z zunanjimi sistemi', 'Objava v trgovine', 'Vzdrževanje po predaji'], vec: true, svoje: 'dopiši ...' },
    { id: 'backend', label: 'Ali rabi backend ali bazo?', izbire: ['Da', 'Ne', 'Ne vem še'] },
    { id: 'fonti', label: 'Pisave: je licenca za vgradnjo v aplikacijo urejena?', izbire: ['Da, urejena za app', 'Uporabimo odprtokodne (npr. Google Fonts)', 'Treba jo bo urediti', 'Ne vem še'] },
    { id: 'budget', label: 'Okvirni budget naročnika?', izbire: ['Do 3.000 €', '3.000 do 8.000 €', 'Nad 8.000 €', 'Še ne vem'], svoje: 'ali vpiši svoj znesek ...' },
    { id: 'opomba', label: 'Opomba (neobvezno)', placeholder: 'karkoli, kar naj upoštevam vnaprej ...' },
  ],
  dizajnsistem: [
    { id: 'obseg', label: 'Kako obsežen sistem?', izbire: ['Osnovni (barve, tipografija, gumbi)', 'Srednji (komponente)', 'Obsežen (celotna knjižnica)'] },
    { id: 'namen', label: 'Za kaj?', izbire: ['Spletna stran', 'Aplikacija', 'Več produktov', 'Znamka'], vec: true },
    { id: 'orodje', label: 'V katerem orodju?', izbire: ['Figma', 'Drugo'], svoje: 'katero ...' },
    { id: 'dokumentacija', label: 'Potrebna dokumentacija / navodila?', izbire: ['Da', 'Osnovna', 'Ne'] },
    { id: 'budget', label: 'Okvirni budget naročnika?', izbire: ['Do 1.500 €', '1.500 do 4.000 €', 'Nad 4.000 €', 'Še ne vem'], svoje: 'ali vpiši svoj znesek ...' },
    { id: 'opomba', label: 'Opomba (neobvezno)', placeholder: 'karkoli, kar naj upoštevam vnaprej ...' },
  ],
  smm: [
    { id: 'kanali', label: 'Katere kanale vodimo?', izbire: ['Instagram', 'Facebook', 'TikTok', 'LinkedIn', 'YouTube'], vec: true, svoje: 'dopiši ...' },
    { id: 'objave', label: 'Koliko objav mesečno?', izbire: ['Do 8', '9 do 16', 'Nad 16'], svoje: 'ali vpiši ...' },
    { id: 'storitve', label: 'Kaj vključuje?', izbire: ['Strategija', 'Vsebinski koledar', 'Oblikovanje objav', 'Copywriting', 'Odgovarjanje na komentarje', 'Oglaševanje'], vec: true },
    { id: 'gradiva', label: 'Kdo priskrbi fotografije in video?', izbire: ['Naročnik', 'Jaz', 'Kombinirano'] },
    { id: 'trajanje', label: 'Za koliko časa?', izbire: ['Enkratno', '3-mesečno', '6-mesečno ali več'] },
    { id: 'budget', label: 'Okvirni mesečni budget naročnika?', izbire: ['Do 500 €', '500 do 1.500 €', 'Nad 1.500 €', 'Še ne vem'], svoje: 'ali vpiši svoj znesek ...' },
    { id: 'opomba', label: 'Opomba (neobvezno)', placeholder: 'karkoli, kar naj upoštevam vnaprej ...' },
  ],
  seo: [
    { id: 'storitve', label: 'Kaj potrebuje?', izbire: ['Tehnični SEO audit', 'Optimizacija vsebin', 'Ključne besede', 'Povezave (linkbuilding)', 'Redno vodenje'], vec: true },
    { id: 'stran', label: 'Kakšna stran?', izbire: ['Predstavitvena', 'Spletna trgovina', 'Blog / portal'], svoje: 'dopiši ...' },
    { id: 'stanje', label: 'Trenutno stanje?', izbire: ['Nova stran', 'Obstoječa brez SEO', 'Že delano na SEO'] },
    { id: 'trajanje', label: 'Enkratno ali redno?', izbire: ['Enkraten audit / optimizacija', 'Mesečno vodenje'] },
    { id: 'budget', label: 'Okvirni budget naročnika?', izbire: ['Do 500 €', '500 do 1.500 €', 'Nad 1.500 €', 'Še ne vem'], svoje: 'ali vpiši svoj znesek ...' },
    { id: 'opomba', label: 'Opomba (neobvezno)', placeholder: 'karkoli, kar naj upoštevam vnaprej ...' },
  ],
  email: [
    { id: 'storitve', label: 'Kaj potrebuje?', izbire: ['Zasnova predloge', 'Postavitev v orodju', 'Pisanje vsebin', 'Avtomatizacije', 'Redno pošiljanje'], vec: true },
    { id: 'orodje', label: 'Katero orodje?', izbire: ['Mailchimp', 'MailerLite', 'Drugo', 'Nimajo še'], svoje: 'katero ...' },
    { id: 'pogostost', label: 'Kako pogosto?', izbire: ['Enkratno', 'Mesečno', 'Tedensko'] },
    { id: 'baza', label: 'Imajo bazo naslovnikov?', izbire: ['Da', 'Ne', 'Gradimo jo'] },
    { id: 'budget', label: 'Okvirni budget naročnika?', izbire: ['Do 400 €', '400 do 1.200 €', 'Nad 1.200 €', 'Še ne vem'], svoje: 'ali vpiši svoj znesek ...' },
    { id: 'opomba', label: 'Opomba (neobvezno)', placeholder: 'karkoli, kar naj upoštevam vnaprej ...' },
  ],
  pr: [
    { id: 'storitve', label: 'Kaj vključuje?', izbire: ['Sporočila za javnost', 'Odnosi z mediji', 'Krizno komuniciranje', 'Dogodki', 'Vsebine za medije'], vec: true },
    { id: 'obseg', label: 'Enkratno ali redno?', izbire: ['Enkraten projekt', '3-mesečno', '6-mesečno ali več'] },
    { id: 'mediji', label: 'Kateri mediji?', izbire: ['Lokalni', 'Nacionalni', 'Panožni / strokovni', 'Spletni'], vec: true },
    { id: 'gradiva', label: 'Imajo pripravljena izhodišča?', izbire: ['Da', 'Delno', 'Ne'] },
    { id: 'budget', label: 'Okvirni mesečni budget naročnika?', izbire: ['Do 800 €', '800 do 2.000 €', 'Nad 2.000 €', 'Še ne vem'], svoje: 'ali vpiši svoj znesek ...' },
    { id: 'opomba', label: 'Opomba (neobvezno)', placeholder: 'karkoli, kar naj upoštevam vnaprej ...' },
  ],
  video: [
    { id: 'tip', label: 'Kakšen video?', izbire: ['Promocijski', 'Izobraževalni', 'Social (kratki)', 'Dogodek', 'Intervju'], vec: true, svoje: 'dopiši ...' },
    { id: 'kolicina', label: 'Koliko videov ali kakšna dolžina?', izbire: ['1 kratek', '1 daljši', 'Serija'], svoje: 'ali opiši ...' },
    { id: 'storitve', label: 'Kaj prevzameš?', izbire: ['Scenarij', 'Snemanje', 'Montaža', 'Animacija', 'Zvok / glasba'], vec: true },
    { id: 'snemanje', label: 'Koliko snemalnih dni?', izbire: ['Brez snemanja', 'Pol dneva', '1 dan', '2 ali več'] },
    { id: 'najem', label: 'Najem opreme, ekipe ali lokacije?', izbire: ['Ne', 'Da, oprema', 'Da, ekipa', 'Da, lokacija', 'Ne vem še'], vec: true },
    { id: 'budget', label: 'Okvirni budget naročnika?', izbire: ['Do 1.000 €', '1.000 do 3.000 €', 'Nad 3.000 €', 'Še ne vem'], svoje: 'ali vpiši svoj znesek ...' },
    { id: 'opomba', label: 'Opomba (neobvezno)', placeholder: 'karkoli, kar naj upoštevam vnaprej ...' },
  ],
  motion: [
    { id: 'tip', label: 'Kaj animiramo?', izbire: ['Logotip', 'Explainer video', 'Social animacije', 'UI animacije', 'Podnapisi / grafika'], vec: true, svoje: 'dopiši ...' },
    { id: 'kolicina', label: 'Koliko ali kakšna dolžina?', izbire: ['Do 15 s', '15 do 60 s', 'Nad 60 s / serija'], svoje: 'ali vpiši ...' },
    { id: 'stil', label: 'Kakšen slog?', izbire: ['2D', '3D', 'Kinetična tipografija', 'Mešano'], svoje: 'ali opiši ...' },
    { id: 'gradiva', label: 'Ali obstajajo grafike / logotip?', izbire: ['Da', 'Delno', 'Ne, treba oblikovati'] },
    { id: 'zvok', label: 'Potreben zvok ali glasba?', izbire: ['Da', 'Ne', 'Naročnik priskrbi'] },
    { id: 'budget', label: 'Okvirni budget naročnika?', izbire: ['Do 900 €', '900 do 2.500 €', 'Nad 2.500 €', 'Še ne vem'], svoje: 'ali vpiši svoj znesek ...' },
    { id: 'opomba', label: 'Opomba (neobvezno)', placeholder: 'karkoli, kar naj upoštevam vnaprej ...' },
  ],
  render3d: [
    { id: 'tip', label: 'Kaj vizualiziramo?', izbire: ['Izdelek', 'Interier', 'Arhitektura / eksterier', 'Embalaža', 'Animacija'], vec: true, svoje: 'dopiši ...' },
    { id: 'kolicina', label: 'Koliko pogledov ali slik?', izbire: ['Do 3', '4 do 8', 'Nad 8'], svoje: 'ali vpiši ...' },
    { id: 'gradiva', label: 'Ali obstajajo modeli / načrti?', izbire: ['Da', 'Delno', 'Ne, treba modelirati'] },
    { id: 'kakovost', label: 'Namen?', izbire: ['Predstavitev / splet', 'Tisk', 'Fotorealizem za oglas'] },
    { id: 'budget', label: 'Okvirni budget naročnika?', izbire: ['Do 900 €', '900 do 2.500 €', 'Nad 2.500 €', 'Še ne vem'], svoje: 'ali vpiši svoj znesek ...' },
    { id: 'opomba', label: 'Opomba (neobvezno)', placeholder: 'karkoli, kar naj upoštevam vnaprej ...' },
  ],
  strategija: [
    { id: 'obseg', label: 'Kaj vključuje?', izbire: ['Pozicioniranje', 'Ciljne skupine', 'Vrednote in ton', 'Ime / naming', 'Komunikacijska strategija'], vec: true },
    { id: 'faza', label: 'V kateri fazi je znamka?', izbire: ['Nova znamka', 'Prenova', 'Rast / širitev'] },
    { id: 'delavnice', label: 'Delavnice z naročnikom?', izbire: ['Da', 'Ne', 'Po potrebi'] },
    { id: 'izdelek', label: 'Kaj je rezultat?', izbire: ['Strateški dokument', 'Brand book', 'Oboje'] },
    { id: 'budget', label: 'Okvirni budget naročnika?', izbire: ['Do 1.200 €', '1.200 do 3.500 €', 'Nad 3.500 €', 'Še ne vem'], svoje: 'ali vpiši svoj znesek ...' },
    { id: 'opomba', label: 'Opomba (neobvezno)', placeholder: 'karkoli, kar naj upoštevam vnaprej ...' },
  ],
};
