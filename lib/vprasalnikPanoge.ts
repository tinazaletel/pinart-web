/* VPRAŠALNIK O CENAH PO PANOGAH
 *
 * Isti vprašalnik, ki je bil prej Excel priponka. Excel se izgubi v pošti in
 * človeka ustraši; povezava se odpre na telefonu. Vprašanja so PRENESENA iz
 * datotek vprasalnik-*.xlsx, ne napisana na novo — odgovori prvih ljudi so že
 * vgrajeni v lib/cenovneUtezi.ts in morajo ostati primerljivi.
 *
 * Zakaj po sklopih in ne eno vprašanje na zaslon: vprašalnik ima do 42
 * vprašanj, kar bi bilo 42 zaslonov. Sklop na korak da devet korakov, videz pa
 * ostane isti kot v kalkulatorju (Tina, 3. 9. 2026).
 */

export type VprasanjeVrsta = 'znesek' | 'stevilo' | 'kratko' | 'besedilo' | 'izbira' | 'daNe';

export type VprasalnikVprasanje = {
  id: string;
  q: string;
  namig?: string;
  vrsta: VprasanjeVrsta;
  izbire?: string[];
  /** Pri »da / ne — koliko«: kaj vprašamo, ko odgovori z da. */
  dopolnilo?: string;
};

export type VprasalnikSklop = { sklop: string; vprasanja: VprasalnikVprasanje[] };
export type Panoga = { id: string; ime: string; imeEn: string; uvod: string; sklopi: VprasalnikSklop[] };

export const PANOGE: Panoga[] = [
  {
    id: "grafika", ime: "Grafično oblikovanje", imeEn: "Graphic design",
    uvod: "Zanimajo me tvoje prave cene za oblikovanje — od logotipa do tiskovin.",
    sklopi: [
      { sklop: "Kdo si", vprasanja: [
        {"id": "kdo-si-koliko-let-se-ukvarjas-z-oblikovanjem-0", "q": "Koliko let se ukvarjaš z oblikovanjem?", "vrsta": "stevilo", "namig": "let"},
        {"id": "kdo-si-kaj-delas-najvec-1", "q": "Kaj delaš največ?", "vrsta": "kratko", "namig": "logotipi, CGP, tiskovine, embalaža, ilustracija, splet …"},
        {"id": "kdo-si-kje-vecinoma-delas-2", "q": "Kje večinoma delaš?", "vrsta": "izbira", "izbire": ["Slovenija", "tujina", "oboje"]},
        {"id": "kdo-si-koliko-projektov-na-leto-3", "q": "Koliko projektov na leto?", "vrsta": "stevilo", "namig": "število"},
      ] },
      { sklop: "Logotip", vprasanja: [
        {"id": "logotip-koliko-zaracunas-za-logotip-z-eno-ja-4", "q": "Koliko zaračunaš za logotip z eno jasno smerjo?", "vrsta": "znesek", "namig": "EUR brez DDV"},
        {"id": "logotip-koliko-ce-pripravis-dva-predloga-5", "q": "Koliko, če pripraviš dva predloga?", "vrsta": "znesek", "namig": "EUR"},
        {"id": "logotip-koliko-za-tri-predloge-6", "q": "Koliko za tri predloge?", "vrsta": "znesek", "namig": "EUR"},
        {"id": "logotip-koliko-krogov-popravkov-je-vkljuceni-7", "q": "Koliko krogov popravkov je vključenih?", "vrsta": "stevilo", "namig": "število"},
        {"id": "logotip-koliko-zaracunas-za-dodatni-krog-pop-8", "q": "Koliko zaračunaš za dodatni krog popravkov?", "vrsta": "znesek", "namig": "EUR"},
        {"id": "logotip-koliko-doda-raziskava-trg-konkurenca-9", "q": "Koliko doda raziskava (trg, konkurenca, pozicioniranje)?", "vrsta": "znesek", "namig": "EUR"},
        {"id": "logotip-kaj-je-v-osnovni-ceni-vkljuceno-10", "q": "Kaj je v osnovni ceni vključeno?", "vrsta": "kratko", "namig": "datoteke, osnovna navodila, barvne različice …"},
      ] },
      { sklop: "CGP", vprasanja: [
        {"id": "cgp-koliko-zaracunas-za-celostno-graficno-po-11", "q": "Koliko zaračunaš za celostno grafično podobo z eno smerjo?", "vrsta": "znesek", "namig": "EUR"},
        {"id": "cgp-koliko-za-dve-oziroma-tri-smeri-12", "q": "Koliko za dve oziroma tri smeri?", "vrsta": "znesek", "namig": "EUR"},
        {"id": "cgp-kaj-mora-cgp-obvezno-vsebovati-da-je-to--13", "q": "Kaj mora CGP obvezno vsebovati, da je to CGP in ne logotip?", "vrsta": "besedilo", "namig": "prosto"},
        {"id": "cgp-koliko-doda-knjiga-standardov-14", "q": "Koliko doda knjiga standardov?", "vrsta": "znesek", "namig": "EUR"},
      ] },
      { sklop: "Tiskovine", vprasanja: [
        {"id": "tiskovine-koliko-zaracunas-za-publikacijo-do-15", "q": "Koliko zaračunaš za publikacijo do 8 strani?", "vrsta": "znesek", "namig": "EUR"},
        {"id": "tiskovine-koliko-za-9-do-32-strani-16", "q": "Koliko za 9 do 32 strani?", "vrsta": "znesek", "namig": "EUR"},
        {"id": "tiskovine-koliko-za-33-do-96-strani-17", "q": "Koliko za 33 do 96 strani?", "vrsta": "znesek", "namig": "EUR"},
        {"id": "tiskovine-koliko-zaracunas-na-stran-ko-gre-s-18", "q": "Koliko zaračunaš na stran, ko gre samo za prelom?", "vrsta": "znesek", "namig": "EUR na stran"},
        {"id": "tiskovine-koliko-manj-ce-je-zasnova-ze-narej-19", "q": "Koliko manj, če je zasnova že narejena in samo preoblikuješ?", "vrsta": "znesek", "namig": "% ali EUR"},
        {"id": "tiskovine-koliko-doda-druga-jezikovna-razlic-20", "q": "Koliko doda druga jezikovna različica?", "vrsta": "znesek", "namig": "% ali EUR"},
        {"id": "tiskovine-koliko-zaracunas-samo-za-pripravo--21", "q": "Koliko zaračunaš samo za pripravo za tisk?", "vrsta": "znesek", "namig": "EUR ali % cene"},
      ] },
      { sklop: "Embalaža", vprasanja: [
        {"id": "embalaza-koliko-zaracunas-za-embalazo-enega--22", "q": "Koliko zaračunaš za embalažo enega izdelka?", "vrsta": "znesek", "namig": "EUR"},
        {"id": "embalaza-koliko-za-2-do-4-variante-23", "q": "Koliko za 2 do 4 variante?", "vrsta": "znesek", "namig": "EUR"},
        {"id": "embalaza-koliko-za-5-ali-vec-24", "q": "Koliko za 5 ali več?", "vrsta": "znesek", "namig": "EUR"},
        {"id": "embalaza-kdo-pri-tebi-pripravi-dieline-in-ko-25", "q": "Kdo pri tebi pripravi dieline in koliko to doda?", "vrsta": "znesek", "namig": "EUR"},
      ] },
      { sklop: "Ilustracija", vprasanja: [
        {"id": "ilustracija-koliko-zaracunas-za-eno-ilustrac-26", "q": "Koliko zaračunaš za eno ilustracijo?", "vrsta": "znesek", "namig": "EUR"},
        {"id": "ilustracija-koliko-za-serijo-4-do-8-27", "q": "Koliko za serijo 4 do 8?", "vrsta": "znesek", "namig": "EUR skupaj"},
        {"id": "ilustracija-koliko-za-9-ali-vec-28", "q": "Koliko za 9 ali več?", "vrsta": "znesek", "namig": "EUR skupaj"},
        {"id": "ilustracija-se-cena-razlikuje-po-slogu-linij-29", "q": "Se cena razlikuje po slogu (linija, ploskovna, ročna, 3D)?", "vrsta": "daNe", "dopolnilo": "Koliko"},
      ] },
      { sklop: "Pravice", vprasanja: [
        {"id": "pravice-je-uporaba-licenca-locena-postavka-o-30", "q": "Je uporaba (licenca) ločena postavka od oblikovanja?", "vrsta": "daNe", "dopolnilo": "Kako"},
        {"id": "pravice-koliko-doda-uporaba-samo-na-spletu-31", "q": "Koliko doda uporaba samo na spletu?", "vrsta": "znesek", "namig": "EUR ali % od dela"},
        {"id": "pravice-koliko-doda-uporaba-v-vseh-medijih-32", "q": "Koliko doda uporaba v vseh medijih?", "vrsta": "znesek", "namig": "EUR ali % od dela"},
        {"id": "pravice-koliko-doda-izkljucnost-oziroma-odku-33", "q": "Koliko doda izključnost oziroma odkup?", "vrsta": "znesek", "namig": "EUR ali % od dela"},
        {"id": "pravice-zaracunas-vec-ce-je-narocnik-velika--34", "q": "Zaračunaš več, če je naročnik velika ali mednarodna znamka?", "vrsta": "daNe", "dopolnilo": "Koliko"},
        {"id": "pravice-za-koliko-casa-velja-osnovna-licenca-35", "q": "Za koliko časa velja osnovna licenca?", "vrsta": "izbira", "izbire": ["1 leto", "3 leta", "neomejeno"]},
      ] },
      { sklop: "Rok in odpoved", vprasanja: [
        {"id": "rok-in-odpoved-zaracunas-pribitek-za-nujno-i-36", "q": "Zaračunaš pribitek za nujno izvedbo?", "vrsta": "daNe", "dopolnilo": "Koliko %"},
        {"id": "rok-in-odpoved-zahtevas-predujem-koliko-37", "q": "Zahtevaš predujem? Koliko?", "vrsta": "znesek", "namig": "% ali EUR"},
        {"id": "rok-in-odpoved-kaj-velja-ce-narocnik-projekt-38", "q": "Kaj velja, če naročnik projekt ustavi na pol?", "vrsta": "znesek", "namig": "% cene"},
      ] },
      { sklop: "Za konec", vprasanja: [
        {"id": "za-konec-kje-se-ti-zdi-da-te-trg-najbolj-pod-39", "q": "Kje se ti zdi, da te trg najbolj podcenjuje?", "vrsta": "besedilo", "namig": "prosto"},
        {"id": "za-konec-katero-postavko-stranke-najpogostej-40", "q": "Katero postavko stranke najpogosteje spregledajo?", "vrsta": "besedilo", "namig": "prosto"},
        {"id": "za-konec-kaj-bi-moral-kalkulator-vprasati-pa-41", "q": "Kaj bi moral kalkulator vprašati, pa ga tu ni?", "vrsta": "besedilo", "namig": "prosto"},
      ] },
    ],
  },
  {
    id: "fotografija", ime: "Fotografija", imeEn: "Photography",
    uvod: "Zanimajo me tvoje prave cene za fotografiranje in obdelavo.",
    sklopi: [
      { sklop: "Kdo si", vprasanja: [
        {"id": "kdo-si-kako-dolgo-se-ukvarjas-s-fotografijo-0", "q": "Kako dolgo se ukvarjaš s fotografijo?", "vrsta": "stevilo", "namig": "let"},
        {"id": "kdo-si-kje-vecinoma-delas-1", "q": "Kje večinoma delaš?", "vrsta": "izbira", "izbire": ["Slovenija", "tujina", "oboje"]},
        {"id": "kdo-si-katere-vrste-snemanja-delas-2", "q": "Katere vrste snemanja delaš?", "vrsta": "kratko", "namig": "produkt, portret, dogodek, interier, hrana, moda, arhitektura, reportaža …"},
        {"id": "kdo-si-koliko-projektov-na-leto-priblizno-3", "q": "Koliko projektov na leto približno?", "vrsta": "stevilo", "namig": "število"},
      ] },
      { sklop: "Osnovna cena", vprasanja: [
        {"id": "osnovna-cena-koliko-zaracunas-za-pol-dneva-s-4", "q": "Koliko zaračunaš za pol dneva snemanja (do 4 ure)?", "vrsta": "znesek", "namig": "EUR brez DDV"},
        {"id": "osnovna-cena-koliko-za-cel-dan-do-8-ur-5", "q": "Koliko za cel dan (do 8 ur)?", "vrsta": "znesek", "namig": "EUR brez DDV"},
        {"id": "osnovna-cena-koliko-za-dva-dni-ali-vec-cena--6", "q": "Koliko za dva dni ali več — cena na dan?", "vrsta": "znesek", "namig": "EUR na dan"},
        {"id": "osnovna-cena-imas-najmanjse-narocilo-pod-kat-7", "q": "Imaš najmanjše naročilo, pod katerim ne greš?", "vrsta": "znesek", "namig": "EUR"},
        {"id": "osnovna-cena-kaj-je-v-osnovni-ceni-ze-vkljuc-8", "q": "Kaj je v osnovni ceni že vključeno?", "vrsta": "kratko", "namig": "priprava, oprema, pot do X km, osnovna obdelava …"},
        {"id": "osnovna-cena-zaracunavas-po-uri-po-dnevu-ali-9", "q": "Zaračunavaš po uri, po dnevu ali po projektu?", "vrsta": "kratko", "namig": "in zakaj tako"},
      ] },
      { sklop: "Vrsta snemanja", vprasanja: [
        {"id": "vrsta-snemanja-se-dnevna-cena-razlikuje-po-v-10", "q": "Se dnevna cena razlikuje po vrsti snemanja?", "vrsta": "daNe", "dopolnilo": "Koliko?"},
        {"id": "vrsta-snemanja-ce-da-katera-je-najdrazja-in--11", "q": "Če da — katera je najdražja in koliko?", "vrsta": "kratko", "namig": "npr. hrana 1,3× dražja od portreta"},
        {"id": "vrsta-snemanja-katera-je-najcenejsa-in-kolik-12", "q": "Katera je najcenejša in koliko?", "vrsta": "znesek", "namig": "EUR ali razmerje"},
      ] },
      { sklop: "Obdelava", vprasanja: [
        {"id": "obdelava-koliko-obdelanih-fotografij-je-vklj-13", "q": "Koliko obdelanih fotografij je vključenih v dnevno ceno?", "vrsta": "stevilo", "namig": "število"},
        {"id": "obdelava-koliko-zaracunas-za-20-do-50-obdela-14", "q": "Koliko zaračunaš za 20 do 50 obdelanih?", "vrsta": "znesek", "namig": "EUR skupaj ali doplačilo"},
        {"id": "obdelava-koliko-za-nad-50-15", "q": "Koliko za nad 50?", "vrsta": "znesek", "namig": "EUR skupaj ali doplačilo"},
        {"id": "obdelava-cena-ene-dodatne-fotografije-cez-do-16", "q": "Cena ene dodatne fotografije čez dogovorjeno?", "vrsta": "znesek", "namig": "EUR na kos"},
        {"id": "obdelava-locis-osnovno-obdelavo-in-zahtevnej-17", "q": "Ločiš osnovno obdelavo in zahtevnejšo retušo?", "vrsta": "daNe", "dopolnilo": "In koliko doda retuša"},
        {"id": "obdelava-koliko-doda-zahtevna-retusa-koza-se-18", "q": "Koliko doda zahtevna retuša (koža, sestavljanje, odstranjevanje)?", "vrsta": "znesek", "namig": "EUR na fotografijo ali na uro"},
        {"id": "obdelava-ali-oddas-tudi-neobdelane-posnetke--19", "q": "Ali oddaš tudi neobdelane posnetke (RAW)?", "vrsta": "daNe", "dopolnilo": "In po kakšni ceni"},
      ] },
      { sklop: "Produkcija", vprasanja: [
        {"id": "produkcija-kdaj-zaracunas-asistenta-in-kolik-20", "q": "Kdaj zaračunaš asistenta in koliko?", "vrsta": "znesek", "namig": "EUR na dan"},
        {"id": "produkcija-kdaj-zaracunas-studio-in-koliko-21", "q": "Kdaj zaračunaš studio in koliko?", "vrsta": "znesek", "namig": "EUR na dan ali uro"},
        {"id": "produkcija-kako-zaracunas-pot-22", "q": "Kako zaračunaš pot?", "vrsta": "znesek", "namig": "EUR na km / pavšal / vključeno do X km"},
        {"id": "produkcija-kako-zaracunas-dnevnico-in-prenoc-23", "q": "Kako zaračunaš dnevnico in prenočišče?", "vrsta": "znesek", "namig": "EUR"},
        {"id": "produkcija-kdaj-je-potrebna-posebna-oprema-i-24", "q": "Kdaj je potrebna posebna oprema in koliko doda?", "vrsta": "znesek", "namig": "npr. dron, tilt-shift, luči — EUR"},
        {"id": "produkcija-ali-urejas-model-stiliste-rekvizi-25", "q": "Ali urejaš model, stiliste, rekvizite? Kako to zaračunaš?", "vrsta": "znesek", "namig": "EUR ali % pribitka"},
      ] },
      { sklop: "Pravice", vprasanja: [
        {"id": "pravice-je-uporaba-licenca-locena-postavka-o-26", "q": "Je uporaba (licenca) ločena postavka od snemanja?", "vrsta": "daNe", "dopolnilo": "Na kratko kako"},
        {"id": "pravice-koliko-doda-uporaba-samo-na-spletu-i-27", "q": "Koliko doda uporaba samo na spletu in socialnih omrežjih?", "vrsta": "znesek", "namig": "EUR ali % od dela"},
        {"id": "pravice-koliko-doda-uporaba-v-vseh-medijih-t-28", "q": "Koliko doda uporaba v vseh medijih, tudi tisk in zunanje površine?", "vrsta": "znesek", "namig": "EUR ali % od dela"},
        {"id": "pravice-koliko-doda-izkljucnost-narocnik-edi-29", "q": "Koliko doda izključnost (naročnik edini uporablja posnetke)?", "vrsta": "znesek", "namig": "EUR ali % od dela"},
        {"id": "pravice-za-koliko-casa-velja-osnovna-licenca-30", "q": "Za koliko časa velja osnovna licenca?", "vrsta": "izbira", "izbire": ["1 leto", "3 leta", "neomejeno"]},
        {"id": "pravice-koliko-zaracunas-za-podaljsanje-lice-31", "q": "Koliko zaračunaš za podaljšanje licence?", "vrsta": "znesek", "namig": "EUR ali % prvotne cene"},
        {"id": "pravice-ali-zaracunas-vec-ce-je-narocnik-vel-32", "q": "Ali zaračunaš več, če je naročnik velika ali mednarodna znamka?", "vrsta": "daNe", "dopolnilo": "Koliko"},
      ] },
      { sklop: "Rok in odpoved", vprasanja: [
        {"id": "rok-in-odpoved-zaracunas-pribitek-za-nujno-i-33", "q": "Zaračunaš pribitek za nujno izvedbo?", "vrsta": "daNe", "dopolnilo": "Koliko %"},
        {"id": "rok-in-odpoved-kaj-velja-ob-odpovedi-manj-ko-34", "q": "Kaj velja ob odpovedi manj kot 48 ur prej?", "vrsta": "znesek", "namig": "% cene"},
        {"id": "rok-in-odpoved-zahtevas-predujem-koliko-35", "q": "Zahtevaš predujem? Koliko?", "vrsta": "znesek", "namig": "% ali EUR"},
      ] },
      { sklop: "Popravki", vprasanja: [
        {"id": "popravki-koliko-krogov-popravkov-obdelave-je-36", "q": "Koliko krogov popravkov obdelave je vključenih?", "vrsta": "stevilo", "namig": "število"},
        {"id": "popravki-koliko-zaracunas-za-dodatni-krog-37", "q": "Koliko zaračunaš za dodatni krog?", "vrsta": "znesek", "namig": "EUR"},
      ] },
      { sklop: "Za konec", vprasanja: [
        {"id": "za-konec-kje-se-ti-zdi-da-te-trg-najbolj-pod-38", "q": "Kje se ti zdi, da te trg najbolj podcenjuje?", "vrsta": "besedilo", "namig": "prosto"},
        {"id": "za-konec-katero-postavko-stranke-najpogostej-39", "q": "Katero postavko stranke najpogosteje spregledajo?", "vrsta": "besedilo", "namig": "prosto"},
        {"id": "za-konec-kaj-bi-moral-kalkulator-vprasati-pa-40", "q": "Kaj bi moral kalkulator vprašati, pa ga tu ni?", "vrsta": "besedilo", "namig": "prosto"},
      ] },
    ],
  },
  {
    id: "3d", ime: "3D in vizualizacije", imeEn: "3D and visualisation",
    uvod: "Zanimajo me tvoje prave cene za modeliranje, renderje in animacijo.",
    sklopi: [
      { sklop: "Kdo si", vprasanja: [
        {"id": "kdo-si-koliko-let-se-ukvarjas-s-3d-0", "q": "Koliko let se ukvarjaš s 3D?", "vrsta": "stevilo", "namig": "let"},
        {"id": "kdo-si-kaj-delas-najvec-1", "q": "Kaj delaš največ?", "vrsta": "kratko", "namig": "produktni render, arhitektura, animacija, liki, vizualizacija …"},
        {"id": "kdo-si-v-cem-delas-2", "q": "V čem delaš?", "vrsta": "kratko", "namig": "Blender, C4D, 3ds Max, Houdini …"},
        {"id": "kdo-si-koliko-projektov-na-leto-3", "q": "Koliko projektov na leto?", "vrsta": "stevilo", "namig": "število"},
      ] },
      { sklop: "Renderji", vprasanja: [
        {"id": "renderji-koliko-zaracunas-za-en-render-izdel-4", "q": "Koliko zaračunaš za en render izdelka?", "vrsta": "znesek", "namig": "EUR brez DDV"},
        {"id": "renderji-koliko-za-4-do-8-pogledov-istega-mo-5", "q": "Koliko za 4 do 8 pogledov istega modela?", "vrsta": "znesek", "namig": "EUR skupaj"},
        {"id": "renderji-koliko-za-nad-8-pogledov-6", "q": "Koliko za nad 8 pogledov?", "vrsta": "znesek", "namig": "EUR skupaj"},
        {"id": "renderji-koliko-stane-dodaten-pogled-cez-dog-7", "q": "Koliko stane dodaten pogled čez dogovorjeno?", "vrsta": "znesek", "namig": "EUR na kos"},
        {"id": "renderji-kaj-je-v-ceni-vkljuceno-8", "q": "Kaj je v ceni vključeno?", "vrsta": "kratko", "namig": "model, materiali, luči, postprodukcija …"},
      ] },
      { sklop: "Model", vprasanja: [
        {"id": "model-koliko-zaracunas-za-modeliranje-prepro-9", "q": "Koliko zaračunaš za modeliranje preprostega izdelka?", "vrsta": "znesek", "namig": "EUR"},
        {"id": "model-koliko-za-zahtevnega-mehanika-organske-10", "q": "Koliko za zahtevnega (mehanika, organske oblike, veliko delov)?", "vrsta": "znesek", "namig": "EUR"},
        {"id": "model-koliko-manj-ce-narocnik-da-svoj-cad-al-11", "q": "Koliko manj, če naročnik da svoj CAD ali model?", "vrsta": "znesek", "namig": "% ali EUR"},
        {"id": "model-koliko-doda-teksturiranje-in-materiali-12", "q": "Koliko doda teksturiranje in materiali, če jih šteješ posebej?", "vrsta": "znesek", "namig": "EUR"},
        {"id": "model-koliko-doda-scena-oziroma-okolje-okoli-13", "q": "Koliko doda scena oziroma okolje okoli izdelka?", "vrsta": "znesek", "namig": "EUR"},
      ] },
      { sklop: "Animacija", vprasanja: [
        {"id": "animacija-koliko-zaracunas-za-10-sekund-anim-14", "q": "Koliko zaračunaš za 10 sekund animacije?", "vrsta": "znesek", "namig": "EUR"},
        {"id": "animacija-koliko-za-30-sekund-15", "q": "Koliko za 30 sekund?", "vrsta": "znesek", "namig": "EUR"},
        {"id": "animacija-koliko-za-nad-minuto-16", "q": "Koliko za nad minuto?", "vrsta": "znesek", "namig": "EUR"},
        {"id": "animacija-kako-zaracunas-animacijo-na-sekund-17", "q": "Kako zaračunaš animacijo — na sekundo, na kader ali na projekt?", "vrsta": "kratko", "namig": "in zakaj tako"},
        {"id": "animacija-koliko-doda-simulacija-tekocine-tk-18", "q": "Koliko doda simulacija (tekočine, tkanina, delci)?", "vrsta": "znesek", "namig": "EUR"},
        {"id": "animacija-koliko-doda-rigging-in-animacija-l-19", "q": "Koliko doda rigging in animacija lika?", "vrsta": "znesek", "namig": "EUR"},
      ] },
      { sklop: "Izris", vprasanja: [
        {"id": "izris-ali-zaracunas-cas-izrisa-render-farm-e-20", "q": "Ali zaračunaš čas izrisa (render farm, elektrika, strojni čas)?", "vrsta": "daNe", "dopolnilo": "Koliko"},
        {"id": "izris-koliko-doda-4k-ali-vecja-locljivost-21", "q": "Koliko doda 4K ali večja ločljivost?", "vrsta": "znesek", "namig": "% ali EUR"},
        {"id": "izris-koliko-doda-postprodukcija-kompozit-ba-22", "q": "Koliko doda postprodukcija (kompozit, barvna obdelava)?", "vrsta": "znesek", "namig": "EUR ali %"},
      ] },
      { sklop: "Popravki", vprasanja: [
        {"id": "popravki-koliko-krogov-popravkov-je-vkljucen-23", "q": "Koliko krogov popravkov je vključenih?", "vrsta": "stevilo", "namig": "število"},
        {"id": "popravki-koliko-zaracunas-za-dodatni-krog-24", "q": "Koliko zaračunaš za dodatni krog?", "vrsta": "znesek", "namig": "EUR"},
        {"id": "popravki-kaj-velja-ce-narocnik-zahteva-sprem-25", "q": "Kaj velja, če naročnik zahteva spremembo modela po odobritvi?", "vrsta": "znesek", "namig": "EUR ali %"},
      ] },
      { sklop: "Pravice", vprasanja: [
        {"id": "pravice-je-uporaba-licenca-locena-postavka-26", "q": "Je uporaba (licenca) ločena postavka?", "vrsta": "daNe", "dopolnilo": "Kako"},
        {"id": "pravice-koliko-doda-uporaba-samo-na-spletu-27", "q": "Koliko doda uporaba samo na spletu?", "vrsta": "znesek", "namig": "EUR ali % od dela"},
        {"id": "pravice-koliko-doda-uporaba-v-vseh-medijih-t-28", "q": "Koliko doda uporaba v vseh medijih, tudi oglaševanje?", "vrsta": "znesek", "namig": "EUR ali % od dela"},
        {"id": "pravice-ali-oddas-izvorne-datoteke-scena-mod-29", "q": "Ali oddaš izvorne datoteke (scena, model)? Po kakšni ceni?", "vrsta": "daNe", "dopolnilo": "EUR"},
        {"id": "pravice-zaracunas-vec-ce-je-narocnik-velika--30", "q": "Zaračunaš več, če je naročnik velika ali mednarodna znamka?", "vrsta": "daNe", "dopolnilo": "Koliko"},
      ] },
      { sklop: "Rok in odpoved", vprasanja: [
        {"id": "rok-in-odpoved-zaracunas-pribitek-za-nujno-i-31", "q": "Zaračunaš pribitek za nujno izvedbo?", "vrsta": "daNe", "dopolnilo": "Koliko %"},
        {"id": "rok-in-odpoved-zahtevas-predujem-koliko-32", "q": "Zahtevaš predujem? Koliko?", "vrsta": "znesek", "namig": "% ali EUR"},
      ] },
      { sklop: "Za konec", vprasanja: [
        {"id": "za-konec-kje-se-ti-zdi-da-te-trg-najbolj-pod-33", "q": "Kje se ti zdi, da te trg najbolj podcenjuje?", "vrsta": "besedilo", "namig": "prosto"},
        {"id": "za-konec-katero-postavko-stranke-najpogostej-34", "q": "Katero postavko stranke najpogosteje spregledajo?", "vrsta": "besedilo", "namig": "prosto"},
        {"id": "za-konec-kaj-bi-moral-kalkulator-vprasati-pa-35", "q": "Kaj bi moral kalkulator vprašati, pa ga tu ni?", "vrsta": "besedilo", "namig": "prosto"},
      ] },
    ],
  },
  {
    id: "interier", ime: "Interier dizajn", imeEn: "Interior design",
    uvod: "Zanimajo me tvoje prave cene za idejne zasnove in vodenje projektov.",
    sklopi: [
      { sklop: "Kdo si", vprasanja: [
        {"id": "kdo-si-koliko-let-se-ukvarjas-z-notranjim-ob-0", "q": "Koliko let se ukvarjaš z notranjim oblikovanjem?", "vrsta": "stevilo", "namig": "let"},
        {"id": "kdo-si-kaj-delas-najvec-1", "q": "Kaj delaš največ?", "vrsta": "kratko", "namig": "stanovanja, hiše, lokali, pisarne, hoteli …"},
        {"id": "kdo-si-koliko-projektov-na-leto-2", "q": "Koliko projektov na leto?", "vrsta": "stevilo", "namig": "število"},
      ] },
      { sklop: "Kako računaš", vprasanja: [
        {"id": "kako-racunas-racunas-na-kvadratni-meter-na-p-3", "q": "Računaš na kvadratni meter, na projekt, na uro ali kot odstotek investicije?", "vrsta": "kratko", "namig": "in zakaj tako"},
        {"id": "kako-racunas-ce-na-m-koliko-za-idejno-zasnov-4", "q": "Če na m² — koliko za idejno zasnovo?", "vrsta": "znesek", "namig": "EUR/m²"},
        {"id": "kako-racunas-ce-na-uro-kaksna-je-tvoja-urna--5", "q": "Če na uro — kakšna je tvoja urna postavka?", "vrsta": "znesek", "namig": "EUR/uro"},
        {"id": "kako-racunas-imas-najmanjse-narocilo-6", "q": "Imaš najmanjše naročilo?", "vrsta": "znesek", "namig": "EUR"},
        {"id": "kako-racunas-se-cena-na-m-spreminja-z-veliko-7", "q": "Se cena na m² spreminja z velikostjo prostora?", "vrsta": "daNe", "dopolnilo": "Kako"},
      ] },
      { sklop: "Obseg", vprasanja: [
        {"id": "obseg-koliko-zaracunas-samo-za-idejno-zasnov-8", "q": "Koliko zaračunaš samo za idejno zasnovo?", "vrsta": "znesek", "namig": "EUR ali EUR/m²"},
        {"id": "obseg-koliko-za-zasnovo-z-izvedbenimi-nacrti-9", "q": "Koliko za zasnovo z izvedbenimi načrti?", "vrsta": "znesek", "namig": "EUR ali EUR/m²"},
        {"id": "obseg-koliko-doda-vodenje-izvedbe-in-nadzor--10", "q": "Koliko doda vodenje izvedbe in nadzor na gradbišču?", "vrsta": "znesek", "namig": "EUR, % ali EUR/obisk"},
        {"id": "obseg-koliko-doda-izbor-in-nabava-opreme-11", "q": "Koliko doda izbor in nabava opreme?", "vrsta": "znesek", "namig": "EUR ali % vrednosti opreme"},
        {"id": "obseg-koliko-doda-oblikovanje-pohistva-po-me-12", "q": "Koliko doda oblikovanje pohištva po meri?", "vrsta": "znesek", "namig": "EUR na kos ali skupaj"},
      ] },
      { sklop: "Prostori", vprasanja: [
        {"id": "prostori-koliko-zaracunas-za-eno-sobo-ozirom-13", "q": "Koliko zaračunaš za eno sobo oziroma en prostor?", "vrsta": "znesek", "namig": "EUR"},
        {"id": "prostori-koliko-za-celotno-stanovanje-do-60--14", "q": "Koliko za celotno stanovanje do 60 m²?", "vrsta": "znesek", "namig": "EUR"},
        {"id": "prostori-koliko-za-60-do-120-m-15", "q": "Koliko za 60 do 120 m²?", "vrsta": "znesek", "namig": "EUR"},
        {"id": "prostori-koliko-za-nad-120-m-16", "q": "Koliko za nad 120 m²?", "vrsta": "znesek", "namig": "EUR"},
        {"id": "prostori-je-kuhinja-ali-kopalnica-drazja-od--17", "q": "Je kuhinja ali kopalnica dražja od dnevne sobe? Koliko?", "vrsta": "daNe", "dopolnilo": "Koliko"},
        {"id": "prostori-se-cena-razlikuje-med-stanovanjskim-18", "q": "Se cena razlikuje med stanovanjskim in poslovnim prostorom?", "vrsta": "daNe", "dopolnilo": "Koliko"},
      ] },
      { sklop: "Vizualizacije", vprasanja: [
        {"id": "vizualizacije-so-3d-vizualizacije-vkljucene--19", "q": "So 3D vizualizacije vključene ali posebej?", "vrsta": "izbira", "izbire": ["vključene", "posebej"]},
        {"id": "vizualizacije-koliko-zaracunas-za-eno-vizual-20", "q": "Koliko zaračunaš za eno vizualizacijo?", "vrsta": "znesek", "namig": "EUR"},
        {"id": "vizualizacije-koliko-jih-je-vkljucenih-v-osn-21", "q": "Koliko jih je vključenih v osnovno ceno?", "vrsta": "stevilo", "namig": "število"},
      ] },
      { sklop: "Popravki", vprasanja: [
        {"id": "popravki-koliko-krogov-popravkov-je-vkljucen-22", "q": "Koliko krogov popravkov je vključenih?", "vrsta": "stevilo", "namig": "število"},
        {"id": "popravki-koliko-zaracunas-za-dodatni-krog-23", "q": "Koliko zaračunaš za dodatni krog?", "vrsta": "znesek", "namig": "EUR"},
        {"id": "popravki-kaj-velja-ce-narocnik-po-odobritvi--24", "q": "Kaj velja, če naročnik po odobritvi spremeni zasnovo?", "vrsta": "znesek", "namig": "EUR ali %"},
      ] },
      { sklop: "Stroški", vprasanja: [
        {"id": "stroski-kako-zaracunas-pot-in-obiske-na-loka-25", "q": "Kako zaračunaš pot in obiske na lokaciji?", "vrsta": "znesek", "namig": "EUR/km, pavšal ali vključeno"},
        {"id": "stroski-koliko-obiskov-je-vkljucenih-26", "q": "Koliko obiskov je vključenih?", "vrsta": "stevilo", "namig": "število"},
        {"id": "stroski-zaracunas-merjenje-in-posnetek-obsto-27", "q": "Zaračunaš merjenje in posnetek obstoječega stanja?", "vrsta": "daNe", "dopolnilo": "EUR"},
      ] },
      { sklop: "Pravice", vprasanja: [
        {"id": "pravice-kdo-ima-pravice-do-nacrtov-in-vizual-28", "q": "Kdo ima pravice do načrtov in vizualizacij?", "vrsta": "besedilo", "namig": "prosto"},
        {"id": "pravice-zaracunas-objavo-projekta-v-medijih--29", "q": "Zaračunaš objavo projekta v medijih ali njegovo ponovno uporabo?", "vrsta": "daNe", "dopolnilo": "Koliko"},
      ] },
      { sklop: "Rok in odpoved", vprasanja: [
        {"id": "rok-in-odpoved-zaracunas-pribitek-za-nujno-i-30", "q": "Zaračunaš pribitek za nujno izvedbo?", "vrsta": "daNe", "dopolnilo": "Koliko %"},
        {"id": "rok-in-odpoved-zahtevas-predujem-koliko-31", "q": "Zahtevaš predujem? Koliko?", "vrsta": "znesek", "namig": "% ali EUR"},
        {"id": "rok-in-odpoved-kaj-velja-ce-narocnik-projekt-32", "q": "Kaj velja, če naročnik projekt ustavi na pol?", "vrsta": "znesek", "namig": "% cene"},
      ] },
      { sklop: "Za konec", vprasanja: [
        {"id": "za-konec-kje-se-ti-zdi-da-te-trg-najbolj-pod-33", "q": "Kje se ti zdi, da te trg najbolj podcenjuje?", "vrsta": "besedilo", "namig": "prosto"},
        {"id": "za-konec-katero-postavko-stranke-najpogostej-34", "q": "Katero postavko stranke najpogosteje spregledajo?", "vrsta": "besedilo", "namig": "prosto"},
        {"id": "za-konec-kaj-bi-moral-kalkulator-vprasati-pa-35", "q": "Kaj bi moral kalkulator vprašati, pa ga tu ni?", "vrsta": "besedilo", "namig": "prosto"},
      ] },
    ],
  },
  {
    id: "arhitektura", ime: "Arhitektura", imeEn: "Architecture",
    uvod: "Zanimajo me tvoje prave cene po fazah projekta.",
    sklopi: [
      { sklop: "Kdo si", vprasanja: [
        {"id": "kdo-si-koliko-let-se-ukvarjas-z-arhitekturo-0", "q": "Koliko let se ukvarjaš z arhitekturo?", "vrsta": "stevilo", "namig": "let"},
        {"id": "kdo-si-kaj-projektiras-najvec-1", "q": "Kaj projektiraš največ?", "vrsta": "kratko", "namig": "stanovanjske hiše, večstanovanjske, poslovne, javne, prenove …"},
        {"id": "kdo-si-imas-pooblastilo-zaps-2", "q": "Imaš pooblastilo ZAPS?", "vrsta": "daNe", "dopolnilo": "Koliko?"},
        {"id": "kdo-si-koliko-projektov-na-leto-3", "q": "Koliko projektov na leto?", "vrsta": "stevilo", "namig": "število"},
      ] },
      { sklop: "Kako računaš", vprasanja: [
        {"id": "kako-racunas-racunas-po-odstotku-investicije-4", "q": "Računaš po odstotku investicije, na m², na projekt ali po točkovniku?", "vrsta": "kratko", "namig": "in zakaj tako"},
        {"id": "kako-racunas-ce-po-odstotku-koliksen-je-pri--5", "q": "Če po odstotku — kolikšen je pri manjši hiši?", "vrsta": "znesek", "namig": "%"},
        {"id": "kako-racunas-in-pri-vecjem-objektu-6", "q": "In pri večjem objektu?", "vrsta": "znesek", "namig": "%"},
        {"id": "kako-racunas-ce-na-m-koliko-za-idejno-zasnov-7", "q": "Če na m² — koliko za idejno zasnovo?", "vrsta": "znesek", "namig": "EUR/m²"},
        {"id": "kako-racunas-kaksna-je-tvoja-urna-postavka-z-8", "q": "Kakšna je tvoja urna postavka za dodatno delo?", "vrsta": "znesek", "namig": "EUR/uro"},
        {"id": "kako-racunas-imas-najmanjse-narocilo-9", "q": "Imaš najmanjše naročilo?", "vrsta": "znesek", "namig": "EUR"},
      ] },
      { sklop: "Faze", vprasanja: [
        {"id": "faze-koliko-od-celotne-cene-odpade-na-idejno-10", "q": "Koliko od celotne cene odpade na idejno zasnovo (IDZ)?", "vrsta": "znesek", "namig": "% ali EUR"},
        {"id": "faze-koliko-na-idejni-projekt-idp-11", "q": "Koliko na idejni projekt (IDP)?", "vrsta": "znesek", "namig": "% ali EUR"},
        {"id": "faze-koliko-na-projekt-za-gradbeno-dovoljenj-12", "q": "Koliko na projekt za gradbeno dovoljenje (DGD)?", "vrsta": "znesek", "namig": "% ali EUR"},
        {"id": "faze-koliko-na-projekt-za-izvedbo-pzi-13", "q": "Koliko na projekt za izvedbo (PZI)?", "vrsta": "znesek", "namig": "% ali EUR"},
        {"id": "faze-koliko-na-projekt-izvedenih-del-pid-14", "q": "Koliko na projekt izvedenih del (PID)?", "vrsta": "znesek", "namig": "% ali EUR"},
        {"id": "faze-katera-faza-je-pri-tebi-najbolj-podcenj-15", "q": "Katera faza je pri tebi najbolj podcenjena?", "vrsta": "besedilo", "namig": "prosto"},
      ] },
      { sklop: "Nadzor", vprasanja: [
        {"id": "nadzor-zaracunas-projektantski-nadzor-koliko-16", "q": "Zaračunaš projektantski nadzor? Koliko?", "vrsta": "znesek", "namig": "EUR, % ali EUR/obisk"},
        {"id": "nadzor-koliko-obiskov-je-vkljucenih-17", "q": "Koliko obiskov je vključenih?", "vrsta": "stevilo", "namig": "število"},
        {"id": "nadzor-zaracunas-usklajevanje-z-drugimi-proj-18", "q": "Zaračunaš usklajevanje z drugimi projektanti (stroj., elektro, statika)?", "vrsta": "daNe", "dopolnilo": "Koliko"},
      ] },
      { sklop: "Obseg", vprasanja: [
        {"id": "obseg-koliko-doda-prenova-v-primerjavi-z-nov-19", "q": "Koliko doda prenova v primerjavi z novogradnjo?", "vrsta": "znesek", "namig": "% ali EUR"},
        {"id": "obseg-koliko-doda-spomenisko-varstvo-ali-var-20", "q": "Koliko doda spomeniško varstvo ali varovano območje?", "vrsta": "znesek", "namig": "% ali EUR"},
        {"id": "obseg-koliko-doda-zahtevna-lokacija-teren-do-21", "q": "Koliko doda zahtevna lokacija (teren, dostop, omejitve)?", "vrsta": "znesek", "namig": "% ali EUR"},
        {"id": "obseg-koliko-doda-notranja-oprema-ce-jo-dela-22", "q": "Koliko doda notranja oprema, če jo delaš?", "vrsta": "znesek", "namig": "% ali EUR"},
      ] },
      { sklop: "Vizualizacije", vprasanja: [
        {"id": "vizualizacije-so-3d-vizualizacije-vkljucene--23", "q": "So 3D vizualizacije vključene ali posebej?", "vrsta": "izbira", "izbire": ["vključene", "posebej"]},
        {"id": "vizualizacije-koliko-zaracunas-za-eno-vizual-24", "q": "Koliko zaračunaš za eno vizualizacijo?", "vrsta": "znesek", "namig": "EUR"},
        {"id": "vizualizacije-zaracunas-maketo-koliko-25", "q": "Zaračunaš maketo? Koliko?", "vrsta": "znesek", "namig": "EUR"},
      ] },
      { sklop: "Popravki", vprasanja: [
        {"id": "popravki-koliko-variant-zasnove-je-vkljuceni-26", "q": "Koliko variant zasnove je vključenih?", "vrsta": "stevilo", "namig": "število"},
        {"id": "popravki-koliko-zaracunas-za-dodatno-variant-27", "q": "Koliko zaračunaš za dodatno varianto?", "vrsta": "znesek", "namig": "EUR ali %"},
        {"id": "popravki-kaj-velja-ce-narocnik-po-oddaji-dgd-28", "q": "Kaj velja, če naročnik po oddaji DGD spremeni zasnovo?", "vrsta": "znesek", "namig": "EUR ali %"},
      ] },
      { sklop: "Stroški", vprasanja: [
        {"id": "stroski-kako-zaracunas-pot-in-obiske-na-loka-29", "q": "Kako zaračunaš pot in obiske na lokaciji?", "vrsta": "znesek", "namig": "EUR/km, pavšal ali vključeno"},
        {"id": "stroski-zaracunas-geodetski-posnetek-in-sogl-30", "q": "Zaračunaš geodetski posnetek in soglasja posebej?", "vrsta": "daNe", "dopolnilo": "Kako"},
        {"id": "stroski-kdo-krije-upravne-takse-31", "q": "Kdo krije upravne takse?", "vrsta": "besedilo", "namig": "prosto"},
      ] },
      { sklop: "Pravice", vprasanja: [
        {"id": "pravice-kdo-ima-avtorske-pravice-do-projekta-32", "q": "Kdo ima avtorske pravice do projekta?", "vrsta": "besedilo", "namig": "prosto"},
        {"id": "pravice-zaracunas-ponovno-uporabo-projekta-t-33", "q": "Zaračunaš ponovno uporabo projekta (tipska hiša, druga lokacija)?", "vrsta": "daNe", "dopolnilo": "Koliko"},
        {"id": "pravice-zaracunas-objavo-projekta-v-medijih-34", "q": "Zaračunaš objavo projekta v medijih?", "vrsta": "daNe", "dopolnilo": "Koliko"},
      ] },
      { sklop: "Rok in odpoved", vprasanja: [
        {"id": "rok-in-odpoved-zaracunas-pribitek-za-nujno-i-35", "q": "Zaračunaš pribitek za nujno izvedbo?", "vrsta": "daNe", "dopolnilo": "Koliko %"},
        {"id": "rok-in-odpoved-zahtevas-predujem-koliko-36", "q": "Zahtevaš predujem? Koliko?", "vrsta": "znesek", "namig": "% ali EUR"},
        {"id": "rok-in-odpoved-kako-je-razdeljeno-placilo-po-37", "q": "Kako je razdeljeno plačilo po fazah?", "vrsta": "besedilo", "namig": "prosto"},
      ] },
      { sklop: "Za konec", vprasanja: [
        {"id": "za-konec-kje-se-ti-zdi-da-te-trg-najbolj-pod-38", "q": "Kje se ti zdi, da te trg najbolj podcenjuje?", "vrsta": "besedilo", "namig": "prosto"},
        {"id": "za-konec-katero-postavko-stranke-najpogostej-39", "q": "Katero postavko stranke najpogosteje spregledajo?", "vrsta": "besedilo", "namig": "prosto"},
        {"id": "za-konec-kaj-bi-moral-kalkulator-vprasati-pa-40", "q": "Kaj bi moral kalkulator vprašati, pa ga tu ni?", "vrsta": "besedilo", "namig": "prosto"},
      ] },
    ],
  },
];

export const panogaZa = (id: string): Panoga | null => PANOGE.find(p => p.id === id) || null;

export const steviloVprasanj = (p: Panoga): number =>
  p.sklopi.reduce((a, s) => a + s.vprasanja.length, 0);
