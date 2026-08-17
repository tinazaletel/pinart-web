'use client';

/* TASK MANAGER (Kanban) — logika (data model, dodaj/izbriši, drag&drop) po Geminijevi
   specifikaciji (lib/naloge.ts), JSX + videz rekonstruirana v Pinart slogu (kremno,
   Bodoni, ink, akcent). Lasten prefiksiran <style> blok (tm-), da ne trči s .shell. */

import React, { useState, useEffect, useRef } from 'react';
import { Pause, Play, ChartBar, ChatCircleDots, Sparkle, UploadSimple, DownloadSimple, CaretLeft, CaretRight, CaretDown, Buildings, Circle, CheckCircle, UserPlus, Calendar, Plus, X, FunnelSimple } from '@phosphor-icons/react';
import { createPortal } from 'react-dom';
import Toast from '@/components/Toast';
import {
  Naloga,
  NalogaStolpec,
  NalogaKomentar,
  NalogaAvtorVloga,
  NalogaPrioriteta,
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

/* oznaka vloge avtorja opisa/komentarja — za barvno znacko (kdo je nekaj napisal) */
const VLOGA_LABEL: Record<NalogaAvtorVloga, string> = { sef: 'Šef', sodelavec: 'Sodelavec', stranka: 'Stranka', jaz: 'Ti' };

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
const NALOGE_FLOW_RAZVOJ: {
  naslov: string; stolpec: NalogaStolpec; oznake: string[];
  opis?: string; opisAvtorIme?: string; opisAvtorVloga?: NalogaAvtorVloga;
  prioriteta?: NalogaPrioriteta;
  podopravila?: { besedilo: string; done?: boolean; dodeljenoOsebaIme?: string }[];
  komentarji?: { avtorIme: string; besedilo: string; vloga: NalogaAvtorVloga }[];
}[] = [
  {
    naslov: 'Kontakti (več oseb) + klik-za-klic/mail → dnevnik', stolpec: 'done', oznake: ['CRM', 'funkcionalnost'],
    opis: 'Vsaka stranka naj ima več oseb, klik na telefon ali mail pa naj samodejno zapiše vnos v dnevnik.',
    opisAvtorIme: 'Maja Zupan', opisAvtorVloga: 'sef', prioriteta: 'srednja',
    podopravila: [
      { besedilo: 'Model kontaktnih oseb na stranki', done: true },
      { besedilo: 'Klik-za-klic in klik-za-mail sprožilca', done: true, dodeljenoOsebaIme: 'Matej Novak' },
      { besedilo: 'Samodejni vpis interakcije v dnevnik', dodeljenoOsebaIme: 'Maja Zupan' },
    ],
    komentarji: [
      { avtorIme: 'Rok Horvat', besedilo: 'Pri nas so trije kontakti, ločite jih prosim.', vloga: 'stranka' },
      { avtorIme: 'Maja Zupan', besedilo: 'Dnevnik naj se polni sam, brez ročnega vnosa.', vloga: 'sef' },
    ],
  },
  {
    naslov: 'CRM dnevnik (klici/sestanki/dogovori)', stolpec: 'done', oznake: ['CRM'],
    opis: 'Zgradi dnevnik, kamor se beležijo klici, sestanki in dogovori po posamezni stranki.',
    opisAvtorIme: 'Maja Zupan', opisAvtorVloga: 'sef', prioriteta: 'srednja',
  },
  {
    naslov: 'Naloga↔stranka + prioriteta + komentarji', stolpec: 'done', oznake: ['funkcionalnost'],
    opis: 'Nalogo naj bo mogoče povezati s stranko ter ji dodati prioriteto in nit komentarjev.',
    opisAvtorIme: 'Maja Zupan', opisAvtorVloga: 'sef', prioriteta: 'srednja',
  },
  {
    naslov: 'Plan = matrika Projekt×Oddelek + oddelki/šef', stolpec: 'done', oznake: ['funkcionalnost'],
    opis: 'Plan naj prikaže matriko projektov in oddelkov, kjer šef razporeja delo po oddelkih.',
    opisAvtorIme: 'Maja Zupan', opisAvtorVloga: 'sef', prioriteta: 'srednja',
  },
  {
    naslov: 'Tedenski razpored + status + prenos v cikel', stolpec: 'done', oznake: ['funkcionalnost'],
    opis: 'Tedenski razpored s statusi dodelitev in možnostjo prenosa neopravljenega v naslednji cikel.',
    opisAvtorIme: 'Maja Zupan', opisAvtorVloga: 'sef', prioriteta: 'srednja',
  },
  {
    naslov: 'Preklop obdobja Teden/Mesec/Kvartal', stolpec: 'done', oznake: ['funkcionalnost'],
    opis: 'Omogoči preklop pogleda razporeda med tednom, mesecem in kvartalom.',
    opisAvtorIme: 'Maja Zupan', opisAvtorVloga: 'sef', prioriteta: 'nizka',
  },
  {
    naslov: 'Področja lastna + »+« iskalnik', stolpec: 'done', oznake: ['funkcionalnost'],
    opis: 'Uporabnik naj lahko doda lastna področja prek gumba »+« z iskalnikom.',
    opisAvtorIme: 'Maja Zupan', opisAvtorVloga: 'sef', prioriteta: 'nizka',
  },
  {
    naslov: 'Koledar urna mreža + sestanki/klici → CRM', stolpec: 'done', oznake: ['funkcionalnost'],
    opis: 'Koledar z urno mrežo, kjer se sestanki in klici prelijejo v CRM dnevnik.',
    opisAvtorIme: 'Maja Zupan', opisAvtorVloga: 'sef', prioriteta: 'srednja',
  },
  {
    naslov: 'Nov projekt + vozlišče + chat brief', stolpec: 'done', oznake: ['funkcionalnost'],
    opis: 'Ustvarjanje novega projekta z vozliščem in začetnim briefom prek chata.',
    opisAvtorIme: 'Maja Zupan', opisAvtorVloga: 'sef', prioriteta: 'srednja',
    podopravila: [
      { besedilo: 'Obrazec za nov projekt', done: true },
      { besedilo: 'Vozlišče projekta z osnovnimi podatki', done: true, dodeljenoOsebaIme: 'Matej Novak' },
      { besedilo: 'Chat brief ob ustvarjanju', dodeljenoOsebaIme: 'Maja Zupan' },
    ],
    komentarji: [
      { avtorIme: 'Maja Zupan', besedilo: 'Brief naj bo kratek, da stranke ne odvrne.', vloga: 'sef' },
      { avtorIme: 'Matej Novak', besedilo: 'Vozlišče je pripravljeno, manjka še chat.', vloga: 'sodelavec' },
    ],
  },
  {
    naslov: 'Pipeline poslov (faze) drag&drop', stolpec: 'done', oznake: ['funkcionalnost'],
    opis: 'Posle naj bo mogoče premikati med fazami z vlečenjem in spuščanjem.',
    opisAvtorIme: 'Maja Zupan', opisAvtorVloga: 'sef', prioriteta: 'srednja',
  },
  {
    naslov: 'Predračun / Avans / NDA', stolpec: 'done', oznake: ['funkcionalnost'],
    opis: 'Pripravi generiranje predračuna, računa za avans in NDA dokumenta.',
    opisAvtorIme: 'Maja Zupan', opisAvtorVloga: 'sef', prioriteta: 'srednja',
  },
  {
    naslov: 'Meni: Dizajn→profil, Ustvari projekt pod Orodja', stolpec: 'done', oznake: ['dizajn'],
    opis: 'Preuredi meni: Dizajn premakni k profilu, Ustvari projekt pa pod Orodja.',
    opisAvtorIme: 'Maja Zupan', opisAvtorVloga: 'sef', prioriteta: 'nizka',
  },
  {
    naslov: 'Naslovi manjši povsod', stolpec: 'done', oznake: ['dizajn'],
    opis: 'Zmanjšaj velikost naslovov skozi celotno aplikacijo za bolj umirjen videz.',
    opisAvtorIme: 'Maja Zupan', opisAvtorVloga: 'sef', prioriteta: 'nizka',
  },
  {
    naslov: 'Komaj opazne obrobe + brez outline številk', stolpec: 'done', oznake: ['dizajn'],
    opis: 'Obrobe naj bodo komaj opazne, številke pa brez izrazitega obrisa.',
    opisAvtorIme: 'Maja Zupan', opisAvtorVloga: 'sef', prioriteta: 'nizka',
  },
  {
    naslov: 'Cenik: dodaj-postavko na vrh', stolpec: 'done', oznake: ['dizajn'],
    opis: 'Gumb za dodajanje postavke premakni na vrh cenika za lažjo uporabo.',
    opisAvtorIme: 'Maja Zupan', opisAvtorVloga: 'sef', prioriteta: 'nizka',
  },
  {
    naslov: 'Kontakt kartica poravnava + čitljiv naziv', stolpec: 'done', oznake: ['dizajn'],
    opis: 'Popravi poravnavo kontaktne kartice in poskrbi za bolj čitljiv naziv.',
    opisAvtorIme: 'Maja Zupan', opisAvtorVloga: 'sef', prioriteta: 'nizka',
  },
  {
    naslov: 'Cilji: Merilo = spustni meni', stolpec: 'done', oznake: ['funkcionalnost'],
    opis: 'Merilo cilja naj se izbira iz spustnega menija namesto prostega vnosa.',
    opisAvtorIme: 'Maja Zupan', opisAvtorVloga: 'sef', prioriteta: 'nizka',
  },
  {
    naslov: 'Razširjen brief + panoga + centriranje vprašanja', stolpec: 'in_progress', oznake: ['funkcionalnost'],
    opis: 'Razširi brief z izbiro panoge in centriraj trenutno vprašanje na sredino.',
    opisAvtorIme: 'Maja Zupan', opisAvtorVloga: 'sef', prioriteta: 'srednja',
  },
  {
    naslov: 'Opomnik »pokliči nazaj«', stolpec: 'todo', oznake: ['CRM'],
    opis: 'Dodaj opomnik, ki uporabnika spomni, da mora stranko poklicati nazaj.',
    opisAvtorIme: 'Maja Zupan', opisAvtorVloga: 'sef', prioriteta: 'srednja',
    podopravila: [
      { besedilo: 'Nastavitev datuma in ure opomnika' },
      { besedilo: 'Povezava opomnika s kontaktom stranke', dodeljenoOsebaIme: 'Matej Novak' },
      { besedilo: 'Obvestilo ob zapadlosti' },
    ],
    komentarji: [
      { avtorIme: 'Rok Horvat', besedilo: 'Prosim, da me pokličete nazaj do petka.', vloga: 'stranka' },
      { avtorIme: 'Maja Zupan', besedilo: 'Vezano naj bo na kontakt, ne na projekt.', vloga: 'sef' },
    ],
  },
  {
    naslov: '»Moj dan« (zapadlo/ta teden)', stolpec: 'todo', oznake: ['funkcionalnost'],
    opis: 'Pogled »Moj dan«, ki zbere zapadle naloge in tiste za ta teden.',
    opisAvtorIme: 'Maja Zupan', opisAvtorVloga: 'sef', prioriteta: 'srednja',
  },
  {
    naslov: 'Gantt časovnica', stolpec: 'todo', oznake: ['funkcionalnost'],
    opis: 'Dodaj Gantt časovnico za pregled poteka projektov v času.',
    opisAvtorIme: 'Maja Zupan', opisAvtorVloga: 'sef', prioriteta: 'srednja',
    podopravila: [
      { besedilo: 'Osnovna časovna os projektov' },
      { besedilo: 'Vlečenje trajanja nalog', dodeljenoOsebaIme: 'Matej Novak' },
      { besedilo: 'Prikaz odvisnosti med nalogami' },
    ],
    komentarji: [
      { avtorIme: 'Maja Zupan', besedilo: 'Prioriteta za ta teden.', vloga: 'sef' },
      { avtorIme: 'Matej Novak', besedilo: 'Začnem z osnovno časovno osjo.', vloga: 'sodelavec' },
    ],
  },
  {
    naslov: 'Redesign projekt-vozlišča + koledarja', stolpec: 'todo', oznake: ['dizajn'],
    opis: 'Prenovi videz projektnega vozlišča in koledarja za bolj pregleden vtis.',
    opisAvtorIme: 'Maja Zupan', opisAvtorVloga: 'sef', prioriteta: 'srednja',
    podopravila: [
      { besedilo: 'Skica novega projektnega vozlišča', dodeljenoOsebaIme: 'Tina Zaletel' },
      { besedilo: 'Redesign koledarske mreže' },
      { besedilo: 'Uskladitev z ostalimi pogledi', dodeljenoOsebaIme: 'Maja Zupan' },
    ],
    komentarji: [
      { avtorIme: 'Maja Zupan', besedilo: 'Naj bo skladno s koledarjem.', vloga: 'sef' },
      { avtorIme: 'Matej Novak', besedilo: 'Predlagam manj robov na kartici vozlišča.', vloga: 'sodelavec' },
    ],
  },
  {
    naslov: 'Cilji → »Cilji in analitika« + kartice na Nadzorno', stolpec: 'todo', oznake: ['dizajn'],
    opis: 'Preimenuj Cilje v »Cilji in analitika« ter dodaj kartice na Nadzorno ploščo.',
    opisAvtorIme: 'Maja Zupan', opisAvtorVloga: 'sef', prioriteta: 'nizka',
  },
  {
    naslov: 'Font Bodoni → nevtralen (business)', stolpec: 'todo', oznake: ['dizajn'],
    opis: 'Zamenjaj Bodoni z bolj nevtralno pisavo primerno za poslovno rabo.',
    opisAvtorIme: 'Maja Zupan', opisAvtorVloga: 'sef', prioriteta: 'nizka',
  },
  {
    naslov: 'Knjižnica postavk (inventory na ceniku)', stolpec: 'todo', oznake: ['funkcionalnost'],
    opis: 'Zgradi knjižnico postavk, iz katere se hitro dodaja na cenik.',
    opisAvtorIme: 'Maja Zupan', opisAvtorVloga: 'sef', prioriteta: 'srednja',
  },
  {
    naslov: 'Chat/voice → naloge (fish.audio)', stolpec: 'todo', oznake: ['ideja'],
    opis: 'Ideja: iz glasovnega ali chat vnosa samodejno ustvari naloge prek fish.audio.',
    opisAvtorIme: 'Tina Zaletel', opisAvtorVloga: 'jaz', prioriteta: 'nizka',
  },
  {
    naslov: 'Maili — Resend (API ključ)', stolpec: 'done', oznake: ['zaledje'],
    opis: 'Poveži pošiljanje e-pošte prek Resend in nastavi API ključ v okolju.',
    opisAvtorIme: 'Maja Zupan', opisAvtorVloga: 'sef', prioriteta: 'visoka',
    podopravila: [
      { besedilo: 'Pridobitev in shramba API ključa', done: true, dodeljenoOsebaIme: 'Tina Zaletel' },
      { besedilo: 'Osnovna predloga maila', done: true, dodeljenoOsebaIme: 'Matej Novak' },
      { besedilo: 'Test pošiljanja na pravi naslov', done: true, dodeljenoOsebaIme: 'Tina Zaletel' },
    ],
    komentarji: [
      { avtorIme: 'Maja Zupan', besedilo: 'To je zaledje, ki blokira ostalo. Prioriteta.', vloga: 'sef' },
      { avtorIme: 'Tina Zaletel', besedilo: 'Ključ vpisan, test prišel — deluje.', vloga: 'jaz' },
    ],
  },
  {
    naslov: 'Prava prijava / več-uporabnikov (Supabase env)', stolpec: 'waiting', oznake: ['zaledje'],
    opis: 'Uvedi pravo prijavo in podporo za več uporabnikov z ločeno vidljivostjo (Supabase okoljske spremenljivke).',
    opisAvtorIme: 'Maja Zupan', opisAvtorVloga: 'sef', prioriteta: 'visoka',
  },
  {
    naslov: 'Analitika baza (migracija + service key)', stolpec: 'waiting', oznake: ['zaledje'],
    opis: 'Poženi migracijo analitične baze in dodaj service-role ključ v okolje.',
    opisAvtorIme: 'Maja Zupan', opisAvtorVloga: 'sef', prioriteta: 'visoka',
  },
  {
    naslov: 'Plačilni sistem (naročnine — Merchant of Record)', stolpec: 'todo', oznake: ['zaledje'],
    opis: 'Naročnine za Flow prek Merchant of Record (Paddle ali Lemon Squeezy, ne golo Stripe — MoR ureja globalni DDV/davke). Pride po pravi prijavi (računih uporabnikov).',
    opisAvtorIme: 'Tina Zaletel', opisAvtorVloga: 'jaz', prioriteta: 'srednja',
  },
  {
    naslov: 'Zavihek Inhouse (HR)', stolpec: 'todo', oznake: ['ideja'],
    opis: 'Ideja: zavihek Inhouse za interne HR zadeve ekipe.',
    opisAvtorIme: 'Tina Zaletel', opisAvtorVloga: 'jaz', prioriteta: 'nizka',
  },
  {
    naslov: 'First-run onboarding (solo vs ekipa)', stolpec: 'todo', oznake: ['ideja'],
    opis: 'Ideja: uvodni onboarding, ki loči poti za samostojnega uporabnika in ekipo.',
    opisAvtorIme: 'Tina Zaletel', opisAvtorVloga: 'jaz', prioriteta: 'nizka',
  },
  {
    naslov: 'Pregled trženja (light)', stolpec: 'todo', oznake: ['ideja'],
    opis: 'Ideja: lahek pregled trženjskih aktivnosti brez zapletene analitike.',
    opisAvtorIme: 'Tina Zaletel', opisAvtorVloga: 'jaz', prioriteta: 'nizka',
  },
  {
    naslov: 'Marketing (kampanje + e-mail marketing)', stolpec: 'todo', oznake: ['ideja'],
    opis: 'Ideja (kot Bitrix): modul za trženjske kampanje in e-mail marketing — segmenti, predloge, pošiljanje, odzivi.',
    opisAvtorIme: 'Tina Zaletel', opisAvtorVloga: 'jaz', prioriteta: 'nizka',
  },
  {
    naslov: 'Povezave s socialnimi / viralnimi omrežji', stolpec: 'todo', oznake: ['ideja'],
    opis: 'Ideja (kot Bitrix): povezava s socialnimi omrežji — objave, sledenje odzivom, viralni doseg iz enega mesta.',
    opisAvtorIme: 'Tina Zaletel', opisAvtorVloga: 'jaz', prioriteta: 'nizka',
  },
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
  /* oznake, izbrane ze pri ustvarjanju naloge (predlagane cipe + prosto besedilo) */
  const [noveOznake, setNoveOznake] = useState<string[]>([]);
  const [novaOznakaVnos, setNovaOznakaVnos] = useState('');
  const preklopiNovoOznako = (o: string) => setNoveOznake((prej) => prej.includes(o) ? prej.filter((x) => x !== o) : [...prej, o]);
  const dodajNovoOznakoProsto = () => { const t = novaOznakaVnos.trim(); if (t && !noveOznake.includes(t)) setNoveOznake((prej) => [...prej, t]); setNovaOznakaVnos(''); };
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
  /* locen filter po projektu — projekt in oznaka sta dva razlicna miselna modela */
  const [filterProjekt, setFilterProjekt] = useState<string>('');
  const [mobilniFilterOdprt, setMobilniFilterOdprt] = useState(false);
  /* skupni »Filter« (oznake + projekti) v slide-up listu -> orodna vrstica ostane ENA */
  const [filterVecOdprt, setFilterVecOdprt] = useState(false);
  /* Naloge veliko renderjajo iz datuma/časa (Date.now, danesStr) + localStorage -> strežniški
     in klientski render se razlikujeta = hidracijski crash v produkciji. Poln render šele po
     montaži, da sta SSR in prvi klient render enaka (kot Koledar). */
  const [montiran, setMontiran] = useState(false);
  useEffect(() => { setMontiran(true); }, []);
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
     je per-brskalnik, zato pisanje tu ne pokvari nič skupnega. samoOgled ostane false (poln
     interaktiven), predogledNacin pa vpliva SAMO na vir seznama nalog: v »Prazno · nov uporabnik«
     je tabla prazna (iskren predogled), drag&drop/dodajanje ostanejo nedotaknjeni. */
  const [predogledNacin] = usePredogled();
  const samoOgled = false;

  /* trenutni NIKOLI ne sme biti undefined: če je sodelavci prazen (npr. localStorage/oblak
     vrne []), bi trenutni.vloga vrgel 'client-side exception'. Zato fallback na privzetega. */
  const trenutni = sodelavci.find((s) => s.id === trenutniId) || sodelavci[0] || ZACETNI_SODELAVCI[0];
  const jeVodjaAliAdmin = trenutni.vloga === 'vodja' || trenutni.vloga === 'admin';

  useEffect(() => {
    setNaloge(predogledNacin === 'empty' ? [] : preberiNaloge());
    setZgodovina(preberiZgodovino());
    setSodelavci(preberiSodelavci());
    setStranke(loadFlowData().clients);
    setDodelitve(preberiDodelitve());
    setOddelki(preberiOddelki());
    setPrazniProjekti(preberiPrazneProjekte());
    setPodrocja(preberiPodrocja());
  }, [predogledNacin]);

  const posodobiInShrani = (noveNaloge: Naloga[]) => { setNaloge(noveNaloge); shraniNaloge(noveNaloge); };

  /* --- Uvoz / izvoz nalog (prenos med orodji) --- */
  const [ieOdprt, setIeOdprt] = useState(false);            /* meni Uvoz/Izvoz */
  const datotekaRef = useRef<HTMLInputElement>(null);
  const izvoziNaloge = () => {
    setIeOdprt(false);
    try {
      const vsebina = JSON.stringify({ vrsta: 'pinart-naloge', razlicica: 1, izvozeno: new Date().toISOString(), naloge }, null, 2);
      const blob = new Blob([vsebina], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `naloge-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
      setSeedSporocilo(`Izvoženih ${naloge.length} nalog v datoteko.`);
    } catch { setSeedSporocilo('Izvoz ni uspel.'); }
  };
  const uvoziNaloge = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIeOdprt(false);
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    const bralnik = new FileReader();
    bralnik.onload = () => {
      try {
        const p = JSON.parse(String(bralnik.result || '{}'));
        const seznam: Naloga[] = Array.isArray(p) ? p : Array.isArray(p.naloge) ? p.naloge : [];
        const veljavne = seznam.filter((n) => n && typeof n.naslov === 'string' && typeof n.stolpec === 'string');
        if (!veljavne.length) { setSeedSporocilo('V datoteki ni najdenih veljavnih nalog.'); return; }
        const obstojeci = new Set(naloge.map((n) => n.id));
        const dodane = veljavne.map((n) => ({ ...n, id: n.id && !obstojeci.has(n.id) ? n.id : crypto.randomUUID(), created: n.created || new Date().toISOString() }));
        posodobiInShrani([...naloge, ...dodane]);
        setSeedSporocilo(`Uvoženih ${dodane.length} nalog iz datoteke.`);
      } catch { setSeedSporocilo('Datoteke ni bilo mogoče prebrati (neveljaven JSON).'); }
    };
    bralnik.readAsText(f);
  };

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
      oznake: noveOznake.length ? [...noveOznake] : undefined,
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
    setNovNaslov(''); setNovOpis(''); setNovRok(''); setNovDodeljeno(''); setNovDodeljenoId(''); setNovaOcena(''); setNoveOznake([]); setNovaOznakaVnos(''); setPrikaziFormo(false);
  };

  /* naknadno dodeljevanje sodelavca na OBSTOJEČO nalogo (spustni meni na kartici) + zapis v zgodovino */
  const dodeliNalogi = (id: string, sodelavecId: string) => {
    if (samoOgled) return;
    const so = sodelavci.find((x) => x.id === sodelavecId);
    const naloga = naloge.find((n) => n.id === id);
    posodobiInShrani(naloge.map((n) => (n.id === id ? { ...n, dodeljenoOsebaId: sodelavecId || undefined, dodeljenoOsebaIme: so?.ime } : n)));
    if (naloga) { zabeleziAktivnost(id, trenutni.ime, so ? `Dodelil nalogo »${naloga.naslov}« osebi ${so.ime}` : `Odstranil dodelitev na »${naloga.naslov}«`); setZgodovina(preberiZgodovino()); }
  };

  /* odpre drsni detajl panel (klik na kartico) in ponastavi vnosna polja */
  const odpriDetajl = (id: string) => {
    setOdprtaNalogaId(id);
    setNovKomentar('');
    setNovaOznaka('');
    setNovoPodopraviloBesedilo('');
    setOdpriDodelitevPodId(null);
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
    const nov: NalogaKomentar = { id: 'kom_' + Date.now(), avtorIme: trenutni.ime || 'Jaz', besedilo: besedilo.trim(), cas: new Date().toISOString(), vloga: 'jaz' };
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

    /* preslikava seed podopravil/komentarjev v prave entitete (svez id + cas) */
    const zgradiPodopravila = (seed: (typeof NALOGE_FLOW_RAZVOJ)[number]): NalogaPodopravilo[] =>
      (seed.podopravila || []).map((p) => ({
        id: crypto.randomUUID(),
        besedilo: p.besedilo,
        done: !!p.done,
        dodeljenoOsebaIme: p.dodeljenoOsebaIme,
      }));
    const zgradiKomentarje = (seed: (typeof NALOGE_FLOW_RAZVOJ)[number]): NalogaKomentar[] =>
      (seed.komentarji || []).map((k) => ({
        id: 'kom_' + crypto.randomUUID(),
        avtorIme: k.avtorIme,
        besedilo: k.besedilo,
        cas: new Date().toISOString(),
        vloga: k.vloga,
      }));

    /* NOVE naloge (naslov se ne obstaja) — polna Naloga z vsemi polji iz seed vnosa */
    const nove: Naloga[] = NALOGE_FLOW_RAZVOJ.filter((n) => !obstojeciNaslovi.has(n.naslov)).map((n) => ({
      id: crypto.randomUUID(),
      naslov: n.naslov,
      stolpec: n.stolpec,
      oznake: n.oznake,
      created: new Date().toISOString(),
      opis: n.opis,
      opisAvtorIme: n.opisAvtorIme,
      opisAvtorVloga: n.opisAvtorVloga,
      prioriteta: n.prioriteta,
      podopravila: zgradiPodopravila(n),
      komentarji: zgradiKomentarje(n),
    }));

    /* OBSTOJECE naloge — merge-dopolnitev: zapolni SAMO prazna polja iz seed, nikoli ne prepise
       ze obstojecih ne-praznih vrednosti (ohrani uporabnikove spremembe) */
    const seedPoNaslovu = new Map(NALOGE_FLOW_RAZVOJ.map((n) => [n.naslov, n]));
    let steviloDopolnjenih = 0;
    const dopolnjene: Naloga[] = obstojece.map((n) => {
      const seed = seedPoNaslovu.get(n.naslov);
      if (!seed) return n;
      const posodobljena: Naloga = { ...n };
      let spremenjena = false;
      if (!posodobljena.opis && seed.opis) { posodobljena.opis = seed.opis; spremenjena = true; }
      if (!posodobljena.opisAvtorIme && seed.opisAvtorIme) { posodobljena.opisAvtorIme = seed.opisAvtorIme; spremenjena = true; }
      if (!posodobljena.opisAvtorVloga && seed.opisAvtorVloga) { posodobljena.opisAvtorVloga = seed.opisAvtorVloga; spremenjena = true; }
      if (!posodobljena.prioriteta && seed.prioriteta) { posodobljena.prioriteta = seed.prioriteta; spremenjena = true; }
      if ((!posodobljena.oznake || posodobljena.oznake.length === 0) && seed.oznake.length > 0) { posodobljena.oznake = seed.oznake; spremenjena = true; }
      if ((!posodobljena.podopravila || posodobljena.podopravila.length === 0) && (seed.podopravila?.length)) { posodobljena.podopravila = zgradiPodopravila(seed); spremenjena = true; }
      if ((!posodobljena.komentarji || posodobljena.komentarji.length === 0) && (seed.komentarji?.length)) { posodobljena.komentarji = zgradiKomentarje(seed); spremenjena = true; }
      if (spremenjena) steviloDopolnjenih += 1;
      return posodobljena;
    });

    const steviloNovih = nove.length;
    if (steviloNovih > 0 || steviloDopolnjenih > 0) {
      posodobiInShrani([...dopolnjene, ...nove]);
      zabeleziAktivnost('seed_' + Date.now(), trenutni.ime, `Naložil razvojne naloge Flow-a (${steviloNovih} novih, ${steviloDopolnjenih} dopolnjenih)`);
      setZgodovina(preberiZgodovino());
    }
    const deli: string[] = [];
    if (steviloNovih > 0) deli.push(`Dodanih ${steviloNovih} novih`);
    if (steviloDopolnjenih > 0) deli.push(`dopolnjenih ${steviloDopolnjenih} obstoječih`);
    setSeedSporocilo(deli.length > 0 ? `${deli.join(', ')}.` : 'Vse naloge so že naložene.');
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
  const strankaImeMap = new Map(stranke.map((s) => [s.id, s.name]));
  /* Hitri filter nad Kanban tablo: vse / moje / zamujene + oznaka (tag) + projekt. */
  const danesStr = new Date().toISOString().slice(0, 10);
  const prikazaneNaloge = vidneNaloge.filter((n) => {
    if (filter === 'moje' && !(n.dodeljenoOsebaId === trenutni.id || (n.dodeljenoOseba || '') === trenutni.ime)) return false;
    if (filter === 'zamujene' && !(!!n.rok && n.rok < danesStr && n.stolpec !== 'done')) return false;
    if (filterOznaka && !(n.oznake || []).includes(filterOznaka)) return false;
    if (filterProjekt === '__brez__' && n.projectId) return false;
    if (filterProjekt && filterProjekt !== '__brez__' && n.projectId !== filterProjekt) return false;
    return true;
  });
  /* vse oznake, ki nastopajo na vidnih nalogah — za spustni izbor filtra */
  const vseOznake = Array.from(new Set(vidneNaloge.flatMap((n) => n.oznake || []))).sort((a, b) => a.localeCompare(b, 'sl'));
  /* Projekti so iz dejansko vidnih nalog. Vrednost ostane stabilen projectId, uporabniku pa
     pokazemo ime stranke/projekta, kadar je projectId povezava na CRM stranko. */
  const vsiProjekti = Array.from(new Set(vidneNaloge.map((n) => n.projectId?.trim()).filter((v): v is string => !!v)))
    .map((id) => ({ id, ime: strankaImeMap.get(id) || id }))
    .sort((a, b) => a.ime.localeCompare(b.ime, 'sl'));
  const filterNalogeNaziv = filter === 'moje' ? 'Moje naloge' : filter === 'zamujene' ? 'Zamujene' : 'Vse naloge';

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
  const odprtaNaloga = naloge.find((n) => n.id === odprtaNalogaId) || null;
  const aktivniSodelavci = sodelavci.filter((s) => s.aktiven);

  /* do montaže vrni prazen .tm (SSR = prvi klient render) -> brez hidracijskega neujemanja/crasha */
  if (!montiran) return <div className="tm" aria-hidden="true" />;

  return (
    <div className="tm">
      <Toast sporocilo={seedSporocilo} onClose={() => setSeedSporocilo('')} />
      <header className="tm-glava">
        <div className="tm-glava-uvod">
          <div>
            <p className="tm-eyebrow">TASK MANAGER</p>
            <h1 className="tm-naslov">Naloge.</h1>
            <p className="tm-podnaslov">Organiziraj projekte in opravila na enem mestu — povleci kartico med stolpci.</p>
          </div>
        </div>
        <label className="tm-uporabnik">
          <span>Prijavljen</span>
          <select value={trenutniId} onChange={(e) => setTrenutniId(e.target.value)}>
            {sodelavci.map((s) => <option key={s.id} value={s.id}>{s.ime} ({s.vloga.toUpperCase()})</option>)}
          </select>
        </label>
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
            <button
              type="button"
              className="tm-mobilni-filter-gumb"
              onClick={() => setMobilniFilterOdprt(true)}
              aria-haspopup="dialog"
              aria-expanded={mobilniFilterOdprt}
            >
              <span>{filterNalogeNaziv}</span><CaretDown size={16} weight="bold" />
            </button>
            <button type="button" className={'tm-filter-vec' + ((filterOznaka || filterProjekt) ? ' aktiv' : '')} onClick={() => setFilterVecOdprt(true)} aria-haspopup="dialog" aria-expanded={filterVecOdprt}>
              <FunnelSimple size={15} weight="bold" /><span>Filter</span>{(filterOznaka || filterProjekt) && <span className="tm-filter-vec-pika" aria-hidden />}
            </button>
          </div>
        )}
        <div className="tm-glava-akcije">
          {jeVodjaAliAdmin && (
            <button type="button" className="tm-analitika-gumb" aria-label="Analitika" title="Analitika" onClick={() => { setAnalitikaSodelavecId(sodelavci[0]?.id || ''); setPrikaziAnalitiko(true); }}>
              <ChartBar size={18} weight="bold" /><span className="tm-akcija-tekst">Analitika</span>
            </button>
          )}
          <span className="tm-ie-w">
            <button type="button" className="tm-seed-gumb tm-orodje-ikona" onClick={() => setIeOdprt((o) => !o)} aria-label="Uvoz in izvoz nalog" title="Uvozi ali izvozi naloge (prenos med orodji)">
              <UploadSimple size={18} weight="bold" />
            </button>
            {ieOdprt && (
              <div className="tm-ie-meni">
                <p className="tm-ie-h">Prenos nalog</p>
                <button type="button" onClick={izvoziNaloge}><DownloadSimple size={15} weight="bold" /> Izvozi ({naloge.length}) → .json</button>
                <button type="button" onClick={() => datotekaRef.current?.click()}><UploadSimple size={15} weight="bold" /> Uvozi iz .json</button>
                {!samoOgled && <button type="button" className="tm-ie-demo" onClick={() => { nalozirazvojneNaloge(); setIeOdprt(false); }}>Naloži primer nalog (demo)</button>}
              </div>
            )}
            <input ref={datotekaRef} type="file" accept="application/json,.json" hidden onChange={uvoziNaloge} />
          </span>
          {!samoOgled ? (
            <button type="button" className="tm-nova" aria-label="Nova naloga" title="Nova naloga" onClick={() => { setPogled('kanban'); setAktivniStolpec('todo'); setPrikaziFormo(true); }}><Plus size={18} weight="bold" /><span className="tm-akcija-tekst">Nova naloga</span></button>
          ) : (
            <p className="tm-demo-namig">Urejanje ni na voljo v predogledu (demo).</p>
          )}
          <button type="button" className="tm-seed-gumb tm-seed-gumb-ai" aria-label="AI dodaj več nalog" onClick={() => { setPogled('kanban'); setHitroOdprt((o) => !o); }} title="Piši prosto, več nalog naenkrat — AI pomoč pri dodajanju"><Sparkle size={18} weight="fill" /><span className="tm-akcija-tekst">AI dodaj več</span></button>
        </div>
      </div>

      {mobilniFilterOdprt && typeof document !== 'undefined' && createPortal(
        <div className="tm-mobilni-sheet-zastor" onClick={() => setMobilniFilterOdprt(false)}>
          <section className="tm-mobilni-sheet" role="dialog" aria-modal="true" aria-labelledby="tm-mobilni-filter-naslov" onClick={(e) => e.stopPropagation()}>
            <div className="tm-mobilni-sheet-rocaj" aria-hidden="true" />
            <div className="tm-mobilni-sheet-glava">
              <div><p>FILTER NALOG</p><h2 id="tm-mobilni-filter-naslov">Katere naloge želiš videti?</h2></div>
              <button type="button" onClick={() => setMobilniFilterOdprt(false)} aria-label="Zapri filter"><X size={20} /></button>
            </div>
            <div className="tm-mobilni-sheet-izbire">
              {([['vse', 'Vse naloge'], ['moje', 'Moje naloge'], ['zamujene', 'Zamujene']] as const).map(([k, oznaka]) => (
                <button key={k} type="button" aria-pressed={filter === k} className={filter === k ? 'tm-mobilni-sheet-on' : ''} onClick={() => { setFilter(k); setMobilniFilterOdprt(false); }}>
                  <span>{oznaka}</span>{filter === k && <CheckCircle size={22} weight="fill" />}
                </button>
              ))}
            </div>
          </section>
        </div>,
        document.body,
      )}

      {filterVecOdprt && typeof document !== 'undefined' && createPortal(
        <div className="tm-mobilni-sheet-zastor" onClick={() => setFilterVecOdprt(false)}>
          <section className="tm-mobilni-sheet" role="dialog" aria-modal="true" aria-labelledby="tm-filter-vec-naslov" onClick={(e) => e.stopPropagation()}>
            <div className="tm-mobilni-sheet-rocaj" aria-hidden="true" />
            <div className="tm-mobilni-sheet-glava">
              <div><p>FILTER</p><h2 id="tm-filter-vec-naslov">Oznake in projekti</h2></div>
              <button type="button" onClick={() => setFilterVecOdprt(false)} aria-label="Zapri filter"><X size={20} /></button>
            </div>
            {vseOznake.length > 0 && (
              <>
                <p className="tm-sheet-pod">Oznaka</p>
                <div className="tm-mobilni-sheet-izbire">
                  <button type="button" className={filterOznaka === '' ? 'tm-mobilni-sheet-on' : ''} onClick={() => setFilterOznaka('')}><span>Vse oznake</span>{filterOznaka === '' && <CheckCircle size={22} weight="fill" />}</button>
                  {vseOznake.map((o) => <button key={o} type="button" className={filterOznaka === o ? 'tm-mobilni-sheet-on' : ''} onClick={() => setFilterOznaka(o)}><span>{o}</span>{filterOznaka === o && <CheckCircle size={22} weight="fill" />}</button>)}
                </div>
              </>
            )}
            <p className="tm-sheet-pod">Projekt</p>
            <div className="tm-mobilni-sheet-izbire">
              <button type="button" className={filterProjekt === '' ? 'tm-mobilni-sheet-on' : ''} onClick={() => setFilterProjekt('')}><span>Vsi projekti</span>{filterProjekt === '' && <CheckCircle size={22} weight="fill" />}</button>
              {vsiProjekti.map((projekt) => <button key={projekt.id} type="button" className={filterProjekt === projekt.id ? 'tm-mobilni-sheet-on' : ''} onClick={() => setFilterProjekt(projekt.id)}><span>{projekt.ime}</span>{filterProjekt === projekt.id && <CheckCircle size={22} weight="fill" />}</button>)}
              {vidneNaloge.some((n) => !n.projectId) && <button type="button" className={filterProjekt === '__brez__' ? 'tm-mobilni-sheet-on' : ''} onClick={() => setFilterProjekt('__brez__')}><span>Brez projekta</span>{filterProjekt === '__brez__' && <CheckCircle size={22} weight="fill" />}</button>}
            </div>
          </section>
        </div>,
        document.body,
      )}

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
          <div className="tm-polje"><span>Oznake</span>
            <div className="tm-nova-oznake">
              {PREDLAGANE_OZNAKE.map((o) => (
                <button type="button" key={o} className={`tm-oznaka-cip${noveOznake.includes(o) ? ' tm-oznaka-cip-on' : ''}`} onClick={() => preklopiNovoOznako(o)}>{noveOznake.includes(o) ? o : `+ ${o}`}</button>
              ))}
              {noveOznake.filter((o) => !PREDLAGANE_OZNAKE.includes(o)).map((o) => (
                <button type="button" key={o} className="tm-oznaka-cip tm-oznaka-cip-on" onClick={() => preklopiNovoOznako(o)} aria-label={`Odstrani oznako ${o}`}>{o} ×</button>
              ))}
            </div>
            <div className="tm-nova-oznake-vnos">
              <input value={novaOznakaVnos} onChange={(e) => setNovaOznakaVnos(e.target.value)} placeholder="Nova oznaka (prosto besedilo) …" onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); dodajNovoOznakoProsto(); } }} />
              <button type="button" className="tm-zase" onClick={dodajNovoOznakoProsto} disabled={!novaOznakaVnos.trim()}>+ Dodaj</button>
            </div>
          </div>
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
                  const dodeljenoIme = naloga.dodeljenoOsebaIme || naloga.dodeljenoOseba || '';
                  return (
                    <article
                      key={naloga.id}
                      className={`tm-kartica${naloga.isTimerRunning ? ' tm-kartica-tece' : ''}`}
                      draggable={!samoOgled}
                      onDragStart={(e) => handleDragStart(e, naloga.id)}
                      role="button"
                      tabIndex={0}
                      onClick={() => odpriDetajl(naloga.id)}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); odpriDetajl(naloga.id); } }}
                      aria-label={`Odpri podrobnosti: ${naloga.naslov}`}
                    >
                      {(!!naloga.oznake?.length || naloga.isTimerRunning || !!naloga.komentarji?.length || (jeVodjaAliAdmin && !samoOgled)) && (
                        <div className="tm-kartica-vrh">
                          {!!naloga.oznake?.length && (
                            <span className="tm-kartica-tag" title={naloga.oznake.join(', ')}>
                              {naloga.oznake[0]}{naloga.oznake.length > 1 ? ` +${naloga.oznake.length - 1}` : ''}
                            </span>
                          )}
                          {naloga.isTimerRunning && <span className="tm-tece-znacka" aria-hidden>● teče</span>}
                          {!!naloga.komentarji?.length && (() => {
                            const zadnjiVloga = naloga.komentarji[naloga.komentarji.length - 1].vloga || 'jaz';
                            return (
                              <span className={`tm-kartica-oblacek tm-oblacek-${zadnjiVloga}`} title={`${naloga.komentarji.length} komentar(jev) — zadnji: ${VLOGA_LABEL[zadnjiVloga]}`}>
                                <ChatCircleDots size={12} weight="fill" />{naloga.komentarji.length}
                              </span>
                            );
                          })()}
                          {jeVodjaAliAdmin && !samoOgled && <button type="button" className="tm-kartica-x" onClick={(e) => { e.stopPropagation(); izbrisiNalogo(naloga.id); }} title="Izbriši nalogo" aria-label="Izbriši nalogo">×</button>}
                        </div>
                      )}
                      <strong className="tm-kartica-naslov">{naloga.naslov}</strong>
                      {naloga.opis && <p className="tm-kartica-opis">{naloga.opis}</p>}
                      <div className="tm-kartica-noga">
                        {naloga.rok && <span className={`tm-rok${jeZapadlo(naloga.rok) && s.id !== 'done' ? ' tm-rok-zapadlo' : ''}`}><Calendar size={11} weight="bold" /> {datStr(naloga.rok)}</span>}
                        {naloga.clientId && strankaImeMap.get(naloga.clientId) && (
                          <span className="tm-stranka-znacka" title={`Stranka: ${strankaImeMap.get(naloga.clientId)}`}>{strankaImeMap.get(naloga.clientId)}</span>
                        )}
                        {!!naloga.podopravila?.length && (
                          <span className="tm-kartica-podopravila" title="Podopravila">
                            <CheckCircle size={11} weight="bold" />
                            {naloga.podopravila.filter((p) => p.done).length}/{naloga.podopravila.length}
                          </span>
                        )}
                        <button
                          type="button"
                          className={`tm-kartica-stop${naloga.isTimerRunning ? ' tm-kartica-stop-tece' : ''}`}
                          onClick={(e) => { e.stopPropagation(); preklopiStoparico(naloga.id); }}
                          disabled={samoOgled}
                          aria-label={naloga.isTimerRunning ? 'Ustavi štoparico' : 'Zaženi štoparico'}
                          title={samoOgled ? 'Ni na voljo v predogledu (demo)' : (naloga.isTimerRunning ? 'Ustavi merjenje' : 'Zaženi merjenje')}
                        >
                          {naloga.isTimerRunning ? <Pause size={11} weight="fill" /> : <Play size={11} weight="fill" />}
                          <span className="tm-kartica-stop-cas">
                            {naloga.isTimerRunning && naloga.timerStartTime
                              ? formatCasSek((zdaj - new Date(naloga.timerStartTime).getTime()) / 1000)
                              : `${formatUre(porabljene)}h${ocena ? ` / ${ocena}h` : ''}`}
                          </span>
                        </button>
                        <span className="tm-noga-desno">
                          {naloga.prioriteta && (
                            <span className={`tm-prioriteta-znacka tm-prioriteta-znacka-${naloga.prioriteta}`}>
                              {PRIORITETE.find((p) => p.id === naloga.prioriteta)?.naziv || naloga.prioriteta}
                            </span>
                          )}
                          {dodeljenoIme && <span className="tm-oseba-krog" title={`Dodeljeno: ${dodeljenoIme}`} aria-label={`Dodeljeno: ${dodeljenoIme}`}>{dodeljenoIme.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase()}</span>}
                        </span>
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
              {odprtaNaloga.opisAvtorIme && (
                <div className="tm-opis-avtor">
                  <span className="tm-oseba-krog tm-oseba-krog-sm" aria-hidden>{initialke(odprtaNaloga.opisAvtorIme)}</span>
                  <span className="tm-opis-avtor-ime"><strong>{odprtaNaloga.opisAvtorIme}</strong> je opisal(a), kaj naj se naredi</span>
                  {odprtaNaloga.opisAvtorVloga && <span className={`tm-vloga-znacka tm-vloga-${odprtaNaloga.opisAvtorVloga}`}>{VLOGA_LABEL[odprtaNaloga.opisAvtorVloga]}</span>}
                </div>
              )}
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
                  <div className="tm-komentar-glava"><strong>{k.avtorIme}</strong>{k.vloga && <span className={`tm-vloga-znacka tm-vloga-${k.vloga}`}>{VLOGA_LABEL[k.vloga]}</span>}<span className="tm-komentar-cas">{datStr(k.cas)}</span></div>
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
        /* .workspace že da vodoravni rob -> .tm ga NE podvaja (prej clamp do 2.2rem = Naloge
           bolj zamaknjene kot ostale strani + orodna vrstica ni šla v eno vrsto) */
        .tm{padding:.9rem 0 4rem;min-width:0;--muted:color-mix(in oklch,var(--ink) 72%,transparent)}
        .tm-glava{display:flex;flex-wrap:wrap;align-items:flex-end;justify-content:space-between;gap:1rem 1.5rem;margin-bottom:.85rem}
        .tm-glava-uvod{display:flex;align-items:flex-end;gap:1.25rem;min-width:0}
        .tm-eyebrow{margin:0 0 .35rem;font:800 .62rem var(--font-sans),sans-serif;letter-spacing:.18em;text-transform:uppercase;color:var(--muted)}
        .tm-naslov{margin:0;font:500 clamp(1.6rem,3vw,2.15rem)/1 var(--font-serif),Georgia,serif;color:var(--ink)}
        .tm-podnaslov{margin:.55rem 0 0;max-width:44ch;color:var(--muted);font-size:.86rem;line-height:1.5}
        .tm-nova{flex:none;display:inline-flex;align-items:center;min-height:2.75rem;padding:0 1.15rem;border:0;border-radius:999px;background:var(--ink);color:var(--paper);font:750 .74rem var(--font-sans),sans-serif;cursor:pointer;transition:transform .18s cubic-bezier(.16,1,.3,1),box-shadow .18s}
        .tm-nova:hover{transform:translateY(-2px);box-shadow:0 .8rem 2rem oklch(22% .04 300/.22)}

        /* glava: preklop uporabnika + gumb za analitiko ekipe */
        .tm-glava-akcije{display:flex;align-items:center;gap:.55rem;flex-wrap:nowrap;margin-left:auto}
        /* »AI dodaj več« = samo ikona (kot uvoz/izvoz), da orodna vrstica ostane v eni vrstici */
        .tm-seed-gumb-ai{width:2.75rem;padding:0;justify-content:center}
        .tm-seed-gumb-ai .tm-akcija-tekst{display:none}
        .tm-uporabnik{display:flex;align-items:center;min-height:2.75rem;border:1px solid var(--line);border-radius:.8rem;background:#fff;overflow:hidden}
        .tm-uporabnik span{padding:0 .7rem;font:750 .58rem var(--font-sans),sans-serif;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);white-space:nowrap}
        .tm-uporabnik select{align-self:stretch;min-width:13rem;padding:.55rem 2rem .55rem .75rem;border:0;border-left:1px solid var(--line);border-radius:0;background-color:#fff;font:inherit;font-size:.78rem;color:var(--ink)}
        .tm-uporabnik select:focus{outline:none;border-color:var(--ink)}
        .tm-analitika-gumb{flex:none;display:inline-flex;align-items:center;gap:.4rem;min-height:2.75rem;padding:0 1rem;border:1px solid var(--line);border-radius:999px;background:#fff;color:var(--ink);font:750 .72rem var(--font-sans),sans-serif;cursor:pointer;transition:background .15s,color .15s}
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
        .tm-pogled-filtri-vrsta{display:flex;align-items:center;gap:.6rem;flex-wrap:wrap;margin:0 0 1.1rem}
        .tm-filtri-vrsta{display:flex;align-items:center;gap:.6rem;flex-wrap:wrap;margin:0}
        .tm-filtri{display:inline-flex;align-items:center;min-height:2.75rem;gap:.2rem;margin:0;padding:.25rem;border:1px solid var(--line);border-radius:999px;background:#fff}
        .tm-filtri button{align-self:stretch;padding:0 .85rem;border:0;border-radius:999px;background:none;font:700 .68rem var(--font-sans),sans-serif;color:var(--muted);cursor:pointer}
        .tm-filtri button.tm-filter-on{background:var(--ink);color:var(--paper)}
        .tm-mobilni-filter-gumb{display:none}
        /* skupni »Filter« gumb (oznake+projekti) -> slide-up list; bel, hover micro-anim */
        .tm-filter-vec{flex:none;display:inline-flex;align-items:center;gap:.4rem;min-height:2.75rem;padding:0 1rem;border:1px solid var(--line);border-radius:999px;background:#fff;color:var(--ink);font:750 .74rem var(--font-sans),sans-serif;cursor:pointer;transition:background .16s,color .16s,border-color .16s,transform .16s cubic-bezier(.2,.8,.3,1),box-shadow .16s}
        .tm-filter-vec:hover{border-color:color-mix(in oklch,var(--ink) 40%,transparent);transform:translateY(-1px);box-shadow:0 .4rem 1rem oklch(30% .02 55/.1)}
        .tm-filter-vec.aktiv{background:var(--ink);color:var(--paper);border-color:var(--ink)}
        .tm-filter-vec-pika{width:.4rem;height:.4rem;border-radius:50%;background:currentColor}
        .tm-sheet-pod{margin:.5rem 0 .45rem;font:800 .62rem var(--font-sans),sans-serif;letter-spacing:.14em;text-transform:uppercase;color:#665f58}
        /* filter po oznaki (tagu) — spustni izbor poleg vse/moje/zamujene */
        .tm-filter-oznaka{appearance:none;-webkit-appearance:none;-moz-appearance:none;min-height:2.75rem;padding:0 1.8rem 0 .85rem;border:1px solid var(--line);border-radius:999px;background-color:#fff;color:var(--ink);font:700 .68rem var(--font-sans),sans-serif;cursor:pointer;background-repeat:no-repeat;background-position:right .6rem center;background-size:9px;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236E4FA6' stroke-width='2.8' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")}
        /* .shell sili font-size:16px !important na VSE selecte -> ta dva sta bila večja od
           sosednjih gumbov. Zvišana specifičnost + !important poravna velikost in sprosti prostor. */
        .tm-pogled-filtri-vrsta .tm-filter-oznaka{font-size:.72rem !important}
        .tm-filter-oznaka:focus{outline:none;border-color:var(--ink)}
        .tm-mobilni-sheet-zastor{position:fixed;inset:0;z-index:1000;display:flex;align-items:flex-end;background:rgba(25,18,14,.2);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);animation:tm-sheet-fade .22s ease-out}
        .tm-mobilni-sheet{width:100%;max-height:80vh;overflow-y:auto;padding:.55rem 1rem calc(1rem + env(safe-area-inset-bottom));border-radius:1.4rem 1.4rem 0 0;background:#fff;color:#17110e;box-shadow:0 -1.2rem 4rem rgba(25,18,14,.16);animation:tm-sheet-vstop .34s cubic-bezier(.16,1,.3,1)}
        .tm-mobilni-sheet-rocaj{width:2.8rem;height:.25rem;margin:0 auto .85rem;border-radius:999px;background:#d7d0c5}
        .tm-mobilni-sheet-glava{display:flex;align-items:flex-start;justify-content:space-between;gap:1rem;margin-bottom:1rem}
        .tm-mobilni-sheet-glava p{margin:0 0 .3rem;font:800 .62rem var(--font-sans),sans-serif;letter-spacing:.16em;color:#665f58}
        .tm-mobilni-sheet-glava h2{margin:0;font:500 1.45rem/1.1 var(--font-serif),Georgia,serif}
        .tm-mobilni-sheet-glava button{display:grid;place-items:center;width:2.75rem;height:2.75rem;border:1px solid #ded8cf;border-radius:50%;background:#fff;color:#17110e}
        .tm-mobilni-sheet-izbire{display:grid;gap:.5rem}
        .tm-mobilni-sheet-izbire button{display:flex;align-items:center;justify-content:space-between;min-height:3.25rem;padding:0 1rem;border:1px solid #ded8cf;border-radius:.9rem;background:#fff;color:#17110e;font:750 1rem var(--font-sans),sans-serif;text-align:left}
        .tm-mobilni-sheet-izbire button.tm-mobilni-sheet-on{border-color:#17110e;background:#17110e;color:#fff}
        @keyframes tm-sheet-fade{from{opacity:0}to{opacity:1}}
        @keyframes tm-sheet-vstop{from{transform:translateY(105%)}to{transform:translateY(0)}}
        /* gumb "Naloži razvojne naloge (Flow)" v glavi + kratko sporocilo ob kliku */
        .tm-seed-gumb{flex:none;display:inline-flex;align-items:center;gap:.4rem;min-height:2.75rem;padding:0 1rem;border:1px solid var(--line);border-radius:999px;background:#fff;color:var(--ink);font:750 .7rem var(--font-sans),sans-serif;cursor:pointer;transition:background .15s,color .15s,border-color .15s}
        .tm-orodje-ikona{width:2.75rem;padding:0;justify-content:center}
        .tm-seed-gumb:hover{background:var(--ink);color:var(--paper);border-style:solid;border-color:var(--ink)}
        .tm-seed-sporocilo{font:600 .68rem var(--font-sans),sans-serif;color:var(--muted)}
        /* Uvoz/izvoz meni (spusti se pod ikono) */
        .tm-ie-w{position:relative;flex:none;display:inline-flex}
        .tm-ie-meni{position:absolute;top:calc(100% + .4rem);right:0;z-index:40;min-width:15rem;background:#fff;border:1px solid var(--line);border-radius:.8rem;box-shadow:0 14px 38px -14px color-mix(in oklch,var(--ink) 40%,transparent);padding:.4rem;display:flex;flex-direction:column;gap:.15rem}
        .tm-ie-h{margin:.25rem .5rem .35rem;font:700 .6rem var(--font-sans),sans-serif;letter-spacing:.06em;text-transform:uppercase;color:color-mix(in oklch,var(--ink) 72%,transparent)}
        .tm-ie-meni button{display:flex;align-items:center;gap:.5rem;width:100%;text-align:left;border:0;background:none;border-radius:.55rem;padding:.55rem .6rem;font:600 .8rem var(--font-sans),sans-serif;color:var(--ink);cursor:pointer}
        .tm-ie-meni button:hover{background:color-mix(in oklch,var(--purple) 8%,transparent)}
        .tm-ie-demo{color:color-mix(in oklch,var(--ink) 72%,transparent) !important;border-top:1px solid var(--line) !important;margin-top:.15rem;border-radius:0 0 .55rem .55rem !important}
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
        .tm-oznaka-predlog{padding:.28rem .6rem;border:1px dashed var(--line);border-radius:999px;background:transparent;color:color-mix(in oklch,var(--ink) 72%,transparent);font:700 .62rem var(--font-sans),sans-serif;cursor:pointer}
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

        .tm-kartica{padding:.8rem .85rem;border:none;border-radius:.9rem;background:rgba(255,255,255,.5);backdrop-filter:blur(16px) saturate(1.3);-webkit-backdrop-filter:blur(16px) saturate(1.3);box-shadow:0 6px 18px oklch(20% .03 55/.08),inset 0 1px 0 rgba(255,255,255,.55);cursor:pointer;transition:box-shadow .18s ease,transform .18s ease,background .18s ease}
        .tm-kartica:hover{background:#fff;box-shadow:0 11px 26px oklch(20% .03 55/.13),inset 0 1px 0 rgba(255,255,255,.7);transform:translateY(-1px)}
        .tm-kartica:active{cursor:grabbing;transform:none}
        .tm-kartica:focus-visible{outline:2px solid oklch(62% .19 300);outline-offset:2px}
        .tm-kartica-vrh{display:flex;align-items:center;gap:.4rem;min-height:1.15rem;margin-bottom:.5rem}
        .tm-kartica-tag{padding:.16rem .5rem;border-radius:999px;background:oklch(95% .02 300/.7);color:oklch(40% .1 300);font:800 .58rem var(--font-sans),sans-serif;letter-spacing:.04em;text-transform:uppercase;white-space:nowrap}
        .tm-kartica-x{flex:none;margin-left:auto;width:1.5rem;height:1.5rem;padding:0;border:0;border-radius:50%;background:transparent;color:var(--muted);font-size:.95rem;line-height:1;cursor:pointer;opacity:.55;transition:opacity .15s,background .15s,color .15s}
        .tm-kartica:hover .tm-kartica-x{opacity:1}
        .tm-kartica-x:hover{background:var(--ink);color:var(--paper);opacity:1}
        .tm-kartica-naslov{display:block;font-size:.9rem;font-weight:650;line-height:1.32;color:var(--ink)}
        .tm-kartica-opis{margin:.35rem 0 0;color:var(--muted);font-size:.76rem;line-height:1.5;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
        .tm-noga-desno{display:flex;align-items:center;gap:.4rem;margin-left:auto}
        .tm-prioriteta-znacka{padding:.16rem .5rem;border-radius:999px;font:800 .6rem var(--font-sans),sans-serif;white-space:nowrap}
        .tm-prioriteta-znacka-visoka{background:oklch(58% .16 35);color:#fff}
        .tm-prioriteta-znacka-srednja{background:oklch(89% .015 80);color:var(--ink)}
        .tm-prioriteta-znacka-nizka{background:oklch(95% .008 87);color:var(--muted)}
        .tm-kartica-stop{display:inline-flex;align-items:center;gap:.28rem;padding:.18rem .55rem .18rem .45rem;border:1px solid var(--line);border-radius:999px;background:var(--paper);color:var(--muted);font:700 .62rem var(--font-sans),sans-serif;cursor:pointer;transition:background .15s,color .15s,border-color .15s}
        .tm-kartica-stop-cas{font-variant-numeric:tabular-nums}
        .tm-kartica-stop:hover{border-color:color-mix(in oklch,var(--ink) 24%,transparent);color:var(--ink)}
        .tm-kartica-stop-tece{background:oklch(62% .19 300);border-color:oklch(62% .19 300);color:#fff}
        .tm-kartica-stop-tece:hover{background:oklch(56% .19 300);color:#fff}
        .tm-kartica-stop:disabled{cursor:default;opacity:.55}
        .tm-kartica-oblacek{display:inline-flex;align-items:center;gap:.2rem;margin-left:auto;padding:.12rem .42rem;border-radius:999px;font:800 .58rem var(--font-sans),sans-serif}
        .tm-oblacek-sef{background:oklch(94% .03 300);color:oklch(38% .1 300)}
        .tm-oblacek-sodelavec{background:oklch(92% .05 165);color:oklch(34% .09 165)}
        .tm-oblacek-stranka{background:oklch(93% .06 30);color:oklch(46% .16 30)}
        .tm-oblacek-jaz{background:oklch(95% .01 87);color:var(--muted)}
        .tm-vloga-znacka{padding:.1rem .45rem;border-radius:999px;font:800 .56rem var(--font-sans),sans-serif;letter-spacing:.02em;white-space:nowrap}
        .tm-vloga-sef{background:oklch(94% .03 300);color:oklch(38% .1 300)}
        .tm-vloga-sodelavec{background:oklch(92% .05 165);color:oklch(34% .09 165)}
        .tm-vloga-stranka{background:oklch(93% .06 30);color:oklch(46% .16 30)}
        .tm-vloga-jaz{background:oklch(95% .01 87);color:var(--muted)}
        .tm-opis-avtor{display:flex;align-items:center;gap:.5rem;margin-bottom:.7rem;padding-bottom:.7rem;border-bottom:1px dashed var(--line)}
        .tm-opis-avtor-ime{font:400 .74rem var(--font-sans),sans-serif;color:var(--muted)}
        .tm-opis-avtor-ime strong{font-weight:650;color:var(--ink)}
        .tm-oseba-krog-sm{width:1.15rem;height:1.15rem;font-size:.5rem;flex:none}
        .tm-komentar-cas{margin-left:auto}
        .tm-nova-oznake{display:flex;flex-wrap:wrap;gap:.35rem;margin-top:.35rem}
        .tm-nova-oznake-vnos{display:flex;gap:.4rem;margin-top:.45rem}
        .tm-nova-oznake-vnos input{flex:1}
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
        .tm-pogled-preklop{display:inline-flex;align-items:center;flex:none;min-height:2.75rem;gap:.2rem;margin:0;padding:.25rem;border:1px solid var(--line);border-radius:999px;background:#fff}
        .tm-pogled-preklop button{align-self:stretch;padding:0 .95rem;border:0;border-radius:999px;background:none;font:750 .7rem var(--font-sans),sans-serif;color:var(--muted);cursor:pointer}
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
        .tm-analitika-podlaga,.tm-detajli-podlaga,.tm-dodelitev-podlaga{position:fixed;inset:0;z-index:120;display:flex;justify-content:flex-end;background:oklch(20% .02 55/.32);backdrop-filter:blur(2px)}
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
        .tm-teden-naslov strong{font:600 1rem var(--font-sans),sans-serif;letter-spacing:-.01em;color:var(--ink)}
        .tm-teden-danes{padding:.3rem .7rem;border:1px solid var(--line);border-radius:999px;background:var(--paper);color:color-mix(in oklch,var(--ink) 72%,transparent);font:700 .64rem var(--font-sans),sans-serif;cursor:pointer}
        .tm-teden-danes:hover{opacity:1;border-color:var(--ink)}
        .tm-obdobje-preklop{display:inline-flex;gap:.2rem;padding:.25rem;border:1px solid var(--line);border-radius:999px;background:#fff}
        .tm-obdobje-preklop button{padding:.4rem .85rem;border:0;border-radius:999px;background:none;font:700 .68rem var(--font-sans),sans-serif;color:color-mix(in oklch,var(--ink) 72%,transparent);cursor:pointer}
        .tm-obdobje-preklop button.tm-pogled-on{background:var(--ink);color:var(--paper);opacity:1}
        .tm-plan-akcije{margin-left:auto;display:flex;align-items:center;gap:.6rem;flex-wrap:wrap}
        .tm-teden-dodaj{flex:none;padding:.35rem .75rem;border:1px dashed var(--line);border-radius:999px;background:transparent;color:color-mix(in oklch,var(--ink) 72%,transparent);font:700 .66rem var(--font-sans),sans-serif;cursor:pointer}
        .tm-teden-dodaj:hover{border-style:solid;border-color:var(--ink);opacity:1}
        .tm-plan-nov-projekt{max-width:26rem}

        /* status dodelitve — samostojen pill-select, isti chevron kot ostali selecti */
        .tm-status-select{appearance:none;-webkit-appearance:none;-moz-appearance:none;padding:.2rem 1.3rem .2rem .55rem;border:1px solid var(--line);border-radius:999px;font:700 .62rem var(--font-sans),sans-serif;cursor:pointer;background-color:oklch(96% .006 87);color:var(--ink);background-repeat:no-repeat;background-position:right .4rem center;background-size:9px;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236E4FA6' stroke-width='2.8' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")}
        .tm-status-select:disabled{opacity:.6;cursor:not-allowed}

        /* gumb "Prenesi v naslednji cikel" — ustvari kopijo PRENESENE dodelitve v naslednjem obdobju */
        .tm-prenesi-cikel{display:inline-flex;align-items:center;gap:.35rem;align-self:flex-start;margin:-.2rem 0 .8rem;padding:.5rem .8rem;border:1px dashed var(--line);border-radius:999px;background:transparent;color:var(--ink);font:700 .68rem var(--font-sans),sans-serif;cursor:pointer;transition:background .15s,color .15s,border-color .15s}
        .tm-prenesi-cikel:hover{background:var(--ink);color:var(--paper);border-style:solid;border-color:var(--ink)}

        /* namig, da pisanje v predogledu (demo) ni na voljo — enak vzorec kot ostali prazni/opozorilni namigi */
        .tm-demo-namig{margin:0;font:400 .74rem var(--font-sans),sans-serif;color:color-mix(in oklch,var(--ink) 72%,transparent)}

        /* matrika: vrstice=projekti, stolpci=oddelki */
        .tm-matrika-drs{overflow-x:auto;border:1px solid var(--line);border-radius:1rem;background:oklch(97.5% .008 87/.5)}
        .tm-matrika{width:100%;border-collapse:collapse;min-width:38rem}
        .tm-matrika thead th{position:sticky;top:0;padding:.7rem .9rem;text-align:left;font:800 .64rem var(--font-sans),sans-serif;letter-spacing:.06em;text-transform:uppercase;color:color-mix(in oklch,var(--ink) 72%,transparent);background:oklch(97.5% .008 87/.95);border-bottom:1px solid var(--line);white-space:nowrap}
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
        .tm-celica-cip-tekst em{font:400 .62rem var(--font-sans),sans-serif;font-style:normal;color:color-mix(in oklch,var(--ink) 72%,transparent)}
        .tm-celica-cip-pika{width:.45rem;height:.45rem;flex:none}
        .tm-status-nacrtovano .tm-celica-cip-pika{background:oklch(62% .19 300)}
        .tm-status-opravljeno .tm-celica-cip-pika{background:oklch(68% .16 150)}
        .tm-status-delno .tm-celica-cip-pika{background:oklch(74% .15 70)}
        .tm-status-preneseno .tm-celica-cip-pika{background:oklch(58% .16 30)}
        .tm-celica-cip-znacka{flex:none;padding:.1rem .4rem;border-radius:999px;background:oklch(95% .01 87);color:color-mix(in oklch,var(--ink) 72%,transparent);font:700 .58rem var(--font-sans),sans-serif}
        .tm-celica-dodaj{align-self:flex-start;padding:.3rem .55rem;border:1px dashed var(--line);border-radius:.7rem;background:transparent;color:color-mix(in oklch,var(--ink) 72%,transparent);font:700 .62rem var(--font-sans),sans-serif;cursor:pointer}
        .tm-celica-dodaj:hover{opacity:1;border-style:solid;border-color:var(--ink)}
        .tm-celica-prazno{padding:.35rem 0;color:var(--ink);opacity:.3;font-size:.74rem}

        /* panel Uredi oddelke */
        .tm-oddelki-seznam{list-style:none;margin:.2rem 0 1.1rem;padding:0;display:flex;flex-direction:column;gap:.5rem}
        .tm-oddelki-vrstica{display:flex;align-items:center;gap:.5rem;padding:.5rem .6rem;border:1px solid var(--line);border-radius:.7rem;background:oklch(100% 0 0/.6)}
        .tm-oddelki-vrstica strong{flex:1;min-width:0;font-size:.78rem;font-weight:650;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .tm-oddelki-vrstica select{flex:none;max-width:11rem;padding:.4rem 1.8rem .4rem .55rem;border:1px solid var(--line);border-radius:.6rem;background-color:var(--paper);font:inherit;font-size:.72rem;color:var(--ink)}

        /* lastna področja dela — čipi + gumb »+« za iskanje/dodajanje (urejljivo, ne trdo zakodirano) */
        .tm-podrocja{display:flex;flex-wrap:wrap;align-items:center;gap:.4rem;margin:-.4rem 0 .5rem}
        .tm-podrocja-prazno{font:400 .68rem var(--font-sans),sans-serif;color:color-mix(in oklch,var(--ink) 72%,transparent);margin:0}
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

        @media (max-width:1100px) and (min-width:701px){
          .tm-deska{grid-template-columns:repeat(2,minmax(0,1fr))}
        }
        @media (max-width:860px){
          .tm-glava,.tm-glava-uvod{align-items:flex-start}
          .tm-glava-uvod{flex-direction:column;width:100%;gap:.8rem}
          .tm-uporabnik{width:100%}
          .tm-uporabnik select{flex:1;min-width:0}
          .tm-plan-akcije{margin-left:0;width:100%}
          .tm-matrika tbody td,.tm-matrika-projekt-glava,.tm-matrika tbody th.tm-matrika-projekt{min-width:9rem}
        }
        /* iPad / ozek prenosnik (701–1240): stisni gumbe+selecte, da orodna vrstica ostane ENA.
           Analitika -> samo ikona (kot uvoz/izvoz in AI); ožji razmiki + padding na segmentih/selectih. */
        @media (min-width:701px) and (max-width:1240px){
          .tm-pogled-filtri-vrsta{gap:.45rem}
          .tm-glava-akcije{gap:.4rem}
          .tm-analitika-gumb{width:2.75rem;min-width:2.75rem;padding:0;justify-content:center;border-radius:50%}
          .tm-analitika-gumb .tm-akcija-tekst{display:none}
          .tm-filtri button{padding:0 .6rem}
          .tm-pogled-preklop button{padding:0 .62rem}
          .tm-filter-oznaka{padding:0 1.5rem 0 .68rem}
          .tm-nova{padding:0 .85rem}
        }
        @media (max-width:700px){
          .tm-deska{grid-template-columns:none;grid-auto-flow:column;grid-auto-columns:min(82vw,22rem);overflow-x:auto;scroll-snap-type:x mandatory;padding-bottom:.6rem;margin-right:-.5rem;padding-right:.5rem;scroll-padding-right:.5rem}
          .tm-stolpec{scroll-snap-align:start}
        }
        @media (max-width:600px){
          .tm{padding:.75rem .5rem 4rem}
          .tm-podnaslov{max-width:none}
          .tm-uporabnik select{font-size:1rem}
          /* Mobilni toolbar: izbira nalog odpre spodnji panel; projekt ostane vedno dosegljiv. */
          .tm-pogled-filtri-vrsta{display:flex;flex-wrap:wrap;align-items:center;gap:.5rem .55rem;width:100%}
          .tm-pogled-preklop{flex:none;width:auto}
          .tm-filtri-vrsta{order:2;flex:1 1 100%;min-width:0;display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:.5rem;overflow:visible}
          .tm-filtri{display:none}
          .tm-mobilni-filter-gumb{display:flex;align-items:center;justify-content:space-between;min-width:0;min-height:2.75rem;padding:0 .75rem 0 .9rem;border:1px solid var(--line);border-radius:999px;background:#fff;color:var(--ink);font:750 .82rem var(--font-sans),sans-serif}
          .tm-mobilni-filter-gumb span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
          .tm-filter-oznaka{width:100%;min-width:0;font-size:.82rem;padding-left:.9rem}
          .tm-filter-projekt{grid-column:1/-1}
          .tm-pogled-preklop button{flex:none;min-width:0;padding-inline:.7rem}
          .tm-glava-akcije{order:1;flex:1 1 0;display:flex;flex-wrap:nowrap;align-items:center;justify-content:flex-end;gap:.4rem;width:auto;margin-left:auto;overflow:visible}
          .tm-analitika-gumb,.tm-orodje-ikona,.tm-nova,.tm-seed-gumb-ai{flex:none;width:2.75rem;min-width:2.75rem;min-height:2.75rem;padding:0;justify-content:center;border-radius:50%}
          .tm-nova{background:var(--ink);color:var(--paper)}
          .tm-akcija-tekst{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
          .tm-ie-meni{position:fixed;left:.75rem;right:.75rem;top:auto;bottom:calc(.75rem + env(safe-area-inset-bottom));min-width:0}
          .tm-seed-sporocilo,.tm-demo-namig{flex-basis:100%}
          .tm-x,.tm-kartica-x,.tm-cas-gumb,.tm-podopravilo-krog,.tm-podopravilo-dodeli-gumb,.tm-podopravilo-brisi,.tm-podrocje-plus{min-width:2.75rem;min-height:2.75rem}
        }
        @media (prefers-reduced-motion:reduce){.tm-mobilni-sheet-zastor,.tm-mobilni-sheet{animation:none}}

        /* Enoten »Apple glass« videz na glavnih vsebinskih panelih (kanban stolpci) */
        .tm-stolpec{background:rgba(255,255,255,.5) !important;backdrop-filter:blur(18px) saturate(1.35);-webkit-backdrop-filter:blur(18px) saturate(1.35);box-shadow:0 1px 2px oklch(30% .02 55 / .035),0 10px 26px oklch(30% .02 55 / .05),inset 0 1px 0 rgba(255,255,255,.5)}
      `}</style>
    </div>
  );
}
