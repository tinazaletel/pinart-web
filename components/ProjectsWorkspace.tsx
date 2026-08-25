'use client';

import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { Plus, TextB, TextItalic, ListBullets, LinkSimple, Tray, PaperPlaneTilt, PaperPlaneRight, NotePencil, Trash, MagnifyingGlass, ArrowBendUpLeft, ArrowBendUpRight, ChatCircle, FolderSimplePlus, Tag, CheckSquare, Sparkle, Printer, Star, Paperclip, Check, List } from '@phosphor-icons/react';
import styles from '@/app/[locale]/kalkulator/pregled/pregled.module.css';
import ArhivFilter from '@/components/ArhivFilter';
import Paginacija from '@/components/Paginacija';
import MetricIcon from '@/components/MetricIcon';
import ProjectDetailModern from '@/components/ProjectDetailModern';
import SwapText from '@/components/SwapText';
import { loadFlowData, loadProjectLinks, saveOfferAmount, saveOfferStatus, saveProjectLinks, type FlowClient, type FlowContract, type FlowExpense, type FlowInvoice, type FlowOffer, type FlowOfferStatus, type FlowProjectLink } from '@/lib/pinartFlowStore';
import { podatkiZaPredogled, usePredogled, demoSodelavci, demoRealZaOffer } from '@/lib/predogled';
import { preberiPostoProjekta, dodajPosto, premakniPosto, nastaviOznakePoste, type PostaVnos } from '@/lib/postaDnevnik';
import { preberiKlepet, dodajKlepet, nitId, type KlepetSporocilo } from '@/lib/klepet';
import { zagotoviNit, nalozSporocila, posljiSporocilo, narociSporocila, mojEmail, type OblacnoSporocilo } from '@/lib/klepetCloud';
import { pullProjectMail, saveDraft, trashProjectMail, restoreProjectMail, deleteProjectMailPermanent } from '@/lib/pinartMailCloud';
import { posljiMail } from '@/lib/posta';
import { type PodpisPodatki, podpisHtml, podpisPrazen } from '@/lib/podpis';
import { aktivniLogo } from '@/lib/dokVidez';
import { fazaProjekta, preberiProjekti, shraniProjekt, type Projekt, type ProjektFaza, type ProjektStatus as ProjektEntitetaStatus } from '@/lib/projekti';
import { preberiSodelavci, shraniSodelavci } from '@/lib/sodelavci';
import Toast from '@/components/Toast';
import KomunikacijaWorkspace from '@/components/KomunikacijaWorkspace';
import { preberiNaloge, shraniNaloge, type Sodelavec, type Naloga } from '@/lib/naloge';

/* datumski filter (samo od–do; prazno ne omejuje) — enako kot arhiv */
const vObdobju = (dateStr: string, od: string, doD: string): boolean => {
  if (!od && !doD) return true;
  const t = new Date(dateStr).getTime();
  if (isNaN(t)) return false;
  if (od && t < new Date(od + 'T00:00:00').getTime()) return false;
  if (doD && t > new Date(doD + 'T23:59:59').getTime()) return false;
  return true;
};

const money = (value: number) => `${value.toLocaleString('sl-SI', { maximumFractionDigits: 2 })} €`;
const datStr = (s: string) => { const d = new Date(s); return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('sl-SI'); };
const casStr = (s: string) => { const d = new Date(s); return isNaN(d.getTime()) ? '' : d.toLocaleTimeString('sl-SI', { hour: '2-digit', minute: '2-digit' }); };
/* Berljivo telo prejetega maila: ohrani prelome (br/p/div -> \n), odstrani tage,
   dekodira entitete (&lt; -> <). Renderira se z white-space: pre-wrap. Enako kot v Komunikacijah. */
const beriTeloMaila = (raw?: string): string => String(raw || '')
  .replace(/<\s*br\s*\/?\s*>/gi, '\n')
  .replace(/<\/(p|div|li|tr|h[1-6]|blockquote)\s*>/gi, '\n')
  .replace(/<[^>]+>/g, '')
  .replace(/&nbsp;/gi, ' ').replace(/&lt;/gi, '<').replace(/&gt;/gi, '>')
  .replace(/&quot;/gi, '"').replace(/&#39;/gi, "'").replace(/&amp;/gi, '&')
  .replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n')
  .trim();

/* demo CRM dnevnik (predogled »polno poslovanje«) — nekaj vnosov, da kartica
   CRM v Delovnem pogledu ni prazna; pravi dnevnik je na strani stranke */
const DEMO_CRM = [
  { id: 'crm-1', datum: '2026-07-28', tip: 'Sestanek', opis: 'Pregled osnutkov — uskladitev tipografije in hierarhije' },
  { id: 'crm-2', datum: '2026-07-15', tip: 'Klic', opis: 'Uskladitev obsega aneksa 2 (vzdrževanje)' },
  { id: 'crm-3', datum: '2026-06-30', tip: 'E-pošta', opis: 'Potrditev terminskega načrta za Q3' },
  { id: 'crm-4', datum: '2026-05-20', tip: 'Dogovor', opis: 'Podaljšanje vzdrževanja 2025/26' },
];

/* demo aktivni taski (predogled) — da kartica ni prazna; task↔projekt povezava pride s kolaboracijo */
const DEMO_NALOGE = [
  { id: 'n1', naslov: 'Wireframe ključnih strani portala', status: 'dela' as const, oseba: 'Luka Beg' },
  { id: 'n2', naslov: 'Prototip navigacije in iskalnika', status: 'pregled' as const, oseba: 'Eva Kralj' },
  { id: 'n3', naslov: 'Uskladitev tipografije s CGP', status: 'dela' as const, oseba: 'Tina Zaletel' },
  { id: 'n4', naslov: 'Testiranje dostopnosti (WCAG AA)', status: 'todo' as const, oseba: 'Marko Zupan' },
  { id: 'n5', naslov: 'Optimizacija hitrosti nalaganja', status: 'koncano' as const, oseba: 'Luka Beg' },
];

/* status projekta (tabela) — izpeljano iz offer.status po ISTI logiki kot filter
   spodaj (aktivni=accepted, cakajo=sent, zakljuceni=rejected); tone usklajen s
   tem, kako je isti offer.status prikazan v zavihku Ponudbe (statusOdtenek v
   ArhivWorkspace), le "zakljuceni" tu pomeni uspešno zaključen projekt (success),
   ceprav je pod-podatkom "rejected" ponudba (obstoječa, nespremenjena logika). */
type Odtenek = 'success' | 'waiting' | 'danger' | 'neutral';
const projectStatusInfo = (status: FlowOfferStatus): { label: string; tone: Odtenek } => {
  if (status === 'accepted') return { label: 'Aktivni', tone: 'success' };
  if (status === 'sent') return { label: 'Čakajo', tone: 'waiting' };
  if (status === 'rejected') return { label: 'Zaključeni', tone: 'danger' };
  return { label: 'Osnutek', tone: 'neutral' };
};

/* PRAVI projekti (lib/projekti, ustvarjeni prek "+ Nov projekt") nimajo ponudbe
   za sabo — za prikaz v isti tabeli/detajlu dobijo SINTETIČNO FlowOffer (glej
   gradiVnos spodaj). Status projekta se preslika na status ponudbe po ISTIH
   treh vedrih, ki jih ze uporablja filter zgoraj (Aktivni/Čakajo/Zaključeni),
   da sta tabela in filter brez dodatne logike takoj usklajena. Naslov strani
   (statusLabel) pa uporablja svoj, bolj natancen jezik za prave projekte. */
const projektDoOfferStatus: Record<ProjektEntitetaStatus, FlowOfferStatus> = { aktiven: 'accepted', pavza: 'sent', koncan: 'rejected' };

/* pika statusa z INLINE slogom (barva + velikost neposredno na elementu) — neodvisno
   od injeciranega CSS, da se zagotovo izrise povsod (waiting = oranzna ipd.) */
const pikaBarva: Record<string, string> = { waiting: 'oklch(72% .16 75)', success: 'oklch(62% .15 150)', danger: 'oklch(58% .19 25)', neutral: 'oklch(62% .02 70)' };
const pikaStil = (tone: string) => ({ width: '.55rem', height: '.55rem', borderRadius: '50%', flex: 'none' as const, display: 'inline-block' as const, marginRight: '.5rem', background: pikaBarva[tone] || pikaBarva.neutral });

/* Kirurški popravek mobilnega odreza po desni (~390–410px). Deluje samo na tej strani,
   ker cilja zgoščena imena razredov iz CSS modula — CSS modula ne spreminjamo (deljen). */
const overflowFix = `
.${styles.projectsPage}{overflow-x:clip;max-width:100%;}
.${styles.projectsPage} > *{min-width:0;}
.${styles.projectsToolbar} > label{min-width:0;}
.${styles.projectsToolbar} input{width:100%;min-width:0;box-sizing:border-box;}
.${styles.projectStory}{min-width:0;max-width:100%;overflow-x:clip;}
.${styles.projectStory} h2,
.${styles.projectStory} > header span{overflow-wrap:anywhere;}
@media (max-width:640px){
.${styles.projectsToolbar}{grid-template-columns:1fr;}
.${styles.projectMoney}{grid-template-columns:1fr;}
.${styles.projectNarrative}{grid-template-columns:1fr;}
.${styles.projectNarrative} .${styles.projectAgreement}{grid-column:1;}
}
`;

/* Seznam projektov = tabela v istem slogu kot ostali zavihki Arhiva (glej
   ArhivWorkspace .arh-tabela/.arh-vrstica/.arh-status ipd.) — tu podvojeno s
   predpono pw-, ker gre za drugo komponento/datoteko (SAMO BRANJE arh- razredov,
   videz replicirian). Klik na vrstico odpre detajl kot SAMOSTOJNO stran
   (glej pw-stran/pw-nazaj spodaj + selected/selectedId logika). */
const pwStyles = `
.pw-seznam-glava{display:flex;align-items:center;justify-content:space-between;padding:.1rem .2rem .9rem}
.pw-seznam-glava strong{font:500 1.5rem var(--font-sans),system-ui,sans-serif;color:var(--ink)}
.pw-tabela-ovoj{width:100%;overflow-x:auto;-webkit-overflow-scrolling:touch;border-radius:1.4rem}
.pw-tabela{min-width:640px;display:grid;grid-template-columns:1.7rem minmax(0,2.1fr) minmax(0,1.3fr) minmax(0,1fr) minmax(0,1.1fr) minmax(0,1fr) 1.6rem;background:rgba(255,255,255,.55);border:1px solid rgba(17,17,17,.1);border-radius:1.4rem;overflow:hidden}
.pw-chk-cel{display:flex;align-items:center;justify-content:center}
.pw-chk{width:1.05rem;height:1.05rem;border-radius:.34rem;border:1.5px solid oklch(78% .02 80);background:#fff;cursor:pointer;flex:none;display:grid;place-items:center;transition:background .12s,border-color .12s}
.pw-chk::after{content:"";width:.5rem;height:.28rem;border-left:2px solid #fff;border-bottom:2px solid #fff;transform:rotate(-45deg) translate(0,-1px);opacity:0;transition:opacity .12s}
.pw-chk.on{background:oklch(52% .13 300);border-color:oklch(52% .13 300)}
.pw-chk.on::after{opacity:1}
.pw-izbor-letev{position:fixed;left:50%;bottom:1.4rem;transform:translateX(-50%);z-index:1200;width:max-content;max-width:calc(100vw - 2rem);display:flex;align-items:center;gap:.9rem;padding:.6rem .7rem .6rem 1.1rem;border-radius:999px;background:oklch(28% .02 300);color:#fff;box-shadow:0 .8rem 2.4rem oklch(22% .04 300 / .32);animation:pwLetevIn .3s cubic-bezier(.16,1,.3,1) both}
@keyframes pwLetevIn{from{opacity:0;transform:translate(-50%,1rem)}to{opacity:1;transform:translate(-50%,0)}}
.pw-izbor-st{font-size:.8rem;font-weight:700;white-space:nowrap}
.pw-izbor-gumb{border:0;border-radius:999px;padding:.45rem .95rem;background:#fff;color:oklch(30% .03 300);font:700 .78rem var(--font-sans),system-ui,sans-serif;cursor:pointer;white-space:nowrap}
.pw-izbor-gumb:hover:not(:disabled){background:oklch(96% .02 300)}
.pw-izbor-gumb2{background:transparent;color:#fff;box-shadow:inset 0 0 0 1.5px oklch(100% 0 0 / .38)}
.pw-izbor-gumb2:hover:not(:disabled){background:oklch(100% 0 0 / .12)}
.pw-izbor-gumb:disabled,.pw-izbor-prekl:disabled{opacity:.6;cursor:default}
.pw-izbor-prekl{border:0;background:transparent;color:oklch(88% .02 300);font:600 .76rem var(--font-sans),system-ui,sans-serif;cursor:pointer;padding:.45rem .5rem}
.pw-izbor-prekl:hover{color:#fff}
.pw-tabela-naslov{grid-column:1 / -1;display:flex;align-items:center;justify-content:space-between;gap:1rem;padding:.95rem 1rem .85rem;background:oklch(95% .035 300);border-bottom:1px solid rgba(17,17,17,.08)}
.pw-tabela-naslov .${styles.eyebrow}{color:oklch(45% .12 300)}
.pw-tabela-naslov strong{font-family:var(--font-serif),Didot,serif;font-weight:500;font-size:1.6rem;line-height:1;color:var(--ink)}
.pw{--muted:color-mix(in oklch,var(--ink) 72%,transparent)}
.pw-tabela > header{display:grid;grid-template-columns:subgrid;grid-column:1 / -1;gap:1.1rem;padding:.75rem .9rem;font-size:.66rem;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:color-mix(in oklch,var(--ink) 72%,transparent);border-bottom:1px solid oklch(93% .006 82 / .55)}
.pw-vrstica{display:grid;grid-template-columns:subgrid;grid-column:1 / -1;align-items:center;gap:1.1rem;padding:.85rem .9rem;border:0;border-top:1px solid rgba(17,17,17,.07);background:transparent;font:inherit;color:var(--ink);text-align:left;cursor:pointer;transition:background .14s}
.pw-tabela > button.pw-vrstica:first-of-type{border-top:0}
.pw-vrstica:hover{background:#fff}
.pw-det-statusured,.pw-status-ured{position:relative;display:inline-flex;max-width:100%}
.pw-det-statusured[data-editable] .pw-status,.pw-status-ured[data-editable] .pw-status{cursor:pointer}
.pw-det-statusured[data-editable]::after,.pw-status-ured[data-editable]::after{content:none}
.pw-status-select{position:absolute;inset:0;width:100%;height:100%;margin:0;padding:0;opacity:0;border:0;border-radius:999px;background:transparent;cursor:pointer;appearance:none;-webkit-appearance:none;font:inherit}
.pw-status-select:disabled{cursor:default}
.pw-vrstica > span{min-width:0;font-size:.72rem;overflow-wrap:anywhere}
.pw-glavna{display:flex;align-items:center;gap:.6rem;min-width:0}
.pw-glavna strong{font-weight:700;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:.72rem}
@media (max-width:640px){
  /* Tabela projektov = KARTICA (brez horizontalnega scrolla):
     [✓] | ime + firma (1. stolpec, 2 vrsti) | status + znesek (2. stolpec, desno). */
  .pw-tabela-ovoj{overflow-x:hidden}
  .pw-tabela{min-width:0}
  .pw-tabela > header{display:none}
  .pw-vrstica{display:grid;grid-template-columns:auto 1fr auto;grid-template-areas:'chk ime status' 'chk firma znesek' 'chk datum znesek';column-gap:.6rem;row-gap:.05rem;align-items:center;padding:.7rem .85rem}
  .pw-vrstica > *{min-width:0}
  .pw-vrstica > :nth-child(1){grid-area:chk;align-self:center}
  .pw-vrstica > :nth-child(2){grid-area:ime}
  .pw-vrstica > :nth-child(3){grid-area:firma;font-size:.76rem;color:color-mix(in oklch,var(--ink) 60%,transparent)}
  .pw-vrstica > :nth-child(4){grid-area:datum;font-size:.72rem;color:color-mix(in oklch,var(--ink) 64%,transparent)}
  .pw-vrstica > :nth-child(5){grid-area:status;justify-self:end;align-self:center}
  /* znesek = poslovni podatek (skrit za sodelavce, ko bodo vloge); zaenkrat viden lastniku */
  .pw-vrstica > :nth-child(6){grid-area:znesek;justify-self:end;align-self:center;font-weight:700;font-size:.82rem;white-space:nowrap}
  .pw-vrstica > :nth-child(7){display:none}
  .pw-glavna{gap:.3rem}
  .pw-glavna i{margin-right:0 !important}
  .pw-glavna strong{font-size:.9rem}
}
.pw-ikona{display:grid;place-items:center;width:2rem;height:2rem;border-radius:50%;background:oklch(94% .045 295);color:var(--ink);flex:none}
.pw-mut{color:color-mix(in oklch,var(--ink) 72%,transparent)}
.pw-desno{text-align:right;font-weight:700}
.pw-kazalec{color:color-mix(in oklch,var(--ink) 72%,transparent);font-size:1.1rem;text-align:center}
.pw-status{display:inline-flex;align-items:center;gap:0;width:max-content;max-width:100%;padding:.4rem .85rem;border:1px solid color-mix(in oklch, var(--pill-ink, oklch(48% .015 70)) 14%, transparent);border-radius:999px;background:var(--pill-bg, oklch(95.5% .008 87));color:var(--pill-ink, oklch(48% .015 70));font-size:.78rem;font-weight:700;white-space:nowrap}
.pw-status .pw-pika{width:.55rem;height:.55rem;border-radius:50%;background:var(--pika,oklch(62% .02 70));flex:none}
.pw-status[data-tone='waiting']{--pika:oklch(72% .16 75);--pill-bg:oklch(96.5% .03 82);--pill-ink:oklch(54% .09 68)}
.pw-status[data-tone='success']{--pika:oklch(62% .15 150);--pill-bg:oklch(96% .035 158);--pill-ink:oklch(50% .085 158)}
.pw-status[data-tone='danger']{--pika:oklch(58% .19 25);--pill-bg:oklch(96.5% .03 28);--pill-ink:oklch(55% .11 27)}
.pw-status[data-tone='neutral']{--pika:oklch(62% .02 70);--pill-bg:oklch(95.5% .008 87);--pill-ink:oklch(48% .015 70)}
/* custom status-meni (desktop popover pod pilulo) */
.pw-statusmeni{position:absolute;top:calc(100% + .4rem);left:0;z-index:60;min-width:11rem;background:#fff;border:1px solid rgba(17,17,17,.1);border-radius:14px;box-shadow:0 16px 44px rgba(20,16,26,.16);padding:.4rem;animation:pwStMeni .16s ease both}
@keyframes pwStMeni{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:none}}
.pw-statusmeni-seznam{display:flex;flex-direction:column;gap:.1rem}
.pw-statusmeni-opcija{display:flex;align-items:center;justify-content:space-between;gap:.7rem;width:100%;padding:.6rem .7rem;border:none;border-radius:9px;background:none;font:inherit;font-size:.85rem;font-weight:600;color:var(--ink);text-align:left;cursor:pointer;white-space:nowrap;transition:background .12s}
.pw-statusmeni-opcija:hover{background:rgba(17,17,17,.05)}
.pw-statusmeni-opcija.on{background:var(--ink);color:#fff}
.pw-statusmeni-kljuk{flex:none}
/* mobile: slide-up sheet */
.pw-status-back{position:fixed;inset:0;z-index:130;overflow:hidden;background:rgba(28,21,24,.28);-webkit-backdrop-filter:blur(5px);backdrop-filter:blur(5px);display:flex;align-items:flex-end;justify-content:center;animation:pwStBack .2s ease both}
@keyframes pwStBack{from{opacity:0}to{opacity:1}}
.pw-status-sheet{width:100%;box-sizing:border-box;background:#fff;border-radius:20px 20px 0 0;box-shadow:0 -16px 44px rgba(40,25,40,.22);padding:1rem 1.1rem calc(1.3rem + env(safe-area-inset-bottom,0px));max-height:80dvh;overflow-y:auto;animation:pwStUp .3s cubic-bezier(.2,.8,.3,1) both}
@keyframes pwStUp{from{transform:translateY(100%)}to{transform:translateY(0)}}
.pw-status-sheet-glava{display:flex;align-items:center;justify-content:space-between;margin-bottom:.5rem}
.pw-status-sheet-glava p{margin:0;font-size:.72rem;font-weight:700;letter-spacing:.12em;color:rgba(17,17,17,.72)}
.pw-status-x{width:2.1rem;height:2.1rem;flex:none;border:1px solid rgba(17,17,17,.16);border-radius:50%;background:#fff;color:var(--ink);cursor:pointer;font-size:.85rem}
.pw-status-sheet .pw-statusmeni-opcija{min-height:3rem;font-size:16px;border-radius:12px;padding:.7rem .85rem}
@media (prefers-reduced-motion:reduce){.pw-status-back,.pw-status-sheet,.pw-statusmeni{animation:none}}
.pw-prazno{padding:2rem;color:color-mix(in oklch,var(--ink) 72%,transparent);font-size:.72rem;text-align:center;border:1px solid oklch(93% .006 82 / .55);border-radius:1.4rem;background:oklch(98% .008 87 / .92)}
.pw-stran{padding:.25rem 1rem 1rem !important;margin-top:-1.5rem;scroll-margin-top:5.5rem}
@media (max-width:640px){.pw-stran{padding-left:.5rem !important;padding-right:.5rem !important}}
.pw-nazaj{display:inline-flex;align-items:center;gap:.4rem;margin:0 0 .8rem;padding:.55rem .95rem;border:1px solid rgba(255,255,255,.7);border-radius:999px;background:#fff;box-shadow:0 4px 14px rgba(40,25,40,.06);font:700 .82rem var(--font-sans),sans-serif;color:var(--ink);cursor:pointer}
.pw-nazaj:hover{background:var(--ink);color:var(--paper)}
.pw-narocnik-link{color:inherit;text-decoration:underline;text-underline-offset:2px;text-decoration-color:color-mix(in oklch,var(--ink) 35%,transparent)}
.pw-narocnik-link:hover{color:oklch(52% .17 300);text-decoration-color:currentColor}
@media (max-width:640px){
.pw-tabela{min-width:0}
}
/* razdelki ZA 04 Stroški na detajlu projekta (05 Dokumentacija + placeholderji
   06 Komunikacije/07 Zapiski) — svoj pw- razdelek v duhu .projectNarrative
   kartic (isti border/radius/ozadje odtenek), da se lepo vklopi. */
.pw-dodatno{display:flex;flex-direction:column;gap:.55rem;margin-top:.55rem}
/* TRDNA sirina, ne po vsebini: fiksni .pw-rail brez width se meri po
   max-content otrok, zato je bil panel pri vsaki mapi drugace sirok, glava
   stisnjena (iskalnik cez Klepet), ob prazni vsebini pa se desni rob.
   (Tina, 25. 8.) width doloci max-content, shrink ostane za ozke zaslone. */
.pw-kom-panel{flex:0 1 1040px;width:min(1040px,92vw);min-width:0;max-width:min(1040px,92vw)}
/* okno Nova naloga iz maila */
.pw-naloga-panel{width:min(560px,94vw);padding:2.4rem 2rem}
.pw-naloga-obr{display:flex;flex-direction:column;gap:.9rem;margin-top:.6rem}
.pw-naloga-l{display:flex;flex-direction:column;gap:.35rem}
.pw-naloga-l>span{font:700 .66rem var(--font-sans),sans-serif;letter-spacing:.05em;text-transform:uppercase;color:color-mix(in oklch,var(--ink) 72%,transparent)}
.pw-naloga-l input,.pw-naloga-l textarea{width:100%;box-sizing:border-box;border:1px solid color-mix(in oklch,var(--ink) 10%,transparent);border-radius:.6rem;padding:.6rem .7rem;font:500 .88rem var(--font-sans),sans-serif;color:var(--ink);background:#fff;resize:vertical}
.pw-naloga-l input:focus,.pw-naloga-l textarea:focus{outline:none;border-color:var(--purple)}
.pw-naloga-l-opis textarea{min-height:9rem;line-height:1.55}
.pw-naloga-akcije{display:flex;justify-content:flex-end;gap:.6rem;margin-top:.3rem;flex-wrap:wrap}
.pw-naloga-preklic{border:1px solid color-mix(in oklch,var(--ink) 12%,transparent);background:#fff;color:var(--ink);border-radius:999px;padding:.55rem 1.1rem;font:600 .78rem var(--font-sans),sans-serif;cursor:pointer}
.pw-naloga-shrani{border:0;background:var(--ink);color:var(--paper);border-radius:999px;padding:.55rem 1.3rem;font:700 .78rem var(--font-sans),sans-serif;cursor:pointer}
.pw-naloga-shrani:disabled{opacity:.5;cursor:default}
/* Dokumentacija slide */
.pw-dok-uvod{margin:.1rem 0 .4rem;font:500 .85rem var(--font-sans),sans-serif;color:color-mix(in oklch,var(--ink) 72%,transparent);line-height:1.5}
.pw-dok-linki{display:flex;flex-direction:column;gap:.5rem;margin:.3rem 0 .2rem}
.pw-dok-vrstica{display:flex;align-items:center;gap:.6rem;padding:.7rem .85rem;border:1px solid color-mix(in oklch,var(--ink) 9%,transparent);border-radius:.7rem;background:#fff}
.pw-dok-vrstica a{flex:1;min-width:0;display:flex;flex-direction:column;text-decoration:none;color:var(--ink);font:700 .88rem var(--font-sans),sans-serif}
.pw-dok-vrstica a:hover{color:var(--purple)}
.pw-dok-url{font:500 .72rem var(--font-sans),sans-serif;color:color-mix(in oklch,var(--ink) 72%,transparent);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.pw-dok-brisi{flex:none;border:0;background:none;color:color-mix(in oklch,var(--ink) 72%,transparent);cursor:pointer;font-size:.9rem;padding:.2rem}
.pw-dok-brisi:hover{color:oklch(55% .18 25)}
.pw-dok-akc{flex:none;display:inline-flex;align-items:center;gap:.4rem}
.pw-dok-uredi{border:1px solid color-mix(in oklch,var(--ink) 12%,transparent);background:#fff;color:var(--ink);border-radius:999px;padding:.28rem .7rem;font:600 .72rem var(--font-sans),sans-serif;cursor:pointer}
.pw-dok-uredi:hover{border-color:var(--purple);color:var(--purple)}
.pw-dok-vrstica-ur{border-color:var(--purple);box-shadow:0 0 0 2px color-mix(in oklch,var(--purple) 20%,transparent)}
.pw-dok-prazno-t{margin:.4rem 0;font:500 .85rem var(--font-sans),sans-serif;color:color-mix(in oklch,var(--ink) 72%,transparent)}
.pw-dok-obrazec{display:flex;flex-direction:column;gap:.7rem;margin-top:1rem;padding-top:1rem;border-top:1px solid var(--line)}
.pw-dok-prazno{border:0;background:none;text-align:left;cursor:pointer;font:inherit;color:inherit;padding:0}
.pw-dok-prazno:hover{color:var(--purple)}
.pw-ai-panel{flex:none;width:360px}
.pw-ai-load{display:flex;align-items:center;gap:.5rem;color:color-mix(in oklch,var(--ink) 72%,transparent);font:600 .85rem var(--font-sans),sans-serif;margin-top:.4rem}
.pw-ai-pika{width:.45rem;height:.45rem;border-radius:999px;background:var(--purple);opacity:.35;animation:pwAiP 1s infinite ease-in-out}
.pw-ai-pika:nth-child(2){animation-delay:.15s}.pw-ai-pika:nth-child(3){animation-delay:.3s}
@keyframes pwAiP{0%,100%{opacity:.25;transform:translateY(0)}50%{opacity:1;transform:translateY(-2px)}}
.pw-ai-napaka{background:color-mix(in oklch,var(--purple) 7%,#fff);border:1px solid color-mix(in oklch,var(--purple) 20%,transparent);border-radius:.7rem;padding:.8rem .9rem;font:500 .85rem var(--font-sans),sans-serif;color:var(--ink);line-height:1.5}
.pw-ai-blok{display:flex;flex-direction:column;gap:.4rem}
.pw-ai-blok h4{margin:0;font:700 .66rem var(--font-sans),sans-serif;letter-spacing:.05em;text-transform:uppercase;color:color-mix(in oklch,var(--ink) 72%,transparent)}
.pw-ai-povzetek{margin:0;font:500 .9rem var(--font-sans),sans-serif;color:var(--ink);line-height:1.55;background:#fff;border:1px solid color-mix(in oklch,var(--ink) 8%,transparent);border-radius:.7rem;padding:.75rem .85rem}
.pw-ai-odg{width:100%;box-sizing:border-box;border:1px solid color-mix(in oklch,var(--ink) 10%,transparent);border-radius:.7rem;padding:.7rem .8rem;font:500 .88rem var(--font-sans),sans-serif;color:var(--ink);background:#fff;resize:vertical;line-height:1.55}
.pw-ai-odg:focus{outline:none;border-color:var(--purple)}
.pw-ai-akcije{display:flex;justify-content:flex-end;gap:.6rem;flex-wrap:wrap}
.pw-ai-kopiraj{border:1px solid color-mix(in oklch,var(--ink) 12%,transparent);background:#fff;color:var(--ink);border-radius:999px;padding:.5rem 1rem;font:600 .78rem var(--font-sans),sans-serif;cursor:pointer}
.pw-ai-uporabi{display:inline-flex;align-items:center;gap:.35rem;border:0;background:var(--purple);color:#fff;border-radius:999px;padding:.5rem 1.15rem;font:700 .78rem var(--font-sans),sans-serif;cursor:pointer}
.pw-ai-opomba{margin:0;font:500 .74rem var(--font-sans),sans-serif;color:color-mix(in oklch,var(--ink) 72%,transparent);line-height:1.45}
/* ── PANELNA LETEV: mail + Pupa (+ klepet) so STOLPCI vzporedno; NIKOLI se ne prekrivajo. ── */
.pw-rail-back{position:fixed;inset:0;z-index:60;background:oklch(97% .006 87 / .4);backdrop-filter:blur(9px);-webkit-backdrop-filter:blur(9px)}
body.flow-rail-odprt .pupa-fab{display:none !important}
.pw-rail{position:fixed;top:0;right:0;bottom:0;max-width:100vw;display:flex;flex-direction:row;align-items:stretch}
.pw-rail-col{position:relative;height:100%;box-sizing:border-box;display:flex;flex-direction:column;background:#fff;overflow:hidden;animation:pwRailIn .34s cubic-bezier(.16,1,.3,1) both}
.pw-rail-col + .pw-rail-col{border-left:1px solid color-mix(in oklch,var(--ink) 9%,transparent)}
.pw-rail > .pw-rail-col:first-child{box-shadow:-1.4rem 0 3.4rem -1.2rem oklch(20% .03 55 / .2)}
/* SAMO ta notranji predal se skrola; X plava, ozadje strani je zaklenjeno */
/* ozji rob: 2rem levo/desno je jemal prostor vsebini (Tina) */
.pw-rail-scroll{flex:1;min-height:0;overflow-y:auto;overflow-x:hidden;padding:2rem 1.4rem}
.pw-ai-scroll{display:flex;flex-direction:column;gap:1rem;padding:2.4rem 1.6rem}
.pw-klepet-scroll{padding:0}
@keyframes pwRailIn{from{opacity:.35;transform:translateX(26px)}to{opacity:1;transform:none}}
@media (prefers-reduced-motion:reduce){.pw-rail-col{animation:none}}
/* Ozek zaslon (<900px): stolpci se PREKRIJEJO (paneli čez, kot prej) — zadnji odprt je na vrhu. */
@media (max-width:899px){
  .pw-rail{left:0}
  .pw-rail-col{position:absolute;inset:0;width:100vw !important;max-width:100vw !important}
  .pw-rail-scroll{padding-left:1.1rem !important;padding-right:1.1rem !important}
  .pw-kom-panel{z-index:1}
  .pw-ai-panel{z-index:2}
  .pw-klepet-panel{z-index:3}
}
/* KLEPET stolpec (fallback barve, ker je letev portalana na body) */
.pw-klepet-panel{flex:none;width:400px;--kl-ink:var(--ink,oklch(19% .014 55));--kl-purple:var(--purple,oklch(66% .2 297));--kl-line:var(--line,oklch(93% .007 82))}
.pw-klepet-glava{flex:none;display:flex;align-items:center;justify-content:space-between;gap:.6rem;padding:1.5rem 4.7rem .9rem 1.1rem;border-bottom:1px solid var(--kl-line)}
.pw-klepet-osebe{display:flex;align-items:center;gap:.5rem;flex-wrap:wrap;min-width:0}
.pw-klepet-oseba{display:inline-flex;align-items:center;gap:.35rem}
.pw-klepet-oseba b{font:700 .82rem var(--font-sans),sans-serif;color:var(--kl-ink)}
.pw-klepet-av{position:relative;flex:none;width:2.2rem;height:2.2rem;border-radius:50%;display:grid;place-items:center;background:linear-gradient(140deg,oklch(72% .13 297),oklch(62% .2 297));color:#fff;font:700 .85rem var(--font-sans),sans-serif}
.pw-klepet-av.sm{width:1.9rem;height:1.9rem;font-size:.78rem}
.pw-klepet-pika{position:absolute;right:-1px;bottom:-1px;width:.62rem;height:.62rem;border-radius:50%;border:2px solid #fff;background:oklch(72% .02 90)}
.pw-klepet-pika[data-st="online"]{background:oklch(68% .16 150)}
.pw-klepet-pika[data-st="idle"]{background:oklch(78% .14 75)}
.pw-klepet-pika[data-st="offline"]{background:oklch(72% .02 90)}
.pw-klepet-kdo b{display:block;font:700 .88rem var(--font-sans),sans-serif;color:var(--kl-ink)}
.pw-klepet-kdo small{display:block;font:500 .7rem var(--font-sans),sans-serif;color:color-mix(in oklch,var(--kl-ink) 72%,transparent)}
.pw-klepet-piker-w{position:relative;flex:none}
.pw-klepet-dodaj{display:grid;place-items:center;width:2.2rem;height:2.2rem;border:1px solid color-mix(in oklch,var(--kl-ink) 16%,transparent);border-radius:50%;background:#fff;color:var(--kl-ink);cursor:pointer;transition:background .16s,color .16s,border-color .16s,transform .22s cubic-bezier(.16,1,.3,1)}
.pw-klepet-dodaj:hover{border-color:var(--kl-purple);color:var(--kl-purple)}
.pw-klepet-dodaj[aria-expanded="true"]{background:var(--kl-purple);color:#fff;border-color:transparent;transform:rotate(45deg)}
.pw-klepet-meni{position:absolute;top:calc(100% + .4rem);right:0;z-index:20;width:15rem;background:#fff;border:1px solid var(--kl-line);border-radius:.8rem;box-shadow:0 14px 38px -14px color-mix(in oklch,var(--kl-ink) 40%,transparent);padding:.35rem}
.pw-klepet-meni-h{margin:.25rem .5rem .3rem;font:700 .6rem var(--font-sans),sans-serif;letter-spacing:.06em;text-transform:uppercase;color:color-mix(in oklch,var(--kl-ink) 72%,transparent)}
.pw-klepet-meni-prazno{margin:.4rem .5rem;font:500 .74rem var(--font-sans),sans-serif;color:color-mix(in oklch,var(--kl-ink) 72%,transparent)}
.pw-klepet-vrsta{display:flex;align-items:center;gap:.55rem;width:100%;text-align:left;border:0;background:none;border-radius:.55rem;padding:.4rem .5rem;cursor:pointer}
.pw-klepet-vrsta:hover{background:color-mix(in oklch,var(--kl-purple) 8%,transparent)}
.pw-klepet-vrsta.on{background:color-mix(in oklch,var(--kl-purple) 12%,transparent)}
.pw-klepet-vrsta-ime{flex:1;min-width:0;font:600 .82rem var(--font-sans),sans-serif;color:var(--kl-ink)}
.pw-klepet-vrsta-ime small{display:block;font:500 .66rem var(--font-sans),sans-serif;color:color-mix(in oklch,var(--kl-ink) 72%,transparent)}
.pw-klepet-kljuk{flex:none;color:var(--kl-purple);font-weight:800}
.pw-klepet-tok{flex:1;min-height:0;overflow-y:auto;display:flex;flex-direction:column;gap:.5rem;padding:1rem 1.1rem}
.pw-klepet-b{max-width:82%;align-self:flex-start;padding:.5rem .8rem;border-radius:1.05rem;background:oklch(95% .008 87);color:var(--kl-ink);font:500 .85rem var(--font-sans),sans-serif;line-height:1.45;white-space:pre-wrap;word-break:break-word}
.pw-klepet-b-jaz{align-self:flex-end;background:var(--kl-purple);color:#fff}
.pw-klepet-pri{align-self:flex-start;max-width:88%;background:#fff;border:1px solid color-mix(in oklch,var(--kl-ink) 12%,transparent);border-left:3px solid var(--kl-purple);border-radius:.7rem;padding:.5rem .7rem}
.pw-klepet-pri.jaz{align-self:flex-end}
.pw-klepet-pri-glava{display:inline-flex;align-items:center;gap:.3rem;font:700 .6rem var(--font-sans),sans-serif;letter-spacing:.04em;text-transform:uppercase;color:var(--kl-purple)}
.pw-klepet-pri-zad{font:700 .82rem var(--font-sans),sans-serif;color:var(--kl-ink);margin:.15rem 0}
.pw-klepet-pri-telo{font:500 .8rem var(--font-sans),sans-serif;color:color-mix(in oklch,var(--kl-ink) 78%,transparent);line-height:1.45;white-space:pre-wrap;word-break:break-word}
.pw-klepet-prazno{margin:auto;text-align:center;font:500 .8rem var(--font-sans),sans-serif;color:color-mix(in oklch,var(--kl-ink) 72%,transparent);padding:1rem;line-height:1.5}
.pw-klepet-vnos{flex:none;display:flex;align-items:center;gap:.5rem;padding:.75rem .9rem;border-top:1px solid var(--kl-line)}
.pw-klepet-vnos input{flex:1;min-width:0;border:1px solid color-mix(in oklch,var(--kl-ink) 10%,transparent);border-radius:999px;padding:.6rem .9rem;font:500 .85rem var(--font-sans),sans-serif;color:var(--kl-ink);background:#fff}
.pw-klepet-vnos input:focus{outline:none;border-color:var(--kl-purple)}
.pw-klepet-vnos input:disabled{background:oklch(97% .004 87);cursor:not-allowed}
.pw-klepet-poslji{flex:none;display:grid;place-items:center;width:2.4rem;height:2.4rem;border:0;border-radius:50%;background:var(--kl-purple);color:#fff;cursor:pointer}
.pw-klepet-poslji:disabled{opacity:.4;cursor:default}
/* compose glava + X za hitro zapiranje */
.pw-pisi-glava{display:flex;align-items:center;justify-content:space-between;margin-bottom:.3rem}
.pw-pisi-naslov{font:700 .8rem var(--font-sans),sans-serif;color:var(--ink)}
.pw-pisi-x{display:grid;place-items:center;width:2rem;height:2rem;flex:none;border:1px solid color-mix(in oklch,var(--ink) 10%,transparent);border-radius:50%;background:#fff;color:var(--ink);font-size:.9rem;line-height:1;cursor:pointer;transition:background .15s,color .15s}
.pw-pisi-x:hover{background:var(--ink);color:var(--paper)}
/* folder meni: desktop = inline stolpec (pw-posta-mape), mobilni pill+slide skrit */
.pw-mape-trig{display:none}
.pw-mape-back{display:none}
/* MOBILE-FIRST: komunikacijski panel na telefonu */
@media (max-width:640px){
  .pw-vsi-panel,.pw-det-panel,.pw-kom-panel,.pw-naloga-panel,.pw-ai-panel{width:100vw !important;max-width:100vw !important}
  .pw-vsi-panel,.pw-det-panel,.pw-naloga-panel,.pw-ai-panel{padding-left:1.1rem !important;padding-right:1.1rem !important}
  .pw-vsi-backdrop{backdrop-filter:none;-webkit-backdrop-filter:none}
  .pw-posta-body{flex-direction:column !important}
  /* folder meni = desni slide (kot hub, a z desne); pill sproži */
  .pw-mape-trig{display:inline-flex;align-items:center;gap:.4rem;height:2.6rem;box-sizing:border-box;padding:0 1rem;border:1px solid color-mix(in oklch,var(--ink) 9%,transparent);border-radius:999px;background:#fff;color:var(--ink);font:700 .78rem var(--font-sans),sans-serif;cursor:pointer;white-space:nowrap;margin-bottom:.5rem}
  .pw-mape-back{display:block;position:fixed;inset:0;z-index:1198;background:color-mix(in oklch,var(--ink) 34%,transparent)}
  .pw-posta-mape{position:fixed !important;left:0;top:0;bottom:0;right:auto !important;z-index:1199;width:min(78%,15rem) !important;flex-direction:column !important;gap:.15rem !important;padding:calc(4.75rem + env(safe-area-inset-top,0px)) .8rem calc(1.15rem + env(safe-area-inset-bottom,0px)) !important;margin:0 !important;background:var(--paper,#fff);box-shadow:8px 0 40px color-mix(in oklch,var(--ink) 22%,transparent);transform:translateX(-100%);transition:transform .3s cubic-bezier(.2,.8,.3,1);overflow-y:auto}
  .pw-posta-mape.odprt{transform:none}
  .pw-posta-mape button{width:100% !important;min-height:2.6rem}
  .pw-kom-panel .pw-posta-glava{padding-right:.3rem}
  .pw-mail-meni{left:auto;right:0}
  /* detajl maila kot v hubu: »Nazaj« v svoji vrsti, akcijske ikone v ENI vrsti */
  .pw-mail-orodja .pw-mail-nazaj{flex:1 1 100%;justify-content:flex-start}
  .pw-mail-orodja .pw-mail-nazaj + *{margin-left:0}
  .pw-mail-orodja{gap:.45rem}
  .pw-mail-orodja>button,.pw-mail-orodja>a,.pw-mail-orodja .pw-mail-meni-w>button{width:2.15rem;height:2.15rem}
  .pw-naloga-panel{padding-top:1.4rem !important;overflow-y:auto}
  .pw-naloga-l-opis textarea{min-height:8rem}
  .pw-naloga-akcije{position:sticky;bottom:0;background:#fff;padding-top:.6rem}
  .pw-naloga-akcije button{flex:1 1 auto}
  .pw-posta-bulk{padding:.5rem .6rem}
  .pw-posta-bulk-brisi,.pw-posta-bulk-obnovi{flex:1 1 auto;justify-content:center}
}
.pw-kom-panel .pw-karta.pw-posta{margin:0;box-shadow:none;border:0;border-radius:0;overflow:visible;background:transparent;padding:0}
/* naslov v svoji vrsti (X plava zgoraj desno); iskalnik+filter+Nova pošta v drugi vrsti, poravnani, enake višine; Nova pošta konča desno = pod X */
.pw-kom-panel .pw-posta-glava{position:relative;flex-wrap:wrap;row-gap:.8rem;align-items:center;padding-left:.3rem;padding-right:.3rem}
.pw-kom-panel .pw-posta-glava > div:first-child{flex:1 1 100%}
.pw-kom-panel .pw-posta-filter{position:static;transform:none;height:2.6rem;box-sizing:border-box}
/* X gumb vedno nad vso vsebino panela */
.pw-vsi-x{z-index:40}
.pw-karta{position:relative;overflow:hidden;padding:1rem;border:1px solid color-mix(in oklch,var(--ink) 8%,transparent);border-radius:1rem;background:oklch(99% .006 87 / .85)}
.pw-dokumentacija{background:linear-gradient(135deg,oklch(97% .022 250),oklch(97% .022 200))}
.pw-dokumentacija h3{margin:0;font:600 1.15rem var(--font-sans),system-ui,sans-serif}
.pw-linki{display:flex;flex-direction:column;gap:.4rem;margin:.7rem 0 0}
.pw-link-vrstica{display:flex;align-items:center;gap:.5rem;padding:.5rem .65rem;border:1px solid oklch(93% .006 82 / .55);border-radius:.7rem;background:oklch(100% 0 0 / .55)}
.pw-link-vrstica a{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--ink);font-weight:700;font-size:.72rem;text-decoration:none}
.pw-link-vrstica a:hover{text-decoration:underline}
.pw-link-brisi{flex:none;display:grid;place-items:center;width:1.5rem;height:1.5rem;padding:0;border:1px solid oklch(93% .006 82 / .55);border-radius:50%;background:transparent;color:var(--muted);font-size:.85rem;line-height:1;cursor:pointer}
.pw-link-brisi:hover{background:var(--ink);color:var(--paper);border-color:var(--ink)}
.pw-link-prazno{margin:.7rem 0 0;color:var(--muted);font-size:.68rem}
.pw-link-obrazec{display:grid;grid-template-columns:1fr;gap:.45rem;margin-top:.7rem}
.pw-link-obrazec input{padding:.5rem .65rem;border:1px solid oklch(93% .006 82 / .55);border-radius:.6rem;background:oklch(100% 0 0 / .7);font:inherit;font-size:.72rem;color:var(--ink);min-width:0}
.pw-link-dodaj{flex:none;padding:.5rem .8rem;border:1px solid var(--ink);border-radius:.6rem;background:var(--ink);color:var(--paper);font:700 .68rem var(--font-sans),sans-serif;cursor:pointer;white-space:nowrap}
.pw-link-dodaj:disabled{opacity:.5;cursor:not-allowed}
.pw-namig-demo{margin-top:.5rem;color:var(--muted);font-size:.62rem;font-style:italic}
/* sivi kotni gumb + odpre polja za dodajanje povezave; !important na polozaju, ker
   splosno pravilo ".projectNarrative article:not(.projectAgreement) > *" sicer vsili position:relative */
.pw-dok-dodaj{position:absolute !important;z-index:2;top:.85rem;right:.85rem;display:grid;place-items:center;width:2.2rem;height:2.2rem;padding:0;border:1px solid color-mix(in oklch,var(--ink) 14%,transparent);border-radius:50%;background:oklch(91% .003 250);color:var(--ink);cursor:pointer}
.pw-dok-dodaj:hover{background:oklch(86% .004 250);border-color:color-mix(in oklch,var(--ink) 26%,transparent)}
.pw-opozorilo{margin-top:.6rem;padding:.45rem .6rem;border:1px solid oklch(85% .07 65);border-radius:.5rem;background:oklch(96% .04 70);color:oklch(48% .12 55);font-size:.62rem;line-height:1.4}
/* vrstica racuna: ime + kaj je (levo) — status + znesek desno poravnano, da so cifre vidne in poravnane */
.pw-racun-v{grid-template-columns:1fr auto;align-items:center}
.pw-racun-l{display:grid;gap:.12rem;min-width:0}
.pw-racun-l small{color:var(--muted);font-size:.5rem}
.pw-racun-d{display:flex;align-items:center;gap:.5rem;justify-self:end;text-align:right}
.pw-racun-d .pw-status{padding:0;border:0;background:none;font-size:.54rem;color:var(--muted)}
.pw-racun-d strong{font-size:.72rem;font-variant-numeric:tabular-nums;white-space:nowrap}
/* gumb "Prikaži vse (N) →" na dnu kartice (02/03/04) — odpre SLIDE z desne s polnim seznamom */
.pw-vec{margin:.2rem 0 0;padding:.15rem 0;border:0;background:none;color:var(--muted);font:700 .58rem var(--font-sans),sans-serif;text-align:left;text-decoration:underline;text-underline-offset:2px;cursor:pointer}
.pw-vec:hover{color:var(--ink)}
/* SLIDE "Vsi <tip>" (pogodbe/računi/stroški) — vzorec styles.detailBackdrop/detailPanel +
   lepljivi X (glej ArhivWorkspace .arh-det-x), tu podvojeno s predpono pw-vsi- */
/* backdrop: panel poravnan DESNO (kot pogodba/dokument) + blur zatemnitev strani zadaj */
.pw-vsi-backdrop{justify-content:flex-end;background:oklch(97% .006 87 / .4);backdrop-filter:blur(9px) saturate(1.05);-webkit-backdrop-filter:blur(9px) saturate(1.05)}
/* panel: čist predal z DESNE (kot pogodba — seže do roba), flex-stolpec — glava fiksna, seznam drsi, paginacija lepljiva noga */
/* Iste mere kot DokPanel (components/DokPanel.tsx): sirina, senca, hitrost in
   krivulja. Prej so imeli paneli tri razlicne sirine, tri sence in tri hitrosti,
   zato je bil vsak videti kot svoj izdelek. */
.pw-vsi-panel{width:min(46rem,94vw);height:100%;overflow:hidden;display:flex;flex-direction:column;box-shadow:-18px 0 50px oklch(40% .08 300 / .18);animation:pwVsiIn .3s cubic-bezier(.2,.85,.25,1) both}
@keyframes pwVsiIn{from{transform:translateX(100%)}to{transform:translateX(0)}}
@media (prefers-reduced-motion:reduce){.pw-vsi-panel{animation:none}}
.pw-vsi-panel h2{margin:.4rem 0 .2rem;font-family:var(--font-sans),system-ui,sans-serif;font-weight:600;font-size:clamp(1.6rem,3vw,2.2rem);line-height:1.05;color:var(--ink)}
.pw-vsi-projekt{margin:0 0 1.1rem;color:var(--muted);font-size:.72rem}
/* × zapri = na višini nadnaslova (eyebrow), enako v vseh panelih (slide + predogled računa/pogodbe/stroška) */
.pw-vsi-x{position:absolute;top:1.6rem;right:1.6rem;z-index:8;display:grid;place-items:center;width:2.2rem;height:2.2rem;padding:0;border:1px solid color-mix(in oklch,var(--ink,#1a1a1a) 12%,transparent);border-radius:50%;background:rgba(255,255,255,.8);color:color-mix(in oklch,var(--ink,#1a1a1a) 60%,transparent);font-size:1.3rem;line-height:1;cursor:pointer}
/* status v predogledu: plačan zelen, odprt jantarni; znesek »za plačilo« z outline (kot Bodoni številke) */
.pw-det-status.placan{color:oklch(55% .15 150)}
.pw-det-status.odprt{color:oklch(58% .15 65)}
.pw-det-skupaj strong{-webkit-text-stroke:0;text-shadow:0 1px 2px oklch(100% 0 0 / .4)}
.pw-vsi-x:hover{background:var(--ink);color:var(--paper)}
/* orodna vrsta slidea: preklop levo, iskalnik desno — v ISTI vrsti */
.pw-vsi-orodja{display:flex;align-items:center;justify-content:space-between;gap:.5rem;flex-wrap:wrap;margin:0 0 .85rem}
/* preklop načina prikaza (segmentna pilula): Strani (paginacija) | Drsenje (ves seznam) */
.pw-vsi-nacin{display:inline-flex;align-items:center;gap:.2rem;width:max-content;margin:0;padding:.2rem;border:1px solid oklch(93% .006 82 / .55);border-radius:999px;background:oklch(97% .006 87 / .8)}
.pw-vsi-nacin button{display:inline-flex;align-items:center;gap:.35rem;padding:.35rem .8rem;border:0;border-radius:999px;background:none;font:700 .62rem var(--font-sans),sans-serif;color:var(--muted);cursor:pointer}
.pw-vsi-nacin button.pw-vsi-nacin-aktivna{background:var(--ink);color:var(--paper)}
/* zložljiv iskalnik: okrogel gumb z lupo -> ob kliku postane input; × zapre nazaj v gumb */
.pw-vsi-iskalnik{display:flex;align-items:center;gap:.5rem;margin:0;flex:0 1 auto}
.pw-vsi-lupa{flex:none;display:grid;place-items:center;width:2.3rem;height:2.3rem;padding:0;border:1px solid oklch(93% .006 82 / .55);border-radius:50%;background:oklch(98% .008 87 / .92);color:var(--ink);cursor:pointer}
.pw-vsi-lupa:hover{background:var(--ink);color:var(--paper);border-color:var(--ink)}
/* polje se razširi IZ gumba (desni izvor), × je ZNOTRAJ polja desno */
.pw-vsi-isci-polje{position:relative;display:flex;align-items:center;transform-origin:right center;animation:pwIsciIn .3s cubic-bezier(.16,1,.3,1) both}
@keyframes pwIsciIn{from{opacity:0;transform:scaleX(.4)}to{opacity:1;transform:scaleX(1)}}
.pw-vsi-isci-polje input[type='search']{width:min(20rem,62vw);min-width:0;padding:.55rem 2.3rem .55rem .9rem;border:1px solid oklch(93% .006 82 / .55);border-radius:999px;background:oklch(100% 0 0 / .8);font:inherit;font-size:.75rem;color:var(--ink)}
.pw-vsi-isci-x{position:absolute;right:.35rem;top:50%;transform:translateY(-50%);display:grid;place-items:center;width:1.7rem;height:1.7rem;padding:0;border:0;border-radius:50%;background:oklch(94% .008 87);color:var(--ink);font-size:.95rem;line-height:1;cursor:pointer}
.pw-vsi-isci-x:hover{background:var(--ink);color:var(--paper)}
/* seznam vrstic v slideu — ista osnova kot .projectNarrative article > span (module CSS),
   tu podvojeno, ker vrstice v slideu NISO neposredni otroci .projectNarrative article */
/* seznam VEDNO lahko drsi znotraj (flex:1) -> glava (naslov+×) in paginacija ostaneta fiksni in NE izgineta;
   z 12/stran gre stran v pogled, zato se drsnik praviloma ne pokaže (fit = brez drsnika) */
.pw-vsi-seznam{flex:1 1 auto;min-height:0;overflow-y:auto;display:flex;flex-direction:column;margin:0;padding-right:.25rem}
.pw-vsi-seznam > span{display:grid;gap:.2rem;padding:.55rem 0;border-bottom:1px solid oklch(93% .006 82 / .55)}
.pw-vsi-seznam > span:last-child{border-bottom:0}
.pw-vsi-seznam > span b{font-size:.68rem}
.pw-vsi-seznam > span small{color:var(--muted);font-size:.58rem}
.pw-vsi-seznam .pw-racun-v{grid-template-columns:1fr auto;align-items:center}
.pw-vsi-strani{flex:none;display:flex;align-items:center;justify-content:center;flex-wrap:wrap;gap:.35rem;margin:0;padding-top:.85rem;border-top:1px solid oklch(93% .006 82 / .55)}
.pw-vsi-strani button{display:grid;place-items:center;min-width:2rem;height:2rem;padding:0 .5rem;border:1px solid oklch(93% .006 82 / .55);border-radius:.6rem;background:oklch(98% .008 87 / .92);font:700 .68rem var(--font-sans),sans-serif;color:var(--ink);cursor:pointer}
.pw-vsi-strani button:hover{background:var(--ink);color:var(--paper);border-color:var(--ink)}
.pw-vsi-strani button:disabled{opacity:.4;cursor:not-allowed}
.pw-vsi-strani button.pw-vsi-stran-aktivna{background:var(--ink);color:var(--paper);border-color:var(--ink)}
/* klikabilna vrstica (kartica + slide) -> predogled */
.pw-vrstica-klik{cursor:pointer;transition:background .14s}
.pw-vrstica-klik:hover{background:#fff}
.pw-vrstica-klik:focus-visible{outline:2px solid var(--akcent,#6E4FA6);outline-offset:2px}
/* PREDOGLED dokumenta (panel z desne) */
.pw-det-panel{width:min(46rem,94vw);animation:pwVsiIn .3s cubic-bezier(.2,.85,.25,1) both}
/* Glava dokumentnega panela je enaka kot v DokPanelu: natisni levo kot povezava
   z ikono, zapri desno kot krog. Prej je bil samo krog, ki je visel nad vsebino. */
.pw-det-glava{display:flex;align-items:center;justify-content:space-between;gap:.5rem;margin:-.6rem 0 .9rem}
.pw-det-tisk{display:inline-flex;align-items:center;gap:.4rem;padding:0;border:0;background:none;font:700 .78rem var(--font-sans),sans-serif;color:color-mix(in oklch,var(--ink) 62%,transparent);cursor:pointer;transition:color .15s}
.pw-det-tisk:hover{color:oklch(52% .2 297);text-decoration:underline;text-underline-offset:3px}
.pw-det-x{display:grid;place-items:center;width:2.2rem;height:2.2rem;padding:0;border:1px solid color-mix(in oklch,var(--ink) 12%,transparent);border-radius:50%;background:rgba(255,255,255,.8);color:color-mix(in oklch,var(--ink) 60%,transparent);font-size:1.3rem;line-height:1;cursor:pointer}
.pw-det-x:hover{background:var(--ink);color:#fff;border-color:transparent}
@media print{.pw-det-glava{display:none}}
.pw-det-panel h2{margin:.3rem 0 .1rem;font-family:var(--font-sans),system-ui,sans-serif;font-weight:600;font-size:clamp(1.5rem,3vw,2.1rem);line-height:1.05;color:var(--ink)}
/* paneli = BELO ozadje (ne bez) */
/* Kot DokPanel: panel je steklen ovoj, vsebina pa bel papir z zaobljenim vrhom.
   Ploscato belo polje je bilo videti kot druga vrsta okna. */
.pw-vsi-panel.pw-vsi-panel,.pw-det-panel.pw-det-panel{background:rgba(255,255,255,.86) !important;backdrop-filter:blur(24px) saturate(1.4);-webkit-backdrop-filter:blur(24px) saturate(1.4);border-left:1px solid rgba(255,255,255,.7)}
.pw-det-panel.pw-det-panel{padding:.9rem 1rem 0;box-sizing:border-box;display:flex;flex-direction:column;overflow:hidden;height:100%}
.pw-det-papir{flex:1 1 auto;min-height:0;overflow-y:auto;padding:2.2rem clamp(1.4rem,4vw,2.6rem) 3rem;background:#fff;border-radius:1rem 1rem 0 0;box-shadow:0 -2px 24px oklch(40% .08 300 / .08)}
@media print{.pw-det-papir{padding:0;border-radius:0;box-shadow:none;overflow:visible}}
/* dejanski dokument pogodbe v panelu (PDF videz) */
.pw-det-doktelo{margin-top:1.3rem;font-family:var(--font-sans),system-ui,sans-serif;color:var(--ink);font-size:.86rem;line-height:1.6}
.pw-det-doktelo .kick{font-size:.6rem;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:color-mix(in oklch,var(--ink) 72%,transparent);margin:0 0 .4rem}
.pw-det-doktelo h1{font-family:var(--font-serif),Georgia,serif;font-weight:500;font-size:1.6rem;margin:0 0 .5rem;line-height:1.1}
.pw-det-doktelo .meta{color:color-mix(in oklch,var(--ink) 72%,transparent);font-size:.75rem;margin:0 0 1.2rem}
.pw-det-doktelo .parties{display:flex;flex-direction:column;gap:.15rem;margin:0 0 1.3rem;padding:.9rem 1rem;border:1px solid var(--line);border-radius:.7rem;font-size:.82rem;background:oklch(98% .006 87)}
.pw-det-doktelo .parties p{margin:0}
.pw-det-doktelo .pog-clen{margin:0 0 1.05rem}
.pw-det-doktelo .pog-clen h2{font-size:.95rem;font-weight:700;margin:0 0 .3rem;font-family:var(--font-sans),system-ui,sans-serif}
.pw-det-doktelo .pog-clen p{margin:0;color:color-mix(in oklch,var(--ink) 82%,transparent)}
.pw-det-doktelo .sig{display:flex;gap:1.5rem;margin-top:2rem}
.pw-det-doktelo .sig>div{flex:1;font-size:.78rem}
.pw-det-doktelo .sig .lin{display:block;height:1px;background:var(--ink);margin:2rem 0 .4rem;opacity:.45}
.pw-det-doktelo .sig span:first-child{display:block;font-size:.6rem;letter-spacing:.1em;text-transform:uppercase;color:color-mix(in oklch,var(--ink) 72%,transparent);margin-bottom:.1rem}
.pw-det-meta{display:flex;flex-wrap:wrap;gap:.4rem 1.4rem;margin:1rem 0;padding:.9rem 0;border-top:1px solid oklch(93% .006 82 / .55);border-bottom:1px solid oklch(93% .006 82 / .55)}
.pw-det-meta span{display:flex;flex-direction:column;gap:.15rem}
.pw-det-meta small{font-size:.58rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--muted)}
.pw-det-meta strong{font-size:.82rem;color:var(--ink)}
.pw-det-tabela-ovoj{overflow-x:auto;margin-top:.4rem}
.pw-det-tabela{width:100%;border-collapse:collapse;font-size:.78rem}
.pw-det-tabela th{padding:.4rem .5rem;text-align:right;font-size:.56rem;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);border-bottom:1px solid oklch(93% .006 82 / .55);white-space:nowrap}
.pw-det-tabela th:first-child{text-align:left}
.pw-det-tabela td{padding:.5rem .5rem;text-align:right;border-bottom:1px solid oklch(0% 0 0 / .06);font-variant-numeric:tabular-nums;white-space:nowrap}
.pw-det-tabela td:first-child{text-align:left;white-space:normal;font-weight:600}
.pw-det-vsote{margin-top:.8rem;display:grid;gap:.25rem;justify-items:end}
.pw-det-vsote > div{display:flex;gap:1.2rem;align-items:baseline;font-size:.8rem;color:var(--muted)}
.pw-det-vsote > div strong{min-width:5rem;text-align:right;font-variant-numeric:tabular-nums;color:var(--ink)}
.pw-det-skupaj{margin-top:.25rem;padding-top:.45rem;border-top:1px solid oklch(93% .006 82 / .55)}
.pw-det-skupaj span{font-size:.66rem;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--muted)}
.pw-det-skupaj strong{font:500 1.4rem var(--font-sans),system-ui,sans-serif}
.pw-det-opomba{margin:.6rem 0 0;color:var(--muted);font-size:.74rem;line-height:1.5}
.pw-det-uredi{display:inline-flex;align-items:center;gap:.35rem;margin-top:1.1rem;font-size:.8rem;font-weight:600;color:var(--muted);text-decoration:underline;text-underline-offset:2px}
.pw-det-uredi:hover{color:var(--ink)}
.pw-det-akcije{display:flex;flex-wrap:wrap;align-items:center;gap:.5rem 1rem;margin-top:1.1rem}
.pw-det-akcije .pw-det-uredi{margin-top:0}
.puscica-svg{vertical-align:-2px;flex:none}
.pw-det-poslji{display:inline-flex;align-items:center;gap:.4rem;white-space:nowrap;padding:.55rem .95rem;border:1px solid var(--ink);border-radius:999px;background:var(--ink);color:var(--paper);font:700 .74rem var(--font-sans),sans-serif;cursor:pointer}
.pw-det-poslji:hover{background:transparent;color:var(--ink)}
.pw-kmalu-red{display:grid;grid-template-columns:1fr 1fr;gap:.55rem}
.pw-kmalu{opacity:.85}
.pw-kmalu h3{margin:0;font:600 1.05rem var(--font-sans),system-ui,sans-serif}
.pw-kmalu p{margin:.5rem 0 0;color:var(--muted);font-size:.72rem;line-height:1.4}
/* CRM dnevnik kartica = ŽIVA povezava na stran stranke (ne več »Kmalu« — dnevnik obstaja) */
.pw-dnevnik-link{text-decoration:none;color:inherit;transition:transform .16s cubic-bezier(.16,1,.3,1),box-shadow .16s}
.pw-dnevnik-link h3{margin:0;font:600 1.05rem var(--font-sans),system-ui,sans-serif}
.pw-dnevnik-link p{margin:.5rem 0 0;color:var(--muted);font-size:.72rem;line-height:1.4}
.pw-dnevnik-link:hover{transform:translateY(-2px);box-shadow:0 .8rem 2rem oklch(22% .04 300/.14)}
.pw-znacka-live{background:oklch(90% .06 297);color:oklch(42% .16 297)}
.pw-znacka{display:inline-flex;align-items:center;width:max-content;margin-top:.7rem;padding:.3rem .6rem;border-radius:999px;background:oklch(90% .02 87);color:var(--muted);font-size:.58rem;font-weight:800;letter-spacing:.08em;text-transform:uppercase}
/* 06 · POŠTA — dnevnik poslane pošte projekta (mehki violet/mint jezik kot ostale kartice) */
.pw-posta{background:linear-gradient(135deg,oklch(97% .03 300),oklch(97% .03 165))}
.pw-posta h3{margin:0;font:600 1.15rem var(--font-sans),system-ui,sans-serif}
.pw-posta-seznam{position:relative;z-index:1;list-style:none;display:flex;flex-direction:column;gap:.4rem;margin:.75rem 0 0;padding:0}
.pw-posta-seznam li{position:relative;display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:.6rem;padding:.6rem .7rem;border:1px solid color-mix(in oklch,var(--ink) 8%,transparent);border-radius:.7rem;background:#fff;cursor:pointer}
.pw-posta-zvezda{background:oklch(97.5% .035 92);border-color:oklch(86% .09 85)}
.pw-posta-zv-ikona{color:oklch(72% .16 75);flex:none}
.pw-posta-oznake{display:flex;flex-wrap:wrap;gap:.3rem;margin-top:.15rem}
.pw-posta-oz{font:700 .58rem var(--font-sans),sans-serif;color:var(--purple);background:color-mix(in oklch,var(--purple) 12%,transparent);border-radius:999px;padding:.1rem .45rem}
.pw-posta-vsebina{display:grid;gap:.2rem;min-width:0}
.pw-posta-check{width:1.2rem;height:1.2rem;margin-top:.15rem;flex:none;cursor:pointer;accent-color:var(--ink)}
.pw-posta-izbran{border-color:var(--ink);background:oklch(96.5% .018 300)}
.pw-posta-bulk{display:flex;align-items:center;gap:.7rem;flex-wrap:wrap;margin:.55rem 0 .1rem;padding:.5rem .7rem;border-radius:.7rem;background:oklch(96.5% .018 300)}
.pw-posta-bulk-st{font:700 .72rem var(--font-sans),sans-serif;color:var(--ink)}
.pw-posta-bulk-brisi{display:inline-flex;align-items:center;gap:.35rem;height:2.1rem;padding:0 .95rem;border:0;border-radius:999px;background:oklch(55% .18 25);color:#fff;font:700 .72rem var(--font-sans),sans-serif;cursor:pointer}
.pw-posta-bulk-obnovi{display:inline-flex;align-items:center;gap:.35rem;height:2.1rem;padding:0 .95rem;border:1px solid color-mix(in oklch,var(--ink) 12%,transparent);border-radius:999px;background:#fff;color:var(--ink);font:700 .72rem var(--font-sans),sans-serif;cursor:pointer}
.pw-posta-bulk-obnovi:hover{border-color:color-mix(in oklch,var(--purple) 45%,transparent);color:color-mix(in oklch,var(--ink) 72%,transparent)}
.pw-posta-bulk-x{border:0;background:none;color:color-mix(in oklch,var(--ink) 72%,transparent);font:600 .72rem var(--font-sans),sans-serif;cursor:pointer;margin-left:auto}
@media (max-width:600px){.pw-posta-check{width:1.45rem;height:1.45rem}}
/* vrhnja orodna vrstica pošte: »Označi vse« + en delete gumb (siv → rdeč ko je kaj izbrano) */
.pw-posta-top{display:flex;align-items:center;justify-content:space-between;gap:.75rem;flex-wrap:wrap;margin:.15rem 0 .5rem}
.pw-vsi-check{display:inline-flex;align-items:center;gap:.5rem;font:600 .74rem var(--font-sans),sans-serif;color:var(--ink);cursor:pointer;user-select:none}
.pw-vsi-check input{width:1.05rem;height:1.05rem;cursor:pointer;accent-color:var(--purple)}
.pw-posta-top-akc{display:flex;align-items:center;gap:.4rem}
.pw-akc-obnovi,.pw-akc-brisi{display:inline-flex;align-items:center;gap:.35rem;height:2rem;padding:0 .9rem;border-radius:999px;font:700 .7rem var(--font-sans),sans-serif;cursor:pointer;transition:background .15s ease,color .15s ease,border-color .15s ease,opacity .15s ease}
.pw-akc-obnovi{border:1px solid color-mix(in oklch,var(--ink) 14%,transparent);background:#fff;color:var(--ink)}
.pw-akc-obnovi:disabled{opacity:.4;cursor:not-allowed}
.pw-akc-obnovi:not(:disabled):hover{border-color:color-mix(in oklch,var(--purple) 45%,transparent)}
/* delete: siv/neaktiven dokler ni nič izbrano; ko označiš, se aktivira in postane rdeč */
.pw-akc-brisi{border:1px solid color-mix(in oklch,var(--ink) 14%,transparent);background:#fff;color:color-mix(in oklch,var(--ink) 42%,transparent)}
.pw-akc-brisi:disabled{opacity:.55;cursor:not-allowed}
.pw-akc-brisi:not(:disabled){background:oklch(55% .18 25);color:#fff;border-color:transparent}
.pw-akc-brisi:not(:disabled):hover{background:oklch(50% .19 25)}
.pw-posta-vrh{display:flex;align-items:baseline;justify-content:space-between;gap:.6rem}
.pw-posta-vrh b{font-size:.76rem;font-weight:700;color:var(--ink);overflow-wrap:anywhere}
.pw-posta-smer{flex:none;display:inline-flex;align-items:center;padding:.2rem .5rem;border-radius:999px;background:oklch(91% .05 165);color:oklch(40% .1 165);font-size:.52rem;font-weight:800;letter-spacing:.07em;text-transform:uppercase;white-space:nowrap}
.pw-posta-meta{color:var(--muted);font-size:.62rem;overflow-wrap:anywhere}
.pw-posta-prazno{position:relative;z-index:1;margin:.7rem 0 0;color:var(--muted);font-size:.7rem;line-height:1.5}
/* »Nova pošta« — gumb + sestavljalnik */
.pw-posta-glava{position:relative;z-index:1;display:flex;align-items:flex-start;justify-content:space-between;gap:.6rem}
.pw-posta-nova{flex:none;display:inline-flex;align-items:center;gap:.35rem;height:2.6rem;box-sizing:border-box;padding:0 1.1rem;border:0;border-radius:999px;background:var(--ink);color:var(--paper);font:700 .74rem var(--font-sans),sans-serif;cursor:pointer;transition:transform .15s ease,box-shadow .15s ease}
/* filter prejemnika = kompakten pill znotraj iskalnika (kot Gmail filter) */
.pw-posta-filter{position:absolute;right:.4rem;top:50%;transform:translateY(-50%);max-width:8.5rem;border:1px solid color-mix(in oklch,var(--ink) 9%,transparent);background:#fff;color:var(--ink);font:700 .62rem var(--font-sans),sans-serif;border-radius:999px;padding:.34rem .7rem;cursor:pointer;text-overflow:ellipsis}
.pw-posta-filter[data-aktiven='true']{background:var(--ink);color:var(--paper)}
.pw-posta-filter{font-size:.78rem !important}
/* orodna vrstica nad besedilom maila (Premakni/Oznaka/V nalogo/AI/Natisni/★) */
.pw-mail-orodja{display:flex;flex-wrap:wrap;gap:.6rem;align-items:center;margin:.75rem 0 .3rem}
.pw-mail-orodja>button,.pw-mail-orodja>a,.pw-mail-orodja .pw-mail-meni-w>button{display:inline-grid;place-items:center;width:2.3rem;height:2.3rem;box-sizing:border-box;border:1px solid color-mix(in oklch,var(--ink) 9%,transparent);border-radius:999px;background:#fff;color:color-mix(in oklch,var(--ink) 68%,transparent);text-decoration:none;cursor:pointer;transition:background .15s,color .15s}
.pw-mail-orodja>button:hover,.pw-mail-orodja>a:hover,.pw-mail-orodja .pw-mail-meni-w>button:hover{background:var(--paper);color:var(--ink)}
/* aktivno/odprto stanje meni-gumba: napolnjen, da je jasno, da isti gumb tudi zapre */
.pw-mail-orodja .pw-toggle-on,.pw-mail-orodja .pw-mail-meni-w>button.pw-toggle-on{background:var(--ink) !important;color:var(--paper) !important;border-color:var(--ink) !important}
/* meni Premakni/Oznaka */
.pw-mail-meni-w{position:relative;display:inline-flex}
.pw-mail-meni{position:absolute;top:calc(100% + .5rem);left:0;z-index:50;min-width:15rem;background:#fff;border:1px solid color-mix(in oklch,var(--ink) 10%,transparent);border-radius:.7rem;box-shadow:0 14px 34px -14px rgba(17,17,17,.28);padding:.4rem;display:flex;flex-direction:column;gap:.1rem}
.pw-mail-meni-h{margin:.2rem .35rem .3rem;font:700 .58rem var(--font-sans),sans-serif;letter-spacing:.08em;text-transform:uppercase;color:color-mix(in oklch,var(--ink) 72%,transparent)}
.pw-mail-meni>button{text-align:left;border:0;background:none;cursor:pointer;padding:.45rem .5rem;border-radius:.5rem;font:600 .78rem var(--font-sans),sans-serif;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pw-mail-meni>button:hover{background:var(--paper)}
.pw-mail-meni-prazno{margin:.3rem .35rem;font-size:.75rem;color:var(--muted)}
.pw-mail-oznake{display:flex;flex-wrap:wrap;gap:.3rem;padding:.2rem .35rem .4rem}
.pw-mail-oznaka{display:inline-flex;align-items:center;gap:.15rem;font:700 .62rem var(--font-sans),sans-serif;color:var(--purple);background:color-mix(in oklch,var(--purple) 12%,transparent);border-radius:999px;padding:.15rem .3rem .15rem .5rem}
.pw-mail-oznaka-x{border:0;background:none;color:var(--purple);cursor:pointer;font-size:.9rem;line-height:1;padding:0 .1rem;opacity:.65}
.pw-mail-oznaka-x:hover{opacity:1}
.pw-mail-oznaka-obr{display:flex;gap:.3rem;padding:.2rem .35rem}
.pw-mail-oznaka-obr input{flex:1;min-width:0;border:1px solid color-mix(in oklch,var(--ink) 12%,transparent);border-radius:.5rem;padding:.4rem .5rem;font:500 .78rem var(--font-sans),sans-serif;background:#fff;color:var(--ink)}
.pw-mail-oznaka-obr button{border:0;background:var(--ink);color:var(--paper);border-radius:.5rem;padding:0 .75rem;font:700 .72rem var(--font-sans),sans-serif;cursor:pointer}
/* paginacija pošte */
.pw-posta-strani{display:flex;justify-content:center;align-items:center;gap:.3rem;margin:.7rem 0 .2rem}
.pw-posta-strani button{min-width:1.9rem;height:1.9rem;padding:0 .5rem;border:1px solid color-mix(in oklch,var(--ink) 9%,transparent);border-radius:.5rem;background:#fff;color:var(--ink);font:600 .74rem var(--font-sans),sans-serif;cursor:pointer}
.pw-posta-strani button:hover:not(:disabled){background:var(--paper)}
.pw-posta-strani button:disabled{opacity:.4;cursor:default}
.pw-posta-strani button[aria-current="page"]{background:var(--ink);color:var(--paper);border-color:var(--ink)}
.pw-mail-orodja .pw-mail-star:hover,.pw-mail-orodja .pw-mail-star[data-on="true"]{color:oklch(72% .16 75)}
.pw-mail-orodja .pw-mail-brisi:hover{color:oklch(55% .18 25)}
.pw-mail-orodja .pw-mail-nazaj{width:auto;gap:.4rem;padding:0 1rem;display:inline-flex;align-items:center;background:var(--paper);color:var(--ink);font:700 .74rem var(--font-sans),sans-serif}
.pw-mail-orodja .pw-mail-nazaj:hover{background:color-mix(in oklch,var(--ink) 8%,transparent);color:var(--ink)}
/* back levo, ikone desno */
.pw-mail-orodja .pw-mail-nazaj + *{margin-left:auto}
/* hover tooltip nad ikonami (iz aria-label) */
.pw-mail-orodja [aria-label]{position:relative}
.pw-mail-orodja [aria-label]:hover::after{content:attr(aria-label);position:absolute;top:calc(100% + .4rem);left:50%;transform:translateX(-50%);white-space:nowrap;background:var(--ink);color:var(--paper);font:600 .62rem var(--font-sans),sans-serif;padding:.3rem .55rem;border-radius:.45rem;z-index:40;pointer-events:none;box-shadow:0 6px 16px rgba(17,17,17,.2)}
.pw-mail-orodja [aria-label]:hover::before{content:'';position:absolute;top:calc(100% + .15rem);left:50%;transform:translateX(-50%);border:.28rem solid transparent;border-bottom-color:var(--ink);z-index:40;pointer-events:none}
/* akcije pod besedilom maila (Odgovori/Posreduj/Deli/Klepet) */
.pw-mail-akcije{display:flex;flex-wrap:wrap;gap:.5rem;margin:.9rem 0 0}
.pw-mail-akcije>button{display:inline-flex;align-items:center;gap:.4rem;height:2.4rem;box-sizing:border-box;padding:0 1.1rem;border:1px solid color-mix(in oklch,var(--ink) 9%,transparent);border-radius:999px;background:#fff;color:var(--ink);font:650 .78rem var(--font-sans),sans-serif;cursor:pointer;transition:background .15s}
.pw-mail-akcije>button:first-child{background:var(--ink);color:var(--paper);border-color:var(--ink)}
.pw-mail-akcije>button:hover{background:var(--paper)}
.pw-mail-akcije>button:first-child:hover{background:color-mix(in oklch,var(--ink) 88%,transparent)}
/* naslov 06 ... ne sme biti odrezan levo */
.pw-kom-panel .pw-posta-glava{padding-left:.15rem}
.pw-posta-nova:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 6px 16px rgba(40,25,60,.18)}
.pw-posta-nova:disabled{opacity:.45;cursor:not-allowed}
.pw-pisi{position:relative;z-index:1;display:flex;flex-direction:column;gap:.5rem;margin:.75rem 0 .2rem;padding:.75rem;border:1px solid color-mix(in oklch,var(--ink) 10%,transparent);border-radius:.85rem;background:oklch(100% 0 0 / .72)}
.pw-pisi-v{display:grid;grid-template-columns:3.2rem 1fr;align-items:center;gap:.5rem}
.pw-pisi-v span{font:700 .58rem var(--font-sans),sans-serif;letter-spacing:.06em;text-transform:uppercase;color:var(--muted)}
.pw-pisi-v input{width:100%;padding:.45rem .6rem;border:1px solid color-mix(in oklch,var(--ink) 12%,transparent);border-radius:.55rem;background:#fff;font:inherit;font-size:.78rem;color:var(--ink)}
.pw-pisi-v input:focus{outline:none;border-color:oklch(58% .2 297)}
.pw-pisi-orodja{display:flex;gap:.25rem}
.pw-pisi-orodja button{display:grid;place-items:center;width:1.9rem;height:1.9rem;padding:0;border:1px solid color-mix(in oklch,var(--ink) 12%,transparent);border-radius:.45rem;background:#fff;color:var(--ink);font-size:.8rem;line-height:1;cursor:pointer}
.pw-pisi-orodja button:hover{background:var(--ink);color:var(--paper)}
.pw-pisi-telo{min-height:5.5rem;max-height:14rem;overflow-y:auto;padding:.6rem .7rem;border:1px solid color-mix(in oklch,var(--ink) 12%,transparent);border-radius:.55rem;background:#fff;font:inherit;font-size:.82rem;line-height:1.55;color:var(--ink)}
.pw-pisi-telo:focus{outline:none;border-color:oklch(58% .2 297)}
.pw-pisi-telo:empty:before{content:attr(data-placeholder);color:var(--muted)}
.pw-pisi-status{margin:.2rem 0 0;padding:.6rem .8rem;border:1px solid oklch(78% .13 25);border-radius:.55rem;background:oklch(96% .04 25);color:oklch(45% .18 25);font-size:.8rem;font-weight:700}
.pw-pisi-podpis-opomnik{margin:.15rem 0 0}
.pw-pisi-podpis-opomnik a{display:inline-flex;align-items:center;gap:.3rem;font-size:.68rem;color:color-mix(in oklch,var(--ink) 72%,transparent);text-decoration:none;font-weight:600}
.pw-pisi-podpis-opomnik a:hover{color:var(--purple)}
.pw-pisi-akcije{display:flex;justify-content:flex-end;gap:.5rem}
.pw-pisi-preklic{padding:.45rem .9rem;border:1px solid color-mix(in oklch,var(--ink) 18%,transparent);border-radius:999px;background:none;font:700 .68rem var(--font-sans),sans-serif;color:var(--ink);cursor:pointer}
.pw-pisi-poslji{display:inline-flex;align-items:center;gap:.4rem;padding:.45rem 1.1rem;border:0;border-radius:999px;background:var(--ink);color:var(--paper);font:700 .68rem var(--font-sans),sans-serif;cursor:pointer}
.pw-pisi-poslji:disabled{opacity:.6;cursor:not-allowed}
.pw-pisi-poslji .pw-send-ik{transition:transform .2s ease}
.pw-pisi-poslji:hover:not(:disabled) .pw-send-ik{transform:translate(2px,-2px)}
.pw-send-leti{animation:pwLeti 1s ease-in-out infinite}
@keyframes pwLeti{0%{transform:translate(0,0);opacity:1}55%{transform:translate(11px,-11px);opacity:0}56%{transform:translate(-9px,5px);opacity:0}100%{transform:translate(0,0);opacity:1}}
.pw-send-ok{animation:pwOk .38s cubic-bezier(.2,1.5,.4,1) both}
@keyframes pwOk{from{transform:scale(0) rotate(-25deg)}to{transform:scale(1) rotate(0)}}
.pw-pisi-uspeh{margin:.2rem 0 0;padding:.65rem .85rem;border:1px solid oklch(75% .13 150);border-radius:.6rem;background:oklch(96% .05 150);color:oklch(42% .12 150);font:700 .85rem var(--font-sans),sans-serif}
/* "00 · CILJI IN ŽELJE" — samostojna kartica NAD .projectNarrative (ne znotraj njegove
   4-stolpne mreže, ker so barve 02/03/04 vezane na nth-child; vrivanje bi jih premaknilo
   in podrlo obstoječe gradiente). Isti mehki violet/mint jezik kot .projectAgreement. */
.pw-cilji{margin:.55rem 0 0;background:linear-gradient(135deg,oklch(97% .03 300),oklch(97% .03 165))}
.pw-cilji h3{margin:0;font:600 1.15rem var(--font-sans),system-ui,sans-serif}
.pw-cilji-zelje{position:relative;z-index:1;margin:.6rem 0 0;color:var(--ink);font-size:.8rem;line-height:1.55}
.pw-cilji-seznam{position:relative;z-index:1;display:flex;flex-direction:column;gap:.4rem;margin:.75rem 0 0;padding:0;list-style:none}
.pw-cilji-seznam li{display:flex;flex-wrap:wrap;align-items:baseline;gap:.15rem .6rem;padding:.55rem .7rem;border:1px solid color-mix(in oklch,var(--ink) 8%,transparent);border-radius:.7rem;background:oklch(100% 0 0 / .5)}
.pw-cilji-seznam li b{font-size:.76rem;font-weight:700;color:var(--ink)}
.pw-cilji-seznam li small{color:var(--muted);font-size:.62rem}
.pw-cilji-prazno{position:relative;z-index:1;margin:.6rem 0 0;color:var(--muted);font-size:.7rem}
/* dodatna vprasanja + dodeljeni na vozliscu (znotraj iste "00" kartice, zajeti med onboarding chatom) */
.pw-cilji-podnaslov{position:relative;z-index:1;margin:.9rem 0 0;font-size:.6rem;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--muted)}
.pw-cilji-vprasanja{position:relative;z-index:1;display:flex;flex-direction:column;gap:.4rem;margin:.5rem 0 0}
.pw-cilji-dodeljeni{position:relative;z-index:1;display:flex;flex-wrap:wrap;gap:.4rem;margin:.5rem 0 0}
.pw-cilji-oseba{display:inline-flex;align-items:center;gap:.4rem;padding:.3rem .65rem .3rem .3rem;border-radius:999px;background:oklch(100% 0 0 / .55);border:1px solid color-mix(in oklch,var(--ink) 8%,transparent);font-size:.68rem;font-weight:700;color:var(--ink)}
/* dodatna vprasanja + inicialke dodeljenih sodelavcev — se uporabljajo znotraj
   vozlisca projekta ("00 · CILJI IN ŽELJE" kartica); chat vprasalnik "Ustvari
   projekt" (nekdanji pw-nov-panel) je zdaj lastna stran, glej
   components/NovProjektWorkspace.tsx. */
.pw-vprasanje-vrstica{display:flex;align-items:flex-start;justify-content:space-between;gap:.6rem;padding:.6rem .75rem;border:1px solid oklch(93% .006 82 / .55);border-radius:.8rem;background:oklch(100% 0 0 / .55)}
.pw-vprasanje-vrstica div{display:flex;flex-direction:column;gap:.15rem;min-width:0}
.pw-vprasanje-vrstica b{font-size:.76rem;color:var(--ink);font-weight:700}
.pw-vprasanje-vrstica span{font-size:.72rem;color:color-mix(in oklch,var(--ink) 72%,transparent)}
.pw-chat-sod-krog{display:grid;place-items:center;width:1.7rem;height:1.7rem;border-radius:50%;background:oklch(90% .045 297);color:oklch(40% .16 297);font-size:.6rem;font-weight:800;flex:none}
@media (max-width:640px){
.pw-link-obrazec{grid-template-columns:1fr}
.pw-kmalu-red{grid-template-columns:1fr}
}
/* PIPELINE POSLOV — kanban pogled na zavihku Projekti (preklop Seznam|Pipeline
   ziv v ArhivWorkspace, glej pw-pogled-preklop tam). Stolpci = faze (lib/projekti
   ProjektFaza), kartice = isti seznam projektov kot tabela (offer- ali real-
   izpeljani). Zracno: leb razmik med stolpci + vodoraven drs na ozkem, kartice
   NE stlacene, prazen stolpec ostane majhen (ne raztegnjena skatla). */
.pw-pipeline-namig{margin:0 0 .8rem;color:var(--muted);font-size:.68rem;font-style:italic}
.pw-pipeline{display:flex;align-items:flex-start;gap:.85rem;overflow-x:auto;padding:.15rem .15rem 1.2rem;-webkit-overflow-scrolling:touch}
.pw-pipeline-stolpec{flex:1 1 0;min-width:148px;display:flex;flex-direction:column;gap:.7rem}
.pw-pipeline-stolpec.pw-pipeline-izgubljeno{opacity:.68}
.pw-pipeline-glava{display:flex;align-items:baseline;justify-content:space-between;gap:.5rem;padding:.1rem .25rem}
.pw-pipeline-glava strong{font:700 .72rem var(--font-sans),system-ui,sans-serif;letter-spacing:.06em;text-transform:uppercase;color:var(--ink);white-space:nowrap}
.pw-pipeline-info{color:var(--muted);font-size:.66rem;font-weight:600;white-space:nowrap}
.pw-pipeline-karte{display:flex;flex-direction:column;gap:.65rem;min-height:2.6rem;padding:.2rem;border-radius:18px;transition:background-color .16s}
.pw-pipeline-karte.pw-pipeline-nad{background-color:oklch(95% .03 295 / .55)}
.pw-pipeline-prazno{margin:0;padding:.5rem .3rem;color:var(--muted);font-size:.66rem;font-style:italic}
.pw-posel-kartica{display:flex;flex-direction:column;gap:.4rem;width:100%;box-sizing:border-box;padding:.85rem .95rem;border:1px solid color-mix(in oklch,var(--ink) 8%,transparent);border-radius:14px;background:oklch(99% .006 87 / .92);text-align:left;cursor:pointer;transition:transform .16s cubic-bezier(.16,1,.3,1),box-shadow .16s,border-color .16s}
.pw-posel-kartica:hover{transform:translateY(-2px);box-shadow:0 10px 22px oklch(22% .04 300 / .1);border-color:color-mix(in oklch,var(--ink) 18%,transparent)}
.pw-posel-kartica:focus-visible{outline:2px solid var(--akcent,#6E4FA6);outline-offset:2px}
.pw-posel-kartica[draggable='true']{cursor:grab}
.pw-posel-kartica strong{font-size:.8rem;font-weight:700;color:var(--ink);line-height:1.3;overflow-wrap:anywhere}
.pw-posel-spodaj{display:flex;align-items:center;justify-content:space-between;gap:.5rem;margin-top:.1rem}
.pw-posel-vrednost{font-weight:700;font-size:.76rem;color:var(--ink)}
.pw-posel-pika{width:.5rem;height:.5rem;border-radius:50%;flex:none;background:var(--pika,oklch(62% .02 70))}
.pw-posel-pika[data-tone='success']{--pika:oklch(62% .15 150)}
.pw-posel-pika[data-tone='waiting']{--pika:oklch(72% .16 75)}
.pw-posel-pika[data-tone='danger']{--pika:oklch(58% .19 25)}
.pw-posel-pika[data-tone='neutral']{--pika:oklch(62% .02 70)}
/* pilula Seznam|Pipeline za SAMOSTOJNO rabo (glej komentar ob renderju) — v produkciji
   (znotraj Arhiva) izrise identicno pilulo ArhivWorkspace (.arh-pogled-preklop) */
.pw-pogled-preklop{display:inline-flex;align-items:center;height:2.75rem;box-sizing:border-box;background:rgba(255,255,255,.55);border:1px solid rgba(17,17,17,.1);border-radius:999px;padding:.25rem;gap:.15rem;margin:0 0 1rem;max-width:100%;overflow-x:auto}
.pw-pogled-preklop button{border:none;background:transparent;color:var(--ink);font-family:inherit;font-weight:700;font-size:.72rem;letter-spacing:.03em;text-transform:uppercase;padding:.46rem .9rem;border-radius:999px;cursor:pointer;white-space:nowrap;transition:background .18s,color .18s}
.pw-pogled-preklop button.on{background:var(--ink);color:var(--paper)}
.pw-detajl-preklop{display:inline-flex;align-items:center;box-sizing:border-box;background:rgba(255,255,255,.55);border:1px solid rgba(17,17,17,.1);border-radius:999px;padding:.25rem;gap:.15rem;margin:.2rem 0 1rem}
.pw-detajl-preklop button{border:none;background:transparent;color:var(--ink);font-family:inherit;font-weight:700;font-size:.72rem;letter-spacing:.03em;text-transform:uppercase;padding:.46rem .9rem;border-radius:999px;cursor:pointer;white-space:nowrap;transition:background .18s,color .18s}
.pw-detajl-preklop button.on{background:var(--ink);color:var(--paper)}
@media (max-width:640px){
.pw-pipeline-stolpec{flex-basis:78vw;width:78vw}
}
`;

/* stanje filtra projektov — iste vrednosti kot ArhivWorkspace (statusProjekt),
   da zunanji filterCfg (arh-glava) in notranji fallback delujeta z istimi vrednostmi */
type ProjektStatus = 'vse' | 'aktivni' | 'cakajo' | 'zakljuceni';

type Props = {
  base: string;
  /* zunanjiFilter=true => ProjectsWorkspace NE izriše lastne orodne vrstice
     (ArhivFilter); vrednosti in setterji pridejo od zunaj (ArhivWorkspace),
     ki takrat izrise SVOJ ArhivFilter v .arh-glava (ena vrsta z zavihki). */
  zunanjiFilter?: boolean;
  iskanje?: string;
  onIskanje?: (vrednost: string) => void;
  status?: string;
  onStatus?: (vrednost: string) => void;
  datumOd?: string;
  datumDo?: string;
  onDatumOd?: (vrednost: string) => void;
  onDatumDo?: (vrednost: string) => void;
  /* obvesti starša (ArhivWorkspace), da je detajl projekta odprt kot samostojna
     stran — starš takrat skrije svojo glavo (.arh-glava: zavihki + orodna vrstica),
     da je res videti kot svoja stran. */
  onDetajl?: (odprt: boolean) => void;
  /* izvoz izbranih projektov kot »Package« ZIP (dokumenti PDF + CSV) — implementira
     ArhivWorkspace (ima render dokumentov); brez tega prop-a ostane samo CSV. */
  onPaket?: (projekti: { ime: string; offer: FlowOffer; contracts: FlowContract[]; invoices: FlowInvoice[] }[]) => Promise<void>;
  /* PIPELINE POSLOV — pogled Seznam|Pipeline (glej pw-pipeline spodaj). ArhivWorkspace
     krmili od zunaj (pilula ob zavihkih), ce ni podano deluje samostojno (lastno stanje). */
  pogled?: 'seznam' | 'pipeline';
  onPogled?: (pogled: 'seznam' | 'pipeline') => void;
};

export default function ProjectsWorkspace({ base, zunanjiFilter, iskanje, onIskanje, status, onStatus, datumOd: datumOdZunaj, datumDo: datumDoZunaj, onDatumOd, onDatumDo, onDetajl, onPaket, pogled: pogledZunaj, onPogled }: Props) {
  const jeEn = base === '/en';
  const L = (sl: string, en: string) => (jeEn ? en : sl);
  /* status ponudbe / projekta — samo PRIKAZNE oznake so prevedene; ključi ostanejo
     enum vrednosti (FlowOfferStatus / ProjektEntitetaStatus), ki se uporabljajo v
     <option value>, CSV in filtru, zato jih NE prevajamo. */
  const statusLabel: Record<FlowOfferStatus, string> = { draft: L('Osnutek', 'Draft'), sent: L('Čaka', 'Pending'), accepted: L('Sprejeta', 'Accepted'), rejected: L('Zavrnjena', 'Rejected') };
  const projektStatusOznaka: Record<ProjektEntitetaStatus, string> = { aktiven: L('Aktiven', 'Active'), pavza: L('V pavzi', 'On hold'), koncan: L('Končan', 'Completed') };
  const [offers, setOffers] = useState<FlowOffer[]>([]); const [invoices, setInvoices] = useState<FlowInvoice[]>([]); const [expenses, setExpenses] = useState<FlowExpense[]>([]); const [contracts, setContracts] = useState<FlowContract[]>([]); const [amounts, setAmounts] = useState<Record<string, number>>({}); const [clients, setClients] = useState<FlowClient[]>([]);
  /* PRAVI projekti (lib/projekti) — locena shramba od Flow podatkov zgoraj, glej gradiVnos/realProjects spodaj */
  const [realProjekti, setRealProjekti] = useState<Projekt[]>([]);
  /* Demo/Prazno velja za vse strani — glej lib/predogled.ts */
  const [nacin] = usePredogled();
  const samoOgled = nacin !== 'mine';
  const router = useRouter();
  const [selectedId, setSelectedId] = useState('');
  /* izbor vrstic za izvoz (kljuc = offer.id) + portal za spodnjo letev (Lenis) */
  const [izbrani, setIzbrani] = useState<Set<string>>(() => new Set());
  const [portalPripravljen, setPortalPripravljen] = useState(false);
  useEffect(() => { setPortalPripravljen(true); }, []);
  const [izvazamPaket, setIzvazamPaket] = useState(false);
  const preklopiIzbor = (id: string) => setIzbrani(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  /* samostojna raba (brez zunanjiFilter): lastno stanje orodne vrstice — fallback,
     ko iskanje/status/datum* niso podani od zunaj */
  const [notranjeIskanje, setNotranjeIskanje] = useState('');
  const [notranjiFilter, setNotranjiFilter] = useState<ProjektStatus>('vse');
  const [notranjiDatumOd, setNotranjiDatumOd] = useState(''); const [notranjiDatumDo, setNotranjiDatumDo] = useState('');
  const [statusUrejam, setStatusUrejam] = useState<string | null>(null); /* id odprtega status-menija (custom namesto nativnega selecta) */
  const [jeMobilni, setJeMobilni] = useState(false);
  const search = iskanje ?? notranjeIskanje;
  const setSearch = (v: string) => { if (onIskanje) onIskanje(v); else setNotranjeIskanje(v); };
  const filter = (status as ProjektStatus | undefined) ?? notranjiFilter;
  const setFilter = (v: ProjektStatus) => { if (onStatus) onStatus(v); else setNotranjiFilter(v); };
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 640px)');
    const upd = () => setJeMobilni(mq.matches);
    upd(); mq.addEventListener('change', upd);
    return () => mq.removeEventListener('change', upd);
  }, []);
  useEffect(() => {
    if (!statusUrejam) return;
    const zapri = (e: MouseEvent) => { if (!(e.target as HTMLElement).closest('.pw-status-ured, .pw-det-statusured, .pw-status-back')) setStatusUrejam(null); };
    const esc = (e: globalThis.KeyboardEvent) => { if (e.key === 'Escape') setStatusUrejam(null); };
    document.addEventListener('mousedown', zapri); document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', zapri); document.removeEventListener('keydown', esc); };
  }, [statusUrejam]);
  const datumOd = datumOdZunaj ?? notranjiDatumOd;
  const setDatumOd = (v: string) => { if (onDatumOd) onDatumOd(v); else setNotranjiDatumOd(v); };
  const datumDo = datumDoZunaj ?? notranjiDatumDo;
  const setDatumDo = (v: string) => { if (onDatumDo) onDatumDo(v); else setNotranjiDatumDo(v); };
  /* ob nalaganju/menjavi predogleda ostane seznam (tabela) privzeti pogled —
     detajl se odpre le na eksplicit klik (selectProject spodaj) */
  useEffect(() => { const data = podatkiZaPredogled(nacin, loadFlowData()); const loaded = [...data.offers].sort((a, b) => b.date.localeCompare(a.date)); setOffers(loaded); setSelectedId(''); setInvoices(data.invoices); setExpenses(data.expenses); setContracts(data.contracts); setClients(data.clients); setAmounts(Object.fromEntries(data.offers.map(offer => [offer.id, offer.agreedAmount]))); setRealProjekti(nacin === 'mine' ? preberiProjekti() : []); setSodelavci(nacin === 'mine' ? preberiSodelavci() : nacin === 'demo' ? demoSodelavci() : []); }, [nacin]);
  /* gradnja ene vrstice tabele/detajla — enaka za projekte, izpeljane iz ponudbe,
     IN za prave projekte (real, glej lib/projekti); slednji dobijo sintetično
     FlowOffer samo za prikaz (title/client/date/status/scope), da lahko
     obstoječa tabela in vozlišče delujeta brez podvajanja logike. */
  const gradiVnos = (offer: FlowOffer, real?: Projekt) => {
    const projectInvoices = invoices.filter(item => item.sourceOfferId === offer.id);
    const projectExpenses = expenses.filter(item => item.sourceOfferId === offer.id);
    const projectContracts = contracts.filter(item => item.sourceOfferId === offer.id);
    const billed = projectInvoices.reduce((sum, item) => sum + item.amount, 0);
    const paid = projectInvoices.filter(item => item.paid).reduce((sum, item) => sum + item.amount, 0);
    const costs = projectExpenses.reduce((sum, item) => sum + item.amount, 0);
    const agreed = amounts[offer.id] || 0;
    return { offer, real, invoices: projectInvoices, expenses: projectExpenses, contracts: projectContracts, billed, paid, costs, agreed, unbilled: agreed ? agreed - billed : 0, profit: paid - costs };
  };
  /* OSNUTEK ponudbe NI projekt: dokler ponudba ni poslana, dela še ni in v
     Projektih nima kaj iskati (uporabnica: "projekt se je ustvaril, čeprav ga
     nisem ustvarila in ne vem, ali ga sploh dobim"). Osnutki ostanejo v Ponudbah
     in Arhivu; v Projekte pridejo, ko so poslani, sprejeti ali zavrnjeni. */
  const offerProjects = useMemo(() => offers.filter(o => o.status !== 'draft').map(offer => gradiVnos(offer, samoOgled ? demoRealZaOffer(offer.id) : undefined)), [offers, invoices, expenses, contracts, amounts, samoOgled]);
  /* PRAVI projekti — zdruzeni s tistimi, izpeljanimi iz ponudb, BREZ podvajanja:
     ce ze obstaja ponudba z istim naslovom+stranko, ta ponudba ze predstavlja
     isti projekt v seznamu, zato se pravi zapis takrat ne podvoji. */
  const realProjects = useMemo(() => {
    const kljucPonudb = new Set(offers.map(o => `${o.title.trim().toLocaleLowerCase('sl-SI')}::${(o.client || '').trim().toLocaleLowerCase('sl-SI')}`));
    return realProjekti
      .filter(p => !kljucPonudb.has(`${p.naslov.trim().toLocaleLowerCase('sl-SI')}::${(p.strankaIme || '').trim().toLocaleLowerCase('sl-SI')}`))
      .map(p => gradiVnos({ id: `real-${p.id}`, title: p.naslov, client: p.strankaIme || '', date: p.zacetek || p.created, number: p.stevilka, scope: [], status: projektDoOfferStatus[p.status], agreedAmount: 0 }, p));
  }, [realProjekti, offers, invoices, expenses, contracts, amounts]);
  const projects = useMemo(() => [...offerProjects, ...realProjects].sort((a, b) => (b.offer.date || '').localeCompare(a.offer.date || '')), [offerProjects, realProjects]);
  const visible = projects.filter(project => { const text = `${project.offer.title} ${project.offer.client} ${project.offer.number || ''}`.toLocaleLowerCase('sl-SI'); const match = text.includes(search.toLocaleLowerCase('sl-SI')); const state = filter === 'vse' || (filter === 'aktivni' ? project.offer.status === 'accepted' : filter === 'cakajo' ? project.offer.status === 'sent' : ['rejected'].includes(project.offer.status)); return match && state && vObdobju(project.offer.date, datumOd, datumDo); });
  /* paginacija seznama projektov (namesto neskončnega skrolanja) */
  const [projStran, setProjStran] = useState(1);
  const NA_STRAN_PROJ = 10;
  const projStrani = Math.max(1, Math.ceil(visible.length / NA_STRAN_PROJ));
  const projStranA = Math.min(Math.max(1, projStran), projStrani);
  const projPrikaz = visible.slice((projStranA - 1) * NA_STRAN_PROJ, projStranA * NA_STRAN_PROJ);
  useEffect(() => { setProjStran(1); }, [search, filter, datumOd, datumDo, nacin]);
  /* označi vse (vidne) + CSV izvoz izbranih projektov */
  const vsiIzbrani = visible.length > 0 && visible.every(p => izbrani.has(p.offer.id));
  const preklopiVse = () => setIzbrani(prev => { const n = new Set(prev); if (vsiIzbrani) visible.forEach(p => n.delete(p.offer.id)); else visible.forEach(p => n.add(p.offer.id)); return n; });
  const kljuk = (id: string | null) => {
    const vse = id === null;
    const on = vse ? vsiIzbrani : izbrani.has(id);
    const dej = (e: React.SyntheticEvent) => { e.stopPropagation(); if (vse) preklopiVse(); else preklopiIzbor(id); };
    return <span className="pw-chk-cel"><span role="checkbox" aria-checked={on} tabIndex={0}
      className={'pw-chk' + (on ? ' on' : '')} onClick={dej}
      onKeyDown={e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); dej(e); } }}
      aria-label={vse ? L('Označi vse', 'Select all') : L('Izberi projekt', 'Select project')} /></span>;
  };
  const izvoziIzbrane = () => {
    if (typeof document === 'undefined') return;
    const vrst: (string | number)[][] = [[L('Projekt', 'Project'), L('Stranka', 'Client'), L('Datum', 'Date'), L('Status', 'Status'), L('Vrednost', 'Value')]];
    visible.forEach(p => {
      if (!izbrani.has(p.offer.id)) return;
      const status = p.real ? projektStatusOznaka[p.real.status] : statusLabel[p.offer.status];
      vrst.push([p.offer.title || '', p.offer.client || '', datStr(p.offer.date), status, typeof p.agreed === 'number' && p.agreed ? p.agreed : '']);
    });
    const vsebina = '﻿' + vrst.map(v => v.map(c => { const s = String(c ?? ''); return /[";\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }).join(';')).join('\r\n');
    const blob = new Blob([vsebina], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'Projekti_izvoz.csv';
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const naPaket = async () => {
    if (!onPaket || izvazamPaket) return;
    const sel = visible.filter(p => izbrani.has(p.offer.id)).map(p => ({ ime: p.offer.title || p.offer.client || 'projekt', offer: p.offer, contracts: p.contracts, invoices: p.invoices }));
    if (!sel.length) return;
    setIzvazamPaket(true);
    try { await onPaket(sel); } finally { setIzvazamPaket(false); }
  };
  /* PIPELINE POSLOV — kanban pogled (glej pw-pipeline v pwStyles). Stolpci po vrsti
     + locen, umirjen Izgubljeno na koncu (glej ProjektFaza v lib/projekti). */
  const PIPELINE_STOLPCI: { faza: ProjektFaza; naziv: string }[] = [
    { faza: 'lead', naziv: L('Lead', 'Lead') },
    { faza: 'ponudba', naziv: L('Ponudba', 'Offer') },
    { faza: 'pogodba', naziv: L('Pogodba', 'Contract') },
    { faza: 'delo', naziv: L('Delo', 'Work') },
    { faza: 'racun', naziv: L('Račun', 'Invoice') },
    { faza: 'zakljuceno', naziv: L('Zaključeno', 'Completed') },
  ];
  const PIPELINE_IZGUBLJENO: { faza: ProjektFaza; naziv: string } = { faza: 'izgubljeno', naziv: L('Izgubljeno', 'Lost') };
  /* faza kartice: PRAVI projekt (real) ima svojo faza/status (lib/projekti fazaProjekta);
     projekt izpeljan SAMO iz ponudbe nima real zapisa, zato fazo priblizamo iz
     dejanskega stanja te ponudbe (racun/pogodba ze obstajata? sicer status ponudbe) */
  const pipelineFaza = (project: (typeof visible)[number]): ProjektFaza => {
    if (project.real) return fazaProjekta(project.real);
    if (project.invoices.length) return 'racun';
    if (project.contracts.length) return 'pogodba';
    if (project.offer.status === 'accepted') return 'delo';
    if (project.offer.status === 'sent') return 'ponudba';
    if (project.offer.status === 'rejected') return 'izgubljeno';
    return 'lead';
  };
  const pipelineStolpci = useMemo(() => {
    const skupine: Record<ProjektFaza, (typeof visible)> = { lead: [], ponudba: [], pogodba: [], delo: [], racun: [], zakljuceno: [], izgubljeno: [] };
    visible.forEach(project => { skupine[pipelineFaza(project)].push(project); });
    return skupine;
  }, [visible]);
  /* drag&drop: SAMO PRAVI projekti (project.real) so vlecljivi — offer-izpeljani
     nimajo prave shrambe zase, zato ostanejo v svojem stolpcu le berljivi. */
  const [pipelineDragId, setPipelineDragId] = useState<string | null>(null);
  const [pipelineNad, setPipelineNad] = useState<ProjektFaza | null>(null);
  const premakniFazo = (real: Projekt, novaFaza: ProjektFaza) => {
    if (samoOgled) return;
    const posodobljen: Projekt = { ...real, faza: novaFaza };
    shraniProjekt(posodobljen);
    setRealProjekti(prev => prev.map(p => (p.id === posodobljen.id ? posodobljen : p)));
  };
  /* status projekta (aktiven/pavza/koncan) — klik na pilulo v tabeli -> spustni seznam */
  const naStatusProjekt = (real: Projekt, v: ProjektEntitetaStatus) => {
    const posodobljen: Projekt = { ...real, status: v };
    setRealProjekti(prev => prev.map(p => (p.id === posodobljen.id ? posodobljen : p)));
    if (!samoOgled) shraniProjekt(posodobljen);  /* v demu samo lokalno (ne pisemo v pravo bazo) */
  };
  /* dodeljeni sodelavci na projektu (moderni pogled: dodaj/odvzemi) — enak vzorec
     kot status; SAMO pravi projekt (real) ima polje dodeljeni za shranjevanje */
  const preklopiDodeljen = (real: Projekt, sodelavecId: string) => {
    const bili = real.dodeljeni || [];
    const dodeljeni = bili.includes(sodelavecId) ? bili.filter(id => id !== sodelavecId) : [...bili, sodelavecId];
    const posodobljen: Projekt = { ...real, dodeljeni };
    setRealProjekti(prev => prev.map(p => (p.id === posodobljen.id ? posodobljen : p)));
    if (!samoOgled) shraniProjekt(posodobljen);
  };
  /* brief/cilji inline urejanje v detajlu (ProjectDetailModern panel) — isti vzorec */
  const naSaveBrief = (real: Projekt, patch: Partial<Projekt>) => {
    const posodobljen: Projekt = { ...real, ...patch };
    setRealProjekti(prev => prev.map(p => (p.id === posodobljen.id ? posodobljen : p)));
    if (!samoOgled) shraniProjekt(posodobljen);
  };
  /* ZGRADI PROJEKT IZ PONUDBE — projekt nastane sele, ko je posel potrjen, in
     sicer po ODLOCITVI uporabnice (gumb), ne sam od sebe. Podatki se prenesejo
     iz ponudbe; od tedaj je brief uredljiv, ker obstaja pravi zapis. */
  const zgradiProjektIzPonudbe = (offer: FlowOffer): Projekt | undefined => {
    if (samoOgled) return undefined;
    const nov: Projekt = {
      id: 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
      stevilka: offer.number,
      naslov: offer.title,
      strankaIme: offer.client || '',
      zacetek: offer.date || new Date().toISOString().slice(0, 10),
      status: 'aktiven',
      created: new Date().toISOString(),
    };
    setRealProjekti(shraniProjekt(nov));
    setSelectedId(`real-${nov.id}`);
    return nov;
  };

  /* projekt izpeljan iz ponudbe (ni pravega zapisa) -> status je status ponudbe */
  const naStatusOffer = (id: string, v: FlowOfferStatus) => {
    setOffers(prev => prev.map(o => (o.id === id ? { ...o, status: v } : o)));
    if (!samoOgled) saveOfferStatus(id, v);
    /* (C) ob POTRDITVI ponudbe ponudimo gradnjo projekta — vprasamo, ne naredimo sami */
    if (v === 'accepted' && !samoOgled) {
      const offer = offers.find(o => o.id === id);
      const zeObstaja = offer && realProjekti.some(p =>
        p.naslov.trim().toLocaleLowerCase('sl-SI') === offer.title.trim().toLocaleLowerCase('sl-SI')
        && (p.strankaIme || '').trim().toLocaleLowerCase('sl-SI') === (offer.client || '').trim().toLocaleLowerCase('sl-SI'));
      if (offer && !zeObstaja && window.confirm(L('Ponudba je potrjena. Naj iz nje zgradim projekt?', 'The quote is accepted. Shall I build a project from it?'))) {
        zgradiProjektIzPonudbe(offer);
      }
    }
  };

  /* Custom status-meni (namesto nativnega <select>): desktop = popover pod pilulo, mobile = slide-up sheet. */
  const statusMeni = (kljuc: string, opcije: Array<[string, string]>, izbrano: string, onIzberi: (v: string) => void) => {
    const seznam = (
      <div className="pw-statusmeni-seznam" role="listbox" aria-label={L('Status', 'Status')}>
        {opcije.map(([v, label]) => (
          <button key={v} type="button" role="option" aria-selected={v === izbrano} className={'pw-statusmeni-opcija' + (v === izbrano ? ' on' : '')} onClick={e => { e.stopPropagation(); onIzberi(v); setStatusUrejam(null); }}>
            <span>{label}</span>{v === izbrano && <span className="pw-statusmeni-kljuk" aria-hidden>✓</span>}
          </button>
        ))}
      </div>
    );
    if (jeMobilni && portalPripravljen) {
      return createPortal(
        <div className="pw-status-back" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) setStatusUrejam(null); }}>
          <div className="pw-status-sheet" role="dialog" aria-modal="true" aria-label={L('Spremeni status', 'Change status')} onMouseDown={e => e.stopPropagation()}>
            <div className="pw-status-sheet-glava"><p>{L('STATUS', 'STATUS')}</p><button type="button" className="pw-status-x" onClick={() => setStatusUrejam(null)} aria-label={L('Zapri', 'Close')}>✕</button></div>
            {seznam}
          </div>
        </div>,
        document.body,
      );
    }
    return <div className="pw-statusmeni" onMouseDown={e => e.stopPropagation()}>{seznam}</div>;
  };

  const selected = projects.find(project => project.offer.id === selectedId);
  /* sortirano padajoče po datumu — uporabljeno tako na kartici (top 5) kot v slideu (ves seznam) */
  const pogodbeSort = selected ? [...selected.contracts].sort((a, b) => (b.date || '').localeCompare(a.date || '')) : [];
  const racuniSort = selected ? [...selected.invoices].sort((a, b) => (b.date || '').localeCompare(a.date || '')) : [];
  const strosekSort = selected ? [...selected.expenses].sort((a, b) => (b.date || '').localeCompare(a.date || '')) : [];
  const saveAmount = (id: string, amount: number) => { const next = { ...amounts, [id]: amount }; setAmounts(next); saveOfferAmount(id, amount); };
  /* Detajl projekta je zdaj SAMOSTOJNA stran (view-swap na vseh širinah, ne le
     mobilno): ko je selectedId nastavljen, tabela+orodna vrstica se skrijeta in
     izriše se samo .projectStory čez celo, z gumbom ← Nazaj na vrhu. onDetajl
     obvesti ArhivWorkspace, naj skrije svojo glavo (zavihki+filter). */
  const storyRef = useRef<HTMLElement>(null);
  const selectProject = (id: string) => { setSelectedId(id); onDetajl?.(true); requestAnimationFrame(() => storyRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })); };
  const goBack = () => { setSelectedId(''); onDetajl?.(false); };
  /* varnostna mreza: ce se komponenta odstrani (npr. menjava zavihka v Arhivu)
     medtem ko je bil detajl odprt, sporoci starsu, naj svojo glavo spet pokaze */
  useEffect(() => () => { onDetajl?.(false); }, [onDetajl]);
  /* onDetajl VEDNO sledi selectedId: ko ni izbranega projekta (seznam), glava Arhiva
     (naslov + zavihki) se MORA prikazati; sicer ostane zataknjena skrita. */
  useEffect(() => { onDetajl?.(!!selectedId); }, [selectedId, onDetajl]);

  /* Klik na projekt pri stranki (ClientWorkspace) pripelje sem z ?projekt=<id> —
     ob montiranju odpri ta projekt kot detajl (isti selectProject kot ročni klik
     na vrstico v tabeli). Guard (ref), da to stori SAMO ENKRAT — sicer bi vsaka
     menjava stanja (npr. ročen "← Nazaj") spet odprla isti projekt iz URL-ja. */
  const projektIzUrljaOdprt = useRef(false);
  const searchParams = useSearchParams();
  useEffect(() => {
    if (projektIzUrljaOdprt.current) return;
    const id = searchParams.get('projekt');
    if (!id) return;
    if (!projects.some(project => project.offer.id === id)) return;
    projektIzUrljaOdprt.current = true;
    selectProject(id);
  }, [searchParams, projects]);

  /* PIPELINE POSLOV — pogled Seznam|Pipeline: ce ga krmili starš (ArhivWorkspace,
     pilula ob zavihkih), uporabi to; sicer lastno stanje. */
  const [notranjiPogled, setNotranjiPogled] = useState<'seznam' | 'pipeline'>('seznam');
  const [pogledDetajl, setPogledDetajl] = useState<'tabelni' | 'moderni'>('moderni');
  const [komOdprt, setKomOdprt] = useState(false);   /* komunikacijski RTL panel (pošta v svojem oknu) */
  const pogled = pogledZunaj ?? notranjiPogled;
  const setPogled = (v: 'seznam' | 'pipeline') => { if (onPogled) onPogled(v); else setNotranjiPogled(v); };
  /* sodelavci — se uporabljajo za prikaz "Dodeljeni" na vozliscu projekta (glej
     spodaj); "Ustvari projekt" (dodeljevanje sodelavcem) je zdaj lastna stran,
     glej components/NovProjektWorkspace.tsx. */
  const [sodelavci, setSodelavci] = useState<Sodelavec[]>([]);

  /* 05 · DOKUMENTACIJA — povezave do zunanjih datotek za TA projekt (localStorage,
     glej lib/pinartFlowStore). V predogledu (demo/prazno/začetek) samo prikaz —
     dodajanje/brisanje onemogočeno, da se ne piše v pravo shrambo. */
  const [links, setLinks] = useState<FlowProjectLink[]>([]);
  /* 06 · POŠTA — dnevnik poslane pošte za TA projekt (lib/postaDnevnik). V
     predogledu (demo/prazno/začetek) pokažemo nekaj vzorčnih zapisov, da razdelek
     ni prazen; sicer beremo dejansko shranjeno pošto projekta. */
  const [posta, setPosta] = useState<PostaVnos[]>([]);
  const [mapa, setMapa] = useState<'prejeto' | 'poslano' | 'osnutki' | 'kos'>('poslano');
  const [mapeOdprt, setMapeOdprt] = useState(false); /* mobilni folder meni (desni slide, kot hub) */
  const [beriMail, setBeriMail] = useState<PostaVnos | null>(null);
  const [postaIsk, setPostaIsk] = useState('');
  const [postaOseba, setPostaOseba] = useState('');   /* filter po prejemniku (ko vec oseb na projektu) */
  const [izbraniMaili, setIzbraniMaili] = useState<Set<string>>(new Set());   /* izbrani maili (checkbox) za bulk akcije */
  const [postaStran, setPostaStran] = useState(1);            /* paginacija seznama pošte */
  const [aiOdprt, setAiOdprt] = useState(false);              /* Pupa panel na mailu (povzetek + predlog odgovora) */
  const [aiNalaganje, setAiNalaganje] = useState(false);
  const [aiPovzetek, setAiPovzetek] = useState('');
  const [aiOdgovor, setAiOdgovor] = useState('');
  const [aiNapaka, setAiNapaka] = useState('');
  const [klepetOdprt, setKlepetOdprt] = useState(false);      /* klepetni stolpec (Deli v klepet) */
  const [klepetSporocila, setKlepetSporocila] = useState<KlepetSporocilo[]>([]);
  const [klepetVnos, setKlepetVnos] = useState('');
  const [klepetIzbrani, setKlepetIzbrani] = useState<string[]>([]);   /* izbrani sodelavci (nit) */
  const [klepetPicker, setKlepetPicker] = useState(false);            /* meni za izbiro sodelavcev */
  const [klepetThreadId, setKlepetThreadId] = useState<string | null>(null);  /* oblačna nit (če prijavljen) */
  const [mojKlepetEmail, setMojKlepetEmail] = useState<string | null>(null);
  const mojEmailRef = useRef<string | null>(null);
  const klepetOdjavaRef = useRef<(() => void) | null>(null);         /* odjava realtime */
  useEffect(() => { void mojEmail().then(setMojKlepetEmail); }, []);
  useEffect(() => { mojEmailRef.current = mojKlepetEmail; }, [mojKlepetEmail]);
  useEffect(() => () => { klepetOdjavaRef.current?.(); }, []);
  const [premakniOdprt, setPremakniOdprt] = useState(false);   /* meni »Premakni na drug projekt« */
  const [oznakaOdprt, setOznakaOdprt] = useState(false);       /* vnos oznake */
  const [oznakaVnos, setOznakaVnos] = useState('');
  const [nalogaOdprt, setNalogaOdprt] = useState(false);       /* okno »Nova naloga iz maila« */
  const [nalogaNaslov, setNalogaNaslov] = useState('');
  const [nalogaOpis, setNalogaOpis] = useState('');
  /* »Nova pošta« — sestavljalnik neposredno v projektu (brez dokumenta). Pošlje
     prek Resend, zabeleži lokalno (postaDnevnik) + v oblak (pushProjectMail). */
  const [pisiOdprt, setPisiOdprt] = useState(false);
  const [pisiZa, setPisiZa] = useState('');
  const [pisiZadeva, setPisiZadeva] = useState('');
  const [pisiStatus, setPisiStatus] = useState('');
  const [pisiPosiljam, setPisiPosiljam] = useState(false);
  const [pisiUspeh, setPisiUspeh] = useState(false); /* zelena '✓ Poslano' potrditev pred zaprtjem (enako kot v hubu) */
  const pisiTeloRef = useRef<HTMLDivElement>(null);
  const [imaPodpis, setImaPodpis] = useState(true);   /* ali je nastavljen podpis maila (sicer opomnik) */
  const [linkOznaka, setLinkOznaka] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [dodajOdprt, setDodajOdprt] = useState(false);
  const [dokOdprt, setDokOdprt] = useState(false);   /* Dokumentacija slide (upravljanje povezav) */
  const [dokUredi, setDokUredi] = useState<number | null>(null);   /* indeks povezave v urejanju */
  /* SLIDE "Vsi <tip>" z desne (pogodbe/računi/stroški) — kartica pokaže le povzetek
     (najnovejših 5), poln seznam z iskalnikom+paginacijo je v slideu. Stanje se
     resetira ob menjavi projekta (useEffect spodaj) in ob zaprtju (closeVsi). */
  const [vsiOdprt, setVsiOdprt] = useState<null | 'pogodbe' | 'racuni' | 'stroski'>(null);
  const [vsiIskanje, setVsiIskanje] = useState('');
  const [vsiIskanjeOdprto, setVsiIskanjeOdprto] = useState(false);
  const [vsiStran, setVsiStran] = useState(1);
  /* preklop načina prikaza v slideu: "strani" = paginacija 20/stran, "drsenje" = ves seznam v enem drsljivem seznamu */
  const [vsiNacin, setVsiNacin] = useState<'strani' | 'drsenje'>('strani');
  const openVsi = (tip: 'pogodbe' | 'racuni' | 'stroski') => { setVsiOdprt(tip); setVsiIskanje(''); setVsiIskanjeOdprto(false); setVsiStran(1); setVsiNacin('strani'); };
  const closeVsi = () => { setVsiOdprt(null); setVsiIskanje(''); setVsiIskanjeOdprto(false); setVsiStran(1); setVsiNacin('strani'); };
  /* klik na vrstico (na kartici ALI v slideu) -> predogled dokumenta v panelu z desne */
  const [vrsticaDetajl, setVrsticaDetajl] = useState<null | { tip: 'ponudbe' | 'pogodbe' | 'racuni' | 'stroski'; item: FlowOffer | FlowContract | FlowInvoice | FlowExpense }>(null);
  /* Stran za panelom obmiruje -- enako kot v DokPanelu. Brez tega se ob drsenju
     nad odprtim panelom pomika se stran spodaj in vidita se dva drsnika. */
  useEffect(() => {
    if (typeof document === 'undefined' || !(komOdprt || dokOdprt || nalogaOdprt || vsiOdprt || vrsticaDetajl !== null)) return;
    const prejOverflow = document.body.style.overflow;
    const prejPadding = document.body.style.paddingRight;
    const sirinaDrsnika = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = 'hidden';
    if (sirinaDrsnika > 0) document.body.style.paddingRight = `${sirinaDrsnika}px`;
    return () => { document.body.style.overflow = prejOverflow; document.body.style.paddingRight = prejPadding; };
  }, [komOdprt, dokOdprt, nalogaOdprt, vsiOdprt, vrsticaDetajl]);
  /* Zaklep ozadja: ko je odprt kateri koli desni panel/letev, se STRAN v ozadju NE skrola
     (skrola se le vsebina panela). */
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const odprt = komOdprt || nalogaOdprt || dokOdprt || !!vsiOdprt || !!vrsticaDetajl;
    if (odprt) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    /* skrij plavajočo Pupo, ko je odprta desna letev (sicer prekrije klepetni vnos) */
    document.body.classList.toggle('flow-rail-odprt', komOdprt);
    return () => { document.body.style.overflow = ''; document.body.classList.remove('flow-rail-odprt'); };
  }, [komOdprt, nalogaOdprt, dokOdprt, vsiOdprt, vrsticaDetajl]);
  /* Esc zapre odprte meni-gumbe (pobeg brez klika na isti gumb) */
  useEffect(() => {
    const onKey = (e: Event) => { if ((e as { key?: string }).key === 'Escape') { setKlepetPicker(false); setPremakniOdprt(false); setOznakaOdprt(false); } };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);
  const klik = (tip: 'pogodbe' | 'racuni' | 'stroski', item: FlowContract | FlowInvoice | FlowExpense) => ({
    role: 'button' as const, tabIndex: 0,
    onClick: () => setVrsticaDetajl({ tip, item }),
    onKeyDown: (e: KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setVrsticaDetajl({ tip, item }); } },
  });
  /* pošlji dokument iz predogleda (mailto; prejemnik iz imenika po imenu stranke) — do Resend brez priponke */
  const strankaEmail = (ime: string) => { const c = (ime || '').trim().toLocaleLowerCase('sl-SI'); return clients.find(x => (x.name || '').trim().toLocaleLowerCase('sl-SI') === c)?.email || ''; };
  const posljiDokument = (ime: string, zadeva: string, telo: string) => { if (typeof window === 'undefined') return; window.location.href = `mailto:${encodeURIComponent(strankaEmail(ime))}?subject=${encodeURIComponent(zadeva)}&body=${encodeURIComponent(telo)}`; };
  /* ── »Nova pošta«: odpri sestavljalnik (prednapolni prejemnika iz stranke) ── */
  /* iz maila: odpre okno za urejanje nove naloge (prednapolnjeno z mailom) */
  /* Pupa na mailu: pošlje besedilo sporočila v /api/pupa in vrne kratek povzetek
     + predlog odgovora. Osnutek lahko z enim klikom odpreš v sestavljalniku. */
  const pozeniAi = async (mail: PostaVnos | null) => {
    if (!mail) return;
    setAiOdprt(true); setAiNalaganje(true); setAiNapaka(''); setAiPovzetek(''); setAiOdgovor('');
    const telo = (mail.telo || mail.povzetek || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    const kontekst = selected ? `Projekt: ${selected.offer.title}; stranka: ${selected.offer.client}` : '';
    const smer = mail.smer === 'poslano' ? L('To sporočilo sem JAZ poslala stranki.', 'I sent this message to the client.') : L('To sporočilo je stranka poslala meni.', 'The client sent this message to me.');
    const vprasanje = `${smer} ${L('Zadeva', 'Subject')}: "${mail.zadeva || ''}". ${L('Besedilo', 'Body')}: """${telo || L('(besedilo ni shranjeno)', '(no stored text)')}""".\n\n${L('Naredi dvoje in odgovori TOČNO v tej obliki, brez uvoda:', 'Do two things and answer EXACTLY in this format, no preface:')}\nPOVZETEK: ${L('(1–2 povedi: kaj sporočilo pravi in kaj se pričakuje od mene)', '(1–2 sentences: what the message says and what is expected of me)')}\nODGOVOR: ${L('(kratek, vljuden osnutek mojega odgovora, brez pozdravne glave in podpisa)', '(a short, polite draft of my reply, without greeting header or signature)')}`;
    try {
      const r = await fetch('/api/pupa', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ vprasanje, kontekst }) });
      const d = await r.json();
      if (d.napaka) { setAiNapaka(d.napaka); }
      else if (d.brezKljuca) { setAiNapaka(String(d.odgovor || '')); }
      else {
        const txt = String(d.odgovor || '');
        const mp = txt.match(/POVZETEK:\s*([\s\S]*?)(?:\n\s*ODGOVOR:|$)/i);
        const mo = txt.match(/ODGOVOR:\s*([\s\S]*)$/i);
        setAiPovzetek((mp?.[1] || txt).trim());
        setAiOdgovor((mo?.[1] || '').trim());
      }
    } catch { setAiNapaka(L('Napaka pri klicu Pupe. Poskusi znova.', 'Pupa request failed. Try again.')); }
    setAiNalaganje(false);
  };
  /* AI osnutek odpri v sestavljalniku kot odgovor na ta mail */
  const uporabiAiOdgovor = (mail: PostaVnos | null) => {
    if (!mail) return;
    odpriPisanje();
    setPisiZa(mail.prejemniki[0] || '');
    setPisiZadeva(`Re: ${(mail.zadeva || '').replace(/^Re:\s*/i, '')}`);
    const osnutek = aiOdgovor;
    setAiOdprt(false); setBeriMail(null);
    /* počakaj, da se sestavljalnik odpre in podpis vstavi, nato prepiši telo z AI osnutkom */
    setTimeout(() => { const el = pisiTeloRef.current; if (el) el.innerHTML = osnutek.replace(/\n/g, '<br>') + '<br><br>' + el.innerHTML; }, 60);
  };
  /* demo prisotnost sodelavca (deterministična; živa prisotnost pride z računi sodelavcev) */
  const prisotnost = (id: string): 'online' | 'idle' | 'offline' => {
    const h = [...id].reduce((a, c) => a + c.charCodeAt(0), 0) % 3;
    return h === 0 ? 'online' : h === 1 ? 'idle' : 'offline';
  };
  /* oblačno sporočilo -> prikazni zapis (avtor 'jaz' če je moj email) */
  const oblakVDisplay = (m: OblacnoSporocilo): KlepetSporocilo => ({
    id: m.id, projectId: selectedId, nit: '', avtor: m.senderEmail === (mojEmailRef.current || '') ? 'jaz' : (m.senderName || m.senderEmail), besedilo: m.body, datum: m.createdAt, odMaila: m.odMaila,
  });
  const udelezenciEmaili = (ids: string[]) => ids.map(id => sodelavci.find(s => s.id === id)).filter((s): s is Sodelavec => !!s && !!s.email).map(s => ({ email: s.email, ime: s.ime }));
  /* sinhroniziraj oblak za izbrane sodelavce; vrne threadId ali null (=lokalno) */
  const sinhronizirajKlepet = async (ids: string[]): Promise<string | null> => {
    if (!selectedId) return null;
    const tid = await zagotoviNit(selectedId, udelezenciEmaili(ids));
    klepetOdjavaRef.current?.(); klepetOdjavaRef.current = null;
    if (!tid) { setKlepetThreadId(null); setKlepetSporocila(preberiKlepet(selectedId, nitId(ids))); return null; }
    setKlepetThreadId(tid);
    setKlepetSporocila((await nalozSporocila(tid)).map(oblakVDisplay));
    klepetOdjavaRef.current = narociSporocila(tid, m => setKlepetSporocila(prev => (prev.some(p => p.id === m.id) ? prev : [...prev, oblakVDisplay(m)])));
    return tid;
  };
  const naloziNit = (ids: string[]) => { void sinhronizirajKlepet(ids); };
  const preklopiSodelavca = (id: string) => {
    const novi = klepetIzbrani.includes(id) ? klepetIzbrani.filter(x => x !== id) : [...klepetIzbrani, id];
    setKlepetIzbrani(novi);
    void sinhronizirajKlepet(novi);
  };
  /* Povabi NOVEGA (ne le obstoječega sodelavca) po e-naslovu: doda ga med sodelavce,
     izbere v nit IN mu pošlje mail vabilo z linkom (kot na Komunikacija hubu). */
  const [vabiMail, setVabiMail] = useState('');
  const [povabiToast, setPovabiToast] = useState('');
  const povabiNaMail = async (e: React.FormEvent) => {
    e.preventDefault();
    const em = vabiMail.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) { setPovabiToast(L('Vpiši veljaven e-naslov.', 'Enter a valid email.')); return; }
    if (nacin !== 'mine') { setPovabiToast(L('V predogledu ne povabiš.', 'Not available in preview.')); return; }
    let sod = sodelavci.find(s => (s.email || '').toLowerCase() === em.toLowerCase());
    if (!sod) {
      sod = { id: (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `sod-${Date.now()}`), ime: em.split('@')[0], email: em, vloga: 'clan', aktiven: true };
      const noviSez = [...sodelavci, sod];
      shraniSodelavci(noviSez); setSodelavci(noviSez);
    }
    const izbrani = klepetIzbrani.includes(sod.id) ? klepetIzbrani : [...klepetIzbrani, sod.id];
    setKlepetIzbrani(izbrani);
    await sinhronizirajKlepet(izbrani);
    const povezava = `https://www.pinartflow.com${jeEn ? '/en' : ''}/kalkulator/komunikacija`;
    const zadeva = jeEn ? 'You have been added to a chat — Pinart Flow' : 'Dodani ste v klepet — Pinart Flow';
    const html = jeEn
      ? `<div style="font-family:system-ui,-apple-system,sans-serif;font-size:15px;line-height:1.6;color:#1a1a1a"><p>Hi,</p><p>You were added to a shared chat in <b>Pinart Flow</b>.</p><p>Sign in with this email (<b>${em}</b>) and open Communication to see the conversation and reply:</p><p><a href="${povezava}" style="display:inline-block;background:#2A2035;color:#fff;text-decoration:none;padding:10px 18px;border-radius:10px;font-weight:600">Open chat in Flow</a></p><p style="color:#666;font-size:13px">If the button doesn't work, open: ${povezava}</p></div>`
      : `<div style="font-family:system-ui,-apple-system,sans-serif;font-size:15px;line-height:1.6;color:#1a1a1a"><p>Živjo,</p><p>dodani ste v skupni klepet na <b>Pinart Flow</b>.</p><p>Prijavite se s tem e-naslovom (<b>${em}</b>) — z Googlom ali z geslom (gumb »Nov račun«) — in odprite Komunikacijo, da vidite pogovor in odgovorite:</p><p><a href="${povezava}" style="display:inline-block;background:#2A2035;color:#fff;text-decoration:none;padding:10px 18px;border-radius:10px;font-weight:600">Odpri klepet v Flow</a></p><p style="color:#666;font-size:13px">Če gumb ne dela, odprite: ${povezava}</p></div>`;
    const rez = await posljiMail({ to: [em], subject: zadeva, html });
    setVabiMail(''); setKlepetPicker(false);
    setPovabiToast(rez.ok ? `${em} ${L('dodan + vabilo poslano.', 'added + invite sent.')}` : `${em} ${L('dodan (vabilo ni šlo).', 'added (invite failed).')}`);
  };
  /* Odpre klepetni stolpec; če je podan mail, deli OZNAČEN del (ali cel mail) kot priponko. */
  const odpriKlepet = (mail?: PostaVnos | null) => {
    if (!selectedId) return;
    const izbrani = klepetIzbrani.length ? klepetIzbrani : (sodelavci[0] ? [sodelavci[0].id] : []);
    setKlepetIzbrani(izbrani);
    setKlepetOdprt(true);
    const izsek = (typeof window !== 'undefined' ? (window.getSelection()?.toString() || '') : '').trim();
    const del = mail ? (izsek || (mail.telo || mail.povzetek || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 240)) : '';
    void (async () => {
      const tid = await sinhronizirajKlepet(izbrani);
      if (mail && del) {
        const zad = mail.zadeva || L('(brez zadeve)', '(no subject)');
        if (tid) await posljiSporocilo(tid, del, zad);
        else setKlepetSporocila(dodajKlepet({ projectId: selectedId, nit: nitId(izbrani), avtor: 'jaz', besedilo: del, odMaila: zad, izsek: izsek || undefined }));
      }
    })();
  };
  const posljiKlepet = (e: React.FormEvent) => {
    e.preventDefault();
    const t = klepetVnos.trim();
    if (!t || !selectedId) return;
    setKlepetVnos('');
    if (klepetThreadId) void posljiSporocilo(klepetThreadId, t);
    else setKlepetSporocila(dodajKlepet({ projectId: selectedId, nit: nitId(klepetIzbrani), avtor: 'jaz', besedilo: t }));
  };
  const vNalogo = (mail: PostaVnos | null) => {
    if (!mail) return;
    setNalogaNaslov((mail.zadeva || '').trim() || L('Naloga iz e-pošte', 'Task from email'));
    const telo = (mail.telo || mail.povzetek || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    if (telo) {
      setNalogaOpis(telo);
    } else {
      /* star mail brez shranjenega telesa: opis vseeno napolni s kontekstom, da ni prazen */
      const kdaj = (() => { try { return new Date(mail.datum).toLocaleDateString(jeEn ? 'en-GB' : 'sl-SI'); } catch { return ''; } })();
      const smer = mail.smer === 'poslano' ? L('Poslano', 'Sent') : L('Prejeto', 'Received');
      const vrstice = [
        `${L('E-pošta', 'Email')}: ${mail.zadeva || ''}`.trim(),
        [smer, mail.prejemniki.join(', '), kdaj].filter(Boolean).join(' · '),
        '',
        L('(Besedilo tega maila ni bilo shranjeno — dopiši, kaj je treba narediti.)', '(This mail’s text was not saved — add what needs to be done.)'),
      ];
      setNalogaOpis(vrstice.join('\n'));
    }
    setNalogaOdprt(true);
  };
  /* shrani urejeno nalogo v Task manager, vezano na projekt */
  const shraniNovoNalogo = () => {
    if (!selected || !nalogaNaslov.trim()) return;
    const nova: Naloga = {
      id: crypto.randomUUID(),
      naslov: nalogaNaslov.trim(),
      opis: nalogaOpis.trim(),
      stolpec: 'todo',
      projectId: selected.real?.id || selected.offer.id,
      created: new Date().toISOString(),
      oznake: [L('pošta', 'email')],
    };
    try { shraniNaloge([nova, ...preberiNaloge()]); } catch { /* localStorage ni na voljo */ }
    setNalogaOdprt(false);
    router.push(`${base}/kalkulator/naloge`);
  };
  const odpriPisanje = () => {
    setPisiZa(strankaEmail(selected?.offer.client || ''));
    setPisiZadeva(selected ? `${selected.offer.title} — ` : '');
    setPisiStatus('');
    setPisiOdprt(true);
  };
  const oblikuj = (ukaz: string) => { document.execCommand(ukaz); pisiTeloRef.current?.focus(); };
  const vstaviPovezavo = () => { const url = window.prompt(L('Naslov povezave (https://…)', 'Link address (https://…)')); if (url) document.execCommand('createLink', false, url); };
  const posljiPisanje = async () => {
    if (samoOgled || !selected) return;
    const za = pisiZa.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(za)) { setPisiStatus(L('Vpiši veljaven e-naslov prejemnika.', 'Enter a valid recipient email.')); return; }
    if (!pisiZadeva.trim()) { setPisiStatus(L('Vpiši zadevo.', 'Enter a subject.')); return; }
    const telo = (pisiTeloRef.current?.innerHTML || '').trim();
    if (!telo) { setPisiStatus(L('Vpiši sporočilo.', 'Enter a message.')); return; }
    setPisiPosiljam(true); setPisiStatus(L('Pošiljam …', 'Sending …'));
    const html = `<div style="font-family:system-ui,-apple-system,'Segoe UI',sans-serif;font-size:15px;line-height:1.6;color:#1a1a1a">${telo}</div>`;
    /* reply-to = token@pinartflow.com — strežnik ga nastavi iz projectExternalId,
       da odgovori strank padejo NAZAJ v Flow (dohodna pošta), ne v osebni Gmail.
       Zapis v project_mail(out) z message_id naredi strežnik; tu le optimistični prikaz. */
    const rez = await posljiMail({ to: [za], subject: pisiZadeva.trim(), html, projectExternalId: selectedId });
    setPisiPosiljam(false);
    if (rez.ok) {
      const vnos = dodajPosto({ projectId: selectedId, smer: 'poslano', prejemniki: [za], zadeva: pisiZadeva.trim(), telo, povzetek: telo.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 160) });
      setPosta(p => [vnos, ...p]);
      /* pokaži '✓ Poslano' potrditev pred zaprtjem — enaka izkušnja kot v Komunikaciji */
      setPisiStatus(''); setPisiUspeh(true); setPovabiToast(L('Poslano ✓', 'Sent ✓'));
      window.setTimeout(() => {
        setPisiUspeh(false); setPisiOdprt(false); setPisiZadeva(''); if (pisiTeloRef.current) pisiTeloRef.current.innerHTML = '';
      }, 1400);
    } else {
      setPisiStatus(L('Napaka: ', 'Error: ') + (rez.napaka || L('pošiljanje ni uspelo.', 'sending failed.')));
    }
  };
  /* ob odprtju sestavljalnika prednapolni telo s podpisom (iz profila, localStorage).
     Vstavi se kot NAVADNO besedilo — email v podpisu NI klikabilen (ne ovijemo v
     mailto), da stranke raje kliknejo »Odgovori«. Kurzor postavimo na vrh. */
  useEffect(() => {
    if (!pisiOdprt) return;
    const el = pisiTeloRef.current;
    if (!el) return;
    /* Podpis: če je nastavljen strukturiran podpis (podpisPodatki), vstavi oblikovan
       HTML s klikabilnimi povezavami; sicer nadomestni star prosti podpis (escape-an). */
    let podpisEl = '';
    try {
      const s = JSON.parse(localStorage.getItem('pinart-kalkulator-v2') || '{}');
      const pd = s.podpisPodatki as PodpisPodatki | undefined;
      if (pd && !podpisPrazen(pd)) {
        podpisEl = podpisHtml(pd, pd.logo ? aktivniLogo() : '');
      } else {
        const plain = String(s.podpisMaila || '');
        if (plain.trim()) {
          const varno = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
          podpisEl = `<div style="color:#666">${varno(plain).replace(/\n/g, '<br>')}</div>`;
        }
      }
    } catch { /* brez podpisa */ }
    setImaPodpis(!!podpisEl);
    el.innerHTML = podpisEl ? `<div><br></div>${podpisEl}` : '';
    el.focus();
    try { const sel = window.getSelection(); const range = document.createRange(); range.setStart(el, 0); range.collapse(true); sel?.removeAllRanges(); sel?.addRange(range); } catch { /* fokus ni ključen */ }
  }, [pisiOdprt]);
  /* V predogledu (demo) pokažemo primere povezav, da se vidi poln videz razdelka;
     v pravem računu beremo dejansko shranjene povezave. */
  useEffect(() => {
    const demo: FlowProjectLink[] = [
      { oznaka: 'Figma · Dizajn', url: 'https://figma.com' },
      { oznaka: 'Word · Zapisnik sestanka', url: 'https://docs.google.com' },
      { oznaka: 'Slike · Mapa', url: 'https://drive.google.com' },
      { oznaka: 'Drive · Gradiva', url: 'https://drive.google.com' },
    ];
    setLinks(samoOgled ? demo : (selectedId ? loadProjectLinks(selectedId) : []));
    /* vzorčna pošta za predogled — deterministična, skladna z izbrano stranko,
       mešanica poslano/prejeto, da Komunikacija izgleda polna in resnična */
    const preDnevi = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString(); };
    const stranka = selected?.offer.client || 'Naročnik';
    const dom = (selected?.offer.client || 'narocnik').toLowerCase().replace(/[^a-z0-9]/g, '') || 'narocnik';
    const naslovProj = selected?.offer.title || 'Projekt';
    const demoPosta: PostaVnos[] = [
      { id: 'demo-posta-1', projectId: selectedId, smer: 'prejeto', prejemniki: [`info@${dom}.si`], zadeva: `Re: ${naslovProj} — potrditev obsega`, datum: preDnevi(1), telo: `Pozdravljeni,\n\nhvala za predlog. Obseg nam ustreza, lahko nadaljujete. Veselimo se sodelovanja.\n\nLep pozdrav,\n${stranka}` },
      { id: 'demo-posta-2', projectId: selectedId, smer: 'poslano', prejemniki: [`info@${dom}.si`], zadeva: `${naslovProj} — osnutek za pregled`, datum: preDnevi(3), telo: 'Pozdravljeni,\n\nv prilogi je prvi osnutek. Prosim za komentarje do konca tedna.\n\nLep pozdrav' },
      { id: 'demo-posta-3', projectId: selectedId, smer: 'poslano', prejemniki: [`ana@${dom}.si`, `racuni@${dom}.si`], zadeva: 'Pogodba o sodelovanju', datum: preDnevi(9), telo: 'Pozdravljeni,\n\nv prilogi pošiljam pogodbo v pregled in podpis.\n\nLep pozdrav' },
      { id: 'demo-posta-4', projectId: selectedId, smer: 'prejeto', prejemniki: [`ana@${dom}.si`], zadeva: 'Gradiva in dostopi', datum: preDnevi(11), telo: 'Pozdravljeni,\n\npošiljam dostope do mape z gradivi in obstoječimi datotekami.\n\nLep pozdrav' },
      { id: 'demo-posta-5', projectId: selectedId, smer: 'poslano', prejemniki: [`info@${dom}.si`], zadeva: 'Račun R-2026-014', datum: preDnevi(16), telo: 'Pozdravljeni,\n\nv prilogi je račun za opravljeno delo tega meseca.\n\nLep pozdrav' },
    ];
    setPosta(samoOgled ? demoPosta : (selectedId ? preberiPostoProjekta(selectedId) : []));
    /* oblak: potegni projektno pošto in združi z lokalno (dedup po logičnem
       ključu smer|zadeva|dan|prejemniki — ista poslana pošta obstaja v obeh
       shrambah z različnim id-jem; lokalni zapis prevlada). Brez prijave/tabele
       pullProjectMail tiho vrne [] → ostane lokalno. */
    if (!samoOgled && selectedId) {
      void pullProjectMail(selectedId).then(oblak => {
        if (!oblak.length) return;
        const lokalno = preberiPostoProjekta(selectedId);
        const kljuc = (v: PostaVnos) => `${v.smer}|${(v.zadeva || '').trim()}|${(v.datum || '').slice(0, 10)}|${[...v.prejemniki].sort().join(',')}`;
        const zdruzeno = new Map<string, PostaVnos>();
        oblak.forEach(m => {
          const v: PostaVnos = {
            id: m.id || crypto.randomUUID(),
            projectId: m.projectExternalId,
            clientId: m.clientId,
            smer: m.direction === 'in' ? 'prejeto' : 'poslano',
            prejemniki: m.toEmails,
            zadeva: m.subject || '',
            povzetek: m.summary,
            datum: m.occurredAt || new Date().toISOString(),
            telo: m.direction === 'in' ? (m.bodyText || m.bodyHtml) : (m.bodyHtml || m.bodyText),
            osnutek: m.isDraft,
            izbrisano: m.deletedAt,
          };
          zdruzeno.set(kljuc(v), v);
        });
        lokalno.forEach(v => zdruzeno.set(kljuc(v), v));
        setPosta([...zdruzeno.values()].sort((a, b) => b.datum.localeCompare(a.datum)));
      }).catch(() => undefined);
    }
    setLinkOznaka(''); setLinkUrl(''); setDodajOdprt(false); closeVsi(); setVrsticaDetajl(null);
  }, [selectedId, samoOgled]);

  /* na kartici pokažemo najnovejših NAJNOVEJSIH vrstic; ostalo je dostopno prek "Prikaži vse" */
  const NAJNOVEJSIH = 5;
  const statusTon = (s: string): 'success' | 'waiting' | 'danger' | 'neutral' => {
    const t = (s || '').toLowerCase();
    if (/(podpis|aktiv|plačan|placan|sprejet|zaključ|zakljuc)/.test(t)) return 'success';
    if (/(zavrn|preklic)/.test(t)) return 'danger';
    if (/(posla|prejet|pregled|odprt|čaka|caka|osnut)/.test(t)) return 'waiting';
    return 'neutral';
  };
  /* izris ene vrstice — ISTI slog na kartici (top 5) in v slideu (ves seznam) */
  const pogodbaVrstica = (item: FlowContract) => <span key={item.id} className="pw-vrstica-klik" {...klik('pogodbe', item)}><b>{item.title}</b><i className="pw-status" data-tone={statusTon(item.status)}><i aria-hidden style={pikaStil(statusTon(item.status))} />{item.status}</i></span>;
  const racunKaj = (item: FlowInvoice) => item.title || item.items?.[0]?.opis || selected?.offer.title || '';
  const racunVrstica = (item: FlowInvoice) => { const kaj = racunKaj(item); return <span key={item.id} className="pw-racun-v pw-vrstica-klik" {...klik('racuni', item)}><span className="pw-racun-l"><b>{L('Račun', 'Invoice')} {item.number || ''}</b>{kaj && <small>{kaj}</small>}</span><span className="pw-racun-d"><i className="pw-status" data-tone={item.paid ? 'success' : 'waiting'}><i aria-hidden style={pikaStil(item.paid ? 'success' : 'waiting')} />{item.paid ? L('Plačan', 'Paid') : L('Odprt', 'Open')}</i><strong>{money(item.amount)}</strong></span></span>; };
  const strosekVrstica = (item: FlowExpense) => <span key={item.id} className="pw-racun-v pw-vrstica-klik" {...klik('stroski', item)}><span className="pw-racun-l"><b>{item.title}</b><small>{item.category || L('Projektni strošek', 'Project expense')}</small></span><span className="pw-racun-d"><strong>{money(item.amount)}</strong></span></span>;
  /* iskalno besedilo za slide (naziv/številka/opis/kategorija) — malo, da . includes() dela brez razlik velikih/malih črk */
  const pogodbaTekst = (item: FlowContract) => `${item.title} ${item.status}`.toLocaleLowerCase('sl-SI');
  const racunTekst = (item: FlowInvoice) => `${item.number || ''} ${racunKaj(item)} ${item.paid ? 'plačan' : 'odprt'}`.toLocaleLowerCase('sl-SI');
  const strosekTekst = (item: FlowExpense) => `${item.title} ${item.category || ''}`.toLocaleLowerCase('sl-SI');
  /* podatki za odprti SLIDE: naslov + filtriran+paginiran seznam trenutno izbranega tipa */
  const NA_STRAN = 12;
  const vsiEyebrow = vsiOdprt === 'pogodbe' ? L('VSE POGODBE', 'ALL CONTRACTS') : vsiOdprt === 'racuni' ? L('VSI RAČUNI', 'ALL INVOICES') : L('VSI STROŠKI', 'ALL EXPENSES');
  const vsiNaslov = vsiOdprt === 'pogodbe' ? L('Vse pogodbe', 'All contracts') : vsiOdprt === 'racuni' ? L('Vsi računi', 'All invoices') : L('Vsi stroški', 'All expenses');
  const vsiVse: { id: string; tekst: string; el: JSX.Element }[] =
    vsiOdprt === 'pogodbe' ? pogodbeSort.map(item => ({ id: item.id, tekst: pogodbaTekst(item), el: pogodbaVrstica(item) })) :
    vsiOdprt === 'racuni' ? racuniSort.map(item => ({ id: item.id, tekst: racunTekst(item), el: racunVrstica(item) })) :
    vsiOdprt === 'stroski' ? strosekSort.map(item => ({ id: item.id, tekst: strosekTekst(item), el: strosekVrstica(item) })) : [];
  const vsiIskanjeNorm = vsiIskanje.trim().toLocaleLowerCase('sl-SI');
  const vsiFiltrirano = vsiIskanjeNorm ? vsiVse.filter(v => v.tekst.includes(vsiIskanjeNorm)) : vsiVse;
  const vsiStrani = Math.max(1, Math.ceil(vsiFiltrirano.length / NA_STRAN));
  const vsiStranAktivna = Math.min(vsiStran, vsiStrani);
  const vsiStranVrstice = vsiFiltrirano.slice((vsiStranAktivna - 1) * NA_STRAN, vsiStranAktivna * NA_STRAN).map(v => v.el);
  /* kar se dejansko izriše — "drsenje" pokaže ves (filtriran) seznam brez kontrol strani */
  const vsiPrikaz = vsiNacin === 'drsenje' ? vsiFiltrirano.map(v => v.el) : vsiStranVrstice;
  const addLink = () => {
    if (samoOgled || !selectedId) return;
    const oznaka = linkOznaka.trim(); const url = linkUrl.trim();
    if (!oznaka || !url) return;
    const next = [...links, { oznaka, url }];
    setLinks(next); saveProjectLinks(selectedId, next);
    setLinkOznaka(''); setLinkUrl('');
  };
  const removeLink = (index: number) => {
    if (samoOgled || !selectedId) return;
    const next = links.filter((_, i) => i !== index);
    setLinks(next); saveProjectLinks(selectedId, next);
    if (dokUredi === index) { setDokUredi(null); setLinkOznaka(''); setLinkUrl(''); }
  };
  /* shrani povezavo: če je dokUredi nastavljen, POSODOBI, sicer DODAJ novo */
  const shraniLink = () => {
    if (samoOgled || !selectedId) return;
    const oznaka = linkOznaka.trim(); const url = linkUrl.trim();
    if (!oznaka || !url) return;
    const next = dokUredi !== null ? links.map((l, i) => (i === dokUredi ? { oznaka, url } : l)) : [...links, { oznaka, url }];
    setLinks(next); saveProjectLinks(selectedId, next);
    setLinkOznaka(''); setLinkUrl(''); setDokUredi(null);
  };
  const zacniUrejanjeLink = (index: number) => { setDokUredi(index); setLinkOznaka(links[index].oznaka); setLinkUrl(links[index].url); };

  /* poštni odjemalec — izlušč iz tabelnega, da ga uporabim tudi v komunikacijskem panelu (Delovni pogled) */
  const komVsebina = () => (
    <article className="pw-karta pw-posta">
            <div className="pw-posta-glava">
              <div><p className={styles.eyebrow}>{L('06 · KOMUNIKACIJE', '06 · COMMUNICATIONS')}</p><h3>{L('Vse na enem mestu', 'All in one place')}</h3></div>
              {posta.length > 0 && (
                <div className="pw-posta-search" style={{ position: 'relative', flex: '1 1 240px', minWidth: 0 }}>
                  <MagnifyingGlass size={16} weight="bold" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'color-mix(in oklch, var(--ink) 72%, transparent)', pointerEvents: 'none' }} />
                  <input value={postaIsk} onChange={e => setPostaIsk(e.target.value)} placeholder={L('Išči po pošti …', 'Search mail …')} style={{ width: '100%', boxSizing: 'border-box', height: '2.6rem', padding: '0 1rem 0 2.6rem', border: '1px solid color-mix(in oklch, var(--ink) 9%, transparent)', borderRadius: '999px', background: '#fff', font: '500 .85rem var(--font-sans), sans-serif', color: 'var(--ink)' }} />
                </div>
              )}
              {(() => { const osebe = Array.from(new Set(posta.flatMap(v => v.prejemniki).filter(Boolean))); return osebe.length > 1 ? (
                <select value={postaOseba} onChange={e => setPostaOseba(e.target.value)} aria-label={L('Filter po prejemniku', 'Filter by recipient')} title={L('Filter po prejemniku', 'Filter by recipient')} className="pw-posta-filter" data-aktiven={postaOseba ? 'true' : 'false'}>
                  <option value="">{L('Vsi prejemniki', 'All recipients')}</option>
                  {osebe.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : null; })()}
              <button type="button" className="pw-posta-nova" disabled={samoOgled} title={samoOgled ? L('Na voljo v načinu »Moji podatki« — zdaj gledaš predogled', 'Available in “My data” mode — you are viewing a preview') : L('Napiši sporočilo stranki', 'Write a message to the client')} onClick={odpriPisanje}>{L('✎ Nova pošta', '✎ New mail')}</button>
            </div>
            {pisiOdprt && !samoOgled && (
              <div className="pw-pisi">
                <div className="pw-pisi-glava"><span className="pw-pisi-naslov">{L('Novo sporočilo', 'New message')}</span><button type="button" className="pw-pisi-x" onClick={() => setPisiOdprt(false)} aria-label={L('Zapri pisanje', 'Close compose')} title={L('Zapri', 'Close')}>✕</button></div>
                <label className="pw-pisi-v"><span>{L('Za', 'To')}</span><input type="email" value={pisiZa} onChange={e => setPisiZa(e.target.value)} placeholder={L('stranka@email.si', 'client@email.com')} /></label>
                <label className="pw-pisi-v"><span>{L('Zadeva', 'Subject')}</span><input type="text" value={pisiZadeva} onChange={e => setPisiZadeva(e.target.value)} placeholder={L('Zadeva sporočila', 'Message subject')} /></label>
                <div className="pw-pisi-orodja">
                  <button type="button" onMouseDown={e => { e.preventDefault(); oblikuj('bold'); }} title={L('Krepko', 'Bold')} aria-label={L('Krepko', 'Bold')}><TextB size={15} weight="bold" /></button>
                  <button type="button" onMouseDown={e => { e.preventDefault(); oblikuj('italic'); }} title={L('Ležeče', 'Italic')} aria-label={L('Ležeče', 'Italic')}><TextItalic size={15} weight="bold" /></button>
                  <button type="button" onMouseDown={e => { e.preventDefault(); oblikuj('insertUnorderedList'); }} title={L('Označen seznam', 'Bulleted list')} aria-label={L('Označen seznam', 'Bulleted list')}><ListBullets size={15} weight="bold" /></button>
                  <button type="button" onMouseDown={e => { e.preventDefault(); vstaviPovezavo(); }} title={L('Povezava', 'Link')} aria-label={L('Povezava', 'Link')}><LinkSimple size={15} weight="bold" /></button>
                </div>
                <div className="pw-pisi-telo" ref={pisiTeloRef} contentEditable suppressContentEditableWarning role="textbox" aria-label={L('Besedilo sporočila', 'Message body')} data-placeholder={L('Napiši sporočilo …', 'Write a message …')} />
                {!imaPodpis && <p className="pw-pisi-podpis-opomnik"><Link href={`${base}/kalkulator/nastavitve`}>{L('Nimaš podpisa — nastavi ga v nastavitvah', 'No signature yet — set it up in settings')} <svg className="puscica-svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M7 17L17 7M8 7h9v9" /></svg></Link></p>}
                {pisiStatus && <p className="pw-pisi-status">{pisiStatus}</p>}{pisiUspeh && <p className="pw-pisi-uspeh">✓ {L('Poslano', 'Sent')}</p>}
                <div className="pw-pisi-akcije">
                  <button type="button" className="pw-pisi-preklic" onClick={() => setPisiOdprt(false)}>{L('Prekliči', 'Cancel')}</button>
                  <button type="button" className="pw-pisi-preklic" onClick={() => {
                    const za = pisiZa.trim(); const zadeva = pisiZadeva.trim(); const telo = pisiTeloRef.current?.innerHTML || '';
                    if (!selectedId || (!za && !zadeva && !telo.replace(/<[^>]+>/g, '').trim())) { setPisiOdprt(false); return; }
                    const id = crypto.randomUUID(); const now = new Date().toISOString();
                    setPosta(p => [{ id, projectId: selectedId, smer: 'poslano', prejemniki: za ? [za] : [], zadeva, datum: now, telo, osnutek: true } as PostaVnos, ...p]);
                    void saveDraft({ id, projectExternalId: selectedId, direction: 'out', toEmails: za ? [za] : [], subject: zadeva, bodyHtml: telo, isDraft: true, occurredAt: now }).catch(() => undefined);
                    setPisiOdprt(false); setMapa('osnutki'); setBeriMail(null);
                  }}>{L('Shrani osnutek', 'Save draft')}</button>
                  <button type="button" className="pw-pisi-poslji" disabled={pisiPosiljam || pisiUspeh} onClick={posljiPisanje}>{pisiPosiljam ? <>{L('Pošiljam …', 'Sending …')} <PaperPlaneRight size={15} weight="fill" className="pw-send-leti" /></> : pisiUspeh ? <><Check size={16} weight="bold" className="pw-send-ok" /> {L('Poslano', 'Sent')}</> : <>{L('Pošlji', 'Send')} <PaperPlaneRight size={15} weight="fill" className="pw-send-ik" /></>}</button>
                </div>
              </div>
            )}
            <div className="pw-posta-body" style={{ position: 'relative', zIndex: 1, display: 'flex', gap: '1rem', alignItems: 'flex-start', margin: '.75rem 0 0' }}>
              <button type="button" className="pw-mape-trig" onClick={() => setMapeOdprt(true)} aria-expanded={mapeOdprt} aria-label={L('Mape', 'Folders')}><List size={16} weight="bold" /> <span>{mapa === 'prejeto' ? L('Prejeto', 'Inbox') : mapa === 'poslano' ? L('Poslano', 'Sent') : mapa === 'osnutki' ? L('Osnutki', 'Drafts') : L('Koš', 'Trash')}</span></button>
              {mapeOdprt && <div className="pw-mape-back" onClick={() => setMapeOdprt(false)} aria-hidden />}
              <div className={'pw-posta-mape' + (mapeOdprt ? ' odprt' : '')} style={{ flex: 'none', width: 138, display: 'flex', flexDirection: 'column', gap: '.25rem' }}>
              {([{ id: 'prejeto', ime: L('Prejeto', 'Inbox'), Ikona: Tray }, { id: 'poslano', ime: L('Poslano', 'Sent'), Ikona: PaperPlaneTilt }, { id: 'osnutki', ime: L('Osnutki', 'Drafts'), Ikona: NotePencil }, { id: 'kos', ime: L('Koš', 'Trash'), Ikona: Trash }] as const).map(({ id, ime, Ikona }) => {
                const st = posta.filter(v => (v.izbrisano ? 'kos' : v.osnutek ? 'osnutki' : v.smer === 'poslano' ? 'poslano' : 'prejeto') === id).length;
                const on = mapa === id;
                return <button key={id} type="button" onClick={() => { setMapa(id); setBeriMail(null); setMapeOdprt(false); }} style={{ display: 'flex', alignItems: 'center', gap: '.5rem', width: '100%', textAlign: 'left', border: 'none', background: on ? 'color-mix(in oklch, var(--ink) 9%, transparent)' : 'transparent', color: 'var(--ink)', borderRadius: '.6rem', padding: '.5rem .7rem', font: `${on ? 700 : 500} .78rem var(--font-sans), sans-serif`, cursor: 'pointer' }}><Ikona size={16} weight={on ? 'fill' : 'regular'} /><span style={{ flex: 1 }}>{ime}</span>{st ? <span style={{ fontWeight: 700, color: 'color-mix(in oklch, var(--ink) 72%, transparent)' }}>{st}</span> : null}</button>;
              })}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
            {beriMail ? (<>
              <div className="pw-mail-orodja">
                <button type="button" className="pw-mail-nazaj" title={L('Nazaj na seznam', 'Back to list')} onClick={() => setBeriMail(null)}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M19 12H5M11 18l-6-6 6-6" /></svg> {L('Nazaj', 'Back')}</button>
                <span className="pw-mail-meni-w">
                  <button type="button" className={premakniOdprt ? 'pw-toggle-on' : ''} aria-expanded={premakniOdprt} title={L('Premakni na drug projekt', 'Move to another project')} aria-label={L('Premakni', 'Move to')} onClick={() => { setPremakniOdprt(o => !o); setOznakaOdprt(false); }}><FolderSimplePlus size={16} /></button>
                  {premakniOdprt && beriMail && (
                    <div className="pw-mail-meni">
                      <p className="pw-mail-meni-h">{L('Premakni na projekt', 'Move to project')}</p>
                      {projects.filter(p => p.offer.id !== selectedId).slice(0, 8).map(p => (
                        <button key={p.offer.id} type="button" onClick={() => { const id = beriMail.id; premakniPosto(id, p.offer.id); setPosta(prev => prev.filter(v => v.id !== id)); setBeriMail(null); setPremakniOdprt(false); }}>{p.offer.title} · {p.offer.client}</button>
                      ))}
                      {projects.filter(p => p.offer.id !== selectedId).length === 0 && <p className="pw-mail-meni-prazno">{L('Ni drugih projektov.', 'No other projects.')}</p>}
                    </div>
                  )}
                </span>
                <span className="pw-mail-meni-w">
                  <button type="button" className={oznakaOdprt ? 'pw-toggle-on' : ''} aria-expanded={oznakaOdprt} title={L('Dodaj oznako', 'Add label')} aria-label={L('Oznaka', 'Label')} onClick={() => { setOznakaOdprt(o => !o); setPremakniOdprt(false); }}><Tag size={16} /></button>
                  {oznakaOdprt && beriMail && (
                    <div className="pw-mail-meni">
                      <p className="pw-mail-meni-h">{L('Oznake', 'Labels')}</p>
                      {(beriMail.oznake || []).length > 0 && <div className="pw-mail-oznake">{(beriMail.oznake || []).map((oz, i) => <span key={`${oz}-${i}`} className="pw-mail-oznaka">{oz}<button type="button" className="pw-mail-oznaka-x" aria-label={`${L('Odstrani', 'Remove')} ${oz}`} onClick={() => { const nove = (beriMail.oznake || []).filter((_, j) => j !== i); nastaviOznakePoste(beriMail.id, nove); const id = beriMail.id; setPosta(prev => prev.map(v => v.id === id ? { ...v, oznake: nove } : v)); setBeriMail(m => m ? { ...m, oznake: nove } : m); }}>×</button></span>)}</div>}
                      <form className="pw-mail-oznaka-obr" onSubmit={e => { e.preventDefault(); const t = oznakaVnos.trim(); if (!t) return; const nove = [...(beriMail.oznake || []), t]; nastaviOznakePoste(beriMail.id, nove); const id = beriMail.id; setPosta(prev => prev.map(v => v.id === id ? { ...v, oznake: nove } : v)); setBeriMail(m => m ? { ...m, oznake: nove } : m); setOznakaVnos(''); }}>
                        <input value={oznakaVnos} onChange={e => setOznakaVnos(e.target.value)} placeholder={L('Nova oznaka …', 'New label …')} aria-label={L('Nova oznaka', 'New label')} />
                        <button type="submit">{L('Dodaj', 'Add')}</button>
                      </form>
                    </div>
                  )}
                </span>
                <button type="button" title={L('Ustvari nalogo iz tega maila', 'Create a task from this mail')} aria-label={L('V nalogo', 'Add to task')} onClick={() => vNalogo(beriMail)}><CheckSquare size={16} /></button>
                <button type="button" title={L('Pupa: povzemi in predlagaj odgovor', 'Pupa: summarize and draft a reply')} aria-label="Pupa" onClick={() => pozeniAi(beriMail)}><Sparkle size={16} /></button>
                <button type="button" title={L('Natisni', 'Print')} aria-label={L('Natisni', 'Print')} onClick={() => { if (typeof window !== 'undefined') window.print(); }}><Printer size={16} /></button>
                <button type="button" className="pw-mail-star" data-on={beriMail.zvezda ? 'true' : 'false'} title={beriMail.zvezda ? L('Odstrani zvezdico', 'Unstar') : L('Označi z zvezdico', 'Star')} aria-label={L('Zvezdica', 'Star')} onClick={() => { const id = beriMail.id; setPosta(p => p.map(v => v.id === id ? { ...v, zvezda: !v.zvezda } : v)); setBeriMail(m => m ? { ...m, zvezda: !m.zvezda } : m); }}><Star size={16} weight={beriMail.zvezda ? 'fill' : 'regular'} /></button>
                {!samoOgled && (beriMail.izbrisano ? <>
                  <button type="button" title={L('Obnovi', 'Restore')} aria-label={L('Obnovi', 'Restore')} onClick={() => { const id = beriMail.id; void restoreProjectMail(id).catch(() => undefined); setPosta(p => p.map(v => v.id === id ? { ...v, izbrisano: undefined } : v)); setBeriMail(null); }}><ArrowBendUpLeft size={16} /></button>
                  <button type="button" title={L('Zbriši dokončno', 'Delete permanently')} aria-label={L('Zbriši dokončno', 'Delete permanently')} className="pw-mail-brisi" onClick={() => { const id = beriMail.id; void deleteProjectMailPermanent(id).catch(() => undefined); setPosta(p => p.filter(v => v.id !== id)); setBeriMail(null); }}><Trash size={16} weight="bold" /></button>
                </> : <button type="button" className="pw-mail-brisi" title={L('V koš', 'To trash')} aria-label={L('V koš', 'To trash')} onClick={() => { const id = beriMail.id; void trashProjectMail(id).catch(() => undefined); setPosta(p => p.map(v => v.id === id ? { ...v, izbrisano: new Date().toISOString() } : v)); setBeriMail(null); }}><Trash size={16} weight="bold" /></button>)}
              </div>
              <div style={{ position: 'relative', zIndex: 1, margin: '.4rem 0 0', padding: '.9rem 1rem', border: '1px solid color-mix(in oklch, var(--ink) 5%, transparent)', borderRadius: '.85rem', background: '#fff' }}>
                <b style={{ display: 'block', fontSize: '.92rem' }}>{beriMail.zadeva || L('(brez zadeve)', '(no subject)')}</b>
                <small style={{ display: 'block', color: 'var(--muted)', margin: '.15rem 0 .6rem' }}>{beriMail.prejemniki.join(', ')} · {datStr(beriMail.datum)}{casStr(beriMail.datum) ? ` ob ${casStr(beriMail.datum)}` : ''} · {beriMail.smer === 'poslano' ? L('Poslano', 'Sent') : L('Prejeto', 'Received')}</small>
                {beriMail.telo
                  ? (beriMail.smer === 'prejeto'
                      ? <div style={{ whiteSpace: 'pre-wrap', fontSize: '.85rem', lineHeight: 1.55 }}>{beriTeloMaila(beriMail.telo) || L('(brez besedila)', '(no text)')}</div>
                      : <div style={{ fontSize: '.85rem', lineHeight: 1.55 }} dangerouslySetInnerHTML={{ __html: beriMail.telo }} />)
                  : <p style={{ color: 'var(--muted)', fontSize: '.82rem' }}>{L('To sporočilo nima shranjenega besedila (starejši/lokalni zapis).', 'This message has no stored text (older/local record).')}</p>}
              </div>
              <div className="pw-mail-akcije">
                <button type="button" onClick={() => { const m = beriMail; odpriPisanje(); setPisiZa(m?.prejemniki[0] || ''); setPisiZadeva(`Re: ${(m?.zadeva || '').replace(/^Re:\s*/i, '')}`); setBeriMail(null); }}><ArrowBendUpLeft size={15} weight="bold" /> {L('Odgovori', 'Reply')}</button>
                <button type="button" onClick={() => { const m = beriMail; odpriPisanje(); setPisiZa(''); setPisiZadeva(`Fwd: ${(m?.zadeva || '').replace(/^Fwd:\s*/i, '')}`); setBeriMail(null); }}><ArrowBendUpRight size={15} weight="bold" /> {L('Posreduj', 'Forward')}</button>
                <button type="button" title={L('Deli to sporočilo v klepet s sodelavcem', 'Share this message into a chat with a collaborator')} onClick={() => odpriKlepet(beriMail)}><ChatCircle size={15} weight="bold" /> {L('Deli v klepet', 'Share in chat')}</button>
              </div>
            </>) : (() => {
              const q = postaIsk.trim().toLowerCase();
              const seznam = posta.filter(v => (v.izbrisano ? 'kos' : v.osnutek ? 'osnutki' : v.smer === 'poslano' ? 'poslano' : 'prejeto') === mapa).filter(v => !q || `${v.zadeva} ${v.prejemniki.join(' ')} ${(v.oznake || []).join(' ')}`.toLowerCase().includes(q)).filter(v => !postaOseba || v.prejemniki.includes(postaOseba));
              const izbraniVMapi = seznam.filter(v => izbraniMaili.has(v.id));
              const NA_STRAN = 12;
              const strani = Math.max(1, Math.ceil(seznam.length / NA_STRAN));
              const stran = Math.min(Math.max(1, postaStran), strani);
              const prikaz = seznam.slice((stran - 1) * NA_STRAN, stran * NA_STRAN);
              return seznam.length ? (<>
                {seznam.length > 0 && (
                  <div className="pw-posta-top">
                    <label className="pw-vsi-check">
                      <input type="checkbox" checked={izbraniVMapi.length === seznam.length} ref={el => { if (el) el.indeterminate = izbraniVMapi.length > 0 && izbraniVMapi.length < seznam.length; }} onChange={e => setIzbraniMaili(e.target.checked ? new Set(seznam.map(v => v.id)) : new Set())} aria-label={L('Označi vse', 'Select all')} />
                      <span>{izbraniVMapi.length > 0 ? `${izbraniVMapi.length} ${L('izbranih', 'selected')}` : L('Označi vse', 'Select all')}</span>
                    </label>
                    <div className="pw-posta-top-akc">
                      {mapa === 'kos' && <button type="button" className="pw-akc-obnovi" disabled={izbraniVMapi.length === 0} onClick={() => { const ids = new Set(izbraniVMapi.map(v => v.id)); ids.forEach(id => void restoreProjectMail(id).catch(() => undefined)); setPosta(p => p.map(v => ids.has(v.id) ? { ...v, izbrisano: undefined } : v)); setIzbraniMaili(new Set()); }}><ArrowBendUpLeft size={14} weight="bold" /> {L('Obnovi', 'Restore')}</button>}
                      <button type="button" className="pw-akc-brisi" disabled={izbraniVMapi.length === 0} onClick={() => {
                        const vKos = mapa === 'kos';
                        if (vKos && !window.confirm(L('Dokončno izbrišem izbrano? Tega ni mogoče razveljaviti.', 'Permanently delete the selected items? This cannot be undone.'))) return;
                        const ids = new Set(izbraniVMapi.map(v => v.id));
                        ids.forEach(id => { if (vKos) void deleteProjectMailPermanent(id).catch(() => undefined); else void trashProjectMail(id).catch(() => undefined); });
                        setPosta(p => vKos ? p.filter(v => !ids.has(v.id)) : p.map(v => ids.has(v.id) ? { ...v, izbrisano: new Date().toISOString() } : v));
                        setIzbraniMaili(new Set());
                        setBeriMail(bm => (bm && ids.has(bm.id) ? null : bm));
                      }}><Trash size={14} weight="bold" /> {mapa === 'kos' ? L('Zbriši dokončno', 'Delete permanently') : L('Izbriši', 'Delete')}</button>
                    </div>
                  </div>
                )}
                <ul className="pw-posta-seznam">
                  {prikaz.map(vnos => (
                    <li key={vnos.id} className={'pw-posta-vrstica' + (izbraniMaili.has(vnos.id) ? ' pw-posta-izbran' : '') + (vnos.zvezda ? ' pw-posta-zvezda' : '')} onClick={() => setBeriMail(vnos)}>
                      <input type="checkbox" className="pw-posta-check" checked={izbraniMaili.has(vnos.id)} onClick={e => e.stopPropagation()} onChange={e => { const ch = e.target.checked; setIzbraniMaili(prev => { const n = new Set(prev); if (ch) n.add(vnos.id); else n.delete(vnos.id); return n; }); }} aria-label={L('Izberi sporočilo', 'Select message')} />
                      <div className="pw-posta-vsebina">
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '.6rem', alignItems: 'baseline' }}>
                          <b style={{ fontSize: '.82rem', fontWeight: 700, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{vnos.prejemniki.join(', ') || '—'}</b>
                          <small style={{ flex: 'none', color: 'var(--muted)', fontSize: '.66rem' }}>{datStr(vnos.datum)}{casStr(vnos.datum) ? ` · ${casStr(vnos.datum)}` : ''}</small>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '.5rem', alignItems: 'baseline' }}>
                          <span style={{ fontSize: '.8rem', color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{vnos.zadeva || L('(brez zadeve)', '(no subject)')}</span>
                          <span style={{ flex: 'none', fontSize: '.5rem', fontWeight: 800, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--muted)' }}>{vnos.izbrisano ? L('Koš', 'Trash') : vnos.osnutek ? L('Osnutek', 'Draft') : vnos.smer === 'poslano' ? L('Poslano', 'Sent') : L('Prejeto', 'Received')}</span>
                        </div>
                        {(vnos.oznake || []).length > 0 && <div className="pw-posta-oznake">{(vnos.oznake || []).map((oz, i) => <span key={`${oz}-${i}`} className="pw-posta-oz">{oz}</span>)}</div>}
                      </div>
                      {vnos.zvezda && <Star size={16} weight="fill" className="pw-posta-zv-ikona" aria-hidden />}
                    </li>
                  ))}
                </ul>
                {strani > 1 && (
                  <nav className="pw-posta-strani" aria-label={L('Strani pošte', 'Mail pages')}>
                    <button type="button" onClick={() => setPostaStran(s => Math.max(1, s - 1))} disabled={stran <= 1} aria-label={L('Prejšnja stran', 'Previous page')}>‹</button>
                    {Array.from({ length: strani }, (_, i) => i + 1).map(n => (
                      <button key={n} type="button" onClick={() => setPostaStran(n)} aria-current={n === stran ? 'page' : undefined}>{n}</button>
                    ))}
                    <button type="button" onClick={() => setPostaStran(s => Math.min(strani, s + 1))} disabled={stran >= strani} aria-label={L('Naslednja stran', 'Next page')}>›</button>
                  </nav>
                )}
              </>) : (
                <p className="pw-posta-prazno">{mapa === 'prejeto' ? L('Še ni prejete pošte — prižge se, ko aktiviramo dohodno pošto.', 'No received mail yet — it turns on once we enable inbound mail.') : mapa === 'osnutki' ? L('Ni osnutkov.', 'No drafts.') : mapa === 'kos' ? L('Koš je prazen.', 'Trash is empty.') : L('Še ni poslane pošte. Klikni Nova pošta in piši stranki.', 'No sent mail yet. Click New mail and write to the client.')}</p>
              );
            })()}
              </div>
            </div>
          </article>
  );
  return <div className={styles.projectsPage}><style dangerouslySetInnerHTML={{ __html: overflowFix + pwStyles }} />
    {portalPripravljen && !selected && izbrani.size > 0 && createPortal(
      <div className="pw-izbor-letev" role="region" aria-label={L('Izbrani projekti', 'Selected projects')}>
        <span className="pw-izbor-st">{izbrani.size} {L('izbranih', 'selected')}</span>
        {onPaket && <button type="button" className="pw-izbor-gumb" disabled={izvazamPaket} onClick={naPaket}><SwapText text={izvazamPaket ? L('Pripravljam…', 'Preparing…') : 'Package (ZIP)'} /></button>}
        <button type="button" className={'pw-izbor-gumb' + (onPaket ? ' pw-izbor-gumb2' : '')} disabled={izvazamPaket} onClick={izvoziIzbrane}>CSV</button>
        <button type="button" className="pw-izbor-prekl" disabled={izvazamPaket} onClick={() => setIzbrani(new Set())}>{L('Prekliči', 'Cancel')}</button>
      </div>,
      document.body,
    )}
    {!selected && !zunanjiFilter && <ArhivFilter
      iskanje={search}
      onIskanje={setSearch}
      placeholder={L('Poišči projekt, stranko …', 'Search project, client …')}
      datumOd={datumOd}
      datumDo={datumDo}
      onDatumOd={setDatumOd}
      onDatumDo={setDatumDo}
      statusOznaka={L('Stanje projekta', 'Project status')}
      statusVrednost={filter}
      onStatus={v => setFilter(v as ProjektStatus)}
      statusOpcije={[{ vrednost: 'vse', oznaka: L('Vsi', 'All') }, { vrednost: 'aktivni', oznaka: L('Aktivni', 'Active') }, { vrednost: 'cakajo', oznaka: L('Čakajo', 'Pending') }, { vrednost: 'zakljuceni', oznaka: L('Zaključeni', 'Completed') }]}
      aktivnihFiltrov={(filter !== 'vse' ? 1 : 0) + (datumOd || datumDo ? 1 : 0)}
      onPocisti={() => { setFilter('vse'); setDatumOd(''); setDatumDo(''); }}
      akcija={<Link className="af-akcija-gumb" href={`${base}/kalkulator/nov-projekt`}>{L('+ Nov projekt', '+ New project')}</Link>}
    />}

    {/* preklop Seznam|Pipeline — v produkciji izrise ta pilulo ArhivWorkspace (arh-pogled-preklop);
        tu samo za samostojno rabo (zunanjiFilter=false), da API pogled/onPogled dela tudi brez Arhiva */}
    {!selected && !zunanjiFilter && (
      <div className="pw-pogled-preklop" role="tablist" aria-label={L('Pogled projektov', 'Projects view')}>
        <button type="button" role="tab" aria-selected={pogled === 'seznam'} className={pogled === 'seznam' ? 'on' : ''} onClick={() => setPogled('seznam')}>{L('Seznam', 'List')}</button>
        <button type="button" role="tab" aria-selected={pogled === 'pipeline'} className={pogled === 'pipeline' ? 'on' : ''} onClick={() => setPogled('pipeline')}>Pipeline</button>
      </div>
    )}

    {!selected ? (
      projects.length === 0 ? (
        <div className={styles.projectStoryEmpty}><span><svg className="puscica-svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M7 17L17 7M8 7h9v9" /></svg></span><strong>{L('Najprej ustvari ponudbo.', 'Create an offer first.')}</strong><p>{L('Ta bo postala osnova projekta in povezala vse nadaljnje dokumente.', 'It becomes the basis of the project and links all further documents.')}</p></div>
      ) : (
        <div className="pw-seznam">
          {pogled === 'pipeline' ? (
            <>
              {samoOgled && <p className="pw-pipeline-namig">{L('Premikanje kartic med fazami je v predogledu (demo) onemogočeno — prijavi se v svoj račun.', 'Moving cards between stages is disabled in the demo preview — sign in to your account.')}</p>}
              <div className="pw-pipeline">
                {[...PIPELINE_STOLPCI, PIPELINE_IZGUBLJENO].map(({ faza, naziv }) => {
                  const kartice = pipelineStolpci[faza];
                  const vrednost = kartice.reduce((sum, project) => sum + project.agreed, 0);
                  return (
                    <div key={faza} className={'pw-pipeline-stolpec' + (faza === 'izgubljeno' ? ' pw-pipeline-izgubljeno' : '')}>
                      <div className="pw-pipeline-glava">
                        <strong>{naziv}</strong>
                        <span className="pw-pipeline-info">{kartice.length} · {money(vrednost)}</span>
                      </div>
                      <div
                        className={'pw-pipeline-karte' + (pipelineNad === faza ? ' pw-pipeline-nad' : '')}
                        onDragOver={event => { if (!pipelineDragId || samoOgled) return; event.preventDefault(); setPipelineNad(faza); }}
                        onDragLeave={() => setPipelineNad(prev => (prev === faza ? null : prev))}
                        onDrop={event => {
                          event.preventDefault();
                          const id = pipelineDragId;
                          setPipelineDragId(null); setPipelineNad(null);
                          if (samoOgled || !id) return;
                          const project = visible.find(p => p.offer.id === id);
                          if (project?.real) premakniFazo(project.real, faza);
                        }}
                      >
                        {kartice.length ? kartice.map(project => {
                          const vlecljiva = !!project.real && !samoOgled;
                          const info = projectStatusInfo(project.offer.status);
                          return (
                            <div
                              key={project.offer.id}
                              className="pw-posel-kartica"
                              draggable={vlecljiva}
                              onDragStart={vlecljiva ? () => setPipelineDragId(project.offer.id) : undefined}
                              onDragEnd={() => { setPipelineDragId(null); setPipelineNad(null); }}
                              onClick={() => selectProject(project.offer.id)}
                              role="button"
                              tabIndex={0}
                              onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); selectProject(project.offer.id); } }}
                              title={!project.real ? L('Izpeljano iz ponudbe — ni vlečljivo', 'Derived from an offer — not draggable') : (samoOgled ? L('V predogledu premikanje ni na voljo', 'Moving is not available in preview') : undefined)}
                            >
                              <strong>{project.offer.title}</strong>
                              <span className="pw-mut">{project.offer.client || L('Brez stranke', 'No client')}</span>
                              <span className="pw-posel-spodaj">
                                <span className="pw-posel-vrednost">{project.agreed ? money(project.agreed) : '—'}</span>
                                <i className="pw-posel-pika" data-tone={info.tone} aria-hidden />
                              </span>
                            </div>
                          );
                        }) : <p className="pw-pipeline-prazno">{L('Prazno.', 'Empty.')}</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : visible.length ? (
            <div className="pw-tabela-ovoj">
              <div className="pw-tabela">
                {/* naslov + stevec + filter so v pw-glava-pas nad tabelo */}
                <header>{kljuk(null)}<span>{L('Projekt', 'Project')}: {visible.length}</span><span>{L('Stranka', 'Client')}</span><span>{L('Datum', 'Date')}</span><span>{L('Status', 'Status')}</span><span className="pw-desno">{L('Vrednost', 'Value')}</span><span /></header>
                {projPrikaz.map(project => { const info = projectStatusInfo(project.offer.status); return (
                  <button key={project.offer.id} type="button" className="pw-vrstica" onClick={() => selectProject(project.offer.id)}>
                    {kljuk(project.offer.id)}
                    <span className="pw-glavna"><i aria-hidden style={{ ...pikaStil(info.tone), width: '.6rem', height: '.6rem', marginRight: '.75rem' }} title={info.label} /><strong>{project.offer.title}</strong></span>
                    <span className="pw-mut">{project.offer.client}</span>
                    <span className="pw-mut">{datStr(project.offer.date)}</span>
                    <span><span className="pw-status-ured" data-editable="" title={L('Spremeni status', 'Change status')} onClick={e => e.stopPropagation()}>
                      {/* NI <button>: cela vrstica je ze gumb, gumb v gumbu pa je neveljaven HTML —
   brskalnik ga razdre in klik na status je lahko odprl projekt. Zato span z
   vlogo gumba, ki se na tipkovnico odziva enako. */}
                      <span role="button" tabIndex={0} className="pw-status" data-tone={info.tone} aria-haspopup="listbox" aria-expanded={statusUrejam === project.offer.id} style={{ display: 'inline-flex', alignItems: 'center', flexWrap: 'nowrap', whiteSpace: 'nowrap', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); setStatusUrejam(statusUrejam === project.offer.id ? null : project.offer.id); } }} onClick={e => { e.stopPropagation(); setStatusUrejam(statusUrejam === project.offer.id ? null : project.offer.id); }}>{project.real ? projektStatusOznaka[project.real.status] : statusLabel[project.offer.status]}<svg width="9" height="9" viewBox="0 0 12 8" fill="none" aria-hidden style={{ marginLeft: '.45rem', flex: 'none', opacity: .55 }}><path d="M1 1.5l5 5 5-5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg></span>
                      {statusUrejam === project.offer.id && (project.real
                        ? statusMeni(project.offer.id, Object.entries(projektStatusOznaka) as Array<[string, string]>, project.real.status, v => naStatusProjekt(project.real!, v as ProjektEntitetaStatus))
                        : statusMeni(project.offer.id, Object.entries(statusLabel) as Array<[string, string]>, project.offer.status, v => naStatusOffer(project.offer.id, v as FlowOfferStatus)))}
                    </span></span>
                    <span className="pw-desno">{project.agreed ? money(project.agreed) : '—'}</span>
                    <span className="pw-kazalec" aria-hidden>›</span>
                  </button>
                ); })}
              </div>
              <Paginacija stran={projStranA} strani={projStrani} naStran={setProjStran} />
            </div>
          ) : <p className="pw-prazno">{L('Ni projektov v tem pogledu.', 'No projects in this view.')}</p>}
        </div>
      )
    ) : (
      <section ref={storyRef} className={`${styles.projectStory} pw-stran`}>
        <button type="button" className="pw-nazaj" onClick={goBack} aria-label={L('Nazaj na seznam projektov', 'Back to projects list')}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M19 12H5M11 18l-6-6 6-6" /></svg> {L('Nazaj', 'Back')}</button>
        <header><div><p className={styles.eyebrow}>{L('PROJEKT', 'PROJECT')} · {selected.offer.number || L('BREZ ŠTEVILKE', 'NO NUMBER')}</p><h2>{selected.offer.title}</h2><span><Link href={`${base}/kalkulator/stranke?stranka=${encodeURIComponent(selected.offer.client)}`} className="pw-narocnik-link">{selected.offer.client}</Link> · {new Date(selected.offer.date).toLocaleDateString('sl-SI')}</span></div><span className="pw-det-statusured" data-editable="" title={L('Spremeni status', 'Change status')}>
          <button type="button" className="pw-status" data-tone={projectStatusInfo(selected.offer.status).tone} aria-haspopup="listbox" aria-expanded={statusUrejam === 'det-' + selected.offer.id} style={{ display: 'inline-flex', alignItems: 'center', flexWrap: 'nowrap', whiteSpace: 'nowrap', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }} onClick={e => { e.stopPropagation(); setStatusUrejam(statusUrejam === 'det-' + selected.offer.id ? null : 'det-' + selected.offer.id); }}><i aria-hidden style={pikaStil(projectStatusInfo(selected.offer.status).tone)} />{selected.real ? projektStatusOznaka[selected.real.status] : statusLabel[selected.offer.status]}<svg width="9" height="9" viewBox="0 0 12 8" fill="none" aria-hidden style={{ marginLeft: '.45rem', flex: 'none', opacity: .55 }}><path d="M1 1.5l5 5 5-5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg></button>
          {statusUrejam === 'det-' + selected.offer.id && (selected.real
            ? statusMeni('det-' + selected.offer.id, Object.entries(projektStatusOznaka) as Array<[string, string]>, selected.real.status, v => naStatusProjekt(selected.real!, v as ProjektEntitetaStatus))
            : statusMeni('det-' + selected.offer.id, Object.entries(statusLabel) as Array<[string, string]>, selected.offer.status, v => naStatusOffer(selected.offer.id, v as FlowOfferStatus)))}
        </span></header>
        {pogledDetajl === 'moderni' ? (
          <ProjectDetailModern
            data={selected}
            onZgradiProjekt={!selected.real && !samoOgled ? () => zgradiProjektIzPonudbe(selected.offer) : undefined}
            sodelavci={sodelavci}
            jeEn={jeEn}
            base={base}
            money={money}
            canEditTeam={!!selected.real && !samoOgled}
            onToggleMember={selected.real ? (id: string) => preklopiDodeljen(selected.real!, id) : undefined}
            posta={posta}
            onOpenZapis={() => setPogledDetajl('tabelni')}
            onSaveAgreed={!samoOgled ? (v: number) => saveAmount(selected.offer.id, v) : undefined}
            onSaveBrief={selected.real && !samoOgled ? (patch: Partial<Projekt>) => naSaveBrief(selected.real!, patch) : undefined}
            onOdpriKomunikacije={() => setKomOdprt(true)}
            onOdpriVse={openVsi}
            onOdpriDokument={(tip, item) => setVrsticaDetajl({ tip, item })}
            onOdpriDokumentacija={() => { setDodajOdprt(true); setDokOdprt(true); }}
            ekipaStatus={samoOgled ? { 'demo-sod-luka': 'dela', 'demo-sod-eva': 'review' } : undefined}
            agenti={samoOgled && selected.real ? [{ id: 'agent-copy', ime: jeEn ? 'Copy agent' : 'Copy agent', stanje: 'review' }, { id: 'agent-research', ime: jeEn ? 'Research agent' : 'Razisk. agent', stanje: 'koncal' }] : undefined}
            links={links}
            crmVnosi={samoOgled ? DEMO_CRM : undefined}
            naloge={samoOgled ? DEMO_NALOGE : undefined}
            onOdpriMail={(v) => { setBeriMail(v); setKomOdprt(true); }}
          />
        ) : (<>
        <div className={styles.projectMoney}><label><small>{L('Dogovorjena vrednost', 'Agreed value')}</small><span><input type="number" min="0" step="0.01" value={selected.agreed || ''} onChange={event => saveAmount(selected.offer.id, Number(event.target.value))} /> €</span><b className={styles.subpageMetricIcon}><MetricIcon type="document" /></b></label><span><small>{L('Zaračunano', 'Billed')}</small><strong>{money(selected.billed)}</strong><b className={styles.subpageMetricIcon}><MetricIcon type="paid" /></b></span><span className={selected.unbilled > 0 ? styles.projectNeedsInvoice : ''}><small>{L('Še ni zaračunano', 'Not yet billed')}</small><strong>{selected.agreed ? money(selected.unbilled) : '—'}</strong><b className={styles.subpageMetricIcon}><MetricIcon type="cost" /></b></span><span><small>{L('Ocenjeni rezultat', 'Estimated result')}</small><strong>{money(selected.profit)}</strong><b className={styles.subpageMetricIcon}><MetricIcon type="profit" /></b></span></div>
        <div style={{ display: 'flex', gap: '.55rem', alignItems: 'stretch', flexWrap: 'wrap', margin: '.55rem 0 0' }}>
        {selected.real && (
          <article className="pw-karta pw-cilji" style={{ flex: '1 1 300px', minWidth: 0, margin: 0 }}>
            <p className={styles.eyebrow}>{L('00 · CILJI IN ŽELJE', '00 · GOALS & WISHES')}</p>
            <h3>{L('Kaj si stranka želi doseči?', 'What does the client want to achieve?')}</h3>
            {selected.real.zelje && <p className="pw-cilji-zelje">{selected.real.zelje}</p>}
            {selected.real.cilji && selected.real.cilji.length > 0 ? (
              <ul className="pw-cilji-seznam">
                {selected.real.cilji.map(cilj => (
                  <li key={cilj.id}>
                    <b>{cilj.besedilo}</b>
                    {(cilj.metrika || cilj.tarca) && <small>{[cilj.metrika, cilj.tarca].filter(Boolean).join(' · ')}</small>}
                  </li>
                ))}
              </ul>
            ) : (!selected.real.zelje && !(selected.real.opisStranke || selected.real.panoga || selected.real.ciljnaSkupina || selected.real.dizajnZelje || selected.real.voice || selected.real.konkurenca) && <p className="pw-cilji-prazno">{L('Želje in cilji še niso dodani.', 'Wishes and goals have not been added yet.')}</p>)}
            {(selected.real.opisStranke || selected.real.panoga || selected.real.ciljnaSkupina || selected.real.dizajnZelje || selected.real.voice || selected.real.konkurenca) && (<>
              <p className="pw-cilji-podnaslov">Brief</p>
              <div className="pw-cilji-vprasanja">
                {selected.real.opisStranke && <div className="pw-vprasanje-vrstica"><div><b>{L('Stranka', 'Client')}</b><span>{selected.real.opisStranke}</span></div></div>}
                {selected.real.panoga && <div className="pw-vprasanje-vrstica"><div><b>{L('Panoga', 'Industry')}</b><span>{selected.real.panoga}</span></div></div>}
                {selected.real.ciljnaSkupina && <div className="pw-vprasanje-vrstica"><div><b>Persona</b><span>{selected.real.ciljnaSkupina}</span></div></div>}
                {selected.real.dizajnZelje && <div className="pw-vprasanje-vrstica"><div><b>{L('Dizajn', 'Design')}</b><span>{selected.real.dizajnZelje}</span></div></div>}
                {selected.real.voice && <div className="pw-vprasanje-vrstica"><div><b>Voice</b><span>{selected.real.voice}</span></div></div>}
                {selected.real.konkurenca && <div className="pw-vprasanje-vrstica"><div><b>{L('Konkurenca', 'Competition')}</b><span>{selected.real.konkurenca}</span></div></div>}
              </div>
            </>)}
            {selected.real.dodatnaVprasanja && selected.real.dodatnaVprasanja.length > 0 && (<>
              <p className="pw-cilji-podnaslov">{L('Dodatna vprašanja', 'Additional questions')}</p>
              <div className="pw-cilji-vprasanja">
                {selected.real.dodatnaVprasanja.map(v => (
                  <div key={v.id} className="pw-vprasanje-vrstica"><div><b>{v.vprasanje}</b><span>{v.odgovor}</span></div></div>
                ))}
              </div>
            </>)}
            {selected.real.dodeljeni && selected.real.dodeljeni.length > 0 && (<>
              <p className="pw-cilji-podnaslov">{L('Dodeljeni', 'Assigned')}</p>
              <div className="pw-cilji-dodeljeni">
                {selected.real.dodeljeni.map(id => {
                  const oseba = sodelavci.find(s => s.id === id);
                  if (!oseba) return null;
                  const initials = oseba.ime.split(' ').map(d => d[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
                  return <span key={id} className="pw-cilji-oseba"><span className="pw-chat-sod-krog" aria-hidden>{initials}</span>{oseba.ime}</span>;
                })}
              </div>
            </>)}
          </article>
        )}
        <article className={styles.projectAgreement} style={{ position: 'relative', flex: '1 1 300px', minWidth: 0, display: 'flex', flexDirection: 'column', padding: '1rem', border: '1px solid color-mix(in oklch, var(--ink) 4%, transparent)', borderRadius: '1rem', background: 'linear-gradient(135deg, oklch(97% .025 295), oklch(97% .025 165))', overflow: 'hidden' }}><p className={styles.eyebrow}>{L('01 · DOGOVORJENO', '01 · AGREED')}</p><h3>{L('Kaj je bilo v ponudbi?', 'What was in the offer?')}</h3>{selected.offer.scope.length ? <ul>{selected.offer.scope.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ul> : selected.real ? <p>{L('Ta projekt še nima ponudbe. Pripravi jo v kalkulatorju, ko bo obseg jasen.', 'This project has no offer yet. Prepare one in the calculator once the scope is clear.')}</p> : <p>{L('Starejša ponudba nima strukturiranega obsega. Odpri jo v kalkulatorju za celotno besedilo.', 'This older offer has no structured scope. Open it in the calculator for the full text.')}</p>}<Link href={`${base}/kalkulator/orodje?od=pregled`} aria-label={L('Ustvari ponudbo za ta projekt', 'Create an offer for this project')} title={L('Ustvari ponudbo', 'Create offer')}><Plus size={18} weight="bold" /></Link></article></div><div className={styles.projectNarrative}><article style={{ background: 'linear-gradient(140deg, oklch(96% .035 160), oklch(88% .075 163))' }}><p className={styles.eyebrow}>{L('02 · POGODBE', '02 · CONTRACTS')}</p><h3>{selected.contracts.length ? (jeEn ? `${selected.contracts.length} linked` : `${selected.contracts.length} povezanih`) : L('Brez pogodbe', 'No contract')}</h3>{pogodbeSort.slice(0, NAJNOVEJSIH).map(pogodbaVrstica)}{pogodbeSort.length > NAJNOVEJSIH && <button type="button" className="pw-vec" onClick={() => openVsi('pogodbe')}>{L('Prikaži vse', 'Show all')} ({pogodbeSort.length}) →</button>}<Link href={`${base}/kalkulator/pogodbe`} aria-label={L('Dodaj pogodbo za ta projekt', 'Add a contract for this project')}><Plus size={18} weight="bold" /></Link></article><article style={{ background: 'linear-gradient(140deg, oklch(96% .035 295), oklch(88% .075 297))' }}><p className={styles.eyebrow}>{L('03 · RAČUNI', '03 · INVOICES')}</p><h3>{money(selected.billed)}</h3>{racuniSort.slice(0, NAJNOVEJSIH).map(racunVrstica)}{racuniSort.length > NAJNOVEJSIH && <button type="button" className="pw-vec" onClick={() => openVsi('racuni')}>{L('Prikaži vse', 'Show all')} ({racuniSort.length}) →</button>}<Link href={`${base}/kalkulator/racuni`} aria-label={L('Dodaj račun za ta projekt', 'Add an invoice for this project')}><Plus size={18} weight="bold" /></Link></article><article style={{ background: 'linear-gradient(140deg, oklch(97% .03 65), oklch(89% .075 60))' }}><p className={styles.eyebrow}>{L('04 · STROŠKI', '04 · EXPENSES')}</p><h3>{money(selected.costs)}</h3>{strosekSort.slice(0, NAJNOVEJSIH).map(strosekVrstica)}{strosekSort.length > NAJNOVEJSIH && <button type="button" className="pw-vec" onClick={() => openVsi('stroski')}>{L('Prikaži vse', 'Show all')} ({strosekSort.length}) →</button>}<Link href={`${base}/kalkulator/stroski`} aria-label={L('Dodaj strošek za ta projekt', 'Add an expense for this project')}><Plus size={18} weight="bold" /></Link></article><article className="pw-karta pw-dokumentacija"><p className={styles.eyebrow}>{L('05 · DOKUMENTACIJA', '05 · DOCUMENTATION')}</p><h3>{L('Povezave do zunanjih datotek', 'Links to external files')}</h3>{links.length ? (<div className="pw-linki">{links.map((link, index) => (<div key={`${link.url}-${index}`} className="pw-link-vrstica"><a href={link.url} target="_blank" rel="noopener noreferrer">{link.oznaka}</a>{!samoOgled && <button type="button" className="pw-link-brisi" onClick={() => removeLink(index)} aria-label={`${L('Izbriši povezavo', 'Delete link')} ${link.oznaka}`}>×</button>}</div>))}</div>) : <p className="pw-link-prazno">{L('Še ni dodanih povezav.', 'No links added yet.')}</p>}{!samoOgled && dodajOdprt && (<div className="pw-link-obrazec"><input type="text" value={linkOznaka} onChange={event => setLinkOznaka(event.target.value)} placeholder={L('npr. Figma', 'e.g. Figma')} aria-label={L('Oznaka povezave', 'Link label')} /><input type="url" value={linkUrl} onChange={event => setLinkUrl(event.target.value)} placeholder="https://…" aria-label={L('Naslov povezave (Figma, Miro, IDD, mapa Drive …)', 'Link address (Figma, Miro, IDD, Drive folder …)')} /><button type="button" className="pw-link-dodaj" onClick={addLink} disabled={!linkOznaka.trim() || !linkUrl.trim()}>{L('+ Dodaj povezavo', '+ Add link')}</button></div>)}{samoOgled && dodajOdprt && <p className="pw-opozorilo">{L('Dodajanje povezav ni na voljo v predogledu (demo). Prijavi se v svoj račun.', 'Adding links is not available in the demo preview. Sign in to your account.')}</p>}<button type="button" className="pw-dok-dodaj" onClick={() => setDodajOdprt(open => !open)} aria-label={dodajOdprt ? L('Zapri dodajanje povezave', 'Close add link') : L('Dodaj povezavo', 'Add link')}><Plus size={16} weight="bold" /></button></article></div>

        <div className="pw-dodatno">
          {komVsebina()}
          <Link href={`${base}/kalkulator/stranke?stranka=${encodeURIComponent(selected.offer.client)}`} className="pw-karta pw-dnevnik-link">
            <p className={styles.eyebrow}>{L('07 · CRM DNEVNIK', '07 · CRM DIARY')}</p>
            <h3>{L('Klici, sestanki, dogovori', 'Calls, meetings, agreements')}</h3>
            <p>{jeEn ? `Timeline of the relationship with “${selected.offer.client}” — open on the client page.` : `Kronologija odnosa s stranko »${selected.offer.client}« — odpri na strani stranke.`}</p>
            <b className="pw-znacka pw-znacka-live">{L('Odpri', 'Open')} <svg className="puscica-svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M7 17L17 7M8 7h9v9" /></svg></b>
          </Link>
        </div>
        </>)}
      </section>
    )}

    {/* SLIDE "Vsi <tip>" z desne — vzorec styles.detailBackdrop/detailPanel + lepljivi X
        (glej ArhivWorkspace .arh-det-x); poln seznam za pogodbe/računi/stroški TA projekta */}
    {portalPripravljen && komOdprt && selected && createPortal(
      <div className="pw-rail-back" role="presentation" onMouseDown={() => { setKomOdprt(false); setAiOdprt(false); setKlepetOdprt(false); }}>
        <div className="pw-rail" onMouseDown={e => e.stopPropagation()}>
          {/* STOLPEC 1 · MAIL */}
          <aside className="pw-rail-col pw-kom-panel" role="dialog" aria-modal="true" aria-label={L('Komunikacija', 'Communication')}>
            <button type="button" className="pw-vsi-x" onClick={() => { setKomOdprt(false); setAiOdprt(false); setKlepetOdprt(false); }} aria-label={L('Zapri', 'Close')}>✕</button>
            <div className="pw-rail-scroll"><KomunikacijaWorkspace jeEn={jeEn} projektId={selectedId} projektNaziv={selected?.offer.title} vgrajeno /></div>
          </aside>
          {/* STOLPEC 2 · PUPA */}
          {aiOdprt && (
            <aside className="pw-rail-col pw-ai-panel" role="dialog" aria-label="Pupa">
              <button type="button" className="pw-vsi-x" onClick={() => setAiOdprt(false)} aria-label={L('Zapri', 'Close')}>✕</button>
              <div className="pw-rail-scroll pw-ai-scroll">
                <p className={styles.eyebrow}><Sparkle size={13} weight="fill" style={{ verticalAlign: '-2px', marginRight: '.3rem' }} />{L('PUPA · POMOČ PRI MAILU', 'PUPA · MAIL HELP')}</p>
                {aiNalaganje ? (
                  <div className="pw-ai-load"><span className="pw-ai-pika" /><span className="pw-ai-pika" /><span className="pw-ai-pika" /><span>{L('Pupa bere sporočilo …', 'Pupa is reading the message …')}</span></div>
                ) : aiNapaka ? (
                  <div className="pw-ai-napaka">{aiNapaka}</div>
                ) : (<>
                  <section className="pw-ai-blok">
                    <h4>{L('Povzetek', 'Summary')}</h4>
                    <p className="pw-ai-povzetek">{aiPovzetek || L('(brez povzetka)', '(no summary)')}</p>
                  </section>
                  {aiOdgovor && (
                    <section className="pw-ai-blok">
                      <h4>{L('Predlog odgovora', 'Suggested reply')}</h4>
                      <textarea className="pw-ai-odg" value={aiOdgovor} onChange={e => setAiOdgovor(e.target.value)} rows={8} />
                      <div className="pw-ai-akcije">
                        <button type="button" className="pw-ai-kopiraj" onClick={() => { if (typeof navigator !== 'undefined' && navigator.clipboard) void navigator.clipboard.writeText(aiOdgovor); }}>{L('Kopiraj', 'Copy')}</button>
                        {!samoOgled && <button type="button" className="pw-ai-uporabi" onClick={() => uporabiAiOdgovor(beriMail)}><ArrowBendUpLeft size={14} weight="bold" /> {L('Uredi in pošlji', 'Edit & send')}</button>}
                      </div>
                    </section>
                  )}
                  <p className="pw-ai-opomba">{L('Pupa svetuje — besedilo pred pošiljanjem vedno preglej.', 'Pupa assists — always review the text before sending.')}</p>
                </>)}
              </div>
            </aside>
          )}
          {/* STOLPEC 3 · KLEPET */}
          {klepetOdprt && (
            <aside className="pw-rail-col pw-klepet-panel" role="dialog" aria-label={L('Klepet', 'Chat')}>
              <button type="button" className="pw-vsi-x" onClick={() => { setKlepetOdprt(false); setKlepetPicker(false); }} aria-label={L('Zapri', 'Close')}>✕</button>
              <div className="pw-klepet-glava">
                <div className="pw-klepet-osebe">
                  {klepetIzbrani.length ? klepetIzbrani.map(id => {
                    const s = sodelavci.find(x => x.id === id);
                    if (!s) return null;
                    return <span key={id} className="pw-klepet-oseba"><span className="pw-klepet-av" aria-hidden>{s.ime.trim().charAt(0).toUpperCase()}<i className="pw-klepet-pika" data-st={prisotnost(id)} /></span><b>{s.ime.split(' ')[0]}</b></span>;
                  }) : <span className="pw-klepet-kdo"><b>{L('Izberi sodelavca', 'Choose a collaborator')}</b><small>{L('klikni +', 'click +')}</small></span>}
                </div>
                <div className="pw-klepet-piker-w">
                  <button type="button" className="pw-klepet-dodaj" aria-expanded={klepetPicker} onClick={() => setKlepetPicker(o => !o)} aria-label={klepetPicker ? L('Zapri izbiro', 'Close picker') : L('Izberi sodelavce', 'Choose collaborators')}><Plus size={15} weight="bold" /></button>
                  {klepetPicker && (
                    <div className="pw-klepet-meni">
                      <p className="pw-klepet-meni-h">{L('Deli s sodelavci', 'Share with collaborators')}</p>
                      {sodelavci.length ? sodelavci.map(s => (
                        <button type="button" key={s.id} className={`pw-klepet-vrsta${klepetIzbrani.includes(s.id) ? ' on' : ''}`} onClick={() => preklopiSodelavca(s.id)}>
                          <span className="pw-klepet-av sm" aria-hidden>{s.ime.trim().charAt(0).toUpperCase()}<i className="pw-klepet-pika" data-st={prisotnost(s.id)} /></span>
                          <span className="pw-klepet-vrsta-ime">{s.ime}<small>{prisotnost(s.id) === 'online' ? L('na voljo', 'available') : prisotnost(s.id) === 'idle' ? L('nedejaven', 'idle') : L('nedosegljiv', 'offline')}</small></span>
                          {klepetIzbrani.includes(s.id) && <span className="pw-klepet-kljuk">✓</span>}
                        </button>
                      )) : <p className="pw-klepet-meni-prazno">{L('Ni sodelavcev. Dodaj jih spodaj po e-naslovu.', 'No collaborators yet. Add one by email below.')}</p>}
                      <form onSubmit={povabiNaMail} style={{ display: 'flex', gap: '.35rem', padding: '.5rem .45rem .35rem', borderTop: '1px solid color-mix(in oklch, var(--ink) 8%, transparent)', marginTop: '.25rem' }}>
                        <input type="email" value={vabiMail} onChange={e => setVabiMail(e.target.value)} placeholder={L('vpiši e-naslov …', 'enter an email …')} aria-label={L('Povabi po e-naslovu', 'Invite by email')} style={{ flex: 1, minWidth: 0, border: '1px solid color-mix(in oklch, var(--ink) 15%, transparent)', borderRadius: '.5rem', padding: '.42rem .55rem', fontSize: '.82rem', fontFamily: 'inherit', background: '#fff' }} />
                        <button type="submit" style={{ flex: 'none', border: 0, borderRadius: '.5rem', background: 'var(--ink)', color: 'var(--paper)', padding: '.42rem .7rem', fontSize: '.78rem', fontWeight: 700, cursor: 'pointer' }}>{L('Povabi', 'Invite')}</button>
                      </form>
                      <p style={{ margin: '.15rem .45rem .1rem', fontSize: '.66rem', lineHeight: 1.35, color: 'color-mix(in oklch, var(--ink) 72%, transparent)' }}>{L('Pošljemo mu vabilo z linkom. E-naslov mora biti njegov prijavni.', 'We send them an invite with a link. Use their login email.')}</p>
                    </div>
                  )}
                </div>
              </div>
              <div className="pw-klepet-tok">
                {klepetSporocila.length ? klepetSporocila.map(m => m.odMaila ? (
                  <div key={m.id} className={`pw-klepet-pri${m.avtor === 'jaz' ? ' jaz' : ''}`}>
                    <div className="pw-klepet-pri-glava"><Paperclip size={12} weight="bold" /> {m.izsek ? L('Označen del maila', 'Highlighted part') : L('Deljen mail', 'Shared mail')}</div>
                    <div className="pw-klepet-pri-zad">{m.odMaila}</div>
                    <div className="pw-klepet-pri-telo">{m.besedilo}</div>
                  </div>
                ) : (
                  <div key={m.id} className={`pw-klepet-b${m.avtor === 'jaz' ? ' pw-klepet-b-jaz' : ''}`}>{m.besedilo}</div>
                )) : <p className="pw-klepet-prazno">{L('Izberi sodelavca in začni pogovor — ali v mailu označi del besedila in izberi »Deli v klepet«.', 'Choose a collaborator and start chatting — or highlight text in a mail and click “Share in chat”.')}</p>}
              </div>
              <form className="pw-klepet-vnos" onSubmit={posljiKlepet}>
                <input value={klepetVnos} onChange={e => setKlepetVnos(e.target.value)} placeholder={klepetIzbrani.length ? L('Napiši sporočilo …', 'Write a message …') : L('Najprej izberi sodelavca (+)', 'First choose a collaborator (+)')} aria-label={L('Sporočilo', 'Message')} disabled={!klepetIzbrani.length} />
                <button type="submit" className="pw-klepet-poslji" disabled={!klepetVnos.trim() || !klepetIzbrani.length} aria-label={L('Pošlji', 'Send')}><ArrowBendUpRight size={16} weight="bold" /></button>
              </form>
              <Toast sporocilo={povabiToast} onClose={() => setPovabiToast('')} />
            </aside>
          )}
        </div>
      </div>
    , document.body)}

    {portalPripravljen && dokOdprt && selected && createPortal(
      <div className={`${styles.detailBackdrop} pw-vsi-backdrop`} role="presentation" onMouseDown={() => setDokOdprt(false)}>
        <aside className={`${styles.detailPanel} pw-vsi-panel pw-naloga-panel`} role="dialog" aria-modal="true" aria-label={L('Dokumentacija', 'Documentation')} onMouseDown={e => e.stopPropagation()}>
          <button type="button" className="pw-vsi-x" onClick={() => setDokOdprt(false)} aria-label={L('Zapri', 'Close')}>✕</button>
          <div className="pw-naloga-obr">
            <p className={styles.eyebrow}>{L('DOKUMENTACIJA · POVEZAVE', 'DOCUMENTATION · LINKS')}</p>
            <h2 style={{ margin: '.1rem 0 .3rem' }}>{L('Zunanje datoteke projekta', 'Project external files')}</h2>
            <p className="pw-dok-uvod">{L('Figma, Google Drive, Miro, mapa slik … — vse povezave projekta na enem mestu.', 'Figma, Google Drive, Miro, image folder … — all project links in one place.')}</p>
            {/* NAJPREJ obrazec, POD njim seznam (Tina, 25. 8.): dodajanje je
                glavno dejanje tega panela, seznam je posledica. */}
            {!samoOgled ? (
              <div className="pw-dok-obrazec">
                <p className={styles.eyebrow} style={{ margin: 0 }}>{dokUredi !== null ? L('UREJANJE POVEZAVE', 'EDITING LINK') : L('NOVA POVEZAVA', 'NEW LINK')}</p>
                <label className="pw-naloga-l"><span>{L('Oznaka', 'Label')}</span><input type="text" value={linkOznaka} onChange={e => setLinkOznaka(e.target.value)} placeholder={L('npr. Figma · Dizajn', 'e.g. Figma · Design')} /></label>
                <label className="pw-naloga-l"><span>{L('Naslov (URL)', 'Address (URL)')}</span><input type="url" value={linkUrl} onChange={e => setLinkUrl(e.target.value)} placeholder="https://…" /></label>
                <div className="pw-naloga-akcije">
                  {dokUredi !== null && <button type="button" className="pw-naloga-preklic" onClick={() => { setDokUredi(null); setLinkOznaka(''); setLinkUrl(''); }}>{L('Prekliči', 'Cancel')}</button>}
                  <button type="button" className="pw-naloga-shrani" onClick={shraniLink} disabled={!linkOznaka.trim() || !linkUrl.trim()}>{dokUredi !== null ? L('Shrani spremembe', 'Save changes') : L('+ Dodaj povezavo', '+ Add link')}</button>
                </div>
              </div>
            ) : <p className="pw-opozorilo">{L('Dodajanje povezav ni na voljo v predogledu (demo). Prijavi se v svoj račun.', 'Adding links is not available in the demo preview. Sign in to your account.')}</p>}
            {links.length ? (
              <div className="pw-dok-linki">
                {links.map((link, index) => (
                  <div key={`${link.url}-${index}`} className={`pw-dok-vrstica${dokUredi === index ? ' pw-dok-vrstica-ur' : ''}`}>
                    <a href={link.url} target="_blank" rel="noopener noreferrer">{link.oznaka}<span className="pw-dok-url">{link.url}</span></a>
                    {!samoOgled && <span className="pw-dok-akc">
                      <button type="button" className="pw-dok-uredi" onClick={() => zacniUrejanjeLink(index)}>{L('Uredi', 'Edit')}</button>
                      <button type="button" className="pw-dok-brisi" onClick={() => removeLink(index)} aria-label={`${L('Izbriši', 'Delete')} ${link.oznaka}`}>✕</button>
                    </span>}
                  </div>
                ))}
              </div>
            ) : <p className="pw-dok-prazno-t">{L('Še ni povezav.', 'No links yet.')}</p>}
          </div>
        </aside>
      </div>
    , document.body)}

    {portalPripravljen && nalogaOdprt && selected && createPortal(
      <div className={`${styles.detailBackdrop} pw-vsi-backdrop`} role="presentation" onMouseDown={() => setNalogaOdprt(false)}>
        <aside className={`${styles.detailPanel} pw-vsi-panel pw-naloga-panel`} role="dialog" aria-modal="true" aria-label={L('Nova naloga', 'New task')} onMouseDown={e => e.stopPropagation()}>
          <button type="button" className="pw-vsi-x" onClick={() => setNalogaOdprt(false)} aria-label={L('Zapri', 'Close')}>✕</button>
          <div className="pw-naloga-obr">
            <p className={styles.eyebrow}>{L('NOVA NALOGA IZ E-POŠTE', 'NEW TASK FROM EMAIL')}</p>
            <label className="pw-naloga-l"><span>{L('Naslov naloge', 'Task title')}</span><input type="text" value={nalogaNaslov} onChange={e => setNalogaNaslov(e.target.value)} placeholder={L('Kaj je treba narediti?', 'What needs to be done?')} /></label>
            <label className="pw-naloga-l pw-naloga-l-opis"><span>{L('Opis (besedilo maila — uredi po potrebi)', 'Description (mail text — edit as needed)')}</span><textarea value={nalogaOpis} onChange={e => setNalogaOpis(e.target.value)} rows={12} /></label>
            <div className="pw-naloga-akcije">
              <button type="button" className="pw-naloga-preklic" onClick={() => setNalogaOdprt(false)}>{L('Prekliči', 'Cancel')}</button>
              <button type="button" className="pw-naloga-shrani" onClick={shraniNovoNalogo} disabled={!nalogaNaslov.trim()}>{L('Shrani kot nalogo', 'Save as task')}</button>
            </div>
          </div>
        </aside>
      </div>
    , document.body)}

    {portalPripravljen && vsiOdprt && selected && createPortal(
      <div className={`${styles.detailBackdrop} pw-vsi-backdrop`} role="presentation" onMouseDown={closeVsi}>
        <aside className={`${styles.detailPanel} pw-vsi-panel`} role="dialog" aria-modal="true" aria-labelledby="pw-vsi-naslov" onMouseDown={e => e.stopPropagation()}>
          <button type="button" className="pw-vsi-x" onClick={closeVsi} aria-label={L('Zapri', 'Close')}>✕</button>
          <p className={styles.eyebrow}>{vsiEyebrow}</p>
          <h2 id="pw-vsi-naslov">{vsiNaslov}</h2>
          <p className="pw-vsi-projekt">{selected.offer.title}</p>

          {/* preklop načina prikaza + iskalnik V ISTI VRSTI (Strani/Drsenje levo, lupa desno) */}
          <div className="pw-vsi-orodja">
          <div className="pw-vsi-nacin" role="tablist" aria-label={L('Način prikaza', 'Display mode')}>
            <button type="button" role="tab" aria-selected={vsiNacin === 'strani'} className={vsiNacin === 'strani' ? 'pw-vsi-nacin-aktivna' : ''} onClick={() => setVsiNacin('strani')}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="4" y="4" width="7" height="16" rx="1.2" /><rect x="13" y="4" width="7" height="16" rx="1.2" /></svg>
              {L('Strani', 'Pages')}
            </button>
            <button type="button" role="tab" aria-selected={vsiNacin === 'drsenje'} className={vsiNacin === 'drsenje' ? 'pw-vsi-nacin-aktivna' : ''} onClick={() => setVsiNacin('drsenje')}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="7" y="2.5" width="10" height="18" rx="5" /><line x1="12" y1="7" x2="12" y2="10" /></svg>
              {L('Drsenje', 'Scroll')}
            </button>
          </div>

          <div className="pw-vsi-iskalnik">
            {vsiIskanjeOdprto ? (
              <div className="pw-vsi-isci-polje">
                <input
                  type="search"
                  autoFocus
                  value={vsiIskanje}
                  onChange={event => { setVsiIskanje(event.target.value); setVsiStran(1); }}
                  placeholder={L('Išči po nazivu, številki, opisu, kategoriji …', 'Search by name, number, description, category …')}
                  aria-label={L('Išči', 'Search')}
                />
                <button type="button" className="pw-vsi-isci-x" onClick={() => { setVsiIskanje(''); setVsiStran(1); setVsiIskanjeOdprto(false); }} aria-label={L('Zapri iskanje', 'Close search')}>×</button>
              </div>
            ) : (
              <button type="button" className="pw-vsi-lupa" onClick={() => setVsiIskanjeOdprto(true)} aria-label={L('Išči', 'Search')}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
              </button>
            )}
          </div>
          </div>

          <div className="pw-vsi-seznam" data-nacin={vsiNacin}>
            {vsiPrikaz.length ? vsiPrikaz : <p className="pw-prazno">{L('Ni zadetkov.', 'No results.')}</p>}
          </div>

          {vsiNacin === 'strani' && vsiStrani > 1 && (
            <nav className="pw-vsi-strani" aria-label={L('Strani', 'Pages')}>
              <button type="button" onClick={() => setVsiStran(s => Math.max(1, s - 1))} disabled={vsiStranAktivna <= 1} aria-label={L('Prejšnja stran', 'Previous page')}>‹</button>
              {Array.from({ length: vsiStrani }, (_, i) => i + 1).map(n => (
                <button key={n} type="button" className={n === vsiStranAktivna ? 'pw-vsi-stran-aktivna' : ''} onClick={() => setVsiStran(n)} aria-current={n === vsiStranAktivna ? 'page' : undefined}>{n}</button>
              ))}
              <button type="button" onClick={() => setVsiStran(s => Math.min(vsiStrani, s + 1))} disabled={vsiStranAktivna >= vsiStrani} aria-label={L('Naslednja stran', 'Next page')}>›</button>
            </nav>
          )}
        </aside>
      </div>
    , document.body)}

    {/* PREDOGLED posameznega dokumenta (klik na vrstico na kartici ali v slideu) */}
    {portalPripravljen && vrsticaDetajl && selected && createPortal((() => {
      const { tip, item } = vrsticaDetajl;
      const zapri = () => setVrsticaDetajl(null);
      return (
        <div className={`${styles.detailBackdrop} pw-vsi-backdrop`} role="presentation" onMouseDown={zapri}>
          <aside className={`${styles.detailPanel} pw-det-panel`} role="dialog" aria-modal="true" aria-labelledby="pw-det-naslov" onMouseDown={e => e.stopPropagation()}>
            {/* Ista glava kot v DokPanelu: natisni levo z ikono, zapri desno. */}
            <header className="pw-det-glava">
              <button type="button" className="pw-det-tisk" onClick={() => { if (typeof window !== 'undefined') window.print(); }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M6 9V3h12v6M6 18H4v-6h16v6h-2M8 14h8v7H8z" /></svg>
                {L('Natisni', 'Print')}
              </button>
              <button type="button" className="pw-det-x" onClick={zapri} aria-label={L('Zapri', 'Close')}>×</button>
            </header>
            <div className="pw-det-papir">
            {tip === 'ponudbe' && (() => {
              const o = item as FlowOffer;
              return <>
                <p className={styles.eyebrow}>{L('PONUDBA', 'OFFER')}{o.number ? ` · ${o.number}` : ''}</p>
                <h2 id="pw-det-naslov">{o.title || L('Ponudba', 'Offer')}</h2>
                <p className="pw-vsi-projekt">{o.client}</p>
                <div className="pw-det-meta">
                  <span><small>{L('Stranka', 'Client')}</small><strong>{o.client || '—'}</strong></span>
                  <span><small>{L('Datum', 'Date')}</small><strong>{o.date ? new Date(o.date).toLocaleDateString('sl-SI') : '—'}</strong></span>
                </div>
                {!!o.scope?.length && (
                  <div className="pw-det-tabela-ovoj"><table className="pw-det-tabela">
                    <thead><tr><th>{L('Obseg', 'Scope')}</th></tr></thead>
                    <tbody>{o.scope.map((v, i) => <tr key={`${v}-${i}`}><td>{v}</td></tr>)}</tbody>
                  </table></div>
                )}
                <div className="pw-det-vsote"><div className="pw-det-skupaj">
                  <span>{L('Dogovorjena vrednost', 'Agreed value')}</span>
                  <strong>{selected.agreed ? money(selected.agreed) : '—'}</strong>
                </div></div>
                {/* Urejanje je LOCENO dejanje in mora biti izbrano zavestno. */}
                <a className="pw-det-odpri" href={`${base}/kalkulator/orodje?od=pregled`}>{L('Odpri ponudbo v urejevalniku', 'Open the offer in the editor')} ↗</a>
              </>;
            })()}
            {tip === 'racuni' && (() => {
              const r = item as FlowInvoice;
              const its = r.items || [];
              const imaPopust = its.some(i => (i.popust || 0) > 0);
              const imaDdv = its.some(i => (i.ddv || 0) > 0);
              return <>
                <p className={styles.eyebrow}>{L('RAČUN', 'INVOICE')} · {r.paid ? L('PLAČAN', 'PAID') : L('ODPRT', 'OPEN')}</p>
                <h2 id="pw-det-naslov">{L('Račun', 'Invoice')} {r.number || ''}</h2>
                <p className="pw-vsi-projekt">{selected.offer.title} · {selected.offer.client}</p>
                <div className="pw-det-meta">
                  <span><small>{L('Datum', 'Date')}</small><strong>{new Date(r.date).toLocaleDateString('sl-SI')}</strong></span>
                  {typeof r.dueDays === 'number' && <span><small>{L('Rok plačila', 'Payment due')}</small><strong>{r.dueDays} {L('dni', 'days')}</strong></span>}
                  <span><small>{L('Status', 'Status')}</small><strong className={`pw-det-status ${r.paid ? 'placan' : 'odprt'}`}>{r.paid ? L('Plačan', 'Paid') : L('Odprt', 'Open')}</strong></span>
                </div>
                {its.length ? (<>
                  <div className="pw-det-tabela-ovoj"><table className="pw-det-tabela">
                    <thead><tr><th>{L('Opis', 'Description')}</th><th>{L('Kol.', 'Qty')}</th><th>{L('Cena', 'Price')}</th>{imaPopust && <th>{L('Popust', 'Discount')}</th>}{imaDdv && <th>{L('DDV', 'VAT')}</th>}<th>{L('Skupaj', 'Total')}</th></tr></thead>
                    <tbody>{its.map((it, i) => <tr key={`${it.opis}-${i}`}><td>{it.opis}</td><td>{it.kolicina}</td><td>{money(it.cena)}</td>{imaPopust && <td>{it.popust ? `${it.popust}%` : '—'}</td>}{imaDdv && <td>{it.ddv ? `${it.ddv}%` : '—'}</td>}<td>{money(it.kolicina * it.cena * (1 - (it.popust || 0) / 100))}</td></tr>)}</tbody>
                  </table></div>
                  <div className="pw-det-vsote">
                    {typeof r.net === 'number' && <div><span>{L('Neto', 'Net')}</span><strong>{money(r.net)}</strong></div>}
                    {typeof r.vatAmount === 'number' && r.vatAmount > 0 && <div><span>{L('DDV', 'VAT')}</span><strong>{money(r.vatAmount)}</strong></div>}
                    <div className="pw-det-skupaj"><span>{L('Za plačilo', 'Total due')}</span><strong>{money(r.amount)}</strong></div>
                  </div>
                </>) : (
                  <div className="pw-det-vsote"><div className="pw-det-skupaj"><span>{L('Za plačilo', 'Total due')}</span><strong>{money(r.amount)}</strong></div></div>
                )}
                <div className="pw-det-akcije">
                  <button type="button" className="pw-det-poslji" onClick={() => posljiDokument(selected.offer.client, (jeEn ? `Invoice ${r.number || ''}` : `Račun ${r.number || ''}`).trim(), jeEn ? `Hello,\n\nplease find attached invoice ${r.number || ''} for the amount of ${money(r.amount)}.\n\nKind regards` : `Pozdravljeni,\n\nv prilogi vam pošiljam račun ${r.number || ''} v znesku ${money(r.amount)}.\n\nLep pozdrav`)}>{L('Pošlji naročniku', 'Send to client')} <svg className="puscica-svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M7 17L17 7M8 7h9v9" /></svg></button>
                  <Link href={`${base}/kalkulator/racuni`} className="pw-det-uredi">{L('Uredi v Računih', 'Edit in Invoices')} <svg className="puscica-svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M7 17L17 7M8 7h9v9" /></svg></Link>
                </div>
              </>;
            })()}
            {tip === 'pogodbe' && (() => {
              const c = item as FlowContract;
              return <>
                <p className={styles.eyebrow}>{L('POGODBA', 'CONTRACT')} · {c.status}</p>
                <h2 id="pw-det-naslov">{c.title}</h2>
                <p className="pw-vsi-projekt">{selected.offer.title} · {selected.offer.client}</p>
                <div className="pw-det-meta"><span><small>{L('Datum', 'Date')}</small><strong>{new Date(c.date).toLocaleDateString('sl-SI')}</strong></span><span><small>{L('Status', 'Status')}</small><strong>{c.status}</strong></span></div>
                {c.body
                  ? <div className="pw-det-doktelo" dangerouslySetInnerHTML={{ __html: c.body }} />
                  : <p className="pw-det-opomba">{L('Ta pogodba nima shranjenega besedila. Odpri in uredi jo v razdelku Pogodbe.', 'This contract has no stored text. Open and edit it in the Contracts section.')}</p>}
                <div className="pw-det-akcije">
                  <button type="button" className="pw-det-poslji" onClick={() => posljiDokument(selected.offer.client, jeEn ? `Contract — ${c.title}` : `Pogodba — ${c.title}`, jeEn ? `Hello,\n\nplease find attached the contract “${c.title}”. Please review and sign.\n\nKind regards` : `Pozdravljeni,\n\nv prilogi vam pošiljam pogodbo »${c.title}«. Prosim za pregled in podpis.\n\nLep pozdrav`)}>{L('Pošlji naročniku', 'Send to client')} <svg className="puscica-svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M7 17L17 7M8 7h9v9" /></svg></button>
                  <Link href={`${base}/kalkulator/pogodbe`} className="pw-det-uredi">{L('Odpri v Pogodbah', 'Open in Contracts')} <svg className="puscica-svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M7 17L17 7M8 7h9v9" /></svg></Link>
                </div>
              </>;
            })()}
            {tip === 'stroski' && (() => {
              const s = item as FlowExpense;
              return <>
                <p className={styles.eyebrow}>{L('STROŠEK', 'EXPENSE')}</p>
                <h2 id="pw-det-naslov">{s.title}</h2>
                <p className="pw-vsi-projekt">{selected.offer.title}</p>
                <div className="pw-det-meta"><span><small>{L('Kategorija', 'Category')}</small><strong>{s.category || L('Projektni strošek', 'Project expense')}</strong></span><span><small>{L('Znesek', 'Amount')}</small><strong>{money(s.amount)}</strong></span></div>
                <Link href={`${base}/kalkulator/stroski`} className="pw-det-uredi">{L('Uredi v Stroških', 'Edit in Expenses')} <svg className="puscica-svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M7 17L17 7M8 7h9v9" /></svg></Link>
              </>;
            })()}
            </div>
          </aside>
        </div>
      );
    })(), document.body)}

  </div>;
}
