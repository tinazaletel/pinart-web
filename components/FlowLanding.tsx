'use client';

import {
  FileText, Handshake, Scroll, Receipt, Wallet, Tag, Clock,
  Users, Target, Suitcase, SquaresFour, ArrowRight, CheckCircle, CaretLeft, CaretRight,
  ShieldCheck, Scales, ChatCircle, Sparkle, Plus, ChartLineUp, Robot, Plugs,
  CalendarBlank, ListChecks, FolderOpen, Megaphone, PenNib, Fingerprint, ClipboardText,
} from '@phosphor-icons/react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { localePath } from '@/i18n/routing';
import FlowHeroBg from '@/components/FlowHeroBg';
import dynamic from 'next/dynamic';

const Aurora = dynamic(() => import('@/components/Aurora'), { ssr: false });
import AmbientBubbles from '@/components/AmbientBubbles';
import CircularText from '@/components/CircularText';
import RotatingLaptop from '@/components/RotatingLaptop';

/* Predstavitev celotnega paketa Pinart Flow (pinartflow.com). Prodaja
   celoto — od ponudbe do racuna na enem mestu — in vodi v prijavo (Flow)
   ali v brezplacni kalkulator (funnel). Dizajn = naslovnica ponudbe:
   Bodoni, mreza, vijola/zelena blobi, pastelne gradientne kartice, lesk. */

/* Hero nosi CELO predstavitev: Tina je opazovala obiskovalce — nihce ne
   scrolla, preberejo naslov in podnaslov ter gredo na prijavo. Zato pravila
   (Tina + Codexova kritika, 24. 8. 2026):
     1. vsak od treh naslovov mora SAM ZASE povedati, kaj Flow je — obiskovalec
        vidi tistega, ki je pac na vrsti (trije koti ISTE obljube, ne trije
        izdelki);
     2. tretji je vprasanje — radovednost; je Tinina poved s kalkulatorjevega
        landinga, obrnjena v vprasanje;
     3. beseda "AI" v naslovih NIKOLI — orodje deluje tudi brez nje. Pupa
        nastopi enkrat, z imenom, v podnaslovu; edina omemba AI je "povezes
        svoj AI" (razlikovalec, ne okras).
   Vsaka razlicica ohrani per-word "flWordUp" animacijo ob menjavi (key={heroIdx}). */
const HERO_NASLOVI: { pre: string[]; em: string[] }[] = [
  /* "Od ponudbe do racuna" je prodajal cevovod dokumentov; Flow je cel
     business suite s PROJEKTI v sredini (Tina, 24. 8.). Projekt je enota,
     tok je njegova vsebina — in konca se pri placilu, ne pri racunu. */
  /* '\n' = prisilni prelom: Tina hoce tri cist odrezane vrstice
     (Vsak projekt, / od ponudbe / do placila.) namesto nakljucnega loma. */
  { pre: ['Vsak', 'projekt,'], em: ['\n', 'od', 'ponudbe', '\n', 'do', 'plačila.'] },
  /* Brez "Vse" na zacetku: prvi naslov se zacne z "Vsak", in Vsak->Vse ob
     vrtenju jeclja (Tina, 24. 8.). Zdaj se vsak zacne drugace: Vsak/Tvoje/A. */
  /* Prisilni prelom v TRI vrstice, kot prvi naslov: dvovrsticni je pustil pod
     sabo veliko luknjo, ker je visina rezervirana za tri (Tina, 25. 8.). */
  { pre: ['Tvoje'], em: ['\n', 'poslovanje', '\n', 'na', 'enem', 'mestu.'] },
  { pre: ['A', 'veš,', 'koliko', 'je'], em: ['vredno', 'tvoje', 'delo?'] },
];
const HERO_TITLES_EN: { pre: string[]; em: string[] }[] = [
  { pre: ['Every', 'project,'], em: ['\n', 'from', 'proposal', '\n', 'to', 'payment.'] },
  { pre: ['Your', 'whole', 'creative', 'business'], em: ['in', 'one', 'place.'] },
  { pre: ['Do', 'you', 'know', 'what'], em: ['your', 'work', 'is', 'worth?'] },
];

export default function FlowLanding({ locale = 'sl' }: { locale?: string }) {
  const isEn = locale === 'en';
  const t = (sl: string, en: string) => isEn ? en : sl;
  const heroTitles = isEn ? HERO_TITLES_EN : HERO_NASLOVI;
  const prijava = localePath(locale, '/kalkulator/prijava');
  const kalkulator = localePath(locale, '/kalkulator/orodje') + '?od=flow';

  const [taRubrika, setTaRubrika] = useState('vse');
  const [heroIdx, setHeroIdx] = useState(0);
  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    /* 7 s: pri 4 s je bil naslov zamenjan, preden ga je obiskovalec dojel. */
    const timer = window.setInterval(() => setHeroIdx(i => (i + 1) % heroTitles.length), 7000);
    return () => window.clearInterval(timer);
  }, [heroTitles.length]);

  const [taZavihek, setTaZavihek] = useState('kalkulator');
  const [odprtoVpr, setOdprtoVpr] = useState<number | null>(0);
  const [letno, setLetno] = useState(true);   /* cenik: letno (ceneje) vs mesecno (drazje) */
  /* Pupa = PROSOJEN video (alfa): Safari -> HEVC-alfa mov, Chrome/FF -> VP9-alfa webm.
     Predvaja se + hodi sele ko steza pride v viewport (opazujemo stabilno stezo, ne videa). */
  const pupaRef = useRef<HTMLVideoElement>(null);
  const pasRef = useRef<HTMLDivElement>(null);
  const [pupaHodi, setPupaHodi] = useState(false);
  useEffect(() => {
    const v = pupaRef.current; const pas = pasRef.current;
    if (!v || !pas) return;
    const webkit = typeof navigator !== 'undefined' && /apple/i.test(navigator.vendor || '');
    v.src = webkit ? '/flow/pupa.mov' : '/flow/pupa.webm';
    v.load();
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { try { v.currentTime = 0; } catch {} v.play().catch(() => {}); setPupaHodi(true); }
      else { v.pause(); setPupaHodi(false); }
    }, { threshold: 0 });
    io.observe(pas);
    return () => io.disconnect();
  }, []);

  /* Mehki reveal sekcij ob drsanju — vsebina nezno priplava. Progresivno:
     skrijemo (fl-reveal) sele v JS, tako da ob morebitni napaki vse ostane vidno.
     Spostuje reduce-motion (takrat ne skrijemo nicesar). */
  const flRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = flRef.current;
    if (!root || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const sel = '.fl-kalk-banner-in, .fl-potek h2, .fl-koraki > .fl-korak, .fl-laptop-txt, .fl-laptop-vizual, .fl-orodja-nadzor, .fl-showcase-glava, .fl-bento-glava, .fl-bento-mreza > *, .fl-konec > *, .fl-funkcije-glava, .fl-funkcije-mreza > *, .fl-cenik-mreza > *, .fl-faq-glava, .fl-faq-lista > *, .fl-zgodba-glava, .fl-zgodba-tekst > p';
    const targets = Array.from(root.querySelectorAll<HTMLElement>(sel));
    if (!targets.length) return;
    targets.forEach(el => el.classList.add('fl-reveal'));
    const io = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) { entry.target.classList.add('fl-in'); io.unobserve(entry.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -7% 0px' });
    targets.forEach(el => io.observe(el));
    return () => io.disconnect();
  }, []);

  /* Leteci papirnati objekt — potuje ob drsanju po strani, se preliva kepa->ptic->ladjica->kepa
     in na koncu pade v kos (O nas). Cist scroll-driven (brez GSAP), Safari-varno; hidden na mob/reduce-motion. */
  const flyRef = useRef<HTMLDivElement>(null);
  const kosRef = useRef<HTMLImageElement>(null);
  /* Mobilna pupa-scena: skalira se KOT CELOTA (620px design) glede na širino vsebnika.
     Faktor računa JS (zanesljivo povsod, brez cqw), da se očala/teg-i/razmiki ne podrejo. */
  const pupaSceneRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const scene = pupaSceneRef.current;
    const wrap = scene?.parentElement;
    if (!scene || !wrap) return;
    const fit = () => { const w = wrap.clientWidth; if (w > 0) scene.style.transform = `scale(${w / 620})`; };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, []);
  const [flyMounted, setFlyMounted] = useState(false);
  useEffect(() => { setFlyMounted(true); }, []);
  useEffect(() => {
    const fly = flyRef.current;
    if (!fly) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { fly.style.display = 'none'; return; }
    const imgs = fly.querySelectorAll('img');
    const ball = imgs[0] as HTMLElement | undefined, bird = imgs[1] as HTMLElement | undefined, boat = imgs[2] as HTMLElement | undefined;
    let raf = 0;
    const update = () => {
      raf = 0;
      const vw = window.innerWidth, vh = window.innerHeight, y = window.scrollY;
      /* MOBILNO / pokončno (<=820px): desktop ilustracija .fl-video je skrita, zato
         leteči papir vežemo na MOBILNO pupo (pupa3d slika v .fl-hero-vid-mob). Papir
         leži na laptopu -> ob scrollu spremeni obliko (kepa->ptič->ladjica) -> pade
         v koš. Vrednosti (položaj 0.48/0.50, velikost, pot) so PRVA ocena — fino
         nastavljivo. Če pupe (še) ni, papir skrijemo. */
      /* Mobilna veja teče, kadar je vidna skalirna scena (.fl-hero-vid-mob) — to je zdaj tudi
         v LEŽEČEM (nizek zaslon), ne le v portretu (<=820). Zaznamo po širini slike (display:none => 0). */
      const scenaImg = document.querySelector('.fl-hero-vid-mob img') as HTMLElement | null;
      const scenaVidna = !!scenaImg && scenaImg.getBoundingClientRect().width > 0;
      if (scenaVidna) {
        const docHm = document.documentElement.scrollHeight;
        const fracM = Math.min(1, Math.max(0, y / (docHm - vh)));
        /* izhodišče = laptop na skalirni pupi (velja le dokler je hero na zaslonu) */
        const pupaM = scenaImg;
        let startX = vw * 0.5, startY = vh * 0.5;
        if (pupaM) { const rm = pupaM.getBoundingClientRect(); if (rm.width > 0) { startX = rm.left + rm.width * 0.43; startY = rm.top + rm.height * 0.52; } }
        /* fiksni "pas" v vidnem polju (kot desktop) -> papir OSTANE viden skozi ves scroll,
           ne odleti z vrha skupaj s hero-pupo (to je bil hrošč: viden le na koncu). */
        const bandX = vw * 0.80, bandY = vh * 0.34;
        const fallEnd = 0.14;   // zapusti hero v prvih ~14 % scrolla
        let xM: number, tyM: number, scaleM: number;
        if (fracM < fallEnd) {
          const tt = fracM / fallEnd, e = tt * tt * (3 - 2 * tt);   // smoothstep
          xM = startX + (bandX - startX) * e;
          tyM = startY + (bandY - startY) * e + Math.sin(tt * Math.PI) * vh * 0.05;   // lok padca
          scaleM = 0.52 + 0.33 * e;
        } else {
          xM = bandX + Math.sin((fracM - fallEnd) * 20) * vw * 0.07;   // rahlo vijuga po desni
          tyM = bandY;
          scaleM = 0.85;
        }
        /* liki: kepa -> ptič -> ladjica -> nazaj v kepo (ob padcu v koš) */
        let shapeM = 0;
        if (fracM >= 0.78) shapeM = 0; else if (fracM >= 0.58) shapeM = 2; else if (fracM >= 0.34) shapeM = 1;
        let oBallM = shapeM === 0 ? 1 : 0, oBirdM = shapeM === 1 ? 1 : 0, oBoatM = shapeM === 2 ? 1 : 0;
        let rotM = fracM * 300, opM = 1;
        const kosM = kosRef.current;
        if (kosM) {
          const kr = kosM.getBoundingClientRect();
          const d = Math.min(1, Math.max(0, (fracM - 0.8) / 0.14));   // padec v koš proti koncu
          if (d > 0) {
            xM += (kr.left + kr.width * 0.5 - xM) * d;
            tyM += (kr.top + kr.height * 0.28 - tyM) * d;
            scaleM = scaleM * (1 - d * 0.65);
            rotM += d * 200;
            opM = d > 0.9 ? Math.max(0, 1 - (d - 0.9) / 0.1) : 1;
            oBallM = 1; oBirdM = 0; oBoatM = 0;
          }
        }
        if (ball) ball.style.opacity = String(oBallM);
        if (bird) bird.style.opacity = String(oBirdM);
        if (boat) boat.style.opacity = String(oBoatM);
        /* papir (fixed na body) ne sme štrleti čez rob -> sicer horizontalni scroll (iOS) */
        const hwM = (fly.offsetWidth || 120) * scaleM / 2;
        xM = Math.max(hwM + 14, Math.min(vw + 4 - hwM, xM));
        fly.style.opacity = String(opM);
        fly.style.transform = `translate(${xM - 10}px, ${tyM}px) translate(-50%, -50%) rotate(${rotM}deg) scale(${scaleM})`;
        return;
      }
      const docH = document.documentElement.scrollHeight;
      const frac = Math.min(1, Math.max(0, y / (docH - vh)));
      // trajektorija: kepa pade z mize (hero) -> zraste -> plava po desni -> pade v kos
      /* Izhodišče (miza) VEZANO na dejanski okvir ilustracije (.fl-video = zaklenjen
         kvadrat 1:1), ne na % zaslona — sicer papir ob spremembi velikosti ne izhaja
         več z mize. Delež okvira = ista točka na mizi pri vsaki širini/višini.
         Deleža (0.50/0.47) sta ocena mesta papirja na mizi ob laptopu — po potrebi nastavi. */
      let deskX = vw * 0.74, deskY = vh * 0.6 - 80;   // rezerva, če okvira (še) ni
      const ilu = document.querySelector('.fl-video') as HTMLElement | null;
      if (ilu) { const r = ilu.getBoundingClientRect(); deskX = r.left + r.width * 0.50; deskY = r.top + r.height * 0.47 + 10; }  /* +10px: kepa naj LEŽI na mizi, ne lebdi nad njo */
      const bandX = vw * 0.82, bandY = vh * 0.42;
      const fallEnd = vh * 0.95;   // padec z mize se zgodi v prvem zaslonu (v pikslih, ne % strani)
      let x: number, ty: number, scale: number, op = 1;
      if (y < fallEnd) {
        const t = y / fallEnd, e = t * t * (3 - 2 * t);   // smoothstep
        x = deskX + (bandX - deskX) * e;
        ty = deskY + (bandY - deskY) * e + Math.sin(t * Math.PI) * vh * 0.06;  // lok padca
        scale = 0.55 + 0.45 * e;
      } else {
        x = bandX + Math.sin((y - fallEnd) / 170) * vw * 0.05;   // rahlo vijuga po desni
        ty = bandY;
        scale = 1;
      }
      let rot = (y / vh) * 200;   // se vrti med potjo (~200 stopinj na zaslon)
      // en lik naenkrat; ob meji se papir "scrunch-a" (skrci) in zamenja obliko na najmanjsi tocki -> ni dvojne slike
      let shape = 0;                       // 0 kepa, 1 ptic, 2 ladjica
      if (frac >= 0.78) shape = 0;         // nazaj v kepo
      else if (frac >= 0.6) shape = 2;     // ladjica
      else if (frac >= 0.38) shape = 1;    // ptic
      let oBall = shape === 0 ? 1 : 0, oBird = shape === 1 ? 1 : 0, oBoat = shape === 2 ? 1 : 0;
      // brez skrcenja med liki — ptic in ladjica sta iste velikosti kot kepa; zmanjsa se sele ob padcu v kos
      const kos = kosRef.current;
      if (kos) {
        const r = kos.getBoundingClientRect();
        const mouthX = r.left + r.width * 0.5;
        const mouthY = r.top + r.height * 0.28;   // v usta kosa
        const d = Math.min(1, Math.max(0, (frac - 0.78) / 0.14));   // padec se dokonca prej (~92% drsanja)
        if (d > 0) {
          x += (mouthX - x) * d;
          ty += (mouthY - ty) * d;
          scale = scale * (1 - d * 0.7);          // se zmanjsa, ko potone v kos
          rot += d * 200;
          op = d > 0.9 ? Math.max(0, 1 - (d - 0.9) / 0.1) : 1;   // izgine sele, ko pade noter
          oBall = 1; oBird = 0; oBoat = 0;                        // ob padcu je vedno kepa
        }
      }
      if (ball) ball.style.opacity = String(oBall);
      if (bird) bird.style.opacity = String(oBird);
      if (boat) boat.style.opacity = String(oBoat);
      const hw = (fly.offsetWidth || 160) * scale / 2;
      x = Math.max(hw + 14, Math.min(vw + 4 - hw, x));
      fly.style.opacity = String(op);
      fly.style.transform = `translate(${x - 10}px, ${ty}px) translate(-50%, -50%) rotate(${rot}deg) scale(${scale})`;
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => { window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); if (raf) cancelAnimationFrame(raf); };
  }, [flyMounted]);

  const vrstaRef = useRef<HTMLDivElement>(null);

  /* Showcase (Eno mesto): na mobilu so paneli vodoravni scroll-carousel (naslednji se
     malce vidi). Klik na pill zapelje do panela; drs carousela posodobi aktivni pill.
     Na desktopu ostane po starem: pill preklopi, viden je le aktiven panel. */
  const scTrackRef = useRef<HTMLDivElement>(null);
  const scPillsRef = useRef<HTMLDivElement>(null);
  const jeMob = () => typeof window !== 'undefined' && window.matchMedia('(max-width: 860px)').matches;
  const izberiZavihek = (id: string) => {
    setTaZavihek(id);
    if (!jeMob()) return;
    const track = scTrackRef.current;
    const panel = track?.querySelector(`[data-sc="${id}"]`) as HTMLElement | null;
    /* Premikamo IZKLJUCNO trak (vodoravno), nikoli strani — glej opombo pri pillih. */
    if (track && panel) track.scrollTo({ left: panel.offsetLeft - (track.clientWidth - panel.clientWidth) / 2, behavior: 'smooth' });
  };
  /* drs carousela -> aktiven postane najbližji panel (samo mobilno) */
  useEffect(() => {
    const track = scTrackRef.current;
    if (!track) return;
    let raf = 0;
    const oceni = () => {
      raf = 0;
      if (!jeMob()) return;
      const sredina = track.scrollLeft + track.clientWidth / 2;
      let best = '', bestD = Infinity;
      track.querySelectorAll<HTMLElement>('[data-sc]').forEach(p => {
        const c = p.offsetLeft + p.clientWidth / 2;
        const d = Math.abs(c - sredina);
        if (d < bestD) { bestD = d; best = p.dataset.sc || ''; }
      });
      if (best) setTaZavihek(prev => (prev === best ? prev : best));
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(oceni); };
    track.addEventListener('scroll', onScroll, { passive: true });
    return () => { track.removeEventListener('scroll', onScroll); if (raf) cancelAnimationFrame(raf); };
  }, []);
  /* Aktiven pill centriramo IZKLJUCNO znotraj svoje vodoravne vrstice.
     scrollIntoView je tu PREPOVEDAN: premakne tudi STRAN do vrstice, ce ta se
     ni v vidnem polju. Tocno to se je zgodilo ob prehodu iz aplikacije na
     landing (ucinek tece ob montazi, v dev nacinu celo dvakrat, zato varovalka
     s ref ni dovolj) — stran se je sama odpeljala do vrtiljaka orodij.
     Dokazano s sledjo klicev 24. 8. 2026. Vodoravni scrollTo na vrstici strani
     ne more premakniti nikoli. */
  useEffect(() => {
    const vrsta = scPillsRef.current;
    const active = vrsta?.querySelector('.fl-sc-pill.on') as HTMLElement | null;
    if (vrsta && active) vrsta.scrollTo({ left: active.offsetLeft - (vrsta.clientWidth - active.clientWidth) / 2, behavior: 'smooth' });
  }, [taZavihek]);

  const VPRASANJA = isEn ? [
    { v: 'Is Flow really free?', o: 'The fair-pricing calculator is free forever and works without an account. Choose Premium or Pro when you need saved documents, clients, projects and the Pupa AI assistant.' },
    { v: 'What can the Pupa AI assistant do?', o: 'Pupa understands creative pricing, licensing and usage rights. She helps you set a fair price, spot underpricing and write a clear proposal using the context of your work.' },
    { v: 'Do I need an account for the calculator?', o: 'No. You can calculate a fair price, build a proposal and download it without signing up. Create an account only when you want to save and connect your business data.' },
    { v: 'Who owns my data and documents?', o: 'You do. Your proposals, clients and documents remain private. We do not sell them. Anonymous, aggregated price data may improve the market benchmark, but we never reveal who entered a price.' },
    { v: 'How does Flow help me set the right price?', o: 'It separates production, usage rights and licensing, then places your price within an anonymous market range. You can see whether you are near the bottom or top instead of guessing.' },
    { v: 'Does Flow include copyright and usage rights?', o: 'Yes. Flow separates production from licensing and adjusts the calculation to usage, duration, territory and the client’s jurisdiction.' },
    { v: 'How does the Authorship vault help me prove the work is mine?', o: 'When you upload a piece, Flow computes a cryptographic fingerprint (SHA-256) — a unique fingerprint of the file — and ties it to a date and an independent timestamp. That proves your exact file existed on a given day, before any AI derivative appeared. It does not prove style, it proves priority in time; your source files (.ai/.psd layers) are the strongest evidence, and a copyist never has them.' },
    { v: 'How does a proposal become an invoice?', o: 'In one click. Flow carries over the client and line items, then adds numbering, a due date and payment status without retyping the same information.' },
    { v: 'Can I use Flow with international clients?', o: 'Yes. Flow is designed for global work, with multilingual document templates and rules that adapt to the client’s jurisdiction.' },
  ] : [
    { v: 'Je Flow res brezplačen?', o: 'Kalkulator poštenih cen je in ostane brezplačen za vedno, brez prijave. Za celotno platformo (dokumenti, stranke, projekti, AI asistentka Pupa) izbereš paket, ki ti ustreza — Premium ali Pro.' },
    { v: 'Kaj zna AI asistentka Pupa?', o: 'Pupa je tvoja AI asistentka: pozna trg in avtorske pravice, pove ti pošteno ceno, opozori te, če se podcenjuješ, in ti pomaga ubesediti ponudbo. Z njo klepetaš ali jo upravljaš z glasom. Svetuje iz konteksta tvoje ponudbe — ni splošni chatbot. Na voljo je v plačljivih paketih.' },
    { v: 'Ali potrebujem račun za kalkulator?', o: 'Ne. Kalkulator deluje brez prijave: izračunaš pošteno ceno, sestaviš ponudbo in jo preneseš. Račun potrebuješ šele, ko želiš dokumente shraniti in imeti na enem mestu.' },
    { v: 'Komu pripadajo moji podatki in dokumenti?', o: 'Tvoje ponudbe, stranke in dokumenti ostanejo tvoji in zasebni — ne prodajamo jih in ne razkrivamo nikomur. Cene storitev, ki jih vpišeš, pa anonimno in združeno pomagajo graditi pregled poštenih tržnih cen, da ti Flow lahko pokaže, kje je tvoja cena glede na trg. Nikoli ne razkrijemo, kdo je vnesel katero ceno.' },
    { v: 'Kako mi Flow pomaga postaviti pravo ceno?', o: 'Kalkulator razbije ceno na izvedbo, avtorske pravice in licenco, nato pa jo primerja z anonimnim tržnim pregledom vpisanih cen — vidiš, ali si bližje dnu ali vrhu in za koliko se morda podcenjuješ. Cena tako ni več ugibanje.' },
    { v: 'Ali Flow upošteva avtorske pravice?', o: 'Da. Kalkulator loči izvedbo od licence in avtorskih pravic ter ceno prilagodi obsegu uporabe, trajanju in ozemlju, po pravu naročnikove jurisdikcije.' },
    { v: 'Kako mi Sef avtorstva pomaga dokazati, da je delo moje?', o: 'Ob nalaganju dela Flow izračuna kriptografski odtis (SHA-256) — enolični prstni odtis datoteke — in ga poveže z datumom ter neodvisnim časovnim žigom. Tako dokažeš, da je prav tvoja datoteka obstajala na določen dan, še preden se je pojavila morebitna AI izpeljanka. Ne dokazuje sloga, dokazuje prioriteto v času; najmočnejši dokaz so tvoje izvorne datoteke (sloji .ai/.psd), ki jih kopist nima.' },
    { v: 'Kako iz ponudbe nastane račun?', o: 'Z enim klikom. Ponudbo pretvoriš v račun s samodejnim številčenjem, rokom plačila in statusom, brez ponovnega vnašanja podatkov.' },
    { v: 'Ali lahko Flow uporabljam za tuje naročnike?', o: 'Da. Flow je zasnovan globalno: večjezične predloge dokumentov in pravila, prilagojena jurisdikciji naročnika.' },
  ];
  const pauseUntil = useRef(0);
  const drsni = (smer: number) => {
    const el = vrstaRef.current;
    if (!el) return;
    pauseUntil.current = performance.now() + 1100;  // pavziraj auto med ročnim premikom
    // Ročna animacija (behavior:'smooth' ni povsod podprt); ease-out.
    const startL = el.scrollLeft;
    const target = Math.max(0, Math.min(el.scrollWidth - el.clientWidth, startL + smer * 360));
    const t0 = performance.now();
    const anim = (t: number) => {
      const p = Math.min(1, (t - t0) / 480);
      el.scrollLeft = startL + (target - startL) * (1 - Math.pow(1 - p, 3));
      if (p < 1) requestAnimationFrame(anim);
    };
    requestAnimationFrame(anim);
  };

  /* Samodejno počasno drsenje vrste orodij (rAF); ustavi ob hoverju/dotiku in po ročnem
     premiku s puščicami (pauseUntil, da smooth premika ne prekine); spoštuj reduce-motion. */
  useEffect(() => {
    const el = vrstaRef.current;
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let hover = false;
    const enter = () => { hover = true; };
    const leave = () => { hover = false; };
    const down = () => { pauseUntil.current = performance.now() + 1500; };
    el.addEventListener('pointerenter', enter);
    el.addEventListener('pointerleave', leave);
    el.addEventListener('pointerdown', down);
    /* auto-drs teče ŠELE ko je vrsta v vidnem polju -> ko uporabnik pride do nje,
       je na PRVI kartici (scrollLeft 0), šele nato začne počasi drseti. */
    let inView = false;
    const io = new IntersectionObserver(([e]) => { inView = e.isIntersecting; }, { threshold: 0.2 });
    io.observe(el);
    let raf = 0;
    let last = performance.now();
    const tick = (t: number) => {
      const dt = Math.min(t - last, 50); last = t;
      if (inView && !hover && t >= pauseUntil.current && el.scrollWidth > el.clientWidth + 1) {
        if (el.scrollLeft + el.clientWidth >= el.scrollWidth - 1) {
          pauseUntil.current = t + 1300;
          el.scrollTo({ left: 0, behavior: 'smooth' });
        } else {
          el.scrollLeft += dt * 0.03;  // ~30px/s, počasi
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      el.removeEventListener('pointerenter', enter);
      el.removeEventListener('pointerleave', leave);
      el.removeEventListener('pointerdown', down);
    };
  }, [taRubrika]);

  const RUBRIKE = [
    { id: 'vse', label: t('Vse', 'All') },
    { id: 'ponudbe', label: t('Ponudbe & cene', 'Proposals & pricing') },
    { id: 'dogovori', label: t('Dogovori', 'Agreements') },
    { id: 'finance', label: t('Finance', 'Finance') },
    { id: 'stranke', label: t('Stranke & cilji', 'Clients & goals') },
  ];

  const ORODJA = [
    { Ikona: FileText, kat: 'ponudbe', h: 297, ime: t('Kalkulator ponudb', 'Proposal calculator'), opis: t('Poštena cena projekta: izvedba, avtorske pravice in licenca. Trije paketi in urejljivo besedilo.', 'A fair project price: production, usage rights and licensing. Three packages with editable copy.'), href: kalkulator, brezplacno: true },
    { Ikona: FolderOpen, kat: 'stranke', h: 285, ime: t('Projekti & arhiv', 'Projects & archive'), opis: t('Vsak projekt na enem mestu — ponudbe, pogodbe, računi, roki in vsa komunikacija, pregledno.', 'Keep proposals, contracts, invoices, deadlines and communication together for every project.'), href: localePath(locale, '/kalkulator/projekti') },
    { Ikona: Scroll, kat: 'dogovori', h: 245, ime: t('Pogodbe', 'Contracts'), opis: t('Pogodbe o sodelovanju in prenosu pravic, pripravljene za podpis.', 'Collaboration and rights-transfer agreements, ready to sign.'), href: localePath(locale, '/kalkulator/pogodbe') },
    { Ikona: ShieldCheck, kat: 'dogovori', h: 220, ime: t('Sef avtorstva', 'Authorship vault'), opis: t('Dokaži, kdaj in s čim si delo ustvarila — kriptografski odtis in časovni žig proti AI kraji.', 'Prove when and how you made your work — a cryptographic fingerprint and timestamp against AI theft.'), href: localePath(locale, '/kalkulator/sef') },
    { Ikona: Receipt, kat: 'finance', h: 265, ime: t('Računi', 'Invoices'), opis: t('Iz ponudbe v račun z enim klikom. Številčenje, rok in status plačila.', 'Turn a proposal into an invoice in one click, with numbering, due dates and payment status.'), href: localePath(locale, '/kalkulator/racuni') },
    { Ikona: Users, kat: 'stranke', h: 205, ime: t('Stranke & CRM', 'Clients & CRM'), opis: t('CRM kartoteka naročnikov: podatki, dokumenti in zgodovina sodelovanja.', 'Client details, documents and collaboration history in one CRM record.'), href: localePath(locale, '/kalkulator/stranke') },
    { Ikona: ListChecks, kat: 'stranke', h: 258, ime: t('Naloge', 'Tasks'), opis: t('Task manager po projektih — poveš Pupi želje, ona jih razdeli v naloge.', 'A project task manager that turns your brief into clear next steps.'), href: localePath(locale, '/kalkulator/naloge') },
    { Ikona: SquaresFour, kat: 'stranke', h: 200, ime: t('Pregled in analitika', 'Dashboard & analytics'), opis: t('Nadzorna plošča z analitiko poslovanja: promet, odprte ponudbe in čakajoča plačila.', 'Track revenue, open proposals and pending payments at a glance.'), href: localePath(locale, '/kalkulator/pregled') },
    { Ikona: Handshake, kat: 'dogovori', h: 162, ime: t('Dolgoročno sodelovanje', 'Retainers'), opis: t('Retainer z mesečnim obsegom, urami in dobo. Jasni pogoji dolgoročnega dogovora.', 'Define monthly scope, hours and duration for a clear long-term agreement.'), href: localePath(locale, '/kalkulator/dolgorocno') },
    { Ikona: Target, kat: 'stranke', h: 135, ime: t('Cilji', 'Goals'), opis: t('Mesečni cilj prihodkov in koliko projektov te loči do njega.', 'Set a monthly revenue goal and see how many projects remain.'), href: localePath(locale, '/kalkulator/cilji') },
    { Ikona: Tag, kat: 'ponudbe', h: 135, ime: t('Ceniki', 'Price lists'), opis: t('Tvoji cenovni profili: shraniš, urediš in znova uporabiš.', 'Save, edit and reuse your own pricing profiles.'), href: localePath(locale, '/kalkulator/ceniki') },
    { Ikona: Wallet, kat: 'finance', h: 205, ime: t('Stroški', 'Expenses'), opis: t('Odhodki in ponavljajoči se stroški, zbrani na enem mestu.', 'Keep one-off and recurring business expenses in one place.'), href: localePath(locale, '/kalkulator/stroski') },
    { Ikona: Clock, kat: 'finance', h: 85, ime: t('Merjenje časa', 'Time tracking'), opis: t('Štoparica po projektu: izmeriš porabljen čas in vidiš, ali se ti je delo pri tej ceni res splačalo.', 'Track time by project and see whether the agreed price was profitable.'), href: localePath(locale, '/kalkulator/cas') },
    /* Evidenca delovnega časa je nekaj DRUGEGA kot štoparica: štoparica meri ure
       na projektu (koliko je delo stalo), evidenca beleži prihod in odhod osebe
       (zakonska obveznost po ZEPDSV). Landing je do zdaj poznal samo štoparico. */
    { Ikona: ClipboardText, kat: 'finance', h: 135, ime: t('Delovna prisotnost', 'Attendance'), opis: t('Prihod, odmor in odhod po ZEPDSV — mesečna tabela in izvoz za kadrovsko.', 'Arrival, break and departure as Slovenian law requires — monthly table and HR export.'), href: localePath(locale, '/kalkulator/evidenca-casa') },
    { Ikona: Suitcase, kat: 'finance', h: 200, ime: t('Poslovni okvir', 'Business framework'), opis: t('Širša slika: rezerva, davki in spodnja meja poštene cene.', 'Understand reserves, taxes and the minimum sustainable price.'), href: localePath(locale, '/kalkulator/poslovni-nacrt') },
    { Ikona: CalendarBlank, kat: 'stranke', h: 200, ime: t('Koledar', 'Calendar'), opis: t('Sestanki, klici in roki projektov na enem koledarju.', 'Meetings, calls and project deadlines in one calendar.'), href: localePath(locale, '/kalkulator/koledar') },
  ];
  const vidnaOrodja = ORODJA.filter(o => taRubrika === 'vse' || o.kat === taRubrika);

  /* Interaktivni prikaz (Magnific slog): pill-i zgoraj, spodaj velik predogled ki
     se menja ob kliku. Prihodnji zmožnosti nosijo značko (Agent = Beta). Povezave so od 20. 8. 2026 na voljo. */
  const ZAVIHKI: { id: string; Ikona: React.ElementType; label: string; znacka?: string; zvrst?: 'free' | 'beta' | 'soon'; h: string; p: string; tocke: string[]; cta: string; href: string }[] = isEn ? [
    { id: 'kalkulator', Ikona: FileText, label: 'Calculator', znacka: 'Free', zvrst: 'free', h: 'A fair price in a few clicks', p: 'Break the price into production, usage rights and licensing, then get a clear number without guessing or signing up.', tocke: ['Three packages with editable copy', 'Usage rights and licensing included', 'Download a PDF or turn it into an invoice'], cta: 'Open calculator', href: kalkulator },
    { id: 'dokumenti', Ikona: Receipt, label: 'Documents', h: 'From proposal to invoice, without duplicate work', p: 'Proposals, contracts, invoices and expenses share the same data. Turn an approved proposal into an invoice in one click.', tocke: ['Numbering, due dates and payment status', 'Collaboration and rights-transfer agreements', 'A consistent look across documents'], cta: 'Explore tools', href: '#orodja' },
    { id: 'pregled', Ikona: ChartLineUp, label: 'Insights', h: 'Know what your work is worth', p: 'An anonymous market benchmark shows where your price sits, while the dashboard tracks revenue, payments and profit.', tocke: ['Market benchmark from anonymous prices', 'Revenue, payments and estimated profit', 'Goals and client profitability'], cta: 'Open dashboard', href: localePath(locale, '/kalkulator/pregled') },
    { id: 'agent', Ikona: Robot, label: 'Pupa', znacka: 'New', zvrst: 'beta', h: 'An AI assistant who understands creative pricing', p: 'Pupa understands the market and usage rights, helps you price fairly, writes clear proposal copy and answers questions by text or voice.', tocke: ['Flags underpricing', 'Understands usage rights and licensing', 'Text and voice interaction'], cta: 'Meet Pupa', href: prijava },
    { id: 'mcpapi', Ikona: Plugs, label: 'Connections', znacka: 'Available', zvrst: 'free', h: 'Say what you need — Flow makes it', p: 'Brief, pitch, quote. Say it in plain words and the result lands on the project — tidy and yours. Pupa is included in your plan; nothing to set up.', tocke: ['Pupa is included — nothing to set up', 'Results land on the project, not in someone else\'s chat', 'Bring your own agent if you like (ChatGPT, Claude, Gemini)'], cta: 'How it works', href: 'mailto:tina@pinart.si?subject=Flow%20%E2%80%94%20data%20export' },
  ] : [
    { id: 'kalkulator', Ikona: FileText, label: 'Kalkulator', znacka: 'Brezplačno', zvrst: 'free',
      h: 'Poštena cena v nekaj klikih',
      p: 'Kalkulator razbije ceno na izvedbo, avtorske pravice in licenco ter pokaže pošteno številko — brez ugibanja in brez prijave.',
      tocke: ['Trije paketi in urejljivo besedilo', 'Avtorske pravice in licenca vračunane', 'Prenos v PDF ali pretvorba v račun'],
      cta: 'Odpri kalkulator', href: kalkulator },
    { id: 'dokumenti', Ikona: Receipt, label: 'Dokumenti',
      h: 'Od ponudbe do računa, brez podvajanja',
      p: 'Ponudba, pogodba, račun in stroški tečejo iz istih podatkov. En klik in dogovorjena ponudba postane račun.',
      tocke: ['Oštevilčenje, rok in status plačila', 'Pogodbe o sodelovanju in prenosu pravic', 'Enoten videz vseh dokumentov'],
      cta: 'Poglej orodja', href: '#orodja' },
    { id: 'pregled', Ikona: ChartLineUp, label: 'Pregled',
      h: 'Veš, koliko je vredno tvoje delo',
      p: 'Anonimen tržni pregled pokaže, kje je tvoja cena — bližje dnu ali vrhu. Nadzorna plošča spremlja promet, plačila in dobiček.',
      tocke: ['Tržni benchmark iz vpisanih cen', 'Promet, plačila in ocenjeni dobiček', 'Cilji in donosnost strank'],
      cta: 'Odpri pregled', href: localePath(locale, '/kalkulator/pregled') },
    { id: 'agent', Ikona: Robot, label: 'Pupa', znacka: 'Novo', zvrst: 'beta',
      h: 'AI asistentka, ki pozna trg in ceno',
      p: 'Pupa je tvoja AI asistentka: pozna trg in avtorske pravice, pove ti pošteno ceno, ubesedi ponudbo in odgovori na tvoja vprašanja — pisno ali glasovno.',
      tocke: ['Pove pošteno ceno in te opozori na podcenjevanje', 'Pozna avtorske pravice in licence', 'Klepet in glasovno upravljanje'],
      cta: 'Spoznaj Pupo', href: prijava },
    { id: 'mcpapi', Ikona: Plugs, label: 'Povezave', znacka: 'Na voljo', zvrst: 'free',
      h: 'Povej, kaj rabiš, in Flow to naredi',
      p: 'Brief, pitch, ponudba. Poveš po domače, kaj potrebuješ, in rezultat pristane na projektu — urejen in tvoj. Pupa je vključena v paket, nastavljati ni treba ničesar.',
      tocke: ['Pupa je vključena — nič ni treba nastavljati', 'Rezultat pristane na projektu, ne v tujem klepetu', 'Če želiš, pripelješ svojega agenta (ChatGPT, Claude, Gemini)'],
      cta: 'Kako deluje', href: 'mailto:tina@pinart.si?subject=Flow%20%E2%80%94%20izvoz%20podatkov' },
  ];
  const predoglediMock = (id: string) => {
    if (id === 'dokumenti') return (
      <div className="fl-mock">
        <div className="fl-mock-bar"><i /><i /><i /><small>{t('ponudba', 'proposal')} · PNR-2026-014</small></div>
        <div className="fl-doc">
          <div className="fl-doc-lp"><strong>{t('Ponudba', 'Proposal')}</strong><span>PNR-2026-014</span></div>
          <div className="fl-doc-row"><b>{t('Oblikovanje logotipa', 'Logo design')}</b><span>480 €</span></div>
          <div className="fl-doc-row"><b>{t('Prenos avtorskih pravic', 'Copyright transfer')}</b><span>240 €</span></div>
          <div className="fl-doc-row"><b>{t('Licenca (2 leti, EU)', 'Licence (2 years, EU)')}</b><span>180 €</span></div>
          <div className="fl-doc-total"><b>{t('Skupaj', 'Total')}</b><span>900 €</span></div>
        </div>
      </div>
    );
    if (id === 'pregled') return (
      <div className="fl-mock">
        <div className="fl-mock-bar"><i /><i /><i /><small>{t('poslovni pregled', 'business overview')}</small></div>
        <div className="fl-dash">
          <div className="fl-dash-top">
            <div className="fl-donut"><i>62%</i></div>
            <div className="fl-dash-kpi"><span>{t('Ocenjeni dobiček', 'Estimated profit')}</span><strong>1.240 €</strong></div>
          </div>
          <div className="fl-bench">
            <div className="fl-bench-label"><span>{t('Tržni razpon cene', 'Market price range')}</span><span className="fl-bench-you">{t('tvoja cena', 'your price')}</span></div>
            <div className="fl-bench-bar"><span className="fl-bench-mark" /></div>
          </div>
        </div>
      </div>
    );
    if (id === 'agent') return (
      <div className="fl-mock">
        <div className="fl-mock-bar"><i /><i /><i /><small>Flow agent · beta</small></div>
        <div className="fl-mock-body">
          <span className="fl-msg me">{t('Pripravi ponudbo za spletno trgovino.', 'Prepare a proposal for an online store.')}</span>
          <span className="fl-msg bot"><span className="fl-ava" />{t('Predlagam pošteno ceno in obseg …', 'I suggest a fair price and scope …')}</span>
          <div className="fl-agent-note"><span className="fl-agent-dot"><svg viewBox="0 0 40 40" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}><path d="M9.8 18.2q3.2-4.6 6.4 0" stroke="#2A2035" strokeWidth="2.1" fill="none" strokeLinecap="round" /><path d="M23.8 18.2q3.2-4.6 6.4 0" stroke="#2A2035" strokeWidth="2.1" fill="none" strokeLinecap="round" /><path d="M14.5 23.5q5.5 4.6 11 0" stroke="#2A2035" strokeWidth="2.1" fill="none" strokeLinecap="round" /><circle cx="11.5" cy="21.5" r="1.9" fill="rgba(255,120,170,.55)" /><circle cx="28.5" cy="21.5" r="1.9" fill="rgba(255,120,170,.55)" /></svg></span><div><b>{t('Ponudba pripravljena', 'Proposal ready')}</b><br /><small>{t('1.850 € · pravice vračunane', '€1,850 · rights included')}</small></div></div>
        </div>
      </div>
    );
    if (id === 'mcpapi') return (
      <div className="fl-mock">
        <div className="fl-mock-bar"><i /><i /><i /><small>{t('povezave', 'connections')}</small></div>
        {/* Skica posnema PRAVI videz Pupinega doma: živ preliv v ozadju in vpisno
            polje z izbiro agenta. Ce oglašujemo pogovor, mora skica izgledati
            kot pogovor — prazne vrstice kode so obljubljale nekaj drugega. */}
        <div className="fl-mock-body fl-pupa-mock">
          <span className="fl-pupa-aura" aria-hidden />
          <span className="fl-msg bot"><span className="fl-ava" />{t('Kdo naj napiše brief?', 'Who should write the brief?')}</span>
          <span className="fl-msg me">{t('moj ChatGPT', 'my ChatGPT')}</span>
          <span className="fl-msg bot"><span className="fl-ava" />{t('Brief je na projektu.', 'The brief is on the project.')}</span>
          <span className="fl-pupa-vnos">
            <i className="fl-pupa-znacka">{t('moj ChatGPT', 'my ChatGPT')}</i>
            <i className="fl-pupa-crta" />
            <i className="fl-pupa-gumb">{t('Začni', 'Start')}</i>
          </span>
        </div>
      </div>
    );
    return (
      <div className="fl-mock">
        <div className="fl-mock-bar"><i /><i /><i /><small>{t('pinart kalkulator', 'pinart calculator')}</small></div>
        <div className="fl-mock-body">
          <span className="fl-msg bot"><span className="fl-ava" />{t('Živjo! Kako ti je ime?', 'Hi! What is your name?')}</span>
          <span className="fl-msg me">Tina</span>
          <span className="fl-msg bot"><span className="fl-ava" />{t('Kakšne izkušnje imaš?', 'How much experience do you have?')}</span>
          <span className="fl-msg me">{t('Šele začenjam', 'Just starting out')}</span>
          <span className="fl-mockchip"><FileText size={14} weight="regular" />{t('Ponudba · od 0 €', 'Proposal · from €0')}</span>
        </div>
      </div>
    );
  };

  /* 3 stolpce x 3 = 9 enakih kartic (brez poudarjene). */
  const FUNKCIJE = isEn ? [
    { Ikona: Robot, ime: 'AI that understands the market', opis: 'Pupa helps you set a fair price, understands usage rights and warns you when you are underpricing.' },
    { Ikona: SquaresFour, ime: 'One workspace instead of four', opis: 'Proposals, contracts, invoices, CRM, projects and tasks in one place.' },
    { Ikona: Fingerprint, ime: 'Authorship vault', opis: 'Prove when and how you made your work — a cryptographic fingerprint and timestamp against AI theft.' },
    { Ikona: FolderOpen, ime: 'A whole project in one place', opis: 'Keep documents, deadlines and communication together instead of scattered across email.' },
    { Ikona: ListChecks, ime: 'Tasks that stay organised', opis: 'Turn project wishes into clear tasks and keep every project moving.' },
    { Ikona: Receipt, ime: 'From proposal to invoice', opis: 'The same data flows through proposals, contracts, invoices and expenses without retyping.' },
    { Ikona: Megaphone, ime: 'Marketing included', opis: 'Plan posts and campaigns alongside your projects in the same workspace.' },
    { Ikona: ShieldCheck, ime: 'Secure cloud storage', opis: 'Your data is stored in the EU and remains yours. Prices are only aggregated anonymously.' },
    { Ikona: Handshake, ime: 'Grows with you', opis: 'Start solo, then invite collaborators or clients only to the projects they need.' },
  ] : [
    { Ikona: Robot, ime: 'AI, ki pozna trg in ceno', opis: 'AI asistentka Pupa pozna trg in avtorske pravice: pove ti pošteno ceno in te opozori, če se podcenjuješ.' },
    { Ikona: SquaresFour, ime: 'En program namesto štirih', opis: 'Vse-v-enem SaaS: ponudbe, pogodbe, računi, CRM, projekti in naloge na enem mestu. Konec skakanja med štirimi programi.' },
    { Ikona: Fingerprint, ime: 'Sef avtorstva', opis: 'Dokaži, kdaj in s čim si delo ustvarila — kriptografski odtis in časovni žig proti AI kraji.' },
    { Ikona: FolderOpen, ime: 'Cel projekt na enem mestu', opis: 'Vsak projekt z dokumenti, roki in vso komunikacijo — pregledno, veliko bolje kot razmetani Gmail.' },
    { Ikona: ListChecks, ime: 'Naloge, ki se uredijo same', opis: 'Task manager drži projekt v teku. Poveš Pupi želje, ona jih razdeli v naloge.' },
    { Ikona: Receipt, ime: 'Od ponudbe do računa', opis: 'Ponudba, pogodba, račun in stroški tečejo iz istih podatkov — brez podvajanja in prepisovanja.' },
    { Ikona: Megaphone, ime: 'Tudi marketing', opis: 'Objave in kampanje načrtuješ ob projektih — marketing je del istega mesta.' },
    { Ikona: ShieldCheck, ime: 'Varno oblačno shranjevanje', opis: 'Podatki v oblaku (EU) — dostop imaš samo ti. Ne prodamo in ne delimo; cene se združijo anonimno, nikoli ime.' },
    { Ikona: Handshake, ime: 'Raste s tabo', opis: 'Začneš sam(a); ko studio zraste, povabiš sodelavca ali stranko na projekt — z dostopom samo do potrebnega.' },
  ];

  const KORAKI = isEn ? [
    { n: '01', naslov: 'A fair price, without guessing', opis: 'The calculator and Pupa help you price the work with market context and usage rights included.' },
    { n: '02', naslov: 'Proposal → contract → invoice', opis: 'Clear, connected documents built from the same data, without copying between tools.' },
    { n: '03', naslov: 'Everything under one project', opis: 'Connect documents, deadlines, clients, expenses, communication and tasks.' },
    { n: '04', naslov: 'Know what you earned', opis: 'Track revenue, expenses and profit, ready for your accountant.' },
  ] : [
    { n: '01', naslov: 'Poštena cena, brez ugibanja', opis: 'Kalkulator in AI asistentka Pupa ti povesta, koliko zaračunati — s tržnim pregledom in vračunanimi pravicami.' },
    { n: '02', naslov: 'Ponudba → pogodba → račun', opis: 'Lepo oblikovano in povezano — vse teče iz istih podatkov, brez prepisovanja in brez treh programov.' },
    { n: '03', naslov: 'Vse pod enim projektom', opis: 'Dokumenti, roki, stranka, stroški in vsa komunikacija povezani. Naloge pa urejaš kar s Pupo.' },
    { n: '04', naslov: 'Veš, koliko si zaslužil', opis: 'Pregled prihodkov, stroškov in dobička — pripravljeno za računovodstvo.' },
  ];

  /* Predlog cenika (cene so okvirne — potrdi/prilagodi). */
  /* Brez seznama "cesa ni": tak seznam ni nikoli popoln (Premium bi moral nasteti
     vseh osem stvari iz Pro) in bralec iz enega krizca sklepa, da je razlika ena
     sama. Lestvico nosita "Vse iz Brezplacno" in "Vse iz Premium", vsak paket pa
     pokaze, kaj DODA. */
  const CENIKI = isEn ? [
    { ime: 'Free', za: 'For getting started and one-off projects', cena: '0', enota: '€ forever', cta: 'Open calculator', href: kalkulator, izpost: false, znacka: '', kmalu: false, vkljuceno: ['Fair-pricing calculator', 'Proposal in three packages', 'Usage-rights and licence calculation', 'Editable proposal document', 'Email and PDF export', 'Unlimited cloud proposals', 'Proposal numbering'] },
    { ime: 'Premium', za: 'For regular client work', cena: '15', cenaMes: '18', enota: '€ / month', ustanovna: 'Founding price: €9/month for the first 50 users (limited time) · first month free', cta: 'Coming soon', href: localePath(locale, '/kalkulator/prijava'), izpost: true, znacka: 'Most popular', kmalu: true, vkljuceno: ['Everything in Free', 'Pupa AI assistant — text and voice', 'Saved proposals, contracts and invoices', 'Retainers', 'Projects and archive', 'Client CRM and price lists', 'Expenses and goals', 'Tasks, calendar and time tracking', 'Business dashboard'] },
    { ime: 'Pro', za: 'For small studios and collaborators', cena: '29', cenaMes: '35', enota: '€ / month', cta: 'Coming soon', href: localePath(locale, '/kalkulator/prijava'), izpost: false, znacka: 'Soon', kmalu: true, vkljuceno: ['Everything in Premium', 'Anonymous market comparison', 'Revenue and profit analytics by client', 'Advanced Pupa task planning', 'Business framework and taxes', 'Accounting export', 'Project-level collaborator access', 'Bring your own agent + data export', 'Priority support'] },
  ] : [
    {
      ime: 'Brezplačno', za: 'Za začetek in enkratne projekte', cena: '0', enota: '€ za vedno',
      cta: 'Odpri kalkulator', href: kalkulator, izpost: false, znacka: '', kmalu: false,
      vkljuceno: ['Kalkulator poštenih cen', 'Ponudba v treh paketih (osnovni · srednji · premium)', 'Izračun avtorskih pravic in licence', 'Oblikovana in urejljiva ponudba', 'Izvoz v e-pošto / PDF', 'Neomejene shranjene ponudbe v oblaku', 'Oštevilčenje ponudb'],
    },
    {
      /* Cena sidrana na orodja, ki jih kreativci ze placujejo (Figma ~12-15 €).
         Ustanovna 9 € za prvih 50 je ČASOVNO omejena (ne "za vedno") — nujnost +
         dokaz pripravljenosti placati. Prvi mesec brezplacno = trial namesto free-forever platforme. */
      ime: 'Premium', za: 'Za redno delo s strankami', cena: '15', cenaMes: '18', enota: '€ / mesec',
      ustanovna: 'Ustanovna 9 €/mesec za prvih 50 (časovno) · prvi mesec brezplačno',
      cta: 'Kmalu', href: localePath(locale, '/kalkulator/prijava'), izpost: true, znacka: 'Najbolj priljubljeno', kmalu: true,
      vkljuceno: ['Vse iz Brezplačno', 'AI asistentka Pupa — pozna trg in ceno, klepet in glas', 'Ponudbe, pogodbe in računi (shranjeni, oštevilčeni)', 'Dolgoročni retainerji', 'Projekti & arhiv — vse na enem projektu', 'Kartoteka strank (CRM)', 'Ceniki (cenovni profili)', 'Stroški in cilji', 'Task manager: naloge in podnaloge', 'Koledar', 'Merjenje časa — ali se ti je delo splačalo', 'Nadzorna plošča'],
    },
    {
      ime: 'Pro', za: 'Za mali studio in sodelavce', cena: '29', cenaMes: '35', enota: '€ / mesec',
      cta: 'Kmalu', href: localePath(locale, '/kalkulator/prijava'), izpost: false, znacka: 'Kmalu', kmalu: true,
      vkljuceno: ['Vse iz Premium', 'Primerjava s trgom — koliko za to zaračunajo drugi', 'Celoten analitični pregled — prihodki in dobiček po strankah', 'Napredna Pupa: sama razdeli naloge iz tvojih želja', 'Sinhronizacija med vsemi orodji', 'Poslovni okvir in davki', 'Posredovanje računovodstvu (izvoz)', 'Sodelavci z dostopom samo do izbranih projektov', 'Poveži svojega agenta + izvoz podatkov', 'Prednostna podpora'],
    },
  ];

  return (
    <div className="fl" ref={flRef}>
      <style dangerouslySetInnerHTML={{ __html: `
        .fl { --font-serif: var(--font-serif-flow); position: relative; z-index: 1; color: var(--ink); font-weight: 300; overflow-x: clip; }

        /* Ozadje: mreza + vijola/zelena animirani blobi (kot naslovnica) */
        /* POZOR: NE position:fixed! Znotraj Lenis transform ovoja se fixed obnaša
           kot absolute in v Safari/Chrome pokvari izris vsebine nad njim (sekcije
           ostanejo prazne). absolute + polna višina .fl deluje pravilno. */
        .fl-ozadje { position: absolute; inset: 0; z-index: -1; overflow: hidden; pointer-events: none; background-color: var(--paper); background-image: linear-gradient(rgba(17,17,17,.045) 1px, transparent 1px), linear-gradient(90deg, rgba(17,17,17,.045) 1px, transparent 1px); background-size: 4.5rem 4.5rem; }
        /* BREZ filter:blur (težek GPU sloj -> v Chromu se sekcije ne izrišejo).
           Mehkobo dosežemo z gradientom samim (transparent že pri ~48%). */
        .fl-blob { position: absolute; width: min(62vw, 720px); aspect-ratio: 1; border-radius: 50%; opacity: .6; }
        .fl-blob.v { background: radial-gradient(circle at 50% 50%, oklch(72% .17 297 / .5), transparent 55%); top: -14%; left: -10%; animation: flBlobV 24s ease-in-out infinite; }
        .fl-blob.g { background: radial-gradient(circle at 50% 50%, oklch(82% .13 165 / .48), transparent 55%); bottom: -16%; right: -12%; animation: flBlobG 28s ease-in-out infinite; }
        .fl-blob.v2 { background: radial-gradient(circle at 50% 50%, oklch(78% .12 320 / .4), transparent 58%); top: 42%; right: 18%; width: min(40vw, 460px); animation: flBlobV 32s ease-in-out infinite reverse; }
        @keyframes flBlobV { 0%,100%{transform:translate(0,0) scale(1)} 25%{transform:translate(7vw,6vh) scale(1.12)} 50%{transform:translate(-4vw,10vh) scale(.94)} 75%{transform:translate(5vw,-5vh) scale(1.06)} }
        @keyframes flBlobG { 0%,100%{transform:translate(0,0) scale(1)} 25%{transform:translate(-6vw,-5vh) scale(1.1)} 50%{transform:translate(5vw,-9vh) scale(.95)} 75%{transform:translate(-4vw,5vh) scale(1.05)} }
        @media (prefers-reduced-motion: reduce) { .fl-blob { animation: none; } .fl-orb { animation: none !important; } }

        .fl-oder { max-width: 1480px; margin: 0 auto; padding: clamp(5.5rem, 11vw, 8.5rem) clamp(1.5rem, 5vw, 5.5rem) clamp(5rem, 8vw, 8rem); }

        /* Hero — sekcija naravne višine (vsebina + spodobna spodnja praznina za
           mehurčke). isolation: izolira ozadje, da ne pokvari izrisa sekcij pod njim.
           Ozadje (.fl-herobg) je height:100% → se ujema s hero sekcijo in NE štrli. */
        .fl-hero { position: relative; min-height: calc(94svh + 80px); isolation: isolate; }
        .fl .kicker { font-size: .72rem; font-weight: 600; letter-spacing: .24em; text-transform: uppercase; color: rgba(17,17,17,.72); }
        .fl .kicker b { color: var(--accent); font-weight: 700; }
        .fl h1 { font-family: var(--font-serif), Didot, serif; font-weight: 500; font-size: clamp(2.7rem, 8.5vw, 5.2rem); line-height: .97; letter-spacing: -.015em; margin: .7rem 0 1.3rem; max-width: 15ch; }
        .fl h1 em { font-style: italic; }
        .fl .lead { font-size: clamp(1.08rem, 2.1vw, 1.35rem); line-height: 1.55; color: rgba(17,17,17,.82); max-width: 46ch; margin: 0 0 2.2rem; }
        .fl .cta-vrsta { display: flex; flex-wrap: wrap; gap: .8rem; align-items: center; }
        .fl .cta { position: relative; overflow: hidden; display: inline-flex; align-items: center; gap: .55rem; font-family: inherit; font-size: .82rem; font-weight: 600; letter-spacing: .12em; text-transform: uppercase; white-space: nowrap; cursor: pointer; border-radius: 999px; padding: 1rem 2rem; border: 1px solid var(--ink); background: var(--ink); color: var(--paper); text-decoration: none; transition: transform .2s ease, box-shadow .2s ease; }
        .fl .cta svg { transition: transform .2s ease; }
        .fl .cta:hover { transform: translateY(-2px); box-shadow: 0 14px 34px rgba(40,25,60,.22); }
        .fl .cta:hover svg { transform: translateX(3px); }
        .fl .cta::after { content: ''; position: absolute; top: 0; left: -160%; width: 90%; height: 100%; background: linear-gradient(120deg, transparent 0%, rgba(255,255,255,.95) 50%, transparent 100%); transform: skewX(-18deg); transition: left .6s cubic-bezier(.19,1,.22,1); pointer-events: none; }
        .fl .cta:hover::after { left: 170%; }
        .fl .cta.duh { background: transparent; color: var(--ink); border-color: rgba(17,17,17,.72); }
        .fl .cta.duh::after { background: linear-gradient(120deg, transparent 0%, rgba(255,255,255,.6) 50%, transparent 100%); }
        .fl .cta-note { font-size: .8rem; color: rgba(17,17,17,.72); }
        .fl-hero-vid-mob { display: none; }
        /* SCENA (slika + odsev + teg-i) — GLOBALNO, da velja v PORTRETU IN LANDSCAPE (prej je bila
           zaprta v @media <=820, zato v landscape slika ni bila zrcaljena in odsev/teg-i so bili narobe).
           Zgrajena pri fiksnih 620px; JS jo skalira KOT CELOTO (transform: scale = širina/620). */
        .fl-pupa-scene { position: absolute; top: 0; left: 0; width: 620px; height: 620px; transform-origin: top left; transform: scale(.5); }
        .fl-pupa-scene > img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: contain; object-position: center bottom; transform: scaleX(-1); display: block; }
        .fl-pupa-scene .fl-notif { display: block; }
        @media (max-width: 820px) {
          .fl-hero { min-height: auto; }
          /* portret: scena kot centriran blok pod gumbi */
          .fl-hero-vid-mob { display: block; position: relative; margin: 1.6rem auto 0; width: 100%; max-width: 30rem; aspect-ratio: 1; overflow: hidden; }
          /* visja specificnost (.fl .fl-potek), da premaga bazni negativni margin nize v datoteki
             (sicer kartice zlezejo GOR cez hero video) */
          .fl .fl-potek { margin: 3.2rem 0 0 !important; }
        }
        /* Ležeči (landscape) telefon — nizek viewport: naslov/podnaslov manjša, potek kartice
           NE prekrivajo naslova (odstranimo velik negativni margin), ilustracija dobi več prostora. */
        @media (min-width: 700px) and (max-height: 560px) {
          .fl-hero { min-height: auto; }
          .fl .kicker { font-size: .62rem; letter-spacing: .16em; }
          /* manjši naslov + podnaslov, da gumbi pridejo v vidno polje (nizek zaslon) */
          .fl h1 { font-size: clamp(1.55rem, 4.4vw, 2.3rem); line-height: 1.02; margin: .4rem 0 .7rem; }
          .fl .lead { font-size: .82rem; line-height: 1.45; margin-bottom: 1rem; max-width: 34ch; }
          .fl .cta-vrsta { gap: .5rem; }
          .fl .cta { padding: .52rem 1rem; font-size: .68rem; }
          /* "Kalkulator je brezplačen" v svojo vrstico POD gumboma */
          .fl .cta-note { flex-basis: 100%; width: 100%; font-size: .72rem; margin-top: .15rem; }
          .fl .fl-potek { margin: 2.4rem 0 0 !important; }
          /* pupa = ISTA skalirna scena kot portret, a na DESNI (namesto bg .fl-video, ki je skrit).
             .fl-hero je position:relative, zato absolutno sidranje deluje. */
          /* velikost omejena po ŠIRINI in VIŠINI (84vh), da se kvadratna scena vedno prilega
             nizkemu zaslonu (npr. 852×393 ne štrli pod rob). */
          .fl-hero-vid-mob { display: block; position: absolute; right: 0; left: auto; top: -36px; margin: 0; width: min(56vw, 440px, 84vh); max-width: none; aspect-ratio: 1; overflow: hidden; z-index: 2; }
        }
        /* iPad / tablet (širok IN visok): privzeti naslov (do 5.2rem) je prevelik in »asistentko.«
           se preveč približa podnaslovu — malo pomanjšamo naslov in podnaslov. */
        /* iPad mini in podobni širok+NIZEK tablet (npr. mini landscape 1133×744). 13″ iPad je visok
           (>900px) -> izvzet, tam je privzeti (desktop) videz OK. */
        @media (min-width: 821px) and (max-width: 1200px) and (min-height: 561px) and (max-height: 900px) {
          .fl h1 { font-size: clamp(2.3rem, 6vw, 3.9rem); }
          .fl .lead { font-size: clamp(1.05rem, 1.7vw, 1.18rem); }
          /* nižji hero -> gumbi pridejo višje; skoraj brez negativnega margina -> potek kartice
             pridejo POD gumbe in jih ne prekrivajo (desktop -267px je za iPad prevelik). */
          .fl-hero { min-height: calc(76svh + 20px); }
          .fl .fl-potek { margin-top: -1rem !important; }
        }
        /* Pokončni tablet (visok+ozek, npr. 13" iPad 1024×1366): naslov malo manjši, hero nižji
           (sicer je ogromna praznina), papirna kepa večja (na tem zaslonu je videti premajhna).
           Velikost/pozicijo ilustracije uravnamo v FlowHeroBg (vodimo po širini). */
        @media (min-width: 821px) and (max-width: 1200px) and (min-height: 901px) {
          .fl h1 { font-size: clamp(2.5rem, 6.2vw, 4.2rem); }
          .fl .lead { font-size: clamp(1.05rem, 1.6vw, 1.2rem); }
          .fl-hero { min-height: calc(72svh + 40px); }
          .fl-fly { width: 15rem; }
        }
        /* Sekcija "Zakaj zaupati" (4 kartice): na tablet širinah auto-fit da 3+1 (nesimetrično).
           Na 481–1000px prisilimo 2×2 (uravnoteženo). !important premaga inline gridTemplateColumns. */
        @media (min-width: 481px) and (max-width: 1000px) {
          .fl-zaupanje-mreza { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
        }

        /* Poteka: od ponudbe do racuna */
        .fl-potek { margin: calc(-11.6875rem - 80px) 0 0; position: relative; z-index: 2; }
        .fl-potek .k { font-size: .72rem; font-weight: 600; letter-spacing: .2em; text-transform: uppercase; color: rgba(17,17,17,.72); }
        .fl-potek h2 { font-family: var(--font-serif), serif; font-weight: 500; font-size: clamp(1.9rem, 5vw, 2.9rem); line-height: 1.05; margin: .55rem 0 2.2rem; max-width: 20ch; }
        .fl-koraki { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1.3rem; }
        @media (max-width: 980px) { .fl-koraki { grid-template-columns: repeat(2, 1fr); gap: 1.4rem; } }
        @media (max-width: 560px) { .fl-koraki { grid-template-columns: 1fr; } }
        .fl-korak { position: relative; padding: 1.5rem 1.4rem; border-radius: 18px; background: linear-gradient(140deg, oklch(97% .022 297 / .9), oklch(96% .03 165 / .85)); border: 1px solid rgba(255,255,255,.6); box-shadow: 0 12px 34px rgba(40,25,60,.07); }
        .fl-korak .n { font-family: var(--font-serif), serif; font-size: 1.5rem; color: var(--accent); }
        .fl-korak h3 { font-size: 1.02rem; font-weight: 650; margin: .5rem 0 .4rem; }
        .fl-korak p { font-size: .9rem; line-height: 1.6; color: rgba(17,17,17,.74); margin: 0; }

        /* Vmesna sekcija z vrtečim laptopom */
        .fl-laptop { margin: 9.85rem 0 0; display: grid; grid-template-columns: minmax(0, .88fr) minmax(0, 1.28fr); gap: clamp(2rem, 5vw, 4.5rem); align-items: center; }
        @media (max-width: 860px) { .fl-laptop { grid-template-columns: 1fr; gap: 1.5rem; } .fl-laptop-vizual { order: 0; } }
        .fl-laptop-txt .k { font-size: .72rem; font-weight: 600; letter-spacing: .2em; text-transform: uppercase; color: var(--accent); }
        .fl-laptop-txt h2 { font-family: var(--font-serif), serif; font-weight: 500; font-size: clamp(1.9rem, 4.4vw, 3rem); line-height: 1.08; letter-spacing: -.01em; margin: .6rem 0 1rem; max-width: 18ch; }
        .fl-laptop-txt h2 em { font-style: italic; color: var(--accent); }
        .fl-laptop-txt p { font-size: 1.02rem; line-height: 1.6; color: rgba(17,17,17,.76); max-width: 42ch; margin: 0; }
        .fl-laptop-vizual { display: flex; justify-content: center; align-items: center; order: -1; }
        /* 3D laptop (slika) + cist zaslon: mini ponudba z AI posteno ceno */
        .fl-lap { position: relative; width: min(100%, 680px); }
        .fl-lap-img { display: block; width: 100%; height: auto; }
        .fl-lap-screen { position: absolute; top: 31%; left: 30%; width: 41%; height: 26%; overflow: hidden; border-radius: 5px; background: #fbfaff; }
        .fl-lap-doc2 { box-sizing: border-box; height: 100%; padding: 8% 9%; display: flex; flex-direction: column; gap: 8%; justify-content: center; }
        .fl-lap-doc2-top { display: flex; align-items: center; justify-content: space-between; gap: 6%; }
        .fl-lap-doc2-top b { height: 6px; width: 34%; border-radius: 3px; background: oklch(70% .13 297); }
        .fl-lap-ai { font-size: .5rem; font-weight: 800; letter-spacing: .01em; color: oklch(50% .16 300); background: oklch(95% .045 300); border-radius: 999px; padding: 2px 7px; white-space: nowrap; }
        .fl-lap-row { display: flex; align-items: center; gap: 7%; }
        .fl-lap-row i { height: 6px; flex: 1; border-radius: 3px; background: oklch(88% .03 297); }
        .fl-lap-row i.w2 { flex: .68; }
        .fl-lap-row em { font-style: normal; font-size: .58rem; font-weight: 800; color: oklch(42% .02 285); white-space: nowrap; }
        .fl-lap-sum { display: flex; align-items: center; justify-content: space-between; margin-top: 2%; padding-top: 7%; border-top: 1px solid oklch(90% .012 297); }
        .fl-lap-sum b { height: 6px; width: 28%; border-radius: 3px; background: oklch(84% .03 297); }
        .fl-lap-sum strong { font-size: .72rem; font-weight: 800; color: #fff; background: oklch(24% .016 285); border-radius: 999px; padding: 2px 9px; }
        .fl-lap-ui { position: absolute; inset: 0; opacity: 0; animation: lapCyc 15s infinite; }
        .fl-lap-ui.lu1 { animation-delay: 0s; }
        .fl-lap-ui.lu2 { animation-delay: 5s; }
        .fl-lap-ui.lu3 { animation-delay: 10s; }
        @keyframes lapCyc { 0% { opacity: 0; } 2% { opacity: 1; } 31% { opacity: 1; } 33% { opacity: 0; } 100% { opacity: 0; } }
        .fl-lap-tag { align-self: flex-start; font-size: .5rem; font-weight: 800; letter-spacing: .01em; border-radius: 999px; padding: 2px 7px; white-space: nowrap; }
        .fl-lap-tag.t-proj { color: oklch(48% .14 300); background: oklch(95% .04 300); }
        .fl-lap-tag.t-cal { color: oklch(45% .12 165); background: oklch(94% .05 165); }
        .fl-lap-list { box-sizing: border-box; height: 100%; padding: 9%; display: flex; flex-direction: column; gap: 9%; justify-content: center; }
        .fl-lap-lrow { display: flex; align-items: center; gap: 6%; }
        .fl-dot { width: 7px; height: 7px; border-radius: 50%; flex: none; }
        .fl-dot.g { background: oklch(62% .15 150); }
        .fl-dot.o { background: oklch(72% .16 75); }
        .fl-lap-lrow b { height: 6px; flex: 1; border-radius: 3px; background: oklch(88% .03 297); }
        .fl-lap-lrow b.w2 { flex: .72; }
        .fl-lap-lrow b.w3 { flex: .58; }
        .fl-lap-lrow em { font-style: normal; font-size: .44rem; font-weight: 800; border-radius: 999px; padding: 1px 6px; white-space: nowrap; }
        .fl-lap-lrow em.ok { color: oklch(46% .1 155); background: oklch(94% .04 155); }
        .fl-lap-lrow em.wa { color: oklch(52% .11 70); background: oklch(95% .04 80); }
        .fl-lap-cal2 { box-sizing: border-box; height: 100%; padding: 10% 9%; display: flex; flex-direction: column; gap: 13%; justify-content: center; }
        .fl-lap-week { display: grid; grid-template-columns: repeat(7, 1fr); gap: 5%; }
        .fl-lap-week i { height: 12px; border-radius: 3px; background: oklch(93% .02 297); }
        .fl-lap-week i.on { background: oklch(66% .16 300); }
        .fl-lap-ev { display: flex; flex-direction: column; gap: 20%; }
        .fl-lap-ev span { height: 6px; border-radius: 3px; }
        .fl-lap-ev .e1 { width: 70%; background: oklch(84% .09 165); }
        .fl-lap-ev .e2 { width: 50%; margin-left: 12%; background: oklch(86% .08 75); }
        @media (prefers-reduced-motion: reduce) { .fl-lap-ui { animation: none; } .fl-lap-ui.lu1 { opacity: 1; } }
        .fl-rl { width: 100%; max-width: 560px; aspect-ratio: 4 / 3; }
        @media (max-width: 860px) { .fl-rl { max-width: 440px; } }

        /* Orodja mreza */
        .fl-orodja { margin: 9.85rem 0 0; padding-top: 2.6rem; }
        .fl-orodja .k { font-size: .72rem; font-weight: 600; letter-spacing: .2em; text-transform: uppercase; color: rgba(17,17,17,.72); }
        .fl-orodja h2 { font-family: var(--font-serif), serif; font-weight: 500; font-size: clamp(1.9rem, 5vw, 2.9rem); line-height: 1.05; margin: .55rem 0 .5rem; max-width: 20ch; }
        .fl-orodja .uvod { font-size: 1rem; line-height: 1.6; color: rgba(17,17,17,.76); max-width: 50ch; margin: 0 0 2.4rem; }
        .fl-orodja-nadzor { display: flex; align-items: center; justify-content: space-between; gap: 1rem; margin: 1.9rem 0 1.3rem; flex-wrap: wrap; }
        .fl-rubrike { display: inline-flex; gap: .25rem; padding: .28rem; border-radius: 999px; background: oklch(93% .012 87); flex-wrap: wrap; }
        .fl-rubrike button { border: 0; background: transparent; font-family: var(--font-sans), system-ui, sans-serif; font-size: .82rem; font-weight: 650; color: rgba(17,17,17,.62); padding: .5rem 1rem; border-radius: 999px; cursor: pointer; transition: background .18s, color .18s; white-space: nowrap; }
        .fl-rubrike button.on { background: var(--ink); color: var(--paper); }
        .fl-puscice { display: flex; gap: .5rem; }
        .fl-puscice button { width: 2.7rem; height: 2.7rem; display: grid; place-items: center; border-radius: 50%; border: 1px solid rgba(17,17,17,.16); background: var(--paper); color: var(--ink); cursor: pointer; transition: background .16s, border-color .16s; }
        .fl-puscice button:hover { background: rgba(17,17,17,.05); border-color: var(--ink); }
        @media (max-width: 560px) { .fl-puscice { display: none; } }
        @media (max-width: 640px) {
          /* Filter pilule: vodoraven drs namesto grdega lomljenja; zbledi desno = namig za drs */
          .fl-orodja-nadzor { justify-content: center; }
          .fl-rubrike { flex-wrap: nowrap; overflow-x: auto; max-width: 100%; scrollbar-width: none; border-radius: 16px; -webkit-mask-image: linear-gradient(to right, #000 88%, transparent); mask-image: linear-gradient(to right, #000 88%, transparent); }
          .fl-rubrike::-webkit-scrollbar { display: none; }
          .fl-rubrike button { flex: 0 0 auto; }
          /* Showcase pilule (Kalkulator/Dokumenti/…): zbledi desno, da je jasno, da se drsi */
          .fl-sc-pills { -webkit-mask-image: linear-gradient(to right, #000 80%, transparent); mask-image: linear-gradient(to right, #000 80%, transparent); }
          /* Manjsi razmiki med sekcijami na mobilu (visja specificnost .fl X -> premaga bazni velik margin ~158px; -80px, enakomerno) */
          .fl .fl-laptop, .fl .fl-orodja, .fl .fl-showcase, .fl .fl-bento, .fl .fl-konec, .fl .fl-funkcije, .fl .fl-cenik, .fl .fl-faq, .fl .fl-zgodba { margin-top: 4.9rem; }
          .fl .fl-footer { margin-top: 5rem; }
          /* Pupa na mobilu vecja: vzrok drobne figure = object-fit:contain + max-width:100% stisne SIROK okvir (2200px)
             v 375px sirino -> figura ~142px. Sprostim sirino (naravna velikost, kot desktop) -> figura ~426px.
             Element je zdaj sirsi od zaslona (v overflow:hidden pasu), zato korak hoje racunam v % ELEMENTA (pupaHojaM). */
          .fl .fl-pupa-pas { height: clamp(27.5rem, 82vw, 38rem); bottom: -4.75rem; }
          .fl .fl-pupa { max-width: none; width: auto; height: 100%; }
          .fl .fl-pupa.hodi { animation-name: pupaHojaM; }
          .fl-orodja, .fl-showcase, .fl-cenik, .fl-konec, .fl-faq { padding-top: 1.2rem; }
          /* Bento: vec zraka med besedilom in tagi/avatarji/ceno */
          .fl .fl-bflow, .fl .fl-bavatars, .fl .fl-bprice, .fl .fl-bthumbs { margin-top: 2.8rem; }
          /* Tesnejsi naslovi (manj razmika med vrsticami) */
          .fl h1 { line-height: 1.02; }
          .fl-showcase-glava h2 { line-height: 1.02; }
        }
        /* prva kartica poravnana na LEVI rob vsebine (brez levega margina/reza); desno full-bleed za drs-off */
        /* Full-bleed na NE-drsecem wrapperju; scroll vsebnik brez negativne margine -> robusten touch scroll (iOS ne zajame margine pod overflow:clip starsem) */
        .fl-orodja-bleed { margin-inline: calc(50% - 50vw); }
        .fl-orodja-vrsta { display: flex; gap: 1rem; overflow-x: auto; padding: .6rem clamp(1.2rem, 4vw, 1.6rem) 1.2rem; scroll-padding-inline: clamp(1.2rem, 4vw, 1.6rem); scrollbar-width: none; -webkit-overflow-scrolling: touch; overscroll-behavior-x: contain; }
        .fl-orodja-vrsta::-webkit-scrollbar { display: none; }
        .fl-tkarta { flex: 0 0 clamp(15rem, 23vw, 17.5rem); display: block; padding: 1.5rem 1.4rem 1.6rem; border-radius: 18px; background: rgba(255,255,255,.94); border: 1px solid rgba(255,255,255,.9); box-shadow: 0 12px 32px rgba(40,25,60,.07); text-decoration: none; color: var(--ink); transition: transform .22s cubic-bezier(.16,1,.3,1), box-shadow .22s ease; }
        .fl-tkarta:hover { transform: translateY(-4px); box-shadow: 0 22px 48px rgba(40,25,60,.14); }
        .fl-tkarta-ikona { display: inline-flex; align-items: center; justify-content: center; width: 2.7rem; height: 2.7rem; border-radius: 13px; background: oklch(93% .055 var(--h, 297)); color: oklch(52% .15 var(--h, 297)); margin-bottom: .95rem; transition: transform .22s cubic-bezier(.16,1,.3,1); }
        .fl-tkarta:hover .fl-tkarta-ikona { transform: scale(1.07) rotate(-3deg); }
        .fl-tkarta h3 { font-size: 1.02rem; font-weight: 650; margin: 0 0 .35rem; display: flex; align-items: center; gap: .5rem; }
        .fl-tkarta p { font-size: .86rem; line-height: 1.55; color: rgba(17,17,17,.72); margin: 0; }
        .fl-znacka { font-size: .6rem; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; color: oklch(45% .13 155); background: oklch(92% .08 160); border-radius: 999px; padding: .2rem .5rem; }

        /* Interaktivni prikaz orodij (Magnific slog, Flow paleta) */
        .fl-showcase { margin: 9.85rem 0 0; padding-top: 2.6rem; }
        .fl-showcase-glava { text-align: center; max-width: 42ch; margin: 0 auto 1.8rem; }
        .fl-showcase-glava .k { font-size: .72rem; font-weight: 600; letter-spacing: .2em; text-transform: uppercase; color: rgba(17,17,17,.72); }
        .fl-showcase-glava h2 { font-family: var(--font-serif), serif; font-weight: 500; font-size: clamp(1.9rem, 5vw, 2.9rem); line-height: 1.05; margin: .55rem auto .5rem; max-width: 20ch; text-wrap: balance; }
        .fl-showcase-glava p { font-size: 1rem; line-height: 1.6; color: rgba(17,17,17,.76); margin: 0 auto; }
        .fl-sc-pills { display: flex; flex-wrap: nowrap; justify-content: center; gap: .5rem; margin: 0 auto 1.7rem; max-width: 62rem; }
        @media (max-width: 900px) { .fl-sc-pills { overflow-x: auto; justify-content: flex-start; scrollbar-width: none; padding-bottom: .2rem; } .fl-sc-pills::-webkit-scrollbar { display: none; } .fl-sc-pill { flex: 0 0 auto; } }
        .fl-sc-pill { display: inline-flex; align-items: center; gap: .5rem; padding: .58rem .95rem; border-radius: 999px; border: 1px solid rgba(17,17,17,.14); background: rgba(255,255,255,.72); font-family: var(--font-sans), system-ui, sans-serif; font-size: .85rem; font-weight: 600; color: rgba(17,17,17,.7); cursor: pointer; white-space: nowrap; transition: color .16s, border-color .16s, background .16s, transform .16s; }
        .fl-sc-pill svg { opacity: .75; }
        .fl-sc-pill:hover { color: var(--ink); border-color: rgba(17,17,17,.72); transform: translateY(-1px); }
        .fl-sc-pill.on { background: var(--ink); color: var(--paper); border-color: var(--ink); }
        .fl-sc-pill.on svg { opacity: 1; }
        .fl-sc-badge { font-size: .56rem; font-weight: 700; letter-spacing: .07em; text-transform: uppercase; border-radius: 999px; padding: .16rem .44rem; }
        .fl-sc-badge.free { color: oklch(45% .13 155); background: oklch(92% .08 160); }
        .fl-sc-badge.beta { color: oklch(50% .17 297); background: oklch(93% .06 300); }
        .fl-sc-badge.soon { color: rgba(17,17,17,.62); background: rgba(17,17,17,.08); }
        .fl-sc-pill.on .fl-sc-badge { background: rgba(255,255,255,.18); color: rgba(255,255,255,.92); }
        .fl-sc-track { position: relative; }
        /* Desktop: viden je LE aktiven panel (.on) — po starem. */
        .fl-sc-panel { position: relative; display: none; grid-template-columns: minmax(0, 1fr) minmax(0, 1.12fr); gap: clamp(1.6rem, 4vw, 3.2rem); align-items: center; border-radius: 26px; padding: clamp(2rem, 4vw, 3.2rem); background: linear-gradient(135deg, oklch(96% .03 297), oklch(95% .035 320), oklch(95% .03 165)); border: 1px solid rgba(255,255,255,.7); box-shadow: 0 20px 60px rgba(40,25,60,.1); overflow: hidden; }
        .fl-sc-panel.on { display: grid; animation: flScIn .5s cubic-bezier(.16,1,.3,1); }
        @media (max-width: 860px) {
          /* Mobilno: carousel — vsi paneli side-by-side, vodoraven snap, naslednji se malce vidi. */
          .fl-sc-track { display: flex; gap: 1rem; overflow-x: auto; scroll-snap-type: x mandatory; -webkit-overflow-scrolling: touch; overscroll-behavior-x: contain; scrollbar-width: none;
            margin-inline: calc(50% - 50vw); padding: .5rem clamp(1.25rem, 5vw, 1.6rem) 1.2rem; scroll-padding-inline: clamp(1.25rem, 5vw, 1.6rem); }
          .fl-sc-track::-webkit-scrollbar { display: none; }
          /* pilli full-bleed do živega roba (naslednji pill sega do roba zaslona, ne do oder-paddinga) */
          .fl-sc-pills { margin-inline: calc(50% - 50vw); max-width: none; justify-content: flex-start; padding: 0 clamp(1.25rem, 5vw, 1.6rem) .2rem; scroll-padding-inline: clamp(1.25rem, 5vw, 1.6rem); }
          .fl-sc-panel, .fl-sc-panel.on { display: grid; grid-template-columns: 1fr; flex: 0 0 86%; scroll-snap-align: center; animation: none; }
          /* CTA v ožjem panelu naj bo manjši in v eni vrstici (ne »ODPRI / KALKULATOR«) */
          .fl-sc-info .cta { align-self: flex-start; padding: .8rem 1.4rem; font-size: .76rem; letter-spacing: .07em; }
        }
        /* Ležeči (landscape) telefon: nizek+širok viewport -> panel spet 2-stolpčni
           (tekst levo, slika/mock desno), da gre na eno stran brez dolgega drsanja.
           Pride ZA mobilnim pravilom, da premaga single-column. */
        @media (max-width: 950px) and (max-height: 560px) {
          .fl-sc-panel, .fl-sc-panel.on { grid-template-columns: minmax(0, 1fr) minmax(0, 1.05fr); align-items: center; }
        }
        .fl-sc-vizual { position: relative; }
        .fl-sc-video { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; border-radius: 14px; opacity: 0; transition: opacity .35s ease; box-shadow: 0 24px 60px rgba(40,25,60,.18); }
        .fl-sc-info h3 { font-family: var(--font-serif), serif; font-weight: 500; font-size: clamp(1.55rem, 3.6vw, 2.25rem); line-height: 1.08; margin: 0 0 .6rem; max-width: 18ch; }
        .fl-sc-info > p { font-size: 1rem; line-height: 1.6; color: rgba(17,17,17,.8); max-width: 46ch; margin: 0; }
        .fl-sc-tocke { list-style: none; margin: 1.25rem 0 1.7rem; padding: 0; display: grid; gap: .6rem; }
        .fl-sc-tocke li { display: flex; align-items: flex-start; gap: .55rem; font-size: .9rem; line-height: 1.4; color: rgba(17,17,17,.82); }
        .fl-sc-tocke li svg { flex: none; margin-top: .08rem; color: oklch(52% .13 155); }
        .fl-sc-anim { animation: flScIn .5s cubic-bezier(.16,1,.3,1); }
        @keyframes flScIn { from { opacity: 0; transform: translateY(9px); } to { opacity: 1; transform: translateY(0); } }
        @media (prefers-reduced-motion: reduce) { .fl-sc-anim { animation: none; } }

        /* Predogledni mocki v prikazu */
        /* Frosted glass mockup (moderno) — prosojno + backdrop-blur; lepo nad gradientnimi blobi. */
        .fl-mock { border-radius: 16px; overflow: hidden; background: oklch(99% .006 297 / .66); backdrop-filter: blur(16px) saturate(1.25); -webkit-backdrop-filter: blur(16px) saturate(1.25); border: 1px solid rgba(255,255,255,.65); box-shadow: 0 24px 60px rgba(40,25,60,.18), inset 0 1px 0 rgba(255,255,255,.5); }
        .fl-mock-bar { display: flex; align-items: center; gap: .4rem; padding: .5rem .75rem; background: oklch(96% .008 87); border-bottom: 1px solid rgba(17,17,17,.07); }
        .fl-mock-bar i { width: .55rem; height: .55rem; border-radius: 50%; background: rgba(17,17,17,.18); }
        .fl-mock-bar small { margin-left: .5rem; font-size: .62rem; letter-spacing: .04em; color: rgba(17,17,17,.68); }
        .fl-pupa-mock { position: relative; overflow: hidden; }
        /* živ preliv, kot na Pupinem domu — počasen, da ne vleče pogleda nase */
        .fl-pupa-aura { position: absolute; inset: -30%; z-index: 0; border-radius: 50%; filter: blur(38px); opacity: .55;
          background: conic-gradient(from 0deg, #cbb7f0, #a9e3d5, #f4d7c4, #c3d5f7, #cbb7f0);
          animation: fl-pupa-vrti 18s linear infinite; }
        .fl-pupa-mock > .fl-msg, .fl-pupa-vnos { position: relative; z-index: 1; }
        @keyframes fl-pupa-vrti { to { transform: rotate(360deg); } }
        @media (prefers-reduced-motion: reduce) { .fl-pupa-aura { animation: none; } }
        .fl-pupa-vnos { display: flex; align-items: center; gap: .5rem; margin-top: auto; padding: .5rem .55rem; border-radius: 999px; background: rgba(255,255,255,.82); -webkit-backdrop-filter: blur(8px); backdrop-filter: blur(8px); box-shadow: 0 4px 16px rgba(17,17,17,.07); }
        .fl-pupa-znacka { flex: none; padding: .2rem .5rem; border-radius: 999px; background: #fff; font-size: .58rem; font-weight: 800; font-style: normal; color: #6E4FA6; }
        .fl-pupa-crta { flex: 1; height: .5rem; border-radius: 999px; background: rgba(17,17,17,.09); }
        .fl-pupa-gumb { flex: none; padding: .22rem .6rem; border-radius: 999px; background: #111; color: #fff; font-size: .58rem; font-weight: 800; font-style: normal; }
        .fl-mock-body { position: relative; padding: 1.15rem; display: grid; gap: .65rem; min-height: 17rem; align-content: start; }
        .fl-msg { display: inline-flex; align-items: center; gap: .5rem; max-width: 82%; padding: .55rem .8rem; border-radius: 14px; font-size: .8rem; font-weight: 600; line-height: 1.3; }
        .fl-msg.bot { background: oklch(96% .012 297); color: var(--ink); border-top-left-radius: 4px; justify-self: start; }
        .fl-msg.me { background: oklch(90% .055 190); color: var(--ink); border-top-right-radius: 4px; justify-self: end; }
        @property --pupaKot { syntax: '<angle>'; initial-value: 210deg; inherits: false; }
        .fl-ava { width: 1.4rem; height: 1.4rem; border-radius: 50%; flex: none; background: radial-gradient(58% 48% at 30% 24%, rgba(255,255,255,.9), rgba(255,255,255,0) 62%), conic-gradient(from var(--pupaKot), #7C3AED, #EC4899, #F59E0B, #38BDF8, #7C3AED); animation: flPupaPreliv 9s linear infinite, flPupaDih 4.5s ease-in-out infinite; }
        /* Pupa orb "diha" in se preliva -> moderna gradient animacija. @property fallback: brez animacije (varno). Zankasto, nikoli ne skrije nicesar. */
        @keyframes flPupaPreliv { to { --pupaKot: 570deg; } }
        @keyframes flPupaDih { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.08); } }
        @media (prefers-reduced-motion: reduce) { .fl-ava { animation: none; } }
        .fl-mockchip { position: absolute; right: 1.15rem; bottom: 1.15rem; display: inline-flex; align-items: center; gap: .4rem; padding: .5rem .72rem; border-radius: 12px; background: var(--ink); color: var(--paper); font-size: .74rem; font-weight: 700; box-shadow: 0 8px 20px rgba(40,25,60,.22); }
        /* Samograditev: mehurčki priletijo eden za drugim, potem se nežno prezidajo (zanka = "watch it build"). */
        @keyframes flMockBuild {
          0% { opacity: 0; transform: translateY(10px) scale(.97); }
          7% { opacity: 1; transform: none; }
          86% { opacity: 1; transform: none; }
          95% { opacity: 0; transform: translateY(-6px); }
          100% { opacity: 0; transform: translateY(10px) scale(.97); }
        }
        .fl-mock-body > * { animation: flMockBuild 9.5s cubic-bezier(.22,1,.36,1) infinite backwards; }
        .fl-mock-body > *:nth-child(1) { animation-delay: 0s; }
        .fl-mock-body > *:nth-child(2) { animation-delay: .55s; }
        .fl-mock-body > *:nth-child(3) { animation-delay: 1.1s; }
        .fl-mock-body > *:nth-child(4) { animation-delay: 1.65s; }
        .fl-mock-body > *:nth-child(5) { animation-delay: 2.2s; }
        @media (prefers-reduced-motion: reduce) { .fl-mock-body > * { animation: none; } }
        .fl-doc { padding: 1.3rem 1.25rem; display: grid; gap: .45rem; align-content: start; min-height: 15.5rem; }
        .fl-doc-lp { display: flex; justify-content: space-between; align-items: baseline; border-bottom: 1px solid rgba(17,17,17,.1); padding-bottom: .55rem; margin-bottom: .35rem; }
        .fl-doc-lp strong { font-family: var(--font-serif), serif; font-weight: 500; font-size: 1.15rem; }
        .fl-doc-lp span { font-size: .66rem; letter-spacing: .04em; color: rgba(17,17,17,.62); }
        .fl-doc-row { display: flex; justify-content: space-between; gap: 1rem; font-size: .82rem; color: rgba(17,17,17,.78); padding: .22rem 0; }
        .fl-doc-row b { font-weight: 550; }
        .fl-doc-total { display: flex; justify-content: space-between; margin-top: .5rem; padding-top: .6rem; border-top: 1px solid rgba(17,17,17,.14); font-family: var(--font-serif), serif; font-size: 1.05rem; }
        .fl-dash { padding: 1.3rem 1.25rem; display: grid; gap: 1.1rem; align-content: start; min-height: 15.5rem; }
        .fl-dash-top { display: flex; align-items: center; gap: 1.1rem; }
        .fl-donut { width: 4.4rem; height: 4.4rem; border-radius: 50%; flex: none; background: conic-gradient(oklch(66% .2 297) 0 62%, oklch(93.5% .005 87) 62% 100%); display: grid; place-items: center; }
        .fl-donut i { width: 2.9rem; height: 2.9rem; border-radius: 50%; background: #fff; display: grid; place-items: center; font-style: normal; font-size: .8rem; font-weight: 700; color: var(--ink); }
        .fl-dash-kpi { display: grid; gap: .2rem; }
        .fl-dash-kpi span { font-size: .7rem; color: rgba(17,17,17,.62); }
        .fl-dash-kpi strong { font-family: var(--font-serif), serif; font-weight: 500; font-size: 1.5rem; }
        .fl-bench { display: grid; gap: .5rem; }
        .fl-bench-label { display: flex; justify-content: space-between; font-size: .7rem; color: rgba(17,17,17,.72); }
        .fl-bench-you { color: var(--ink); font-weight: 700; }
        .fl-bench-bar { position: relative; height: .62rem; border-radius: 999px; background: linear-gradient(90deg, oklch(88% .09 30), oklch(92% .1 90), oklch(85% .13 155)); }
        .fl-bench-mark { position: absolute; top: 50%; left: 68%; width: 1rem; height: 1rem; border-radius: 50%; background: var(--ink); border: 2px solid #fff; transform: translate(-50%, -50%); box-shadow: 0 2px 7px rgba(0,0,0,.28); }
        .fl-agent-note { margin-top: .3rem; display: flex; gap: .65rem; align-items: center; padding: .7rem .85rem; border-radius: 12px; background: oklch(95% .04 297); border: 1px solid oklch(88% .05 297); }
        .fl-agent-note b { font-size: .8rem; }
        .fl-agent-note small { font-size: .7rem; color: rgba(17,17,17,.72); }
        .fl-agent-dot { position: relative; width: 1.9rem; height: 1.9rem; border-radius: 50%; flex: none; overflow: hidden; background: conic-gradient(from 210deg,#ffd54a,#7be0a0,#63c7e8,#a78bfa,#f78fb0,#ffd54a); }
        .fl-code { position: relative; padding: 1.3rem 1.35rem; min-height: 15.5rem; background: oklch(22% .016 285); display: grid; gap: .55rem; align-content: start; }
        .fl-code-line { height: .5rem; border-radius: 999px; background: oklch(40% .03 285); }
        .fl-code-line.a { width: 68%; background: oklch(62% .13 297); }
        .fl-code-line.b { width: 88%; }
        .fl-code-line.c { width: 54%; background: oklch(64% .1 190); }
        .fl-code-line.d { width: 76%; }
        .fl-soon { position: absolute; inset: 0; display: grid; place-content: center; background: oklch(22% .016 285 / .5); backdrop-filter: blur(2px); }
        .fl-soon span { font-family: var(--font-sans), system-ui, sans-serif; font-size: .72rem; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; color: #fff; border: 1px solid rgba(255,255,255,.4); border-radius: 999px; padding: .35rem .9rem; }

        /* Bento "Zacni preprosto" (Magnific slog, Flow paleta) */
        .fl-bento { margin: 9.85rem 0 0; padding-top: 2.6rem; }
        .fl-bento-glava { display: flex; align-items: flex-end; justify-content: space-between; gap: 1.5rem 2rem; flex-wrap: wrap; margin-bottom: 1.9rem; }
        .fl-bento-glava h2 { font-family: var(--font-serif), serif; font-weight: 500; font-size: clamp(1.9rem, 5vw, 3rem); line-height: 1.03; margin: 0; max-width: 16ch; }
        .fl-bento-glava p { font-size: 1rem; line-height: 1.55; color: rgba(17,17,17,.72); margin: .5rem 0 0; max-width: 34ch; }
        .fl-bento-glava .cta { flex: none; }
        .fl-bento-mreza { display: grid; grid-template-columns: 1fr 1fr 1fr; grid-auto-rows: 15.5rem; gap: 1rem; }
        .fl-bkarta { position: relative; overflow: hidden; border-radius: 22px; padding: 1.6rem 1.5rem; display: flex; flex-direction: column; }
        .fl-bkarta h3 { font-size: 1.15rem; font-weight: 650; margin: 0 0 .45rem; line-height: 1.2; }
        .fl-bkarta > p { font-size: .88rem; line-height: 1.5; margin: 0; max-width: 30ch; }
        .fl-bkarta.a { grid-column: 1; grid-row: 1 / span 2; background: rgba(255,255,255,.92); border: 1px solid rgba(255,255,255,.9); box-shadow: 0 12px 32px rgba(40,25,60,.07); color: var(--ink); }
        .fl-bkarta.a > p { color: rgba(17,17,17,.72); }
        .fl-bkarta.b { grid-column: 2 / span 2; grid-row: 1; background: oklch(21% .016 285); color: #fff; }
        .fl-bkarta.c { grid-column: 2; grid-row: 2; background: linear-gradient(150deg, oklch(44% .17 300), oklch(30% .1 300)); color: #fff; }
        .fl-bkarta.d { grid-column: 3; grid-row: 2; background: linear-gradient(150deg, oklch(46% .1 190), oklch(31% .06 200)); color: #fff; }
        .fl-bkarta.b > p, .fl-bkarta.c > p, .fl-bkarta.d > p { color: rgba(255,255,255,.74); }
        .fl-bthumbs { display: grid; grid-template-columns: 1fr 1fr; grid-auto-rows: 1fr; gap: .55rem; margin-top: 1.1rem; flex: 1; min-height: 13rem; }
        .fl-bthumbs span { position: relative; overflow: hidden; min-height: 0; border-radius: 11px; background: linear-gradient(135deg, oklch(90% .07 297), oklch(90% .07 165)); display: grid; place-items: center; }
        .fl-bthumbs span img { width: 100%; height: 100%; object-fit: cover; object-position: top left; display: block; }
        .fl-bshot { flex: 1; min-height: 8rem; margin-top: 1.1rem; border-radius: 13px; overflow: hidden; border: 1px solid rgba(255,255,255,.16); box-shadow: 0 10px 26px rgba(40,25,60,.16); }
        .fl-bkarta.a .fl-bshot { border-color: rgba(42,32,53,.10); }
        .fl-bshot img { width: 100%; height: 100%; object-fit: cover; object-position: center top; display: block; }
        .fl-bkarta.c .fl-bshot { border-color: rgba(255,255,255,.22); }
        /* a) Pupa jedro + ikone orodij, ki krožijo okoli */
        .fl-bhub { position: relative; flex: 1; min-height: 15.5rem; margin-top: .4rem; display: grid; place-items: center; }
        .fl-bhub-core { position: relative; z-index: 2; width: 84px; height: 84px; border-radius: 50%; background: conic-gradient(from 210deg,#ffd54a,#7be0a0,#63c7e8,#a78bfa,#f78fb0,#ffd54a); box-shadow: 0 10px 26px rgba(42,32,53,.24); }
        .fl-bhub-ring { position: absolute; inset: 0; z-index: 1; animation: flOrbit 36s linear infinite; }
        .fl-bhub-bg { position: absolute; top: 50%; left: 50%; width: 220px; height: 220px; transform: translate(-50%, -50%); z-index: 0; overflow: visible; }
        .fl-bhub-ic { position: absolute; top: 50%; left: 50%; width: 46px; height: 46px; margin: -23px; border-radius: 50%; background: #fff; box-shadow: 0 6px 16px rgba(42,32,53,.14); display: grid; place-items: center; color: #6a4bd6; transform: rotate(var(--a)) translate(var(--r)) rotate(calc(-1 * var(--a))); }
        .fl-bhub-ic > i { display: grid; animation: flOrbitRev 36s linear infinite; }
        @keyframes flOrbit { to { transform: rotate(360deg); } }
        @keyframes flOrbitRev { to { transform: rotate(-360deg); } }
        /* b) zaslon, ki menja 3 screene */
        .fl-btekst > p { font-size: .88rem; line-height: 1.5; margin: 0; max-width: 26ch; color: rgba(255,255,255,.74); }
        .fl-bscreen { position: absolute; right: -1.5rem; bottom: -1.6rem; width: 60%; height: 64%; border-top-left-radius: 16px; overflow: hidden; background: #0d0b12; box-shadow: -18px -16px 42px rgba(0,0,0,.34); }
        /* b) node-canvas: barvne mapice + debele svetleče krivulje + ikonice na povezavah */
        .fl-bkarta.b h3, .fl-bkarta.b > p { max-width: 15.5rem; }
        .fl-bnodes { position: absolute; right: -.9rem; top: -.5rem; bottom: -.9rem; width: 64%; }
        .fl-bnodes > svg { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; }
        /* Črte se izrišejo same (stroke-draw v zanki): narišejo se, obstanejo, odtečejo, ponovijo. */
        .fl-bnodes svg g path { stroke-dasharray: 1 1; stroke-dashoffset: 1; animation: flDrawLine 5.4s ease-in-out infinite; }
        .fl-bnodes svg g path:nth-child(3), .fl-bnodes svg g path:nth-child(4) { animation-delay: .6s; }
        @keyframes flDrawLine {
          0% { stroke-dashoffset: 1; }
          42% { stroke-dashoffset: 0; }
          70% { stroke-dashoffset: 0; }
          100% { stroke-dashoffset: -1; }
        }
        .fl-bnodes .fl-badge { animation: flBadgePulse 3.2s ease-in-out infinite; }
        @keyframes flBadgePulse { 0%,100% { box-shadow: 0 6px 14px rgba(0,0,0,.45); } 50% { box-shadow: 0 6px 14px rgba(0,0,0,.45), 0 0 0 7px rgba(139,123,232,.16); } }
        @media (prefers-reduced-motion: reduce) { .fl-bnodes svg g path { animation: none; stroke-dasharray: none; stroke-dashoffset: 0; } .fl-bnodes .fl-badge { animation: none; } }
        .fl-fold { position: absolute; z-index: 2; transform: translate(-50%, -50%); border-radius: 5px 11px 11px 11px; box-shadow: 0 12px 26px rgba(0,0,0,.45); }
        .fl-fold::before { content: ""; position: absolute; top: -8px; left: 0; width: 48%; height: 11px; border-radius: 5px 7px 0 0; background: inherit; }
        .fl-badge { position: absolute; z-index: 3; transform: translate(-50%, -50%); width: 42px; height: 42px; border-radius: 50%; background: #4a3d6b; border: 2px solid rgba(255,255,255,.14); display: grid; place-items: center; color: #fff; box-shadow: 0 6px 14px rgba(0,0,0,.45); }
        .fl-npill { position: absolute; z-index: 3; transform: translate(-50%, -50%); font-size: .7rem; font-weight: 700; color: #fff; padding: .2rem .58rem; border-radius: 8px; box-shadow: 0 6px 14px rgba(0,0,0,.35); white-space: nowrap; }
        .fl-bscreen-dots { position: absolute; left: 0; right: 0; bottom: .55rem; display: flex; justify-content: center; gap: .35rem; z-index: 2; }
        .fl-bscreen-dots i { width: 6px; height: 6px; border-radius: 50%; background: rgba(255,255,255,.35); transition: background .3s, width .3s; }
        .fl-bscreen-dots i.on { width: 16px; border-radius: 3px; background: #fff; }
        /* d) globalno zbiranje podatkov + AI */
        .fl-bglobe { position: relative; flex: 1; min-height: 9rem; margin-top: 1.1rem; display: grid; place-items: center; }
        .fl-bglobe svg { width: 100%; max-width: 250px; height: auto; overflow: visible; }
        .fl-bglobe .dot { transform-box: fill-box; transform-origin: center; animation: flPulse 2.6s ease-in-out infinite; }
        @keyframes flPulse { 0%,100% { opacity: .35; transform: scale(.7); } 50% { opacity: 1; transform: scale(1.15); } }
        .fl-bglobe-ai { position: absolute; top: .2rem; right: .6rem; display: inline-flex; align-items: center; gap: .28rem; padding: .2rem .5rem; border-radius: 999px; background: rgba(255,255,255,.14); color: #fff; font-size: .68rem; font-weight: 700; letter-spacing: .04em; backdrop-filter: blur(4px); }
        .fl-btag { position: absolute; z-index: 3; display: flex; flex-direction: column; align-items: flex-start; gap: .16rem; opacity: 0; animation: flBlink 5.2s ease-in-out infinite; }
        @keyframes flBlink { 0%, 48%, 100% { opacity: 0; transform: scale(.8); } 8%, 34% { opacity: 1; transform: scale(1); } }
        .fl-btag small { font-size: .56rem; color: rgba(255,255,255,.55); }
        .fl-btag b { font-size: .72rem; font-weight: 700; color: #fff; padding: .18rem .62rem; border-radius: 999px; box-shadow: 0 6px 14px rgba(0,0,0,.3); }
        /* c) bela lista strankinih zapisov (peek poleg avatarjev) */
        .fl-clist { position: absolute; right: -1.3rem; bottom: -1.5rem; width: 56%; background: #fff; border-radius: 14px 0 0 0; padding: .9rem 1rem; box-shadow: -14px -12px 32px rgba(40,25,60,.3); }
        .fl-clist .r { display: flex; align-items: center; gap: .55rem; padding: .32rem 0; }
        .fl-clist .r span { width: 15px; height: 15px; border-radius: 50%; background: #ddd6e6; flex: none; }
        .fl-clist .r i { flex: 1; height: 8px; border-radius: 5px; background: #e7e1ee; }
        @media (prefers-reduced-motion: reduce) { .fl-bhub-ring, .fl-bhub-ic > i, .fl-bglobe .dot, .fl-btag { animation: none; } }
        .fl-bthumbs span:nth-child(3n+2) { background: linear-gradient(135deg, oklch(90% .07 330), oklch(90% .06 90)); }
        .fl-bthumbs span:nth-child(3n) { background: linear-gradient(135deg, oklch(90% .06 200), oklch(90% .07 297)); }
        /* mini predogledi orodij (namesto pravih posnetkov — dodava jih kasneje) */
        .fl-bthumbs span > i { display: grid; }
        .fl-th-card { width: 82%; background: #fff; border-radius: 6px; padding: .4rem .42rem; gap: .18rem; box-shadow: 0 4px 12px rgba(40,25,60,.16); }
        .fl-th-card b { display: block; height: .2rem; border-radius: 2px; background: oklch(86% .03 297); }
        .fl-th-card b:nth-child(2) { width: 78%; }
        .fl-th-card b:nth-child(3) { width: 55%; }
        .fl-th-card em { justify-self: start; margin-top: .14rem; font-style: normal; font-size: .48rem; font-weight: 800; color: #fff; background: oklch(24% .016 285); border-radius: 999px; padding: .1rem .3rem; letter-spacing: .01em; }
        .fl-th-calc { grid-auto-flow: column; gap: .26rem; }
        .fl-th-calc > i { width: 1.05rem; height: 1.05rem; border-radius: 50%; box-shadow: inset 0 .12rem .18rem rgba(255,255,255,.65), 0 .12rem .3rem rgba(40,25,60,.16); }
        .fl-th-calc > i.v { background: oklch(70% .13 300); }
        .fl-th-calc > i.m { background: oklch(78% .1 165); }
        .fl-th-calc > i.p { background: oklch(80% .1 350); }
        .fl-th-inv { width: 78%; background: #fff; border-radius: 6px; padding: .38rem; gap: .17rem; box-shadow: 0 4px 12px rgba(40,25,60,.16); }
        .fl-th-inv > i { display: block; height: .18rem; border-radius: 2px; background: oklch(88% .02 297); }
        .fl-th-inv > i:nth-child(2) { width: 80%; }
        .fl-th-inv > i.tot { height: .26rem; width: 42%; justify-self: end; background: oklch(66% .2 297); margin-top: .12rem; }
        .fl-th-cli { grid-auto-flow: column; }
        .fl-th-cli > i { width: 1.1rem; height: 1.1rem; border-radius: 50%; border: 2px solid #fff; margin-left: -.32rem; background: oklch(62% .16 300); box-shadow: 0 .1rem .25rem rgba(40,25,60,.14); }
        .fl-th-cli > i:first-child { margin-left: 0; }
        .fl-th-cli > i:nth-child(2) { background: oklch(66% .12 200); }
        .fl-th-cli > i:nth-child(3) { background: oklch(74% .12 350); }
        .fl-th-donut { width: 2.3rem; height: 2.3rem; border-radius: 50%; background: conic-gradient(oklch(66% .2 297) 0 64%, #fff 64% 100%); box-shadow: 0 .12rem .3rem rgba(40,25,60,.16); }
        .fl-th-donut::after { content: ""; display: block; margin: 27%; width: 46%; height: 46%; background: #fff; border-radius: 50%; }
        .fl-th-cal { grid-template-columns: repeat(3, 1fr); gap: .16rem; width: 62%; }
        .fl-th-cal > i { display: block; aspect-ratio: 1; border-radius: 2px; background: rgba(255,255,255,.72); }
        .fl-th-cal > i.on { background: oklch(66% .2 297); }
        .fl-bflow { display: flex; align-items: center; gap: .5rem; margin-top: auto; flex-wrap: wrap; }
        .fl-bflow b { font-size: .78rem; font-weight: 600; padding: .42rem .72rem; border-radius: 999px; background: rgba(255,255,255,.12); color: #fff; }
        .fl-bflow i { color: rgba(255,255,255,.5); font-style: normal; }
        .fl-bavatars { display: flex; margin-top: auto; }
        .fl-bavatars span { width: 2.1rem; height: 2.1rem; border-radius: 50%; border: 2px solid oklch(35% .12 300); margin-left: -.55rem; display: grid; place-items: center; font-size: .68rem; font-weight: 700; color: #fff; background: oklch(56% .16 300); }
        .fl-bavatars span:first-child { margin-left: 0; }
        .fl-bprice { margin-top: auto; display: inline-flex; align-items: baseline; gap: .4rem; }
        .fl-bprice strong { font-family: var(--font-serif), serif; font-weight: 500; font-size: 2rem; line-height: 1; color: #fff; }
        .fl-bprice span { font-size: .8rem; color: rgba(255,255,255,.7); }
        @media (max-width: 900px) {
          .fl-bento-mreza { grid-template-columns: 1fr 1fr; grid-auto-rows: 13rem; }
          .fl-bkarta.a { grid-column: 1; grid-row: 1 / span 2; }
          .fl-bkarta.b { grid-column: 2; grid-row: 1; flex-direction: column; align-items: stretch; gap: 0; justify-content: flex-start; }
          .fl-bkarta.c { grid-column: 2; grid-row: 2; }
          .fl-bkarta.d { grid-column: 1 / span 2; grid-row: 3; }
          .fl-btekst { flex: none; }
          .fl-bscreen { flex: none; width: auto; height: auto; min-height: 7rem; margin-top: 1rem; transform: none; aspect-ratio: 16 / 10; }
          /* ilustracija poti (mapice/krivulje) potisnjena v spodnji del kartice, da NE prekriva naslova/besedila */
          .fl-bkarta.b .fl-bnodes { top: auto; height: 56%; }
        }
        @media (max-width: 620px) {
          .fl-bento-mreza { grid-template-columns: 1fr; grid-auto-rows: auto; }
          .fl-bkarta { min-height: 12rem; }
          .fl-bkarta.a, .fl-bkarta.b, .fl-bkarta.c, .fl-bkarta.d { grid-column: 1; grid-row: auto; }
          /* na telefonu ilustracija teče POD besedilom (ne čez) — konec prekrivanja */
          .fl-bkarta.b .fl-bnodes { position: relative; right: auto; top: auto; bottom: auto; width: 100%; height: 8.5rem; margin-top: 1.1rem; }
        }
        @media (min-width: 621px) and (max-width: 900px) {
          /* Tablet/landscape: vrstice so fiksne 13rem in "Pošteno ceno" kartico odrežejo (globus-animacija
             skrita spodaj). Naj bo visoka čez 2 vrstici, da je animacija cela vidna. */
          .fl-bkarta.d { grid-row: 3 / span 2; }
        }

        /* Zakljucni CTA */
        .fl-konec { margin: 9.85rem 0 0; text-align: center; padding-top: 3.4rem; }
        .fl-konec h2 { font-family: var(--font-serif), serif; font-weight: 500; font-size: clamp(2rem, 6vw, 3.4rem); line-height: 1.02; margin: 0 auto 1.6rem; max-width: 18ch; }
        .fl-konec .cta-vrsta { justify-content: center; }
        .fl-konec .zakljucki { margin: 2rem 0 0; display: flex; flex-wrap: wrap; justify-content: center; gap: 1.6rem; font-size: 1.02rem; color: rgba(17,17,17,.72); }
        .fl-konec .zakljucki span { display: inline-flex; align-items: center; gap: .4rem; }
        .fl-konec .zakljucki svg { color: oklch(52% .13 155); }

        /* Temna "features" sekcija (Magnific slog) */
        .fl-funkcije { position: relative; overflow: hidden; margin: 3.8rem 0 0; border-radius: 26px; padding: clamp(2.4rem, 5vw, 3.8rem); background: oklch(21% .016 285); color: oklch(95% .01 285); }
        /* Prelivajoc gradient v krivulji ZA temno podlago (mehke, blur-ane barvne lise, ki pocasi lebdijo) */
        .fl-funkcije::before { content: ''; position: absolute; inset: -45% -20% -25% -20%; z-index: 0; pointer-events: none; filter: blur(55px); opacity: .9;
          background:
            radial-gradient(42% 52% at 20% 16%, oklch(58% .19 297 / .5), transparent 62%),
            radial-gradient(38% 48% at 84% 40%, oklch(66% .16 200 / .38), transparent 60%),
            radial-gradient(48% 58% at 60% 96%, oklch(70% .15 330 / .32), transparent 62%);
          animation: fnFlow 34s ease-in-out infinite; }
        @keyframes fnFlow { 0%, 100% { transform: translate(0, 0) scale(1); } 50% { transform: translate(2.5%, -2%) scale(1.09); } }
        @media (prefers-reduced-motion: reduce) { .fl-funkcije::before { animation: none; } }
        .fl-funkcije > * { position: relative; z-index: 1; }
        .fl-funkcije > .fl-aurora { position: absolute; inset: 0; z-index: 0; opacity: .5; pointer-events: none; }
        @media (prefers-reduced-motion: reduce) { .fl-funkcije > .fl-aurora { display: none; } }
        .fl-funkcije-glava { max-width: 46ch; }
        .fl-funkcije-glava h2 { font-family: var(--font-serif), serif; font-weight: 500; font-size: clamp(1.7rem, 4vw, 2.6rem); line-height: 1.08; margin: 0 0 .6rem; color: #fff; -webkit-text-stroke: 0; }
        .fl-funkcije-glava p { font-size: 1rem; line-height: 1.55; color: oklch(72% .02 285); margin: 0; }
        .fl-funkcije-mreza { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.8rem 2rem; margin-top: 2.8rem; }
        @media (max-width: 780px) { .fl-funkcije-mreza { grid-template-columns: 1fr; gap: 1.4rem; } }
        .fl-funkcija { display: flex; gap: .9rem; align-items: flex-start; }
        .fl-funkcija-ikona { display: grid; place-items: center; width: 2.2rem; height: 2.2rem; flex-shrink: 0; border-radius: 10px; background: oklch(29% .02 285); color: oklch(84% .11 297); }
        .fl-funkcija strong { display: block; font-size: 1rem; font-weight: 650; color: #fff; margin-bottom: .25rem; }
        .fl-funkcija p { font-size: .88rem; line-height: 1.5; color: oklch(70% .02 285); margin: 0; }
        /* Banner brezplacnega kalkulatorja — TEMEN, z animiranim gradientom + lebdecimi zarki.
           BREZ lastnega max-width/padding — poravna se s sekcijami znotraj .fl-oder (sicer "stopnicka"). */
        .fl-kalk-banner { margin: clamp(3rem, 7vw, 5.5rem) 0 0; }
        .fl-br-mob { display: none; }
        .fl-br-desk { display: inline; }
        .fl-kalk-banner-in { position: relative; overflow: hidden; display: flex; align-items: flex-end; gap: clamp(1rem, 2.6vw, 2.2rem); flex-wrap: wrap; padding: clamp(1.5rem, 3vw, 2.3rem) clamp(1.8rem, 4vw, 3.2rem) 0; min-height: 202px; border-radius: 24px; border: none; color: #fff; background: linear-gradient(120deg, #17102e 0%, #2a1657 26%, #3a1d78 50%, #221247 74%, #17102e 100%); background-size: 280% 280%; animation: flKalkGrad 16s ease-in-out infinite; box-shadow: 0 24px 60px oklch(30% .1 297 / .25); }
        .fl-kalk-banner-in::before { content: ""; position: absolute; inset: -40%; z-index: 0; pointer-events: none; background: radial-gradient(40% 55% at 30% 40%, oklch(70% .18 297 / .5), transparent 70%), radial-gradient(38% 50% at 78% 66%, oklch(74% .15 200 / .4), transparent 72%); animation: flKalkBlob 18s ease-in-out infinite alternate; }
        .fl-kalk-banner-in > * { position: relative; z-index: 1; }
        @keyframes flKalkGrad { 0%, 100% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } }
        @keyframes flKalkBlob { 0% { transform: translate3d(-6%, -4%, 0) scale(1); } 100% { transform: translate3d(6%, 5%, 0) scale(1.12); } }
        /* Žig "Brezplačno za vedno" — rubber-stamp, postrani, dvojni rob, rahel wobble. */
        .fl-kalk-zig { position: absolute; z-index: 4; top: -22px; right: -14px; display: inline-flex; flex-direction: column; align-items: center; gap: .12rem; padding: .58rem 1.15rem .5rem; border: 2.5px solid rgba(255,255,255,.62); border-radius: 13px; background: linear-gradient(135deg, oklch(44% .16 300), oklch(28% .12 292)); color: #fff; text-transform: uppercase; transform: rotate(-12deg); transform-origin: center; box-shadow: inset 0 0 0 2px rgba(255,255,255,.2), 0 12px 26px rgba(20,10,40,.45); animation: flZigWobble 5.5s ease-in-out infinite; }
        .fl-kalk-zig b { font-size: 1.3rem; font-weight: 800; letter-spacing: .04em; line-height: 1; }
        .fl-kalk-zig i { font-style: normal; font-size: .6rem; font-weight: 700; letter-spacing: .3em; opacity: .8; }
        @keyframes flZigWobble { 0%, 100% { transform: rotate(-12deg); } 50% { transform: rotate(-9.5deg) scale(1.025); } }
        @media (prefers-reduced-motion: reduce) { .fl-kalk-zig { animation: none; } }
        .fl-kalk-txt h2 { font-family: var(--font-serif), serif; font-weight: 500; font-size: clamp(1.7rem, 3.4vw, 2.5rem); line-height: 1.05; margin: 0 0 .5rem; color: #fff; }
        .fl-kalk-txt p { font-size: 1rem; line-height: 1.5; color: rgba(255,255,255,.78); margin: 0; max-width: 34rem; }
        .fl-kalk-cta { position: absolute; right: clamp(1.6rem, 4vw, 2.6rem); bottom: 20px; z-index: 5; white-space: nowrap; display: inline-flex; align-items: center; gap: .5rem; padding: .95rem 1.75rem; border-radius: 999px; background: #fff; color: #17102e; font-size: .95rem; font-weight: 700; text-decoration: none; transition: transform .16s ease, box-shadow .16s ease; box-shadow: 0 8px 24px oklch(20% .05 297 / .3); }
        .fl-kalk-cta:hover { transform: translateY(-2px); box-shadow: 0 12px 30px oklch(20% .08 297 / .42); }
        /* Ilustracija = web okno + zaključena zgodba: vprašalnik -> mehurčki cen -> znesek na oblikovanem listu (zanka 11s). */
        .fl-kalk-viz { position: relative; flex: none; width: 420px; max-width: 46vw; align-self: flex-end; margin-top: 1.6rem; margin-bottom: -3px; transform: translateX(0px); }
        /* Pupa lik: absoluten (ne veča višine), odrezan do pasu (overflow), dve sliki cross-fade. */
        .fl-kalk-lik { position: absolute; right: 0; top: 0; bottom: 0; width: clamp(16rem, 30vw, 26.6rem); z-index: 3; pointer-events: none; }
        .fl-kalk-lik-img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: contain; object-position: right bottom; opacity: 0; will-change: opacity; }
        .fl-kalk-lik-img.a { animation: flLikA 9s ease-in-out infinite; transform: translateX(-140px) scale(1.14); transform-origin: right bottom; }
        .fl-kalk-lik-img.b { animation: flLikB 9s ease-in-out infinite; transform: translateX(-200px); transform-origin: right bottom; }
        @keyframes flLikA { 0%, 42% { opacity: 1; } 50%, 92% { opacity: 0; } 100% { opacity: 1; } }
        @keyframes flLikB { 0%, 42% { opacity: 0; } 50%, 92% { opacity: 1; } 100% { opacity: 0; } }
        @media (prefers-reduced-motion: reduce) { .fl-kalk-lik-img.a { opacity: 1; animation: none; } .fl-kalk-lik-img.b { opacity: 0; animation: none; } }
        /* Srednji desktop (1101–1300): iPad mini/Air/11" LANDSCAPE — pupa flush DESNO da ne prekrije žiga (13"+ ostane ideal) */
        @media (min-width: 1101px) and (max-width: 1300px) {
          .fl-kalk-lik-img.a { transform: translateX(0px) scale(1.32) !important; transform-origin: right bottom; }
          .fl-kalk-lik-img.b { transform: translateX(-24px) scale(1.08) !important; transform-origin: right bottom; }
        }
        .fl-kalk-txt { align-self: flex-start; max-width: 30rem; padding-bottom: 1.5rem; }
        .fl-kvw { border-radius: 14px 14px 0 0; overflow: hidden; background: oklch(98% .01 297 / .92); backdrop-filter: blur(14px) saturate(1.2); -webkit-backdrop-filter: blur(14px) saturate(1.2); border: 1px solid rgba(255,255,255,.5); box-shadow: 0 22px 46px rgba(20,10,40,.42), inset 0 1px 0 rgba(255,255,255,.6); }
        .fl-kvw-bar { display: flex; align-items: center; gap: .34rem; padding: .42rem .62rem; background: oklch(96% .006 87 / .9); border-bottom: 1px solid rgba(17,17,17,.06); }
        .fl-kvw-bar i { width: 7px; height: 7px; border-radius: 50%; background: rgba(17,17,17,.16); }
        .fl-kvw-bar small { margin-left: .32rem; font-size: .6rem; font-weight: 600; color: rgba(17,17,17,.72); }
        .fl-kvw-body { position: relative; height: 172px; overflow: hidden; }
        /* shape transitions: mehka organska oblika, ki se stalno preoblikuje (ozadje zgodbe) */
        .fl-kvw-blob { position: absolute; top: 50%; left: 50%; width: 118px; height: 118px; margin: -59px 0 0 -59px; z-index: 0; background: radial-gradient(circle at 34% 30%, oklch(82% .12 320 / .5), oklch(72% .13 250 / .32)); filter: blur(5px); animation: flBlobMorph 9s ease-in-out infinite; }
        @keyframes flBlobMorph { 0%, 100% { border-radius: 42% 58% 55% 45% / 48% 42% 58% 52%; transform: rotate(0deg) scale(1); } 33% { border-radius: 62% 38% 42% 58% / 55% 62% 38% 45%; transform: rotate(120deg) scale(1.1); } 66% { border-radius: 45% 55% 62% 38% / 40% 52% 48% 60%; transform: rotate(240deg) scale(.95); } }
        .fl-kv-stage { position: absolute; inset: 0; padding: .7rem .8rem; opacity: 0; z-index: 1; }
        .fl-kv-s1 { display: grid; align-content: start; gap: .42rem; animation: flKvS1 11s ease-in-out infinite; }
        .fl-kv-s2 { animation: flKvS2 11s ease-in-out infinite; }
        .fl-kv-s3 { display: grid; place-content: center; animation: flKvS3 11s ease-in-out infinite; }
        @keyframes flKvS1 { 0% { opacity: 0; transform: translateY(8px); } 4% { opacity: 1; transform: none; } 27% { opacity: 1; transform: none; } 33% { opacity: 0; transform: translateY(-6px); } 100% { opacity: 0; } }
        @keyframes flKvS2 { 0%, 33% { opacity: 0; transform: translateY(8px); } 38% { opacity: 1; transform: none; } 60% { opacity: 1; transform: none; } 66% { opacity: 0; transform: translateY(-6px); } 100% { opacity: 0; } }
        @keyframes flKvS3 { 0%, 66% { opacity: 0; transform: translateY(8px); } 71% { opacity: 1; transform: none; } 95% { opacity: 1; transform: none; } 99% { opacity: 0; } 100% { opacity: 0; } }
        /* faza 1 — pravi chat mehurčki */
        .fl-kvw-msg { display: inline-flex; align-items: center; gap: .42rem; max-width: 88%; padding: .42rem .6rem; border-radius: 12px; font-size: .72rem; font-weight: 600; line-height: 1.25; }
        .fl-kvw-msg.bot { background: oklch(96% .012 297); color: #2a2035; border-top-left-radius: 4px; justify-self: start; }
        .fl-kvw-msg.me { background: oklch(90% .055 190); color: #223; border-top-right-radius: 4px; justify-self: end; }
        .fl-kvw-ava { width: 15px; height: 15px; border-radius: 50%; flex: none; background: conic-gradient(from 210deg, #7C3AED, #EC4899, #F59E0B, #38BDF8, #7C3AED); }
        /* faza 2 — orbi storitev: mehak radialni gradient z zabrisanim robom (kot pravi mehurčki), ikona + tesna labela */
        .fl-kv-orb { position: absolute; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; color: #fff; text-align: center; z-index: 1; animation: flKvFloat 5s ease-in-out infinite; }
        .fl-kv-orb::before { content: ""; position: absolute; inset: 0; border-radius: 50%; background: radial-gradient(circle at 46% 38%, var(--c1), var(--c2) 45%, transparent 72%); z-index: -1; }
        .fl-kv-orb svg { position: relative; opacity: .96; }
        .fl-kv-orb i { font-style: normal; font-size: .5rem; font-weight: 700; line-height: 1.05; }
        .fl-kv-orb.o1 { width: 84px; height: 84px; left: 16px; top: 8px; --c1: oklch(72% .16 300); --c2: oklch(55% .17 288); }
        .fl-kv-orb.o2 { width: 74px; height: 74px; left: 172px; top: 84px; --c1: oklch(80% .13 200); --c2: oklch(62% .15 220); animation-delay: -2s; }
        .fl-kv-orb.o3 { width: 80px; height: 80px; right: 24px; top: 18px; --c1: oklch(80% .13 60); --c2: oklch(66% .16 45); animation-delay: -3s; }
        /* faza 3 — znesek + oblikovan list */
        .fl-kv-doc { width: 158px; padding: .72rem .78rem .82rem; border-radius: 12px; background: #fff; box-shadow: 0 12px 26px rgba(20,10,40,.28); display: grid; gap: .42rem; }
        .fl-kv-doc-h { height: 12px; width: 60%; border-radius: 4px; background: linear-gradient(90deg, oklch(66% .2 297), oklch(70% .16 330)); }
        .fl-kv-doc-l { height: 6px; border-radius: 3px; background: oklch(90% .015 297); }
        .fl-kv-doc-l.s { width: 68%; }
        .fl-kv-doc-t { justify-self: end; margin-top: .18rem; font-family: var(--font-serif), serif; font-weight: 600; font-size: 1.2rem; color: #2a1657; animation: flKvPulse 2.4s ease-in-out infinite; }
        @keyframes flKvFloat { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
        @keyframes flKvGrad { 0%, 100% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } }
        @keyframes flKvPulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.06); } }
        @media (prefers-reduced-motion: reduce) { .fl-kv-stage { animation: none; opacity: 0; } .fl-kv-s3 { opacity: 1; } .fl-kv-orb, .fl-kvw-blob, .fl-kv-doc-t { animation: none; } }
        /* Tablet / ožji landscape (641–1100): pupa flush DESNO, okno LEVO, gumb spodaj-desno.
           Pokrije iPhone landscape + iPad portret (744–834) + iPad Pro portret (1024) + ožji landscape (1080).
           Desktop banner (translateX kompozicija) velja šele >1100, kjer je dovolj širine. */
        @media (min-width: 641px) and (max-width: 1100px) {
          .fl-kalk-txt { max-width: min(40%, 19rem); padding-bottom: 1rem; }
          .fl-kalk-viz { width: 300px; max-width: 37vw; }
          .fl-kalk-lik { width: clamp(10rem, 24vw, 15rem); }
          .fl-kalk-lik-img { transform: none !important; }
          .fl-kalk-lik-img.a { transform: translateX(2.4vw) scale(1.95) !important; transform-origin: right bottom; }
          .fl-kalk-lik-img.b { transform: scale(1.2) !important; transform-origin: right bottom; }
        }
        .fl-kalk-zig-mob { display: none; }
        /* Mobile (<=640): NOV layout po skici — žig zgoraj-desno ob naslovu; spodaj okno LEVO + Pupa DESNO; gumb ČEZ na sredini. */
        @media (max-width: 640px) {
          .fl-kalk-banner-in { display: grid; grid-template-columns: 1.4fr .75fr; grid-template-areas: "txt txt" "viz lik"; align-items: end; row-gap: .2rem; min-height: 0; padding: clamp(1.15rem, 4vw, 1.5rem) clamp(1.4rem, 5vw, 2rem) 0; }
          .fl-kalk-txt { grid-area: txt; max-width: 100%; padding: clamp(2.6rem, 11vw, 3.4rem) 0 0 0; }
          .fl-br-desk { display: none; }
          .fl-kalk-viz { grid-area: viz; display: block; width: calc(100% + clamp(1.4rem, 5vw, 2rem)); max-width: none; align-self: end; margin: 0 0 0 calc(-1 * clamp(1.4rem, 5vw, 2rem)); transform: none; }
          .fl-kalk-viz .fl-kalk-zig { display: none; }
          .fl-kalk-lik { grid-area: lik; position: relative; z-index: 2; right: auto; top: auto; bottom: auto; width: calc(100% + 13.25rem); height: auto; aspect-ratio: 1 / .8; align-self: end; margin: 0 -.6rem -3px -13.25rem; }
          .fl-kalk-lik-img.a { transform: translateX(20.4vw) scale(1.4) !important; transform-origin: right bottom; }
          .fl-kalk-lik-img.b { transform: translateX(11.7vw) scale(.98) !important; transform-origin: right bottom; }
          .fl-kalk-cta { position: absolute; left: 50%; right: auto; bottom: clamp(.9rem, 5vw, 1.8rem); transform: translateX(-50%); width: auto; margin: 0; z-index: 6; padding: 1rem 2.4rem; font-size: 1rem; white-space: nowrap; }
          .fl-kalk-cta svg { flex: none; }
          .fl-kalk-zig-mob { display: inline-flex; position: absolute; top: clamp(1rem, 5vw, 1.6rem); right: clamp(1rem, 5vw, 1.6rem); z-index: 6; flex-direction: column; align-items: center; gap: .1rem; padding: .42rem .85rem .36rem; border: 2px solid rgba(255,255,255,.6); border-radius: 11px; background: linear-gradient(135deg, oklch(44% .16 300), oklch(28% .12 292)); color: #fff; text-transform: uppercase; transform: rotate(-8deg); box-shadow: 0 8px 20px rgba(20,10,40,.4); }
          .fl-kalk-zig-mob b { font-size: 1rem; font-weight: 800; letter-spacing: .04em; line-height: 1; }
          .fl-kalk-zig-mob i { font-style: normal; font-size: .52rem; font-weight: 700; letter-spacing: .28em; opacity: .82; }
        }
        @media (prefers-reduced-motion: reduce) { .fl-kalk-banner-in, .fl-kalk-banner-in::before { animation: none; } }

        /* Cenik (price plans, Magnific slog) */
        .fl-cenik { margin: 10.05rem 0 0; padding-top: 2.6rem; text-align: center; }
        .fl-cenik > .k { font-size: .72rem; font-weight: 600; letter-spacing: .2em; text-transform: uppercase; color: rgba(17,17,17,.72); }
        .fl-cenik > h2 { font-family: var(--font-serif), serif; font-weight: 500; font-size: clamp(1.9rem, 5vw, 2.9rem); line-height: 1.05; margin: .55rem 0 .5rem; }
        .fl-cenik > .uvod { font-size: 1rem; line-height: 1.6; color: rgba(17,17,17,.76); max-width: 46ch; margin: 0 auto 2.8rem; }
        .fl-cenik-mreza { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.1rem; text-align: left; align-items: start; }
        @media (max-width: 860px) { .fl-cenik-mreza { grid-template-columns: 1fr; max-width: 30rem; margin: 0 auto; } }
        .fl-plan { position: relative; display: flex; flex-direction: column; padding: 1.7rem 1.5rem; border-radius: 20px; background: rgba(255,255,255,.92); border: 1px solid rgba(17,17,17,.1); box-shadow: 0 12px 32px rgba(40,25,60,.06); }
        .fl-plan.izpost { border: 1.5px solid var(--ink); box-shadow: 0 22px 50px rgba(40,25,60,.14); }
        .fl-plan-znacka { position: absolute; top: -.7rem; left: 1.5rem; font-size: .6rem; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: var(--paper); background: var(--ink); border-radius: 999px; padding: .28rem .7rem; }
        .fl-plan h3 { font-family: var(--font-serif), serif; font-weight: 500; font-size: 1.6rem; margin: .3rem 0 .2rem; }
        .fl-plan-za { font-size: .82rem; color: rgba(17,17,17,.72); margin: 0 0 1rem; min-height: 2.4em; }
        .fl-plan-cena { display: flex; align-items: baseline; gap: .35rem; margin-bottom: 1.2rem; }
        .fl-plan-cena strong { font-family: var(--font-serif), serif; font-weight: 500; font-size: 2.6rem; line-height: 1; }
        .fl-plan-cena span { font-size: .8rem; color: rgba(17,17,17,.72); }
        .fl-plan-redna { margin-left: .25rem; color: rgba(17,17,17,.62); font-size: .95rem; text-decoration-thickness: 1px; }
        .fl-plan-ustanovna { margin: -.9rem 0 1.2rem; font-size: .68rem; font-weight: 700; letter-spacing: .04em; color: oklch(48% .16 350); }
        .fl-plan-cta { position: relative; overflow: hidden; display: block; text-align: center; font-size: .82rem; font-weight: 700; letter-spacing: .04em; text-decoration: none; padding: .8rem 1rem; border-radius: 999px; border: 1px solid var(--ink); color: var(--ink); transition: background .16s, color .16s, transform .16s; }
        .fl-plan-cta:hover { transform: translateY(-1px); }
        .fl-plan-cta.polni { background: var(--ink); color: var(--paper); }
        .fl-plan-cta:not(.polni):hover { background: rgba(17,17,17,.04); }
        .fl-plan-cta::after { content: ''; position: absolute; top: 0; left: -160%; width: 90%; height: 100%; background: linear-gradient(120deg, transparent 0%, rgba(124,58,237,.28) 42%, rgba(56,189,248,.28) 58%, transparent 100%); transform: skewX(-18deg); transition: left .6s cubic-bezier(.19,1,.22,1); pointer-events: none; }
        .fl-plan-cta.polni::after { background: linear-gradient(120deg, transparent 0%, rgba(255,255,255,.9) 50%, transparent 100%); }
        .fl-plan-cta:hover::after { left: 170%; }
        .fl-plan.kmalu { opacity: .62; }
        .fl-plan.kmalu .fl-plan-znacka { background: rgba(17,17,17,.42); }
        .fl-plan-cta.cakalna { pointer-events: none; border-style: dashed; border-color: rgba(17,17,17,.72); color: rgba(17,17,17,.62); }
        .fl-plan-cta.cakalna::after { display: none; }
        .fl-plan-lista { list-style: none; margin: 1.4rem 0 0; padding: 1.3rem 0 0; border-top: 1px solid rgba(17,17,17,.1); display: grid; gap: .65rem; }
        .fl-plan-lista li { display: flex; align-items: flex-start; gap: .55rem; font-size: .86rem; line-height: 1.4; color: rgba(17,17,17,.82); }
        .fl-plan-lista li svg { flex-shrink: 0; margin-top: .06rem; }
        .fl-plan-lista li.da svg { color: oklch(55% .14 155); }
        .fl-plan-lista li.ne { color: rgba(17,17,17,.62); }
        .fl-plan-lista li.ne svg { color: rgba(17,17,17,.72); }
        .fl-cenik-opomba { font-size: .78rem; color: rgba(17,17,17,.62); margin: 1.9rem 0 0; }

        .fl-faq { margin: 10.05rem 0 0; padding-top: 3rem; display: flex; flex-wrap: wrap; gap: clamp(1.8rem, 4vw, 3.5rem); align-items: flex-start; }
        .fl-faq-glava { flex: 1 1 240px; min-width: 240px; }
        .fl-faq-glava .k { font-size: .72rem; font-weight: 600; letter-spacing: .2em; text-transform: uppercase; color: rgba(17,17,17,.72); }
        .fl-faq-glava h2 { font-family: var(--font-serif), serif; font-weight: 500; font-size: clamp(1.8rem, 4vw, 2.55rem); line-height: 1.07; margin: .55rem 0 1.4rem; }
        .fl-faq-podpora { display: inline-block; font-family: var(--font-sans), system-ui, sans-serif; font-size: .84rem; font-weight: 600; color: var(--ink); text-decoration: none; padding: .62rem 1.15rem; border-radius: 999px; border: 1px solid rgba(17,17,17,.24); transition: border-color .16s, background .16s; }
        .fl-faq-podpora:hover { border-color: var(--ink); background: rgba(17,17,17,.04); }
        .fl-faq-lista { flex: 2.3 1 380px; min-width: 300px; display: flex; flex-direction: column; }
        .fl-faq-item { border-top: 1px solid rgba(17,17,17,.12); }
        .fl-faq-item:last-child { border-bottom: 1px solid rgba(17,17,17,.12); }
        .fl-faq-item > button { width: 100%; display: flex; align-items: center; justify-content: space-between; gap: 1.4rem; padding: 1.25rem .2rem; background: none; border: 0; cursor: pointer; text-align: left; font-family: var(--font-sans), system-ui, sans-serif; font-size: 1rem; font-weight: 550; color: var(--ink); transition: color .15s; }
        .fl-faq-item > button:hover { color: var(--accent); }
        .fl-faq-item > button svg { flex: none; color: var(--accent); transition: transform .25s cubic-bezier(.16,1,.3,1); }
        .fl-faq-item.odprt > button svg { transform: rotate(45deg); }
        .fl-faq-odg { max-height: 0; overflow: hidden; transition: max-height .32s cubic-bezier(.16,1,.3,1); }
        .fl-faq-item.odprt .fl-faq-odg { max-height: 320px; }
        .fl-faq-odg p { margin: 0; padding: 0 3rem 1.35rem .2rem; font-size: .92rem; line-height: 1.65; color: rgba(17,17,17,.72); }

        /* Moja zgodba (O nas) — osebni manifesto, editorial */
        .fl-zgodba { position: relative; margin: 10.05rem 0 0; padding: 3rem 0 clamp(5rem, 12vw, 9rem); }
        .fl-zgodba-glava { max-width: 26ch; margin: 0 0 2.2rem; }
        .fl-zgodba-glava .k { font-size: .72rem; font-weight: 600; letter-spacing: .2em; text-transform: uppercase; color: rgba(17,17,17,.72); }
        .fl-zgodba-glava h2 { font-family: var(--font-serif), serif; font-weight: 500; font-size: clamp(1.9rem, 4.5vw, 2.7rem); line-height: 1.06; margin: .55rem 0 0; }
        .fl-zgodba-telo { display: grid; grid-template-columns: 21rem minmax(0, 1fr); gap: clamp(1.8rem, 4vw, 3.6rem); align-items: start; }
        @media (max-width: 760px) { .fl-zgodba-telo { grid-template-columns: 1fr; } .fl-zgodba-portret { max-width: 16rem; } }
        .fl-zgodba-portret { position: relative; display: grid; place-items: center; aspect-ratio: 1; }
        .fl-zgodba-foto { grid-area: 1 / 1; width: 80%; aspect-ratio: 1; border-radius: 50%; overflow: hidden; background: linear-gradient(150deg, oklch(90% .06 297), oklch(91% .05 330), oklch(90% .06 165)); box-shadow: 0 18px 44px rgba(40,25,60,.18); }
        /* Izrez kroga je izracunan na izvorno sliko (1470x1970): pokaze kvadrat x[233,1107] y[0,875],
           tj. glava+ramena centrirano — obraz (y~350) pade na 40% visine kroga, njena sredina (x~670) na 50% sirine.
           Vodoravni zamik dela transform-origin X (39%), ker pri object-fit:cover sirina tocno napolni krog
           in object-position X zato nima ucinka. */
        /* Krog ostane, slika pa je odmaknjena: scale 1.68 je bil prevelik priblizek
           in je odrezal ramena. 1.12 pokaze cel portret znotraj kroga. */
        .fl-zgodba-foto img { width: 100%; height: 100%; object-fit: cover; object-position: 50% 12%; transform: scale(1.12); transform-origin: 50% 10%; }
        .fl-zgodba-portret .circular-text { grid-area: 1 / 1; width: 100%; height: 100%; color: var(--ink); opacity: .82; }
        .fl-zgodba-tekst p { font-size: 1.02rem; line-height: 1.72; color: rgba(17,17,17,.82); margin: 0 0 1.1rem; max-width: 60ch; }
        .fl-zgodba-tekst p:first-child { font-size: 1.18rem; line-height: 1.6; color: var(--ink); }
        .fl-zgodba-tekst em { font-style: italic; }
        .fl-zgodba-podpis { font-family: var(--font-serif), serif; font-style: italic; font-size: 1.05rem !important; color: var(--ink) !important; margin-top: 1.4rem !important; }
        /* Pupa se sprehodi po spodnjem robu — pride z leve, gre cez ekran, izgine desno,
           in se cez ~pol minute spet sprehodi. Odlozi /public/flow/pupa-hoja.webm (ali .mp4). */
        .fl-pupa-pas { position: absolute; left: 50%; transform: translateX(-50%); bottom: -8.5rem; width: 100vw; height: clamp(26rem, 36vw, 36rem); overflow: hidden; pointer-events: none; }
        .fl-pupa { position: absolute; bottom: -6%; left: 0; height: 100%; width: auto; will-change: transform; }
        /* prehod = dolzina videa (14.25s), da se zanka/mezik zgodita, ko je pupa IZVEN zaslona -> ni vidnega skoka (in pocasneje) */
        .fl-pupa.hodi { animation: pupaHoja 14.25s linear infinite; }
        @keyframes pupaHoja { 0% { transform: translateX(-55vw); } 100% { transform: translateX(120vw); } }
        /* Mobilni korak: element je sirsi od zaslona, zato % ELEMENTA (figura vstopi z leve, gre cez, izstopi desno) */
        @keyframes pupaHojaM { 0% { transform: translateX(-65%); } 100% { transform: translateX(150%); } }
        @media (prefers-reduced-motion: reduce) { .fl-pupa { display: none; } }
        /* glinasta rekvizita scene (koš + rastlina) — stojita na tleh pasu, nezno dihata */
        .fl-footer { position: relative; }
        /* rekvizit zasidran na zgornji rob footerja (base sedi na temnem robu) */
        .fl-prop { position: absolute; bottom: calc(100% - 2.7rem + 10px); height: auto; z-index: 3; will-change: transform; filter: drop-shadow(0 18px 26px rgba(40,25,60,.16)); }
        .fl-prop-kos { right: calc(21% - 90px); bottom: calc(100% - 2.7rem + 54px); width: clamp(7rem, 11vw, 12rem); animation: flPropBob 6.5s ease-in-out infinite; }
        .fl-prop-plant { left: 21%; width: clamp(10rem, 16vw, 17rem); animation: flPropBob 7.5s ease-in-out infinite; animation-delay: -2.4s; }
        @keyframes flPropBob { 0%, 100% { transform: translateY(0) rotate(0deg); } 50% { transform: translateY(-7px) rotate(-1deg); } }
        /* Rastlina ima ~10,7 % prazne obrobe pod podstavkom, koš nič. Odmik +54/+10px je
           poravnan za DESKTOP velikost; na mobilu je rastlina manjša -> kompenzacija premajhna
           in kaktus pade nižje od koša. Zato mu tu dvignemo bazo (+32px), da stojita na isti črti. */
        @media (max-width: 720px) { .fl-prop-kos { right: 3%; width: 6rem; } .fl-prop-plant { left: 3%; width: 8.5rem; bottom: calc(100% - 2.7rem + 32px); } }
        /* Tablet/landscape (721–1000px): rastlina je clamp-ana na 10rem (koš na 7rem), zato desktop odmik
           spet ne poravna baz -> kaktus pade prenizko. Poravnamo bazo z bazo koša (+28px). */
        @media (min-width: 721px) and (max-width: 1000px) { .fl-prop-plant { bottom: calc(100% - 2.7rem + 28px); } }
        /* 1001–1700px: rastlina = 16vw (raste z zaslonom), zato prazna obroba (10,68 %) v px raste kot 2.56vw.
           Bazo poravnamo zvezno (pri 1700px pride nazaj na desktop +10px, pri 1000px na +28px). */
        @media (min-width: 1001px) and (max-width: 1700px) { .fl-prop-plant { bottom: calc(100% - 2.7rem + 54px - 2.56vw); } }
        @media (prefers-reduced-motion: reduce) { .fl-prop { animation: none; } }
        /* leteci papirnati objekt — potuje po strani, se preliva, pade v kos (pozicija/prelivanje iz JS) */
        .fl-fly { position: fixed; left: 0; top: 0; width: clamp(8rem, 11vw, 13rem); aspect-ratio: 1; z-index: 20; pointer-events: none; opacity: 0; will-change: transform, opacity; }
        .fl-fly img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: contain; opacity: 0; filter: drop-shadow(0 14px 22px rgba(40,25,60,.22)); }
        /* leteči papir je zdaj viden tudi na mobilnem/pokončno — vezan na mobilno pupo (krmili JS) */
        /* mehki reveal sekcij ob drsanju (razred doda JS; reduce-motion = brez) */
        .fl-reveal { opacity: 0; transform: translateY(30px); transition: opacity .7s ease, transform .85s cubic-bezier(.22,1,.36,1); }
        .fl-reveal.fl-in { opacity: 1; transform: none; }
        /* hero naslov — besede se ob nalaganju nezno dvignejo (brez clipa, da ne obreze serifa) */
        /* rezervirana višina naslova (≈3 vrstice) — daljši/krajši naslov NE premika
           podnaslova in gumbov (Tina: besedilo se lahko premika, gumbi ostanejo). */
        .fl-hero-title { min-height: 3em; }
        /* presledek med besedami: {' '} je znotraj inline-block spana in ga rob poje,
           zato razmik naredimo z margin-right (drugače so besede zlepljene). */
        .fl-hero-title .w { display: inline-block; margin-right: .27em; opacity: 0; transform: translateY(.42em); animation: flWordUp .9s cubic-bezier(.22,1,.36,1) both; }
        @keyframes flWordUp { to { opacity: 1; transform: none; } }
        @media (prefers-reduced-motion: reduce) { .fl-hero-title .w { opacity: 1; transform: none; animation: none; } }
        .fl-koraki > .fl-reveal:nth-child(2) { transition-delay: .08s; }
        .fl-koraki > .fl-reveal:nth-child(3) { transition-delay: .16s; }
        .fl-koraki > .fl-reveal:nth-child(4) { transition-delay: .24s; }
        .fl-bento-mreza > .fl-reveal:nth-child(2), .fl-funkcije-mreza > .fl-reveal:nth-child(2), .fl-cenik-mreza > .fl-reveal:nth-child(2) { transition-delay: .08s; }
        .fl-bento-mreza > .fl-reveal:nth-child(3), .fl-funkcije-mreza > .fl-reveal:nth-child(3), .fl-cenik-mreza > .fl-reveal:nth-child(3) { transition-delay: .16s; }
        .fl-bento-mreza > .fl-reveal:nth-child(4), .fl-funkcije-mreza > .fl-reveal:nth-child(4) { transition-delay: .24s; }

        .fl-footer { margin: 10.05rem calc(50% - 50vw) calc(-1 * clamp(5rem, 8vw, 8rem)); background: oklch(20% .016 285); color: oklch(93% .01 285); border-radius: 0; padding: clamp(2.8rem, 5vw, 4rem) calc(max(0px, (100vw - 1480px) / 2) + clamp(1.5rem, 5vw, 5.5rem)) clamp(2rem, 4vw, 2.6rem); }
        .fl-footer-top { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 2fr); gap: clamp(2rem, 5vw, 4rem); }
        @media (max-width: 720px) { .fl-footer-top { grid-template-columns: 1fr; gap: 2rem; } }
        .fl-footer-talk { display: inline-block; margin-top: 1.1rem; font-size: .82rem; font-weight: 700; color: var(--ink); text-decoration: none; border-bottom: 1px solid var(--accent); padding-bottom: .15rem; }
        .fl-footer-legal { display: flex; flex-wrap: wrap; gap: 1.1rem; }
        .fl-footer-logo { display: inline-flex; align-items: center; gap: .5rem; }
        .fl-footer-logo i { width: 1.2rem; height: 1.2rem; border-radius: 50%; flex: none; background: radial-gradient(58% 48% at 30% 24%, rgba(255,255,255,.92), rgba(255,255,255,0) 62%), conic-gradient(from 210deg, #7C3AED, #EC4899, #F59E0B, #38BDF8, #7C3AED); box-shadow: 0 3px 10px rgba(124,58,237,.28); }
        .fl-footer-logo strong { font-family: var(--font-sans), system-ui, sans-serif; font-weight: 800; font-size: 1.12rem; letter-spacing: -.01em; color: #fff; }
        .fl-footer-logo span { font-size: .7rem; font-weight: 700; letter-spacing: .2em; color: rgba(255,255,255,.6); }
        .fl-footer-brand p { margin: .9rem 0 0; font-size: .9rem; line-height: 1.6; color: rgba(255,255,255,.64); max-width: 36ch; }
        .fl-footer-brand a { color: #fff; text-decoration: none; border-bottom: 1px solid var(--accent); }
        .fl-footer-cols { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1.5rem; }
        @media (max-width: 620px) { .fl-footer-cols { grid-template-columns: 1fr 1fr; gap: 1.6rem; } }
        .fl-footer-cols > div { display: grid; gap: .55rem; align-content: start; }
        .fl-footer-cols strong { font-size: .72rem; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; color: rgba(255,255,255,.62); margin-bottom: .2rem; }
        .fl-footer-cols a { font-size: .9rem; color: rgba(255,255,255,.74); text-decoration: none; transition: color .15s; }
        .fl-footer-cols a:hover { color: #fff; }
        .fl-footer-bottom { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 1rem; margin-top: 2.6rem; padding: 1.4rem 0 0; border-top: 1px solid rgba(255,255,255,.12); font-size: .8rem; color: rgba(255,255,255,.5); }
        .fl-footer-bottom a { color: rgba(255,255,255,.68); text-decoration: none; }
      `}} />

      <div className="fl-ozadje" aria-hidden>
        <span className="fl-blob v" />
        <span className="fl-blob g" />
        <span className="fl-blob v2" />
      </div>
      <AmbientBubbles />

      <FlowHeroBg />
      {flyMounted && createPortal(
        <div className="fl-fly" ref={flyRef} aria-hidden>
          <img src="/flow/paper-ball.png" alt="" />
          <img src="/flow/paper-bird.png" alt="" />
          <img src="/flow/paper-boat.png" alt="" />
        </div>,
        document.body
      )}

      <div className="fl-oder">
        <section className="fl-hero">
          <p className="kicker"><b>Pinart Flow</b> · beta · {t('za samostojne kreativce in male studie', 'for independent creatives and small studios')}</p>
          <h1 className="fl-hero-title" key={heroIdx}>
            {heroTitles[heroIdx].pre.map((w, i) => w === '\n' ? <br key={i} /> : <span key={i} className="w" style={{ animationDelay: `${i * 0.07}s` }}>{w}{' '}</span>)}
            <em>{heroTitles[heroIdx].em.map((w, i) => w === '\n' ? <br key={i} /> : <span key={i} className="w" style={{ animationDelay: `${(heroTitles[heroIdx].pre.length + i) * 0.07}s` }}>{w}{' '}</span>)}</em>
          </h1>
          <p className="lead">
            {isEn ? <><b>One workspace instead of four:</b> proposals, contracts, invoices, projects, tasks and communication in one clear flow. <b>Pupa, your AI assistant,</b> understands the creative market and helps you value your work.</> : <><b>En program namesto štirih:</b> ponudbe, pogodbe, računi, projekti in naloge — z vso komunikacijo pregledno na enem mestu. Ob strani ti stoji <b>AI asistentka Pupa</b>, ki pozna trg in ti pove, koliko je vredno tvoje delo.</>}
          </p>
          <div className="cta-vrsta">
            <a className="cta" href={prijava}>{t('Vstopi v Flow', 'Enter Flow')} <ArrowRight size={17} weight="bold" /></a>
            <a className="cta duh" href={kalkulator}>{t('Preizkusi kalkulator', 'Try the calculator')}</a>
            <span className="cta-note">{t('Kalkulator je brezplačen, brez prijave.', 'The calculator is free. No account required.')}</span>
          </div>
          {/* Mobile: hero video kot cist blok POD gumbi (na desktopu skrit — tam je bg) */}
          <div className="fl-hero-vid-mob" aria-hidden>
            {/* ISTA scena kot desktop (slika + odsev + teg-i) v enem divu; skalira se KOT CELOTA
               (transform: scale prek cqw), zato se razmiki/pozicije/velikosti NE podrejo. */}
            <div className="fl-pupa-scene" ref={pupaSceneRef}>
              <img src="/flow/pupa3d.png" alt="" />
              <div className="fl-ocala" aria-hidden>
                <span className="fl-leca fl-leca-l"><i /></span>
                <span className="fl-leca fl-leca-r"><i /></span>
              </div>
              <div className="fl-notif" aria-hidden>
                <span className="fl-chip fl-chip-1"><b className="ok"><svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7" /></svg></b>{t('Ponudba sprejeta', 'Offer accepted')}</span>
                <span className="fl-chip fl-chip-2"><b className="msg"><svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a8 8 0 0 1-11.5 7.2L4 20l1-4.5A8 8 0 1 1 21 12z" /></svg></b>{t('Nova stranka', 'New client')}</span>
                <span className="fl-chip fl-chip-3"><b className="pay">€</b>{t('Plačano · 1.200 €', 'Paid · €1,200')}</span>
                <span className="fl-chip fl-chip-4"><b className="ok"><svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7" /></svg></b>{t('Račun poslan', 'Invoice sent')}</span>
                <span className="fl-chip fl-chip-5"><b className="star"><svg viewBox="0 0 24 24" width="11" height="11" fill="currentColor"><path d="M12 2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.8 5.9 21.4l1.4-6.8L2.2 9.9l6.9-.8z" /></svg></b>{t('Nova ocena · 5,0', 'New review · 5.0')}</span>
                <span className="fl-chip fl-chip-6"><b className="ok"><svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7" /></svg></b>{t('Pogodba podpisana', 'Contract signed')}</span>
              </div>
            </div>
          </div>
        </section>

        <section className="fl-potek">
          <div className="fl-koraki">
            {KORAKI.map(k => (
              <div className="fl-korak" key={k.n}>
                <div className="n">{k.n}</div>
                <h3>{k.naslov}</h3>
                <p>{k.opis}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="fl-laptop">
          <div className="fl-laptop-txt">
            <div className="k">Novost</div>
            <h2>Edino orodje, ki ti pove, <em>koliko je vredno tvoje delo.</em></h2>
            <p>
              ChatGPT ugiba, Excel samo shranjuje. Flow razbije ceno na izvedbo, avtorske pravice
              in licenco ter jo primerja z <b>anonimnim tržnim pregledom</b> — takoj vidiš, ali se
              podcenjuješ. Cena tako ni več ugibanje, ampak utemeljena številka.
            </p>
          </div>
          <div className="fl-laptop-vizual" aria-hidden>
            <div className="fl-lap">
              <img className="fl-lap-img" src="/flow/laptop-a.png?v=2" alt="" />
              <div className="fl-lap-screen">
                <div className="fl-lap-ui lu1">
                  <div className="fl-lap-doc2">
                    <div className="fl-lap-doc2-top"><b /><span className="fl-lap-ai">{isEn ? 'AI · fair price' : 'AI · poštena cena'}</span></div>
                    <div className="fl-lap-row"><i /><em>650 €</em></div>
                    <div className="fl-lap-row"><i className="w2" /><em>1.200 €</em></div>
                    <div className="fl-lap-sum"><b /><strong>1.850 €</strong></div>
                  </div>
                </div>
                <div className="fl-lap-ui lu2">
                  <div className="fl-lap-list">
                    <span className="fl-lap-tag t-proj">{isEn ? 'Projects · statuses' : 'Projekti · statusi'}</span>
                    <div className="fl-lap-lrow"><i className="fl-dot g" /><b /><em className="ok">{isEn ? 'Accepted' : 'Sprejeta'}</em></div>
                    <div className="fl-lap-lrow"><i className="fl-dot o" /><b className="w2" /><em className="wa">{isEn ? 'Pending' : 'Čaka'}</em></div>
                    <div className="fl-lap-lrow"><i className="fl-dot g" /><b className="w3" /><em className="ok">{isEn ? 'Accepted' : 'Sprejeta'}</em></div>
                  </div>
                </div>
                <div className="fl-lap-ui lu3">
                  <div className="fl-lap-cal2">
                    <span className="fl-lap-tag t-cal">{isEn ? 'Deadlines · calendar' : 'Roki · koledar'}</span>
                    <div className="fl-lap-week"><i /><i /><i className="on" /><i /><i /><i /><i /></div>
                    <div className="fl-lap-ev"><span className="e1" /><span className="e2" /></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="fl-kalk-banner">
          <div className="fl-kalk-banner-in">
            <span className="fl-kalk-zig-mob" aria-hidden><b>{t('Brezplačno', 'Free')}</b><i>{t('za vedno', 'forever')}</i></span>
            <div className="fl-kalk-txt">
              <h2>{t('Kalkulator', 'The fair-price')}<br />{t('poštenih cen', 'calculator')}</h2>
              <p>{t('Izračunaj pošteno ceno', 'Work out a fair price')}<br className="fl-br-desk" /> {t('in sestavi ponudbo,', 'and build a proposal,')}<br className="fl-br-desk" /> {t('brez prijave in brez plačila.', 'no sign-up, no payment.')}</p>
            </div>
            <div className="fl-kalk-viz" aria-hidden>
              <span className="fl-kalk-zig" aria-label={t('Brezplačno za vedno', 'Free forever')}>
                <b>{t('Brezplačno', 'Free')}</b>
                <i>{t('za vedno', 'forever')}</i>
              </span>
              {/* Web okno + zaključena zgodba: vprašalnik (pravi mehurčki) -> cene -> znesek na oblikovanem listu (zanka) */}
              <div className="fl-kvw">
                <div className="fl-kvw-bar"><i /><i /><i /><small>{t('pinart kalkulator', 'pinart calculator')}</small></div>
                <div className="fl-kvw-body">
                  <div className="fl-kvw-blob" />
                  <div className="fl-kv-stage fl-kv-s1">
                    <span className="fl-kvw-msg bot"><span className="fl-kvw-ava" />{t('Kakšen projekt?', 'What kind of project?')}</span>
                    <span className="fl-kvw-msg me">{t('Logotip', 'Logo')}</span>
                    <span className="fl-kvw-msg bot"><span className="fl-kvw-ava" />{t('Kakšne izkušnje?', 'Experience level?')}</span>
                  </div>
                  <div className="fl-kv-stage fl-kv-s2">
                    <span className="fl-kv-orb o1"><PenNib size={16} weight="regular" /><i>{t('Logotip', 'Logo')}</i></span>
                    <span className="fl-kv-orb o2"><SquaresFour size={16} weight="regular" /><i>{t('Spletna', 'Website')}</i></span>
                    <span className="fl-kv-orb o3"><FileText size={14} weight="regular" /><i>{t('Copy', 'Copy')}</i></span>
                  </div>
                  <div className="fl-kv-stage fl-kv-s3">
                    <div className="fl-kv-doc">
                      <span className="fl-kv-doc-h" />
                      <span className="fl-kv-doc-l" />
                      <span className="fl-kv-doc-l s" />
                      <span className="fl-kv-doc-t">2.330 €</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="fl-kalk-lik" aria-hidden>
              <img src="/flow/pupa_sedi.png?v=5" alt="" className="fl-kalk-lik-img a" />
              <img src="/flow/pupa_zamisljena.png?v=5" alt="" className="fl-kalk-lik-img b" />
            </div>
            <a className="fl-kalk-cta" href={kalkulator}>{t('Odpri kalkulator', 'Open calculator')} <ArrowRight size={17} weight="bold" /></a>
          </div>
        </section>

        <section className="fl-orodja" id="orodja">
          <div className="k">{t('Naša orodja', 'Our tools')}</div>
          <h2>{t('Izbrana orodja za lažje kreativne začetke.', 'Everything you need to run a creative business.')}</h2>
          <p className="uvod">{t('Tudi ti raje oblikuješ, kot pripravljaš ponudbe, pogodbe in račune? Naša izbrana zbirka orodij prevzame administracijo, da se lahko posvetiš ustvarjanju. Poglej, kaj te čaka.', 'Would you rather create than prepare proposals, contracts and invoices? Flow handles the admin so you can focus on the work you love.')}</p>
          <div className="fl-orodja-nadzor">
            <div className="fl-rubrike">
              {RUBRIKE.map(r => (
                <button key={r.id} type="button" className={taRubrika === r.id ? 'on' : ''} onClick={() => setTaRubrika(r.id)}>{r.label}</button>
              ))}
            </div>
            <div className="fl-puscice">
              <button type="button" onClick={() => drsni(-1)} aria-label={t('Nazaj', 'Previous')}><CaretLeft size={18} weight="bold" /></button>
              <button type="button" onClick={() => drsni(1)} aria-label={t('Naprej', 'Next')}><CaretRight size={18} weight="bold" /></button>
            </div>
          </div>
          <div className="fl-orodja-bleed">
          <div className="fl-orodja-vrsta" ref={vrstaRef}>
            {vidnaOrodja.map(o => {
              const Ikona = o.Ikona;
              return (
                <a className="fl-tkarta" href={o.href} key={o.ime}>
                  <span className="fl-tkarta-ikona" style={{ ['--h' as string]: o.h } as React.CSSProperties}><Ikona size={22} weight="regular" /></span>
                  <h3>{o.ime} {o.brezplacno && <span className="fl-znacka">{t('Brezplačno', 'Free')}</span>}</h3>
                  <p>{o.opis}</p>
                </a>
              );
            })}
          </div>
          </div>
        </section>

        <section className="fl-showcase" id="showcase">
          <div className="fl-showcase-glava">
            <div className="k">{t('Eno mesto', 'One place')}</div>
            <h2>{t('Vse tvoje poslovanje na enem mestu', 'Your whole creative business in one place')}</h2>
            <p>{t('Izberi, kje začneš. Vsako orodje teče iz istih podatkov — od poštene cene do računa.', 'Start anywhere. Every tool works from the same data, from a fair price to the final invoice.')}</p>
          </div>
          <div className="fl-sc-pills" ref={scPillsRef} role="tablist" aria-label={t('Orodja Pinart Flow', 'Pinart Flow tools')}>
            {ZAVIHKI.map(z => {
              const Ik = z.Ikona;
              return (
                <button
                  key={z.id}
                  type="button"
                  role="tab"
                  aria-selected={taZavihek === z.id}
                  className={`fl-sc-pill${taZavihek === z.id ? ' on' : ''}`}
                  onClick={() => izberiZavihek(z.id)}
                >
                  <Ik size={17} weight="regular" />
                  {z.label}
                  {z.znacka && <span className={`fl-sc-badge ${z.zvrst}`}>{z.znacka}</span>}
                </button>
              );
            })}
          </div>
          {/* Desktop: viden le aktiven panel (.on). Mobilno: track je vodoravni scroll-carousel,
              vsi paneli side-by-side, naslednji se malce vidi (peek). */}
          <div className="fl-sc-track" ref={scTrackRef}>
            {ZAVIHKI.map(z => (
              <div className={`fl-sc-panel${taZavihek === z.id ? ' on' : ''}`} data-sc={z.id} key={z.id} role="tabpanel">
                <div className="fl-sc-info">
                  <h3>{z.h}</h3>
                  <p>{z.p}</p>
                  <ul className="fl-sc-tocke">
                    {z.tocke.map(tk => <li key={tk}><CheckCircle size={18} weight="fill" />{tk}</li>)}
                  </ul>
                  <a className={`cta${z.zvrst === 'soon' || z.zvrst === 'beta' ? ' duh' : ''}`} href={z.href}>
                    {z.cta} <ArrowRight size={16} weight="bold" />
                  </a>
                </div>
                <div className="fl-sc-vizual" aria-hidden>
                  {predoglediMock(z.id)}
                  {/* Video predstavitev produkta (kot Magnific). Ce datoteke se ni, onError skrije
                      video in ostane ilustracija spodaj. Odlozi v /public/flow/showcase/<id>.mp4 */}
                  <video className="fl-sc-video" src={`/flow/showcase/${z.id}.mp4`} muted loop playsInline preload="none"
                    onCanPlay={e => { (e.currentTarget as HTMLVideoElement).style.opacity = '1'; }}
                    onError={e => { (e.currentTarget as HTMLVideoElement).style.opacity = '0'; }} />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="fl-bento" id="zgodba">
          <div className="fl-bento-glava">
            <div>
              <h2>{t('Kaj dela Flow drugače?', 'What makes Flow different?')}</h2>
              <p>{t('Ne le še eno orodje — in ne prazen AI-workspace, ki ga sestaviš sam. Flow že pozna vrednost kreativnega dela in poveže ves projekt. Tega ChatGPT, Excel ali generično orodje ne zmorejo.', 'Not just another tool — and not an empty AI workspace you assemble yourself. Flow already understands the value of creative work and connects the whole project. ChatGPT, spreadsheets and generic tools can\'t.')}</p>
            </div>
            <a className="cta" href={kalkulator}>{t('Začni brezplačno', 'Start for free')} <ArrowRight size={16} weight="bold" /></a>
          </div>
          <div className="fl-bento-mreza">
            <div className="fl-bkarta a">
              <h3>{t('En program namesto štirih', 'One workspace instead of four')}</h3>
              <p>{t('Ponudbe, pogodbe, računi, stroški, ceniki in naloge. Vse na enem mestu, nič več skakanja med Excelom, Canvo in Gmailom.', 'Proposals, contracts, invoices, expenses, price lists and tasks in one place — no more jumping between spreadsheets, design tools and email.')}</p>
              <div className="fl-bhub" aria-hidden>
                <svg className="fl-bhub-bg" viewBox="0 0 220 220">
                  <defs>
                    <linearGradient id="flHubLine" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#a78bfa" /><stop offset="1" stopColor="#7be0a0" /></linearGradient>
                    <filter id="flHubGlow" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="3" /></filter>
                  </defs>
                  <circle cx="110" cy="110" r="94" fill="none" stroke="url(#flHubLine)" strokeWidth="9" opacity=".28" filter="url(#flHubGlow)" />
                  <circle cx="110" cy="110" r="94" fill="none" stroke="url(#flHubLine)" strokeWidth="4" opacity=".85" />
                </svg>
                <span className="fl-bhub-core">
                  <svg viewBox="0 0 40 40" width="84" height="84" style={{ position: 'absolute', inset: 0 }}>
                    <path d="M9.8 18.2q3.2-4.6 6.4 0" stroke="#2A2035" strokeWidth="2.1" fill="none" strokeLinecap="round" />
                    <path d="M23.8 18.2q3.2-4.6 6.4 0" stroke="#2A2035" strokeWidth="2.1" fill="none" strokeLinecap="round" />
                    <path d="M14.5 23.5q5.5 4.6 11 0" stroke="#2A2035" strokeWidth="2.1" fill="none" strokeLinecap="round" />
                    <circle cx="11.5" cy="21.5" r="1.9" fill="rgba(255,120,170,.55)" />
                    <circle cx="28.5" cy="21.5" r="1.9" fill="rgba(255,120,170,.55)" />
                  </svg>
                </span>
                <div className="fl-bhub-ring">
                  {[
                    { Ic: PenNib, a: 0 }, { Ic: FileText, a: 60 }, { Ic: Scroll, a: 120 },
                    { Ic: Receipt, a: 180 }, { Ic: Users, a: 240 }, { Ic: ListChecks, a: 300 },
                  ].map(({ Ic, a }) => (
                    <span key={a} className="fl-bhub-ic" style={{ '--a': `${a}deg`, '--r': '94px' } as React.CSSProperties}><i><Ic size={20} weight="regular" /></i></span>
                  ))}
                </div>
              </div>
            </div>
            <div className="fl-bkarta b">
              <h3>{t('Vse teče iz istih podatkov', 'The same data flows through every step')}</h3>
              <p>{t('Ponudba postane pogodba postane račun, brez prepisovanja. Chatbot to vsakič pozabi, Flow si zapomni.', 'A proposal becomes a contract and then an invoice without retyping. Flow keeps the context for you.')}</p>
              <div className="fl-bnodes" aria-hidden>
                <svg viewBox="0 0 300 200" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="flNodeLine" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#63c7e8" /><stop offset="1" stopColor="#a78bfa" /></linearGradient>
                    <filter id="flNodeGlow" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="3.4" /></filter>
                  </defs>
                  <g fill="none" stroke="url(#flNodeLine)" strokeLinecap="round">
                    <path d="M44 80 C 112 80 96 150 176 150" strokeWidth="9" opacity=".4" filter="url(#flNodeGlow)" pathLength={1} />
                    <path d="M44 80 C 112 80 96 150 176 150" strokeWidth="5" pathLength={1} />
                    <path d="M150 58 C 214 58 214 96 268 96" strokeWidth="9" opacity=".4" filter="url(#flNodeGlow)" pathLength={1} />
                    <path d="M150 58 C 214 58 214 96 268 96" strokeWidth="5" pathLength={1} />
                  </g>
                </svg>
                <div className="fl-fold" style={{ left: '44%', top: '37%', width: '33%', height: '42%', background: '#e9e08d' }} />
                <div className="fl-fold" style={{ left: '85%', top: '85%', width: '42%', height: '42%', background: '#e6c8f6' }} />
                <div className="fl-fold" style={{ left: '19%', top: '93%', width: '34%', height: '36%', background: '#cfe7f4' }} />
                <div className="fl-badge" style={{ left: '15%', top: '40%' }}><ChatCircle size={18} weight="fill" /></div>
                <div className="fl-badge" style={{ left: '59%', top: '75%' }}><PenNib size={18} weight="fill" /></div>
                <div className="fl-npill" style={{ left: '13%', top: '66%', background: '#8b7be8' }}>{t('Ponudba', 'Proposal')}</div>
                <div className="fl-npill" style={{ left: '89%', top: '45%', background: '#d5776f' }}>{t('Račun', 'Invoice')}</div>
              </div>
            </div>
            <div className="fl-bkarta c">
              <h3>{t('Vsaka stranka na enem mestu', 'Every client in one place')}</h3>
              <p>{t('Projekti, dokumenti in vsa komunikacija, povezani s stranko. Nič več razmetano po Gmailu.', 'Keep projects, documents and communication connected to the client instead of scattered across your inbox.')}</p>
              <div className="fl-bavatars" aria-hidden><span>MA</span><span>RK</span><span>LJ</span><span>+</span></div>
              <div className="fl-clist" aria-hidden>
                <div className="r"><span /><i /></div>
                <div className="r"><span /><i /></div>
                <div className="r"><span /><i /></div>
                <div className="r"><span /><i /></div>
              </div>
            </div>
            <div className="fl-bkarta d">
              <h3>{t('Pošteno ceno, ki je drugi nimajo', 'A fair-price benchmark others do not have')}</h3>
              <p>{t('Anonimni tržni pregled ti pokaže, kje si in raste z vsakim kreativcem. Tvoj pošteni benchmark.', 'An anonymous market view shows where your price sits and improves as the creative community grows.')}</p>
              <div className="fl-bglobe" aria-hidden>
                <span className="fl-bglobe-ai"><Sparkle size={12} weight="fill" /> AI</span>
                <div className="fl-btag" style={{ left: '17%', top: '8%', animationDelay: '0s' }}><small>{t('Logotip', 'Logo')}</small><b style={{ background: '#d5776f' }}>650 €</b></div>
                <div className="fl-btag" style={{ left: '66%', top: '8%', animationDelay: '1.3s' }}><small>{t('Ilustracija', 'Illustration')}</small><b style={{ background: '#c9926b' }}>480 €</b></div>
                <div className="fl-btag" style={{ left: '10%', top: '32%', animationDelay: '2.6s' }}><small>{t('CGP', 'Branding')}</small><b style={{ background: '#8b7be8' }}>1.350 €</b></div>
                <div className="fl-btag" style={{ right: '9%', top: '32%', animationDelay: '3.9s' }}><small>{t('Splet', 'Website')}</small><b style={{ background: '#5bb89a' }}>1.400 €</b></div>
                <svg viewBox="0 0 200 120">
                  <g stroke="rgba(255,255,255,.32)" fill="none" strokeWidth="1">
                    <circle cx="100" cy="60" r="44" />
                    <ellipse cx="100" cy="60" rx="18" ry="44" />
                    <ellipse cx="100" cy="60" rx="44" ry="16" />
                    <line x1="56" y1="60" x2="144" y2="60" />
                  </g>
                  <g stroke="rgba(255,255,255,.5)" strokeWidth="1" fill="none" strokeDasharray="2 3">
                    <path d="M72 42 L100 60" /><path d="M128 50 L100 60" /><path d="M88 80 L100 60" /><path d="M118 82 L100 60" /><path d="M100 32 L100 60" />
                  </g>
                  <g fill="#fff">
                    <circle className="dot" cx="72" cy="42" r="2.6" style={{ animationDelay: '0s' }} />
                    <circle className="dot" cx="128" cy="50" r="2.6" style={{ animationDelay: '.5s' }} />
                    <circle className="dot" cx="88" cy="80" r="2.6" style={{ animationDelay: '1s' }} />
                    <circle className="dot" cx="118" cy="82" r="2.6" style={{ animationDelay: '1.5s' }} />
                    <circle className="dot" cx="100" cy="32" r="2.6" style={{ animationDelay: '2s' }} />
                  </g>
                  <circle cx="100" cy="60" r="4.5" fill="#ffd54a" />
                </svg>
              </div>
            </div>
          </div>
        </section>

        <section className="fl-konec">
          <h2>{t('Pripravljena na bolj mirno poslovanje?', 'Ready for a calmer way to run your business?')}</h2>
          <div className="cta-vrsta">
            <a className="cta" href={prijava}>{t('Vstopi v Flow', 'Enter Flow')} <ArrowRight size={17} weight="bold" /></a>
          </div>
          <div className="zakljucki">
            <span><CheckCircle size={20} weight="fill" /> {t('Brez kartice za začetek', 'No card required to start')}</span>
            <span><CheckCircle size={20} weight="fill" /> {t('Kalkulator ostane brezplačen', 'The calculator stays free')}</span>
            <span><CheckCircle size={20} weight="fill" /> {t('Podatki so tvoji', 'Your data stays yours')}</span>
          </div>
        </section>

        <section className="fl-funkcije">
          <div className="fl-aurora" aria-hidden>
            <Aurora colorStops={["#7C3AED", "#38BDF8", "#A78BFA"]} amplitude={1.15} blend={0.55} speed={1.4} />
          </div>
          <div className="fl-funkcije-glava">
            <h2>{t('Zgrajeno za mirno poslovanje samostojnega kreativca.', 'Built for a calmer independent creative business.')}</h2>
            <p>{t('Poštene cene, vračunane avtorske pravice in tvoji podatki — brez skritih pasti.', 'Fair prices, usage rights included and full ownership of your data — with no hidden catches.')}</p>
          </div>
          <div className="fl-funkcije-mreza">
            {FUNKCIJE.map(f => {
              const Ikona = f.Ikona;
              return (
                <div className="fl-funkcija" key={f.ime}>
                  <span className="fl-funkcija-ikona"><Ikona size={20} weight="regular" /></span>
                  <div><strong>{f.ime}</strong><p>{f.opis}</p></div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="fl-persone" id="zveni-znano" style={{ maxWidth: '72rem', margin: '0 auto', padding: 'clamp(3rem,7vw,6rem) clamp(1.2rem,5vw,3rem)' }}>
          <div className="k" style={{ fontSize: '.72rem', fontWeight: 600, letterSpacing: '.2em', textTransform: 'uppercase', color: 'rgba(17,17,17,.72)' }}>{t('Zveni znano?', 'Sound familiar?')}</div>
          <h2 style={{ fontFamily: 'var(--font-serif), serif', fontWeight: 500, fontSize: 'clamp(1.9rem, 5vw, 2.9rem)', lineHeight: 1.05, margin: '.55rem 0 .5rem', maxWidth: '20ch' }}>{t('Mogoče se prepoznaš.', 'You may recognise yourself.')}</h2>
          <p className="uvod" style={{ fontSize: '1rem', lineHeight: 1.6, color: 'rgba(17,17,17,.76)', maxWidth: '50ch', margin: '0 0 2.4rem' }}>{t('Prave zgodbe zbiramo — do takrat pa najpogostejše bolečine samostojnih kreativcev, ki jih Flow reši.', 'We are collecting real stories. Until then, these are the recurring problems Flow is designed to solve.')}</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(15.5rem, 1fr))', gap: '1.2rem', marginTop: '2.2rem' }}>
            {(isEn ? [
              { ini: 'A', ime: 'Anna', vloga: 'Illustrator', barva: 'linear-gradient(140deg, oklch(78% .12 300), oklch(66% .16 300))', bolecina: 'Every enquiry left me staring at a blank email. Quote too little and I worked almost for free; quote too much and the client disappeared. I was not charging for usage rights at all.' },
              { ini: 'M', ime: 'Max', vloga: 'Graphic designer', barva: 'linear-gradient(140deg, oklch(80% .1 200), oklch(66% .14 205))', bolecina: 'The proposal was in one document, the contract somewhere in my inbox and the invoice in a third app. Finding what we agreed took half an hour.' },
              { ini: 'N', ime: 'Nina', vloga: 'Photographer', barva: 'linear-gradient(140deg, oklch(82% .1 60), oklch(70% .14 55))', bolecina: 'I worked for months, yet by year-end I still did not know what I had actually earned. No overview — just the feeling that I was running in place.' },
            ] : [
              { ini: 'A', ime: 'Ana', vloga: 'Ilustratorka', barva: 'linear-gradient(140deg, oklch(78% .12 300), oklch(66% .16 300))', bolecina: 'Ob vsakem povpraševanju sem strmela v prazen mail — koliko naj rečem? Premalo in delaš skoraj zastonj, preveč in te ni nazaj. Avtorskih pravic sploh nisem zaračunavala.' },
              { ini: 'M', ime: 'Maj', vloga: 'Grafični oblikovalec', barva: 'linear-gradient(140deg, oklch(80% .1 200), oklch(66% .14 205))', bolecina: 'Ponudba v Wordu, pogodba nekje v mailu, račun v tretjem programu. Ko je stranka vprašala »kaj sva se dogovorila«, sem pol ure brskal po Gmailu.' },
              { ini: 'N', ime: 'Nina', vloga: 'Fotografinja', barva: 'linear-gradient(140deg, oklch(82% .1 60), oklch(70% .14 55))', bolecina: 'Delala sem cele mesece, konec leta pa nisem vedela, ali sem sploh kaj zaslužila. Nobenega pregleda — samo občutek, da tečem na mestu.' },
            ]).map(p => (
              <figure key={p.ime} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', margin: 0, padding: '1.5rem', border: '1px solid oklch(93% .006 82 / .8)', borderRadius: '1.2rem', background: 'oklch(99.5% .004 87 / .75)' }}>
                <span aria-hidden style={{ display: 'grid', placeItems: 'center', width: '3rem', height: '3rem', borderRadius: '50%', background: p.barva, color: '#fff', font: '600 1.05rem var(--font-sans, system-ui), sans-serif', flex: 'none' }}>{p.ini}</span>
                <blockquote style={{ margin: 0, fontSize: '.95rem', lineHeight: 1.55, color: 'var(--ink, #1a1622)' }}>»{p.bolecina}«</blockquote>
                <figcaption style={{ marginTop: 'auto' }}><strong style={{ fontSize: '.9rem' }}>{p.ime}</strong><span style={{ display: 'block', fontSize: '.78rem', color: 'var(--muted, #8a8177)' }}>{p.vloga}</span></figcaption>
              </figure>
            ))}
          </div>
        </section>

        <section className="fl-zaupanje" id="zaupanje" style={{ maxWidth: '72rem', margin: '0 auto', padding: 'clamp(3rem,7vw,6rem) clamp(1.2rem,5vw,3rem)' }}>
          <div className="k" style={{ fontSize: '.72rem', fontWeight: 600, letterSpacing: '.2em', textTransform: 'uppercase', color: 'rgba(17,17,17,.72)' }}>{t('Zakaj zaupati', 'Why trust Flow')}</div>
          <h2 style={{ fontFamily: 'var(--font-serif), serif', fontWeight: 500, fontSize: 'clamp(1.9rem, 5vw, 2.9rem)', lineHeight: 1.05, margin: '.55rem 0 .5rem', maxWidth: '20ch' }}>{t('Pošteno, varno, tvoje.', 'Fair, secure and yours.')}</h2>
          <p className="uvod" style={{ fontSize: '1rem', lineHeight: 1.6, color: 'rgba(17,17,17,.76)', maxWidth: '50ch', margin: '0 0 2.4rem' }}>{t('Nova beta brez referenc — a zaupanje si prisluživa odkrito, ne z izmišljenimi ocenami.', 'Flow is a new beta. We earn trust through transparency, not invented testimonials.')}</p>
          <div className="fl-zaupanje-mreza" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(15.5rem, 1fr))', gap: '1.2rem' }}>
            {(isEn ? [
              { Ik: ShieldCheck, ime: 'Your data stays yours', opis: 'Stored securely in the EU and accessible only to you. We never sell it; pricing insights use anonymous, aggregated data only.' },
              { Ik: ChatCircle, ime: 'A real person, not a department', opis: 'Flow is built by Tina, not an anonymous corporation. You can write to her directly and receive a real answer.' },
              { Ik: Sparkle, ime: 'No hidden catches', opis: 'The calculator stays free with no card required. You can export your data and leave at any time.' },
              { Ik: CheckCircle, ime: 'Built in the open', opis: 'Made in Slovenia for creatives, with a clear distinction between what works now and what is still coming.' },
            ] : [
              { Ik: ShieldCheck, ime: 'Tvoji podatki so tvoji', opis: 'Varno v oblaku (EU), dostop imaš samo ti. Ne prodamo in ne delimo — cene se združijo anonimno, nikoli ime.' },
              { Ik: ChatCircle, ime: 'Pravi človek, ne oddelek', opis: 'Za Flow stoji Tina, ne anonimno podjetje. Pišeš ji neposredno in dobiš odgovor.' },
              { Ik: Sparkle, ime: 'Brez pasti', opis: 'Kalkulator je brezplačen za vedno, brez kartice. Podatke lahko kadarkoli izvoziš in odideš.' },
              { Ik: CheckCircle, ime: 'Odkrito grajeno', opis: 'Narejeno v Sloveniji, za kreativce. Odkrito povemo, kaj že dela in kaj šele prihaja (beta).' },
            ]).map(t => (
              <div key={t.ime} style={{ display: 'flex', flexDirection: 'column', gap: '.7rem', padding: '1.5rem', border: '1px solid oklch(93% .006 82 / .8)', borderRadius: '1.2rem', background: 'oklch(99.5% .004 87 / .75)' }}>
                <span aria-hidden style={{ display: 'grid', placeItems: 'center', width: '2.6rem', height: '2.6rem', borderRadius: '.7rem', background: 'oklch(95% .012 300)', color: 'var(--accent, #7c3aed)', flex: 'none' }}><t.Ik size={20} weight="regular" /></span>
                <strong style={{ fontSize: '.98rem' }}>{t.ime}</strong>
                <p style={{ margin: 0, fontSize: '.88rem', lineHeight: 1.5, color: 'var(--muted, #6b6b6b)' }}>{t.opis}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="fl-cenik" id="cenik">
          <div className="k">{t('Cenik', 'Pricing')}</div>
          <h2>{t('Enostavno, pošteno, brez presenečenj.', 'Simple, fair and predictable.')}</h2>
          <p className="uvod">{t('Kalkulator poštenih cen je za vedno brezplačen. Za celo platformo izbereš paket — manj kot ena tvoja delovna ura na mesec.', 'The fair-pricing calculator stays free. Choose a plan for the full workspace for less than the value of one working hour a month.')}</p>
          <div role="group" aria-label={t('Obračun', 'Billing period')} style={{ display: 'inline-flex', gap: '.3rem', padding: '.28rem', margin: '0 auto 2.2rem', borderRadius: 999, background: 'rgba(17,17,17,.06)' }}>
            <button type="button" onClick={() => setLetno(false)} style={{ border: 'none', cursor: 'pointer', borderRadius: 999, padding: '.42rem 1rem', font: '700 .82rem var(--font-sans), sans-serif', background: !letno ? 'var(--ink)' : 'transparent', color: !letno ? 'var(--paper)' : 'var(--ink)' }}>{t('Mesečno', 'Monthly')}</button>
            <button type="button" onClick={() => setLetno(true)} style={{ border: 'none', cursor: 'pointer', borderRadius: 999, padding: '.42rem 1rem', font: '700 .82rem var(--font-sans), sans-serif', background: letno ? 'var(--ink)' : 'transparent', color: letno ? 'var(--paper)' : 'var(--ink)', display: 'inline-flex', alignItems: 'center', gap: '.4rem' }}>{t('Letno', 'Yearly')} <span style={{ fontSize: '.64rem', fontWeight: 800, letterSpacing: '.03em', color: letno ? '#8be6a8' : 'oklch(58% .13 160)' }}>{t('CENEJE', 'SAVE')}</span></button>
          </div>
          <div className="fl-cenik-mreza">
            {CENIKI.map(c => (
              <div className={`fl-plan${c.izpost ? ' izpost' : ''}${c.kmalu ? ' kmalu' : ''}`} key={c.ime}>
                {c.znacka && <span className="fl-plan-znacka">{c.znacka}</span>}
                <h3>{c.ime}</h3>
                <p className="fl-plan-za">{c.za}</p>
                <div className="fl-plan-cena">
                  <strong>{letno ? c.cena : ((c as { cenaMes?: string }).cenaMes ?? c.cena)}</strong><span>{c.enota}</span>
                  {'redna' in c && <s className="fl-plan-redna">{(c as { redna?: string }).redna} €</s>}
                </div>
                {'cenaMes' in c && <p style={{ margin: '.1rem 0 .5rem', fontSize: '.72rem', color: 'rgba(17,17,17,.55)' }}>{letno ? t('obračunano letno', 'billed annually') : t('mesečno, odpoveš kadarkoli', 'monthly, cancel anytime')}</p>}
                {'ustanovna' in c && <p className="fl-plan-ustanovna" style={{ marginTop: 0 }}>{(c as { ustanovna?: string }).ustanovna}</p>}
                {c.kmalu
                  ? <span className="fl-plan-cta cakalna" aria-disabled="true">{c.cta}</span>
                  : <a className={`fl-plan-cta${c.izpost ? ' polni' : ''}`} href={c.href}>{c.cta}</a>}
                <ul className="fl-plan-lista">
                  {c.vkljuceno.map(v => <li key={v} className="da"><CheckCircle size={16} weight="fill" /> {v}</li>)}
                </ul>
              </div>
            ))}
          </div>
          <p className="fl-cenik-opomba">{t('Cene ne vključujejo DDV. Paket lahko kadarkoli zamenjaš ali odpoveš.', 'Prices exclude VAT. You can change or cancel your plan at any time.')}</p>
          {/* Osebne primerjave cen ("nazadnje si zaracunala …") NE sodijo sem:
              obiskovalec landinga se nima svojih podatkov. Sodijo v kalkulator ob
              rezultat in na nadzorno plosco — glej docs/CENA-ARGUMENT.md */}
        </section>

        <section className="fl-faq" id="faq">
          <div className="fl-faq-glava">
            <div className="k">{t('Pogosta vprašanja', 'Frequently asked questions')}</div>
            <h2>{t('Odgovori na najpogostejša vprašanja.', 'Answers to the questions creatives ask most.')}</h2>
            <a className="fl-faq-podpora" href="mailto:tina@pinart.si">{t('Kontaktiraj podporo', 'Contact support')}</a>
          </div>
          <div className="fl-faq-lista">
            {VPRASANJA.map((q, i) => (
              <div className={`fl-faq-item${odprtoVpr === i ? ' odprt' : ''}`} key={q.v}>
                <button type="button" onClick={() => setOdprtoVpr(odprtoVpr === i ? null : i)} aria-expanded={odprtoVpr === i}>
                  <span>{q.v}</span>
                  <Plus size={19} weight="bold" />
                </button>
                <div className="fl-faq-odg"><div><p>{q.o}</p></div></div>
              </div>
            ))}
          </div>
        </section>

        <section className="fl-zgodba" id="onas">
          <div className="fl-zgodba-glava">
            <div className="k">{t('Moja zgodba', 'My story')}</div>
            <h2>{t('Zgradila sem Flow, kakršnega sem sama pogrešala.', 'I built the Flow workspace I wished I had.')}</h2>
          </div>
          <div className="fl-zgodba-telo">
            <div className="fl-zgodba-portret">
              <div className="fl-zgodba-foto" aria-hidden>
                <img src="/flow/tina_z.jpg" alt="Tina, Pinart" loading="lazy" onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
              </div>
              <CircularText text="PINART*FLOW*OD*KREATIVKE*ZA*KREATIVCE*" spinDuration={24} onHover="speedUp" />
            </div>
            <div className="fl-zgodba-tekst">
              {isEn ? <>
                <p>I am Tina, a designer and product strategist. Design is the part I love; proposals and invoices were the admin that consumed hours. I kept guessing whether I had charged enough, forgot usage rights and jumped between several tools.</p>
                <p>You may know the feeling: you spend hours preparing a proposal and the client replies with an AI-generated logo. AI is a valuable tool, but because it makes production faster than ever, our judgement and ability to find the right solution are worth more, not less.</p>
                <p>Designers, chefs, critics, painters and fashion creators all develop a point of view over years. That judgement gives a company its visual voice, keeps the brand consistent and helps its story evolve.</p>
                <p>Flow grew from that frustration. It helps creatives become authors of taste and voice, not merely executors — and understand the real value of their work.</p>
                <p>I built Flow as support from one creative to another: more time for your craft, more confidence in your choices and a clear understanding of your rights.</p>
              </> : <>
                <p>Sem Tina, oblikovalka in načrtovalka produktov. Oblikovanje je moje veselje — ponudbe in računi pa muka, ki požre ure. Ugibala sem, ali sem dovolj zaračunala, pozabljala na avtorske pravice in skakala med tremi orodji.</p>
                <p>Verjetno poznaš tudi ti: ure pripravljaš ponudbo, potem pa ti stranka pokaže z AI generiran logotip. Pojasniš, da nima pravega tona za njeno panogo — pa dobiš, da se o okusu ne razpravlja. Umetno inteligenco imam rada in mi je v pomoč; a prav zato, ker je tempo z njo hitrejši kot kdaj prej, je naš občutek za pravo rešitev vreden več, ne manj.</p>
                <p>Oblikovalci, kuharji, kritiki, slikarji, modni kreatorji — vsi gojimo občutek, ki zori leta. In prav ta okus podjetjem ustoliči vizualni glas in ton, jim vdihne življenje, drži konsistenco čez vse njihove znamke in skrbi, da se njihova zgodba razvija.</p>
                <p>Flow je nastal iz te utrujenosti. Da kreativci postanemo narekovalci okusa in glasu, ne zgolj izvajalci — da vemo, koliko je vredno naše delo, in ga ne prodamo pod ceno.</p>
                <p>Ker sem na isti strani kot ti, je Flow mišljen kot opora: da imaš več časa za svoj okus in izraz, več drznosti in mirno zavest o svojih pravicah. Ne gradimo le okusa — gradimo glas, ton in zgodbo, po katerih znamke zaživijo.</p>
              </>}
              <p className="fl-zgodba-podpis">— Tina, Pinart</p>
            </div>
          </div>
          <div className="fl-pupa-pas" aria-hidden ref={pasRef}>
            {/* PROSOJEN video (alfa) — src nastavi useEffect glede na brskalnik (Safari=mov, Chrome=webm) */}
            <video ref={pupaRef} className={`fl-pupa${pupaHodi ? ' hodi' : ''}`} muted loop playsInline preload="auto" />
          </div>
        </section>

        <footer className="fl-footer" data-nav-dark>
          {/* glinasti rekvizit — stojita na zgornjem robu temne noge */}
          <img src="/flow/kos3d.png" className="fl-prop fl-prop-kos" alt="" aria-hidden loading="lazy" ref={kosRef} />
          <img src="/flow/plant3d.png" className="fl-prop fl-prop-plant" alt="" aria-hidden loading="lazy" />
          <div className="fl-footer-top">
            <div className="fl-footer-brand">
              <span className="fl-footer-logo"><i /><strong>Pinart</strong><span>FLOW</span></span>
              <p>{t('Vse tvoje poslovanje, na enem mestu. Orodje pripravlja Tina, kreativna direktorica studia', 'Your whole creative business in one place. Built by Tina, creative director at')} <a href={localePath(locale, '')}>Pinart</a>.</p>
            </div>
            <nav className="fl-footer-cols">
              <div>
                <strong>{t('Produkt', 'Product')}</strong>
                <a href="#orodja">Pinart Flow</a>
                <a href={kalkulator}>{t('Kalkulator', 'Calculator')}</a>
                <a href="#cenik">{t('Cenik', 'Pricing')}</a>
              </div>
              <div>
                <strong>{t('Začni', 'Get started')}</strong>
                <a href={prijava}>{t('Prijava', 'Log in')}</a>
                <a href={`${prijava}?nov=1`}>{t('Ustvari račun', 'Create account')}</a>
                <a href={kalkulator}>{t('Odpri kalkulator', 'Open calculator')}</a>
              </div>
              <div>
                <strong>{t('Podjetje', 'Company')}</strong>
                <a href="#onas">{t('O nas', 'About')}</a>
                <a href={localePath(locale, '')}>Studio Pinart</a>
                <a href="#faq">{t('Pogosta vprašanja', 'FAQ')}</a>
              </div>
              <div>
                <strong>{t('Kontakt', 'Contact')}</strong>
                <a href="mailto:tina@pinart.si">tina@pinart.si</a>
                <a href="mailto:tina@pinart.si">Let&rsquo;s talk</a>
                <a href="#cenik">{t('Načini plačila', 'Payment options')}</a>
              </div>
            </nav>
          </div>
          <div className="fl-footer-bottom">
            <span>© 2026 Pinart · {t('Vse pravice pridržane', 'All rights reserved')}</span>
            <span className="fl-footer-legal">
              <a href={localePath(locale, '/zasebnost')}>{t('Zasebnost', 'Privacy')}</a>
              <a href={localePath(locale, '/kalkulator/pogoji')}>{t('Pogoji', 'Terms')}</a>
              <a href="#cenik">{t('Načini plačila', 'Payment options')}</a>
            </span>
          </div>
        </footer>
      </div>
    </div>
  );
}
