'use client';

/* TASK MANAGER (Kanban) — logika (data model, dodaj/izbriši, drag&drop) po Geminijevi
   specifikaciji (lib/naloge.ts), JSX + videz rekonstruirana v Pinart slogu (kremno,
   Bodoni, ink, akcent). Lasten prefiksiran <style> blok (tm-), da ne trči s .shell. */

import React, { useState, useEffect } from 'react';
import { Pause, Play, ChartBar, ChatCircleDots, CaretLeft, CaretRight, Buildings, Circle, CheckCircle, UserPlus } from '@phosphor-icons/react';
import {
  Naloga,
  NalogaStolpec,
  NalogaKomentar,
  NalogaPodopravilo,
  preberiNaloge,
  shraniNaloge,
  Sodelavec,
  UporabniskaVloga,
  ZACETNI_SODELAVCI,
  ZgodovinaAktivnosti,
  preberiZgodovino,
  zabeleziAktivnost,
  TedenskaDodelitev,
  preberiDodelitve,
  shraniDodelitev,
  izbrisiDodelitev,
} from '@/lib/naloge';
import { preberiSodelavci, shraniSodelavci } from '@/lib/sodelavci';
import { loadFlowData, type FlowClient } from '@/lib/pinartFlowStore';
import { Podrocje, preberiPodrocja, dodajPodrocje, izbrisiPodrocje } from '@/lib/podrocja';
import { Oddelek, preberiOddelki, shraniOddelki, dodajOddelek, izbrisiOddelek } from '@/lib/oddelki';
import { usePredogled } from '@/lib/predogled';

const STOLPCI: { id: NalogaStolpec; naziv: string }[] = [
  { id: 'todo', naziv: 'Za narediti' },
  { id: 'in_progress', naziv: 'V teku' },
  { id: 'waiting', naziv: 'Čaka' },
  { id: 'done', naziv: 'Končano' },
];

const PRIORITETE: { id: NonNullable<Naloga['prioriteta']>; naziv: string }[] = [
  { id: 'visoka', naziv: 'Visoka' },
  { id: 'srednja', naziv: 'Srednja' },
  { id: 'nizka', naziv: 'Nizka' },
];

/* vrstni red za razvrscanje kartic v stolpcu: visoka prioriteta na vrh */
const PRIO_RED: Record<string, number> = { visoka: 0, srednja: 1, nizka: 2 };

const STATUSI_DODELITVE: { id: NonNullable<TedenskaDodelitev['status']>; naziv: string }[] = [
  { id: 'nacrtovano', naziv: 'Načrtovano' },
  { id: 'opravljeno', naziv: 'Opravljeno' },
  { id: 'delno', naziv: 'Delno' },
  { id: 'preneseno', naziv: 'Preneseno' },
];

const OBDOBJA: { id: 'teden' | 'mesec' | 'kvartal'; naziv: string }[] = [
  { id: 'teden', naziv: 'Teden' },
  { id: 'mesec', naziv: 'Mesec' },
  { id: 'kvartal', naziv: 'Kvartal' },
];

/* predlagane oznake (tagi) na nalogi — poleg njih prosto besedilo v panelu Podrobnosti */
const PREDLAGANE_OZNAKE = ['funkcionalnost', 'dizajn', 'CRM', 'zaledje', 'ideja'];

/* Razvojne naloge Flow-a same-po-sebi kot podatki task managerja (dogfooding): gumb v glavi
   jih doda v localStorage (shraniNaloge), brez da bi prepisal ze obstojece (ujemanje po naslovu). */
const NALOGE_FLOW_RAZVOJ: { naslov: string; stolpec: NalogaStolpec; oznake: string[] }[] = [
  { naslov: 'Kontakti (več oseb) + klik-za-klic/mail → dnevnik', stolpec: 'done', oznake: ['CRM', 'funkcionalnost'] },
  { naslov: 'CRM dnevnik (klici/sestanki/dogovori)', stolpec: 'done', oznake: ['CRM'] },
  { naslov: 'Naloga↔stranka + prioriteta + komentarji', stolpec: 'done', oznake: ['funkcionalnost'] },
  { naslov: 'Plan = matrika Projekt×Oddelek + oddelki/šef', stolpec: 'done', oznake: ['funkcionalnost'] },
  { naslov: 'Tedenski razpored + status + prenos v cikel', stolpec: 'done', oznake: ['funkcionalnost'] },
  { naslov: 'Preklop obdobja Teden/Mesec/Kvartal', stolpec: 'done', oznake: ['funkcionalnost'] },
  { naslov: 'Področja lastna + »+« iskalnik', stolpec: 'done', oznake: ['funkcionalnost'] },
  { naslov: 'Koledar urna mreža + sestanki/klici → CRM', stolpec: 'done', oznake: ['funkcionalnost'] },
  { naslov: 'Nov projekt + vozlišče + chat brief', stolpec: 'done', oznake: ['funkcionalnost'] },
  { naslov: 'Pipeline poslov (faze) drag&drop', stolpec: 'done', oznake: ['funkcionalnost'] },
  { naslov: 'Predračun / Avans / NDA', stolpec: 'done', oznake: ['funkcionalnost'] },
  { naslov: 'Meni: Dizajn→profil, Ustvari projekt pod Orodja', stolpec: 'done', oznake: ['dizajn'] },
  { naslov: 'Naslovi manjši povsod', stolpec: 'done', oznake: ['dizajn'] },
  { naslov: 'Komaj opazne obrobe + brez outline številk', stolpec: 'done', oznake: ['dizajn'] },
  { naslov: 'Cenik: dodaj-postavko na vrh', stolpec: 'done', oznake: ['dizajn'] },
  { naslov: 'Kontakt kartica poravnava + čitljiv naziv', stolpec: 'done', oznake: ['dizajn'] },
  { naslov: 'Cilji: Merilo = spustni meni', stolpec: 'done', oznake: ['funkcionalnost'] },
  { naslov: 'Razširjen brief + panoga + centriranje vprašanja', stolpec: 'in_progress', oznake: ['funkcionalnost'] },
  { naslov: 'Opomnik »pokliči nazaj«', stolpec: 'todo', oznake: ['CRM'] },
  { naslov: '»Moj dan« (zapadlo/ta teden)', stolpec: 'todo', oznake: ['funkcionalnost'] },
  { naslov: 'Gantt časovnica', stolpec: 'todo', oznake: ['funkcionalnost'] },
  { naslov: 'Redesign projekt-vozlišča + koledarja', stolpec: 'todo', oznake: ['dizajn'] },
  { naslov: 'Cilji → »Cilji in analitika« + kartice na Nadzorno', stolpec: 'todo', oznake: ['dizajn'] },
  { naslov: 'Font Bodoni → nevtralen (business)', stolpec: 'todo', oznake: ['dizajn'] },
  { naslov: 'Knjižnica postavk (inventory na ceniku)', stolpec: 'todo', oznake: ['funkcionalnost'] },
  { naslov: 'Chat/voice → naloge (fish.audio)', stolpec: 'todo', oznake: ['ideja'] },
  { naslov: 'Maili — Resend (API ključ)', stolpec: 'waiting', oznake: ['zaledje'] },
  { naslov: 'Prava prijava / več-uporabnikov', stolpec: 'waiting', oznake: ['zaledje'] },
  { naslov: 'Analitika baza (migracija + service key)', stolpec: 'waiting', oznake: ['zaledje'] },
  { naslov: 'Zavihek Inhouse (HR)', stolpec: 'todo', oznake: ['ideja'] },
  { naslov: 'First-run onboarding (solo vs ekipa)', stolpec: 'todo', oznake: ['ideja'] },
  { naslov: 'Pregled trženja (light)', stolpec: 'todo', oznake: ['ideja'] },
];

/* vrstica matrike Plana = en projekt (izpeljan iz dodelitev po projektIme/projektId,
   ali rocno dodan z "+ projekt" preden ima kakrsnokoli dodelitev) */
interface ProjektVrstica { kljuc: string; ime: string; projektId?: string }

/* panel Nova/Uredi dodelitev v matriki: "new" = klik na "+ dodeli" v prazni celici
   (projekt x oddelek ze znana), "edit" = klik na obstojeco dodelitev v celici */
interface DodelitevPanelStanje { mode: 'new' | 'edit'; projektIme: string; projektId?: string; oddelekId?: string; dodelitevId?: string }

/* rocno dodani prazni projekti (se brez dodelitve) — samo lokalna vrstica v matriki,
   dokler ne dobi prve dodelitve; loceno od TedenskaDodelitev, ker projekt sam po sebi
   ni entiteta v lib/naloge.ts */
const PRAZNI_PROJEKTI_KEY = 'pinflow_plan_prazni_projekti';
const preberiPrazneProjekte = (): ProjektVrstica[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(PRAZNI_PROJEKTI_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};
const shraniPrazneProjekte = (list: ProjektVrstica[]): void => {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(PRAZNI_PROJEKTI_KEY, JSON.stringify(list)); } catch { /* zaseben nacin */ }
};

const datStr = (s: string) => { const d = new Date(s); return isNaN(d.getTime()) ? s : d.toLocaleDateString('sl-SI'); };
const jeZapadlo = (rok?: string) => { if (!rok) return false; const d = new Date(rok); return !isNaN(d.getTime()) && d < new Date(new Date().toDateString()); };
/* prikaz ur na eno decimalko, npr. 90 minut -> "1.5" */
const formatUre = (minute: number) => (minute / 60).toFixed(1);
/* živ števec tekočega odseka: MM:SS (ali H:MM:SS nad uro) */
const formatCasSek = (sekunde: number) => {
  const s = Math.max(0, Math.floor(sekunde));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  const dd = (x: number) => String(x).padStart(2, '0');
  return h > 0 ? `${h}:${dd(m)}:${dd(sec)}` : `${dd(m)}:${dd(sec)}`;
};
/* lokalni YYYY-MM-DD (brez UTC zamika) — ujema se z zapisom <input type="date"> in Naloga.rok */
const toDateStr = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const sklonNalog = (n: number) => (n === 1 ? 'naloga' : n >= 2 && n <= 4 ? 'naloge' : 'nalog');
const sklonKoncanih = (n: number) => (n === 1 ? 'končana' : n >= 2 && n <= 4 ? 'končani' : 'končanih');
/* ponedeljek tedna, v katerem lezi dani datum, opolnoci lokalno */
const ponedeljekOd = (d: Date): Date => {
  const dan = d.getDay();
  const diff = dan === 0 ? -6 : 1 - dan;
  const pon = new Date(d.getFullYear(), d.getMonth(), d.getDate() + diff);
  pon.setHours(0, 0, 0, 0);
  return pon;
};
/* ISO stevilka tedna (1-53) za prikaz naslova "Teden N" v preklopu obdobja */
const isoTedenStevilka = (d: Date): number => {
  const datum = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dan = datum.getUTCDay() || 7;
  datum.setUTCDate(datum.getUTCDate() + 4 - dan);
  const zacetekLeta = new Date(Date.UTC(datum.getUTCFullYear(), 0, 1));
  return Math.ceil(((datum.getTime() - zacetekLeta.getTime()) / 86400000 + 1) / 7);
};
/* inicialke imena za okrogel avatar-krog (npr. "Matej Novak" -> "MN") */
const initialke = (ime: string) => ime.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();

export default function TaskManagerWorkspace() {
  const [naloge, setNaloge] = useState<Naloga[]>([]);
  const [novNaslov, setNovNaslov] = useState('');
  const [novOpis, setNovOpis] = useState('');
  const [novRok, setNovRok] = useState('');
  const [novDodeljeno, setNovDodeljeno] = useState('');
  const [novaOcena, setNovaOcena] = useState('');
  const [aktivniStolpec, setAktivniStolpec] = useState<NalogaStolpec>('todo');
  const [prikaziFormo, setPrikaziFormo] = useState(false);
  const [draggedCardId, setDraggedCardId] = useState<string | null>(null);
  const [zdaj, setZdaj] = useState(() => Date.now());

  /* --- vec-uporabniski del: sodelavci, trenutno prijavljen uporabnik, zgodovina, analitika ---
     sodelavci se berejo iz skupne shrambe (lib/sodelavci → Nastavitve/SodelavciPanel), s
     ZACETNI_SODELAVCI kot privzetim/zacetnim stanjem — preberiSodelavci() sama pade nazaj
     nanje, ce nic ni bilo shranjeno, zato je vedenje za neurejeno ekipo nespremenjeno. */
  const [sodelavci, setSodelavci] = useState<Sodelavec[]>(ZACETNI_SODELAVCI);
  const [trenutniId, setTrenutniId] = useState<string>(ZACETNI_SODELAVCI.find((s) => s.vloga === 'admin')?.id || ZACETNI_SODELAVCI[0].id);
  const [novDodeljenoId, setNovDodeljenoId] = useState<string>('');
  const [prikaziAnalitiko, setPrikaziAnalitiko] = useState(false);
  const [analitikaSodelavecId, setAnalitikaSodelavecId] = useState<string>('');
  const [zgodovina, setZgodovina] = useState<ZgodovinaAktivnosti[]>([]);
  const [filter, setFilter] = useState<'vse' | 'moje' | 'zamujene'>('vse');
  /* filter po oznaki (tagu) — klik na cip na kartici ali spustni izbor nad desko */
  const [filterOznaka, setFilterOznaka] = useState<string>('');
  /* prosto besedilo za novo oznako v panelu Podrobnosti naloge */
  const [novaOznaka, setNovaOznaka] = useState('');
  const [hitroOdprt, setHitroOdprt] = useState(false);
  const [hitroBesedilo, setHitroBesedilo] = useState('');
  /* kratko sporocilo ob kliku "Nalozi razvojne naloge (Flow)" — koliko jih je bilo dodanih */
  const [seedSporocilo, setSeedSporocilo] = useState('');

  /* --- stranke (za povezavo naloga ↔ stranka/projekt) --- */
  const [stranke, setStranke] = useState<FlowClient[]>([]);

  /* --- podrobnosti/komentarji naloge (odprti panel) --- */
  const [odprtaNalogaId, setOdprtaNalogaId] = useState<string | null>(null);
  const [novKomentar, setNovKomentar] = useState('');
  /* checklist podopravil v detajlnem panelu: besedilo novega vnosa + katero podopravilo
     ima trenutno odprt spustni izbor za dodelitev osebe (samo eno naenkrat) */
  const [novoPodopraviloBesedilo, setNovoPodopraviloBesedilo] = useState('');
  const [odpriDodelitevPodId, setOdpriDodelitevPodId] = useState<string | null>(null);

  /* --- Plan (prej Tedenski plan) / šefov razpored dodelitev — matrika projekt × oddelek --- */
  const [pogled, setPogled] = useState<'kanban' | 'teden'>('kanban');
  const [dodelitve, setDodelitve] = useState<TedenskaDodelitev[]>([]);
  const [oddelki, setOddelki] = useState<Oddelek[]>([]);
  const [prazniProjekti, setPrazniProjekti] = useState<ProjektVrstica[]>([]);

  /* preklop obdobja: teden / mesec / kvartal + korak nazaj/naprej */
  const [obdobjeVrsta, setObdobjeVrsta] = useState<'teden' | 'mesec' | 'kvartal'>('teden');
  const [obdobjeOffset, setObdobjeOffset] = useState(0);

  /* panel Nova/Uredi dodelitev (odprt iz celice matrike) + njegova polja */
  const [dodelitevPanel, setDodelitevPanel] = useState<DodelitevPanelStanje | null>(null);
  const [ndOsebaId, setNdOsebaId] = useState('');
  const [ndOddelekId, setNdOddelekId] = useState('');
  const [ndProjektIme, setNdProjektIme] = useState('');
  const [ndPodrocje, setNdPodrocje] = useState('');
  const [ndStrankaId, setNdStrankaId] = useState('');
  const [ndNacrt, setNdNacrt] = useState('');
  const [ndStatus, setNdStatus] = useState<NonNullable<TedenskaDodelitev['status']>>('nacrtovano');

  /* panel "+ projekt" (nova prazna vrstica v matriki) */
  const [noviProjektOdprt, setNoviProjektOdprt] = useState(false);
  const [noviProjektIme, setNoviProjektIme] = useState('');
  const [noviProjektStrankaId, setNoviProjektStrankaId] = useState('');

  /* panel "Uredi oddelke" (vodja/admin: dodaj/izbriši oddelek, šef, dodeli sodelavce) */
  const [urediOddelkeOdprto, setUrediOddelkeOdprto] = useState(false);
  const [novOddelekIme, setNovOddelekIme] = useState('');

  const [podrocja, setPodrocja] = useState<Podrocje[]>([]);
  const [novoPodrocje, setNovoPodrocje] = useState('');
  const [dodajOdprt, setDodajOdprt] = useState(false);
  const potrdiPodrocje = () => {
    if (samoOgled) return;
    const t = novoPodrocje.trim();
    if (!t) return;
    setPodrocja(dodajPodrocje(t));
    setNdPodrocje(t);
    setNovoPodrocje('');
    setDodajOdprt(false);
  };

  /* Task Manager je Tinino dogfooding orodje: v NASPROTJU z ostalimi delovnimi prostori (glej
     KoledarWorkspace/ClientWorkspace) ostane polno interaktiven (drag&drop, dodajanje, tagi,
     štoparica, seed razvojnih nalog) v VSEH načinih ogleda — tudi v predogledu/demo. localStorage
     je per-brskalnik, zato pisanje tu ne pokvari nič skupnega. usePredogled() ohranjen zaradi
     skladnosti klica hooka, njegov rezultat pa namenoma ne vpliva na samoOgled spodaj. */
  usePredogled();
  const samoOgled = false;

  const trenutni = sodelavci.find((s) => s.id === trenutniId) || sodelavci[0];
  const jeVodjaAliAdmin = trenutni.vloga === 'vodja' || trenutni.vloga === 'admin';

  useEffect(() => {
    setNaloge(preberiNaloge());
    setZgodovina(preberiZgodovino());
    setSodelavci(preberiSodelavci());
    setStranke(loadFlowData().clients);
    setDodelitve(preberiDodelitve());
    setOddelki(preberiOddelki());
    setPrazniProjekti(preberiPrazneProjekte());
    setPodrocja(preberiPodrocja());
  }, []);

  const posodobiInShrani = (noveNaloge: Naloga[]) => { setNaloge(noveNaloge); shraniNaloge(noveNaloge); };

  /* Hitro dodaj — vec nalog naenkrat: ena vrstica = ena kartica v "todo". */
  const hitroDodaj = () => {
    const vrstice = hitroBesedilo.split('\n').map((v) => v.trim()).filter(Boolean);
    if (!vrstice.length) return;
    const nove: Naloga[] = vrstice.map((naslov, i): Naloga => ({ id: 'task_' + Date.now() + '_' + i, naslov, stolpec: 'todo', created: new Date().toISOString() }));
    posodobiInShrani([...naloge, ...nove]);
    nove.forEach((n) => zabeleziAktivnost(n.id, trenutni.ime, `Ustvaril nalogo »${n.naslov}«`));
    setHitroBesedilo('');
    setHitroOdprt(false);
  };

  const dodajNalogo = (e: React.FormEvent) => {
    e.preventDefault();
    if (samoOgled) return;
    if (!novNaslov.trim()) return;
    const izbraniSodelavec = sodelavci.find((s) => s.id === novDodeljenoId);
    const nova: Naloga = {
      id: 'task_' + Date.now(),
      naslov: novNaslov.trim(),
      opis: novOpis.trim() || undefined,
      rok: novRok || undefined,
      /* obstojece prosto polje "Dodeljeno" (besedilo / "Zase") ostane, poleg njega
         se lahko doda se sodelavec iz spustnega seznama (dodeljenoOsebaId/-Ime) */
      dodeljenoOseba: novDodeljeno.trim() || undefined,
      dodeljenoOsebaId: izbraniSodelavec?.id,
      dodeljenoOsebaIme: izbraniSodelavec?.ime,
      ocenjeniCasUre: novaOcena.trim() ? parseFloat(novaOcena) : undefined,
      stolpec: aktivniStolpec,
      created: new Date().toISOString(),
    };
    posodobiInShrani([...naloge, nova]);
    zabeleziAktivnost(nova.id, trenutni.ime, `Ustvaril nalogo »${nova.naslov}«`);
    if (izbraniSodelavec) {
      /* mock obvestilo o dodelitvi (pravega maila se ne posilja) */
      console.log(`[E-mail Poslan] Naloga "${nova.naslov}" dodeljena ${izbraniSodelavec.ime} (${izbraniSodelavec.email})`);
    }
    setZgodovina(preberiZgodovino());
    setNovNaslov(''); setNovOpis(''); setNovRok(''); setNovDodeljeno(''); setNovDodeljenoId(''); setNovaOcena(''); setPrikaziFormo(false);
  };

  /* naknadno dodeljevanje sodelavca na OBSTOJEČO nalogo (spustni meni na kartici) + zapis v zgodovino */
  const dodeliNalogi = (id: string, sodelavecId: string) => {
    if (samoOgled) return;
    const so = sodelavci.find((x) => x.id === sodelavecId);
    const naloga = naloge.find((n) => n.id === id);
    posodobiInShrani(naloge.map((n) => (n.id === id ? { ...n, dodeljenoOsebaId: sodelavecId || undefined, dodeljenoOsebaIme: so?.ime } : n)));
    if (naloga) { zabeleziAktivnost(id, trenutni.ime, so ? `Dodelil nalogo »${naloga.naslov}« osebi ${so.ime}` : `Odstranil dodelitev na »${naloga.naslov}«`); setZgodovina(preberiZgodovino()); }
  };

  const izbrisiNalogo = (id: string) => {
    if (samoOgled) return;
    if (!jeVodjaAliAdmin) return; // brisanje dovoljeno le vodji/adminu
    const naloga = naloge.find((n) => n.id === id);
    posodobiInShrani(naloge.filter((n) => n.id !== id));
    if (naloga) {
      zabeleziAktivnost(id, trenutni.ime, `Izbrisal nalogo »${naloga.naslov}«`);
      setZgodovina(preberiZgodovino());
    }
  };

  /* naloga ↔ stranka: poveze/odveze clientId + zapise v zgodovino */
  const dodeliStranko = (id: string, clientId: string) => {
    if (samoOgled) return;
    const stranka = stranke.find((s) => s.id === clientId);
    const naloga = naloge.find((n) => n.id === id);
    posodobiInShrani(naloge.map((n) => (n.id === id ? { ...n, clientId: clientId || undefined } : n)));
    if (naloga) {
      zabeleziAktivnost(id, trenutni.ime, stranka ? `Povezal nalogo »${naloga.naslov}« s stranko ${stranka.name}` : `Odstranil povezavo s stranko na »${naloga.naslov}«`);
      setZgodovina(preberiZgodovino());
    }
  };

  /* prost naziv projekta na nalogi — po zelji se ujema z imenom v tedenski dodelitvi */
  const nastaviProjekt = (id: string, projectId: string) => {
    if (samoOgled) return;
    posodobiInShrani(naloge.map((n) => (n.id === id ? { ...n, projectId: projectId.trim() || undefined } : n)));
  };

  const nastaviPrioriteto = (id: string, prioriteta: string) => {
    if (samoOgled) return;
    posodobiInShrani(naloge.map((n) => (n.id === id ? { ...n, prioriteta: (prioriteta || undefined) as Naloga['prioriteta'] } : n)));
  };

  const dodajKomentar = (id: string, besedilo: string) => {
    if (samoOgled) return;
    if (!besedilo.trim()) return;
    const nov: NalogaKomentar = { id: 'kom_' + Date.now(), avtorIme: trenutni.ime || 'Jaz', besedilo: besedilo.trim(), cas: new Date().toISOString() };
    posodobiInShrani(naloge.map((n) => (n.id === id ? { ...n, komentarji: [...(n.komentarji || []), nov] } : n)));
  };

  /* doda oznako (tag) na nalogo — brez podvajanja; sprejme tako predlagane kot prosto besedilo */
  const dodajOznako = (id: string, oznaka: string) => {
    if (samoOgled) return;
    const t = oznaka.trim();
    if (!t) return;
    posodobiInShrani(naloge.map((n) => (n.id === id ? { ...n, oznake: Array.from(new Set([...(n.oznake || []), t])) } : n)));
  };
  const odstraniOznako = (id: string, oznaka: string) => {
    if (samoOgled) return;
    posodobiInShrani(naloge.map((n) => (n.id === id ? { ...n, oznake: (n.oznake || []).filter((o) => o !== oznaka) } : n)));
    if (filterOznaka === oznaka) setFilterOznaka('');
  };

  /* uredi prost opis naloge (urejljiva textarea v detajlnem panelu) */
  const urediOpis = (id: string, opis: string) => {
    if (samoOgled) return;
    posodobiInShrani(naloge.map((n) => (n.id === id ? { ...n, opis: opis || undefined } : n)));
  };

  /* --- checklist podopravil znotraj naloge (detajlni panel) --- */
  const dodajPodopravilo = (nalogaId: string, besedilo: string) => {
    if (samoOgled) return;
    const t = besedilo.trim();
    if (!t) return;
    const novo: NalogaPodopravilo = { id: 'pod_' + Date.now(), besedilo: t, done: false };
    posodobiInShrani(naloge.map((n) => (n.id === nalogaId ? { ...n, podopravila: [...(n.podopravila || []), novo] } : n)));
  };
  const preklopiPodopravilo = (nalogaId: string, podId: string) => {
    if (samoOgled) return;
    posodobiInShrani(naloge.map((n) => (n.id === nalogaId ? { ...n, podopravila: (n.podopravila || []).map((p) => (p.id === podId ? { ...p, done: !p.done } : p)) } : n)));
  };
  const urediPodopravilo = (nalogaId: string, podId: string, besedilo: string) => {
    if (samoOgled) return;
    posodobiInShrani(naloge.map((n) => (n.id === nalogaId ? { ...n, podopravila: (n.podopravila || []).map((p) => (p.id === podId ? { ...p, besedilo } : p)) } : n)));
  };
  /* dodeli sodelavca konkretnemu podopravilu (loceno od dodelitve cele naloge) — prazen
     osebaId odstrani dodelitev na tem podopravilu */
  const dodeliPodopravilo = (nalogaId: string, podId: string, osebaId: string) => {
    if (samoOgled) return;
    const oseba = sodelavci.find((s) => s.id === osebaId);
    posodobiInShrani(naloge.map((n) => (n.id === nalogaId ? { ...n, podopravila: (n.podopravila || []).map((p) => (p.id === podId ? { ...p, dodeljenoOsebaId: oseba?.id, dodeljenoOsebaIme: oseba?.ime } : p)) } : n)));
  };
  const izbrisiPodopravilo = (nalogaId: string, podId: string) => {
    if (samoOgled) return;
    posodobiInShrani(naloge.map((n) => (n.id === nalogaId ? { ...n, podopravila: (n.podopravila || []).filter((p) => p.id !== podId) } : n)));
  };

  /* gumb "Naloži razvojne naloge (Flow)" — dogfooding: doda seznam NALOGE_FLOW_RAZVOJ v
     localStorage, brez da bi prepisal ze obstojece naloge (ujemanje po naslovu). */
  const nalozirazvojneNaloge = () => {
    if (samoOgled) return;
    const obstojece = preberiNaloge();
    const obstojeciNaslovi = new Set(obstojece.map((n) => n.naslov));
    const nove: Naloga[] = NALOGE_FLOW_RAZVOJ.filter((n) => !obstojeciNaslovi.has(n.naslov)).map((n) => ({
      id: crypto.randomUUID(),
      naslov: n.naslov,
      stolpec: n.stolpec,
      oznake: n.oznake,
      created: new Date().toISOString(),
    }));
    if (nove.length > 0) {
      posodobiInShrani([...obstojece, ...nove]);
      zabeleziAktivnost('seed_' + Date.now(), trenutni.ime, `Naložil ${nove.length} razvojnih nalog Flow-a`);
      setZgodovina(preberiZgodovino());
    }
    setSeedSporocilo(nove.length > 0 ? `Dodanih ${nove.length} novih nalog.` : 'Vse razvojne naloge so že naložene.');
    window.setTimeout(() => setSeedSporocilo(''), 3500);
  };

  /* --- Plan / šefov razpored dodelitev — obdobje + matrika projekt × oddelek --- */
  const osveziDodelitve = () => setDodelitve(preberiDodelitve());

  /* okno trenutno izbranega obdobja (teden/mesec/kvartal), premaknjeno za obdobjeOffset korakov od danes */
  const obdobjeOkno = (() => {
    const danes = new Date();
    if (obdobjeVrsta === 'teden') {
      const zacetek = ponedeljekOd(danes);
      zacetek.setDate(zacetek.getDate() + obdobjeOffset * 7);
      const konecEkskl = new Date(zacetek);
      konecEkskl.setDate(konecEkskl.getDate() + 7);
      return { zacetek, konecEkskl };
    }
    if (obdobjeVrsta === 'mesec') {
      const zacetek = new Date(danes.getFullYear(), danes.getMonth() + obdobjeOffset, 1);
      const konecEkskl = new Date(danes.getFullYear(), danes.getMonth() + obdobjeOffset + 1, 1);
      return { zacetek, konecEkskl };
    }
    const trenutniKvartal = Math.floor(danes.getMonth() / 3);
    const zacetek = new Date(danes.getFullYear(), (trenutniKvartal + obdobjeOffset) * 3, 1);
    const konecEkskl = new Date(danes.getFullYear(), (trenutniKvartal + obdobjeOffset) * 3 + 3, 1);
    return { zacetek, konecEkskl };
  })();
  const obdobjeZacetekStr = toDateStr(obdobjeOkno.zacetek);
  const obdobjeKonecEksklStr = toDateStr(obdobjeOkno.konecEkskl);
  const obdobjeNaslov = (() => {
    if (obdobjeVrsta === 'teden') {
      const zadnji = new Date(obdobjeOkno.konecEkskl);
      zadnji.setDate(zadnji.getDate() - 1);
      return `Teden ${isoTedenStevilka(obdobjeOkno.zacetek)} · ${obdobjeOkno.zacetek.toLocaleDateString('sl-SI', { day: 'numeric', month: 'short' })} – ${zadnji.toLocaleDateString('sl-SI', { day: 'numeric', month: 'short', year: 'numeric' })}`;
    }
    if (obdobjeVrsta === 'mesec') {
      const naziv = obdobjeOkno.zacetek.toLocaleDateString('sl-SI', { month: 'long', year: 'numeric' });
      return naziv.charAt(0).toUpperCase() + naziv.slice(1);
    }
    return `Q${Math.floor(obdobjeOkno.zacetek.getMonth() / 3) + 1} ${obdobjeOkno.zacetek.getFullYear()}`;
  })();

  /* dodelitve, katerih tedenZacetek pade v trenutno okno obdobja */
  const oknoDodelitve = dodelitve.filter((d) => d.tedenZacetek >= obdobjeZacetekStr && d.tedenZacetek < obdobjeKonecEksklStr);

  const smeUrejatiDodelitev = (d: TedenskaDodelitev) => !samoOgled && (jeVodjaAliAdmin || d.osebaId === trenutni.id);

  /* poveze todo naloge (delavcev pogled) s sefovo dodelitvijo: ujemanje po osebi + projektu
     (prek clientId/projectId ali po prostem imenu projekta) */
  const nalogeZaDodelitev = (d: TedenskaDodelitev) => naloge.filter((n) => {
    const istaOseba = n.dodeljenoOsebaId === d.osebaId || (!!n.dodeljenoOsebaIme && n.dodeljenoOsebaIme === d.osebaIme);
    if (!istaOseba) return false;
    const poId = !!d.projektId && (n.projectId === d.projektId || n.clientId === d.projektId);
    const poImenu = !!n.projectId && n.projectId.trim().toLowerCase() === d.projektIme.trim().toLowerCase();
    return poId || poImenu;
  });

  const oznakaNalogDodelitve = (d: TedenskaDodelitev) => {
    const povezane = nalogeZaDodelitev(d);
    const koncane = povezane.filter((n) => n.stolpec === 'done').length;
    return `${povezane.length} ${sklonNalog(povezane.length)} / ${koncane} ${sklonKoncanih(koncane)}`;
  };
  /* kompaktna razlicica znacke za majhen cip v celici matrike, npr. "1/3" */
  const oznakaKompaktna = (d: TedenskaDodelitev) => {
    const povezane = nalogeZaDodelitev(d);
    const koncane = povezane.filter((n) => n.stolpec === 'done').length;
    return `${koncane}/${povezane.length}`;
  };

  /* stolpci matrike = oddelki; ce jih ni, en navidezni stolpec "Vse" (id '') */
  const stolpciPrikaz: { id: string; ime: string; sefId?: string }[] = oddelki.length
    ? oddelki
    : [{ id: '', ime: 'Vse' }];

  /* vrstice matrike = unikatni projekti iz dodelitev tega okna + rocno dodani prazni projekti */
  const vrsticeProjektov: ProjektVrstica[] = (() => {
    const map = new Map<string, ProjektVrstica>();
    oknoDodelitve.forEach((d) => {
      const kljuc = d.projektId || d.projektIme.trim().toLowerCase();
      if (!map.has(kljuc)) map.set(kljuc, { kljuc, ime: d.projektIme, projektId: d.projektId });
    });
    prazniProjekti.forEach((p) => {
      if (!map.has(p.kljuc)) map.set(p.kljuc, p);
    });
    return Array.from(map.values()).sort((a, b) => a.ime.localeCompare(b.ime));
  })();

  /* dodelitve v eni celici (projekt x oddelek): ujemanje po projektu IN oddelku —
     oddelek dodelitve, ce ni override-an, pade nazaj na oddelek osebe */
  const dodelitveVCelici = (vrstica: ProjektVrstica, oddelekId: string) => oknoDodelitve.filter((d) => {
    const isProjekt = (!!d.projektId && !!vrstica.projektId && d.projektId === vrstica.projektId)
      || d.projektIme.trim().toLowerCase() === vrstica.ime.trim().toLowerCase();
    if (!isProjekt) return false;
    if (oddelki.length === 0) return true;
    const njenOddelek = d.oddelekId || sodelavci.find((s) => s.id === d.osebaId)?.oddelekId || '';
    return njenOddelek === oddelekId;
  });

  const odstraniDodelitev = (id: string) => { if (samoOgled) return; izbrisiDodelitev(id); osveziDodelitve(); };

  /* premakne PRENESENO dodelitev naprej: ustvari kopijo v naslednjem obdobju (glede na
     trenutni preklop teden/mesec/kvartal), z novim id in statusom 'nacrtovano'; izvirna
     dodelitev ostane nespremenjena (zgodovinski zapis, da je bila "prenesena"). */
  const naslednjeObdobjeZacetek = (datumStr: string, vrsta: 'teden' | 'mesec' | 'kvartal'): string => {
    const d = new Date(datumStr + 'T00:00:00');
    if (vrsta === 'teden') d.setDate(d.getDate() + 7);
    else if (vrsta === 'mesec') d.setMonth(d.getMonth() + 1);
    else d.setMonth(d.getMonth() + 3);
    return toDateStr(d);
  };
  const prenesiVNaslednjiCikel = (d: TedenskaDodelitev) => {
    if (samoOgled) return;
    const nova: TedenskaDodelitev = {
      ...d,
      id: 'dod_' + Date.now(),
      tedenZacetek: naslednjeObdobjeZacetek(d.tedenZacetek, obdobjeVrsta),
      status: 'nacrtovano',
    };
    shraniDodelitev(nova);
    osveziDodelitve();
  };

  /* odpre panel za novo dodelitev v konkretni celici (projekt vrstice x oddelek stolpca) */
  const odpriNovoDodelitev = (vrstica: ProjektVrstica, oddelekId: string) => {
    setDodelitevPanel({ mode: 'new', projektIme: vrstica.ime, projektId: vrstica.projektId, oddelekId });
    setNdOsebaId(''); setNdOddelekId(oddelekId); setNdPodrocje(''); setNdStrankaId(vrstica.projektId || ''); setNdNacrt(''); setNdStatus('nacrtovano');
  };

  /* odpre panel za urejanje obstojece dodelitve (klik na cip v celici) */
  const odpriUrediDodelitev = (d: TedenskaDodelitev) => {
    setDodelitevPanel({ mode: 'edit', projektIme: d.projektIme, projektId: d.projektId, dodelitevId: d.id });
    setNdOsebaId(d.osebaId); setNdOddelekId(d.oddelekId || ''); setNdPodrocje(d.podrocje || ''); setNdStrankaId(d.projektId || ''); setNdNacrt(d.nacrt || ''); setNdStatus(d.status || 'nacrtovano');
  };

  const zapriDodelitevPanel = () => setDodelitevPanel(null);

  const shraniDodelitevIzPanela = () => {
    if (samoOgled) return;
    if (!dodelitevPanel) return;
    if (dodelitevPanel.mode === 'new') {
      const oseba = sodelavci.find((s) => s.id === ndOsebaId);
      if (!oseba) return;
      const nova: TedenskaDodelitev = {
        id: 'dod_' + Date.now(),
        osebaId: oseba.id,
        osebaIme: oseba.ime,
        projektId: ndStrankaId || dodelitevPanel.projektId || undefined,
        projektIme: dodelitevPanel.projektIme,
        podrocje: ndPodrocje.trim() || undefined,
        oddelekId: ndOddelekId || undefined,
        tedenZacetek: obdobjeZacetekStr,
        nacrt: ndNacrt.trim() || undefined,
        status: 'nacrtovano',
      };
      shraniDodelitev(nova);
    } else {
      const obstojeca = dodelitve.find((d) => d.id === dodelitevPanel.dodelitevId);
      if (!obstojeca) return;
      let posodobljena: TedenskaDodelitev = { ...obstojeca, nacrt: ndNacrt.trim() || undefined, status: ndStatus };
      if (jeVodjaAliAdmin) {
        const oseba = sodelavci.find((s) => s.id === ndOsebaId);
        posodobljena = {
          ...posodobljena,
          osebaId: oseba?.id || obstojeca.osebaId,
          osebaIme: oseba?.ime || obstojeca.osebaIme,
          oddelekId: ndOddelekId || undefined,
          podrocje: ndPodrocje.trim() || undefined,
        };
      }
      shraniDodelitev(posodobljena);
    }
    osveziDodelitve();
    zapriDodelitevPanel();
  };

  const izbrisiIzPanela = () => {
    if (samoOgled) return;
    if (dodelitevPanel?.mode === 'edit' && dodelitevPanel.dodelitevId) odstraniDodelitev(dodelitevPanel.dodelitevId);
    zapriDodelitevPanel();
  };

  /* "+ projekt" — doda prazno vrstico v matriko (se brez dodelitve), po zelji poveze s stranko */
  const dodajProjektVrstico = () => {
    if (samoOgled) return;
    const ime = noviProjektIme.trim();
    if (!ime) return;
    const stranka = stranke.find((s) => s.id === noviProjektStrankaId);
    const koncnoIme = stranka ? stranka.name : ime;
    const kljuc = noviProjektStrankaId || koncnoIme.toLowerCase();
    if (vrsticeProjektov.some((v) => v.kljuc === kljuc)) { setNoviProjektOdprt(false); setNoviProjektIme(''); setNoviProjektStrankaId(''); return; }
    const nov: ProjektVrstica = { kljuc, ime: koncnoIme, projektId: noviProjektStrankaId || undefined };
    const posodobljeni = [...prazniProjekti, nov];
    setPrazniProjekti(posodobljeni);
    shraniPrazneProjekte(posodobljeni);
    setNoviProjektOdprt(false); setNoviProjektIme(''); setNoviProjektStrankaId('');
  };

  /* --- Uredi oddelke (vodja/admin) --- */
  const dodajOddelekRocno = () => {
    if (samoOgled) return;
    const t = novOddelekIme.trim();
    if (!t) return;
    setOddelki(dodajOddelek(t));
    setNovOddelekIme('');
  };
  const izbrisiOddelekRocno = (id: string) => { if (samoOgled) return; setOddelki(izbrisiOddelek(id)); };
  const posodobiSefaOddelka = (oddelekId: string, sefId: string) => {
    if (samoOgled) return;
    const posodobljeni = oddelki.map((o) => (o.id === oddelekId ? { ...o, sefId: sefId || undefined } : o));
    setOddelki(posodobljeni);
    shraniOddelki(posodobljeni);
  };
  const posodobiSodelavcaOddelek = (sodelavecId: string, oddelekId: string) => {
    if (samoOgled) return;
    const posodobljeni = sodelavci.map((s) => (s.id === sodelavecId ? { ...s, oddelekId: oddelekId || undefined } : s));
    setSodelavci(posodobljeni);
    shraniSodelavci(posodobljeni);
  };

  /* Porabljeni cas naloge do TRENUTKA "zdaj" — ce stoparica tece, steje se tudi tekoci odsek. */
  const porabljeneMinute = (n: Naloga): number => {
    const baza = n.porabljeniCasMinute || 0;
    if (n.isTimerRunning && n.timerStartTime) {
      const tekoceMinute = (zdaj - new Date(n.timerStartTime).getTime()) / 60000;
      return baza + Math.max(0, tekoceMinute);
    }
    return baza;
  };

  /* Naenkrat lahko tece stoparica na SAMO eni nalogi: klik na "play" najprej ustavi
     morebitno drugo tekoco nalogo in njen odsek prišteje k njenemu porabljenemu casu.
     Klik na "stop" (na nalogi, kjer stoparica ze tece) samo ustavi in shrani odsek. */
  const preklopiStoparico = (id: string) => {
    if (samoOgled) return;
    const zdajIso = new Date().toISOString();
    const zdajMs = Date.now();
    let ustavljena: { naloga: Naloga; minute: number } | null = null;
    const posodobljene = naloge.map((n) => {
      const jeTaNaloga = n.id === id;
      if (n.isTimerRunning) {
        const el = Math.max(0, Math.round((zdajMs - new Date(n.timerStartTime || zdajIso).getTime()) / 60000));
        ustavljena = { naloga: n, minute: el };
        return { ...n, isTimerRunning: false, timerStartTime: undefined, porabljeniCasMinute: (n.porabljeniCasMinute || 0) + el };
      }
      if (jeTaNaloga) {
        return { ...n, isTimerRunning: true, timerStartTime: zdajIso };
      }
      return n;
    });
    posodobiInShrani(posodobljene);
    /* ob ustavitvi zabeleži porabljeni odsek v Zgodovino aktivnosti */
    if (ustavljena) {
      const u = ustavljena as { naloga: Naloga; minute: number };
      zabeleziAktivnost(u.naloga.id, trenutni.ime, `Ustavil štoparico (+${u.minute} min) na »${u.naloga.naslov}«`);
      setZgodovina(preberiZgodovino());
    }
  };

  /* naloga, na kateri trenutno tece stoparica (ce obstaja) — uporabljeno za ziv prikaz */
  const tekocaNalogaId = naloge.find((n) => n.isTimerRunning)?.id;

  useEffect(() => {
    if (!tekocaNalogaId) return;
    const id = window.setInterval(() => setZdaj(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [tekocaNalogaId]);

  const handleDragStart = (e: React.DragEvent, id: string) => {
    if (samoOgled) return;
    setDraggedCardId(id); e.dataTransfer.setData('text/plain', id);
  };
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); };
  const handleDrop = (e: React.DragEvent, ciljniStolpec: NalogaStolpec) => {
    e.preventDefault();
    if (samoOgled) return;
    const id = e.dataTransfer.getData('text/plain') || draggedCardId;
    if (!id) return;
    const naloga = naloge.find((n) => n.id === id);
    posodobiInShrani(naloge.map((n) => (n.id === id ? { ...n, stolpec: ciljniStolpec } : n)));
    if (naloga && naloga.stolpec !== ciljniStolpec) {
      const cilj = STOLPCI.find((s) => s.id === ciljniStolpec)?.naziv || ciljniStolpec;
      zabeleziAktivnost(id, trenutni.ime, `Premaknil nalogo »${naloga.naslov}« v »${cilj}«`);
      setZgodovina(preberiZgodovino());
    }
    setDraggedCardId(null);
  };

  /* Vidnost po vlogi: clan vidi le sebi dodeljene naloge, vodja/admin vidita vse. */
  const vidneNaloge = trenutni.vloga === 'clan' ? naloge.filter((n) => n.dodeljenoOsebaId === trenutni.id) : naloge;
  /* Hitri filter nad Kanban tablo: vse / moje / zamujene (rok pred danes in ni končano) + oznaka (tag) */
  const danesStr = new Date().toISOString().slice(0, 10);
  const prikazaneNaloge = vidneNaloge.filter((n) => {
    if (filter === 'moje' && !(n.dodeljenoOsebaId === trenutni.id || (n.dodeljenoOseba || '') === trenutni.ime)) return false;
    if (filter === 'zamujene' && !(!!n.rok && n.rok < danesStr && n.stolpec !== 'done')) return false;
    if (filterOznaka && !(n.oznake || []).includes(filterOznaka)) return false;
    return true;
  });
  /* vse oznake, ki nastopajo na vidnih nalogah — za spustni izbor filtra */
  const vseOznake = Array.from(new Set(vidneNaloge.flatMap((n) => n.oznake || []))).sort((a, b) => a.localeCompare(b, 'sl'));

  /* Podatki za panel "Analitika ekipe" — izbrani sodelavec: st. nalog, koncanih, ur, zgodovina. */
  const analitikaSodelavec = sodelavci.find((s) => s.id === analitikaSodelavecId);
  const analitikaNaloge = analitikaSodelavec ? naloge.filter((n) => n.dodeljenoOsebaId === analitikaSodelavec.id) : [];
  const analitikaKoncane = analitikaNaloge.filter((n) => n.stolpec === 'done').length;
  const analitikaUre = analitikaNaloge.reduce((vsota, n) => vsota + porabljeneMinute(n) / 60, 0);
  const analitikaZgodovina = zgodovina
    .filter((z) => analitikaNaloge.some((n) => n.id === z.nalogaId))
    .sort((a, b) => new Date(b.datum).getTime() - new Date(a.datum).getTime())
    .slice(0, 10);

  /* stranka -> ime, za znacko na kartici + urejanje naloge */
  const strankaImeMap = new Map(stranke.map((s) => [s.id, s.name]));
  const odprtaNaloga = naloge.find((n) => n.id === odprtaNalogaId) || null;
  const aktivniSodelavci = sodelavci.filter((s) => s.aktiven);

  return (
    <div className="tm">
      <header className="tm-glava">
        <div>
          <p className="tm-eyebrow">TASK MANAGER</p>
          <h1 className="tm-naslov">Naloge.</h1>
          <p className="tm-podnaslov">Organiziraj projekte in opravila na enem mestu — povleci kartico med stolpci.</p>
        </div>
        <div className="tm-glava-akcije">
          <label className="tm-uporabnik">
            <span>Prijavljen</span>
            <select value={trenutniId} onChange={(e) => setTrenutniId(e.target.value)}>
              {sodelavci.map((s) => <option key={s.id} value={s.id}>{s.ime} ({s.vloga.toUpperCase()})</option>)}
            </select>
          </label>
          {jeVodjaAliAdmin && (
            <button type="button" className="tm-analitika-gumb" onClick={() => { setAnalitikaSodelavecId(sodelavci[0]?.id || ''); setPrikaziAnalitiko(true); }}>
              <ChartBar size={15} weight="bold" /> Analitika ekipe
            </button>
          )}
          <button type="button" className="tm-seed-gumb" onClick={nalozirazvojneNaloge} title="Doda razvojne naloge Flow-a v ta task manager (ne prepiše obstoječih)">
            + Naloži razvojne naloge (Flow)
          </button>
          {seedSporocilo && <span className="tm-seed-sporocilo">{seedSporocilo}</span>}
          {!samoOgled ? (
            <button type="button" className="tm-nova" onClick={() => { setPogled('kanban'); setAktivniStolpec('todo'); setPrikaziFormo(true); }}>+ Nova naloga</button>
          ) : (
            <p className="tm-demo-namig">Urejanje ni na voljo v predogledu (demo).</p>
          )}
          <button type="button" className="tm-seed-gumb" onClick={() => { setPogled('kanban'); setHitroOdprt((o) => !o); }}>Hitro dodaj več</button>
        </div>
      </header>

      <div className="tm-pogled-filtri-vrsta">
        <div className="tm-pogled-preklop" role="tablist" aria-label="Pogled">
          <button type="button" role="tab" aria-selected={pogled === 'kanban'} className={pogled === 'kanban' ? 'tm-pogled-on' : ''} onClick={() => setPogled('kanban')}>Kanban</button>
          <button type="button" role="tab" aria-selected={pogled === 'teden'} className={pogled === 'teden' ? 'tm-pogled-on' : ''} onClick={() => setPogled('teden')}>Plan</button>
        </div>
        {pogled === 'kanban' && (
          <div className="tm-filtri-vrsta">
            <div className="tm-filtri" role="tablist" aria-label="Filter nalog">
              {([['vse', 'Vse naloge'], ['moje', 'Moje naloge'], ['zamujene', 'Zamujene']] as const).map(([k, oznaka]) => (
                <button key={k} type="button" role="tab" aria-selected={filter === k} className={filter === k ? 'tm-filter-on' : ''} onClick={() => setFilter(k)}>{oznaka}{k === 'zamujene' && vidneNaloge.some((n) => !!n.rok && n.rok < danesStr && n.stolpec !== 'done') ? ' •' : ''}</button>
              ))}
            </div>
            {vseOznake.length > 0 && (
              <select className="tm-filter-oznaka" value={filterOznaka} onChange={(e) => setFilterOznaka(e.target.value)} aria-label="Filter po oznaki">
                <option value="">Vse oznake</option>
                {vseOznake.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            )}
          </div>
        )}
      </div>

      {pogled === 'kanban' && hitroOdprt && (
        <form className="tm-forma" onSubmit={(e) => { e.preventDefault(); hitroDodaj(); }}>
          <div className="tm-forma-glava"><h2>Hitro dodaj naloge</h2><button type="button" className="tm-x" onClick={() => setHitroOdprt(false)} aria-label="Zapri">×</button></div>
          <label className="tm-polje"><span>Ena naloga na vrstico — vsaka postane kartica v »Za narediti«</span>
            <textarea value={hitroBesedilo} onChange={(e) => setHitroBesedilo(e.target.value)} rows={6} autoFocus placeholder={'Prenova logotipa\nPokliči stranko\nPripravi ponudbo za …'} style={{ resize: 'vertical', minHeight: '7rem', lineHeight: 1.6, width: '100%', boxSizing: 'border-box' }} />
          </label>
          <div className="tm-forma-akcije"><button type="button" className="tm-preklici" onClick={() => setHitroOdprt(false)}>Prekliči</button><button type="submit" className="tm-shrani" disabled={!hitroBesedilo.trim()}>Dodaj vse</button></div>
        </form>
      )}

      {pogled === 'kanban' && prikaziFormo && (
        <form className="tm-forma" onSubmit={dodajNalogo}>
          <div className="tm-forma-glava"><h2>Nova naloga</h2><button type="button" className="tm-x" onClick={() => setPrikaziFormo(false)} aria-label="Zapri">×</button></div>
          <label className="tm-polje"><span>Naslov</span><input value={novNaslov} onChange={(e) => setNovNaslov(e.target.value)} placeholder="Npr. Pripravi poročilo za Rokus …" autoFocus /></label>
          <label className="tm-polje"><span>Opis</span><textarea value={novOpis} onChange={(e) => setNovOpis(e.target.value)} placeholder="Podrobnosti naloge …" rows={3} /></label>
          <label className="tm-polje"><span>Dodeljeno</span>
            <div className="tm-dodeljeno-vrsta">
              <input value={novDodeljeno} onChange={(e) => setNovDodeljeno(e.target.value)} placeholder="Kdo dela nalogo …" />
              <button type="button" className="tm-zase" onClick={() => { setNovDodeljeno('Jaz'); setNovDodeljenoId(trenutni.id); }}>+ Zase</button>
            </div>
          </label>
          <label className="tm-polje"><span>Sodelavec (dodelitev + e-pošta)</span>
            <select value={novDodeljenoId} onChange={(e) => setNovDodeljenoId(e.target.value)}>
              <option value="">— brez —</option>
              {sodelavci.filter((s) => s.aktiven).map((s) => <option key={s.id} value={s.id}>{s.ime} — {s.email}</option>)}
            </select>
          </label>
          <div className="tm-forma-vrsta">
            <label className="tm-polje"><span>Stolpec</span><select value={aktivniStolpec} onChange={(e) => setAktivniStolpec(e.target.value as NalogaStolpec)}>{STOLPCI.map((s) => <option key={s.id} value={s.id}>{s.naziv}</option>)}</select></label>
            <label className="tm-polje"><span>Rok izvedbe</span><input type="date" value={novRok} onChange={(e) => setNovRok(e.target.value)} /></label>
            <label className="tm-polje"><span>Ocenjeni čas (ure)</span><input type="number" step={0.5} min={0} value={novaOcena} onChange={(e) => setNovaOcena(e.target.value)} placeholder="npr. 2.5" /></label>
          </div>
          <div className="tm-forma-akcije"><button type="button" className="tm-preklici" onClick={() => setPrikaziFormo(false)}>Prekliči</button><button type="submit" className="tm-shrani" disabled={!novNaslov.trim()}>Shrani nalogo</button></div>
        </form>
      )}

      {pogled === 'kanban' && (
      <div className="tm-deska">
        {STOLPCI.map((s) => {
          const nalogeVStolpcu = prikazaneNaloge.filter((n) => n.stolpec === s.id).sort((a, b) => (PRIO_RED[a.prioriteta ?? ''] ?? 3) - (PRIO_RED[b.prioriteta ?? ''] ?? 3));
          return (
            <section key={s.id} className="tm-stolpec" data-stolpec={s.id} onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, s.id)}>
              <header className="tm-stolpec-glava"><span className="tm-pika" aria-hidden /><h3>{s.naziv}</h3><span className="tm-st">{nalogeVStolpcu.length}</span></header>
              <div className="tm-kartice">
                {nalogeVStolpcu.length === 0 && <p className="tm-prazno">Povleci nalogo sem.</p>}
                {nalogeVStolpcu.map((naloga) => {
                  const porabljene = porabljeneMinute(naloga);
                  const ocena = naloga.ocenjeniCasUre;
                  const odstotekSurovi = ocena ? (porabljene / 60 / ocena) * 100 : 0;
                  const prekoracitev = !!ocena && odstotekSurovi > 100;
                  const odstotek = Math.min(100, odstotekSurovi);
                  const dodeljenoIme = naloga.dodeljenoOsebaIme || naloga.dodeljenoOseba || '';
                  return (
                    <article key={naloga.id} className={`tm-kartica${naloga.isTimerRunning ? ' tm-kartica-tece' : ''}`} draggable={!samoOgled} onDragStart={(e) => handleDragStart(e, naloga.id)}>
                      <div className="tm-kartica-vrh">
                        <strong>{naloga.naslov}</strong>
                        {naloga.isTimerRunning && <span className="tm-tece-znacka" aria-hidden>● teče</span>}
                        <button
                          type="button"
                          className="tm-kartica-komentarji"
                          onClick={() => { setOdprtaNalogaId(naloga.id); setNovKomentar(''); setNovaOznaka(''); setNovoPodopraviloBesedilo(''); setOdpriDodelitevPodId(null); }}
                          aria-label={`Podrobnosti in komentarji (${naloga.komentarji?.length || 0})`}
                          title="Podrobnosti, stranka, projekt in komentarji"
                        >
                          <ChatCircleDots size={13} weight={naloga.komentarji?.length ? 'fill' : 'regular'} />
                          {!!naloga.komentarji?.length && <span className="tm-kartica-komentarji-st">{naloga.komentarji.length}</span>}
                        </button>
                        {jeVodjaAliAdmin && !samoOgled && <button type="button" className="tm-kartica-x" onClick={() => izbrisiNalogo(naloga.id)} title="Izbriši nalogo" aria-label="Izbriši nalogo">×</button>}
                      </div>
                      {naloga.opis && <p className="tm-kartica-opis">{naloga.opis}</p>}
                      {!!naloga.oznake?.length && (
                        <div className="tm-kartica-oznake">
                          {naloga.oznake.map((o) => (
                            <button
                              key={o}
                              type="button"
                              className={`tm-oznaka-cip${filterOznaka === o ? ' tm-oznaka-cip-on' : ''}`}
                              onClick={() => setFilterOznaka(filterOznaka === o ? '' : o)}
                              title={`Filtriraj po oznaki »${o}«`}
                            >
                              {o}
                            </button>
                          ))}
                        </div>
                      )}
                      <div className="tm-kartica-noga">
                        {naloga.rok && <span className={`tm-rok${jeZapadlo(naloga.rok) && s.id !== 'done' ? ' tm-rok-zapadlo' : ''}`}>📅 {datStr(naloga.rok)}</span>}
                        {naloga.clientId && strankaImeMap.get(naloga.clientId) && (
                          <span className="tm-stranka-znacka" title={`Stranka: ${strankaImeMap.get(naloga.clientId)}`}>{strankaImeMap.get(naloga.clientId)}</span>
                        )}
                        {!!naloga.podopravila?.length && (
                          <span className="tm-kartica-podopravila" title="Podopravila">
                            <CheckCircle size={11} weight="bold" />
                            {naloga.podopravila.filter((p) => p.done).length}/{naloga.podopravila.length}
                          </span>
                        )}
                        <select
                          className={`tm-prioriteta-select tm-prioriteta-select-${naloga.prioriteta || 'brez'}`}
                          value={naloga.prioriteta || ''}
                          onChange={(e) => nastaviPrioriteto(naloga.id, e.target.value)}
                          disabled={samoOgled}
                          aria-label="Prioriteta"
                          title={samoOgled ? 'Ni na voljo v predogledu (demo)' : 'Nastavi prioriteto'}
                        >
                          <option value="">Prioriteta —</option>
                          {PRIORITETE.map((p) => <option key={p.id} value={p.id}>{p.naziv}</option>)}
                        </select>
                        {dodeljenoIme && <span className="tm-oseba-krog" title={`Dodeljeno: ${dodeljenoIme}`} aria-label={`Dodeljeno: ${dodeljenoIme}`}>{dodeljenoIme.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase()}</span>}
                      </div>
                      <div className="tm-cas">
                        <div className="tm-cas-vrsta">
                          <span className="tm-cas-tekst">{formatUre(porabljene)}h{ocena ? ` / ${ocena}h` : ''}</span>
                          {naloga.isTimerRunning && naloga.timerStartTime && <span className="tm-cas-ziv" aria-label="Tekoči čas">▶ {formatCasSek((zdaj - new Date(naloga.timerStartTime).getTime()) / 1000)}</span>}
                          <button type="button" className={`tm-cas-gumb${naloga.isTimerRunning ? ' tm-cas-gumb-tece' : ''}`} onClick={() => preklopiStoparico(naloga.id)} disabled={samoOgled} aria-label={naloga.isTimerRunning ? 'Ustavi štoparico' : 'Zaženi štoparico'} title={samoOgled ? 'Ni na voljo v predogledu (demo)' : (naloga.isTimerRunning ? 'Ustavi merjenje' : 'Zaženi merjenje')}>
                            {naloga.isTimerRunning ? <Pause size={12} weight="fill" /> : <Play size={12} weight="fill" />}
                          </button>
                        </div>
                        {ocena ? <div className="tm-cas-progres"><div className={`tm-cas-zapolnjeno${prekoracitev ? ' tm-cas-prekoracitev' : ''}`} style={{ width: `${odstotek}%` }} /></div> : null}
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
      )}

      {pogled === 'teden' && (
        <div className="tm-plan">
          <div className="tm-teden-nav">
            <div className="tm-obdobje-preklop" role="tablist" aria-label="Obdobje">
              {OBDOBJA.map((o) => (
                <button key={o.id} type="button" role="tab" aria-selected={obdobjeVrsta === o.id} className={obdobjeVrsta === o.id ? 'tm-pogled-on' : ''} onClick={() => { setObdobjeVrsta(o.id); setObdobjeOffset(0); }}>{o.naziv}</button>
              ))}
            </div>
            <button type="button" className="tm-teden-strelica" onClick={() => setObdobjeOffset((o) => o - 1)} aria-label="Prejšnje obdobje"><CaretLeft size={14} weight="bold" /></button>
            <div className="tm-teden-naslov">
              <strong>{obdobjeNaslov}</strong>
              {obdobjeOffset !== 0 && <button type="button" className="tm-teden-danes" onClick={() => setObdobjeOffset(0)}>Danes</button>}
            </div>
            <button type="button" className="tm-teden-strelica" onClick={() => setObdobjeOffset((o) => o + 1)} aria-label="Naslednje obdobje"><CaretRight size={14} weight="bold" /></button>
            {jeVodjaAliAdmin && !samoOgled && (
              <div className="tm-plan-akcije">
                <button type="button" className="tm-teden-dodaj" onClick={() => setNoviProjektOdprt((v) => !v)}>+ projekt</button>
                <button type="button" className="tm-analitika-gumb" onClick={() => setUrediOddelkeOdprto(true)}>
                  <Buildings size={15} weight="bold" /> Uredi oddelke
                </button>
              </div>
            )}
            {jeVodjaAliAdmin && samoOgled && (
              <p className="tm-demo-namig" style={{ marginLeft: 'auto' }}>Urejanje ni na voljo v predogledu (demo).</p>
            )}
          </div>

          {noviProjektOdprt && jeVodjaAliAdmin && !samoOgled && (
            <div className="tm-forma tm-plan-nov-projekt">
              <div className="tm-forma-glava"><h2>Nov projekt</h2><button type="button" className="tm-x" onClick={() => setNoviProjektOdprt(false)} aria-label="Zapri">×</button></div>
              <label className="tm-polje"><span>Ime projekta</span>
                <input value={noviProjektIme} onChange={(e) => setNoviProjektIme(e.target.value)} placeholder="Npr. Battle for Earth …" autoFocus />
              </label>
              <label className="tm-polje"><span>Poveži s stranko (neobvezno)</span>
                <select value={noviProjektStrankaId} onChange={(e) => { setNoviProjektStrankaId(e.target.value); const s = stranke.find((x) => x.id === e.target.value); if (s && !noviProjektIme.trim()) setNoviProjektIme(s.name); }}>
                  <option value="">— brez —</option>
                  {stranke.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </label>
              <div className="tm-forma-akcije">
                <button type="button" className="tm-preklici" onClick={() => setNoviProjektOdprt(false)}>Prekliči</button>
                <button type="button" className="tm-shrani" disabled={!noviProjektIme.trim()} onClick={dodajProjektVrstico}>Dodaj projekt</button>
              </div>
            </div>
          )}

          {vrsticeProjektov.length === 0 && <p className="tm-prazno">Ni še projektov v tem obdobju{jeVodjaAliAdmin ? ' — dodaj s »+ projekt«.' : '.'}</p>}

          {vrsticeProjektov.length > 0 && (
            <div className="tm-matrika-drs">
              <table className="tm-matrika">
                <thead>
                  <tr>
                    <th className="tm-matrika-projekt-glava">Projekt</th>
                    {stolpciPrikaz.map((o) => (
                      <th key={o.id || 'vse'}>
                        {o.ime}
                        {o.sefId && sodelavci.find((s) => s.id === o.sefId) && (
                          <span className="tm-matrika-sef"> · šef {sodelavci.find((s) => s.id === o.sefId)?.ime}</span>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {vrsticeProjektov.map((vrstica) => (
                    <tr key={vrstica.kljuc}>
                      <th scope="row" className="tm-matrika-projekt">{vrstica.ime}</th>
                      {stolpciPrikaz.map((o) => {
                        const celica = dodelitveVCelici(vrstica, o.id);
                        return (
                          <td key={o.id || 'vse'}>
                            <div className="tm-celica">
                              {celica.map((d) => (
                                <button key={d.id} type="button" className={`tm-celica-cip tm-status-${d.status || 'nacrtovano'}`} onClick={() => odpriUrediDodelitev(d)} title={oznakaNalogDodelitve(d)}>
                                  <span className="tm-oseba-krog" aria-hidden>{initialke(d.osebaIme)}</span>
                                  <span className="tm-celica-cip-tekst">
                                    <strong>{d.osebaIme}</strong>
                                    {d.podrocje && <em>{d.podrocje}</em>}
                                  </span>
                                  <span className="tm-pika tm-celica-cip-pika" aria-hidden />
                                  <span className="tm-celica-cip-znacka">{oznakaKompaktna(d)}</span>
                                </button>
                              ))}
                              {jeVodjaAliAdmin && !samoOgled && (
                                <button type="button" className="tm-celica-dodaj" onClick={() => odpriNovoDodelitev(vrstica, o.id)}>+ dodeli</button>
                              )}
                              {celica.length === 0 && !(jeVodjaAliAdmin && !samoOgled) && <span className="tm-celica-prazno">—</span>}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {dodelitevPanel && (() => {
        const urejena = dodelitevPanel.mode === 'edit' ? dodelitve.find((d) => d.id === dodelitevPanel.dodelitevId) : undefined;
        /* vodja/admin ureja vsa polja (oseba/oddelek/podrocje); ostali (lastnik dodelitve) le nacrt+status */
        const smeVse = jeVodjaAliAdmin && !samoOgled;
        const smeLastno = dodelitevPanel.mode === 'new' ? smeVse : !!urejena && smeUrejatiDodelitev(urejena);
        return (
          <div className="tm-dodelitev-podlaga" onClick={zapriDodelitevPanel}>
            <aside className="tm-dodelitev-panel" onClick={(e) => e.stopPropagation()}>
              <div className="tm-forma-glava">
                <h2>{dodelitevPanel.mode === 'new' ? `Nova dodelitev — ${dodelitevPanel.projektIme}` : `Dodelitev — ${dodelitevPanel.projektIme}`}</h2>
                <button type="button" className="tm-x" onClick={zapriDodelitevPanel} aria-label="Zapri">×</button>
              </div>

              <label className="tm-polje"><span>Oseba</span>
                <select value={ndOsebaId} onChange={(e) => setNdOsebaId(e.target.value)} disabled={!smeVse} autoFocus={dodelitevPanel.mode === 'new'}>
                  <option value="">— izberi —</option>
                  {aktivniSodelavci.map((s) => <option key={s.id} value={s.id}>{s.ime}</option>)}
                </select>
              </label>
              <label className="tm-polje"><span>Oddelek</span>
                <select value={ndOddelekId} onChange={(e) => setNdOddelekId(e.target.value)} disabled={!smeVse}>
                  {oddelki.length === 0 && <option value="">Vse</option>}
                  {oddelki.length > 0 && <option value="">— brez —</option>}
                  {oddelki.map((o) => <option key={o.id} value={o.id}>{o.ime}</option>)}
                </select>
              </label>

              <label className="tm-polje"><span>Področje</span></label>
              <div className="tm-podrocja">
                {podrocja.length === 0 && !dodajOdprt && <p className="tm-podrocja-prazno">Ni še področij — pritisni + za iskanje ali dodajanje.</p>}
                {podrocja.map((p) => (
                  <span key={p.id} className={`tm-podrocje-cip${ndPodrocje === p.ime ? ' tm-izbran' : ''}`}>
                    <button type="button" disabled={!smeVse} onClick={() => setNdPodrocje(ndPodrocje === p.ime ? '' : p.ime)}>{p.ime}</button>
                    <button type="button" className="tm-podrocje-brisi" disabled={!smeVse} aria-label={`Izbriši področje ${p.ime}`} onClick={() => { setPodrocja(izbrisiPodrocje(p.id)); if (ndPodrocje === p.ime) setNdPodrocje(''); }}>×</button>
                  </span>
                ))}
                {smeVse && <button type="button" className="tm-podrocje-plus" aria-label="Poišči ali dodaj področje" onClick={() => setDodajOdprt((v) => !v)}>+</button>}
              </div>
              {dodajOdprt && smeVse && (
                <div className="tm-podrocje-iskalnik">
                  <input autoFocus value={novoPodrocje} onChange={(e) => setNovoPodrocje(e.target.value)} placeholder="Poišči ali dodaj področje …"
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); potrdiPodrocje(); } if (e.key === 'Escape') { setDodajOdprt(false); setNovoPodrocje(''); } }} />
                  <div className="tm-podrocje-zadetki">
                    {podrocja.filter((p) => p.ime.toLowerCase().includes(novoPodrocje.trim().toLowerCase())).map((p) => (
                      <button key={p.id} type="button" onClick={() => { setNdPodrocje(p.ime); setDodajOdprt(false); setNovoPodrocje(''); }}>{p.ime}</button>
                    ))}
                    {novoPodrocje.trim() && !podrocja.some((p) => p.ime.toLowerCase() === novoPodrocje.trim().toLowerCase()) && (
                      <button type="button" className="tm-podrocje-nov" onClick={potrdiPodrocje}>+ Dodaj »{novoPodrocje.trim()}«</button>
                    )}
                  </div>
                </div>
              )}

              {dodelitevPanel.mode === 'new' && (
                <label className="tm-polje"><span>Poveži s stranko (neobvezno)</span>
                  <select value={ndStrankaId} onChange={(e) => setNdStrankaId(e.target.value)}>
                    <option value="">— brez —</option>
                    {stranke.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </label>
              )}

              <label className="tm-polje"><span>Kaj bo delal/a</span>
                <textarea value={ndNacrt} onChange={(e) => setNdNacrt(e.target.value)} placeholder="Načrt za to obdobje …" rows={3} disabled={!smeLastno} />
              </label>

              {dodelitevPanel.mode === 'edit' && (
                <label className="tm-polje"><span>Status</span>
                  <select className="tm-status-select" value={ndStatus} onChange={(e) => setNdStatus(e.target.value as NonNullable<TedenskaDodelitev['status']>)} disabled={!smeLastno}>
                    {STATUSI_DODELITVE.map((s) => <option key={s.id} value={s.id}>{s.naziv}</option>)}
                  </select>
                </label>
              )}

              {dodelitevPanel.mode === 'edit' && urejena && urejena.status === 'preneseno' && smeLastno && (
                <button type="button" className="tm-prenesi-cikel" onClick={() => { prenesiVNaslednjiCikel(urejena); zapriDodelitevPanel(); }}>
                  <CaretRight size={13} weight="bold" /> Prenesi v naslednji cikel
                </button>
              )}

              <div className="tm-forma-akcije">
                {dodelitevPanel.mode === 'edit' && jeVodjaAliAdmin && !samoOgled && (
                  <button type="button" className="tm-preklici" onClick={izbrisiIzPanela}>Izbriši</button>
                )}
                <button type="button" className="tm-preklici" onClick={zapriDodelitevPanel}>Prekliči</button>
                {(dodelitevPanel.mode === 'new' ? smeVse : smeLastno) && (
                  <button type="button" className="tm-shrani" disabled={dodelitevPanel.mode === 'new' && !ndOsebaId} onClick={shraniDodelitevIzPanela}>{dodelitevPanel.mode === 'new' ? 'Dodaj dodelitev' : 'Shrani'}</button>
                )}
              </div>
            </aside>
          </div>
        );
      })()}

      {urediOddelkeOdprto && jeVodjaAliAdmin && (
        <div className="tm-analitika-podlaga" onClick={() => setUrediOddelkeOdprto(false)}>
          <aside className="tm-analitika-panel" onClick={(e) => e.stopPropagation()}>
            <div className="tm-forma-glava">
              <h2>Uredi oddelke</h2>
              <button type="button" className="tm-x" onClick={() => setUrediOddelkeOdprto(false)} aria-label="Zapri">×</button>
            </div>

            <label className="tm-polje"><span>Nov oddelek</span>
              <div className="tm-dodeljeno-vrsta">
                <input value={novOddelekIme} onChange={(e) => setNovOddelekIme(e.target.value)} placeholder="Npr. Dizajn, Video, Produkcija …"
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); dodajOddelekRocno(); } }} />
                <button type="button" className="tm-zase" onClick={dodajOddelekRocno}>+ Dodaj</button>
              </div>
            </label>

            {oddelki.length === 0 && <p className="tm-prazno">Ni še oddelkov — vsi projekti se prikazujejo v enem stolpcu »Vse«.</p>}

            {oddelki.length > 0 && (
              <ul className="tm-oddelki-seznam">
                {oddelki.map((o) => (
                  <li key={o.id} className="tm-oddelki-vrstica">
                    <strong>{o.ime}</strong>
                    <select value={o.sefId || ''} onChange={(e) => posodobiSefaOddelka(o.id, e.target.value)} aria-label={`Šef oddelka ${o.ime}`}>
                      <option value="">— brez šefa —</option>
                      {sodelavci.map((s) => <option key={s.id} value={s.id}>{s.ime}</option>)}
                    </select>
                    <button type="button" className="tm-kartica-x" onClick={() => izbrisiOddelekRocno(o.id)} title="Izbriši oddelek" aria-label={`Izbriši oddelek ${o.ime}`}>×</button>
                  </li>
                ))}
              </ul>
            )}

            <h3 className="tm-analitika-podnaslov">Dodeli sodelavce oddelkom</h3>
            <ul className="tm-oddelki-seznam">
              {sodelavci.map((s) => (
                <li key={s.id} className="tm-oddelki-vrstica">
                  <span className="tm-oseba-krog" aria-hidden>{initialke(s.ime)}</span>
                  <strong>{s.ime}</strong>
                  <select value={s.oddelekId || ''} onChange={(e) => posodobiSodelavcaOddelek(s.id, e.target.value)} aria-label={`Oddelek za ${s.ime}`}>
                    <option value="">— brez oddelka —</option>
                    {oddelki.map((o) => <option key={o.id} value={o.id}>{o.ime}</option>)}
                  </select>
                </li>
              ))}
            </ul>
          </aside>
        </div>
      )}

      {prikaziAnalitiko && jeVodjaAliAdmin && (
        <div className="tm-analitika-podlaga" onClick={() => setPrikaziAnalitiko(false)}>
          <aside className="tm-analitika-panel" onClick={(e) => e.stopPropagation()}>
            <div className="tm-forma-glava">
              <h2>Analitika ekipe</h2>
              <button type="button" className="tm-x" onClick={() => setPrikaziAnalitiko(false)} aria-label="Zapri">×</button>
            </div>
            <label className="tm-polje"><span>Sodelavec</span>
              <select value={analitikaSodelavecId} onChange={(e) => setAnalitikaSodelavecId(e.target.value)}>
                {sodelavci.map((s) => <option key={s.id} value={s.id}>{s.ime} ({s.vloga.toUpperCase()})</option>)}
              </select>
            </label>
            <div className="tm-analitika-stevci">
              <div className="tm-analitika-stevec"><strong>{analitikaNaloge.length}</strong><span>nalog skupaj</span></div>
              <div className="tm-analitika-stevec"><strong>{analitikaKoncane}</strong><span>končanih</span></div>
              <div className="tm-analitika-stevec"><strong>{analitikaUre.toFixed(1)}h</strong><span>porabljenega časa</span></div>
            </div>
            <h3 className="tm-analitika-podnaslov">Zadnjih 10 vnosov zgodovine</h3>
            {analitikaZgodovina.length === 0 && <p className="tm-prazno">Za tega sodelavca še ni zabeleženih aktivnosti.</p>}
            <ul className="tm-analitika-zgodovina">
              {analitikaZgodovina.map((z) => (
                <li key={z.id}>
                  <span className="tm-analitika-datum">{datStr(z.datum)}</span>
                  <span>{z.opis}</span>
                </li>
              ))}
            </ul>
          </aside>
        </div>
      )}

      {odprtaNaloga && (() => {
        const podopravila = odprtaNaloga.podopravila || [];
        const podKoncana = podopravila.filter((p) => p.done).length;
        const dodeljenoImePanel = odprtaNaloga.dodeljenoOsebaIme || odprtaNaloga.dodeljenoOseba || '';
        const porabljenePanel = porabljeneMinute(odprtaNaloga);
        const ocenaPanel = odprtaNaloga.ocenjeniCasUre;
        const oznakePanel = odprtaNaloga.oznake || [];
        return (
        <div className="tm-detajli-podlaga" onClick={() => setOdprtaNalogaId(null)}>
          <aside className="tm-detajli-panel" onClick={(e) => e.stopPropagation()}>
            <div className="tm-detajli-vrh">
              {oznakePanel.length > 0 ? (
                <span className="tm-detajli-tag">{oznakePanel[0]}{oznakePanel.length > 1 ? ` +${oznakePanel.length - 1}` : ''}</span>
              ) : <span />}
              <button type="button" className="tm-x" onClick={() => setOdprtaNalogaId(null)} aria-label="Zapri">×</button>
            </div>

            <h2 className="tm-detajli-naslov">{odprtaNaloga.naslov}</h2>

            <div className="tm-detajli-okvir">
              <textarea
                className="tm-detajli-opis-polje"
                value={odprtaNaloga.opis || ''}
                onChange={(e) => urediOpis(odprtaNaloga.id, e.target.value)}
                placeholder="Opiši kar želiš da se naredi…"
                rows={3}
                disabled={samoOgled}
              />

              <div className="tm-podopravila-wrap">
                {podopravila.length > 0 && (
                  <ul className="tm-podopravila-seznam">
                    {podopravila.map((p) => (
                      <li key={p.id} className="tm-podopravilo">
                        <button
                          type="button"
                          className={`tm-podopravilo-krog${p.done ? ' tm-podopravilo-krog-done' : ''}`}
                          onClick={() => preklopiPodopravilo(odprtaNaloga.id, p.id)}
                          disabled={samoOgled}
                          aria-label={p.done ? 'Označi kot nedokončano' : 'Označi kot dokončano'}
                        >
                          {p.done ? <CheckCircle size={17} weight="fill" /> : <Circle size={17} />}
                        </button>
                        <input
                          className={`tm-podopravilo-tekst${p.done ? ' tm-podopravilo-tekst-done' : ''}`}
                          value={p.besedilo}
                          onChange={(e) => urediPodopravilo(odprtaNaloga.id, p.id, e.target.value)}
                          disabled={samoOgled}
                        />
                        <div className="tm-podopravilo-dodeli-vrsta">
                          {p.dodeljenoOsebaIme ? (
                            <button
                              type="button"
                              className="tm-oseba-krog tm-podopravilo-oseba"
                              title={`Dodeljeno: ${p.dodeljenoOsebaIme}`}
                              aria-label={`Dodeljeno: ${p.dodeljenoOsebaIme} — spremeni`}
                              disabled={samoOgled}
                              onClick={() => setOdpriDodelitevPodId(odpriDodelitevPodId === p.id ? null : p.id)}
                            >
                              {initialke(p.dodeljenoOsebaIme)}
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="tm-podopravilo-dodeli-gumb"
                              title="Dodeli osebo"
                              aria-label="Dodeli osebo podopravilu"
                              disabled={samoOgled}
                              onClick={() => setOdpriDodelitevPodId(odpriDodelitevPodId === p.id ? null : p.id)}
                            >
                              <UserPlus size={13} />
                            </button>
                          )}
                          {odpriDodelitevPodId === p.id && (
                            <select
                              className="tm-podopravilo-dodeli-select"
                              autoFocus
                              value={p.dodeljenoOsebaId || ''}
                              onChange={(e) => { dodeliPodopravilo(odprtaNaloga.id, p.id, e.target.value); setOdpriDodelitevPodId(null); }}
                              onBlur={() => setOdpriDodelitevPodId(null)}
                            >
                              <option value="">— nedodeljeno —</option>
                              {aktivniSodelavci.map((so) => <option key={so.id} value={so.id}>{so.ime}</option>)}
                            </select>
                          )}
                        </div>
                        {!samoOgled && (
                          <button type="button" className="tm-podopravilo-brisi" aria-label="Izbriši podopravilo" onClick={() => izbrisiPodopravilo(odprtaNaloga.id, p.id)}>×</button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
                {!samoOgled && (
                  <div className="tm-podopravilo-dodaj">
                    <input
                      value={novoPodopraviloBesedilo}
                      onChange={(e) => setNovoPodopraviloBesedilo(e.target.value)}
                      placeholder="+ dodaj podopravilo"
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); dodajPodopravilo(odprtaNaloga.id, novoPodopraviloBesedilo); setNovoPodopraviloBesedilo(''); } }}
                    />
                    <button type="button" className="tm-zase" disabled={!novoPodopraviloBesedilo.trim()} onClick={() => { dodajPodopravilo(odprtaNaloga.id, novoPodopraviloBesedilo); setNovoPodopraviloBesedilo(''); }}>+ Dodaj</button>
                  </div>
                )}
              </div>
            </div>

            <div className="tm-detajli-noga">
              {dodeljenoImePanel && <span className="tm-oseba-krog" title={`Dodeljeno: ${dodeljenoImePanel}`}>{initialke(dodeljenoImePanel)}</span>}
              <select
                className={`tm-prioriteta-select tm-prioriteta-select-${odprtaNaloga.prioriteta || 'brez'}`}
                value={odprtaNaloga.prioriteta || ''}
                onChange={(e) => nastaviPrioriteto(odprtaNaloga.id, e.target.value)}
                disabled={samoOgled}
                aria-label="Prioriteta"
              >
                <option value="">Prioriteta —</option>
                {PRIORITETE.map((p) => <option key={p.id} value={p.id}>{p.naziv}</option>)}
              </select>
              <div className="tm-detajli-cas">
                <span className="tm-cas-tekst">{formatUre(porabljenePanel)}h{ocenaPanel ? ` / ${ocenaPanel}h` : ''}</span>
                {odprtaNaloga.isTimerRunning && odprtaNaloga.timerStartTime && (
                  <span className="tm-cas-ziv" aria-label="Tekoči čas">▶ {formatCasSek((zdaj - new Date(odprtaNaloga.timerStartTime).getTime()) / 1000)}</span>
                )}
                <button
                  type="button"
                  className={`tm-cas-gumb${odprtaNaloga.isTimerRunning ? ' tm-cas-gumb-tece' : ''}`}
                  onClick={() => preklopiStoparico(odprtaNaloga.id)}
                  disabled={samoOgled}
                  aria-label={odprtaNaloga.isTimerRunning ? 'Ustavi štoparico' : 'Zaženi štoparico'}
                  title={odprtaNaloga.isTimerRunning ? 'Ustavi merjenje' : 'Zaženi merjenje'}
                >
                  {odprtaNaloga.isTimerRunning ? <Pause size={12} weight="fill" /> : <Play size={12} weight="fill" />}
                </button>
              </div>
              {podopravila.length > 0 && (
                <span className="tm-detajli-podopravila-znacka" title="Podopravila">
                  <CheckCircle size={11} weight="bold" /> {podKoncana}/{podopravila.length}
                </span>
              )}
              {!!odprtaNaloga.komentarji?.length && (
                <span className="tm-detajli-komentarji-znacka" title="Komentarji">
                  <ChatCircleDots size={12} weight="fill" /> {odprtaNaloga.komentarji.length}
                </span>
              )}
            </div>

            <label className="tm-polje tm-detajli-spodaj"><span>Dodeli</span>
              <select value={odprtaNaloga.dodeljenoOsebaId || ''} onChange={(e) => dodeliNalogi(odprtaNaloga.id, e.target.value)} disabled={samoOgled}>
                <option value="">— nedodeljeno —</option>
                {sodelavci.filter((so) => so.aktiven).map((so) => <option key={so.id} value={so.id}>{so.ime}</option>)}
              </select>
            </label>
            <label className="tm-polje"><span>Stranka</span>
              <select value={odprtaNaloga.clientId || ''} onChange={(e) => dodeliStranko(odprtaNaloga.id, e.target.value)} disabled={samoOgled}>
                <option value="">— brez —</option>
                {stranke.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </label>
            <label className="tm-polje"><span>Projekt (neobvezno)</span>
              <input value={odprtaNaloga.projectId || ''} onChange={(e) => nastaviProjekt(odprtaNaloga.id, e.target.value)} placeholder="Naziv projekta, npr. Battle for Earth …" disabled={samoOgled} />
            </label>

            <label className="tm-polje"><span>Oznake</span></label>
            <div className="tm-oznake-panel">
              {(odprtaNaloga.oznake || []).map((o) => (
                <span key={o} className="tm-oznaka-panel-cip">
                  <span>{o}</span>
                  <button type="button" className="tm-oznaka-panel-brisi" disabled={samoOgled} aria-label={`Odstrani oznako ${o}`} onClick={() => odstraniOznako(odprtaNaloga.id, o)}>×</button>
                </span>
              ))}
              {PREDLAGANE_OZNAKE.filter((o) => !(odprtaNaloga.oznake || []).includes(o)).map((o) => (
                <button key={o} type="button" className="tm-oznaka-predlog" disabled={samoOgled} onClick={() => dodajOznako(odprtaNaloga.id, o)}>+ {o}</button>
              ))}
            </div>
            <div className="tm-oznaka-dodaj">
              <input
                value={novaOznaka}
                onChange={(e) => setNovaOznaka(e.target.value)}
                placeholder="Nova oznaka (prosto besedilo) …"
                disabled={samoOgled}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); dodajOznako(odprtaNaloga.id, novaOznaka); setNovaOznaka(''); } }}
              />
              <button type="button" className="tm-zase" disabled={samoOgled || !novaOznaka.trim()} onClick={() => { dodajOznako(odprtaNaloga.id, novaOznaka); setNovaOznaka(''); }}>+ Dodaj</button>
            </div>

            <h3 className="tm-analitika-podnaslov">Komentarji</h3>
            {(!odprtaNaloga.komentarji || odprtaNaloga.komentarji.length === 0) && <p className="tm-prazno">Še ni komentarjev.</p>}
            <ul className="tm-komentarji-seznam">
              {(odprtaNaloga.komentarji || []).map((k) => (
                <li key={k.id}>
                  <div className="tm-komentar-glava"><strong>{k.avtorIme}</strong><span>{datStr(k.cas)}</span></div>
                  <p>{k.besedilo}</p>
                </li>
              ))}
            </ul>
            {!samoOgled ? (
              <form className="tm-komentar-forma" onSubmit={(e) => { e.preventDefault(); dodajKomentar(odprtaNaloga.id, novKomentar); setNovKomentar(''); }}>
                <textarea value={novKomentar} onChange={(e) => setNovKomentar(e.target.value)} placeholder="Dodaj komentar …" rows={2} />
                <button type="submit" className="tm-shrani" disabled={!novKomentar.trim()}>Dodaj komentar</button>
              </form>
            ) : (
              <p className="tm-demo-namig">Dodajanje komentarjev ni na voljo v predogledu (demo).</p>
            )}
          </aside>
        </div>
        );
      })()}

      <style>{`
        .tm{padding:1.6rem clamp(1rem,3vw,2.2rem) 4rem;min-width:0}
        .tm-glava{display:flex;flex-wrap:wrap;align-items:flex-end;justify-content:space-between;gap:1rem;margin-bottom:1.6rem}
        .tm-eyebrow{margin:0 0 .35rem;font:800 .62rem var(--font-sans),sans-serif;letter-spacing:.18em;text-transform:uppercase;color:var(--muted)}
        .tm-naslov{margin:0;font:500 clamp(1.6rem,3vw,2.15rem)/1 var(--font-serif),Georgia,serif;color:var(--ink)}
        .tm-podnaslov{margin:.55rem 0 0;max-width:44ch;color:var(--muted);font-size:.86rem;line-height:1.5}
        .tm-nova{flex:none;padding:.7rem 1.15rem;border:0;border-radius:999px;background:var(--ink);color:var(--paper);font:750 .74rem var(--font-sans),sans-serif;cursor:pointer;transition:transform .18s cubic-bezier(.16,1,.3,1),box-shadow .18s}
        .tm-nova:hover{transform:translateY(-2px);box-shadow:0 .8rem 2rem oklch(22% .04 300/.22)}

        /* glava: preklop uporabnika + gumb za analitiko ekipe */
        .tm-glava-akcije{display:flex;align-items:flex-end;gap:.7rem;flex-wrap:wrap}
        .tm-uporabnik{display:flex;flex-direction:column;gap:.3rem}
        .tm-uporabnik span{font:700 .6rem var(--font-sans),sans-serif;letter-spacing:.06em;text-transform:uppercase;color:var(--muted)}
        .tm-uporabnik select{padding:.55rem .7rem;border:1px solid var(--line);border-radius:.7rem;background:oklch(100% 0 0/.75);font:inherit;font-size:.78rem;color:var(--ink)}
        .tm-uporabnik select:focus{outline:none;border-color:var(--ink)}
        .tm-analitika-gumb{flex:none;display:inline-flex;align-items:center;gap:.4rem;padding:.65rem 1rem;border:1px solid var(--line);border-radius:999px;background:var(--paper);color:var(--ink);font:750 .72rem var(--font-sans),sans-serif;cursor:pointer;transition:background .15s,color .15s}
        .tm-analitika-gumb:hover{background:var(--ink);color:var(--paper)}

        /* panel Analitika ekipe (overlay v Pinart slogu, ne generic modal) */
        .tm-analitika-stevci{display:grid;grid-template-columns:repeat(3,1fr);gap:.6rem;margin:.2rem 0 1.2rem}
        .tm-analitika-stevec{display:flex;flex-direction:column;gap:.2rem;padding:.7rem .6rem;border:1px solid var(--line);border-radius:.8rem;background:oklch(97.5% .008 87/.75);text-align:center}
        .tm-analitika-stevec strong{font:600 1.3rem var(--font-serif),Georgia,serif;color:var(--ink)}
        .tm-analitika-stevec span{font:700 .58rem var(--font-sans),sans-serif;letter-spacing:.03em;text-transform:uppercase;color:var(--muted)}
        .tm-analitika-podnaslov{margin:1.1rem 0 .6rem;font:700 .66rem var(--font-sans),sans-serif;letter-spacing:.08em;text-transform:uppercase;color:var(--muted)}
        .tm-analitika-zgodovina{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:.5rem}
        .tm-analitika-zgodovina li{display:flex;flex-direction:column;gap:.15rem;padding:.6rem .7rem;border:1px solid var(--line);border-radius:.7rem;background:oklch(100% 0 0/.6);font-size:.78rem;color:var(--ink)}
        .tm-analitika-datum{font:700 .6rem var(--font-sans),sans-serif;letter-spacing:.03em;text-transform:uppercase;color:var(--muted)}

        /* obrazec */
        .tm-forma{margin:0 0 1.6rem;max-width:34rem;padding:1.2rem 1.3rem 1.35rem;border:1px solid var(--line);border-radius:1.1rem;background:oklch(99% .006 87/.9);box-shadow:0 1rem 2.6rem oklch(20% .03 55/.08)}
        .tm-forma-glava{display:flex;align-items:center;justify-content:space-between;margin-bottom:.9rem}
        .tm-forma-glava h2{margin:0;font:600 1.2rem var(--font-serif),Georgia,serif;color:var(--ink)}
        .tm-x{width:2rem;height:2rem;border:1px solid var(--line);border-radius:50%;background:var(--paper);color:var(--ink);font-size:1rem;line-height:1;cursor:pointer}
        .tm-x:hover{background:var(--ink);color:var(--paper)}
        .tm-polje{display:flex;flex-direction:column;gap:.3rem;margin-bottom:.8rem}
        .tm-polje span{font:700 .64rem var(--font-sans),sans-serif;letter-spacing:.04em;text-transform:uppercase;color:var(--muted)}
        .tm-polje input,.tm-polje textarea,.tm-polje select{width:100%;padding:.6rem .8rem;border:1px solid var(--line);border-radius:.7rem;background:oklch(100% 0 0/.75);font:inherit;font-size:.86rem;color:var(--ink)}
        .tm-polje input:focus,.tm-polje textarea:focus,.tm-polje select:focus{outline:none;border-color:var(--ink)}
        /* manjkajoča spustna (chevron) ikona na selectih — appearance:none + caret v akcentu */
        .tm-uporabnik select,.tm-polje select,.tm-analitika-panel select{appearance:none;-webkit-appearance:none;-moz-appearance:none;padding-right:2rem;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236E4FA6' stroke-width='2.6' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right .65rem center}
        .tm-polje textarea{resize:vertical;min-height:3.4rem}
        .tm-forma-vrsta{display:flex;gap:.8rem;flex-wrap:wrap}
        .tm-forma-vrsta .tm-polje{flex:1;min-width:9rem}
        .tm-forma-akcije{display:flex;justify-content:flex-end;gap:.6rem;margin-top:.3rem}
        .tm-preklici{padding:.6rem 1rem;border:1px solid var(--line);border-radius:999px;background:var(--paper);color:var(--ink);font:700 .72rem var(--font-sans),sans-serif;cursor:pointer}
        .tm-shrani{padding:.6rem 1.15rem;border:0;border-radius:999px;background:var(--ink);color:var(--paper);font:750 .72rem var(--font-sans),sans-serif;cursor:pointer}
        .tm-shrani:disabled{opacity:.45;cursor:not-allowed}

        /* deska (kanban) */
        /* preklop Kanban|Plan + filtri (Vse/Moje/Zamujene + oznake) v ENI vrstici na namizju,
           prelomi na več vrstic na ozkem zaslonu (flex-wrap) */
        .tm-pogled-filtri-vrsta{display:flex;align-items:center;gap:.8rem;flex-wrap:wrap;margin:0 0 1.1rem}
        .tm-filtri-vrsta{display:flex;align-items:center;gap:.6rem;flex-wrap:wrap;margin:0}
        .tm-filtri{display:inline-flex;gap:.2rem;margin:0;padding:.25rem;border:1px solid var(--line);border-radius:999px;background:oklch(97% .006 87 / .8)}
        .tm-filtri button{padding:.4rem .85rem;border:0;border-radius:999px;background:none;font:700 .68rem var(--font-sans),sans-serif;color:var(--muted);cursor:pointer}
        .tm-filtri button.tm-filter-on{background:var(--ink);color:var(--paper)}
        /* filter po oznaki (tagu) — spustni izbor poleg vse/moje/zamujene */
        .tm-filter-oznaka{appearance:none;-webkit-appearance:none;-moz-appearance:none;padding:.42rem 1.8rem .42rem .85rem;border:1px solid var(--line);border-radius:999px;background-color:oklch(97% .006 87/.8);color:var(--ink);font:700 .68rem var(--font-sans),sans-serif;cursor:pointer;background-repeat:no-repeat;background-position:right .6rem center;background-size:9px;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236E4FA6' stroke-width='2.8' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")}
        .tm-filter-oznaka:focus{outline:none;border-color:var(--ink)}
        /* gumb "Naloži razvojne naloge (Flow)" v glavi + kratko sporocilo ob kliku */
        .tm-seed-gumb{flex:none;padding:.65rem 1rem;border:1px dashed var(--line);border-radius:999px;background:transparent;color:var(--ink);font:750 .7rem var(--font-sans),sans-serif;cursor:pointer;transition:background .15s,color .15s,border-color .15s}
        .tm-seed-gumb:hover{background:var(--ink);color:var(--paper);border-style:solid;border-color:var(--ink)}
        .tm-seed-sporocilo{font:600 .68rem var(--font-sans),sans-serif;color:var(--muted)}
        /* oznake (tagi) na kartici naloge — majhni čipi, klik = filter po tem tagu */
        .tm-kartica-oznake{display:flex;flex-wrap:wrap;gap:.3rem;margin:.5rem 0 0}
        .tm-oznaka-cip{padding:.15rem .5rem;border:1px solid var(--line);border-radius:999px;background:oklch(95% .02 300/.6);color:var(--ink);font:700 .6rem var(--font-sans),sans-serif;cursor:pointer;transition:background .15s,color .15s,border-color .15s}
        .tm-oznaka-cip:hover{border-color:var(--ink)}
        .tm-oznaka-cip-on{background:var(--ink);color:var(--paper);border-color:var(--ink)}
        /* oznake v panelu Podrobnosti naloge — obstoječe (odstranljive) + predlogi + prosto besedilo */
        .tm-oznake-panel{display:flex;flex-wrap:wrap;align-items:center;gap:.4rem;margin:-.3rem 0 .6rem}
        .tm-oznaka-panel-cip{display:inline-flex;align-items:center;border:1px solid var(--ink);border-radius:999px;overflow:hidden;background:var(--ink)}
        .tm-oznaka-panel-cip span{padding:.28rem .3rem .28rem .6rem;color:var(--paper);font:700 .64rem var(--font-sans),sans-serif}
        .tm-oznaka-panel-brisi{padding:.28rem .55rem .28rem .2rem;border:none;background:transparent;color:var(--paper);opacity:.7;font-size:.9rem;line-height:1;cursor:pointer}
        .tm-oznaka-panel-brisi:hover{opacity:1}
        .tm-oznaka-predlog{padding:.28rem .6rem;border:1px dashed var(--line);border-radius:999px;background:transparent;color:var(--ink);opacity:.6;font:700 .62rem var(--font-sans),sans-serif;cursor:pointer}
        .tm-oznaka-predlog:hover{opacity:1;border-style:solid;border-color:var(--ink)}
        .tm-oznaka-dodaj{display:flex;gap:.5rem;margin:0 0 1.1rem}
        .tm-oznaka-dodaj input{flex:1;min-width:0;padding:.55rem .7rem;border:1px solid var(--line);border-radius:.7rem;background:oklch(100% 0 0/.75);font:inherit;font-size:.78rem;color:var(--ink)}
        .tm-oznaka-dodaj input:focus{outline:none;border-color:var(--ink)}
        .tm-cas-ziv{font:800 .68rem var(--font-sans),sans-serif;color:oklch(52% .17 300);font-variant-numeric:tabular-nums;animation:tmUtrip 1.4s ease-in-out infinite}
        @keyframes tmUtrip{0%,100%{opacity:1}50%{opacity:.55}}
        @media (prefers-reduced-motion:reduce){.tm-cas-ziv{animation:none}}
        .tm-deska{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:1rem;align-items:start}
        .tm-stolpec{display:flex;flex-direction:column;min-height:14rem;padding:.85rem;border:1px solid var(--line);border-radius:1.1rem;background:oklch(97.5% .008 87/.75);transition:background .15s,border-color .15s}
        .tm-stolpec-glava{display:flex;align-items:center;gap:.5rem;padding:.15rem .3rem .7rem}
        .tm-stolpec-glava h3{margin:0;flex:1;font:800 .68rem var(--font-sans),sans-serif;letter-spacing:.1em;text-transform:uppercase;color:var(--ink)}
        .tm-pika{width:.6rem;height:.6rem;border-radius:50%;flex:none}
        .tm-st{min-width:1.5rem;height:1.5rem;padding:0 .45rem;display:grid;place-items:center;border-radius:999px;background:oklch(100% 0 0/.7);color:var(--muted);font:800 .66rem var(--font-sans),sans-serif}
        .tm-stolpec[data-stolpec='todo'] .tm-pika{background:oklch(62% .19 300)}
        .tm-stolpec[data-stolpec='in_progress'] .tm-pika{background:oklch(72% .14 165)}
        .tm-stolpec[data-stolpec='waiting'] .tm-pika{background:oklch(74% .15 70)}
        .tm-stolpec[data-stolpec='done'] .tm-pika{background:oklch(68% .16 150)}
        .tm-kartice{display:flex;flex-direction:column;gap:.6rem;flex:1;min-height:3rem}
        .tm-prazno{margin:.4rem;padding:1.2rem .6rem;border:1px dashed var(--line);border-radius:.8rem;color:var(--muted);font-size:.72rem;text-align:center}

        .tm-kartica{padding:.75rem .8rem;border:1px solid var(--line);border-radius:.8rem;background:oklch(100% 0 0/.92);box-shadow:0 .4rem 1rem oklch(20% .03 55/.06);cursor:grab}
        .tm-kartica:active{cursor:grabbing}
        .tm-kartica:hover{border-color:color-mix(in oklch,var(--ink) 24%,transparent)}
        .tm-kartica-vrh{display:flex;align-items:flex-start;gap:.5rem}
        .tm-kartica-vrh strong{flex:1;font-size:.84rem;font-weight:650;line-height:1.35;color:var(--ink)}
        .tm-kartica-x{flex:none;width:1.5rem;height:1.5rem;padding:0;border:0;border-radius:50%;background:transparent;color:var(--muted);font-size:.95rem;line-height:1;cursor:pointer}
        .tm-kartica-x:hover{background:var(--ink);color:var(--paper)}
        .tm-kartica-opis{margin:.4rem 0 0;color:var(--muted);font-size:.74rem;line-height:1.45}
        .tm-rok{display:inline-flex;align-items:center;gap:.3rem;padding:.2rem .5rem;border-radius:999px;background:oklch(95% .01 87);color:var(--muted);font-size:.66rem;font-weight:700}
        .tm-rok-zapadlo{background:oklch(93% .06 30);color:oklch(48% .16 30)}
        .tm-kartica-noga{display:flex;flex-wrap:wrap;align-items:center;gap:.4rem;margin-top:.55rem}
        .tm-oseba{display:inline-flex;align-items:center;gap:.35rem;padding:.15rem .5rem .15rem .15rem;border-radius:999px;background:oklch(94% .03 300);color:oklch(38% .1 300);font-size:.66rem;font-weight:700}
        .tm-oseba-krog{width:1.15rem;height:1.15rem;display:grid;place-items:center;border-radius:50%;background:oklch(62% .19 300);color:#fff;font-size:.54rem;font-weight:800}
        /* naknadna dodelitev na kartici (spustni meni, ne drag-drop -> uporabno na mobilcu) */
        .tm-dodeli{appearance:none;-webkit-appearance:none;-moz-appearance:none;padding:.22rem 1.35rem .22rem .55rem;border:1px dashed var(--line);border-radius:999px;background-color:oklch(100% 0 0/.5);color:var(--muted);font:700 .64rem var(--font-sans),sans-serif;cursor:pointer;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%236E4FA6' stroke-width='2.8' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right .45rem center}
        .tm-dodeli:hover{border-style:solid;border-color:var(--ink);color:var(--ink)}
        /* polje Dodeljeno + gumb Zase */
        .tm-dodeljeno-vrsta{display:flex;gap:.5rem}
        .tm-dodeljeno-vrsta input{flex:1;min-width:0}
        .tm-zase{flex:none;padding:.55rem .8rem;border:1px solid var(--line);border-radius:.7rem;background:var(--paper);color:var(--ink);font:700 .68rem var(--font-sans),sans-serif;cursor:pointer;white-space:nowrap}
        .tm-zase:hover{background:var(--ink);color:var(--paper);border-color:var(--ink)}

        /* stoparica na kartici naloge */
        .tm-kartica-tece{border-color:oklch(62% .19 300);box-shadow:0 0 0 2px oklch(62% .19 300/.28);animation:tm-utrip-obroba 1.8s ease-in-out infinite}
        .tm-tece-znacka{flex:none;padding:.15rem .5rem;border-radius:999px;background:oklch(62% .19 300);color:#fff;font:800 .58rem var(--font-sans),sans-serif;letter-spacing:.04em;text-transform:uppercase;animation:tm-utrip-znacka 1.6s ease-in-out infinite}
        .tm-cas{margin-top:.6rem;padding-top:.55rem;border-top:1px dashed var(--line)}
        .tm-cas-vrsta{display:flex;align-items:center;justify-content:space-between;gap:.6rem}
        .tm-cas-tekst{font:700 .68rem var(--font-sans),sans-serif;color:var(--muted)}
        .tm-cas-gumb{flex:none;width:1.7rem;height:1.7rem;padding:0;display:grid;place-items:center;border:1px solid var(--line);border-radius:50%;background:var(--paper);color:var(--ink);cursor:pointer;transition:background .15s,color .15s,transform .15s}
        .tm-cas-gumb:hover{background:var(--ink);color:var(--paper);transform:scale(1.06)}
        .tm-cas-gumb-tece{background:oklch(62% .19 300);border-color:oklch(62% .19 300);color:#fff}
        .tm-cas-gumb-tece:hover{background:oklch(56% .19 300);color:#fff}
        .tm-cas-progres{margin-top:.4rem;height:.3rem;border-radius:999px;background:oklch(93% .01 87);overflow:hidden}
        .tm-cas-zapolnjeno{height:100%;border-radius:999px;background:oklch(62% .19 300);transition:width .3s ease}
        .tm-cas-prekoracitev{background:oklch(58% .19 30)}
        @keyframes tm-utrip-znacka{0%,100%{opacity:1}50%{opacity:.5}}
        @keyframes tm-utrip-obroba{0%,100%{box-shadow:0 0 0 2px oklch(62% .19 300/.28)}50%{box-shadow:0 0 0 4px oklch(62% .19 300/.12)}}

        /* preklop pogleda Kanban | Tedenski plan — isti segmentirani slog kot .tm-filtri */
        .tm-pogled-preklop{display:inline-flex;flex:none;gap:.2rem;margin:0;padding:.25rem;border:1px solid var(--line);border-radius:999px;background:oklch(97% .006 87 / .8)}
        .tm-pogled-preklop button{padding:.42rem .95rem;border:0;border-radius:999px;background:none;font:750 .7rem var(--font-sans),sans-serif;color:var(--muted);cursor:pointer}
        .tm-pogled-preklop button.tm-pogled-on{background:var(--ink);color:var(--paper)}

        /* znacka stranke na kartici (naloga <-> stranka) */
        .tm-stranka-znacka{display:inline-flex;align-items:center;padding:.2rem .55rem;border-radius:999px;background:oklch(92% .05 165);color:oklch(34% .09 165);font-size:.66rem;font-weight:700}

        /* prioriteta — select je hkrati barvni pill (isti chevron kot ostali selecti v datoteki) */
        .tm-prioriteta-select{appearance:none;-webkit-appearance:none;-moz-appearance:none;padding:.2rem 1.3rem .2rem .55rem;border:1px solid transparent;border-radius:999px;font:700 .62rem var(--font-sans),sans-serif;cursor:pointer;background-repeat:no-repeat;background-position:right .4rem center;background-size:9px;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236E4FA6' stroke-width='2.8' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")}
        .tm-prioriteta-select-brez{background-color:oklch(96% .006 87);color:var(--muted);border-color:var(--line)}
        .tm-prioriteta-select-visoka{background-color:oklch(58% .16 35);color:#fff}
        .tm-prioriteta-select-srednja{background-color:oklch(89% .015 80);color:var(--ink)}
        .tm-prioriteta-select-nizka{background-color:oklch(95% .008 87);color:var(--muted)}

        /* gumb "podrobnosti + komentarji" na kartici */
        .tm-kartica-komentarji{flex:none;display:inline-flex;align-items:center;gap:.2rem;padding:.15rem .35rem;border:0;border-radius:999px;background:transparent;color:var(--muted);cursor:pointer}
        .tm-kartica-komentarji:hover{background:oklch(94% .01 87);color:var(--ink)}
        .tm-kartica-komentarji-st{font:800 .58rem var(--font-sans),sans-serif;color:inherit}

        /* podlaga/panel v Pinart slogu — deljeno med Analitiko, Podrobnosti naloge in Novo dodelitev */
        .tm-analitika-podlaga,.tm-detajli-podlaga,.tm-dodelitev-podlaga{position:fixed;inset:0;z-index:95;display:flex;justify-content:flex-end;background:oklch(20% .02 55/.32);backdrop-filter:blur(2px)}
        .tm-analitika-panel,.tm-detajli-panel,.tm-dodelitev-panel{width:min(26rem,92vw);height:100%;overflow-y:auto;padding:1.4rem 1.5rem 2.4rem;background:var(--paper);border-left:1px solid var(--line);box-shadow:-1.2rem 0 3rem oklch(20% .03 55/.14)}
        /* detajl naloge dobi malo vec prostora za checklist podopravil */
        .tm-detajli-panel{width:min(29rem,94vw)}

        /* --- Detajl naloge po Tininem mockupu: tag+zapri zgoraj, velik naslov (sans, NE serif),
           zaobljen okvir z opisom+checklistom, spodnja vrstica (oseba/prioriteta/stoparica) --- */
        .tm-detajli-vrh{display:flex;align-items:center;justify-content:space-between;gap:.6rem;margin-bottom:.7rem}
        .tm-detajli-tag{padding:.28rem .7rem;border-radius:999px;background:oklch(94% .03 300);color:oklch(38% .1 300);font:800 .62rem var(--font-sans),sans-serif;letter-spacing:.05em;text-transform:uppercase}
        .tm-detajli-naslov{margin:0 0 1rem;font:700 clamp(1.15rem,2vw,1.4rem)/1.3 var(--font-sans),sans-serif;color:var(--ink)}
        .tm-detajli-okvir{margin:0 0 1.1rem;padding:.9rem 1rem 1rem;border:1px solid var(--line);border-radius:1rem;background:oklch(99% .006 87/.7)}
        .tm-detajli-opis-polje{display:block;width:100%;box-sizing:border-box;padding:0 0 .8rem;border:0;border-bottom:1px dashed var(--line);border-radius:0;background:transparent;resize:vertical;min-height:3.6rem;font:400 .85rem/1.55 var(--font-sans),sans-serif;color:var(--ink)}
        .tm-detajli-opis-polje::placeholder{color:var(--muted)}
        .tm-detajli-opis-polje:focus{outline:none;border-color:var(--ink)}
        .tm-podopravila-wrap{padding-top:.7rem}
        .tm-podopravila-seznam{list-style:none;margin:0 0 .5rem;padding:0;display:flex;flex-direction:column;gap:.3rem}
        .tm-podopravilo{display:flex;align-items:center;gap:.5rem}
        .tm-podopravilo-krog{flex:none;display:grid;place-items:center;width:1.6rem;height:1.6rem;padding:0;border:0;border-radius:50%;background:transparent;color:var(--muted);cursor:pointer}
        .tm-podopravilo-krog:hover{color:var(--ink)}
        .tm-podopravilo-krog-done{color:oklch(62% .19 300)}
        .tm-podopravilo-tekst{flex:1;min-width:0;padding:.25rem 0;border:0;background:transparent;font:400 .82rem var(--font-sans),sans-serif;color:var(--ink)}
        .tm-podopravilo-tekst:focus{outline:none}
        .tm-podopravilo-tekst-done{color:var(--muted);text-decoration:line-through}
        .tm-podopravilo-dodeli-vrsta{position:relative;flex:none}
        .tm-podopravilo-dodeli-gumb{width:1.5rem;height:1.5rem;display:grid;place-items:center;border:1px dashed var(--line);border-radius:50%;background:transparent;color:var(--muted);cursor:pointer}
        .tm-podopravilo-dodeli-gumb:hover{border-style:solid;border-color:var(--ink);color:var(--ink)}
        .tm-podopravilo-oseba{border:0;padding:0;cursor:pointer}
        .tm-podopravilo-dodeli-select{position:absolute;top:110%;right:0;z-index:5;min-width:9rem;padding:.4rem .6rem;border:1px solid var(--line);border-radius:.6rem;background:var(--paper);color:var(--ink);font:600 .74rem var(--font-sans),sans-serif;box-shadow:0 .5rem 1.4rem oklch(20% .03 55/.14)}
        .tm-podopravilo-brisi{flex:none;width:1.3rem;height:1.3rem;padding:0;border:0;border-radius:50%;background:transparent;color:var(--muted);opacity:.6;font-size:.85rem;line-height:1;cursor:pointer}
        .tm-podopravilo-brisi:hover{opacity:1;background:oklch(94% .01 87);color:var(--ink)}
        .tm-podopravilo-dodaj{display:flex;gap:.5rem;margin-top:.4rem;padding-top:.5rem;border-top:1px dashed var(--line)}
        .tm-podopravilo-dodaj input{flex:1;min-width:0;padding:.45rem .6rem;border:0;background:transparent;font:400 .8rem var(--font-sans),sans-serif;color:var(--ink)}
        .tm-podopravilo-dodaj input:focus{outline:none}
        .tm-podopravilo-dodaj input::placeholder{color:var(--muted)}

        /* spodnja vrstica detajla: dodeljena oseba + prioriteta pill + stoparica + znacke */
        .tm-detajli-noga{display:flex;align-items:center;gap:.6rem;flex-wrap:wrap;margin:0 0 1.1rem;padding-bottom:1rem;border-bottom:1px solid var(--line)}
        .tm-detajli-cas{display:flex;align-items:center;gap:.45rem;margin-left:auto}
        .tm-detajli-podopravila-znacka,.tm-detajli-komentarji-znacka{display:inline-flex;align-items:center;gap:.25rem;padding:.2rem .5rem;border-radius:999px;background:oklch(95% .01 87);color:var(--muted);font:700 .64rem var(--font-sans),sans-serif}
        .tm-detajli-spodaj{margin-top:0}

        /* mini napredek podopravil na kartici v kanbanu — nevsiljiv */
        .tm-kartica-podopravila{display:inline-flex;align-items:center;gap:.22rem;padding:.15rem .45rem;border-radius:999px;background:oklch(95% .01 87);color:var(--muted);font:700 .62rem var(--font-sans),sans-serif}

        /* nit komentarjev na nalogi */
        .tm-komentarji-seznam{list-style:none;margin:.2rem 0 1rem;padding:0;display:flex;flex-direction:column;gap:.5rem}
        .tm-komentarji-seznam li{padding:.6rem .7rem;border:1px solid var(--line);border-radius:.7rem;background:oklch(100% 0 0/.6)}
        .tm-komentar-glava{display:flex;align-items:baseline;justify-content:space-between;gap:.6rem}
        .tm-komentar-glava strong{font-size:.76rem;color:var(--ink);font-weight:650}
        .tm-komentar-glava span{font:700 .58rem var(--font-sans),sans-serif;letter-spacing:.03em;text-transform:uppercase;color:var(--muted)}
        .tm-komentarji-seznam li p{margin:.3rem 0 0;font-size:.8rem;line-height:1.5;color:var(--ink)}
        .tm-komentar-forma{display:flex;flex-direction:column;gap:.5rem}
        .tm-komentar-forma textarea{width:100%;padding:.6rem .8rem;border:1px solid var(--line);border-radius:.7rem;background:oklch(100% 0 0/.75);font:inherit;font-size:.84rem;color:var(--ink);resize:vertical;min-height:3rem}
        .tm-komentar-forma textarea:focus{outline:none;border-color:var(--ink)}
        .tm-komentar-forma .tm-shrani{align-self:flex-end}

        /* Plan / sefov razpored dodelitev — matrika projekt × oddelek */
        .tm-teden-nav{display:flex;align-items:center;gap:.7rem;flex-wrap:wrap;margin-bottom:1.1rem}
        .tm-teden-strelica{flex:none;width:2rem;height:2rem;display:grid;place-items:center;border:1px solid var(--line);border-radius:50%;background:var(--paper);color:var(--ink);cursor:pointer;transition:background .15s,color .15s}
        .tm-teden-strelica:hover{background:var(--ink);color:var(--paper)}
        .tm-teden-naslov{display:flex;align-items:center;gap:.6rem}
        .tm-teden-naslov strong{font:600 1.05rem var(--font-serif),Georgia,serif;color:var(--ink)}
        .tm-teden-danes{padding:.3rem .7rem;border:1px solid var(--line);border-radius:999px;background:var(--paper);color:var(--ink);opacity:.65;font:700 .64rem var(--font-sans),sans-serif;cursor:pointer}
        .tm-teden-danes:hover{opacity:1;border-color:var(--ink)}
        .tm-obdobje-preklop{display:inline-flex;gap:.2rem;padding:.25rem;border:1px solid var(--line);border-radius:999px;background:oklch(97% .006 87 / .8)}
        .tm-obdobje-preklop button{padding:.4rem .85rem;border:0;border-radius:999px;background:none;font:700 .68rem var(--font-sans),sans-serif;color:var(--ink);opacity:.62;cursor:pointer}
        .tm-obdobje-preklop button.tm-pogled-on{background:var(--ink);color:var(--paper);opacity:1}
        .tm-plan-akcije{margin-left:auto;display:flex;align-items:center;gap:.6rem;flex-wrap:wrap}
        .tm-teden-dodaj{flex:none;padding:.35rem .75rem;border:1px dashed var(--line);border-radius:999px;background:transparent;color:var(--ink);opacity:.65;font:700 .66rem var(--font-sans),sans-serif;cursor:pointer}
        .tm-teden-dodaj:hover{border-style:solid;border-color:var(--ink);opacity:1}
        .tm-plan-nov-projekt{max-width:26rem}

        /* status dodelitve — samostojen pill-select, isti chevron kot ostali selecti */
        .tm-status-select{appearance:none;-webkit-appearance:none;-moz-appearance:none;padding:.2rem 1.3rem .2rem .55rem;border:1px solid var(--line);border-radius:999px;font:700 .62rem var(--font-sans),sans-serif;cursor:pointer;background-color:oklch(96% .006 87);color:var(--ink);background-repeat:no-repeat;background-position:right .4rem center;background-size:9px;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236E4FA6' stroke-width='2.8' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")}
        .tm-status-select:disabled{opacity:.6;cursor:not-allowed}

        /* gumb "Prenesi v naslednji cikel" — ustvari kopijo PRENESENE dodelitve v naslednjem obdobju */
        .tm-prenesi-cikel{display:inline-flex;align-items:center;gap:.35rem;align-self:flex-start;margin:-.2rem 0 .8rem;padding:.5rem .8rem;border:1px dashed var(--line);border-radius:999px;background:transparent;color:var(--ink);font:700 .68rem var(--font-sans),sans-serif;cursor:pointer;transition:background .15s,color .15s,border-color .15s}
        .tm-prenesi-cikel:hover{background:var(--ink);color:var(--paper);border-style:solid;border-color:var(--ink)}

        /* namig, da pisanje v predogledu (demo) ni na voljo — enak vzorec kot ostali prazni/opozorilni namigi */
        .tm-demo-namig{margin:0;font:400 .74rem var(--font-sans),sans-serif;color:var(--ink);opacity:.6}

        /* matrika: vrstice=projekti, stolpci=oddelki */
        .tm-matrika-drs{overflow-x:auto;border:1px solid var(--line);border-radius:1rem;background:oklch(97.5% .008 87/.5)}
        .tm-matrika{width:100%;border-collapse:collapse;min-width:38rem}
        .tm-matrika thead th{position:sticky;top:0;padding:.7rem .9rem;text-align:left;font:800 .64rem var(--font-sans),sans-serif;letter-spacing:.06em;text-transform:uppercase;color:var(--ink);opacity:.6;background:oklch(97.5% .008 87/.95);border-bottom:1px solid var(--line);white-space:nowrap}
        .tm-matrika-sef{text-transform:none;letter-spacing:0;font-weight:600;opacity:.75}
        .tm-matrika-projekt-glava{min-width:9rem}
        .tm-matrika tbody th.tm-matrika-projekt{text-align:left;padding:.7rem .9rem;font:650 .82rem var(--font-serif),Georgia,serif;color:var(--ink);white-space:nowrap;border-bottom:1px solid var(--line);vertical-align:top}
        .tm-matrika tbody td{padding:.5rem;border-bottom:1px solid var(--line);border-left:1px solid var(--line);vertical-align:top;min-width:11rem}
        .tm-matrika tbody tr:last-child th,.tm-matrika tbody tr:last-child td{border-bottom:none}

        .tm-celica{display:flex;flex-direction:column;gap:.35rem}
        .tm-celica-cip{display:flex;align-items:center;gap:.4rem;padding:.35rem .5rem;border:1px solid var(--line);border-radius:.7rem;background:oklch(100% 0 0/.9);cursor:pointer;text-align:left;transition:border-color .15s,box-shadow .15s}
        .tm-celica-cip:hover{border-color:color-mix(in oklch,var(--ink) 30%,transparent);box-shadow:0 .3rem .8rem oklch(20% .03 55/.06)}
        .tm-celica-cip-tekst{flex:1;min-width:0;display:flex;flex-direction:column;gap:.05rem}
        .tm-celica-cip-tekst strong{font-size:.72rem;font-weight:650;line-height:1.2;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .tm-celica-cip-tekst em{font:400 .62rem var(--font-sans),sans-serif;font-style:normal;color:var(--ink);opacity:.55}
        .tm-celica-cip-pika{width:.45rem;height:.45rem;flex:none}
        .tm-status-nacrtovano .tm-celica-cip-pika{background:oklch(62% .19 300)}
        .tm-status-opravljeno .tm-celica-cip-pika{background:oklch(68% .16 150)}
        .tm-status-delno .tm-celica-cip-pika{background:oklch(74% .15 70)}
        .tm-status-preneseno .tm-celica-cip-pika{background:oklch(58% .16 30)}
        .tm-celica-cip-znacka{flex:none;padding:.1rem .4rem;border-radius:999px;background:oklch(95% .01 87);color:var(--ink);opacity:.65;font:700 .58rem var(--font-sans),sans-serif}
        .tm-celica-dodaj{align-self:flex-start;padding:.3rem .55rem;border:1px dashed var(--line);border-radius:.7rem;background:transparent;color:var(--ink);opacity:.4;font:700 .62rem var(--font-sans),sans-serif;cursor:pointer}
        .tm-celica-dodaj:hover{opacity:1;border-style:solid;border-color:var(--ink)}
        .tm-celica-prazno{padding:.35rem 0;color:var(--ink);opacity:.3;font-size:.74rem}

        /* panel Uredi oddelke */
        .tm-oddelki-seznam{list-style:none;margin:.2rem 0 1.1rem;padding:0;display:flex;flex-direction:column;gap:.5rem}
        .tm-oddelki-vrstica{display:flex;align-items:center;gap:.5rem;padding:.5rem .6rem;border:1px solid var(--line);border-radius:.7rem;background:oklch(100% 0 0/.6)}
        .tm-oddelki-vrstica strong{flex:1;min-width:0;font-size:.78rem;font-weight:650;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .tm-oddelki-vrstica select{flex:none;max-width:11rem;padding:.4rem 1.8rem .4rem .55rem;border:1px solid var(--line);border-radius:.6rem;background-color:var(--paper);font:inherit;font-size:.72rem;color:var(--ink)}

        /* lastna področja dela — čipi + gumb »+« za iskanje/dodajanje (urejljivo, ne trdo zakodirano) */
        .tm-podrocja{display:flex;flex-wrap:wrap;align-items:center;gap:.4rem;margin:-.4rem 0 .5rem}
        .tm-podrocja-prazno{font:400 .68rem var(--font-sans),sans-serif;color:var(--ink);opacity:.6;margin:0}
        .tm-podrocje-cip{display:inline-flex;align-items:center;border:1px solid var(--line);border-radius:999px;overflow:hidden;background:transparent}
        .tm-podrocje-cip>button:first-child{padding:.28rem .55rem;border:none;background:transparent;color:var(--ink);font:700 .64rem var(--font-sans),sans-serif;cursor:pointer}
        .tm-podrocje-cip.tm-izbran{border-color:var(--ink);background:var(--ink)}
        .tm-podrocje-cip.tm-izbran>button:first-child{color:var(--paper)}
        .tm-podrocje-brisi{padding:.28rem .45rem .28rem .2rem;border:none;background:transparent;color:var(--ink);opacity:.45;font-size:.9rem;line-height:1;cursor:pointer}
        .tm-podrocje-brisi:hover{opacity:1}
        .tm-podrocje-cip.tm-izbran .tm-podrocje-brisi{color:var(--paper);opacity:.7}
        .tm-podrocje-plus{width:1.9rem;height:1.9rem;display:inline-flex;align-items:center;justify-content:center;border:1px dashed var(--line);border-radius:999px;background:transparent;color:var(--ink);font-size:1.05rem;line-height:1;cursor:pointer}
        .tm-podrocje-plus:hover{border-style:solid;border-color:var(--ink)}
        .tm-podrocje-iskalnik{margin:0 0 .8rem;border:1px solid var(--line);border-radius:10px;padding:.5rem;background:oklch(97% .005 87)}
        .tm-podrocje-iskalnik>input{width:100%;padding:.35rem .55rem;border:1px solid var(--line);border-radius:8px;font:400 .72rem var(--font-sans),sans-serif;background:var(--paper);color:var(--ink)}
        .tm-podrocje-zadetki{display:flex;flex-wrap:wrap;gap:.35rem;margin-top:.5rem}
        .tm-podrocje-zadetki button{padding:.28rem .6rem;border:1px solid var(--line);border-radius:999px;background:var(--paper);color:var(--ink);font:700 .62rem var(--font-sans),sans-serif;cursor:pointer}
        .tm-podrocje-zadetki button:hover{background:var(--ink);color:var(--paper)}
        .tm-podrocje-nov{border-style:dashed !important}

        @media (max-width:860px){
          .tm-deska{grid-template-columns:none;grid-auto-flow:column;grid-auto-columns:82vw;overflow-x:auto;scroll-snap-type:x mandatory;padding-bottom:.6rem}
          .tm-stolpec{scroll-snap-align:start}
          .tm-plan-akcije{margin-left:0;width:100%}
          .tm-matrika tbody td,.tm-matrika-projekt-glava,.tm-matrika tbody th.tm-matrika-projekt{min-width:9rem}
        }
      `}</style>
    </div>
  );
}
