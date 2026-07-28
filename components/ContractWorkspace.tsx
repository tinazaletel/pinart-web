'use client';

/* POGODBE — prezidano na vzorec RetainerWorkspace (view-swap: nastavitve ->
   dokument -> zakljucek). Urejevalnik, orodjarna, podpis in PDF so KOPIJE
   delujocih vzorcev iz RetainerWorkspace, samo vsebina je pogodbena.
   Vsi novi razredi imajo predpono pg-, da ne trcijo s splosnimi pravili
   pregled.module.css (.shell ima agresivna pravila za input/select/button). */

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { CaretDown, CaretUp, Eye, Paperclip, PencilSimple, PenNib, TextAa, TextB, TextItalic, X, FloppyDisk, FilePdf } from '@phosphor-icons/react';
import styles from '@/app/[locale]/kalkulator/pregled/pregled.module.css';
import { loadFlowData, saveFlowCollection, type FlowClient, type FlowContract } from '@/lib/pinartFlowStore';
import { getBusinessDocumentUrl, uploadBusinessDocument } from '@/lib/pinartFlowCloud';
import { podatkiZaPredogled, usePredogled } from '@/lib/predogled';
import { dokCss, dokFontLink, dokVars, DOK_BARVA_PRIVZETA, DOK_FONT_PRIVZETI, aktivnaPredloga, aktivniLogo } from '@/lib/dokVidez';
import PosljiBlok from '@/components/PosljiBlok';
import { posljiMail } from '@/lib/posta';

const K_NAST = 'pinart-kalkulator-v2';
const K_ODVETNIK = 'pinart-odvetnik-email';
const jeVeljavenEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());

type Offer = { id: string; title: string; client: string; scope: string[]; number?: string; status: string; agreedAmount: number; date: string };
type Ponudnik = { ime: string; davcna: string; email: string; telefon: string; naslov: string; trr: string };

const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));
const eur = (n: number) => Math.round(n).toLocaleString('sl-SI') + ' €';
const datStr = (d: Date) => `${d.getDate()}. ${d.getMonth() + 1}. ${d.getFullYear()}`;

/* vrste pogodb (skupina A): navadna pogodba o sodelovanju + 5 dodatnih.
   naziv = naslov v dokumentu (h1), slug = predpona imena datoteke, kick = eyebrow (velike crke). */
type VrstaPog = 'sodelovanje' | 'podjemna' | 'avtorska' | 'licencna' | 'nda' | 'dpa';
const VRSTE_POG: { id: VrstaPog; label: string; naziv: string; slug: string; kick: string }[] = [
  { id: 'sodelovanje', label: 'Sodelovanje', naziv: 'Pogodba o poslovnem sodelovanju', slug: 'pogodba', kick: 'POGODBA' },
  { id: 'podjemna', label: 'Podjemna', naziv: 'Podjemna pogodba', slug: 'podjemna', kick: 'PODJEMNA POGODBA' },
  { id: 'avtorska', label: 'Avtorska', naziv: 'Avtorska pogodba', slug: 'avtorska', kick: 'AVTORSKA POGODBA' },
  { id: 'licencna', label: 'Licenčna', naziv: 'Licenčna pogodba', slug: 'licencna', kick: 'LICENČNA POGODBA' },
  { id: 'nda', label: 'NDA', naziv: 'Sporazum o varovanju zaupnih podatkov (NDA)', slug: 'nda', kick: 'NDA' },
  { id: 'dpa', label: 'DPA', naziv: 'Pogodba o obdelavi osebnih podatkov (DPA)', slug: 'dpa', kick: 'DPA' },
];

/* posamezen clen dokumenta; opcijski cleni se dajo vklopiti/izklopiti, stevilcenje se prilagodi samo */
type Clen = { id: string; naslov: string; telo: string; opcijski?: boolean };
/* opcijski cleni, ki so ob preklopu na vrsto PRIVZETO IZKLOPLJENI */
const PRIVZETO_IZKLOP: Record<VrstaPog, string[]> = {
  sodelovanje: ['sod-konkurenca', 'sod-kazen'],
  podjemna: ['pod-kazen'],
  avtorska: ['avt-tantieme'],
  licencna: ['lic-podlicence', 'lic-porocanje'],
  nda: [],
  dpa: ['dpa-prenos'],
};
const privzetoIzklop = (v: VrstaPog) => new Set<string>(PRIVZETO_IZKLOP[v]);

export default function ContractWorkspace({ base }: { base: string }) {
  /* pod 640px orodjarna postane slide-up predal (kot retainer) */
  const [jeMobilni, setJeMobilni] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 640px)');
    const upd = () => setJeMobilni(mq.matches);
    upd(); mq.addEventListener('change', upd);
    return () => mq.removeEventListener('change', upd);
  }, []);

  /* Demo/Prazno velja za VSE strani (lib/predogled.ts). V teh nacinih je
     urejanje onemogoceno — sicer bi popravek izmisljenega zapisa pisal v pravo bazo. */
  const [nacin] = usePredogled();
  const samoOgled = nacin !== 'mine';

  const [offers, setOffers] = useState<Offer[]>([]);
  const [contracts, setContracts] = useState<FlowContract[]>([]);
  const [clients, setClients] = useState<FlowClient[]>([]);
  const [ponudnik, setPonudnik] = useState<Ponudnik>({ ime: '', davcna: '', email: '', telefon: '', naslov: '', trr: '' });
  const [predklic, setPredklic] = useState('+386');
  const [dokBarva, setDokBarva] = useState(DOK_BARVA_PRIVZETA);
  const [dokFont, setDokFont] = useState(DOK_FONT_PRIVZETI);

  /* pogled = katera "stran" je prikazana — ENAKO kot retainer (vprasanja -> ponudba -> zakljucek).
     nastavitve: vir + izbirnik + arhiv; dokument: SAMO oblikovan dokument; zakljucek: prenos + posiljanje. */
  const [pogled, setPogled] = useState<'nastavitve' | 'dokument' | 'zakljucek'>('nastavitve');
  /* vrsta dokumenta: navadna pogodba o sodelovanju ali NDA (sporazum o varovanju zaupnih podatkov).
     Privzeto 'sodelovanje' = obstojece obnasanje nespremenjeno. */
  const [vrstaPog, setVrstaPog] = useState<VrstaPog>('sodelovanje');
  /* izklopljeni opcijski cleni (po id) za trenutno vrsto; ob menjavi vrste se ponastavi na privzeto */
  const [izklKlavzule, setIzklKlavzule] = useState<Set<string>>(() => privzetoIzklop('sodelovanje'));
  const [offerId, setOfferId] = useState('');
  /* pot "Od stranke" (naloz. dokument) je locena od ustvarjanja — vklopi se s povezavo, ne s pilulo */
  const [odStranke, setOdStranke] = useState(false);
  const [datum, setDatum] = useState(() => new Date().toISOString().slice(0, 10));
  const [rocniNarocnik, setRocniNarocnik] = useState('');
  const [rocniObseg, setRocniObseg] = useState('');
  const [narEmail, setNarEmail] = useState('');
  const [kartaOdprta, setKartaOdprta] = useState(false);
  /* iskalen combobox za izbiro ponudbe na vstopu — enak vzorec kot InvoiceWorkspace:
     privzeto "Brez ponudbe" + zadnjih 10 ponudb, ob tipkanju filtrira VSE po naslovu/stranki/stevilki */
  const [vstopOdprt, setVstopOdprt] = useState(false);
  const [vstopIskanje, setVstopIskanje] = useState('');
  const vstopComboRef = useRef<HTMLDivElement | null>(null);
  /* VIR se IZPELJE iz izbire (ni vec locenih pilul): nalozeno od stranke -> 'stranka';
     sicer izbrana ponudba (offerId) -> 'ponudba', prazno ("Brez ponudbe") -> 'rocno' (samostojna pogodba) */
  const vir: 'ponudba' | 'rocno' | 'stranka' = odStranke ? 'stranka' : (offerId ? 'ponudba' : 'rocno');

  const [notice, setNotice] = useState('');
  const [napaka, setNapaka] = useState('');
  const [pdfNalaganje, setPdfNalaganje] = useState(false);
  /* id zadnje shranjene pogodbe — ponovni "Shrani" posodobi zapis, ne podvoji */
  const [shranjenaId, setShranjenaId] = useState('');
  /* priponka (dodatna priloga k pogodbi — npr. PDF specifikacije, slika, dodatek).
     priponkaFile = izbrana, a se ne naložena datoteka (naloži se šele ob shrani(), ko je znan id zapisa);
     priponkaIme/priponkaPot = zadnje shranjeno stanje (ime za prikaz, pot za povezavo). */
  const [priponkaFile, setPriponkaFile] = useState<File | null>(null);
  const [priponkaIme, setPriponkaIme] = useState('');
  const [priponkaPot, setPriponkaPot] = useState('');
  const priponkaRef = useRef<HTMLInputElement | null>(null);

  /* urejevalnik telesa dokumenta (kopija retainerjevega vzorca) */
  const [predogledMode, setPredogledMode] = useState(false);
  const [ponSheet, setPonSheet] = useState<null | 'oblika' | 'podpis'>(null);
  const [podpisCilj, setPodpisCilj] = useState<'izvajalec' | 'narocnik'>('izvajalec');
  const [narisano, setNarisano] = useState(false);
  const podpisPlatnoRef = useRef<HTMLCanvasElement | null>(null);
  const podpisDatotekaRef = useRef<HTMLInputElement | null>(null);
  const risanjeRef = useRef(false);
  const [oznaciNamig, setOznaciNamig] = useState(false);
  const [velikostBesedila, setVelikostBesedila] = useState(3);
  const [rocnoTelo, setRocnoTelo] = useState(false);
  const [teloHtml, setTeloHtml] = useState('');
  /* letterhead (glava z logotipom) tudi V UREDITELJU — izracunano po mountu (bere localStorage),
     da ni hidracijske neujemljivosti; osvezi se ob spremembi ponudnika/predloge/naslova/datuma */
  const [glavaHtml, setGlavaHtml] = useState('');
  const [nogaHtml, setNogaHtml] = useState('');
  /* konfeti na Zakljucku (kot pri ponudbi) — povecanje kljuca znova sprozi animacijo */
  const [konfetiKljuc, setKonfetiKljuc] = useState(0);
  const proslaviKonfeti = () => setKonfetiKljuc(k => k + 1);
  const editorRef = useRef<HTMLDivElement | null>(null);
  const barvaRef = useRef<HTMLInputElement>(null);
  const [predStrani, setPredStrani] = useState<string[]>([]);
  const [predNal, setPredNal] = useState(false);
  /* shranjen naslov odvetnika (localStorage), stanje pošiljanja odvetniku v pregled/podpis */
  const [odvetnikEmail, setOdvetnikEmail] = useState('');
  const [odvStatus, setOdvStatus] = useState<'' | 'poslji' | 'ok' | 'napaka'>('');
  const [odvPoslano, setOdvPoslano] = useState(false);
  const [odvNapaka, setOdvNapaka] = useState('');

  useEffect(() => {
    const flow = podatkiZaPredogled(nacin, loadFlowData());
    setOffers(flow.offers.map(({ id, title, client, number, status, scope, agreedAmount, date }) => ({ id, title, client, number, status, scope, agreedAmount, date })));
    setContracts(flow.contracts);
    setClients(flow.clients);
    try {
      const s = JSON.parse(localStorage.getItem(K_NAST) || '{}');
      if (s.ponudnik) setPonudnik({ trr: '', ...s.ponudnik });
      if (s.predklic) setPredklic(s.predklic);
      if (s.dokBarva) setDokBarva(s.dokBarva);
      if (s.dokFont) setDokFont(s.dokFont);
    } catch { /* prazno */ }
    try {
      const o = localStorage.getItem(K_ODVETNIK);
      if (o) setOdvetnikEmail(o);
    } catch { /* prazno */ }
  }, [nacin]);

  const selectedOffer = offers.find(item => item.id === offerId);

  /* ── vstopni combobox: ponudbe po datumu (najnovejse zgoraj); brez iskanja
     prikaze zadnjih 10, ob tipkanju filtrira VSE po naslovu/stranki/stevilki ── */
  const ponudbePoDatumu = [...offers].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const vstopIsk = vstopIskanje.trim().toLocaleLowerCase('sl-SI');
  const vstopSeznam = vstopIsk
    ? ponudbePoDatumu.filter(offer => `${offer.title} ${offer.client} ${offer.number || ''}`.toLocaleLowerCase('sl-SI').includes(vstopIsk))
    : ponudbePoDatumu.slice(0, 10);
  /* izbira ponudbe (ali "Brez ponudbe" = prazen id) nastavi offerId -> vir se izpelje sam */
  const izberiVVstopu = (id: string) => { setOfferId(id); setKartaOdprta(false); setRocnoTelo(false); setVstopOdprt(false); setVstopIskanje(''); };
  /* klik izven odprtega comboboxa ga zapre (panel je position:absolute znotraj .pg-combo, portal ni potreben) */
  useEffect(() => {
    if (!vstopOdprt) return;
    const zapri = (event: MouseEvent) => {
      if (vstopComboRef.current && !vstopComboRef.current.contains(event.target as Node)) { setVstopOdprt(false); setVstopIskanje(''); }
    };
    document.addEventListener('mousedown', zapri);
    return () => document.removeEventListener('mousedown', zapri);
  }, [vstopOdprt]);

  /* e-posta narocnika: iz imenika strank (po imenu), da je "Poslji" en klik */
  useEffect(() => {
    if (vir !== 'ponudba' || !selectedOffer) return;
    const stranka = clients.find(c => c.name.trim().toLowerCase() === selectedOffer.client.trim().toLowerCase());
    setNarEmail(stranka?.email || '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offerId, vir, clients]);

  const narocnikIme = () => (vir === 'ponudba' ? selectedOffer?.client || '' : rocniNarocnik).trim();
  /* Best-effort e-maili kontaktov stranke (glavni + kontaktne osebe) za
     spustnik »+ kontakt« v bloku pošiljanja. Stranko poiščemo po imenu. */
  const strankaKontakti = (): string[] => {
    const ime = narocnikIme().toLowerCase();
    if (!ime) return [];
    const stranka = clients.find(c => c.name.trim().toLowerCase() === ime);
    if (!stranka) return [];
    const zbrani: string[] = [];
    if (stranka.email) zbrani.push(stranka.email);
    (stranka.kontakti || []).forEach(k => { if (k.email) zbrani.push(k.email); });
    const videni = new Set<string>();
    return zbrani.filter(e => { const k = e.toLowerCase(); if (videni.has(k)) return false; videni.add(k); return true; });
  };
  const obsegSeznam = () => vir === 'ponudba'
    ? (selectedOffer?.scope || [])
    : rocniObseg.split('\n').map(v => v.trim()).filter(Boolean);

  /* ── dokument: letterhead + CSS + predloga — KOPIJA retainerjevega vzorca ── */
  /* Glava/noga AKTIVNE predloge (vec predlog) — ADITIVNO, glej lib/dokVidez.ts.
     Ce nista vpisani, se nic ne izrise in obstojeci videz ostane enak. */
  const glava = () => {
    const kontakt = [ponudnik.davcna.trim() && 'Davčna št.: ' + ponudnik.davcna.trim(), ponudnik.trr.trim() && 'TRR: ' + ponudnik.trr.trim(), ponudnik.telefon.trim() && 'Tel.: ' + predklic + ' ' + ponudnik.telefon.trim(), ponudnik.email.trim()].filter(Boolean).join(' · ');
    const glavaBesedilo = aktivnaPredloga().glava?.trim();
    const glavaLine = glavaBesedilo ? '<br><span class="mut" style="color:#111;font-weight:600">' + esc(glavaBesedilo) + '</span>' : '';
    /* desni znak = TVOJ shranjeni logo (enotni vir: predloga ali K_LOGO); prej je bil trdo zakodiran »Pinart«, zato se logo ni videl */
    const logo = aktivniLogo();
    const znak = logo ? `<img class="lg-logo" src="${logo}" alt="">` : '';
    return `<div class="lg"><div><b>${esc(ponudnik.ime.trim() || '[Tvoje podjetje]')}</b>${glavaLine}${ponudnik.naslov.trim() ? '<br>' + esc(ponudnik.naslov.trim()) : ''}${kontakt ? '<br><span class="mut">' + esc(kontakt) + '</span>' : ''}</div>${znak}</div>`;
  };
  const dokNoga = () => {
    const n = aktivnaPredloga().noga?.trim();
    /* noga = fiksno 5 mm od SPODNJEGA roba strani (v spodnji rob @page margina); ponovi se na vsaki strani */
    return n ? `<div class="dok-noga" style="position:fixed;left:16mm;right:16mm;bottom:5mm;padding-top:8px;border-top:1px solid oklch(93% .006 82 / .55);font-size:8pt;color:#9a9088;line-height:1.5">${esc(n).split('\n').join('<br>')}</div>` : '';
  };
  const DOC_CSS = `@page{size:A4;margin:16mm 16mm 18mm}*{-webkit-print-color-adjust:exact;print-color-adjust:exact;box-sizing:border-box}body{margin:0;color:#1a1622;font-family:'Helvetica Neue',Arial,sans-serif;font-size:10.5pt;line-height:1.42}.lg{display:flex;justify-content:space-between;align-items:flex-start;gap:24px;padding-bottom:12px;border-bottom:1.5px solid #B25476;margin-bottom:20px}.lg .rt{font-family:'Bodoni Moda',Didot,Georgia,serif;font-size:15pt;color:#111}.lg .lg-logo{max-height:46px;max-width:180px;object-fit:contain;display:block}.mut{color:#8a8177;font-size:9pt}h1{font-family:'Bodoni Moda',Didot,Georgia,serif;font-weight:400;font-size:20pt;margin:2px 0 4px;color:#111}.kick{font-size:8.5pt;letter-spacing:.24em;text-transform:uppercase;color:#B25476;font-weight:700}h2{font-size:8.5pt;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:#B25476;margin:11px 0 5px;padding-top:6px;border-top:1px solid #ecdfe4;break-after:avoid}p{margin:0 0 5px}ul{margin:.2rem 0 .7rem;padding-left:1.15rem}li{margin:3px 0;break-inside:avoid}.meta{color:#555;font-size:9.5pt;margin:2px 0 0}.pog-clen{margin:7px 0;break-inside:avoid}.pog-clen h2{border-top:0;padding-top:0;margin:6px 0 3px;font-size:9pt}.parties p{margin:.15rem 0}.sig{display:flex;gap:40px;margin-top:15px;break-inside:avoid}.sig>div{flex:1;font-size:9pt;color:#444;display:flex;flex-direction:column}.sig>div>span:first-child{font-size:7.5pt;letter-spacing:.14em;text-transform:uppercase;color:#8a8177;margin-bottom:24px}.sig .lin{border-top:1px solid #111;margin-bottom:4px}.podpis-img{display:block;max-height:40px;max-width:180px;margin:0 0 -6px}`;
  const doc = (body: string) => `<!doctype html><html lang="sl"><head><meta charset="utf-8">${dokFontLink(dokFont)}<style>${dokCss(DOC_CSS)}</style></head><body style="${dokVars(dokBarva, dokFont)}">${glava()}${body}${dokNoga()}</body></html>`;
  useEffect(() => {
    setGlavaHtml(glava());
    const n = aktivnaPredloga().noga?.trim();
    setNogaHtml(n ? esc(n).split('\n').join('<br>') : '');
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [ponudnik, dokBarva, dokFont, rocniNarocnik, vir, offerId, datum]);

  /* ── model clenov po vrstah: vsak clen je Clen objekt (naslov + HTML telo);
     opcijski cleni se dajo vklopiti/izklopiti, stevilcenje se prilagodi samo.
     Za 'sodelovanje' in 'nda' je besedilo DOBESEDNO enako prejsnjim generatorjem. ── */
  const cleniZaVrsto = (v: VrstaPog): Clen[] => {
    const st = vir === 'ponudba' ? selectedOffer?.number || '' : '';
    const naslovProj = vir === 'ponudba' ? selectedOffer?.title || '' : '';
    const obseg = obsegSeznam();
    const obsegHtml = obseg.length ? `<ul>${obseg.map(s => `<li>${esc(s)}</li>`).join('')}</ul>` : '<ul><li>skladno s potrjeno ponudbo</li></ul>';
    const znesek = vir === 'ponudba' && selectedOffer && selectedOffer.agreedAmount > 0 ? ` Dogovorjena vrednost po ponudbi znaša ${eur(selectedOffer.agreedAmount)}.` : '';
    const ponudbaDel = st ? `Potrjena ponudba št. ${esc(st)} je sestavni del pogodbe. ` : '';
    const sporiTelo = '<p>Stranki bosta morebitne spore reševali sporazumno. Če to ne bo mogoče, je pristojno stvarno pristojno sodišče v kraju izvajalca, če prisilni predpisi ne določajo drugače.</p>';
    const koncneTelo = '<p>Spremembe in dopolnitve so veljavne le v pisni obliki. Pogodba je sestavljena v dveh enakih izvodih oziroma podpisana elektronsko in začne veljati z dnem podpisa obeh strank.</p>';

    switch (v) {
      case 'sodelovanje':
        return [
          { id: 'sod-uvod', naslov: 'Uvodna določba', telo: '<p>Pogodbeni stranki ugotavljata, da ima izvajalec znanje in izkušnje za izvedbo dogovorjenih storitev ter da želita s pogodbo urediti medsebojne pravice in obveznosti. Izvajalec delo opravlja samostojno in ni v delovnem razmerju z naročnikom.</p>' },
          { id: 'sod-predmet', naslov: 'Predmet pogodbe', telo: `<p>Predmet pogodbe je ${naslovProj ? 'izvedba projekta »' + esc(naslovProj) + '« in ' : ''}izvedba naslednjih storitev:</p>${obsegHtml}<p>${ponudbaDel}Dela zunaj navedenega obsega se pred izvedbo dodatno ovrednotijo in pisno potrdijo.</p>` },
          { id: 'sod-kakovost', naslov: 'Način in kakovost dela', telo: '<p>Izvajalec se zavezuje delo opraviti strokovno, skrbno in v interesu kakovostne izvedbe. Naročnik pravočasno zagotovi informacije, materiale, dostope in potrditve. Izvajalec lahko vključi ustrezno usposobljene podizvajalce in odgovarja za njihovo delo.</p>' },
          { id: 'sod-roki', naslov: 'Roki izvedbe', telo: '<p>Roki veljajo, kot so določeni v ponudbi oziroma naknadno pisno dogovorjeni. Zamude naročnika pri posredovanju gradiv ali potrditvah ustrezno podaljšajo rok izvedbe.</p>' },
          { id: 'sod-cena', naslov: 'Cena storitev in način plačila', telo: `<p>Cena, način obračuna, predplačilo in plačilni roki veljajo skladno s potrjeno ponudbo.${znesek} Dodatne storitve in potrjeni dodatni stroški se obračunajo posebej. Ob zamudi lahko izvajalec obračuna zakonske zamudne obresti.</p>` },
          { id: 'sod-obvez-nar', naslov: 'Obveznosti naročnika', telo: '<p>Naročnik zagotovi potrebna gradiva in povratne informacije, potrjuje posamezne faze ter poravna račune v dogovorjenih rokih.</p>' },
          { id: 'sod-obvez-izv', naslov: 'Obveznosti izvajalca', telo: '<p>Izvajalec pogodbena dela izvede strokovno, naročnika obvešča o okoliščinah, ki vplivajo na izvedbo, ter omogoči pregled dogovorjenih faz projekta.</p>' },
          { id: 'sod-varovanje', naslov: 'Varovanje podatkov', opcijski: true, telo: '<p>Pogodbeni stranki varujeta poslovne, osebne in druge zaupne podatke, s katerimi se seznanita pri sodelovanju, tudi po prenehanju pogodbe.</p>' },
          { id: 'sod-avtorske', naslov: 'Avtorske pravice', opcijski: true, telo: '<p>Obseg prenosa oziroma licence avtorskih pravic velja, kot je določen v potrjeni ponudbi. Dogovorjene pravice se na naročnika prenesejo po celotnem plačilu. Delovne datoteke, neizbrane rešitve in sredstva tretjih oseb niso vključeni, če ni pisno dogovorjeno drugače.</p>' },
          { id: 'sod-trajanje', naslov: 'Trajanje in prenehanje pogodbe', telo: '<p>Pogodba velja od podpisa obeh strank do izpolnitve vseh dogovorjenih obveznosti. Vsaka stranka lahko odstopi ob bistveni kršitvi, če druga stranka kršitve ne odpravi v primernem pisno določenem roku.</p>' },
          { id: 'sod-spremembe', naslov: 'Spremembe pogodbe', telo: '<p>Spremembe in dopolnitve so veljavne le v pisni obliki. Potrditve po elektronski pošti se štejejo kot pisni dogovor, kadar jasno določajo spremembo obsega, roka ali cene.</p>' },
          { id: 'sod-konkurenca', naslov: 'Konkurenčna prepoved', opcijski: true, telo: '<p>Izvajalec v času sodelovanja in 12 mesecev po njegovem prenehanju brez pisnega soglasja naročnika ne bo opravljal enakih storitev za neposredne konkurente naročnika na način, ki bi izkoriščal zaupne podatke ali gradiva, pridobljena pri tem sodelovanju. Ta določba ne omejuje izvajalčeve splošne poklicne dejavnosti.</p>' },
          { id: 'sod-kazen', naslov: 'Pogodbena kazen', opcijski: true, telo: '<p>Če izvajalec po svoji krivdi zamudi z izvedbo dogovorjenih del, lahko naročnik zaračuna pogodbeno kazen v višini 0,5 % vrednosti zamujenih del za vsak dan zamude, skupno največ 10 % pogodbene vrednosti. Uveljavljanje pogodbene kazni ne izključuje pravice do povrnitve škode v presežnem znesku.</p>' },
          { id: 'sod-spori', naslov: 'Reševanje sporov', telo: sporiTelo },
          { id: 'sod-koncne', naslov: 'Končne določbe', telo: '<p>Pogodba je sestavljena v dveh enakih izvodih oziroma podpisana elektronsko. Sklenjena je z dnem podpisa obeh pogodbenih strank.</p>' },
        ];
      case 'podjemna':
        return [
          { id: 'pod-uvod', naslov: 'Uvodna določba', telo: '<p>Pogodbeni stranki ugotavljata, da naročnik naroča, izvajalec pa prevzema izvedbo posameznega, po obsegu in vsebini določenega dela (podjema). Izvajalec delo opravlja samostojno, po pravilih stroke ter v svojem imenu in za svoj račun in ni v delovnem razmerju z naročnikom.</p>' },
          { id: 'pod-predmet', naslov: 'Predmet in obseg del', telo: `<p>Predmet pogodbe je ${naslovProj ? 'izvedba projekta »' + esc(naslovProj) + '« oziroma ' : ''}izvedba naslednjih del:</p>${obsegHtml}<p>${ponudbaDel}Dela, ki presegajo dogovorjeni obseg, se pred izvedbo posebej ovrednotijo in pisno potrdijo.</p>` },
          { id: 'pod-roki', naslov: 'Roki', telo: '<p>Izvajalec dela dokonča v rokih, določenih v ponudbi oziroma naknadno pisno dogovorjenih. Če naročnik zamuja z izročitvijo gradiv, potrditvami ali plačili, se roki ustrezno podaljšajo.</p>' },
          { id: 'pod-cena', naslov: 'Cena in plačilo', telo: `<p>Za opravljeno delo pripada izvajalcu plačilo (podjemnina), kot je določeno v potrjeni ponudbi.${znesek} Plačilo zapade v dogovorjenem roku po izstavitvi računa. Ob zamudi lahko izvajalec zaračuna zakonske zamudne obresti.</p>` },
          { id: 'pod-prevzem', naslov: 'Prevzem in reklamacije', telo: '<p>Naročnik po dokončanju delo pregleda in o morebitnih očitnih napakah izvajalca pisno obvesti brez nepotrebnega odlašanja, sicer se šteje, da je delo prevzeto brez pripomb. Izvajalec za stvarne napake jamči po pravilih obligacijskega prava in jih v primernem roku brezplačno odpravi.</p>' },
          { id: 'pod-obvez', naslov: 'Obveznosti naročnika', telo: '<p>Naročnik izvajalcu pravočasno zagotovi vsa potrebna gradiva, informacije, dostope in soglasja, sproti potrjuje posamezne faze ter poravna račune v dogovorjenih rokih.</p>' },
          { id: 'pod-avtorske', naslov: 'Avtorske pravice', opcijski: true, telo: '<p>Materialne avtorske pravice na avtorskih delih, nastalih pri izvedbi, se v dogovorjenem obsegu prenesejo na naročnika po celotnem plačilu podjemnine. Delovne datoteke, neizbrane rešitve in gradiva tretjih oseb v prenos niso vključeni, če ni pisno dogovorjeno drugače.</p>' },
          { id: 'pod-varovanje', naslov: 'Varovanje podatkov', opcijski: true, telo: '<p>Pogodbeni stranki varujeta poslovne, osebne in druge zaupne podatke, s katerimi se seznanita pri izvedbi del, ter jih ne razkrivata tretjim osebam, tudi po prenehanju pogodbe.</p>' },
          { id: 'pod-odstop', naslov: 'Odstop od pogodbe', telo: '<p>Vsaka stranka lahko odstopi od pogodbe ob bistveni kršitvi druge stranke, če ta kršitve ne odpravi v primernem, pisno določenem roku. Ob odstopu izvajalcu pripada plačilo za že opravljena in prevzeta dela.</p>' },
          { id: 'pod-kazen', naslov: 'Pogodbena kazen', opcijski: true, telo: '<p>Če izvajalec po svoji krivdi zamudi z dokončanjem del, lahko naročnik zaračuna pogodbeno kazen v višini 0,5 % vrednosti zamujenih del za vsak dan zamude, skupno največ 10 % pogodbene vrednosti. Uveljavljanje pogodbene kazni ne izključuje pravice do povrnitve škode v presežnem znesku.</p>' },
          { id: 'pod-spori', naslov: 'Reševanje sporov', telo: sporiTelo },
          { id: 'pod-koncne', naslov: 'Končne določbe', telo: '<p>Spremembe in dopolnitve so veljavne le v pisni obliki. Pogodba je sestavljena v dveh enakih izvodih oziroma podpisana elektronsko in začne veljati z dnem podpisa obeh strank.</p>' },
        ];
      case 'avtorska':
        return [
          { id: 'avt-uvod', naslov: 'Uvodna določba', telo: '<p>Pogodbeni stranki ugotavljata, da je izvajalec (v nadaljevanju: avtor) avtor spodaj opredeljenega avtorskega dela in da želita s to pogodbo urediti prenos avtorskih pravic ter medsebojne pravice in obveznosti.</p>' },
          { id: 'avt-predmet', naslov: 'Predmet — avtorsko delo', telo: `<p>Predmet pogodbe je avtorsko delo${naslovProj ? ' »' + esc(naslovProj) + '«' : ''}, ki obsega:</p>${obsegHtml}<p>${ponudbaDel}Delo mora biti izvirna intelektualna stvaritev avtorja.</p>` },
          { id: 'avt-prenos', naslov: 'Prenos materialnih avtorskih pravic', telo: '<p>Avtor na naročnika prenese materialne avtorske pravice za uporabo dela v dogovorjenem obsegu (zlasti pravico reproduciranja, distribuiranja in dajanja na voljo javnosti). Če ni pisno dogovorjeno drugače, je prenos neizključen, pravice pa preidejo na naročnika šele po celotnem plačilu honorarja. Prenos ne zajema delovnih datotek, neizbranih rešitev in gradiv tretjih oseb.</p>' },
          { id: 'avt-moralne', naslov: 'Moralne pravice avtorja', telo: '<p>Moralne avtorske pravice so neprenosljive in ostanejo avtorju. Naročnik dela ne sme skaziti ali ga uporabiti na način, ki bi žalil avtorjevo čast ali ugled.</p>' },
          { id: 'avt-honorar', naslov: 'Honorar in nadomestilo', telo: `<p>Za ustvarjeno delo in prenos pravic pripada avtorju honorar, kot je določen v potrjeni ponudbi.${znesek} Honorar zapade v plačilo v dogovorjenem roku po izstavitvi računa.</p>` },
          { id: 'avt-atribucija', naslov: 'Navedba avtorstva', opcijski: true, telo: '<p>Naročnik pri javni uporabi dela na običajen in primeren način navede avtorstvo (ime oziroma oznako avtorja), razen kadar to zaradi narave uporabe ni mogoče.</p>' },
          { id: 'avt-portfelj', naslov: 'Uporaba v portfelju avtorja', opcijski: true, telo: '<p>Avtor sme delo ali njegove dele uporabiti kot referenco v svojem portfelju in pri predstavitvi svojega dela, pri čemer upošteva morebitne zaupne podatke naročnika.</p>' },
          { id: 'avt-tantieme', naslov: 'Tantieme in dodatno nadomestilo', opcijski: true, telo: '<p>Če naročnik delo uporablja v obsegu, ki bistveno presega dogovorjeni namen ali doseg, avtorju pripada dodatno nadomestilo (tantieme), katerega višino stranki določita sporazumno glede na dejanski obseg uporabe.</p>' },
          { id: 'avt-trajanje', naslov: 'Trajanje in teritorij prenosa', telo: '<p>Če ni pisno dogovorjeno drugače, prenos pravic velja za ozemlje Republike Slovenije in za celoten čas trajanja avtorske pravice. Morebitni širši teritorialni ali časovni obseg mora biti izrecno pisno dogovorjen.</p>' },
          { id: 'avt-spori', naslov: 'Reševanje sporov', telo: sporiTelo },
          { id: 'avt-koncne', naslov: 'Končne določbe', telo: koncneTelo },
        ];
      case 'licencna':
        return [
          { id: 'lic-uvod', naslov: 'Uvodna določba', telo: '<p>Pogodbeni stranki ugotavljata, da je izvajalec (v nadaljevanju: dajalec licence) imetnik pravic na spodaj opredeljenem delu in da naročnik (v nadaljevanju: pridobitelj) želi pridobiti pravico do njegove uporabe pod pogoji te pogodbe.</p>' },
          { id: 'lic-predmet', naslov: 'Predmet licence', telo: `<p>Predmet licence je uporaba dela${naslovProj ? ' »' + esc(naslovProj) + '«' : ''}, ki obsega:</p>${obsegHtml}<p>${ponudbaDel}Dajalec licence jamči, da je upravičen podeliti licenco v dogovorjenem obsegu.</p>` },
          { id: 'lic-obseg', naslov: 'Obseg licence', telo: '<p>Pridobitelj sme delo uporabljati izključno na dogovorjene načine in za dogovorjeni namen. Vsaka uporaba zunaj podeljenega obsega zahteva predhodno pisno soglasje dajalca licence in lahko pomeni dodatno nadomestilo.</p>' },
          { id: 'lic-trajanje', naslov: 'Trajanje licence', telo: '<p>Licenca se podeli za dogovorjeno obdobje. Če trajanje ni izrecno določeno, velja licenca za nedoločen čas, dokler je katera od strank ne odpove ob upoštevanju primernega odpovednega roka.</p>' },
          { id: 'lic-teritorij', naslov: 'Teritorij', opcijski: true, telo: '<p>Licenca velja za dogovorjeno ozemlje. Če teritorij ni izrecno določen, velja za ozemlje Republike Slovenije.</p>' },
          { id: 'lic-ekskl', naslov: 'Ekskluzivnost', opcijski: true, telo: '<p>Če ni pisno dogovorjeno drugače, je licenca neizključna in dajalcu licence ne preprečuje, da delo uporablja sam ali podeljuje enake pravice tretjim osebam.</p>' },
          { id: 'lic-podlicence', naslov: 'Pravica do podlicenc', opcijski: true, telo: '<p>Pridobitelj sme podeljene pravice v celoti ali deloma prenesti na tretje osebe oziroma podeljevati podlicence le s predhodnim pisnim soglasjem dajalca licence.</p>' },
          { id: 'lic-licencnina', naslov: 'Licenčnina', telo: `<p>Za podeljeno licenco pridobitelj plača licenčnino, kot je določena v potrjeni ponudbi.${znesek} Licenčnina zapade v plačilo v dogovorjenem roku po izstavitvi računa.</p>` },
          { id: 'lic-porocanje', naslov: 'Poročanje o rabi', opcijski: true, telo: '<p>Kadar je licenčnina vezana na obseg uporabe, pridobitelj dajalcu licence v dogovorjenih obdobjih poroča o obsegu rabe in na tej podlagi obračuna dodatno nadomestilo (tantieme).</p>' },
          { id: 'lic-prenehanje', naslov: 'Prenehanje licence', telo: '<p>Licenca preneha s potekom dogovorjenega obdobja ali z odpovedjo skladno s to pogodbo. Ob bistveni kršitvi lahko dajalec licence licenco prekliče, če pridobitelj kršitve ne odpravi v primernem, pisno določenem roku; po prenehanju pridobitelj uporabo dela preneha.</p>' },
          { id: 'lic-spori', naslov: 'Reševanje sporov', telo: sporiTelo },
          { id: 'lic-koncne', naslov: 'Končne določbe', telo: koncneTelo },
        ];
      case 'nda':
        return [
          { id: 'nda-predmet', naslov: 'Predmet sporazuma', telo: '<p>Pogodbeni stranki si pri vzpostavljanju in izvajanju medsebojnega poslovnega sodelovanja izmenjujeta zaupne podatke ter s tem sporazumom urejata njihovo varovanje. Sporazum je vzajemen in v enaki meri zavezuje vsako stranko kot razkrivatelja in kot prejemnika zaupnih podatkov.</p>' },
          { id: 'nda-zaupni', naslov: 'Zaupni podatki', telo: '<p>Za zaupne se štejejo vsi poslovni, tehnični, finančni, organizacijski in osebni podatki, gradiva, dokumentacija, know-how ter druge informacije, ne glede na obliko (pisno, ustno, elektronsko ali kako drugače), ki jih ena stranka posreduje drugi ali do katerih ta pri sodelovanju kako drugače dostopa. Za zaupne se štejejo tudi ustno posredovani podatki, ki so ob razkritju označeni ali po naravi razumljeni kot zaupni.</p>' },
          { id: 'nda-obveznosti', naslov: 'Obveznosti prejemnika', telo: '<p>Prejemnik zaupne podatke varuje z enako skrbnostjo kot lastne zaupne podatke, jih brez predhodnega pisnega soglasja razkrivatelja ne razkrije tretjim osebam ter jih uporablja izključno za namen medsebojnega sodelovanja. Dostop do zaupnih podatkov omogoči le tistim sodelavcem oziroma podizvajalcem, ki jih nujno potrebujejo za izvedbo sodelovanja in so zavezani k enaki stopnji zaupnosti.</p>' },
          { id: 'nda-izjeme', naslov: 'Izjeme', telo: '<p>Obveznost varovanja ne velja za podatke, ki so postali javno znani brez kršitve tega sporazuma, ki jih je prejemnik dokazljivo neodvisno pridobil ali razvil brez uporabe zaupnih podatkov, ali za katere je razkritje zahtevano z zakonom oziroma z odločbo pristojnega organa. V slednjem primeru prejemnik o zahtevanem razkritju, kolikor je to dopustno, predhodno obvesti drugo stranko.</p>' },
          { id: 'nda-trajanje', naslov: 'Trajanje', telo: '<p>Sporazum velja od dneva podpisa obeh strank. Obveznost varovanja zaupnih podatkov traja ves čas medsebojnega sodelovanja in še 3 (tri) leta po njegovem prenehanju, za osebne in z zakonom posebej varovane podatke pa toliko časa, kolikor to zahtevajo veljavni predpisi.</p>' },
          { id: 'nda-odgovornost', naslov: 'Odgovornost', opcijski: true, telo: '<p>Stranka, ki krši obveznosti iz tega sporazuma, drugi stranki odškodninsko odgovarja za nastalo škodo po splošnih pravilih obligacijskega prava. Stranki se lahko za primer kršitve dogovorita tudi pogodbeno kazen, ki ne izključuje uveljavljanja odškodnine v presežnem znesku.</p>' },
          { id: 'nda-koncne', naslov: 'Končne določbe', telo: '<p>Spremembe in dopolnitve tega sporazuma so veljavne le v pisni obliki. Morebitne spore bosta stranki reševali sporazumno, sicer je pristojno stvarno pristojno sodišče v kraju izvajalca. Sporazum je sestavljen v dveh enakih izvodih, po enem za vsako stranko, oziroma je podpisan elektronsko, in začne veljati z dnem podpisa obeh pogodbenih strank.</p>' },
        ];
      case 'dpa':
        return [
          { id: 'dpa-predmet', naslov: 'Predmet in trajanje obdelave', telo: '<p>S to pogodbo pogodbeni stranki urejata obdelavo osebnih podatkov, ki jo obdelovalec (izvajalec) izvaja v imenu in za račun upravljavca (naročnika) pri izvajanju medsebojnega sodelovanja. Obdelava traja ves čas trajanja sodelovanja oziroma dokler je potrebna za dogovorjeni namen.</p>' },
          { id: 'dpa-vrste', naslov: 'Vrste podatkov in kategorije posameznikov', telo: '<p>Obdelava zajema osebne podatke, potrebne za izvedbo sodelovanja (npr. kontaktne in identifikacijske podatke), ki se nanašajo na kategorije posameznikov, kot so naročnikove stranke, zaposleni in poslovni partnerji. Natančen obseg podatkov izhaja iz narave naročenih storitev.</p>' },
          { id: 'dpa-navodila', naslov: 'Vloge in navodila', telo: '<p>Obdelovalec osebne podatke obdeluje izključno po dokumentiranih navodilih upravljavca in le za namene, potrebne za izvedbo sodelovanja. Če meni, da je navodilo v nasprotju s predpisi o varstvu osebnih podatkov, o tem nemudoma obvesti upravljavca.</p>' },
          { id: 'dpa-zaupnost', naslov: 'Zaupnost osebja', telo: '<p>Obdelovalec zagotovi, da so osebe, pooblaščene za obdelavo osebnih podatkov, zavezane k zaupnosti oziroma da zanje velja ustrezna zakonska obveznost varovanja zaupnosti.</p>' },
          { id: 'dpa-varnost', naslov: 'Varnostni ukrepi', telo: '<p>Obdelovalec ob upoštevanju stanja tehnike in tveganj izvede ustrezne tehnične in organizacijske ukrepe za zagotovitev ravni varnosti, primerne tveganju (zlasti nadzor dostopa, varovanje in po potrebi šifriranje podatkov, zagotavljanje zaupnosti, celovitosti in razpoložljivosti ter redno preverjanje učinkovitosti ukrepov).</p>' },
          { id: 'dpa-podobdelovalci', naslov: 'Podobdelovalci', opcijski: true, telo: '<p>Obdelovalec drugega obdelovalca (podobdelovalca) vključi le s predhodnim splošnim ali posebnim pisnim soglasjem upravljavca ter mu naloži enake obveznosti varstva podatkov, kot veljajo po tej pogodbi. Za ravnanje podobdelovalca odgovarja upravljavcu obdelovalec.</p>' },
          { id: 'dpa-prenos', naslov: 'Prenos v tretje države', opcijski: true, telo: '<p>Obdelovalec osebnih podatkov ne prenaša v tretje države ali mednarodne organizacije brez predhodnega soglasja upravljavca in le ob zagotovljenih ustreznih zaščitnih ukrepih v skladu z veljavnimi predpisi o varstvu osebnih podatkov.</p>' },
          { id: 'dpa-pomoc', naslov: 'Pomoč upravljavcu', telo: '<p>Obdelovalec upravljavcu v okviru zmožnosti pomaga pri izpolnjevanju obveznosti do posameznikov (uveljavljanje njihovih pravic) ter pri zagotavljanju varnosti, oceni učinka in predhodnem posvetovanju z nadzornim organom.</p>' },
          { id: 'dpa-krsitve', naslov: 'Obveščanje o kršitvah varnosti', telo: '<p>Obdelovalec upravljavca brez nepotrebnega odlašanja po seznanitvi obvesti o vsaki kršitvi varnosti osebnih podatkov ter mu posreduje informacije, potrebne za izpolnitev njegovih obveznosti obveščanja.</p>' },
          { id: 'dpa-izbris', naslov: 'Izbris ali vrnitev podatkov', telo: '<p>Po prenehanju obdelave obdelovalec po izbiri upravljavca vse osebne podatke izbriše ali vrne in izbriše obstoječe kopije, razen če predpisi zahtevajo njihovo nadaljnjo hrambo.</p>' },
          { id: 'dpa-revizija', naslov: 'Revizija in dokazila', telo: '<p>Obdelovalec upravljavcu na zahtevo da na voljo vse informacije, potrebne za dokazovanje izpolnjevanja obveznosti iz te pogodbe, ter omogoči in prispeva k revizijam oziroma pregledom, ki jih izvede upravljavec ali pooblaščeni revizor.</p>' },
          { id: 'dpa-koncne', naslov: 'Končne določbe', telo: '<p>Ta pogodba je sklenjena kot dodatek k medsebojni pogodbi o sodelovanju in velja ves čas obdelave osebnih podatkov. Spremembe in dopolnitve so veljavne le v pisni obliki, sicer se smiselno uporabljajo določbe veljavnih predpisov o varstvu osebnih podatkov.</p>' },
        ];
    }
  };

  /* sestavi telo dokumenta: ovoj/glava (kick/h1/meta/parties) + oštevilčeni cleni (brez izklopljenih) + podpis.
     Za 'sodelovanje' in 'nda' je izpis vsebinsko enak prejsnjima generatorjema. */
  const sestaviTelo = (v: VrstaPog, izkl: Set<string> = izklKlavzule) => {
    const meta = VRSTE_POG.find(x => x.id === v)!;
    const nar = narocnikIme() || '[Naročnik]';
    const izv = [ponudnik.ime.trim() || '[Izvajalec]', ponudnik.naslov.trim(), ponudnik.davcna.trim() && ('davčna št. ' + ponudnik.davcna.trim()), ponudnik.trr.trim() && ('TRR ' + ponudnik.trr.trim())].filter(Boolean).join(', ');
    const st = vir === 'ponudba' ? selectedOffer?.number || '' : '';
    const d = datum ? new Date(datum + 'T00:00:00') : new Date();
    /* kick v dokumentu = naziv brez oklepajnega dodatka; ponudbena št. le pri pogodbenih vrstah (ne NDA/DPA) */
    const dokKick = meta.naziv.replace(/\s*\(.*\)\s*$/, '') + ((v !== 'nda' && v !== 'dpa' && st) ? ' · ponudba št. ' + esc(st) : '');
    const zaimek = v === 'nda' ? 'ga' : 'jo'; /* sporazum (m) → ga, pogodba (ž) → jo */
    const partiesSklep = v === 'nda' ? '(v nadaljevanju: pogodbeni stranki) kot sledi:' : 'kot sledi:';
    const cleni = cleniZaVrsto(v).filter(c => !(c.opcijski && izkl.has(c.id)));
    const cleniHtml = cleni.map((c, i) => `<div class="pog-clen"><h2>${i + 1}. člen — ${c.naslov}</h2>${c.telo}</div>`).join('');
    return `
      <div class="kick">${dokKick}</div>
      <h1>${meta.naziv}</h1>
      <p class="meta">Datum: ${datStr(d)}${nar !== '[Naročnik]' ? ' · z: ' + esc(nar) : ''}</p>
      <div class="parties" style="margin-top:14px"><p>ki ${zaimek} skleneta</p><p><b>Naročnik:</b> ${esc(nar)}</p><p>in</p><p><b>Izvajalec:</b> ${esc(izv)}</p><p>${partiesSklep}</p></div>
      ${cleniHtml}
      <p style="margin-top:12px">Kraj in datum: ____________________</p>
      <div class="sig"><div><span>Naročnik</span><span class="lin"></span>${esc(nar !== '[Naročnik]' ? nar : '')}</div><div><span>Izvajalec</span><span class="lin"></span>${esc(ponudnik.ime.trim() || '')}</div></div>`;
  };

  /* aktivno telo glede na izbrano vrsto dokumenta — vse spodnje funkcije gradijo telo skoznjo */
  const aktivnoTelo = () => sestaviTelo(vrstaPog);

  /* ── urejevalnik telesa (kopija retainerjevega vzorca) ── */
  /* callback-ref: urejevalnik se ustvari prazen -> napolnimo ga (le ce je prazen, da med tipkanjem ne resetiramo kurzorja) */
  const napolniEditor = (el: HTMLDivElement | null) => {
    editorRef.current = el;
    if (el && !el.innerHTML.trim()) el.innerHTML = teloHtml.trim() ? teloHtml : aktivnoTelo();
  };
  const sinhronizirajEditor = () => {
    const html = editorRef.current?.innerHTML || '';
    if (!(editorRef.current?.innerText || '').trim()) return; /* ne shrani praznega */
    setTeloHtml(html);
  };
  const rabiIzbor = new Set(['bold', 'italic', 'underline', 'fontSize', 'foreColor', 'hiliteColor', 'fontName']);
  const oblikuj = (ukaz: string, vrednost?: string) => {
    const sel = typeof window !== 'undefined' ? window.getSelection() : null;
    const prazenIzbor = !sel || sel.isCollapsed || !sel.toString().trim();
    if (rabiIzbor.has(ukaz) && prazenIzbor) { setOznaciNamig(true); return; }
    editorRef.current?.focus();
    document.execCommand(ukaz, false, vrednost);
    sinhronizirajEditor();
  };
  const velikost = (smer: number) => { const nv = Math.min(7, Math.max(1, velikostBesedila + smer)); setVelikostBesedila(nv); oblikuj('fontSize', String(nv)); };
  const uporabiPisavo = (font: string) => oblikuj('fontName', font);
  const ponastaviTelo = () => { setRocnoTelo(false); const html = aktivnoTelo(); setTeloHtml(html); if (editorRef.current) editorRef.current.innerHTML = html; };
  const izvozniTelo = () => { const e = editorRef.current?.innerHTML?.trim(); if (e) return e; if (teloHtml.trim()) return teloHtml; return aktivnoTelo(); };

  /* shrani naslov odvetnika ob spremembi vnosa (localStorage) */
  const nastaviOdvetnika = (v: string) => {
    setOdvetnikEmail(v);
    setOdvStatus('');
    setOdvNapaka('');
    try { localStorage.setItem(K_ODVETNIK, v); } catch { /* prazno */ }
  };

  /* pošlji pogodbo odvetniku v pregled in podpis (isti HTML kot prenos/PDF/naročnik) */
  const posljiOdvetniku = async () => {
    if (samoOgled) return;
    const cilj = odvetnikEmail.trim();
    if (!jeVeljavenEmail(cilj)) return;
    const naziv = VRSTE_POG.find(v => v.id === vrstaPog)!.naziv;
    const subject = 'V pregled in podpis: ' + naziv + (narocnikIme() ? ' — ' + narocnikIme() : '');
    setOdvStatus('poslji');
    setOdvNapaka('');
    try {
      const rez = await posljiMail({ to: cilj, subject, html: doc(izvozniTelo()), replyTo: ponudnik.email.trim() || undefined });
      if (rez.ok) {
        setOdvStatus('ok');
        setOdvPoslano(true);
      } else {
        setOdvStatus('napaka');
        setOdvNapaka(rez.napaka || 'pošiljanje ni uspelo.');
      }
    } catch {
      setOdvStatus('napaka');
      setOdvNapaka('pošiljanje ni uspelo.');
    }
  };
  /* menjava vrste dokumenta: kot ponastaviTelo — sveze telo v urejevalnik,
     da preklop takoj OSVEZI prikaz (tudi ce je bilo prej rocno urejeno).
     Opcijski cleni se ponastavijo na privzeto stanje za novo vrsto. */
  const menjajVrsto = (v: VrstaPog) => {
    if (v === vrstaPog) return;
    const izkl = privzetoIzklop(v);
    setVrstaPog(v);
    setIzklKlavzule(izkl);
    setRocnoTelo(false);
    const html = sestaviTelo(v, izkl);
    setTeloHtml(html);
    if (editorRef.current) editorRef.current.innerHTML = html;
  };
  /* preklop opcijskega clena (vklop/izklop): kot menjajVrsto ponovno sestavi telo
     in napolni urejevalnik (tudi ce je bilo rocno urejeno). */
  const prekloviKlavzulo = (id: string) => {
    const izkl = new Set(izklKlavzule);
    if (izkl.has(id)) izkl.delete(id); else izkl.add(id);
    setIzklKlavzule(izkl);
    setRocnoTelo(false);
    const html = sestaviTelo(vrstaPog, izkl);
    setTeloHtml(html);
    if (editorRef.current) editorRef.current.innerHTML = html;
  };

  /* ── podpis: canvas za risanje (prst/miska) ali nalozena slika — KOPIJA retainerja ── */
  const pripraviPlatno = (c: HTMLCanvasElement | null) => {
    podpisPlatnoRef.current = c;
    if (!c) return;
    const r = c.getBoundingClientRect();
    if (r.width > 0 && c.width !== Math.round(r.width * 2)) {
      c.width = Math.round(r.width * 2); c.height = Math.round(r.height * 2);
      const ctx = c.getContext('2d');
      if (ctx) { ctx.scale(2, 2); ctx.lineWidth = 2.2; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#1a1622'; }
    }
  };
  const podpisTocka = (e: React.PointerEvent<HTMLCanvasElement>) => { const r = e.currentTarget.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  const zacniRis = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const ctx = podpisPlatnoRef.current?.getContext('2d'); if (!ctx) return;
    risanjeRef.current = true;
    const p = podpisTocka(e); ctx.beginPath(); ctx.moveTo(p.x, p.y);
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const risiPodpis = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!risanjeRef.current) return;
    const ctx = podpisPlatnoRef.current?.getContext('2d'); if (!ctx) return;
    const p = podpisTocka(e); ctx.lineTo(p.x, p.y); ctx.stroke();
    if (!narisano) setNarisano(true);
  };
  const koncajRis = () => { risanjeRef.current = false; };
  const pocistiPodpis = () => {
    const c = podpisPlatnoRef.current; const ctx = c?.getContext('2d');
    if (c && ctx) { ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, c.width, c.height); ctx.restore(); }
    setNarisano(false);
  };
  /* vstavi <img> nad podpisno crto izbrane strani; gre tudi v PDF (data URL) */
  const vstaviPodpisImg = (dataUrl: string) => {
    const el = editorRef.current; if (!el) return;
    const stolpca = el.querySelectorAll('.sig > div');
    const cilj = stolpca[podpisCilj === 'narocnik' ? 0 : 1] as HTMLElement | undefined; /* narocnik je tu LEVI stolpec */
    if (!cilj) return;
    cilj.querySelector('img.podpis-img')?.remove();
    const img = document.createElement('img');
    img.src = dataUrl; img.className = 'podpis-img'; img.alt = 'Podpis';
    cilj.insertBefore(img, cilj.querySelector('.lin'));
    setRocnoTelo(true); sinhronizirajEditor(); setPonSheet(null);
  };
  const vstaviNarisanPodpis = () => { const c = podpisPlatnoRef.current; if (c && narisano) vstaviPodpisImg(c.toDataURL('image/png')); };
  const naloziPodpisSliko = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    const r = new FileReader();
    r.onload = () => { if (typeof r.result === 'string') vstaviPodpisImg(r.result); };
    r.readAsDataURL(f);
    e.target.value = '';
  };

  /* ── priponka (npr. PDF specifikacije, slika, dodatek) — samo izbere datoteko,
     dejansko nalaganje v oblak zgodi ob shrani(), ko je znan id zapisa ── */
  const naloziPriponko = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    setPriponkaFile(f);
    setPriponkaIme(f.name);
    setPriponkaPot('');
    e.target.value = '';
  };
  const odstraniPriponko = () => { setPriponkaFile(null); setPriponkaIme(''); setPriponkaPot(''); };
  /* odpre naloženo priponko v novem zavihku — pot v shrambi je zasebna, zato
     tik pred odpiranjem zahtevamo kratkotrajno podpisano povezavo (kot AccountingWorkspace) */
  const odpriPriponko = async () => {
    if (!priponkaPot) return;
    try { window.open(await getBusinessDocumentUrl(priponkaPot, 300), '_blank', 'noopener,noreferrer'); }
    catch { /* povezava trenutno ni na voljo */ }
  };

  /* ── PDF prenos (kopija retainerjevega `prenesi`) ── */
  const prenesi = async () => {
    setNapaka('');
    const html = doc(izvozniTelo());
    const slug = (narocnikIme() || 'pinart').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    const metaVrsta = VRSTE_POG.find(v => v.id === vrstaPog)!;
    const nazivDok = metaVrsta.naziv;
    const ime = metaVrsta.slug + '-' + (slug || 'pinart');
    setPdfNalaganje(true);
    try {
      const res = await fetch('/api/ponudba-pdf', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ html, ime, footer: [ponudnik.ime.trim(), nazivDok].filter(Boolean).join(' · ') }) });
      if (!res.ok) throw new Error('pdf');
      const blob = await res.blob();
      if (!blob.size) throw new Error('prazen');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = ime + '.pdf'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    } catch { setNapaka('PDF-ja ni bilo mogoče pripraviti. Poskusi znova.'); } finally { setPdfNalaganje(false); }
  };

  /* PREDOGLED (kot retainer): dejanski PDF, izrisan po straneh kot slike (pdf.js).
     Renderira le v nacinu Predogled (sicer ne obremenjujemo endpointa med urejanjem). */
  useEffect(() => {
    if (!predogledMode) return;
    let ziv = true;
    setPredNal(true);
    const t = window.setTimeout(async () => {
      try {
        const html = doc(izvozniTelo());
        const res = await fetch('/api/ponudba-pdf', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ html, ime: 'predogled' }) });
        if (!res.ok) throw new Error('pdf');
        const buf = await res.arrayBuffer();
        if (!buf.byteLength || !ziv) return;
        const pdfjs = await import('pdfjs-dist');
        pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
        const pdf = await pdfjs.getDocument({ data: new Uint8Array(buf) }).promise;
        const strani: string[] = [];
        for (let i = 1; i <= pdf.numPages && ziv; i++) {
          const stran = await pdf.getPage(i);
          const vp = stran.getViewport({ scale: 2 });
          const canvas = document.createElement('canvas');
          canvas.width = Math.ceil(vp.width); canvas.height = Math.ceil(vp.height);
          const ctx = canvas.getContext('2d');
          if (!ctx) continue;
          await stran.render({ canvas, canvasContext: ctx, viewport: vp } as unknown as Parameters<typeof stran.render>[0]).promise;
          strani.push(canvas.toDataURL('image/png'));
        }
        if (ziv) setPredStrani(strani);
      } catch { /* tiho — predogled ni kriticen */ } finally { if (ziv) setPredNal(false); }
    }, 700);
    return () => { ziv = false; window.clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [predogledMode, teloHtml, vir, offerId, datum, rocniNarocnik, rocniObseg, ponudnik, dokBarva, dokFont]);

  /* ob spremembi vhodov osvezi telo urejevalnika — LE ce ni rocno urejeno (kot retainer) */
  useEffect(() => {
    if (rocnoTelo) return;
    const html = aktivnoTelo();
    setTeloHtml(html);
    if (editorRef.current) editorRef.current.innerHTML = html;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vir, offerId, offers, datum, rocniNarocnik, rocniObseg, ponudnik, vrstaPog]);

  /* namig "oznaci besedilo" izgine sam */
  useEffect(() => {
    if (!oznaciNamig) return;
    const t = window.setTimeout(() => setOznaciNamig(false), 1500);
    return () => window.clearTimeout(t);
  }, [oznaciNamig]);

  /* ob menjavi pogleda: urejevalnik nazaj na Uredi in skok na vrh — ENAKO kot
     retainer (Lenis, ce obstaja; sicer window). Preskoci zacetni render. */
  const prviPogled = useRef(true);
  useEffect(() => {
    if (pogled !== 'dokument') { setPredogledMode(false); setPonSheet(null); }
    if (prviPogled.current) { prviPogled.current = false; return; }
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const lenis = (window as unknown as { __pinartLenis?: { scrollTo: (t: number, o?: { immediate?: boolean; force?: boolean }) => void; resize?: () => void } }).__pinartLenis;
    lenis?.resize?.();
    if (lenis && typeof lenis.scrollTo === 'function') lenis.scrollTo(0, { immediate: reduce, force: true });
    else window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
  }, [pogled]);

  /* "Pripravi pogodbo": sveze telo iz predloge in preklop na stran dokumenta */
  const pripraviPogodbo = () => {
    setRocnoTelo(false);
    const html = aktivnoTelo();
    setTeloHtml(html);
    if (editorRef.current) editorRef.current.innerHTML = html;
    setShranjenaId('');
    setKartaOdprta(false);
    setPriponkaFile(null); setPriponkaIme(''); setPriponkaPot('');
    setPogled('dokument');
  };
  const novaPogodba = () => {
    setOfferId(''); setRocniNarocnik(''); setRocniObseg(''); setNarEmail('');
    setTeloHtml(''); setRocnoTelo(false); setShranjenaId(''); setNapaka('');
    setVrstaPog('sodelovanje'); setIzklKlavzule(privzetoIzklop('sodelovanje')); setOdStranke(false); setVstopOdprt(false); setVstopIskanje('');
    setDatum(new Date().toISOString().slice(0, 10));
    setPriponkaFile(null); setPriponkaIme(''); setPriponkaPot('');
    setPogled('nastavitve');
  };

  /* ── shranjevanje: telo je HTML iz urejevalnika; ponovni klik posodobi isti zapis ── */
  const shrani = async () => {
    if (samoOgled) {
      /* obvestilo se izrise na vrhu strani — brez skoka na vrh ga uporabnica na
         dnu dokumenta sploh ne vidi in izgleda, kot da gumb ne dela */
      setNotice('To so demo podatki — shranjevanje ni mogoče. Zgoraj v vrstici preklopi na »Moji podatki«.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    const telo = izvozniTelo();
    const obstojeca = contracts.find(c => c.id === shranjenaId);
    const id = obstojeca?.id || crypto.randomUUID();
    /* priponka: ce je izbrana nova (se ne naložena) datoteka, jo poskusi naložiti zdaj — ce ne uspe
       (npr. brez oblaka), pogodba obdrzi ime priponke, samo brez povezave (kot pri stroskih) */
    let fileName = priponkaIme || undefined;
    let filePath = priponkaPot || undefined;
    if (priponkaFile) {
      try { filePath = await uploadBusinessDocument(priponkaFile, 'contracts', id); fileName = priponkaFile.name; }
      catch { fileName = priponkaFile.name; filePath = undefined; }
    }
    const zapis: FlowContract = {
      id,
      title: `${VRSTE_POG.find(v => v.id === vrstaPog)!.label} · ${vir === 'ponudba' && selectedOffer ? selectedOffer.title : (rocniNarocnik.trim() || 'brez naslova')}`,
      client: narocnikIme(),
      date: datum,
      status: obstojeca?.status || 'draft',
      sourceOfferId: vir === 'ponudba' ? selectedOffer?.id : undefined,
      body: telo,
      fileName, filePath,
    };
    const next = obstojeca ? contracts.map(c => c.id === zapis.id ? { ...c, ...zapis } : c) : [zapis, ...contracts];
    setContracts(next);
    saveFlowCollection('contracts', next);
    setShranjenaId(zapis.id);
    setPriponkaFile(null);
    setPriponkaIme(fileName || '');
    setPriponkaPot(filePath || '');
    setNotice('Pogodba je shranjena in povezana s projektom.');
    /* po shranjevanju nazaj na prvo stran — nova pogodba je takoj vidna v arhivu
       (Tina: "naj se shrani in vrnem se na prvo stran") */
    setPogled('nastavitve');
  };

  /* ── pot "Od stranke": nalozen dokument (ohranjena stara logika: oblak, rezerva IndexedDB) ── */
  const storeFile = (id: string, file: File) => new Promise<void>((resolve, reject) => {
    const request = indexedDB.open('pinart-flow-files', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('contracts');
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const transaction = request.result.transaction('contracts', 'readwrite');
      transaction.objectStore('contracts').put(file, id);
      transaction.oncomplete = () => { request.result.close(); resolve(); };
    };
  });
  const saveUpload = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (samoOgled) {
      /* obvestilo se izrise na vrhu strani — brez skoka na vrh ga uporabnica na
         dnu dokumenta sploh ne vidi in izgleda, kot da gumb ne dela */
      setNotice('To so demo podatki — shranjevanje ni mogoče. Zgoraj v vrstici preklopi na »Moji podatki«.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    const data = new FormData(event.currentTarget);
    const file = data.get('file');
    if (!(file instanceof File) || !file.size) return;
    const id = crypto.randomUUID();
    let filePath: string | undefined;
    try { filePath = await uploadBusinessDocument(file, 'contracts', id); } catch { await storeFile(id, file); }
    const zapis: FlowContract = { id, title: String(data.get('title')), client: String(data.get('client')), date: String(data.get('date')), status: 'received', sourceOfferId: String(data.get('sourceOfferId')) || undefined, fileName: file.name, filePath, notes: String(data.get('notes')) };
    const next = [zapis, ...contracts];
    setContracts(next);
    saveFlowCollection('contracts', next);
    setNotice('Prejeta pogodba je shranjena in čaka na pregled.');
    event.currentTarget.reset();
  };

  /* klikabilna kartica ponudbe: klik razpre povzetek obsega INLINE (brez navigacije) */
  const karticaPonudbe = (strnjena = false) => selectedOffer ? (
    <div className={'pg-kponudba' + (strnjena ? ' pg-kp-strnjena' : '')}>
      <button type="button" className="pg-kp-glava" aria-expanded={kartaOdprta} aria-label={`Ponudba ${selectedOffer.title} — prikaži povzetek obsega`} onClick={() => setKartaOdprta(v => !v)}>
        <span className="pg-kp-ikona" aria-hidden>⌁</span>
        <span className="pg-kp-info">
          <strong>{selectedOffer.title}</strong>
          <small>{selectedOffer.client}{selectedOffer.number ? ' · št. ' + selectedOffer.number : ''}{selectedOffer.agreedAmount > 0 ? ' · ' + eur(selectedOffer.agreedAmount) : ''}</small>
        </span>
        <span className="pg-kp-kazalec" aria-hidden>{kartaOdprta ? <CaretUp size={15} weight="bold" /> : <CaretDown size={15} weight="bold" />}</span>
      </button>
      {kartaOdprta && (
        <div className="pg-kp-vec">
          {selectedOffer.scope.length
            ? <ul>{selectedOffer.scope.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ul>
            : <p className="pg-mini">Ponudba nima vpisanega obsega.</p>}
          <a className="pg-povezava" href={`${base}/kalkulator/projekti`}>Odpri v projektih ↗</a>
        </div>
      )}
    </div>
  ) : null;

  return <div className={`${styles.contractPage} pg`}>
    {notice && <div className={styles.contractNotice}>{notice}<button onClick={() => setNotice('')}>×</button></div>}

    {/* ── POGLED 1: NASTAVITVE (SAMO vstop za novo pogodbo — pregled/arhiv
        shranjenih pogodb je preseljen v Arhiv, ArhivWorkspace) ── */}
    {pogled === 'nastavitve' && <div className="pg-stolpec pg-vstop">
      {/* naslov strani samo tu — ozek sredinski stolpec + kicker/h1 (kot retainer rw-kicker/rw-h1),
          NE vec full-width topbar; vstop je brez bele kartice okoli (kot retainer rw-vsebina) */}
      <p className="pg-kicker">Pogodbe</p>
      <h1 className="pg-h1">Dogovor, brez ugibanja.</h1>
      <div className="pg-chat">
        <span className="pg-mehur"><b>Iz česa nastane pogodba?</b><small>Če obstaja ponudba, jo izberi — naročnik in obseg se predizpolnita. Sicer pusti »Brez ponudbe« za samostojno pogodbo.</small></span>
      </div>
      <section className="pg-sek pg-vstop-panel">
        {/* vrsta dokumenta: 6 vrst pogodb (velja za ustvarjeno telo) */}
        <div className="pg-vrstapog" role="group" aria-label="Vrsta dokumenta">
          {VRSTE_POG.map(v => (
            <button key={v.id} type="button" aria-label={v.naziv} aria-pressed={vrstaPog === v.id} className={vrstaPog === v.id ? 'on' : ''} onClick={() => menjajVrsto(v.id)}>{v.label}</button>
          ))}
        </div>
        {/* opcijski cleni trenutne vrste: klik vklopi/izklopi člen (številčenje se prilagodi samo) */}
        {!odStranke && (() => {
          const opcijski = cleniZaVrsto(vrstaPog).filter(c => c.opcijski);
          if (!opcijski.length) return null;
          return (
            <div className="pg-klavzule">
              <span className="pg-klavzule-label">Vključi člene:</span>
              <div className="pg-klavzule-pilule" role="group" aria-label="Opcijski členi">
                {opcijski.map(c => {
                  const vkljucen = !izklKlavzule.has(c.id);
                  return <button key={c.id} type="button" aria-pressed={vkljucen} className={'pg-segpills-mini' + (vkljucen ? ' on' : '')} onClick={() => prekloviKlavzulo(c.id)}>{c.naslov}</button>;
                })}
              </div>
            </div>
          );
        })()}
        {!odStranke ? (
          <>
            {/* PONUDBA (iskalen combobox) + DATUM. Izbrana ponudba => vir 'ponudba'
                (predizpolni naročnika+obseg); "Brez ponudbe" => samostojna pogodba (rocno). */}
            <div className="pg-polja">
              <div className="pg-polje pg-combo-polje">
                <span className="pg-combo-oznaka" id="pg-combo-oznaka">Ponudba</span>
                <div className="pg-combo" ref={vstopComboRef}>
                  <button type="button" className="pg-combo-sprozilec" aria-haspopup="listbox" aria-expanded={vstopOdprt} aria-labelledby="pg-combo-oznaka" onClick={() => { setVstopOdprt(open => !open); setVstopIskanje(''); }}>
                    <span>{selectedOffer ? `${selectedOffer.title} · ${selectedOffer.client}` : 'Brez ponudbe'}</span>
                    <CaretDown size={14} weight="bold" aria-hidden />
                  </button>
                  {vstopOdprt && <div className="pg-combo-panel" onKeyDown={event => { if (event.key === 'Escape') { setVstopOdprt(false); setVstopIskanje(''); } }}>
                    <input className="pg-combo-iskalnik" type="search" autoFocus placeholder="Poišči ponudbo, stranko ali številko …" aria-label="Poišči ponudbo, stranko ali številko" value={vstopIskanje} onChange={event => setVstopIskanje(event.target.value)} />
                    <div className="pg-combo-seznam" role="listbox" aria-label="Ponudbe">
                      <button type="button" role="option" aria-selected={!offerId} className={'pg-combo-opcija' + (!offerId ? ' on' : '')} onClick={() => izberiVVstopu('')}>
                        <span className="pg-combo-naziv"><strong>Brez ponudbe</strong><small>Samostojna pogodba</small></span>
                        {!offerId && <span className="pg-combo-kljukica" aria-hidden>✓</span>}
                      </button>
                      {vstopSeznam.map(offer => (
                        <button key={offer.id} type="button" role="option" aria-selected={offerId === offer.id} className={'pg-combo-opcija' + (offerId === offer.id ? ' on' : '')} onClick={() => izberiVVstopu(offer.id)}>
                          <span className="pg-combo-naziv"><strong>{offer.title} · {offer.client}</strong>{offer.number && <small>Št. {offer.number}</small>}</span>
                          {offerId === offer.id && <span className="pg-combo-kljukica" aria-hidden>✓</span>}
                        </button>
                      ))}
                      {!vstopSeznam.length && <p className="pg-mini pg-combo-prazno">Ni ponudb za to iskanje.</p>}
                    </div>
                    {!vstopIskanje.trim() && ponudbePoDatumu.length > 10 && <p className="pg-combo-namig">Prikazanih zadnjih 10 — išči za vse.</p>}
                  </div>}
                </div>
              </div>
              <label className="pg-polje">Datum pogodbe
                <input type="date" value={datum} onChange={event => setDatum(event.target.value)} />
              </label>
            </div>
            {offerId ? (
              karticaPonudbe()
            ) : (
              <>
                {/* "Brez ponudbe" = samostojna pogodba: naročnika in obseg vpišeš ročno */}
                <div className="pg-polja">
                  <label className="pg-polje">Naročnik
                    <input type="text" placeholder="npr. Odvetniška družba Volk & Babica" value={rocniNarocnik} onChange={event => setRocniNarocnik(event.target.value)} />
                  </label>
                  <label className="pg-polje">E-pošta naročnika
                    <input type="email" placeholder="npr. pisarna@volk-babica.si" value={narEmail} onChange={event => setNarEmail(event.target.value)} />
                  </label>
                </div>
                <label className="pg-polje pg-polje-obseg">Obseg (ena postavka na vrstico)
                  <textarea rows={4} placeholder={'npr.\nLogotip\nVizitke in dopisni papir'} value={rocniObseg} onChange={event => setRocniObseg(event.target.value)} />
                </label>
                <p className="pg-namig">Priporočamo: najprej ustvari <b>ponudbo</b> — obseg, cena in številka se v pogodbo prenesejo sami. <a href={`${base}/kalkulator/orodje`}>Odpri kalkulator →</a></p>
              </>
            )}
            <div className="pg-gumbi">
              <button type="button" className="pg-gumb" aria-label="Pripravi pogodbo" onClick={pripraviPogodbo}>Pripravi pogodbo →</button>
            </div>
            {/* pot "Od stranke": naloži že podpisano/prejeto pogodbo za pregled (ohranjena funkcija) */}
            <button type="button" className="pg-povezava pg-odstranke-link" onClick={() => setOdStranke(true)}>Imaš pogodbo od stranke? Naloži jo za pregled →</button>
          </>
        ) : (
          /* pot "Od stranke": nalozi in preglej dokument — shrani takoj v arhiv (status Prejeta) */
          <>
            <button type="button" className="pg-povezava pg-odstranke-nazaj" onClick={() => setOdStranke(false)}>← Nazaj na ustvarjanje pogodbe</button>
            <form onSubmit={saveUpload}>
              <div className="pg-polja">
                <label className="pg-polje">Naziv pogodbe
                  <input required name="title" type="text" placeholder="npr. Pogodba o sodelovanju 2026" />
                </label>
                <label className="pg-polje">Stranka
                  <input required name="client" type="text" placeholder="npr. Odvetniška družba Volk & Babica" />
                </label>
                <label className="pg-polje">Datum prejema
                  <input required name="date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} />
                </label>
                <label className="pg-polje">Projekt ali ponudba
                  <select name="sourceOfferId" defaultValue="">
                    <option value="">Brez povezave</option>
                    {offers.map(offer => <option key={offer.id} value={offer.id}>{offer.title} · {offer.client}</option>)}
                  </select>
                </label>
              </div>
              <label className="pg-polje pg-polje-obseg">PDF ali Word
                <input required name="file" type="file" accept=".pdf,.doc,.docx" />
              </label>
              <label className="pg-polje pg-polje-obseg">Opombe za pregled
                <textarea name="notes" rows={4} placeholder="Kaj moraš preveriti ali uskladiti?" />
              </label>
              <div className="pg-gumbi">
                <button type="submit" className="pg-gumb" aria-label="Shrani prejeto pogodbo">Shrani prejeto pogodbo</button>
              </div>
            </form>
          </>
        )}
      </section>
    </div>}

    {/* ── POGLED 2: DOKUMENT (samostojna stran — sredinski ozek stolpec, kot retainer) ── */}
    {pogled === 'dokument' && <section className="pg-sek pg-stran pg-stolpec">
      {/* jasna pot nazaj na vstopni korak — na vrhu, pred dokumentom */}
      <button type="button" className="pg-povezava pg-nazaj-vrh" onClick={() => setPogled('nastavitve')}>← Nazaj</button>
      {vir === 'ponudba' && karticaPonudbe(true)}
      <div className="pg-pon-vrh">
        <div className="pg-segpills" role="group" aria-label="Pogled">
          <button type="button" aria-label="Uredi" className={!predogledMode ? 'on' : ''} onClick={() => setPredogledMode(false)}><PencilSimple size={15} weight="bold" /> Uredi</button>
          <button type="button" aria-label="Predogled" className={predogledMode ? 'on' : ''} onClick={() => setPredogledMode(true)}><Eye size={16} /> Predogled</button>
        </div>
        {/* samo ikona, da gre vse v eno vrstico (enako kot retainer) */}
        {jeMobilni && !predogledMode && (
          <button type="button" className="pg-sheet-trig" onClick={() => setPonSheet(v => (v ? null : 'oblika'))} aria-label="Oblikovanje" title="Oblikovanje">
            <TextAa size={18} weight="bold" />
          </button>
        )}
      </div>

      {predogledMode ? (
        <div className="pg-predogled">
          {predStrani.length
            ? predStrani.map((u, i) => (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img key={i} className="pg-pred-stran" src={u} alt={`Stran ${i + 1}`} />
            ))
            : <div className="pg-pred-prazno">{predNal ? 'Pripravljam predogled …' : 'Predogled ni na voljo'}</div>}
          {predNal && predStrani.length > 0 && <div className="pg-pred-osvezi" role="status">Osvežujem …</div>}
        </div>
      ) : (
        <>
          {/* Orodjarna: kontrole so en fragment; na namizju inline, na mobilu
              slide-up predal V PORTALU na <body> — KOT RETAINER: position:fixed
              neha meriti na zaslon, ce ima katerikoli prednik transform/filter
              (tu animirana .pg-sek), zato sheet NE sme biti znotraj sekcije. */}
          {(() => {
            const orodjaKontrole = <>
              {oznaciNamig && <div className="pg-oznaci-namig" role="status">Najprej označi besedilo</div>}
              <div className="pg-tool-vel2" role="group" aria-label="Velikost besedila">
                <button type="button" className="pg-tool-krog" onMouseDown={e => { e.preventDefault(); velikost(-1); }} title="Manjše" aria-label="Pomanjšaj"><CaretDown size={14} weight="bold" /></button>
                <span className="pg-tv-aa" aria-hidden>Aa</span>
                <button type="button" className="pg-tool-krog" onMouseDown={e => { e.preventDefault(); velikost(1); }} title="Večje" aria-label="Povečaj"><CaretUp size={14} weight="bold" /></button>
              </div>
              <button type="button" className="pg-tool-krog" onMouseDown={e => { e.preventDefault(); oblikuj('bold'); }} title="Krepko" aria-label="Krepko"><TextB size={17} weight="bold" /></button>
              <button type="button" className="pg-tool-krog" onMouseDown={e => { e.preventDefault(); oblikuj('italic'); }} title="Ležeče" aria-label="Ležeče"><TextItalic size={17} /></button>
              <select className="pg-pisava-select" aria-label="Pisava besedila" defaultValue="" onMouseDown={() => editorRef.current?.focus()} onChange={e => { const v = e.target.value; if (v) uporabiPisavo(v); e.currentTarget.value = ''; }}>
                <option value="" disabled>Pisava</option>
                <option value="Bodoni Moda">Elegantna</option>
                <option value="Montserrat">Montserrat</option>
                <option value="Georgia">Georgia</option>
                <option value="Arial">Arial</option>
              </select>
              <button type="button" className="pg-tool-krog" onMouseDown={e => { e.preventDefault(); oblikuj('formatBlock', 'h1'); }} title="Naslov" aria-label="Naslov H1">H1</button>
              <button type="button" className="pg-tool-krog" onMouseDown={e => { e.preventDefault(); oblikuj('formatBlock', 'h2'); }} title="Podnaslov" aria-label="Podnaslov H2">H2</button>
              <button type="button" className="pg-tool-krog" onMouseDown={e => { e.preventDefault(); oblikuj('formatBlock', 'p'); }} title="Navadno besedilo" aria-label="Navadno besedilo P">P</button>
              <span className="pg-tool-locnica" aria-hidden />
              <button type="button" className="pg-barvica pg-barvica-mavrica" aria-label="Barva besedila (poljubna)" title="Barva besedila — poljubna" onMouseDown={e => { e.preventDefault(); barvaRef.current?.click(); }} />
              <input ref={barvaRef} type="color" hidden onChange={e => oblikuj('foreColor', e.target.value)} />
              <button type="button" className="pg-tool-krog" onMouseDown={e => { e.preventDefault(); oblikuj('hiliteColor', '#FCE38A'); }} onDoubleClick={e => { e.preventDefault(); oblikuj('hiliteColor', 'transparent'); }} title="Označi besedilo — dvojni klik odstrani" aria-label="Označi besedilo"><span className="pg-hl">T</span></button>
              <span className="pg-tool-locnica" aria-hidden />
              {/* priponka — dodatna priloga k pogodbi (npr. PDF specifikacije, slika, dodatek); ni del besedila pogodbe */}
              <button type="button" className={'pg-tool-krog' + (priponkaIme ? ' on' : '')} onClick={() => priponkaRef.current?.click()} title={priponkaIme ? 'Zamenjaj priponko' : 'Dodaj priponko'} aria-label={priponkaIme ? 'Zamenjaj priponko' : 'Dodaj priponko'}><Paperclip size={17} weight="bold" /></button>
              {priponkaIme && (
                <span className="pg-priponka-cip">
                  {priponkaPot ? (
                    <button type="button" className="pg-priponka-ime" onClick={odpriPriponko} title="Odpri priponko">{priponkaIme}</button>
                  ) : (
                    <span className="pg-priponka-ime">{priponkaIme}</span>
                  )}
                  <button type="button" onClick={odstraniPriponko} aria-label="Odstrani priponko" title="Odstrani priponko"><X size={11} weight="bold" /></button>
                </span>
              )}
              <input ref={priponkaRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx" hidden onChange={naloziPriponko} />
            </>;
            if (!jeMobilni) return <div className="pg-orodjarna" aria-label="Oblikovanje besedila">{orodjaKontrole}</div>;
            return typeof document !== 'undefined' ? createPortal(
              <>
                {ponSheet && <div className="pg-sheet-back" onClick={() => setPonSheet(null)} aria-hidden />}
                <div className={'pg-orodjarna pg-orodjarna-sheet' + (ponSheet ? ' odprt' : '')} aria-label="Oblikovanje besedila" aria-hidden={!ponSheet}>
                  <div className="pg-sheet-glava"><b>Oblikovanje</b><button type="button" className="pg-sheet-x" onClick={() => setPonSheet(null)} aria-label="Zapri">✕</button></div>
                  {orodjaKontrole}
                </div>
              </>,
              document.body,
            ) : null;
          })()}
          <div className="pg-editor-ovoj">
            {glavaHtml && <div className="pg-editor-glava" aria-hidden dangerouslySetInnerHTML={{ __html: glavaHtml }} />}
            <div ref={napolniEditor} className="pg-editor" contentEditable suppressContentEditableWarning onInput={() => setRocnoTelo(true)} onBlur={sinhronizirajEditor} />
            {nogaHtml && <div className="pg-editor-noga" aria-hidden dangerouslySetInnerHTML={{ __html: nogaHtml }} />}
            {/* ikonica za podpis — desno spodaj, ob podpisnih crtah (kot retainer) */}
            <button type="button" className="pg-podpis-trig" onClick={() => setPonSheet(v => v === 'podpis' ? null : 'podpis')} aria-label="Dodaj podpis" title="Dodaj podpis"><PenNib size={18} /></button>
          </div>
          {/* sheet Podpis: portal na <body> (fixed sidro), namizje + mobil — kot retainer */}
          {typeof document !== 'undefined' && createPortal(
            <>
              {ponSheet === 'podpis' && <div className="pg-sheet-back" onClick={() => setPonSheet(null)} aria-hidden />}
              <div className={'pg-podpis-sheet' + (ponSheet === 'podpis' ? ' odprt' : '')} role="dialog" aria-label="Podpis" aria-hidden={ponSheet !== 'podpis'}>
                <div className="pg-sheet-glava"><b>Podpis</b><button type="button" className="pg-sheet-x" onClick={() => setPonSheet(null)} aria-label="Zapri">✕</button></div>
                <div className="pg-podpis-vrsta" role="group" aria-label="Kam gre podpis">
                  <button type="button" aria-label="Podpis izvajalca" className={'pg-cip' + (podpisCilj === 'izvajalec' ? ' on' : '')} onClick={() => setPodpisCilj('izvajalec')}>Izvajalec</button>
                  <button type="button" aria-label="Podpis naročnika" className={'pg-cip' + (podpisCilj === 'narocnik' ? ' on' : '')} onClick={() => setPodpisCilj('narocnik')}>Naročnik</button>
                </div>
                <canvas ref={pripraviPlatno} className="pg-podpis-platno" onPointerDown={zacniRis} onPointerMove={risiPodpis} onPointerUp={koncajRis} onPointerCancel={koncajRis} />
                <div className="pg-podpis-akcije">
                  <button type="button" aria-label="Počisti podpis" className="pg-cip" onClick={pocistiPodpis}>Počisti</button>
                  <button type="button" aria-label="Vstavi podpis" className="pg-gumb" disabled={!narisano} onClick={vstaviNarisanPodpis}>Vstavi podpis</button>
                </div>
                <div className="pg-podpis-ali">ali</div>
                <button type="button" aria-label="Naloži sliko podpisa" className="pg-cip" onClick={() => podpisDatotekaRef.current?.click()}>Naloži sliko podpisa …</button>
                <input ref={podpisDatotekaRef} type="file" accept="image/*" hidden onChange={naloziPodpisSliko} />
              </div>
            </>,
            document.body,
          )}
          {rocnoTelo && (
            <p className="pg-mini" style={{ marginTop: '.5rem' }}>Besedilo je ročno urejeno in se ob spremembi vhodov ne posodablja več samodejno. <button type="button" className="pg-povezava" onClick={ponastaviTelo}>Povrni samodejno besedilo</button></p>
          )}
        </>
      )}

      <div className="pg-gumbi">
        <button type="button" className="pg-gumb" aria-label="Zaključi" onClick={() => setPogled('zakljucek')}>Zaključi →</button>
      </div>
      {napaka && <p className="pg-napaka">{napaka}</p>}
      <p className="pg-mini" style={{ marginTop: '.7rem' }}>Besedilo preveri; Pinart ne nadomešča pravnega svetovanja.</p>
    </section>}

    {/* ── POGLED 3: ZAKLJUCEK (prenos + posiljanje + shranjevanje) ── */}
    {pogled === 'zakljucek' && <section className="pg-sek pg-stran pg-stolpec pg-zakljucek">
      <div className="pg-zakljucek-lik" aria-hidden>
        <svg className="pon-lik" viewBox="0 0 120 140" fill="none" xmlns="http://www.w3.org/2000/svg">
          <ellipse className="pon-senca" cx="60" cy="133" rx="30" ry="4.5" fill="rgba(17,17,17,.12)" />
          <g className="pon-telo" fill="none" stroke="rgba(17,17,17,.46)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M36 16 h36 l18 18 v66 a6 6 0 0 1 -6 6 H36 a6 6 0 0 1 -6 -6 V22 a6 6 0 0 1 6 -6 z" />
            <path d="M72 16 v12 a6 6 0 0 0 6 6 h12" />
            <path d="M40 54 h40" /><path d="M40 66 h40" /><path d="M40 78 h26" />
            <g className="pon-kljuk-znak">
              <circle cx="78" cy="83" r="13" fill="#fff" stroke="none" />
              <circle cx="78" cy="83" r="13" fill="none" stroke="rgba(124,58,237,.7)" strokeWidth="2.6" />
              <path className="pon-kljuk" d="M71 83 l5 5 l9 -10" fill="none" stroke="rgba(124,58,237,.95)" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
            </g>
          </g>
        </svg>
      </div>
      <p className="pg-kicker">{VRSTE_POG.find(v => v.id === vrstaPog)!.kick}{vir === 'ponudba' && selectedOffer?.number ? ` · PONUDBA ŠT. ${selectedOffer.number}` : ''}</p>
      <h2 className="pg-naslov">Zaključek.{odvPoslano && <span className="pg-odvetnik-znak">Pri odvetniku</span>}</h2>
      <p className="pg-uvod">Prenesi pogodbo{narocnikIme() ? ' za ' + narocnikIme() : ''}, jo shrani ali pošlji naročniku.</p>
      <p className="pg-disc">Pripravljeno iz vzorčne predloge kot pripomoček — <b>ni pravni nasvet</b>. Pred podpisom priporočamo pregled pri odvetniku in prilagoditev konkretnemu poslu.</p>
      <div className="pg-konfeti-ovoj">
        <div className="pg-konfeti" key={konfetiKljuc}>
          {konfetiKljuc > 0 && Array.from({ length: 22 }).map((_, i) => {
            const barve = ['#EC4899', '#F1B7B3', '#B1C4FF', '#38BDF8', '#50E3C2', '#B25476', '#F59E0B'];
            const dx = Math.round(Math.cos(i * 2.39996323) * 240);
            const dy = 110 + (i % 5) * 46;
            const rot = (i % 2 ? 1 : -1) * (200 + (i % 4) * 80);
            const delay = (i % 6) * 0.045;
            const dur = 1.25 + (i % 4) * 0.2;
            return <span key={i} className="pg-konf-kos" style={{ background: barve[i % barve.length], animationDelay: `${delay}s`, animationDuration: `${dur}s`, ['--dx' as string]: `${dx}px`, ['--dy' as string]: `${dy}px`, ['--rot' as string]: `${rot}deg` } as React.CSSProperties} />;
          })}
        </div>
      </div>
      {napaka && <p className="pg-napaka">{napaka}</p>}
      {/* Pošiljanje pogodbe kar iz aplikacije (Resend) — isti HTML kot prenos/PDF. */}
      <PosljiBlok
        subject={VRSTE_POG.find(v => v.id === vrstaPog)!.label + (selectedOffer?.number ? ' št. ' + selectedOffer.number : '') + (narocnikIme() ? ' — ' + narocnikIme() : '')}
        zgradiHtml={() => doc(izvozniTelo())}
        privzetiPrejemnik={narEmail}
        imeStranke={narocnikIme()}
        replyTo={ponudnik.email.trim() || undefined}
        samoOgled={samoOgled}
        kontakti={strankaKontakti()}
        projektId={vir === 'ponudba' && selectedOffer ? selectedOffer.id : undefined}
      />
      {/* prenos-povezave POD blokom posiljanja (kot pri ponudbi) */}
      <div className="pg-prenosi">
        <button type="button" className="pg-povezava" aria-label="Shrani pogodbo" onClick={() => { shrani(); proslaviKonfeti(); }}>
          <FloppyDisk size={16} /> {shranjenaId ? 'Shranjeno ✓' : 'Shrani'}
        </button>
        <button type="button" className="pg-povezava" aria-label="Prenesi pogodbo PDF" disabled={pdfNalaganje} onClick={() => { prenesi(); proslaviKonfeti(); }}>
          <FilePdf size={16} /> {pdfNalaganje ? 'Pripravljam …' : 'Prenesi (PDF)'}
        </button>
      </div>
    </section>}

    {/* Noga FIKSNO na dnu strani (kot retainer/ponudba): puscica-krog + pilule.
        Izven animirane sekcije, da je position:fixed vezan na stran. */}
    {pogled === 'zakljucek' && <div className="pg-noga"><div className="pg-noga-gumbi">
      <button type="button" className="pg-noga-pill" onClick={() => setPogled('dokument')}>← Uredi pogodbo</button>
      <button type="button" className="pg-noga-pill nova" onClick={novaPogodba}>↺ Nova pogodba</button>
    </div></div>}

    {/* Odvetnik: mali banner v SPODNJEM DESNEM kotu strani (izven animirane sekcije,
        da je position:fixed vezan na stran/mrežo, ne na .pg-sek). */}
    {pogled === 'zakljucek' && <div className="pg-odvetnik">
      <span className="pg-odvetnik-label">Za odvetnika</span>
      <p className="pg-odvetnik-opis">Pošlji pogodbo odvetniku v pregled in podpis.</p>
      <input type="email" className="pg-odvetnik-vnos" value={odvetnikEmail} onChange={event => nastaviOdvetnika(event.target.value)} placeholder="odvetnik@pisarna.si" aria-label="E-pošta odvetnika" />
      <button type="button" className="pg-gumb pg-odvetnik-gumb" disabled={samoOgled || !jeVeljavenEmail(odvetnikEmail) || odvStatus === 'poslji'} onClick={posljiOdvetniku}><PenNib size={17} /> Pošlji odvetniku v pregled in podpis</button>
      {samoOgled && <p className="pg-odvetnik-namig">Na voljo v načinu »Moji podatki«.</p>}
      {odvStatus === 'poslji' && <p className="pg-odvetnik-status" role="status">Pošiljam …</p>}
      {odvStatus === 'ok' && <p className="pg-odvetnik-status pg-odvetnik-ok" role="status">Poslano odvetniku ✓</p>}
      {odvStatus === 'napaka' && <p className="pg-odvetnik-status pg-odvetnik-err" role="status">Napaka: {odvNapaka}</p>}
    </div>}

    {/* stili kot retainer: navaden <style> (globalno), zato pg- predpona povsod */}
    <style>{`
      .pg{min-width:0}
      .pg .pg-sek{min-width:0}
      .pg-sek{animation:pgSek .5s cubic-bezier(.16,1,.3,1) both}
      /* KONEC animacije mora biti transform:NONE (ne translateY(0)): vsak transform != none
         na sekciji naredi, da se position:fixed otrok sidra na sekcijo namesto na zaslon. */
      @keyframes pgSek{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:none}}
      /* izrazit slide-up (nova stran) za pogled dokument/zakljucek — kot rw-stran */
      .pg-sek.pg-stran{animation:pgStran .5s cubic-bezier(.16,1,.3,1) both}
      @keyframes pgStran{from{opacity:0;transform:translateY(60px)}to{opacity:1;transform:none}}
      @media (prefers-reduced-motion:reduce){.pg-sek,.pg-sek.pg-stran{animation:none}}
      /* pogled dokumenta/zakljucka: sredinski ozek stolpec kot retainer (.rw-vsebina).
         max-width namesto min(700px,92vw), ker je stars ozji od viewporta (stranski meni). */
      /* sredinski ozek stolpec SAMO za pogled dokumenta/zakljucka (kot retainer);
         landing (vstop + arhiv) ostane cez sirino delovnega prostora */
      .pg-stolpec{width:100%;max-width:700px;margin-left:auto;margin-right:auto}
      /* enotno vedenje kot Ponudba (KalkulatorApp .uvod-oder): prvo vprasanje/vstopni
         panel je navpicno na sredini vidnega polja (min-height glede na razpolozljivo
         visino + justify-content:center), ko se vsebina razsiri (izbira vira ipd.)
         pa naravno zraste in odteka navzgor + stran se skrola (brez position:fixed/
         overflow trikov — enaka mehanika kot pri Ponudbi). 8.25rem = FlowTopBar (3.25rem)
         + .workspace padding zgoraj/spodaj (3rem+2rem). */
      .pg-stolpec.pg-vstop{min-height:calc(100dvh - 8.25rem);display:flex;flex-direction:column;justify-content:center}
      @media (max-width:980px){.pg-stolpec.pg-vstop{min-height:calc(100dvh - 13rem)}}
      .pg-nazaj-vrh{margin:0 0 1rem}

      /* vstopni kicker+h1 (kot retainer rw-kicker/rw-h1) — naslov strani zdaj v ozkem .pg-stolpec, brez bele kartice */
      .pg-kicker{font-size:.78rem;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:var(--accent,#B25476);margin:0 0 .3rem}
      .pg-h1{font-family:var(--font-serif),Didot,serif;font-weight:500;font-size:clamp(1.7rem,3.4vw,2.4rem);line-height:1;letter-spacing:-.012em;margin:0 0 1.6rem;color:var(--ink)}
      .pg-naslov{margin:.35rem 0 1.1rem;font:500 clamp(1.7rem,3.4vw,2.4rem)/1 var(--font-serif),Didot,serif;letter-spacing:-.012em;color:var(--ink);overflow-wrap:anywhere}
      .pg-uvod{margin:0 0 1.4rem;font-size:.92rem;line-height:1.55;color:rgba(17,17,17,.72);max-width:34rem}
      .pg-zakljucek-lik{display:flex;justify-content:center;margin:.5rem 0 1.1rem}
      .pg-zakljucek-lik .pon-lik{width:8.4rem;height:auto;display:block;overflow:visible}
      .pg-zakljucek-lik .pon-telo{transform-box:view-box;transform-origin:60px 128px;animation:pgPonFloat 3.4s ease-in-out infinite}
      .pg-zakljucek-lik .pon-senca{transform-box:view-box;transform-origin:60px 133px;animation:pgPonSenca 3.4s ease-in-out infinite}
      .pg-zakljucek-lik .pon-kljuk-znak{transform-box:fill-box;transform-origin:center;animation:pgKljukPop .5s cubic-bezier(.2,1.5,.4,1) .45s both}
      .pg-zakljucek-lik .pon-kljuk{stroke-dasharray:26;stroke-dashoffset:26;animation:pgKljukRis .38s ease-out .8s forwards}
      @keyframes pgPonFloat{0%,100%{transform:translateY(0) rotate(-1.6deg)}50%{transform:translateY(-8px) rotate(1.6deg)}}
      @keyframes pgPonSenca{0%,100%{transform:scale(1);opacity:.9}50%{transform:scale(.82);opacity:.6}}
      @keyframes pgKljukPop{0%{transform:scale(0)}62%{transform:scale(1.18)}100%{transform:scale(1)}}
      @keyframes pgKljukRis{to{stroke-dashoffset:0}}
      @media (prefers-reduced-motion:reduce){.pg-zakljucek-lik .pon-telo,.pg-zakljucek-lik .pon-senca,.pg-zakljucek-lik .pon-kljuk-znak,.pg-zakljucek-lik .pon-kljuk{animation:none}.pg-zakljucek-lik .pon-kljuk{stroke-dashoffset:0}}
      .pg-zakljucek .pg-kicker,.pg-zakljucek .pg-naslov,.pg-zakljucek .pg-uvod{text-align:center}
      .pg-zakljucek .pg-uvod{margin-left:auto;margin-right:auto}
      .pg-prenosi{display:flex;flex-wrap:wrap;justify-content:center;gap:.9rem 1.6rem;margin:1.2rem 0 .4rem}
      .pg-disc{margin:-.4rem auto 1.4rem;padding:.7rem .95rem;max-width:34rem;text-align:center;font-size:.76rem;line-height:1.5;color:rgba(17,17,17,.66);background:oklch(97% .02 85);border:1px solid oklch(92% .03 82 / .7);border-radius:.7rem}
      .pg-disc b{color:rgba(17,17,17,.82)}

      /* chat mehurcek vstopnega vprasanja — isti videz kot RetainerWorkspace .rw-chat/.rw-mehur */
      .pg-chat{display:flex;align-items:flex-start;gap:.55rem;max-width:90%;margin:0 0 1.2rem}
      .pg-mehur{position:relative;background:#F7F2FF;border:1px solid rgba(185,160,230,.2);border-radius:18px;border-bottom-left-radius:5px;padding:.85rem 1.25rem .85rem 2.75rem;box-shadow:0 2px 10px rgba(40,25,40,.05)}
      .pg-mehur::before{content:"";position:absolute;left:.9rem;top:.95rem;width:1.3rem;height:1.3rem;border-radius:50%;background:radial-gradient(58% 48% at 30% 24%,rgba(255,255,255,.92),rgba(255,255,255,0) 62%),conic-gradient(from 210deg,#7C3AED,#EC4899,#F59E0B,#38BDF8,#7C3AED);box-shadow:0 2px 6px rgba(124,58,237,.28)}
      .pg-mehur b{display:block;color:var(--ink);font-weight:600;font-size:1.02rem}
      .pg-mehur small{display:block;margin-top:.1rem;color:rgba(17,17,17,.64);font-size:.82rem}
      .pg-zakljucek{background:transparent;border:0;border-radius:0;padding:1.6rem 1.7rem 6rem;box-shadow:none}

      /* vstopna forma (pilule+polja+gumb) v beli kartici — naslov+chat ostaneta na papirju nad njo */
      .pg-vstop-panel{background:#fff;border:1px solid rgba(17,17,17,.08);border-radius:20px;padding:1.6rem 1.5rem;box-shadow:0 12px 40px rgba(20,16,26,.05)}

      .pg-segpills{display:inline-flex;background:rgba(255,255,255,.55);border:1px solid rgba(17,17,17,.1);border-radius:999px;padding:.3rem;gap:.45rem;margin:0 0 1.1rem}
      .pg-segpills button{border:none;background:transparent;color:var(--ink);font-family:inherit;font-weight:700;font-size:.72rem;letter-spacing:.03em;text-transform:uppercase;padding:.46rem .9rem;border-radius:999px;cursor:pointer;white-space:nowrap;display:inline-flex;align-items:center;gap:.35rem;transition:background .18s,color .18s}
      .pg-segpills button.on{background:var(--ink);color:var(--paper)}

      /* preklop vrste dokumenta (Pogodba o sodelovanju | NDA) — dve pilули, akcent za aktivno,
         da se locita od izbire vira (ta uporablja ink) */
      .pg-vrstapog{display:inline-flex;flex-wrap:wrap;background:rgba(255,255,255,.55);border:1px solid rgba(178,84,118,.28);border-radius:999px;padding:.3rem;gap:.45rem;margin:0 0 1rem}
      .pg-vrstapog button{border:none;background:transparent;color:var(--ink);font-family:inherit;font-weight:700;font-size:.72rem;letter-spacing:.03em;text-transform:uppercase;padding:.46rem 1rem;border-radius:999px;cursor:pointer;white-space:nowrap;transition:background .18s,color .18s}
      .pg-vrstapog button.on{background:var(--accent,#B25476);color:#fff}

      /* vklop/izklop opcijskih clenov — majhne pilule-stikala v istem jeziku kot .pg-segpills */
      .pg-klavzule{margin:0 0 1rem}
      .pg-klavzule-label{display:block;font-size:.66rem;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:rgba(17,17,17,.5);margin:0 0 .5rem}
      .pg-klavzule-pilule{display:flex;flex-wrap:wrap;gap:.4rem}
      .pg-segpills-mini{border:1px solid rgba(17,17,17,.18);background:rgba(255,255,255,.5);color:var(--ink);font-family:inherit;font-weight:600;font-size:.72rem;letter-spacing:.01em;padding:.34rem .72rem;border-radius:999px;cursor:pointer;white-space:nowrap;transition:background .16s,color .16s,border-color .16s}
      .pg-segpills-mini:hover{border-color:var(--ink)}
      .pg-segpills-mini.on{background:var(--ink);color:var(--paper);border-color:var(--ink)}

      .pg-polja{display:grid;grid-template-columns:1fr 1fr;gap:1.1rem 1.5rem;margin:0 0 1.1rem;min-width:0}
      .pg-polja>*{min-width:0}
      .pg-polja-email{grid-template-columns:minmax(0,26rem);margin-top:.4rem}
      .pg-polje{display:flex;flex-direction:column;gap:.35rem;font-size:.7rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:rgba(17,17,17,.62)}
      .pg-polje input,.pg-polje select,.pg-polje textarea{width:100%;max-width:100%;min-width:0;font:inherit;font-size:.95rem;font-weight:600;letter-spacing:0;text-transform:none;color:var(--ink);background:rgba(255,255,255,.85);border:1px solid oklch(93% .006 82 / .55);border-radius:10px;padding:.6rem .75rem}
      .pg-polje input:focus,.pg-polje select:focus,.pg-polje textarea:focus{outline:none;border-color:var(--ink)}
      .pg-polje textarea{resize:vertical;min-height:6.5rem;line-height:1.5;font-weight:500}
      .pg-polje-obseg{margin:0 0 1.1rem}

      /* ── vstopni iskalen combobox (izbira ponudbe) — enak vzorec kot InvoiceWorkspace rc-combo* ──
         sprozilec izgleda kot polje, panel z iskalnikom + seznam opcij se odpre pod njim (position:absolute) */
      .pg-combo-polje{min-width:0}
      .pg-combo{position:relative}
      .pg-combo-sprozilec{display:flex;align-items:center;justify-content:space-between;gap:.6rem;width:100%;min-width:0;font:inherit;font-size:.95rem;font-weight:600;letter-spacing:0;text-transform:none;color:var(--ink);background:rgba(255,255,255,.85);border:1px solid oklch(93% .006 82 / .55);border-radius:10px;padding:.6rem .75rem;text-align:left;cursor:pointer}
      .pg-combo-sprozilec:focus{outline:none;border-color:var(--ink)}
      .pg-combo-sprozilec>span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      .pg-combo-sprozilec svg{flex:none}
      .pg-combo-panel{position:absolute;top:calc(100% + .35rem);left:0;right:0;z-index:40;background:#fff;border:1px solid oklch(93% .006 82 / .55);border-radius:14px;box-shadow:0 16px 44px rgba(20,16,26,.16);padding:.55rem;text-transform:none;letter-spacing:0}
      /* visja specificnost (.pg-combo ...), da premaga .pg-polje input in ostane pilula */
      .pg-combo .pg-combo-iskalnik{width:100%;box-sizing:border-box;font:inherit;font-size:16px;font-weight:500;color:var(--ink);background:rgba(255,255,255,.9);border:1px solid oklch(93% .006 82 / .55);border-radius:999px;padding:.5rem .9rem;margin:0 0 .35rem}
      .pg-combo .pg-combo-iskalnik:focus{outline:none;border-color:var(--ink)}
      .pg-combo-seznam{display:flex;flex-direction:column;max-height:15rem;overflow-y:auto}
      .pg-combo-opcija{display:flex;align-items:center;gap:.7rem;width:100%;min-height:2.7rem;padding:.5rem;border:none;border-bottom:1px solid rgba(17,17,17,.07);background:none;font:inherit;color:var(--ink);text-align:left;cursor:pointer;border-radius:8px}
      .pg-combo-opcija:last-child{border-bottom:none}
      .pg-combo-opcija:hover{background:rgba(17,17,17,.04)}
      .pg-combo-naziv{flex:1;min-width:0}
      .pg-combo-naziv strong{display:block;font-size:.9rem;font-weight:600;overflow-wrap:anywhere}
      .pg-combo-opcija.on .pg-combo-naziv strong{font-weight:800}
      .pg-combo-naziv small{display:block;margin-top:.1rem;font-size:.74rem;color:rgba(17,17,17,.55)}
      .pg-combo-kljukica{flex:none;display:grid;place-items:center;width:1.5rem;height:1.5rem;border-radius:50%;background:var(--ink);color:var(--paper);font-size:.8rem}
      .pg-combo-prazno{padding:.8rem .5rem}
      .pg-combo-namig{margin:.5rem .3rem .1rem;font-size:.72rem;color:var(--muted)}
      /* povezava do poti "Od stranke" pod glavnim gumbom + nazaj iz nje */
      .pg-odstranke-link{margin-top:1rem}
      .pg-odstranke-nazaj{margin:0 0 1.1rem}

      .pg-namig{margin:0 0 1.2rem;padding:.8rem 1rem;border:1px dashed rgba(178,84,118,.45);border-radius:12px;background:rgba(178,84,118,.06);font-size:.85rem;line-height:1.5;color:rgba(17,17,17,.75)}
      .pg-namig a{color:var(--accent,#B25476);font-weight:600;text-decoration:underline;text-underline-offset:.22em;white-space:nowrap}

      /* klikabilna kartica ponudbe (vir dogovora) */
      .pg-kponudba{border:1px solid oklch(93% .006 82 / .55);border-radius:14px;background:rgba(255,255,255,.72);margin:0 0 1.2rem;overflow:hidden;min-width:0}
      .pg-kp-glava{display:flex;align-items:center;gap:.75rem;width:100%;padding:.8rem .95rem;border:none;background:none;font:inherit;color:var(--ink);text-align:left;cursor:pointer;min-width:0}
      .pg-kp-glava:hover strong{text-decoration:underline;text-underline-offset:.2rem}
      .pg-kp-ikona{display:grid;place-items:center;width:2.1rem;height:2.1rem;border-radius:50%;background:oklch(92% .055 163);color:oklch(48% .14 164);flex:none}
      .pg-kp-info{flex:1;min-width:0}
      .pg-kp-info strong{display:block;font-size:.95rem;font-weight:700;overflow-wrap:anywhere}
      .pg-kp-info small{display:block;margin-top:.12rem;font-size:.78rem;color:rgba(17,17,17,.58);overflow-wrap:anywhere}
      .pg-kp-kazalec{display:grid;place-items:center;width:1.7rem;height:1.7rem;border-radius:50%;background:rgba(17,17,17,.06);color:var(--ink);flex:none}
      .pg-kp-vec{padding:.15rem .95rem 1rem;border-top:1px dashed rgba(17,17,17,.12)}
      .pg-kp-vec ul{margin:.7rem 0 .8rem;padding-left:1.15rem;font-size:.85rem;line-height:1.55;color:rgba(17,17,17,.8)}
      .pg-kp-vec li{margin:.15rem 0}
      .pg-kp-strnjena{background:#FCFBF7;box-shadow:0 4px 14px rgba(17,17,17,.05);margin-bottom:1rem}

      .pg-gumbi{display:flex;flex-wrap:wrap;gap:.8rem;margin-top:1.3rem;min-width:0}
      /* navadno besedilo s kljukico namesto ločenega gumba »+ ponudba« */
      .pg-checkbox{display:inline-flex;align-items:center;gap:.5rem;font-size:.82rem;color:var(--ink);cursor:pointer;user-select:none}
      .pg-checkbox input{width:1.05rem;height:1.05rem;accent-color:var(--accent,#B25476);cursor:pointer}
      .pg-gumb{position:relative;overflow:hidden;display:inline-flex;align-items:center;gap:.5rem;border:none;border-radius:999px;padding:.85rem 1.6rem;font:inherit;font-weight:600;font-size:.95rem;cursor:pointer;background:var(--ink);color:var(--paper);transition:transform .2s,opacity .2s}
      .pg-gumb:hover{transform:translateY(-2px)}
      .pg-gumb.sek{background:transparent;color:var(--ink);border:1px solid rgba(17,17,17,.28)}
      .pg-gumb:disabled{opacity:.5;cursor:default;transform:none}
      .pg-konfeti-ovoj{position:relative;height:0}
      .pg-konfeti{position:absolute;left:0;right:0;top:0;height:0;pointer-events:none;z-index:4}
      .pg-konf-kos{position:absolute;left:50%;top:0;width:.5rem;height:.78rem;border-radius:1px;opacity:0;will-change:transform,opacity;animation-name:pgKonfPok;animation-timing-function:cubic-bezier(.22,.7,.32,1);animation-fill-mode:forwards}
      @keyframes pgKonfPok{
        0%{opacity:0;transform:translate(-50%,0) rotate(0) scale(.5)}
        12%{opacity:1}
        38%{transform:translate(calc(-50% + var(--dx) * .55),calc(var(--dy) * -.45)) rotate(calc(var(--rot) * .4)) scale(1)}
        100%{opacity:0;transform:translate(calc(-50% + var(--dx)),var(--dy)) rotate(var(--rot)) scale(.95)}
      }
      @media (prefers-reduced-motion: reduce) { .pg-konfeti{display:none} }
      .pg-povezava{font-family:inherit;font-size:.88rem;font-weight:500;cursor:pointer;border:none;background:none;color:var(--ink);text-decoration:underline;text-decoration-thickness:1px;text-underline-offset:.28em;padding:0;display:inline-flex;align-items:center;gap:.38rem}
      .pg-povezava:hover{opacity:.6}
      /* Odvetnik: umirjen blok pod pošiljanjem naročniku — tanek okvir, isti jezik kot .pg-disc/.pg-polje */
      /* odvetnik = mali banner na DESNEM robu zaslona, stran od obrazca */
      .pg-odvetnik{position:fixed;right:1.2rem;bottom:6.5rem;top:auto;width:15rem;max-width:38vw;margin:0;padding:1rem 1.05rem 1.1rem;border:1px solid oklch(93% .006 82 / .55);border-radius:16px;background:rgba(255,255,255,.72);backdrop-filter:blur(5px);text-align:left;z-index:30;box-shadow:0 .6rem 1.6rem rgba(20,20,20,.08)}
      @media (max-width:1160px){.pg-odvetnik{position:static;width:auto;max-width:560px;margin:1.4rem auto 0;backdrop-filter:none}}
      .pg-odvetnik-label{display:block;font-size:.62rem;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--accent)}
      .pg-odvetnik .pg-odvetnik-gumb{width:100%;justify-content:center;background:var(--accent);color:#fff;border:0;box-shadow:0 .4rem 1rem oklch(66% .2 297 / .3);font-size:.82rem;letter-spacing:.02em;text-transform:none;padding:.7rem 1rem;margin-top:.2rem}
      .pg-odvetnik .pg-odvetnik-gumb:hover:not(:disabled){filter:brightness(1.06)}
      .pg-odvetnik-opis{margin:.4rem 0 .7rem;font-size:.74rem;line-height:1.45;color:rgba(17,17,17,.66)}
      .pg-odvetnik-vnos{width:100%;max-width:100%;min-width:0;font:inherit;font-size:.82rem;color:var(--ink);background:rgba(255,255,255,.85);border:1px solid oklch(93% .006 82 / .55);border-radius:10px;padding:.5rem .65rem;margin-bottom:.65rem}
      .pg-odvetnik-vnos:focus{outline:none;border-color:var(--ink)}
      .pg-odvetnik-vnos::placeholder{color:rgba(17,17,17,.4)}
      .pg-odvetnik-namig{margin:.55rem 0 0;font-size:.78rem;color:rgba(17,17,17,.5)}
      .pg-odvetnik-status{margin:.6rem 0 0;font-size:.85rem;color:rgba(17,17,17,.72)}
      .pg-odvetnik-ok{color:#1f7a4d}
      .pg-odvetnik-err{color:#b23434}
      .pg-odvetnik-znak{display:inline-block;vertical-align:middle;margin-left:.7rem;font-family:var(--font-sans),system-ui,sans-serif;font-size:.6rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#1f7a4d;background:oklch(95% .05 155);border:1px solid oklch(82% .1 155);border-radius:999px;padding:.22rem .6rem}
      .pg-noga{position:fixed;bottom:0;left:17.5rem;right:0;display:flex;justify-content:center;padding:1rem clamp(1.2rem,4vw,3rem) 1.1rem;background:linear-gradient(to top,var(--paper) 70%,transparent);z-index:40}
      :global(body[data-meni='zaprt']) .pg-noga{left:4.4rem}
      @media (max-width:980px){.pg-noga{left:0}}
      .pg-noga-gumbi{display:flex;align-items:center;justify-content:center;gap:.8rem;flex-wrap:wrap}
      .pg-koncna-krog{display:grid;place-items:center;width:2.9rem;height:2.9rem;flex:none;border-radius:50%;border:1px solid var(--ink);background:none;color:var(--ink);cursor:pointer;transition:background .18s ease,color .18s ease,transform .2s cubic-bezier(.23,1,.32,1)}
      .pg-koncna-krog:hover{background:var(--ink);color:var(--paper);transform:translateY(-2px)}
      .pg-noga-pill{font-family:inherit;font-size:.82rem;font-weight:600;letter-spacing:.12em;text-transform:uppercase;cursor:pointer;color:rgba(17,17,17,.78);border:1px solid var(--ink);border-radius:999px;padding:.75rem 1.4rem;background:none;transition:background .18s ease,color .18s ease,transform .2s cubic-bezier(.23,1,.32,1)}
      .pg-noga-pill:hover{background:var(--ink);color:var(--paper);transform:translateY(-2px)}
      .pg-noga-pill.nova{color:var(--accent);border-color:var(--accent)}
      .pg-noga-pill.nova:hover{background:var(--accent);color:var(--paper)}
      .pg-mini{font-size:.8rem;color:rgba(17,17,17,.55)}
      .pg-napaka{color:#b23434;font-size:.86rem;margin:.6rem 0 0;text-align:center}
      .pg-cip{padding:.42rem .8rem;border:1px solid rgba(17,17,17,.2);border-radius:999px;background:rgba(255,255,255,.5);cursor:pointer;font:inherit;font-size:.86rem;color:var(--ink);transition:border-color .15s,background .15s,color .15s}
      .pg-cip:hover{border-color:var(--ink)}
      .pg-cip.on{border-color:var(--accent,#B25476);background:var(--accent,#B25476);color:#fff;font-weight:600}

      /* UREDI/PREDOGLED vrh + orodjarna + urejevalnik — KOPIJA retainerja (rw- -> pg-) */
      .pg-pon-vrh{display:flex;flex-wrap:wrap;align-items:center;gap:.5rem;margin:.2rem 0 .4rem}
      .pg-pon-vrh .pg-segpills{margin:0}
      /* ena vrstica (ne ovija) — vodoravni drs, ce orodij ni malo (npr. z odprto priponko) */
      .pg-orodjarna{position:relative;display:flex;flex-wrap:nowrap;overflow-x:auto;gap:.45rem;align-items:center;margin:1rem 0 .8rem;-webkit-overflow-scrolling:touch}
      .pg-orodjarna > *{flex:none}
      .pg-sheet-trig{display:inline-flex;align-items:center;justify-content:center;width:2.5rem;height:2.5rem;padding:0;border:1px solid rgba(17,17,17,.22);border-radius:999px;background:var(--paper);color:var(--ink);cursor:pointer}
      .pg-sheet-back{position:fixed;inset:0;background:rgba(30,18,35,.34);z-index:95}
      .pg-sheet-glava{position:relative;display:flex;align-items:center;justify-content:space-between;width:100%;padding:1.35rem 1.2rem .65rem;border-bottom:1px solid rgba(17,17,17,.1)}
      .pg-sheet-glava::before{content:'';position:absolute;top:.5rem;left:50%;transform:translateX(-50%);width:2.4rem;height:.3rem;border-radius:999px;background:rgba(17,17,17,.18)}
      .pg-sheet-glava b{font-size:1.05rem;font-weight:700}
      .pg-sheet-x{width:2.1rem;height:2.1rem;display:inline-flex;align-items:center;justify-content:center;border:none;background:rgba(17,17,17,.06);border-radius:50%;font-size:1.1rem;line-height:1;color:var(--ink);cursor:pointer}
      .pg-oznaci-namig{position:absolute;top:-2.5rem;left:1rem;background:var(--ink);color:var(--paper);font-size:.8rem;font-weight:600;padding:.4rem .85rem;border-radius:999px;white-space:nowrap;box-shadow:0 8px 22px rgba(17,17,17,.22);z-index:6;pointer-events:none}
      .pg-tool-krog{width:2.6rem;height:2.6rem;border-radius:50%;border:none;background:rgba(17,17,17,.06);color:var(--ink);font-family:inherit;font-weight:700;font-size:.82rem;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;padding:0;transition:background .15s,color .15s}
      .pg-tool-krog:hover{background:var(--ink);color:var(--paper)}
      .pg-tool-krog.on{background:var(--ink);color:var(--paper)}
      .pg-tool-vel2{display:inline-flex;align-items:center;gap:.3rem}
      .pg-tool-vel2 .pg-tv-aa{font-weight:700;font-size:.9rem}
      .pg-tool-locnica{width:1px;height:1.7rem;background:rgba(17,17,17,.16);margin:0 .2rem}
      .pg-hl{font-weight:800;font-size:.9rem;line-height:1;background:#FCE38A;border-radius:2px;padding:0 .18em}
      /* priponka: ime + gumb za odstranitev, ob gumbu za dodajanje priponke v orodjarni */
      .pg-priponka-cip{display:inline-flex;align-items:center;gap:.35rem;max-width:11rem;padding:.3rem .3rem .3rem .65rem;border-radius:999px;background:rgba(17,17,17,.06);font-size:.78rem}
      .pg-priponka-cip .pg-priponka-ime{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:8rem;border:none;background:none;padding:0;font:inherit;color:var(--ink);cursor:pointer;text-align:left}
      .pg-priponka-cip button.pg-priponka-ime{text-decoration:underline;text-underline-offset:.18em}
      .pg-priponka-cip>button:last-child{display:inline-flex;align-items:center;justify-content:center;width:1.3rem;height:1.3rem;border:none;border-radius:50%;background:rgba(17,17,17,.08);color:rgba(17,17,17,.6);cursor:pointer;flex:none;padding:0}
      .pg-priponka-cip>button:last-child:hover{background:var(--ink);color:var(--paper)}
      .pg-pisava-select{min-height:2.25rem;border:1px solid rgba(17,17,17,.22);background-color:rgba(255,255,255,.32);color:var(--ink);border-radius:999px;padding:0 1.7rem 0 .9rem;font-family:inherit;font-weight:600;font-size:.78rem;cursor:pointer;appearance:none;-webkit-appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8'%3E%3Cpath d='M1 1l5 5 5-5' fill='none' stroke='%23111' stroke-width='1.5'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right .7rem center}
      .pg-barvica{width:1.35rem;height:1.35rem;border-radius:999px;border:1px solid rgba(17,17,17,.22);cursor:pointer;padding:0}
      .pg-barvica-mavrica{background:conic-gradient(from 0deg,#FA4892,#F8E71C,#50E3C2,#7C3AED,#FA4892);border-color:rgba(17,17,17,.25)}

      /* BELO POLJE = ovoj (glava + telo + noga vsi znotraj enega belega lista, kot prava stran) */
      .pg-editor-ovoj{position:relative;min-width:0;background:#fff;border:1px solid rgba(17,17,17,.22);border-radius:6px;padding:1.6rem 1.6rem 1.4rem}
      .pg-editor-ovoj .pg-editor{background:transparent;border:0;border-radius:0;padding:0;min-height:280px}
      .pg-editor-ovoj .pg-editor:focus{border:0}
      /* noga (besedilo iz Nastavitev) na dnu belega lista */
      .pg-editor-noga{margin-top:1.5rem;padding-top:.75rem;border-top:1px solid oklch(93% .006 82 / .55);font-size:.74rem;color:var(--muted);line-height:1.55}
      /* letterhead (glava z logotipom) nad urejevalnikom — enak videz kot v izvozu, a v barvah aplikacije */
      .pg-editor-glava{margin:0 0 1.3rem;padding-bottom:.85rem;border-bottom:1.5px solid var(--accent,#B25476)}
      .pg-editor-glava .lg{display:flex;justify-content:space-between;align-items:flex-start;gap:1.5rem}
      .pg-editor-glava .lg b{font-size:1.02rem;font-weight:700}
      .pg-editor-glava .lg .rt{font-family:'Bodoni Moda',Didot,Georgia,serif;font-size:1.2rem;color:var(--ink)}
      .pg-editor-glava .lg .lg-logo{max-height:54px;max-width:190px;object-fit:contain;display:block}
      .pg-editor-glava .mut{color:var(--muted);font-size:.74rem;line-height:1.5}
      .pg-podpis-trig{position:absolute;right:.65rem;bottom:.65rem;width:2.5rem;height:2.5rem;border-radius:50%;border:1px solid rgba(17,17,17,.22);background:var(--paper);color:var(--ink);display:inline-flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 6px 18px rgba(17,17,17,.14);z-index:2;transition:background .15s,color .15s}
      .pg-podpis-trig:hover{background:var(--ink);color:var(--paper)}
      .pg-podpis-sheet{position:fixed;left:50%;bottom:0;transform:translate(-50%,102%);width:min(480px,100vw);z-index:96;background:var(--paper);border-radius:20px 20px 0 0;box-shadow:0 -16px 44px rgba(40,25,40,.22);transition:transform .32s cubic-bezier(.2,.8,.3,1);max-height:82dvh;overflow-y:auto;padding:0 1.2rem calc(1.4rem + env(safe-area-inset-bottom,0px))}
      .pg-podpis-sheet.odprt{transform:translate(-50%,0)}
      @media (prefers-reduced-motion:reduce){.pg-podpis-sheet{transition:none}}
      .pg-podpis-vrsta{display:flex;gap:.5rem;margin:1rem 0 .7rem}
      .pg-podpis-platno{display:block;width:100%;height:170px;border:1px dashed rgba(17,17,17,.3);border-radius:12px;background:#fff;touch-action:none;cursor:crosshair}
      .pg-podpis-akcije{display:flex;gap:.6rem;margin-top:.8rem;flex-wrap:wrap;align-items:center}
      .pg-podpis-ali{margin:1rem 0 .6rem;font-size:.72rem;color:rgba(17,17,17,.5);text-transform:uppercase;letter-spacing:.14em;font-weight:700}

      .pg-editor,.pg-doktelo{width:100%;min-width:0;border:1px solid rgba(17,17,17,.22);background:#fff;padding:1.35rem;color:var(--ink);font-family:var(--font-sans),system-ui,sans-serif;font-size:.94rem;line-height:1.62;overflow:auto;border-radius:6px}
      .pg-editor{min-height:340px}
      .pg-editor:focus{outline:none;border-color:var(--ink)}
      .pg-editor h1,.pg-doktelo h1{margin:0 0 .6rem;font-family:var(--font-serif),Didot,serif;font-size:clamp(1.5rem,3.4vw,2.1rem);line-height:1.05;font-weight:400}
      .pg-editor h2,.pg-doktelo h2{margin:1.2rem 0 .4rem;font-size:.74rem;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:var(--accent,#B25476)}
      .pg-editor p,.pg-doktelo p{margin:0 0 .7rem;max-width:70ch}
      .pg-editor b,.pg-editor strong,.pg-doktelo b,.pg-doktelo strong{font-weight:800}
      .pg-editor ul,.pg-doktelo ul{margin:.2rem 0 .9rem;padding-left:1.2rem;list-style:disc}
      .pg-editor li,.pg-doktelo li{margin:.2rem 0}
      .pg-editor .kick,.pg-doktelo .kick{font-size:.7rem;letter-spacing:.2em;text-transform:uppercase;color:var(--accent,#B25476);font-weight:700;margin-bottom:.3rem}
      .pg-editor .meta,.pg-doktelo .meta{color:#666;font-size:.85rem;margin:.1rem 0 .6rem}
      .pg-editor .mut,.pg-doktelo .mut{color:#8a8177;font-size:.82rem}
      .pg-editor .pog-clen,.pg-doktelo .pog-clen{margin:.7rem 0}
      .pg-editor .pog-clen h2,.pg-doktelo .pog-clen h2{margin:.6rem 0 .2rem}
      .pg-editor .parties p,.pg-doktelo .parties p{margin:.1rem 0}
      .pg-editor .sig,.pg-doktelo .sig{display:flex;gap:2.5rem;margin-top:1.4rem}
      .pg-editor .sig>div,.pg-doktelo .sig>div{flex:1;font-size:.85rem;color:#444}
      .pg-editor .sig .lin,.pg-doktelo .sig .lin{display:block;border-top:1px solid #111;margin:2rem 0 .3rem}
      .pg-editor .podpis-img,.pg-doktelo .podpis-img{display:block;max-height:52px;max-width:200px;margin:0 0 -8px}
      /* letterhead se v telesu ne pojavi (doda ga PDF), a ce je v starem HTML zapisu, naj bo urejen */
      .pg-doktelo .lg{display:flex;justify-content:space-between;gap:1.4rem;padding-bottom:.7rem;border-bottom:1.5px solid #B25476;margin-bottom:1.1rem}
      .pg-doktelo{flex:1 1 auto;min-height:0;margin:1rem 0 0;font-size:.86rem}

      .pg-predogled{position:relative;width:100%;margin-top:1rem;background:#e9e6e0;border:1px solid oklch(93% .006 82 / .55);border-radius:14px;padding:20px;display:flex;flex-direction:column;align-items:center;gap:18px;box-shadow:inset 0 1px 6px rgba(20,20,20,.06)}
      .pg-pred-stran{width:100%;max-width:794px;height:auto;display:block;box-shadow:0 6px 22px rgba(20,20,20,.14);border-radius:2px}
      .pg-pred-prazno{color:rgba(17,17,17,.5);font-size:.9rem;padding:2.5rem 0}
      .pg-pred-osvezi{position:absolute;top:10px;right:12px;font-size:.72rem;color:rgba(17,17,17,.55);background:rgba(255,255,255,.72);padding:.2rem .55rem;border-radius:999px}

      /* ── mobil: NIC ne sme cez desni rob pri 390px (kot retainer) ── */
      @media (max-width:640px){
        .pg-chat{max-width:100%}
        .pg-vstop-panel{padding:1.2rem 1.1rem;border-radius:16px}
        .pg-polja{grid-template-columns:1fr;gap:1rem}
        .pg-zakljucek{padding:1.2rem 1rem 1.3rem}
        .pg-editor,.pg-editor h1,.pg-editor h2,.pg-editor p,.pg-editor li,.pg-doktelo,.pg-doktelo h1,.pg-doktelo h2,.pg-doktelo p,.pg-doktelo li{overflow-wrap:anywhere}
        /* podpisni stolpci se na ozkem zaslonu zlozijo navpicno (kot retainer) */
        .pg-editor .sig,.pg-doktelo .sig{flex-direction:column;gap:1.2rem}
        .pg-orodjarna.pg-orodjarna-sheet{position:fixed;left:0;right:0;bottom:0;z-index:96;margin:0;max-height:76dvh;overflow-y:auto;padding:0 1.2rem calc(1.5rem + env(safe-area-inset-bottom,0px));background:var(--paper);border-radius:20px 20px 0 0;box-shadow:0 -16px 44px rgba(40,25,40,.22);transform:translateY(102%);transition:transform .32s cubic-bezier(.2,.8,.3,1)}
        .pg-orodjarna.pg-orodjarna-sheet.odprt{transform:translateY(0)}
        .pg-orodjarna.pg-orodjarna-sheet > *:not(.pg-sheet-glava){margin-top:.55rem}
        .pg-gumbi{gap:.6rem}
        .pg-gumb{padding:.8rem 1.25rem}
      }
    `}</style>
  </div>;
}
