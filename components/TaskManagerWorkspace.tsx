'use client';

/* TASK MANAGER (Kanban) — logika (data model, dodaj/izbriši, drag&drop) po Geminijevi
   specifikaciji (lib/naloge.ts), JSX + videz rekonstruirana v Pinart slogu (kremno,
   Bodoni, ink, akcent). Lasten prefiksiran <style> blok (tm-), da ne trči s .shell. */

import React, { useState, useEffect } from 'react';
import { Pause, Play, ChartBar, ChatCircleDots, CaretLeft, CaretRight, ArrowBendUpRight } from '@phosphor-icons/react';
import {
  Naloga,
  NalogaStolpec,
  NalogaKomentar,
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
  preberiCikelTednov,
  shraniCikelTednov,
} from '@/lib/naloge';
import { preberiSodelavci } from '@/lib/sodelavci';
import { loadFlowData, type FlowClient } from '@/lib/pinartFlowStore';

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

const STATUSI_DODELITVE: { id: NonNullable<TedenskaDodelitev['status']>; naziv: string }[] = [
  { id: 'nacrtovano', naziv: 'Načrtovano' },
  { id: 'opravljeno', naziv: 'Opravljeno' },
  { id: 'delno', naziv: 'Delno' },
  { id: 'preneseno', naziv: 'Preneseno' },
];

const NAMIGI_PODROCJE = ['desktop', 'mobile', 'CGP', 'styleguide'];

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
/* ponedeljek tekočega tedna, opolnoči lokalno */
const zacetekTedna = (): Date => {
  const d = new Date();
  const dan = d.getDay();
  const diff = dan === 0 ? -6 : 1 - dan;
  const pon = new Date(d.getFullYear(), d.getMonth(), d.getDate() + diff);
  pon.setHours(0, 0, 0, 0);
  return pon;
};
const sklonNalog = (n: number) => (n === 1 ? 'naloga' : n >= 2 && n <= 4 ? 'naloge' : 'nalog');
const sklonKoncanih = (n: number) => (n === 1 ? 'končana' : n >= 2 && n <= 4 ? 'končani' : 'končanih');

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

  /* --- stranke (za povezavo naloga ↔ stranka/projekt) --- */
  const [stranke, setStranke] = useState<FlowClient[]>([]);

  /* --- podrobnosti/komentarji naloge (odprti panel) --- */
  const [odprtaNalogaId, setOdprtaNalogaId] = useState<string | null>(null);
  const [novKomentar, setNovKomentar] = useState('');

  /* --- Tedenski plan / šefov razpored dodelitev --- */
  const [pogled, setPogled] = useState<'kanban' | 'teden'>('kanban');
  const [dodelitve, setDodelitve] = useState<TedenskaDodelitev[]>([]);
  const [cikelTednov, setCikelTednov] = useState(1);
  const [ciklusOffset, setCiklusOffset] = useState(0);
  const [novaDodelitevOsebaId, setNovaDodelitevOsebaId] = useState<string | null>(null);
  const [ndProjektIme, setNdProjektIme] = useState('');
  const [ndPodrocje, setNdPodrocje] = useState('');
  const [ndStrankaId, setNdStrankaId] = useState('');
  const [ndNacrt, setNdNacrt] = useState('');

  const trenutni = sodelavci.find((s) => s.id === trenutniId) || sodelavci[0];
  const jeVodjaAliAdmin = trenutni.vloga === 'vodja' || trenutni.vloga === 'admin';

  useEffect(() => {
    setNaloge(preberiNaloge());
    setZgodovina(preberiZgodovino());
    setSodelavci(preberiSodelavci());
    setStranke(loadFlowData().clients);
    setDodelitve(preberiDodelitve());
    setCikelTednov(preberiCikelTednov());
  }, []);

  const posodobiInShrani = (noveNaloge: Naloga[]) => { setNaloge(noveNaloge); shraniNaloge(noveNaloge); };

  const dodajNalogo = (e: React.FormEvent) => {
    e.preventDefault();
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
    const so = sodelavci.find((x) => x.id === sodelavecId);
    const naloga = naloge.find((n) => n.id === id);
    posodobiInShrani(naloge.map((n) => (n.id === id ? { ...n, dodeljenoOsebaId: sodelavecId || undefined, dodeljenoOsebaIme: so?.ime } : n)));
    if (naloga) { zabeleziAktivnost(id, trenutni.ime, so ? `Dodelil nalogo »${naloga.naslov}« osebi ${so.ime}` : `Odstranil dodelitev na »${naloga.naslov}«`); setZgodovina(preberiZgodovino()); }
  };

  const izbrisiNalogo = (id: string) => {
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
    posodobiInShrani(naloge.map((n) => (n.id === id ? { ...n, projectId: projectId.trim() || undefined } : n)));
  };

  const nastaviPrioriteto = (id: string, prioriteta: string) => {
    posodobiInShrani(naloge.map((n) => (n.id === id ? { ...n, prioriteta: (prioriteta || undefined) as Naloga['prioriteta'] } : n)));
  };

  const dodajKomentar = (id: string, besedilo: string) => {
    if (!besedilo.trim()) return;
    const nov: NalogaKomentar = { id: 'kom_' + Date.now(), avtorIme: trenutni.ime || 'Jaz', besedilo: besedilo.trim(), cas: new Date().toISOString() };
    posodobiInShrani(naloge.map((n) => (n.id === id ? { ...n, komentarji: [...(n.komentarji || []), nov] } : n)));
  };

  /* --- Tedenski plan / šefov razpored dodelitev --- */
  const osveziDodelitve = () => setDodelitve(preberiDodelitve());

  const spremeniCikel = (n: number) => { setCikelTednov(n); shraniCikelTednov(n); setCiklusOffset(0); };

  const ciklusZacetek = (() => { const d = new Date(zacetekTedna()); d.setDate(d.getDate() + ciklusOffset * cikelTednov * 7); return d; })();
  const ciklusZacetekStr = toDateStr(ciklusZacetek);
  const ciklusKonecEksklStr = (() => { const d = new Date(ciklusZacetek); d.setDate(d.getDate() + cikelTednov * 7); return toDateStr(d); })();
  const ciklusZadnjiDan = (() => { const d = new Date(ciklusZacetek); d.setDate(d.getDate() + cikelTednov * 7 - 1); return d; })();
  const ciklusNaslov = `${ciklusZacetek.toLocaleDateString('sl-SI', { day: 'numeric', month: 'short' })} – ${ciklusZadnjiDan.toLocaleDateString('sl-SI', { day: 'numeric', month: 'short', year: 'numeric' })}`;

  const smeUrejatiDodelitev = (d: TedenskaDodelitev) => jeVodjaAliAdmin || d.osebaId === trenutni.id;

  const dodelitveZaOsebo = (osebaId: string) => dodelitve
    .filter((d) => d.osebaId === osebaId && d.tedenZacetek >= ciklusZacetekStr && d.tedenZacetek < ciklusKonecEksklStr)
    .sort((a, b) => a.projektIme.localeCompare(b.projektIme));

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

  const ustvariDodelitev = () => {
    const oseba = sodelavci.find((s) => s.id === novaDodelitevOsebaId);
    if (!oseba || !ndProjektIme.trim()) return;
    const nova: TedenskaDodelitev = {
      id: 'dod_' + Date.now(),
      osebaId: oseba.id,
      osebaIme: oseba.ime,
      projektId: ndStrankaId || undefined,
      projektIme: ndProjektIme.trim(),
      podrocje: ndPodrocje.trim() || undefined,
      tedenZacetek: ciklusZacetekStr,
      nacrt: ndNacrt.trim() || undefined,
      status: 'nacrtovano',
    };
    shraniDodelitev(nova);
    osveziDodelitve();
    setNovaDodelitevOsebaId(null); setNdProjektIme(''); setNdPodrocje(''); setNdStrankaId(''); setNdNacrt('');
  };

  const nastaviNacrtDodelitve = (id: string, nacrt: string) => {
    const d = dodelitve.find((x) => x.id === id);
    if (!d) return;
    shraniDodelitev({ ...d, nacrt: nacrt || undefined });
    osveziDodelitve();
  };

  const nastaviStatusDodelitve = (id: string, status: string) => {
    const d = dodelitve.find((x) => x.id === id);
    if (!d) return;
    shraniDodelitev({ ...d, status: (status || undefined) as TedenskaDodelitev['status'] });
    osveziDodelitve();
  };

  const prerazporediDodelitevOsebi = (id: string, osebaId: string) => {
    const d = dodelitve.find((x) => x.id === id);
    const oseba = sodelavci.find((s) => s.id === osebaId);
    if (!d || !oseba) return;
    shraniDodelitev({ ...d, osebaId: oseba.id, osebaIme: oseba.ime });
    osveziDodelitve();
  };

  const odstraniDodelitev = (id: string) => { izbrisiDodelitev(id); osveziDodelitve(); };

  /* "preneseno" = neopravljeno gre naprej — kopija v naslednji ciklus, status nazaj na nacrtovano */
  const prenesiVNaslednjiCiklus = (d: TedenskaDodelitev) => {
    const naslednji = new Date(ciklusZacetek);
    naslednji.setDate(naslednji.getDate() + cikelTednov * 7);
    const nova: TedenskaDodelitev = { ...d, id: 'dod_' + Date.now(), tedenZacetek: toDateStr(naslednji), status: 'nacrtovano' };
    shraniDodelitev(nova);
    osveziDodelitve();
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

  const handleDragStart = (e: React.DragEvent, id: string) => { setDraggedCardId(id); e.dataTransfer.setData('text/plain', id); };
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); };
  const handleDrop = (e: React.DragEvent, ciljniStolpec: NalogaStolpec) => {
    e.preventDefault();
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
  /* Hitri filter nad Kanban tablo: vse / moje / zamujene (rok pred danes in ni končano) */
  const danesStr = new Date().toISOString().slice(0, 10);
  const prikazaneNaloge = vidneNaloge.filter((n) => {
    if (filter === 'moje') return n.dodeljenoOsebaId === trenutni.id || (n.dodeljenoOseba || '') === trenutni.ime;
    if (filter === 'zamujene') return !!n.rok && n.rok < danesStr && n.stolpec !== 'done';
    return true;
  });

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
          <button type="button" className="tm-nova" onClick={() => { setPogled('kanban'); setAktivniStolpec('todo'); setPrikaziFormo(true); }}>+ Nova naloga</button>
        </div>
      </header>

      <div className="tm-pogled-preklop" role="tablist" aria-label="Pogled">
        <button type="button" role="tab" aria-selected={pogled === 'kanban'} className={pogled === 'kanban' ? 'tm-pogled-on' : ''} onClick={() => setPogled('kanban')}>Kanban</button>
        <button type="button" role="tab" aria-selected={pogled === 'teden'} className={pogled === 'teden' ? 'tm-pogled-on' : ''} onClick={() => setPogled('teden')}>Tedenski plan</button>
      </div>

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
      <div className="tm-filtri" role="tablist" aria-label="Filter nalog">
        {([['vse', 'Vse naloge'], ['moje', 'Moje naloge'], ['zamujene', 'Zamujene']] as const).map(([k, oznaka]) => (
          <button key={k} type="button" role="tab" aria-selected={filter === k} className={filter === k ? 'tm-filter-on' : ''} onClick={() => setFilter(k)}>{oznaka}{k === 'zamujene' && vidneNaloge.some((n) => !!n.rok && n.rok < danesStr && n.stolpec !== 'done') ? ' •' : ''}</button>
        ))}
      </div>
      )}

      {pogled === 'kanban' && (
      <div className="tm-deska">
        {STOLPCI.map((s) => {
          const nalogeVStolpcu = prikazaneNaloge.filter((n) => n.stolpec === s.id);
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
                  return (
                    <article key={naloga.id} className={`tm-kartica${naloga.isTimerRunning ? ' tm-kartica-tece' : ''}`} draggable onDragStart={(e) => handleDragStart(e, naloga.id)}>
                      <div className="tm-kartica-vrh">
                        <strong>{naloga.naslov}</strong>
                        {naloga.isTimerRunning && <span className="tm-tece-znacka" aria-hidden>● teče</span>}
                        <button
                          type="button"
                          className="tm-kartica-komentarji"
                          onClick={() => { setOdprtaNalogaId(naloga.id); setNovKomentar(''); }}
                          aria-label={`Podrobnosti in komentarji (${naloga.komentarji?.length || 0})`}
                          title="Podrobnosti, stranka, projekt in komentarji"
                        >
                          <ChatCircleDots size={13} weight={naloga.komentarji?.length ? 'fill' : 'regular'} />
                          {!!naloga.komentarji?.length && <span className="tm-kartica-komentarji-st">{naloga.komentarji.length}</span>}
                        </button>
                        {jeVodjaAliAdmin && <button type="button" className="tm-kartica-x" onClick={() => izbrisiNalogo(naloga.id)} title="Izbriši nalogo" aria-label="Izbriši nalogo">×</button>}
                      </div>
                      {naloga.opis && <p className="tm-kartica-opis">{naloga.opis}</p>}
                      <div className="tm-kartica-noga">
                        {naloga.rok && <span className={`tm-rok${jeZapadlo(naloga.rok) && s.id !== 'done' ? ' tm-rok-zapadlo' : ''}`}>📅 {datStr(naloga.rok)}</span>}
                        {naloga.clientId && strankaImeMap.get(naloga.clientId) && (
                          <span className="tm-stranka-znacka" title={`Stranka: ${strankaImeMap.get(naloga.clientId)}`}>{strankaImeMap.get(naloga.clientId)}</span>
                        )}
                        <select
                          className={`tm-prioriteta-select tm-prioriteta-select-${naloga.prioriteta || 'brez'}`}
                          value={naloga.prioriteta || ''}
                          onChange={(e) => nastaviPrioriteto(naloga.id, e.target.value)}
                          aria-label="Prioriteta"
                          title="Nastavi prioriteto"
                        >
                          <option value="">Prioriteta —</option>
                          {PRIORITETE.map((p) => <option key={p.id} value={p.id}>{p.naziv}</option>)}
                        </select>
                        {naloga.dodeljenoOseba
                          ? <span className="tm-oseba" title={`Dodeljeno: ${naloga.dodeljenoOseba}`}><span className="tm-oseba-krog" aria-hidden>{naloga.dodeljenoOseba.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase()}</span>{naloga.dodeljenoOseba}</span>
                          : <select className="tm-dodeli" value={naloga.dodeljenoOsebaId || ''} onChange={(e) => dodeliNalogi(naloga.id, e.target.value)} aria-label="Dodeli sodelavcu" title="Dodeli ali zamenjaj sodelavca">
                              <option value="">＋ dodeli</option>
                              {sodelavci.filter((so) => so.aktiven).map((so) => <option key={so.id} value={so.id}>{so.ime}</option>)}
                            </select>}
                      </div>
                      <div className="tm-cas">
                        <div className="tm-cas-vrsta">
                          <span className="tm-cas-tekst">{formatUre(porabljene)}h{ocena ? ` / ${ocena}h` : ''}</span>
                          {naloga.isTimerRunning && naloga.timerStartTime && <span className="tm-cas-ziv" aria-label="Tekoči čas">▶ {formatCasSek((zdaj - new Date(naloga.timerStartTime).getTime()) / 1000)}</span>}
                          <button type="button" className={`tm-cas-gumb${naloga.isTimerRunning ? ' tm-cas-gumb-tece' : ''}`} onClick={() => preklopiStoparico(naloga.id)} aria-label={naloga.isTimerRunning ? 'Ustavi štoparico' : 'Zaženi štoparico'} title={naloga.isTimerRunning ? 'Ustavi merjenje' : 'Zaženi merjenje'}>
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
        <div className="tm-teden">
          <div className="tm-teden-nav">
            <button type="button" className="tm-teden-strelica" onClick={() => setCiklusOffset((o) => o - 1)} aria-label="Prejšnji cikel"><CaretLeft size={14} weight="bold" /></button>
            <div className="tm-teden-naslov">
              <strong>{ciklusNaslov}</strong>
              {ciklusOffset !== 0 && <button type="button" className="tm-teden-danes" onClick={() => setCiklusOffset(0)}>Danes</button>}
            </div>
            <button type="button" className="tm-teden-strelica" onClick={() => setCiklusOffset((o) => o + 1)} aria-label="Naslednji cikel"><CaretRight size={14} weight="bold" /></button>
            {jeVodjaAliAdmin && (
              <label className="tm-teden-cikel">
                <span>Cikel</span>
                <select value={cikelTednov} onChange={(e) => spremeniCikel(Number(e.target.value))}>
                  {[1, 2, 3, 4].map((n) => <option key={n} value={n}>{n} {n === 1 ? 'teden' : 'tedne'}</option>)}
                </select>
              </label>
            )}
          </div>

          {aktivniSodelavci.length === 0 && <p className="tm-prazno">Ni aktivnih sodelavcev.</p>}

          <div className="tm-teden-osebe">
            {aktivniSodelavci.map((oseba) => {
              const njeneDodelitve = dodelitveZaOsebo(oseba.id);
              return (
                <section key={oseba.id} className="tm-teden-oseba-vrsta">
                  <header className="tm-teden-oseba-glava">
                    <span className="tm-oseba-krog" aria-hidden>{oseba.ime.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase()}</span>
                    <span className="tm-teden-oseba-ime">{oseba.ime}</span>
                    {jeVodjaAliAdmin && (
                      <button type="button" className="tm-teden-dodaj" onClick={() => { setNovaDodelitevOsebaId(oseba.id); setNdProjektIme(''); setNdPodrocje(''); setNdStrankaId(''); setNdNacrt(''); }}>+ dodelitev</button>
                    )}
                  </header>

                  {njeneDodelitve.length === 0 && <p className="tm-prazno tm-teden-prazno">Brez dodelitev v tem ciklu.</p>}

                  <div className="tm-teden-cipi">
                    {njeneDodelitve.map((d) => {
                      const sme = smeUrejatiDodelitev(d);
                      return (
                        <article key={d.id} className="tm-teden-cip">
                          <div className="tm-teden-cip-vrh">
                            <strong>{d.projektIme}{d.podrocje ? ` — ${d.podrocje}` : ''}</strong>
                            {jeVodjaAliAdmin && (
                              <button type="button" className="tm-kartica-x" onClick={() => odstraniDodelitev(d.id)} title="Izbriši dodelitev" aria-label="Izbriši dodelitev">×</button>
                            )}
                          </div>
                          <span className="tm-teden-cip-znacka">{oznakaNalogDodelitve(d)}</span>

                          <label className="tm-teden-cip-polje">
                            <span>Kaj bom delal/a ta teden</span>
                            <textarea value={d.nacrt || ''} onChange={(e) => nastaviNacrtDodelitve(d.id, e.target.value)} placeholder="Načrt za ta cikel …" rows={2} disabled={!sme} />
                          </label>

                          <div className="tm-teden-cip-noga">
                            <select className="tm-status-select" value={d.status || 'nacrtovano'} onChange={(e) => nastaviStatusDodelitve(d.id, e.target.value)} disabled={!sme} aria-label="Status dodelitve">
                              {STATUSI_DODELITVE.map((s) => <option key={s.id} value={s.id}>{s.naziv}</option>)}
                            </select>
                            {d.status === 'preneseno' && sme && (
                              <button type="button" className="tm-teden-prenesi" onClick={() => prenesiVNaslednjiCiklus(d)}>
                                <ArrowBendUpRight size={12} weight="bold" /> V naslednji cikel
                              </button>
                            )}
                            {jeVodjaAliAdmin && (
                              <select className="tm-dodeli" value={d.osebaId} onChange={(e) => prerazporediDodelitevOsebi(d.id, e.target.value)} aria-label="Prerazporedi drugi osebi" title="Prerazporedi drugi osebi">
                                {aktivniSodelavci.map((so) => <option key={so.id} value={so.id}>{so.ime}</option>)}
                              </select>
                            )}
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      )}

      {novaDodelitevOsebaId && (
        <div className="tm-dodelitev-podlaga" onClick={() => setNovaDodelitevOsebaId(null)}>
          <aside className="tm-dodelitev-panel" onClick={(e) => e.stopPropagation()}>
            <div className="tm-forma-glava">
              <h2>Nova dodelitev — {sodelavci.find((s) => s.id === novaDodelitevOsebaId)?.ime}</h2>
              <button type="button" className="tm-x" onClick={() => setNovaDodelitevOsebaId(null)} aria-label="Zapri">×</button>
            </div>
            <label className="tm-polje"><span>Projekt</span>
              <input value={ndProjektIme} onChange={(e) => setNdProjektIme(e.target.value)} placeholder="Npr. Battle for Earth …" autoFocus />
            </label>
            <label className="tm-polje"><span>Področje</span>
              <input value={ndPodrocje} onChange={(e) => setNdPodrocje(e.target.value)} placeholder="Npr. mobile, desktop, CGP …" />
            </label>
            <div className="tm-namigi">
              {NAMIGI_PODROCJE.map((n) => <button key={n} type="button" onClick={() => setNdPodrocje(n)}>{n}</button>)}
            </div>
            <label className="tm-polje"><span>Poveži s stranko (neobvezno)</span>
              <select value={ndStrankaId} onChange={(e) => { setNdStrankaId(e.target.value); const s = stranke.find((x) => x.id === e.target.value); if (s && !ndProjektIme.trim()) setNdProjektIme(s.name); }}>
                <option value="">— brez —</option>
                {stranke.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </label>
            <label className="tm-polje"><span>Kaj bo delal/a ta teden</span>
              <textarea value={ndNacrt} onChange={(e) => setNdNacrt(e.target.value)} placeholder="Načrt, dogovorjen na sestanku …" rows={3} />
            </label>
            <div className="tm-forma-akcije">
              <button type="button" className="tm-preklici" onClick={() => setNovaDodelitevOsebaId(null)}>Prekliči</button>
              <button type="button" className="tm-shrani" disabled={!ndProjektIme.trim()} onClick={ustvariDodelitev}>Dodaj dodelitev</button>
            </div>
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

      {odprtaNaloga && (
        <div className="tm-detajli-podlaga" onClick={() => setOdprtaNalogaId(null)}>
          <aside className="tm-detajli-panel" onClick={(e) => e.stopPropagation()}>
            <div className="tm-forma-glava">
              <h2>{odprtaNaloga.naslov}</h2>
              <button type="button" className="tm-x" onClick={() => setOdprtaNalogaId(null)} aria-label="Zapri">×</button>
            </div>
            {odprtaNaloga.opis && <p className="tm-kartica-opis">{odprtaNaloga.opis}</p>}
            <label className="tm-polje"><span>Stranka</span>
              <select value={odprtaNaloga.clientId || ''} onChange={(e) => dodeliStranko(odprtaNaloga.id, e.target.value)}>
                <option value="">— brez —</option>
                {stranke.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </label>
            <label className="tm-polje"><span>Projekt (neobvezno)</span>
              <input value={odprtaNaloga.projectId || ''} onChange={(e) => nastaviProjekt(odprtaNaloga.id, e.target.value)} placeholder="Naziv projekta, npr. Battle for Earth …" />
            </label>
            <label className="tm-polje"><span>Prioriteta</span>
              <select value={odprtaNaloga.prioriteta || ''} onChange={(e) => nastaviPrioriteto(odprtaNaloga.id, e.target.value)}>
                <option value="">— brez —</option>
                {PRIORITETE.map((p) => <option key={p.id} value={p.id}>{p.naziv}</option>)}
              </select>
            </label>

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
            <form className="tm-komentar-forma" onSubmit={(e) => { e.preventDefault(); dodajKomentar(odprtaNaloga.id, novKomentar); setNovKomentar(''); }}>
              <textarea value={novKomentar} onChange={(e) => setNovKomentar(e.target.value)} placeholder="Dodaj komentar …" rows={2} />
              <button type="submit" className="tm-shrani" disabled={!novKomentar.trim()}>Dodaj komentar</button>
            </form>
          </aside>
        </div>
      )}

      <style>{`
        .tm{padding:1.6rem clamp(1rem,3vw,2.2rem) 4rem;min-width:0}
        .tm-glava{display:flex;flex-wrap:wrap;align-items:flex-end;justify-content:space-between;gap:1rem;margin-bottom:1.6rem}
        .tm-eyebrow{margin:0 0 .35rem;font:800 .62rem var(--font-sans),sans-serif;letter-spacing:.18em;text-transform:uppercase;color:var(--muted)}
        .tm-naslov{margin:0;font:500 clamp(2rem,4vw,2.8rem)/1 var(--font-serif),Georgia,serif;color:var(--ink)}
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
        .tm-filtri{display:inline-flex;gap:.2rem;margin:0 0 1.1rem;padding:.25rem;border:1px solid var(--line);border-radius:999px;background:oklch(97% .006 87 / .8)}
        .tm-filtri button{padding:.4rem .85rem;border:0;border-radius:999px;background:none;font:700 .68rem var(--font-sans),sans-serif;color:var(--muted);cursor:pointer}
        .tm-filtri button.tm-filter-on{background:var(--ink);color:var(--paper)}
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
        .tm-pogled-preklop{display:inline-flex;gap:.2rem;margin:0 0 1.1rem;padding:.25rem;border:1px solid var(--line);border-radius:999px;background:oklch(97% .006 87 / .8)}
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
        .tm-analitika-podlaga,.tm-detajli-podlaga,.tm-dodelitev-podlaga{position:fixed;inset:0;z-index:60;display:flex;justify-content:flex-end;background:oklch(20% .02 55/.32);backdrop-filter:blur(2px)}
        .tm-analitika-panel,.tm-detajli-panel,.tm-dodelitev-panel{width:min(26rem,92vw);height:100%;overflow-y:auto;padding:1.4rem 1.5rem 2.4rem;background:var(--paper);border-left:1px solid var(--line);box-shadow:-1.2rem 0 3rem oklch(20% .03 55/.14)}

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

        /* Tedenski plan / sefov razpored dodelitev */
        .tm-teden-nav{display:flex;align-items:center;gap:.7rem;flex-wrap:wrap;margin-bottom:1.1rem}
        .tm-teden-strelica{flex:none;width:2rem;height:2rem;display:grid;place-items:center;border:1px solid var(--line);border-radius:50%;background:var(--paper);color:var(--ink);cursor:pointer;transition:background .15s,color .15s}
        .tm-teden-strelica:hover{background:var(--ink);color:var(--paper)}
        .tm-teden-naslov{display:flex;align-items:center;gap:.6rem}
        .tm-teden-naslov strong{font:600 1.05rem var(--font-serif),Georgia,serif;color:var(--ink)}
        .tm-teden-danes{padding:.3rem .7rem;border:1px solid var(--line);border-radius:999px;background:var(--paper);color:var(--muted);font:700 .64rem var(--font-sans),sans-serif;cursor:pointer}
        .tm-teden-danes:hover{color:var(--ink);border-color:var(--ink)}
        .tm-teden-cikel{margin-left:auto;display:flex;align-items:center;gap:.4rem}
        .tm-teden-cikel span{font:700 .6rem var(--font-sans),sans-serif;letter-spacing:.04em;text-transform:uppercase;color:var(--muted)}
        .tm-teden-cikel select{appearance:none;-webkit-appearance:none;-moz-appearance:none;padding:.4rem 1.7rem .4rem .65rem;border:1px solid var(--line);border-radius:.7rem;background-color:oklch(100% 0 0/.75);font:inherit;font-size:.78rem;color:var(--ink);background-repeat:no-repeat;background-position:right .55rem center;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236E4FA6' stroke-width='2.6' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")}

        .tm-teden-osebe{display:flex;flex-direction:column;gap:1rem}
        .tm-teden-oseba-vrsta{padding:.9rem 1rem 1rem;border:1px solid var(--line);border-radius:1.1rem;background:oklch(97.5% .008 87/.6)}
        .tm-teden-oseba-glava{display:flex;align-items:center;gap:.55rem;margin-bottom:.7rem}
        .tm-teden-oseba-ime{flex:1;font:650 .86rem var(--font-sans),sans-serif;color:var(--ink)}
        .tm-teden-dodaj{flex:none;padding:.35rem .75rem;border:1px dashed var(--line);border-radius:999px;background:transparent;color:var(--muted);font:700 .66rem var(--font-sans),sans-serif;cursor:pointer}
        .tm-teden-dodaj:hover{border-style:solid;border-color:var(--ink);color:var(--ink)}
        .tm-teden-prazno{margin:0;padding:.7rem .6rem}

        .tm-teden-cipi{display:grid;grid-template-columns:repeat(auto-fill,minmax(15rem,1fr));gap:.7rem}
        .tm-teden-cip{display:flex;flex-direction:column;gap:.5rem;padding:.7rem .8rem;border:1px solid var(--line);border-radius:.85rem;background:oklch(100% 0 0/.9);box-shadow:0 .4rem 1rem oklch(20% .03 55/.05)}
        .tm-teden-cip-vrh{display:flex;align-items:flex-start;gap:.4rem}
        .tm-teden-cip-vrh strong{flex:1;font-size:.8rem;font-weight:650;line-height:1.35;color:var(--ink)}
        .tm-teden-cip-znacka{align-self:flex-start;padding:.15rem .5rem;border-radius:999px;background:oklch(94% .03 300);color:oklch(38% .1 300);font:700 .62rem var(--font-sans),sans-serif}
        .tm-teden-cip-polje{display:flex;flex-direction:column;gap:.25rem}
        .tm-teden-cip-polje span{font:700 .58rem var(--font-sans),sans-serif;letter-spacing:.03em;text-transform:uppercase;color:var(--muted)}
        .tm-teden-cip-polje textarea{width:100%;padding:.4rem .55rem;border:1px solid var(--line);border-radius:.55rem;background:oklch(100% 0 0/.7);font:inherit;font-size:.76rem;color:var(--ink);resize:vertical;min-height:2.2rem}
        .tm-teden-cip-polje textarea:focus{outline:none;border-color:var(--ink)}
        .tm-teden-cip-polje textarea:disabled{opacity:.6;cursor:not-allowed}
        .tm-teden-cip-noga{display:flex;align-items:center;gap:.4rem;flex-wrap:wrap}

        /* status dodelitve — samostojen pill-select, isti chevron kot ostali selecti */
        .tm-status-select{appearance:none;-webkit-appearance:none;-moz-appearance:none;padding:.2rem 1.3rem .2rem .55rem;border:1px solid var(--line);border-radius:999px;font:700 .62rem var(--font-sans),sans-serif;cursor:pointer;background-color:oklch(96% .006 87);color:var(--ink);background-repeat:no-repeat;background-position:right .4rem center;background-size:9px;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236E4FA6' stroke-width='2.8' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")}
        .tm-status-select:disabled{opacity:.6;cursor:not-allowed}
        .tm-teden-prenesi{display:inline-flex;align-items:center;gap:.3rem;padding:.25rem .6rem;border:1px solid var(--line);border-radius:999px;background:var(--paper);color:var(--ink);font:700 .62rem var(--font-sans),sans-serif;cursor:pointer}
        .tm-teden-prenesi:hover{background:var(--ink);color:var(--paper)}

        /* namigi za podrocje v formi nove dodelitve */
        .tm-namigi{display:flex;flex-wrap:wrap;gap:.4rem;margin:-.4rem 0 .8rem}
        .tm-namigi button{padding:.28rem .65rem;border:1px dashed var(--line);border-radius:999px;background:transparent;color:var(--muted);font:700 .64rem var(--font-sans),sans-serif;cursor:pointer}
        .tm-namigi button:hover{border-style:solid;border-color:var(--ink);color:var(--ink)}

        @media (max-width:860px){
          .tm-deska{grid-template-columns:none;grid-auto-flow:column;grid-auto-columns:82vw;overflow-x:auto;scroll-snap-type:x mandatory;padding-bottom:.6rem}
          .tm-stolpec{scroll-snap-align:start}
          .tm-teden-cipi{grid-template-columns:1fr}
          .tm-teden-cikel{margin-left:0}
        }
      `}</style>
    </div>
  );
}
