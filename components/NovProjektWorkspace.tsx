'use client';

/* USTVARI PROJEKT — polnostranski tool, oblikovan ENAKO kot Pogodbe/Računi
   (ContractWorkspace/InvoiceWorkspace): eyebrow + Bodoni naslov čez celo širino
   delovnega prostora (DashboardSidebar layout), vsebina (chat vprašalnik) v
   ozkem sredinskem stolpcu kot dokument (glej .np-stolpec). Prej je bil ta
   isti chat tok stisnjen v desni predal (.pw-nov-panel) znotraj ProjectsWorkspace
   — logika (koraki, cilji, dodatna vprasanja, povezave, ekipa, shranjevanje) je
   PRENESENA sem nespremenjena, le razredi so preimenovani pw- -> np- in panel/
   modal ovoj je odstranjen (zdaj navadna stran, ne dialog).

   Ustvarjanje projekta piše v lib/projekti (locena localStorage shramba, NI del
   deljene Flow/cloud sinhronizacije) — zato deluje TUDI v predogledu (demo):
   ni gate-a na samoOgled, gumb "Ustvari projekt" je vedno omogočen, ko je
   naslov izpolnjen. Po shranjevanju preusmeri na vozlišče projekta v Arhivu
   (isti vzorec kot ClientWorkspace: `${base}/kalkulator/projekti?projekt=<id>`,
   kar ProjectsWorkspace ze zna odpreti). */

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowRight, CaretDown, PencilSimple } from '@phosphor-icons/react';
import { loadFlowData, saveProjectLinks, type FlowClient, type FlowOffer, type FlowContract } from '@/lib/pinartFlowStore';
import { podatkiZaPredogled, usePredogled } from '@/lib/predogled';
import { naslednjaStevilka, preberiProjekti, shraniProjekt, type Projekt, type ProjektCilj, type ProjektPovezava, type ProjektStatus, type ProjektVprasanje } from '@/lib/projekti';
import { preberiSodelavci, vlogaOznaka } from '@/lib/sodelavci';
import type { Sodelavec } from '@/lib/naloge';

const datStr = (s: string) => { const d = new Date(s); return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('sl-SI'); };
const projektStatusOznaka: Record<ProjektStatus, string> = { aktiven: 'Aktiven', pavza: 'V pavzi', koncan: 'Končan' };

/* Vodena persona (korak 5): podvprašanja, skozi katera vodimo uporabnika (ali preskoči).
   Odgovori se ob zaključku združijo v en ciljnaSkupina zapis. */
const PERSONA_VPR = [
  { k: 'kdo', q: 'Kdo so in koliko so stari?', ph: 'Npr. mestni mladi odrasli, 25–40 let …', oznaka: 'Kdo' },
  { k: 'upo', q: 'Kaj ponavadi uporabljajo?', ph: 'Navade, orodja, kanali — npr. Instagram, dostavne aplikacije …', oznaka: 'Uporablja' },
  { k: 'pain', q: 'Kaj so njihovi pain points?', ph: 'Kaj jih ovira, kje se zataknejo …', oznaka: 'Pain points' },
  { k: 'potrebe', q: 'Kaj potrebujejo?', ph: 'Katere potrebe naj projekt naslovi …', oznaka: 'Potrebe' },
  { k: 'cilji', q: 'Kaj želijo doseči in kje jih dosežeš?', ph: 'Cilji + kanali, kjer jih najdeš …', oznaka: 'Cilji / kanali' },
] as const;
type PersonaKljuc = typeof PERSONA_VPR[number]['k'];
const zdruziPersono = (p: Record<PersonaKljuc, string>) => PERSONA_VPR
  .map(v => p[v.k].trim() && `${v.oznaka}: ${p[v.k].trim()}`)
  .filter(Boolean).join('\n');

export default function NovProjektWorkspace({ base }: { base: string }) {
  const router = useRouter();
  const [nacin, setPredogled] = usePredogled();
  const [clients, setClients] = useState<FlowClient[]>([]);
  /* Ponudbe za POTEG: projekt se najpogosteje rodi iz potrjene ponudbe — namesto
     prepisovanja naslova in stranke jo uporabnica izbere in podatki se prenesejo. */
  const [offers, setOffers] = useState<FlowOffer[]>([]);
  const [contracts, setContracts] = useState<FlowContract[]>([]);
  const [potegnjena, setPotegnjena] = useState<string>('');
  const [sodelavci, setSodelavci] = useState<Sodelavec[]>([]);
  const [realProjekti, setRealProjekti] = useState<Projekt[]>([]);
  /* urejanje obstoječega projekta: ?uredi=<id> naloži projekt, predizpolni obrazec in ob
     shranjevanju POSODOBI (ohrani id/številko/created) namesto ustvari nov. Tako sta brief
     IN cilji urejljiva v tem obrazcu (isto polje kot ob ustvarjanju). */
  const searchParams = useSearchParams();
  const [urejam, setUrejam] = useState<Projekt | null>(null);

  useEffect(() => {
    const flow = podatkiZaPredogled(nacin, loadFlowData());
    setClients(flow.clients);
    setOffers(flow.offers || []);
    setContracts(flow.contracts || []);
    setSodelavci(preberiSodelavci());
    setRealProjekti(preberiProjekti());
  }, [nacin]);

  useEffect(() => {
    const id = searchParams.get('uredi');
    if (!id) return;
    const p = preberiProjekti().find(x => x.id === id || `real-${x.id}` === id);
    if (!p) return;
    setUrejam(p);
    setObrazec({
      naslov: p.naslov || '', strankaId: p.strankaId || '', zacetek: p.zacetek || '', rok: p.rok || '',
      status: p.status || 'aktiven', opisStranke: p.opisStranke || '', panoga: p.panoga || '',
      ciljnaSkupina: p.ciljnaSkupina || '', podrobnosti: p.podrobnosti || '', persona: { kdo: '', upo: '', pain: '', potrebe: '', cilji: '' } as Record<PersonaKljuc, string>,
      dizajnZelje: p.dizajnZelje || '', voice: p.voice || '', konkurenca: p.konkurenca || '',
      cilji: p.cilji || [], dodatnaVprasanja: p.dodatnaVprasanja || [], povezave: p.povezave || [], dodeljeni: p.dodeljeni || [],
    });
    setNovKorak(13); setPodrobnostiPotrjene(true); /* urejanje: vse takoj vidno */
  }, [searchParams]);

  const prazenObrazec = () => ({ naslov: '', strankaId: '', zacetek: '', rok: '', status: 'aktiven' as ProjektStatus, podrobnosti: '', opisStranke: '', panoga: '', ciljnaSkupina: '', persona: { kdo: '', upo: '', pain: '', potrebe: '', cilji: '' } as Record<PersonaKljuc, string>, dizajnZelje: '', voice: '', konkurenca: '', cilji: [] as ProjektCilj[], dodatnaVprasanja: [] as ProjektVprasanje[], povezave: [] as ProjektPovezava[], dodeljeni: [] as string[] });
  const [obrazec, setObrazec] = useState(prazenObrazec());
  /* onboarding kot CHAT (glej np-chat-* spodaj): novKorak = do kam je uporabnica
     ze prisla (0..11, 11 = vsa osnovna vprasanja odgovorjena -> dodatno+povezave+ekipa+zakljucek);
     koraki: 0 naslov, 1 stranka, 2 cilji, 3 opis stranke, 4 panoga, 5 ciljna skupina,
     6 dizajn zelje, 7 voice/ton, 8 konkurenca, 9 zacetek/rok, 10 status.
     urejamKorak = klik na ze odgovorjen mehurcek odpre polje ZNOVA V MESTU */
  /* MARKETINSKI OKVIR JE ZLOZEN, ne vsiljen (Tina, 25. 8.: "kot vpis podatkov
     podjetja pri kalkulatorju"). Privzeto so vprasanja stiri: ime, stranka,
     rok, status. Cilji, persona, dizajn, ton in konkurenca zivijo za zaprto
     vrstico s plusom — kdor jih rabi, jo odpre. */
  const [okvir, setOkvir] = useState(false); /* stari chat-nacin — ostaja izklopljen */
  const [podrobnostiOdprte, setPodrobnostiOdprte] = useState(false);
  /* Safari (se) ne zna field-sizing: content — visino uravnamo ob tipkanju */
  const rastiTextarea = (el: HTMLTextAreaElement) => {
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  };
  /* Vrstica podrobnosti je SVOJ korak z Naprej — ce pogovor tece mimo nje,
     jo spregledas (Tina, 25. 8.). */
  const [podrobnostiPotrjene, setPodrobnostiPotrjene] = useState(false);
  /* Pupa napolni prazna polja podrobnosti iz tega, kar ze vemo — prazna
     vprasanja so kruta do nekoga, ki "ne ve, kaj bi" (Tina, 25. 8.). */
  const [pupaPolni, setPupaPolni] = useState(false);
  const [pupaNapaka, setPupaNapaka] = useState('');
  const pupaPredlaga = async () => {
    setPupaPolni(true); setPupaNapaka('');
    const stranka = clients.find(c => c.id === obrazec.strankaId)?.name || '';
    try {
      const r = await fetch('/api/pupa', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          vprasanje: 'Izpolni podrobnosti kreativnega projekta. Vrni SAMO cist JSON brez razlage, s kljuci: opisStranke, panoga, ciljnaSkupina, dizajnZelje, voice, konkurenca. Vsaka vrednost kratka (1-2 stavka), v slovenscini, prakticna. Ce cesa ni mogoce sklepati, vrni prazen niz.',
          kontekst: `Projekt: ${obrazec.naslov || '(brez imena)'}. Stranka: ${stranka || '(neznana)'}. Ze vpisano - dejavnost: ${obrazec.opisStranke || '-'}; panoga: ${obrazec.panoga || '-'}; ciljna skupina: ${obrazec.ciljnaSkupina || '-'}.`,
        }),
      });
      const d = await r.json();
      if (!r.ok || !d.odgovor) throw new Error(d.napaka || 'Pupa ni odgovorila.');
      const ujemanje = String(d.odgovor).match(/\{[\s\S]*\}/);
      if (!ujemanje) throw new Error('Pupa ni vrnila predlogov.');
      const predlogi = JSON.parse(ujemanje[0]) as Record<string, string>;
      setObrazec(o => ({
        ...o,
        opisStranke: o.opisStranke.trim() ? o.opisStranke : (predlogi.opisStranke || o.opisStranke),
        panoga: o.panoga.trim() ? o.panoga : (predlogi.panoga || o.panoga),
        ciljnaSkupina: o.ciljnaSkupina.trim() ? o.ciljnaSkupina : (predlogi.ciljnaSkupina || o.ciljnaSkupina),
        dizajnZelje: o.dizajnZelje.trim() ? o.dizajnZelje : (predlogi.dizajnZelje || o.dizajnZelje),
        voice: o.voice.trim() ? o.voice : (predlogi.voice || o.voice),
        konkurenca: o.konkurenca.trim() ? o.konkurenca : (predlogi.konkurenca || o.konkurenca),
      }));
    } catch (napaka) {
      setPupaNapaka(napaka instanceof Error ? napaka.message : 'Pupa trenutno ne more pomagati.');
    }
    setPupaPolni(false);
  };
  /* Lastna vprasanja so ZLOZENA (Tina, 25. 8.: "tega ne rabim videti") —
     vrstica s plusom, odpre se na klik ali ce vprasanja ze obstajajo. */
  const [vprasanjaOdprta, setVprasanjaOdprta] = useState(false);
  const [novKorak, setNovKorak] = useState(0);
  const [urejamKorak, setUrejamKorak] = useState<number | null>(null);
  const [novoVprasanje, setNovoVprasanje] = useState({ vprasanje: '', odgovor: '' });
  const [povezavaNaslov, setPovezavaNaslov] = useState('');
  const [povezavaUrl, setPovezavaUrl] = useState('');
  /* aktivno vprasanje VEDNO na sredini vidnega polja (Tina: prejsnja Q&A ostanejo
     nad njim, dosegljiva z drsenjem gor) — ref na trenutno aktivni np-chat-bot
     mehurcek + scrollIntoView ob vsaki spremembi koraka. prviRender preskoci prvi
     efekt, da prvi korak (ze centriran s CSS flex) ne "skoci" ob nalaganju. */
  const aktivniRef = useRef<HTMLDivElement | null>(null);
  const prviRender = useRef(true);
  useEffect(() => {
    if (prviRender.current) { prviRender.current = false; return; }
    const el = aktivniRef.current;
    if (!el) return;
    const zmanjsanoGibanje = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollIntoView({ behavior: zmanjsanoGibanje ? 'auto' : 'smooth', block: 'center' });
  }, [novKorak, urejamKorak]);

  /* Poteg iz ponudbe: prenese naslov, stranko in stevilko; skoci na cilje,
     ker sta prvi dve vprasanji s tem ze odgovorjeni. */
  const potegniIzPonudbe = (kljuc: string) => {
    const [vrsta, id] = kljuc.split(':');
    const vir: { title?: string; client?: string } | undefined =
      vrsta === 'p' ? contracts.find(x => x.id === id) : offers.find(x => x.id === id);
    if (!vir) return;
    const stranka = clients.find(c => c.name.trim().toLocaleLowerCase('sl-SI') === (vir.client || '').trim().toLocaleLowerCase('sl-SI'));
    setObrazec(prej => ({ ...prej, naslov: vir.title || prej.naslov, strankaId: stranka?.id || prej.strankaId }));
    setPotegnjena(kljuc);
    setNovKorak(k => (k < 2 ? 2 : k));
    setUrejamKorak(null);
  };

  const dodajCilj = () => setObrazec(o => ({ ...o, cilji: [...o.cilji, { id: crypto.randomUUID(), besedilo: '', metrika: '', tarca: '' }] }));
  const odstraniCilj = (id: string) => setObrazec(o => ({ ...o, cilji: o.cilji.filter(c => c.id !== id) }));
  const posodobiCilj = (id: string, patch: Partial<ProjektCilj>) => setObrazec(o => ({ ...o, cilji: o.cilji.map(c => c.id === id ? { ...c, ...patch } : c) }));
  /* potrdi trenutni korak vprasanja: naprej=true premakne kazalec (NAPREJ), sicer
     samo zapre "urejanje v mestu" (Shrani na ze odgovorjenem koraku) */
  const potrdiKorak = (naprej: boolean) => { setUrejamKorak(null); if (naprej) setNovKorak(k => Math.min(13, k + 1)); };
  /* Vodena persona (korak 5): pKorak = kateri podkorak persone je aktiven. */
  const [pKorak, setPKorak] = useState(0);
  const setPersona = (k: PersonaKljuc, v: string) => setObrazec(o => ({ ...o, persona: { ...o.persona, [k]: v } }));
  const naprejPersona = () => {
    if (pKorak < PERSONA_VPR.length - 1) { setPKorak(k => k + 1); return; }
    setObrazec(o => ({ ...o, ciljnaSkupina: zdruziPersono(o.persona) }));
    setPKorak(0); potrdiKorak(true);
  };
  const preskociPersono = () => { setObrazec(o => ({ ...o, ciljnaSkupina: zdruziPersono(o.persona) })); setPKorak(0); potrdiKorak(true); };
  /* "+ dodaj vprašanje" — lastno vprasanje + odgovor, prosto besedilo, brez sheme */
  const dodajVprasanje = () => {
    const vprasanje = novoVprasanje.vprasanje.trim(); const odgovor = novoVprasanje.odgovor.trim();
    if (!vprasanje || !odgovor) return;
    setObrazec(o => ({ ...o, dodatnaVprasanja: [...o.dodatnaVprasanja, { id: crypto.randomUUID(), vprasanje, odgovor }] }));
    setNovoVprasanje({ vprasanje: '', odgovor: '' });
  };
  const odstraniVprasanje = (id: string) => setObrazec(o => ({ ...o, dodatnaVprasanja: o.dodatnaVprasanja.filter(v => v.id !== id) }));
  /* povezave do zunanjih gradiv, zajete ze tu — ob shranjevanju se zrcalijo tudi
     v obstojeco shrambo FlowProjectLink (glej shraniNovProjekt spodaj), da jih
     kartica "05 · Dokumentacija" na vozliscu takoj prikaze brez dodatne logike */
  const dodajPovezavo = () => {
    const naslov = povezavaNaslov.trim(); const url = povezavaUrl.trim();
    if (!naslov || !url) return;
    setObrazec(o => ({ ...o, povezave: [...o.povezave, { id: crypto.randomUUID(), naslov, url }] }));
    setPovezavaNaslov(''); setPovezavaUrl('');
  };
  const odstraniPovezavo = (id: string) => setObrazec(o => ({ ...o, povezave: o.povezave.filter(p => p.id !== id) }));
  const preklopiDodeljen = (id: string) => setObrazec(o => ({ ...o, dodeljeni: o.dodeljeni.includes(id) ? o.dodeljeni.filter(x => x !== id) : [...o.dodeljeni, id] }));
  /* "Deli projekt" — za zdaj mailto vabilo dodeljenim (lokalni mock, glej opombo pri
     Projekt.dodeljeni v lib/projekti.ts); pravo deljenje pride z vec-uporabniskim zaledjem */
  const deliProjekt = () => {
    if (typeof window === 'undefined' || !obrazec.dodeljeni.length) return;
    const prejemniki = sodelavci.filter(s => obrazec.dodeljeni.includes(s.id)).map(s => s.email).filter(Boolean).join(',');
    const zadeva = `Projekt: ${obrazec.naslov.trim() || 'Nov projekt'}`;
    const telo = `Pozdravljeni,\n\nvabim vas k sodelovanju na projektu »${obrazec.naslov.trim()}«.\n\nLep pozdrav`;
    window.location.href = `mailto:${prejemniki}?subject=${encodeURIComponent(zadeva)}&body=${encodeURIComponent(telo)}`;
  };

  /* Shranjevanje piše SAMO v lib/projekti (locena localStorage shramba, ni del
     deljene Flow/cloud sinhronizacije) — zato deluje tudi v predogledu (demo);
     brez gate-a na samoOgled. Po shranjevanju preusmeri na vozlišče projekta. */
  const shraniNovProjekt = () => {
    const naslov = obrazec.naslov.trim();
    if (!naslov) return;
    const stranka = clients.find(c => c.id === obrazec.strankaId);
    const projekt: Projekt = {
      id: urejam?.id || crypto.randomUUID(),
      stevilka: urejam?.stevilka || naslednjaStevilka(realProjekti),
      naslov: enolicnoIme(naslov),
      strankaId: stranka?.id,
      strankaIme: stranka?.name,
      opisStranke: obrazec.opisStranke.trim() || undefined,
      panoga: obrazec.panoga.trim() || undefined,
      ciljnaSkupina: obrazec.ciljnaSkupina.trim() || undefined,
      dizajnZelje: obrazec.dizajnZelje.trim() || undefined,
      voice: obrazec.voice.trim() || undefined,
      konkurenca: obrazec.konkurenca.trim() || undefined,
      podrobnosti: (obrazec.podrobnosti || '').trim() || undefined,
      /* Cilj z izpolnjenim merilom ali tarco, a praznim besedilom, se je tiho
         zavrgel (Tina, 25. 8.: "čas + 800 €" -> cilji: [] v oblaku). Obdrzimo
         vse, kjer je karkoli vpisano; besedilo po potrebi sestavimo iz njiju. */
      cilji: obrazec.cilji
        .filter(c => c.besedilo.trim() || c.metrika?.trim() || c.tarca?.trim())
        .map(c => ({
          id: c.id,
          besedilo: c.besedilo.trim() || [c.metrika?.trim(), c.tarca?.trim()].filter(Boolean).join(' · '),
          metrika: c.metrika?.trim() || undefined,
          tarca: c.tarca?.trim() || undefined,
        })),
      zacetek: obrazec.zacetek || undefined,
      rok: obrazec.rok || undefined,
      status: obrazec.status,
      vrsta: (podrobnostiOdprte || obrazec.cilji.some(c => c.besedilo.trim() || c.tarca?.trim())
        || obrazec.opisStranke.trim() || obrazec.ciljnaSkupina.trim() || (obrazec.podrobnosti || '').trim()) ? 'okvir' : 'preprost',
      created: urejam?.created || new Date().toISOString(),
      dodatnaVprasanja: obrazec.dodatnaVprasanja.length ? obrazec.dodatnaVprasanja : undefined,
      povezave: obrazec.povezave.length ? obrazec.povezave : undefined,
      dodeljeni: obrazec.dodeljeni.length ? obrazec.dodeljeni : undefined,
    };
    /* Vpisano-a-ne-dodano se NE sme tiho izgubiti (Tina, 25. 8.: druga povezava
       je izginila): ce sta polji za povezavo ali vprasanje se polni, ju ob
       shranjevanju dodamo, kot da je kliknila "+ Dodaj". */
    const cakajocaPovezava = povezavaNaslov.trim() && povezavaUrl.trim()
      ? [{ id: crypto.randomUUID(), naslov: povezavaNaslov.trim(), url: povezavaUrl.trim() }] : [];
    const cakajoceVprasanje = novoVprasanje.vprasanje.trim() && novoVprasanje.odgovor.trim()
      ? [{ id: crypto.randomUUID(), vprasanje: novoVprasanje.vprasanje.trim(), odgovor: novoVprasanje.odgovor.trim() }] : [];
    if (cakajocaPovezava.length) projekt.povezave = [...(projekt.povezave || []), ...cakajocaPovezava];
    if (cakajoceVprasanje.length) projekt.dodatnaVprasanja = [...(projekt.dodatnaVprasanja || []), ...cakajoceVprasanje];
    shraniProjekt(projekt);
    if (projekt.povezave?.length) saveProjectLinks(`real-${projekt.id}`, projekt.povezave.map(p => ({ oznaka: p.naslov, url: p.url })));
    /* Nov projekt = PRAVI (moji) podatek. Preklopi na »moji podatki«, da se pravi
       projekti sploh naložijo (v demo nacinu jih ProjectsWorkspace ne bere), nato
       odpri detajl/specifikacijo tega projekta prek ?projekt=real-<id>. */
    setPredogled('mine');
    router.push(`${base}/kalkulator/projekti?projekt=real-${projekt.id}`);
  };

  /* mehurcek bota (vprasanje) + moj odgovor (klikljiv, odpre urejanje v mestu) — isti
     vzorec kot chat-bot/chat-jaz v KalkulatorApp.tsx/ProjectsWorkspace, tu s predpono np- */
  /* Enaka imena projektov: samodejna stevilka + opozorilo (Tina, 25. 8.,
     "oboje A in B") — isti vzorec kot pri imenih ponudb. "Smeg" ze obstaja ->
     novi se shrani kot "Smeg 2", uporabnica pa to izve ze pod poljem. */
  const enolicnoIme = (zeljeno: string): string => {
    const ime = zeljeno.trim();
    if (!ime) return ime;
    const zasedena = new Set(realProjekti
      .filter(pr => !pr.deletedAt && pr.id !== urejam?.id)
      .map(pr => pr.naslov.trim().toLocaleLowerCase('sl')));
    if (!zasedena.has(ime.toLocaleLowerCase('sl'))) return ime;
    let n = 2;
    while (zasedena.has(`${ime} ${n}`.toLocaleLowerCase('sl'))) n += 1;
    return `${ime} ${n}`;
  };
  const prikazan = (i: number) => novKorak >= i;
  const aktiven = (i: number) => novKorak === i || urejamKorak === i;
  const odgovorjen = (i: number) => novKorak > i && urejamKorak !== i;
  /* chatBot za korak i: ce je ta korak trenutno aktiven, se nanj obesi aktivniRef
     (glej scrollIntoView efekt zgoraj) — tako je vedno TA mehurcek, ki se centrira */
  const chatBot = (naslov: string, opis?: string, korak?: number) => (
    <div className="np-chat-bot" ref={korak !== undefined && aktiven(korak) ? (el => { aktivniRef.current = el; }) : undefined}>
      <span className="np-chat-mehur"><b>{naslov}</b>{opis && <small>{opis}</small>}</span>
    </div>
  );
  const chatOdgovor = (korak: number, vsebina: string) => (
    <div className="np-chat-jaz"><button type="button" className="np-chat-mehur-ured" onClick={() => setUrejamKorak(korak)} title="Izberi za popravek"><span>{vsebina}</span><PencilSimple size={13} weight="bold" aria-hidden /></button></div>
  );

  return <div className="np">
    <div className="np-stolpec np-vstop">
      <p className="np-kicker">Ustvari projekt</p>
      <h1 className="np-h1">Začni nov projekt.</h1>

      <div className="np-chat-tok">
        {/* POTEG IZ PONUDBE — projekt najpogosteje nastane iz potrjene ponudbe */}
        {!urejam && (offers.length > 0 || contracts.length > 0) && (
          <div className="np-poteg">
            <p className="np-poteg-naslov">Gradiš iz obstoječe ponudbe ali pogodbe?</p>
            <p className="np-poteg-pod">Izberi jo in prenesem naslov ter stranko. Lahko tudi začneš iz nič.</p>
            <select className="np-chat-polje" value={potegnjena} onChange={e => e.target.value && potegniIzPonudbe(e.target.value)} aria-label="Ponudba ali pogodba">
              <option value="">Začni iz nič</option>
              {offers.length > 0 && (
                <optgroup label="Ponudbe">
                  {offers.map(o => (
                    <option key={o.id} value={`o:${o.id}`}>{[o.number, o.title, o.client].filter(Boolean).join(' · ')}</option>
                  ))}
                </optgroup>
              )}
              {contracts.length > 0 && (
                <optgroup label="Pogodbe">
                  {contracts.map(c => (
                    <option key={c.id} value={`p:${c.id}`}>{[c.title, c.client].filter(Boolean).join(' · ')}</option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>
        )}

        {/* 0 · naslov */}
        {prikazan(0) && chatBot('Kako se projekt imenuje?', undefined, 0)}
        {odgovorjen(0) && chatOdgovor(0, obrazec.naslov.trim() || '—')}
        {aktiven(0) && (
          <form className="np-chat-vnos" onSubmit={event => { event.preventDefault(); if (obrazec.naslov.trim()) potrdiKorak(urejamKorak !== 0); }}>
            {/* duh-predlog: ob podvojenem imenu se sivo izpise stevilka, Tab jo
                sprejme (Tina, 25. 8.) */}
            <span className="np-ime-ovoj">
                          <input className="np-chat-polje np-ime-vnos" type="text" autoFocus value={obrazec.naslov} onKeyDown={event => {
                if (event.key === 'Tab' && obrazec.naslov.trim() && enolicnoIme(obrazec.naslov) !== obrazec.naslov.trim()) {
                  event.preventDefault();
                  setObrazec(o => ({ ...o, naslov: enolicnoIme(o.naslov) }));
                }
              }} onChange={event => setObrazec(o => ({ ...o, naslov: event.target.value }))} placeholder="npr. Prenova celostne podobe" aria-label="Naslov projekta" />
              {obrazec.naslov.trim() && enolicnoIme(obrazec.naslov) !== obrazec.naslov.trim() && (
                <span className="np-ime-duh" aria-hidden><i>{obrazec.naslov}</i><em>{enolicnoIme(obrazec.naslov).slice(obrazec.naslov.trim().length)}</em></span>
              )}
            </span>
            {obrazec.naslov.trim() && enolicnoIme(obrazec.naslov) !== obrazec.naslov.trim() && (
              <p className="np-ime-opomba">Projekt s tem imenom že obstaja — pritisni Tab za »{enolicnoIme(obrazec.naslov)}«.</p>
            )}
            <button type="submit" className="np-chat-naprej" disabled={!obrazec.naslov.trim()}>{urejamKorak === 0 ? 'Shrani' : 'Naprej'} <ArrowRight size={15} weight="bold" aria-hidden /></button>
          </form>
        )}

        {/* 1 · stranka */}
        {prikazan(1) && chatBot('Za katero stranko je ta projekt?', clients.length ? 'Izberi iz imenika — ali nadaljuj brez stranke.' : 'V imeniku še ni strank — lahko nadaljuješ brez izbora.', 1)}
        {odgovorjen(1) && chatOdgovor(1, clients.find(c => c.id === obrazec.strankaId)?.name || 'Brez stranke')}
        {aktiven(1) && (
          <form className="np-chat-vnos" onSubmit={event => { event.preventDefault();
            if (urejamKorak === 1) { setUrejamKorak(null); return; }
            setUrejamKorak(null); setNovKorak(okvir ? 2 : 9);
          }}>
            <select className="np-chat-polje" value={obrazec.strankaId} onChange={event => setObrazec(o => ({ ...o, strankaId: event.target.value }))} aria-label="Stranka">
              <option value="">Brez stranke</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <button type="submit" className="np-chat-naprej">{urejamKorak === 1 ? 'Shrani' : 'Naprej'} <ArrowRight size={15} weight="bold" aria-hidden /></button>
          </form>
        )}

        {/* 2 · cilji */}
        {okvir && prikazan(2) && chatBot('Kaj so cilji projekta?', 'Dodaj enega ali več — lahko tudi preskočiš.', 2)}
        {okvir && odgovorjen(2) && chatOdgovor(2, obrazec.cilji.filter(c => c.besedilo.trim()).length ? obrazec.cilji.filter(c => c.besedilo.trim()).map(c => c.besedilo.trim()).join(' · ') : 'Brez ciljev')}
        {okvir && aktiven(2) && (
          <div className="np-chat-vnos">
            {obrazec.cilji.map(cilj => (
              <div key={cilj.id} className="np-nov-cilj">
                <input type="text" value={cilj.besedilo} onChange={event => posodobiCilj(cilj.id, { besedilo: event.target.value })} placeholder="Cilj, npr. povečati prepoznavnost znamke" aria-label="Cilj" />
                <select value={cilj.metrika || ''} onChange={event => posodobiCilj(cilj.id, { metrika: event.target.value })} aria-label="Merilo cilja (kaj meriš)"><option value="">Kaj meriš? (neobvezno)</option><option value="Prihodek (€)">Prihodek (€)</option><option value="Ure">Ure</option><option value="Št. projektov">Št. projektov</option><option value="Št. strank">Št. strank</option><option value="V roku (%)">V roku (%)</option><option value="Zadovoljstvo stranke">Zadovoljstvo stranke</option><option value="Marža (%)">Marža (%)</option></select>
                <input type="text" value={cilj.tarca || ''} onChange={event => posodobiCilj(cilj.id, { tarca: event.target.value })} placeholder="Tarča — npr. 3000 €" aria-label="Tarča cilja (številka, ki jo ciljaš)" />
                <button type="button" className="np-link-brisi" onClick={() => odstraniCilj(cilj.id)} aria-label="Odstrani cilj">×</button>
              </div>
            ))}
            <button type="button" className="np-nov-dodaj-cilj" onClick={dodajCilj}>+ Dodaj cilj</button>
            <button type="button" className="np-chat-naprej" onClick={() => potrdiKorak(urejamKorak !== 2)}>{urejamKorak === 2 ? 'Shrani' : 'Naprej'} <ArrowRight size={15} weight="bold" aria-hidden /></button>
          </div>
        )}

        {/* 3 · kdo je stranka (razširjen brief — locen korak namesto ene "zelje" textarea) */}
        {okvir && prikazan(3) && chatBot('Kaj počne stranka?', 'Njena dejavnost in kontekst — prosto besedilo.', 3)}
        {okvir && odgovorjen(3) && chatOdgovor(3, obrazec.opisStranke.trim() || 'Brez opisa')}
        {okvir && aktiven(3) && (
          <form className="np-chat-vnos" onSubmit={event => { event.preventDefault(); potrdiKorak(urejamKorak !== 3); }}>
            <textarea className="np-chat-polje" value={obrazec.opisStranke} onChange={event => { rastiTextarea(event.currentTarget); setObrazec(o => ({ ...o, opisStranke: event.target.value })); }} placeholder="Npr. lokalna kavarna, širi ponudbo na zajtrke …" rows={3} aria-label="Kaj počne stranka" />
            <button type="submit" className="np-chat-naprej">{urejamKorak === 3 ? 'Shrani' : 'Naprej'} <ArrowRight size={15} weight="bold" aria-hidden /></button>
          </form>
        )}

        {/* 4 · panoga stranke (širši kontekst, takoj za "Kdo je stranka?") */}
        {okvir && prikazan(4) && chatBot('Iz katere panoge je stranka?', undefined, 4)}
        {okvir && odgovorjen(4) && chatOdgovor(4, obrazec.panoga.trim() || 'Ni določena')}
        {okvir && aktiven(4) && (
          <form className="np-chat-vnos" onSubmit={event => { event.preventDefault(); potrdiKorak(urejamKorak !== 4); }}>
            <input className="np-chat-polje" type="text" value={obrazec.panoga} onChange={event => setObrazec(o => ({ ...o, panoga: event.target.value }))} placeholder="Npr. gostinstvo, IT storitve, gradbeništvo …" aria-label="Panoga stranke" />
            <button type="submit" className="np-chat-naprej">{urejamKorak === 4 ? 'Shrani' : 'Naprej'} <ArrowRight size={15} weight="bold" aria-hidden /></button>
          </form>
        )}

        {/* 5 · ciljna skupina / persona */}
        {okvir && prikazan(5) && chatBot('Opišimo ciljno skupino (persono).', 'Vodim te skozi nekaj vprašanj — ali preskoči.', 5)}
        {okvir && odgovorjen(5) && chatOdgovor(5, obrazec.ciljnaSkupina.trim() || 'Preskočena')}
        {okvir && aktiven(5) && (urejamKorak === 5 ? (
          <form className="np-chat-vnos" onSubmit={event => { event.preventDefault(); potrdiKorak(false); }}>
            <textarea className="np-chat-polje" value={obrazec.ciljnaSkupina} onChange={event => { rastiTextarea(event.currentTarget); setObrazec(o => ({ ...o, ciljnaSkupina: event.target.value })); }} placeholder="Kdo + starost, kaj uporabljajo, pain points, potrebe, cilji in kanali …" rows={5} aria-label="Ciljna skupina / persona" />
            <button type="submit" className="np-chat-naprej">Shrani <ArrowRight size={15} weight="bold" aria-hidden /></button>
          </form>
        ) : (
          <div className="np-persona">
            {PERSONA_VPR.map((pv, i) => i > pKorak ? null : (
              <div key={pv.k} className="np-persona-vpr">
                {chatBot(pv.q, i === pKorak ? pv.ph : undefined)}
                {i < pKorak
                  ? <div className="np-chat-jaz"><span className="np-chat-mehur-ured"><span>{obrazec.persona[pv.k].trim() || '—'}</span></span></div>
                  : (
                    <form className="np-chat-vnos" onSubmit={event => { event.preventDefault(); naprejPersona(); }}>
                      <textarea className="np-chat-polje" value={obrazec.persona[pv.k]} onChange={event => setPersona(pv.k, event.target.value)} placeholder={pv.ph} rows={2} aria-label={pv.q} />
                      <div className="np-persona-akcije">
                        {i === 0 && <button type="button" className="np-preskoci" onClick={preskociPersono}>Preskoči persono</button>}
                        <button type="submit" className="np-chat-naprej">Naprej <ArrowRight size={15} weight="bold" aria-hidden /></button>
                      </div>
                    </form>
                  )}
              </div>
            ))}
          </div>
        ))}

        {/* 6 · želje glede dizajna */}
        {okvir && prikazan(6) && chatBot('Kakšne so želje glede dizajna?', 'Barve, stil, reference.', 6)}
        {okvir && odgovorjen(6) && chatOdgovor(6, obrazec.dizajnZelje.trim() || 'Brez posebnih želja')}
        {okvir && aktiven(6) && (
          <form className="np-chat-vnos" onSubmit={event => { event.preventDefault(); potrdiKorak(urejamKorak !== 6); }}>
            <textarea className="np-chat-polje" value={obrazec.dizajnZelje} onChange={event => { rastiTextarea(event.currentTarget); setObrazec(o => ({ ...o, dizajnZelje: event.target.value })); }} placeholder="Npr. toplo-nevtralna paleta, minimalizem, reference: …" rows={3} aria-label="Želje glede dizajna" />
            <button type="submit" className="np-chat-naprej">{urejamKorak === 6 ? 'Shrani' : 'Naprej'} <ArrowRight size={15} weight="bold" aria-hidden /></button>
          </form>
        )}

        {/* 7 · voice / ton komunikacije */}
        {okvir && prikazan(7) && chatBot('Voice / ton komunikacije?', undefined, 7)}
        {okvir && odgovorjen(7) && chatOdgovor(7, obrazec.voice.trim() || 'Ni določen')}
        {okvir && aktiven(7) && (
          <form className="np-chat-vnos" onSubmit={event => { event.preventDefault(); potrdiKorak(urejamKorak !== 7); }}>
            <textarea className="np-chat-polje" value={obrazec.voice} onChange={event => setObrazec(o => ({ ...o, voice: event.target.value }))} placeholder="Npr. neposreden, prijazen, brez korporativnega žargona …" rows={3} aria-label="Voice / ton komunikacije" />
            <button type="submit" className="np-chat-naprej">{urejamKorak === 7 ? 'Shrani' : 'Naprej'} <ArrowRight size={15} weight="bold" aria-hidden /></button>
          </form>
        )}

        {/* 8 · konkurenca */}
        {okvir && prikazan(8) && chatBot('Kdo je konkurenca?', 'Kdo so, kaj jim je všeč in kaj ne.', 8)}
        {okvir && odgovorjen(8) && chatOdgovor(8, obrazec.konkurenca.trim() || 'Ni podatka')}
        {okvir && aktiven(8) && (
          <form className="np-chat-vnos" onSubmit={event => { event.preventDefault(); potrdiKorak(urejamKorak !== 8); }}>
            <textarea className="np-chat-polje" value={obrazec.konkurenca} onChange={event => setObrazec(o => ({ ...o, konkurenca: event.target.value }))} placeholder="Npr. XY d.o.o. — všeč jim je hitrost, ne mara jih cena …" rows={3} aria-label="Konkurenca" />
            <button type="submit" className="np-chat-naprej">{urejamKorak === 8 ? 'Shrani' : 'Naprej'} <ArrowRight size={15} weight="bold" aria-hidden /></button>
          </form>
        )}

        {/* Zlozena vrstica: marketinski okvir — isti vzorec kot "Dodaj podatke
            podjetja" v kalkulatorju (plus, naslov, pripis; DESIGN.md 13d). */}
        {prikazan(9) && (
          <button type="button" className="np-okvir-vec" aria-expanded={podrobnostiOdprte}
            onClick={() => setPodrobnostiOdprte(o => !o)}>
            <span className="np-okvir-vec-glava"><span aria-hidden>{podrobnostiOdprte ? '−' : '+'}</span>
              {podrobnostiOdprte ? 'Skrij podrobnosti projekta' : 'Dodaj podrobnosti projekta'}
              <CaretDown size={14} weight="bold" className="np-okvir-caret" style={podrobnostiOdprte ? { transform: 'rotate(180deg)' } : undefined} aria-hidden /></span>
            {!podrobnostiOdprte && <small>Cilji, stranka, ciljna skupina, videz in ton.</small>}
          </button>
        )}
        {prikazan(9) && podrobnostiOdprte && (
          /* INLINE obrazec (kot "Dodaj podatke podjetja"): odpre se NA MESTU,
             pogovor z rokom in statusom tece naprej nemoteno — klik prej je
             uporabnico vrgel nazaj na cilje in ji "izgubil" rok (Tina). */
          <div className="np-podrobnosti">
            <p className="np-pod-naslov">Cilji in brief</p>
            <button type="button" className="np-pupa-predlog" onClick={pupaPredlaga} disabled={pupaPolni}>
              ✨ {pupaPolni ? 'Pupa razmišlja …' : 'Ne veš, kaj bi? Naj Pupa predlaga'}
            </button>
            {pupaNapaka && <p className="np-pupa-napaka">{pupaNapaka}</p>}
            <label className="np-pod-polje"><span>Kaj mora projekt doseči?</span>
              {obrazec.cilji.map(cilj => (
                <div key={cilj.id} className="np-nov-cilj">
                  <input type="text" value={cilj.besedilo} onChange={event => posodobiCilj(cilj.id, { besedilo: event.target.value })} placeholder="npr. nova podoba do septembra" />
                  <input type="text" value={cilj.tarca || ''} onChange={event => posodobiCilj(cilj.id, { tarca: event.target.value })} placeholder="merilo, npr. 800 € ali 3 objave" />
                  <button type="button" className="np-link-brisi" onClick={() => odstraniCilj(cilj.id)} aria-label="Odstrani cilj">×</button>
                </div>
              ))}
              <button type="button" className="np-nov-dodaj-cilj" onClick={dodajCilj}>+ Dodaj cilj</button>
            </label>
            <label className="np-pod-polje"><span>Kaj počne stranka?</span>
              <textarea value={obrazec.opisStranke} onChange={event => setObrazec(o => ({ ...o, opisStranke: event.target.value }))} placeholder="Njena dejavnost, izdelki ali storitve in komu prodaja …" /></label>
            <label className="np-pod-polje"><span>V kateri panogi je stranka?</span>
              <input type="text" value={obrazec.panoga} onChange={event => setObrazec(o => ({ ...o, panoga: event.target.value }))} placeholder="npr. gostinstvo, kozmetika, gradbeništvo …" /></label>
            <label className="np-pod-polje"><span>Koga mora projekt nagovoriti?</span>
              <textarea value={obrazec.ciljnaSkupina} onChange={event => setObrazec(o => ({ ...o, ciljnaSkupina: event.target.value }))} placeholder="Kdo so ti ljudje, kaj jih muči in kje jih dosežeš …" /></label>
            <label className="np-pod-polje"><span>Kakšen videz si stranka želi?</span>
              <textarea value={obrazec.dizajnZelje} onChange={event => setObrazec(o => ({ ...o, dizajnZelje: event.target.value }))} placeholder="Slog, barve, reference — in česa noče …" /></label>
            <label className="np-pod-polje"><span>Kako naj zveni komunikacija?</span>
              <input type="text" value={obrazec.voice} onChange={event => setObrazec(o => ({ ...o, voice: event.target.value }))} placeholder="npr. toplo in osebno · strokovno · hudomušno …" /></label>
            <label className="np-pod-polje"><span>Kdo je konkurenca?</span>
              <input type="text" value={obrazec.konkurenca} onChange={event => setObrazec(o => ({ ...o, konkurenca: event.target.value }))} placeholder="Imena — in kaj naj stranko loči od njih …" /></label>
            <label className="np-pod-polje"><span>Več podrobnosti</span>
              <textarea value={obrazec.podrobnosti || ''} onChange={event => { rastiTextarea(event.currentTarget); setObrazec(o => ({ ...o, podrobnosti: event.target.value })); }} placeholder="Karkoli še šteje — obseg, roki po fazah, posebnosti, dogovori …" /></label>
          </div>
        )}

        {/* 9 · začetek/rok */}
        {prikazan(9) && !podrobnostiPotrjene && (
          <div className="np-chat-vnos">
            <button type="button" className="np-chat-naprej" onClick={() => setPodrobnostiPotrjene(true)}>Naprej <ArrowRight size={15} weight="bold" aria-hidden /></button>
          </div>
        )}

        {podrobnostiPotrjene && prikazan(9) && chatBot('Kdaj začneš in do kdaj?', undefined, 9)}
        {podrobnostiPotrjene && odgovorjen(9) && chatOdgovor(9, [obrazec.zacetek && datStr(obrazec.zacetek), obrazec.rok && `do ${datStr(obrazec.rok)}`].filter(Boolean).join(' ') || 'Ni določeno')}
        {podrobnostiPotrjene && aktiven(9) && (
          <form className="np-chat-vnos" onSubmit={event => { event.preventDefault(); potrdiKorak(urejamKorak !== 9); }}>
            <div className="np-nov-mreza">
              <label className="np-nov-polje"><span>Začetek</span><input type="date" value={obrazec.zacetek} onChange={event => setObrazec(o => ({ ...o, zacetek: event.target.value }))} /></label>
              <label className="np-nov-polje"><span>Predviden rok</span><input type="date" value={obrazec.rok} onChange={event => setObrazec(o => ({ ...o, rok: event.target.value }))} /></label>
            </div>
            <button type="submit" className="np-chat-naprej">{urejamKorak === 9 ? 'Shrani' : 'Naprej'} <ArrowRight size={15} weight="bold" aria-hidden /></button>
          </form>
        )}

        {/* 10 · status — izbira takoj potrdi in gre naprej (kot binarna izbira v ponudbi) */}
        {prikazan(10) && chatBot('Kakšen je status projekta?', undefined, 10)}
        {odgovorjen(10) && chatOdgovor(10, projektStatusOznaka[obrazec.status])}
        {aktiven(10) && (
          <div className="np-chat-izbire">
            {(['aktiven', 'pavza', 'koncan'] as ProjektStatus[]).map((s, i) => (
              <button key={s} type="button" className="np-chat-opcija" onClick={() => { setObrazec(o => ({ ...o, status: s })); potrdiKorak(true); }}>
                <span className="np-crk">{String.fromCharCode(65 + i)}</span><b>{projektStatusOznaka[s]}</b>
              </button>
            ))}
          </div>
        )}

        {/* po osnovnih vprašanjih: moja lastna vprašanja + povezave + ekipa + zaključek —
            vse na isti neprekinjeni površini, brez nadaljnjega gating-a (izpolniš, kolikor želiš) */}
        {novKorak >= 11 && (<>
          {prikazan(11) && !vprasanjaOdprta && !obrazec.dodatnaVprasanja.length && (
            <button type="button" className="np-okvir-vec" onClick={() => setVprasanjaOdprta(true)}>
              <span className="np-okvir-vec-glava"><span aria-hidden>+</span>Dodaj svoja vprašanja<CaretDown size={14} weight="bold" className="np-okvir-caret" aria-hidden /></span>
              <small>Npr. »Ima stranka že CGP?« — vprašanje in odgovor si zapišeš sama.</small>
            </button>
          )}
          {prikazan(11) && (vprasanjaOdprta || obrazec.dodatnaVprasanja.length > 0) && <>
          {chatBot('Tvoja vprašanja.', 'Vprašanje in odgovor si zapišeš sama.')}
          <div className="np-chat-vnos">
            {obrazec.dodatnaVprasanja.map(v => (
              <div key={v.id} className="np-vprasanje-vrstica">
                <div><b>{v.vprasanje}</b><span>{v.odgovor}</span></div>
                <button type="button" className="np-link-brisi" onClick={() => odstraniVprasanje(v.id)} aria-label="Odstrani vprašanje">×</button>
              </div>
            ))}
            <div className="np-link-obrazec">
              <textarea rows={1} value={novoVprasanje.vprasanje} onChange={event => { rastiTextarea(event.currentTarget); setNovoVprasanje(v => ({ ...v, vprasanje: event.target.value })); }} placeholder="Vprašanje, npr. Ima stranka že CGP?" aria-label="Vprašanje" />
              <textarea rows={1} value={novoVprasanje.odgovor} onChange={event => { rastiTextarea(event.currentTarget); setNovoVprasanje(v => ({ ...v, odgovor: event.target.value })); }} placeholder="Odgovor" aria-label="Odgovor" />
              <button type="button" className="np-link-dodaj" onClick={dodajVprasanje} disabled={!novoVprasanje.vprasanje.trim() || !novoVprasanje.odgovor.trim()}>+ Dodaj vprašanje</button>
            </div>
          </div>
          </>}

          {novKorak === 11 && (
            <div className="np-chat-vnos">
              <button type="button" className="np-chat-naprej" onClick={() => potrdiKorak(true)}>Naprej <ArrowRight size={15} weight="bold" aria-hidden /></button>
            </div>
          )}

          {prikazan(12) && <>
          {chatBot('Deli povezave do gradiv.', 'Figma, Miro, Drive … naslov + URL.')}
          <div className="np-chat-vnos">
            {obrazec.povezave.length > 0 && (
              <div className="np-linki">
                {obrazec.povezave.map(p => (
                  <div key={p.id} className="np-link-vrstica"><a href={p.url} target="_blank" rel="noopener noreferrer">{p.naslov}</a><button type="button" className="np-link-brisi" onClick={() => odstraniPovezavo(p.id)} aria-label={`Izbriši povezavo ${p.naslov}`}>×</button></div>
                ))}
              </div>
            )}
            <div className="np-link-obrazec">
              <input type="text" value={povezavaNaslov} onChange={event => setPovezavaNaslov(event.target.value)} placeholder="npr. Figma" aria-label="Oznaka povezave" />
              <input type="url" value={povezavaUrl} onChange={event => setPovezavaUrl(event.target.value)} placeholder="https://…" aria-label="Naslov povezave" />
              <button type="button" className="np-link-dodaj" onClick={dodajPovezavo} disabled={!povezavaNaslov.trim() || !povezavaUrl.trim()}>+ Dodaj povezavo</button>
            </div>
          </div>
          </>}
          {novKorak === 12 && (
            <div className="np-chat-vnos">
              <button type="button" className="np-chat-naprej" onClick={() => potrdiKorak(true)}>Naprej <ArrowRight size={15} weight="bold" aria-hidden /></button>
            </div>
          )}


          {prikazan(13) && <>
          {chatBot('Dodaj sodelavce.', 'Klikni osebo, da jo dodeliš — »Deli projekt« ji pošlje vabilo.')}
          <div className="np-chat-vnos">
            <div className="np-chat-sodelavci">
              {sodelavci.map(s => {
                const on = obrazec.dodeljeni.includes(s.id);
                const initials = s.ime.split(' ').map(d => d[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
                return (
                  <button key={s.id} type="button" className={'np-chat-sodelavec' + (on ? ' on' : '')} onClick={() => preklopiDodeljen(s.id)}>
                    <span className="np-chat-sod-krog" aria-hidden>{initials}</span>
                    <span><b>{s.ime}</b><small>{vlogaOznaka(s.vloga)}</small></span>
                  </button>
                );
              })}
            </div>
            <button type="button" className="np-chat-deli" onClick={deliProjekt} disabled={!obrazec.dodeljeni.length}>Deli projekt ↗</button>
          </div>

          <div className="np-akcije">
            <button type="button" className="np-gumb" onClick={shraniNovProjekt} disabled={!obrazec.naslov.trim()}>{urejam ? 'Shrani spremembe' : 'Ustvari projekt'}</button>
            <Link className="np-gumb sek" href={`${base}/kalkulator/projekti`}>Prekliči</Link>
          </div>
          </>}
        </>)}
      </div>
    </div>
    {/* spodnji "zracni" prostor POD chatom (izven .np-vstop, torej ne vpliva na njeno
        justify-content:center centriranje prvega/kratkega vprasanja) — brez njega
        scrollIntoView({block:'center'}) ne more dvigniti ZADNJEGA/najnovejsega
        vprasanja na sredino, ker pod njim v strani ni prostora za skrolanje navzdol */}
    <div className="np-chat-prostor" aria-hidden />

    {/* stili kot pogodbe/računi: navaden <style> (globalno), zato np- predpona povsod */}
    <style dangerouslySetInnerHTML={{ __html: `
      .np{min-width:0}
      .np-stolpec{width:100%;max-width:720px;margin:0 auto}
      /* enotno vedenje kot Ponudba (KalkulatorApp .uvod-oder): prvo vprasanje chata
         je navpicno na sredini vidnega polja, nato ob rasti pogovora (vsak naslednji
         korak) naravno odteka navzgor in stran se skrola. 8.25rem = FlowTopBar
         (3.25rem) + .workspace padding zgoraj/spodaj (3rem+2rem). */
      .np-stolpec.np-vstop{min-height:calc(100dvh - 8.25rem);display:flex;flex-direction:column;justify-content:center}
      @media (max-width:980px){.np-stolpec.np-vstop{min-height:calc(100dvh - 13rem)}}
      /* glej opombo ob renderju: prazen prostor POD .np-vstop, da ima zadnje/aktivno
         vprasanje kam "zrasti" navzgor v sredino vidnega polja (scrollIntoView) */
      .np-chat-prostor{height:55vh}
      @media (max-width:640px){.np-chat-prostor{height:45vh}}
      .np-kicker{font-size:.78rem;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:var(--accent,#B25476);margin:0 0 .3rem}
      .np-h1{font-family:var(--font-serif),Didot,serif;font-weight:500;font-size:clamp(1.7rem,3.4vw,2.4rem);line-height:1;letter-spacing:-.012em;margin:0 0 2rem;color:var(--ink)}

      .np-chat-tok{display:flex;flex-direction:column;gap:1.1rem}
      @keyframes npChatIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
      .np-chat-bot,.np-chat-jaz,.np-chat-izbire,.np-chat-vnos{animation:npChatIn .38s cubic-bezier(.16,1,.3,1) both}
      @media (prefers-reduced-motion:reduce){.np-chat-bot,.np-chat-jaz,.np-chat-izbire,.np-chat-vnos{animation:none}}
      /* mehurcek bota: violet-mehka pika (isti "Pinart mehurcek" jezik kot ostali chat) + oblacek levo poravnan */
      .np-chat-bot{display:flex;max-width:94%}
      .np-chat-bot .np-chat-mehur{position:relative;padding:.9rem 1.2rem .9rem 2.6rem;border-radius:18px;border-top-left-radius:6px;background:oklch(96% .012 297);border:none;font-size:.92rem;line-height:1.5}
      .np-chat-bot .np-chat-mehur::before{content:'';position:absolute;left:.85rem;top:1rem;width:1.2rem;height:1.2rem;border-radius:50%;background:radial-gradient(58% 48% at 30% 24%,rgba(255,255,255,.92),rgba(255,255,255,0) 62%),conic-gradient(from 210deg,#7C3AED,#EC4899,#F59E0B,#38BDF8,#7C3AED);box-shadow:0 2px 6px rgba(124,58,237,.28)}
      .np-chat-bot .np-chat-mehur b{display:block;font-weight:700;color:var(--ink)}
      .np-chat-bot .np-chat-mehur small{display:block;margin-top:.2rem;font-weight:400;font-size:.82rem;color:color-mix(in oklch,var(--ink) 62%,transparent)}
      /* moj odgovor: mint mehurcek, desno poravnan, klikljiv (odpre urejanje v mestu) */
      .np-chat-jaz{align-self:flex-end;max-width:94%}
      .np-chat-mehur-ured{display:inline-flex;align-items:center;gap:.55rem;padding:.75rem 1.1rem;border-radius:18px;border-top-right-radius:6px;background:oklch(90% .055 190);border:none;color:var(--ink);font:inherit;font-size:.86rem;font-weight:600;text-align:left;cursor:pointer;transition:transform .15s,box-shadow .15s}
      .np-chat-mehur-ured:hover{transform:translateY(-1px);box-shadow:0 7px 18px rgba(40,25,40,.13)}
      .np-chat-mehur-ured svg{opacity:.4;flex:none;transition:opacity .15s}
      .np-chat-mehur-ured:hover svg{opacity:.85}
      /* vnosno polje pod vprasanjem bota — zamaknjeno pod mehurcek, "Naprej" pilula z ink ozadjem */
      .np-chat-vnos{display:flex;flex-direction:column;align-items:flex-start;gap:.65rem;width:min(34rem,calc(100% - 1rem));max-width:calc(100% - 1rem);margin:-.2rem 0 0 .3rem}
      .np-chat-polje{width:100%;box-sizing:border-box;padding:.75rem 1.1rem;border:1px solid rgba(17,17,17,.14);border-radius:999px;background:#fff;font:inherit;font-size:.9rem;font-weight:600;color:var(--ink);box-shadow:0 4px 14px rgba(40,25,40,.05);outline:none}
      textarea.np-chat-polje{border-radius:1rem;resize:vertical;min-height:5rem;font-weight:400;line-height:1.5;font-family:inherit}
      select.np-chat-polje{cursor:pointer}
      /* poteg iz ponudbe — mirna kartica nad prvim vprasanjem */
      .np-poteg{margin:0 0 1.6rem;padding:1rem 1.15rem;border:1px dashed rgba(17,17,17,.16);border-radius:1rem;background:rgba(255,255,255,.55);display:flex;flex-direction:column;gap:.5rem}
      .np-poteg-naslov{margin:0;font-size:.95rem;font-weight:700;color:var(--ink)}
      .np-poteg-pod{margin:0;font-size:.82rem;color:rgba(17,17,17,.6);line-height:1.45}
      .np-chat-polje:focus{border-color:color-mix(in oklch,var(--ink) 45%,transparent)}
      .np-chat-naprej{align-self:flex-start;display:inline-flex;align-items:center;gap:.45rem;padding:.95rem 2.2rem;border:0;border-radius:999px;background:var(--ink);color:var(--paper);font:600 .82rem var(--font-sans),sans-serif;letter-spacing:.14em;text-transform:uppercase;cursor:pointer;transition:transform .2s ease,box-shadow .2s ease}
      .np-chat-naprej:disabled{opacity:.45;cursor:not-allowed}
      .np-chat-naprej:hover:not(:disabled){background:color-mix(in oklch,var(--ink) 82%,transparent)}
      .np-persona{display:flex;flex-direction:column;gap:.9rem}
      .np-persona-vpr{display:flex;flex-direction:column;gap:.5rem}
      .np-persona-akcije{display:flex;align-items:center;gap:1rem;flex-wrap:wrap}
      .np-preskoci{background:none;border:0;padding:0;color:var(--muted);font:600 .78rem var(--font-sans),sans-serif;text-decoration:underline;text-underline-offset:.2em;cursor:pointer}
      .np-preskoci:hover{color:var(--ink)}
      /* izbirne kartice (status) — pod vprasanjem bota, klik takoj potrdi in gre naprej */
      .np-chat-izbire{display:flex;flex-direction:column;gap:.55rem;margin:-.2rem 0 0 .3rem}
      /* ISTI dizajn kot "Dodaj podatke podjetja" v kalkulatorju (uv-vec):
         naslov v barvi poudarka s plusom, kazalec desno, pripis pod njim.
         (Tina, 25. 8.: "premalo vidno in enak dizajn kot pri kalkulatorju") */
      .np-okvir-vec{display:flex;flex-direction:column;align-items:flex-start;gap:.25rem;
        width:min(34rem,calc(100% - 1rem));margin:-.1rem 0 .35rem .3rem;padding:.75rem .95rem;
        border:1px dashed rgba(17,17,17,.3);border-radius:12px;background:#fff;cursor:pointer;font:inherit;
        text-align:left;box-shadow:0 4px 14px rgba(40,25,40,.05);transition:border-color .15s ease}
      .np-okvir-vec:hover{border-color:rgba(17,17,17,.35)}
      /* naslov v ISTI velikosti kot chat vprasanja (Tina: "poglej kok je
         vprasanje veliko") — vrstica je korak pogovora, ne drobna opomba */
      .np-okvir-vec-glava{width:100%;display:flex;gap:.5rem;align-items:center;
        color:#7C3AED;font-weight:700;font-size:1.02rem}
      .np-okvir-vec-glava>span[aria-hidden]{font-size:1.05rem;line-height:1}
      .np-okvir-caret{margin-left:auto;color:#7C3AED}
      .np-okvir-vec small{font-size:.84rem;font-weight:500;color:rgba(17,17,17,.7);line-height:1.45}
      .np-podrobnosti{display:grid;gap:.8rem;width:min(34rem,calc(100% - 1rem));
        margin:-.1rem 0 .4rem .3rem;padding:1rem .95rem;
        border:1px solid var(--line);border-radius:12px;background:#fff}
      .np-pod-naslov{margin:0 0 -.2rem;font:700 .76rem var(--font-sans),sans-serif;
        letter-spacing:.15em;text-transform:uppercase;color:rgba(17,17,17,.55)}
      .np-pupa-predlog{justify-self:start;padding:.5rem .9rem;border:1px solid rgba(124,58,237,.4);
        border-radius:999px;background:oklch(97.5% .025 297);color:#7C3AED;cursor:pointer;
        font:650 .8rem var(--font-sans),sans-serif;transition:border-color .15s ease}
      .np-pupa-predlog:hover{border-color:#7C3AED}
      .np-pupa-predlog:disabled{opacity:.6;cursor:progress}
      .np-pupa-napaka{margin:-.3rem 0 0;font-size:.78rem;color:oklch(52% .19 25)}
      .np-pod-polje{display:grid;gap:.35rem;font-weight:700;font-size:.8rem}
      .np-pod-polje input,.np-pod-polje textarea{width:100%;box-sizing:border-box;padding:.6rem .75rem;
        border:1px solid var(--line);border-radius:.6rem;background:#fff;font:inherit;font-size:.88rem;font-weight:500}
      /* textarea raste z vsebino, brez drsnikov (Tina, 25. 8.) — field-sizing
         za novejse brskalnike, JS fallback (npRastiTextarea) za Safari */
      .np-pod-polje textarea{min-height:4.2rem;resize:none;overflow:hidden;field-sizing:content}
      .np-ime-ovoj{position:relative;display:block;width:100%}
      .np-ime-ovoj .np-ime-vnos{position:relative;background:transparent;z-index:1}
      .np-ime-duh{position:absolute;inset:0;z-index:0;display:flex;align-items:center;
        padding:.75rem 1.1rem;border:1px solid transparent;border-radius:999px;background:#fff;
        font:inherit;font-size:.9rem;font-weight:600;white-space:pre;overflow:hidden;pointer-events:none}
      .np-ime-duh i{font-style:normal;color:transparent}
      .np-ime-duh em{font-style:normal;color:rgba(17,17,17,.38)}
      .np-ime-opomba{margin:-.25rem 0 0 .3rem;max-width:min(34rem,calc(100% - 1rem));
        font-size:.8rem;font-weight:600;color:#7C3AED;line-height:1.45}
      .np-okvir-vec small{font-size:.74rem;font-weight:500;color:rgba(17,17,17,.66);line-height:1.4}
      .np-chat-opcija{display:flex;align-items:center;gap:.8rem;width:min(380px,100%);padding:.8rem 1rem;border:1px solid var(--line);border-radius:14px;background:oklch(99% .006 87 / .85);font:inherit;color:var(--ink);text-align:left;cursor:pointer;transition:transform .18s,border-color .18s,box-shadow .18s}
      .np-chat-opcija:hover{transform:translateY(-2px);border-color:color-mix(in oklch,var(--ink) 28%,transparent);box-shadow:0 8px 20px rgba(40,25,40,.08)}
      .np-crk{display:grid;place-items:center;width:1.8rem;height:1.8rem;border-radius:8px;background:oklch(94% .045 295);color:var(--ink);font-weight:800;font-size:.78rem;flex:none}

      .np-nov-mreza{display:grid;grid-template-columns:1fr 1fr;gap:.7rem}
      .np-nov-polje{display:flex;flex-direction:column;gap:.35rem;min-width:0}
      .np-nov-polje span{font-size:.7rem;font-weight:700;color:var(--muted)}
      .np-nov-polje input{width:100%;box-sizing:border-box;padding:.65rem .8rem;border:1px solid var(--line);border-radius:.7rem;background:oklch(100% 0 0 / .7);font:inherit;font-size:.85rem;color:var(--ink)}
      .np-nov-cilj{display:grid;grid-template-columns:1.4fr 1fr 1fr auto;align-items:center;gap:.45rem}
      /* v inline obrazcu podrobnosti: dve polji (cilj, tarca) cez celo sirino,
         enako dolgi, brisanje ob koncu (Tina, 25. 8.: tarca se je odrezala) */
      .np-podrobnosti .np-nov-cilj{grid-template-columns:minmax(0,1fr) minmax(0,1fr) auto;width:100%}
      .np-podrobnosti .np-nov-cilj input{width:100%;box-sizing:border-box;min-width:0}
      .np-nov-cilj input,.np-nov-cilj select{box-sizing:border-box;padding:.6rem .7rem;border:1px solid var(--line);border-radius:.6rem;background:oklch(100% 0 0 / .7);font:inherit;font-size:.78rem;color:var(--ink);min-width:0}
      .np-nov-cilj select{appearance:none;-webkit-appearance:none;cursor:pointer;padding-right:1.5rem;background-color:oklch(100% 0 0 / .7);background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236E4FA6' stroke-width='2.8' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right .5rem center}
      .np-nov-dodaj-cilj{align-self:start;margin-top:.1rem;padding:.55rem .9rem;border:1px dashed color-mix(in oklch,var(--ink) 28%,transparent);border-radius:.7rem;background:transparent;font:700 .7rem var(--font-sans),sans-serif;color:var(--ink);cursor:pointer}
      .np-nov-dodaj-cilj:hover{background:oklch(100% 0 0 / .5)}

      .np-link-brisi{flex:none;display:grid;place-items:center;width:1.6rem;height:1.6rem;padding:0;border:1px solid var(--line);border-radius:50%;background:transparent;color:var(--muted);font-size:.9rem;line-height:1;cursor:pointer}
      .np-link-brisi:hover{background:var(--ink);color:var(--paper)}
      .np-vprasanje-vrstica{display:flex;align-items:flex-start;justify-content:space-between;gap:.6rem;padding:.65rem .8rem;border:1px solid var(--line);border-radius:.8rem;background:oklch(100% 0 0 / .55)}
      .np-vprasanje-vrstica div{display:flex;flex-direction:column;gap:.15rem;min-width:0}
      .np-vprasanje-vrstica b{font-size:.8rem;color:var(--ink);font-weight:700}
      .np-vprasanje-vrstica span{font-size:.76rem;color:color-mix(in oklch,var(--ink) 62%,transparent)}
      /* Polja cez SIRINO pogovora, ne ozka (Tina, 25. 8.: "teli inputi so
         prekratki") — vnos vprasanj in povezav dobi isto sirino kot mehurcki. */
      .np-link-obrazec{display:grid;grid-template-columns:1fr;gap:.5rem;margin-top:.2rem;width:100%}
      .np-link-obrazec input,.np-link-obrazec textarea{padding:.6rem .75rem;border:1px solid var(--line);border-radius:.6rem;background:oklch(100% 0 0 / .7);font:inherit;font-size:.8rem;color:var(--ink);min-width:0}
      /* polje raste z besedilom — dolgo vprasanje se je odrezalo (Tina) */
      .np-link-obrazec textarea{resize:none;overflow:hidden;field-sizing:content;min-height:2.4rem;line-height:1.45}
      /* crtkan "dodaj" kot pri ciljih (DESIGN 13e) — crn polni gumb je izgledal
         kot glavno dejanje, ceprav je le dodajanje vrstice (Tina) */
      .np-link-dodaj{flex:none;padding:.55rem .9rem;border:1px dashed color-mix(in oklch,var(--ink) 28%,transparent);border-radius:.7rem;background:transparent;color:var(--ink);font:700 .74rem var(--font-sans),sans-serif;cursor:pointer}
      .np-link-dodaj:hover{border-color:var(--ink)}
      .np-link-dodaj:disabled{opacity:.45;cursor:default}
      .np-link-dodaj:disabled{opacity:.5;cursor:not-allowed}
      .np-linki{display:flex;flex-direction:column;gap:.45rem}
      .np-link-vrstica{display:flex;align-items:center;gap:.5rem;padding:.55rem .7rem;border:1px solid var(--line);border-radius:.7rem;background:oklch(100% 0 0 / .55)}
      .np-link-vrstica a{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--ink);font-weight:700;font-size:.78rem;text-decoration:none}
      .np-link-vrstica a:hover{text-decoration:underline}

      .np-chat-sodelavci{display:flex;flex-wrap:wrap;gap:.55rem}
      .np-chat-sodelavec{display:flex;align-items:center;gap:.6rem;padding:.55rem .9rem .55rem .55rem;border:1px solid var(--line);border-radius:999px;background:oklch(99% .006 87 / .85);font:inherit;color:var(--ink);cursor:pointer;transition:border-color .16s,background .16s}
      /* ime in vloga desno poravnana ob krogu (Tina, 25. 8.) */
      .np-chat-sodelavec>span:last-child{margin-left:auto;text-align:right}
      .np-chat-sodelavec b{display:block;font-size:.78rem;font-weight:700}
      .np-chat-sodelavec small{display:block;color:color-mix(in oklch,var(--ink) 55%,transparent);font-size:.64rem}
      .np-chat-sod-krog{display:grid;place-items:center;width:1.8rem;height:1.8rem;border-radius:50%;background:oklch(90% .045 297);color:oklch(40% .16 297);font-size:.64rem;font-weight:800;flex:none}
      .np-chat-sodelavec.on{border-color:oklch(84% .05 165);background:oklch(93% .04 165)}
      .np-chat-sodelavec.on .np-chat-sod-krog{background:var(--ink);color:var(--paper)}
      .np-chat-deli{align-self:flex-start;display:inline-flex;align-items:center;gap:.4rem;margin-top:.2rem;padding:.6rem .95rem;border:1px solid var(--ink);border-radius:999px;background:transparent;color:var(--ink);font:700 .74rem var(--font-sans),sans-serif;cursor:pointer}
      .np-chat-deli:hover:not(:disabled){background:var(--ink);color:var(--paper)}
      .np-chat-deli:disabled{opacity:.45;cursor:not-allowed}

      .np-akcije{display:flex;flex-wrap:wrap;align-items:center;gap:.9rem;margin-top:1.6rem;padding-top:1.5rem;border-top:1px solid var(--line)}
      .np-gumb{position:relative;display:inline-flex;align-items:center;gap:.5rem;border:none;border-radius:999px;padding:.85rem 1.7rem;font:inherit;font-weight:600;font-size:.95rem;cursor:pointer;background:var(--ink);color:var(--paper);text-decoration:none;transition:transform .2s,opacity .2s}
      .np-gumb:hover{transform:translateY(-2px)}
      .np-gumb:disabled{opacity:.5;cursor:default;transform:none}
      .np-gumb.sek{background:transparent;color:var(--ink);border:1px solid rgba(17,17,17,.28)}

      @media (max-width:640px){
        /* enak, uskladen rob (workspace .35 + 1.06 = 1.41rem), enak levo/desno */
        .np-stolpec{padding-left:1.06rem;padding-right:1.06rem;box-sizing:border-box}
        .np-nov-mreza{grid-template-columns:1fr}
        .np-nov-cilj{grid-template-columns:1fr;gap:.35rem;padding:.65rem;border:1px solid var(--line);border-radius:.7rem}
        .np-chat-vnos,.np-chat-izbire{margin-left:0}
        .np-chat-bot,.np-chat-jaz{max-width:100%}
      }
    ` }} />
  </div>;
}
