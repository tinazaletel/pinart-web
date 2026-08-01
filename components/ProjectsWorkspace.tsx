'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { Plus, FolderOpen, TextB, TextItalic, ListBullets, LinkSimple, Tray, PaperPlaneTilt, NotePencil, Trash, MagnifyingGlass } from '@phosphor-icons/react';
import styles from '@/app/[locale]/kalkulator/pregled/pregled.module.css';
import ArhivFilter from '@/components/ArhivFilter';
import MetricIcon from '@/components/MetricIcon';
import { loadFlowData, loadProjectLinks, saveOfferAmount, saveOfferStatus, saveProjectLinks, type FlowClient, type FlowContract, type FlowExpense, type FlowInvoice, type FlowOffer, type FlowOfferStatus, type FlowProjectLink } from '@/lib/pinartFlowStore';
import { podatkiZaPredogled, usePredogled } from '@/lib/predogled';
import { preberiPostoProjekta, dodajPosto, type PostaVnos } from '@/lib/postaDnevnik';
import { pullProjectMail, pushProjectMail, saveDraft, trashProjectMail, restoreProjectMail, deleteProjectMailPermanent } from '@/lib/pinartMailCloud';
import { posljiMail } from '@/lib/posta';
import { fazaProjekta, preberiProjekti, shraniProjekt, type Projekt, type ProjektFaza, type ProjektStatus as ProjektEntitetaStatus } from '@/lib/projekti';
import { preberiSodelavci } from '@/lib/sodelavci';
import type { Sodelavec } from '@/lib/naloge';

/* datumski filter (samo od–do; prazno ne omejuje) — enako kot arhiv */
const vObdobju = (dateStr: string, od: string, doD: string): boolean => {
  if (!od && !doD) return true;
  const t = new Date(dateStr).getTime();
  if (isNaN(t)) return false;
  if (od && t < new Date(od + 'T00:00:00').getTime()) return false;
  if (doD && t > new Date(doD + 'T23:59:59').getTime()) return false;
  return true;
};

const statusLabel: Record<FlowOfferStatus, string> = { draft: 'Osnutek', sent: 'Čaka', accepted: 'Sprejeta', rejected: 'Zavrnjena' };
const money = (value: number) => `${value.toLocaleString('sl-SI', { maximumFractionDigits: 2 })} €`;
const datStr = (s: string) => { const d = new Date(s); return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('sl-SI'); };
const casStr = (s: string) => { const d = new Date(s); return isNaN(d.getTime()) ? '' : d.toLocaleTimeString('sl-SI', { hour: '2-digit', minute: '2-digit' }); };

/* status projekta (tabela) — izpeljano iz offer.status po ISTI logiki kot filter
   spodaj (aktivni=accepted, cakajo=sent, zakljuceni=rejected); tone usklajen s
   tem, kako je isti offer.status prikazan v zavihku Ponudbe (statusOdtenek v
   ArhivWorkspace), le "zakljuceni" tu pomeni uspešno zaključen projekt (success),
   ceprav je pod-podatkom "rejected" ponudba (obstoječa, nespremenjena logika). */
type Odtenek = 'success' | 'waiting' | 'danger' | 'neutral';
const projectStatusInfo = (status: FlowOfferStatus): { label: string; tone: Odtenek } => {
  if (status === 'accepted') return { label: 'Aktivni', tone: 'success' };
  if (status === 'sent') return { label: 'Čakajo', tone: 'waiting' };
  if (status === 'rejected') return { label: 'Zaključeni', tone: 'success' };
  return { label: 'Osnutek', tone: 'neutral' };
};

/* PRAVI projekti (lib/projekti, ustvarjeni prek "+ Nov projekt") nimajo ponudbe
   za sabo — za prikaz v isti tabeli/detajlu dobijo SINTETIČNO FlowOffer (glej
   gradiVnos spodaj). Status projekta se preslika na status ponudbe po ISTIH
   treh vedrih, ki jih ze uporablja filter zgoraj (Aktivni/Čakajo/Zaključeni),
   da sta tabela in filter brez dodatne logike takoj usklajena. Naslov strani
   (statusLabel) pa uporablja svoj, bolj natancen jezik za prave projekte. */
const projektDoOfferStatus: Record<ProjektEntitetaStatus, FlowOfferStatus> = { aktiven: 'accepted', pavza: 'sent', koncan: 'rejected' };
const projektStatusOznaka: Record<ProjektEntitetaStatus, string> = { aktiven: 'Aktiven', pavza: 'V pavzi', koncan: 'Končan' };

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
.pw-tabela{min-width:640px;display:grid;grid-template-columns:minmax(0,2.1fr) minmax(0,1.3fr) minmax(0,1fr) minmax(0,1.1fr) minmax(0,1fr) 1.6rem;background:oklch(98% .008 87 / .92);border:1px solid oklch(93% .006 82 / .55);border-radius:1.4rem;overflow:hidden}
.pw-tabela-naslov{grid-column:1 / -1;display:flex;align-items:center;justify-content:space-between;gap:1rem;padding:.95rem 1rem .85rem;background:oklch(95% .035 300);border-bottom:1px solid rgba(17,17,17,.08)}
.pw-tabela-naslov .${styles.eyebrow}{color:oklch(45% .12 300)}
.pw-tabela-naslov strong{font-family:var(--font-sans),system-ui,sans-serif;font-weight:500;font-size:1.6rem;line-height:1;color:var(--ink)}
.pw-tabela > header{display:grid;grid-template-columns:subgrid;grid-column:1 / -1;gap:1.1rem;padding:.75rem .9rem;font-size:.66rem;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);border-bottom:1px solid oklch(93% .006 82 / .55)}
.pw-vrstica{display:grid;grid-template-columns:subgrid;grid-column:1 / -1;align-items:center;gap:1.1rem;padding:.85rem .9rem;border:0;border-top:1px solid oklch(93% .006 82 / .55);background:transparent;font:inherit;color:var(--ink);text-align:left;cursor:pointer;transition:background .14s}
.pw-tabela > button.pw-vrstica:first-of-type{border-top:0}
.pw-vrstica:hover{background:oklch(100% 0 0 / .5)}
.pw-det-statusured,.pw-status-ured{position:relative;display:inline-flex;max-width:100%}
.pw-det-statusured[data-editable] .pw-status,.pw-status-ured[data-editable] .pw-status{cursor:pointer}
.pw-det-statusured[data-editable]::after,.pw-status-ured[data-editable]::after{content:none}
.pw-status-select{position:absolute;inset:0;width:100%;height:100%;margin:0;padding:0;opacity:0;border:0;border-radius:999px;background:transparent;cursor:pointer;appearance:none;-webkit-appearance:none;font:inherit}
.pw-status-select:disabled{cursor:default}
.pw-vrstica > span{min-width:0;font-size:.72rem;overflow-wrap:anywhere}
.pw-glavna{display:flex;align-items:center;gap:.6rem;min-width:0}
.pw-glavna strong{font-weight:700;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:.72rem}
.pw-ikona{display:grid;place-items:center;width:2rem;height:2rem;border-radius:50%;background:oklch(94% .045 295);color:var(--ink);flex:none}
.pw-mut{color:var(--muted)}
.pw-desno{text-align:right;font-weight:700}
.pw-kazalec{color:var(--muted);font-size:1.1rem;text-align:center}
.pw-status{display:inline-flex;align-items:center;gap:0;width:max-content;max-width:100%;padding:.4rem .85rem;border:1px solid oklch(86% .012 87);border-radius:999px;background:oklch(95% .01 87);color:oklch(40% .02 70);font-size:.78rem;font-weight:700;white-space:nowrap}
.pw-status .pw-pika{width:.55rem;height:.55rem;border-radius:50%;background:var(--pika,oklch(62% .02 70));flex:none}
.pw-status[data-tone='waiting']{--pika:oklch(72% .16 75)}
.pw-status[data-tone='success']{--pika:oklch(62% .15 150)}
.pw-status[data-tone='danger']{--pika:oklch(58% .19 25)}
.pw-status[data-tone='neutral']{--pika:oklch(62% .02 70)}
.pw-prazno{padding:2rem;color:var(--muted);font-size:.72rem;text-align:center;border:1px solid oklch(93% .006 82 / .55);border-radius:1.4rem;background:oklch(98% .008 87 / .92)}
.pw-stran{padding:1rem;scroll-margin-top:5.5rem}
.pw-nazaj{display:inline-flex;align-items:center;gap:.4rem;margin:0 0 .8rem;padding:.55rem .95rem;border:1px solid oklch(93% .006 82 / .55);border-radius:999px;background:oklch(98% .008 87 / .92);font:700 .62rem var(--font-sans),sans-serif;color:var(--ink);cursor:pointer}
.pw-nazaj:hover{background:var(--ink);color:var(--paper)}
.pw-narocnik-link{color:inherit;text-decoration:underline;text-underline-offset:2px;text-decoration-color:color-mix(in oklch,var(--ink) 35%,transparent)}
.pw-narocnik-link:hover{color:oklch(52% .17 300);text-decoration-color:currentColor}
@media (max-width:640px){
.pw-tabela{min-width:560px}
}
/* razdelki ZA 04 Stroški na detajlu projekta (05 Dokumentacija + placeholderji
   06 Komunikacije/07 Zapiski) — svoj pw- razdelek v duhu .projectNarrative
   kartic (isti border/radius/ozadje odtenek), da se lepo vklopi. */
.pw-dodatno{display:flex;flex-direction:column;gap:.55rem;margin-top:.55rem}
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
.pw-vsi-backdrop{justify-content:flex-end;background:oklch(22% .02 55 / .5);backdrop-filter:blur(9px) saturate(1.05);-webkit-backdrop-filter:blur(9px) saturate(1.05)}
/* panel: čist predal z DESNE (kot pogodba — seže do roba), flex-stolpec — glava fiksna, seznam drsi, paginacija lepljiva noga */
.pw-vsi-panel{width:min(46rem,100vw);height:100%;overflow:hidden;display:flex;flex-direction:column;box-shadow:-1.6rem 0 4rem oklch(20% .03 55 / .2);animation:pwVsiIn .52s cubic-bezier(.16,1,.3,1) both}
@keyframes pwVsiIn{from{transform:translateX(100%);opacity:.4}to{transform:translateX(0);opacity:1}}
@media (prefers-reduced-motion:reduce){.pw-vsi-panel{animation:none}}
.pw-vsi-panel h2{margin:.4rem 0 .2rem;font-family:var(--font-sans),system-ui,sans-serif;font-weight:600;font-size:clamp(1.6rem,3vw,2.2rem);line-height:1.05;color:var(--ink)}
.pw-vsi-projekt{margin:0 0 1.1rem;color:var(--muted);font-size:.72rem}
/* × zapri = na višini nadnaslova (eyebrow), enako v vseh panelih (slide + predogled računa/pogodbe/stroška) */
.pw-vsi-x{position:absolute;top:1.6rem;right:1.6rem;z-index:8;display:grid;place-items:center;width:2.2rem;height:2.2rem;padding:0;border:1px solid rgba(17,17,17,.18);border-radius:50%;background:var(--paper);color:var(--ink);font-size:1rem;line-height:1;cursor:pointer;box-shadow:0 4px 14px rgba(17,17,17,.12)}
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
.pw-vrstica-klik:hover{background:oklch(100% 0 0 / .28)}
.pw-vrstica-klik:focus-visible{outline:2px solid var(--akcent,#6E4FA6);outline-offset:2px}
/* PREDOGLED dokumenta (panel z desne) */
.pw-det-panel{width:min(42rem,100vw);animation:pwVsiIn .5s cubic-bezier(.16,1,.3,1) both}
.pw-det-panel h2{margin:.3rem 0 .1rem;font-family:var(--font-sans),system-ui,sans-serif;font-weight:600;font-size:clamp(1.5rem,3vw,2.1rem);line-height:1.05;color:var(--ink)}
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
.pw-posta-seznam{position:relative;z-index:1;list-style:none;display:flex;flex-direction:column;gap:.4rem;margin:.75rem 0 0;padding:0;max-height:19rem;overflow-y:auto}
.pw-posta-seznam li{display:grid;gap:.2rem;padding:.55rem .7rem;border:1px solid color-mix(in oklch,var(--ink) 8%,transparent);border-radius:.7rem;background:oklch(100% 0 0 / .55)}
.pw-posta-vrh{display:flex;align-items:baseline;justify-content:space-between;gap:.6rem}
.pw-posta-vrh b{font-size:.76rem;font-weight:700;color:var(--ink);overflow-wrap:anywhere}
.pw-posta-smer{flex:none;display:inline-flex;align-items:center;padding:.2rem .5rem;border-radius:999px;background:oklch(91% .05 165);color:oklch(40% .1 165);font-size:.52rem;font-weight:800;letter-spacing:.07em;text-transform:uppercase;white-space:nowrap}
.pw-posta-meta{color:var(--muted);font-size:.62rem;overflow-wrap:anywhere}
.pw-posta-prazno{position:relative;z-index:1;margin:.7rem 0 0;color:var(--muted);font-size:.7rem;line-height:1.5}
/* »Nova pošta« — gumb + sestavljalnik */
.pw-posta-glava{position:relative;z-index:1;display:flex;align-items:flex-start;justify-content:space-between;gap:.6rem}
.pw-posta-nova{flex:none;display:inline-flex;align-items:center;gap:.35rem;padding:.42rem .8rem;border:0;border-radius:999px;background:var(--ink);color:var(--paper);font:700 .66rem var(--font-sans),sans-serif;cursor:pointer;transition:transform .15s ease,box-shadow .15s ease}
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
.pw-pisi-status{margin:0;font-size:.68rem;color:var(--muted)}
.pw-pisi-akcije{display:flex;justify-content:flex-end;gap:.5rem}
.pw-pisi-preklic{padding:.45rem .9rem;border:1px solid color-mix(in oklch,var(--ink) 18%,transparent);border-radius:999px;background:none;font:700 .68rem var(--font-sans),sans-serif;color:var(--ink);cursor:pointer}
.pw-pisi-poslji{padding:.45rem 1.1rem;border:0;border-radius:999px;background:var(--ink);color:var(--paper);font:700 .68rem var(--font-sans),sans-serif;cursor:pointer}
.pw-pisi-poslji:disabled{opacity:.5;cursor:not-allowed}
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
.pw-vprasanje-vrstica span{font-size:.72rem;color:color-mix(in oklch,var(--ink) 62%,transparent)}
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
.pw-pipeline{display:flex;align-items:flex-start;gap:1.3rem;overflow-x:auto;padding:.15rem .15rem 1.2rem;-webkit-overflow-scrolling:touch}
.pw-pipeline-stolpec{flex:0 0 272px;width:272px;min-width:260px;max-width:300px;display:flex;flex-direction:column;gap:.7rem}
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
  /* PIPELINE POSLOV — pogled Seznam|Pipeline (glej pw-pipeline spodaj). ArhivWorkspace
     krmili od zunaj (pilula ob zavihkih), ce ni podano deluje samostojno (lastno stanje). */
  pogled?: 'seznam' | 'pipeline';
  onPogled?: (pogled: 'seznam' | 'pipeline') => void;
};

export default function ProjectsWorkspace({ base, zunanjiFilter, iskanje, onIskanje, status, onStatus, datumOd: datumOdZunaj, datumDo: datumDoZunaj, onDatumOd, onDatumDo, onDetajl, pogled: pogledZunaj, onPogled }: Props) {
  const [offers, setOffers] = useState<FlowOffer[]>([]); const [invoices, setInvoices] = useState<FlowInvoice[]>([]); const [expenses, setExpenses] = useState<FlowExpense[]>([]); const [contracts, setContracts] = useState<FlowContract[]>([]); const [amounts, setAmounts] = useState<Record<string, number>>({}); const [clients, setClients] = useState<FlowClient[]>([]);
  /* PRAVI projekti (lib/projekti) — locena shramba od Flow podatkov zgoraj, glej gradiVnos/realProjects spodaj */
  const [realProjekti, setRealProjekti] = useState<Projekt[]>([]);
  /* Demo/Prazno velja za vse strani — glej lib/predogled.ts */
  const [nacin] = usePredogled();
  const samoOgled = nacin !== 'mine';
  const [selectedId, setSelectedId] = useState('');
  /* samostojna raba (brez zunanjiFilter): lastno stanje orodne vrstice — fallback,
     ko iskanje/status/datum* niso podani od zunaj */
  const [notranjeIskanje, setNotranjeIskanje] = useState('');
  const [notranjiFilter, setNotranjiFilter] = useState<ProjektStatus>('vse');
  const [notranjiDatumOd, setNotranjiDatumOd] = useState(''); const [notranjiDatumDo, setNotranjiDatumDo] = useState('');
  const search = iskanje ?? notranjeIskanje;
  const setSearch = (v: string) => { if (onIskanje) onIskanje(v); else setNotranjeIskanje(v); };
  const filter = (status as ProjektStatus | undefined) ?? notranjiFilter;
  const setFilter = (v: ProjektStatus) => { if (onStatus) onStatus(v); else setNotranjiFilter(v); };
  const datumOd = datumOdZunaj ?? notranjiDatumOd;
  const setDatumOd = (v: string) => { if (onDatumOd) onDatumOd(v); else setNotranjiDatumOd(v); };
  const datumDo = datumDoZunaj ?? notranjiDatumDo;
  const setDatumDo = (v: string) => { if (onDatumDo) onDatumDo(v); else setNotranjiDatumDo(v); };
  /* ob nalaganju/menjavi predogleda ostane seznam (tabela) privzeti pogled —
     detajl se odpre le na eksplicit klik (selectProject spodaj) */
  useEffect(() => { const data = podatkiZaPredogled(nacin, loadFlowData()); const loaded = [...data.offers].sort((a, b) => b.date.localeCompare(a.date)); setOffers(loaded); setSelectedId(''); setInvoices(data.invoices); setExpenses(data.expenses); setContracts(data.contracts); setClients(data.clients); setAmounts(Object.fromEntries(data.offers.map(offer => [offer.id, offer.agreedAmount]))); setRealProjekti(nacin === 'mine' ? preberiProjekti() : []); setSodelavci(nacin === 'mine' ? preberiSodelavci() : []); }, [nacin]);
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
  const offerProjects = useMemo(() => offers.map(offer => gradiVnos(offer)), [offers, invoices, expenses, contracts, amounts]);
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
  /* PIPELINE POSLOV — kanban pogled (glej pw-pipeline v pwStyles). Stolpci po vrsti
     + locen, umirjen Izgubljeno na koncu (glej ProjektFaza v lib/projekti). */
  const PIPELINE_STOLPCI: { faza: ProjektFaza; naziv: string }[] = [
    { faza: 'lead', naziv: 'Lead' },
    { faza: 'ponudba', naziv: 'Ponudba' },
    { faza: 'pogodba', naziv: 'Pogodba' },
    { faza: 'delo', naziv: 'Delo' },
    { faza: 'racun', naziv: 'Račun' },
    { faza: 'zakljuceno', naziv: 'Zaključeno' },
  ];
  const PIPELINE_IZGUBLJENO: { faza: ProjektFaza; naziv: string } = { faza: 'izgubljeno', naziv: 'Izgubljeno' };
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
  /* projekt izpeljan iz ponudbe (ni pravega zapisa) -> status je status ponudbe */
  const naStatusOffer = (id: string, v: FlowOfferStatus) => {
    setOffers(prev => prev.map(o => (o.id === id ? { ...o, status: v } : o)));
    if (!samoOgled) saveOfferStatus(id, v);
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
  const [beriMail, setBeriMail] = useState<PostaVnos | null>(null);
  const [postaIsk, setPostaIsk] = useState('');
  const [postaOseba, setPostaOseba] = useState('');   /* filter po prejemniku (ko vec oseb na projektu) */
  /* »Nova pošta« — sestavljalnik neposredno v projektu (brez dokumenta). Pošlje
     prek Resend, zabeleži lokalno (postaDnevnik) + v oblak (pushProjectMail). */
  const [pisiOdprt, setPisiOdprt] = useState(false);
  const [pisiZa, setPisiZa] = useState('');
  const [pisiZadeva, setPisiZadeva] = useState('');
  const [pisiStatus, setPisiStatus] = useState('');
  const [pisiPosiljam, setPisiPosiljam] = useState(false);
  const pisiTeloRef = useRef<HTMLDivElement>(null);
  const [linkOznaka, setLinkOznaka] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [dodajOdprt, setDodajOdprt] = useState(false);
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
  const [vrsticaDetajl, setVrsticaDetajl] = useState<null | { tip: 'pogodbe' | 'racuni' | 'stroski'; item: FlowContract | FlowInvoice | FlowExpense }>(null);
  const klik = (tip: 'pogodbe' | 'racuni' | 'stroski', item: FlowContract | FlowInvoice | FlowExpense) => ({
    role: 'button' as const, tabIndex: 0,
    onClick: () => setVrsticaDetajl({ tip, item }),
    onKeyDown: (e: KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setVrsticaDetajl({ tip, item }); } },
  });
  /* pošlji dokument iz predogleda (mailto; prejemnik iz imenika po imenu stranke) — do Resend brez priponke */
  const strankaEmail = (ime: string) => { const c = (ime || '').trim().toLocaleLowerCase('sl-SI'); return clients.find(x => (x.name || '').trim().toLocaleLowerCase('sl-SI') === c)?.email || ''; };
  const posljiDokument = (ime: string, zadeva: string, telo: string) => { if (typeof window === 'undefined') return; window.location.href = `mailto:${encodeURIComponent(strankaEmail(ime))}?subject=${encodeURIComponent(zadeva)}&body=${encodeURIComponent(telo)}`; };
  /* ── »Nova pošta«: odpri sestavljalnik (prednapolni prejemnika iz stranke) ── */
  const odpriPisanje = () => {
    setPisiZa(strankaEmail(selected?.offer.client || ''));
    setPisiZadeva(selected ? `${selected.offer.title} — ` : '');
    setPisiStatus('');
    setPisiOdprt(true);
  };
  const oblikuj = (ukaz: string) => { document.execCommand(ukaz); pisiTeloRef.current?.focus(); };
  const vstaviPovezavo = () => { const url = window.prompt('Naslov povezave (https://…)'); if (url) document.execCommand('createLink', false, url); };
  const posljiPisanje = async () => {
    if (samoOgled || !selected) return;
    const za = pisiZa.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(za)) { setPisiStatus('Vpiši veljaven e-naslov prejemnika.'); return; }
    if (!pisiZadeva.trim()) { setPisiStatus('Vpiši zadevo.'); return; }
    const telo = (pisiTeloRef.current?.innerHTML || '').trim();
    if (!telo) { setPisiStatus('Vpiši sporočilo.'); return; }
    setPisiPosiljam(true); setPisiStatus('Pošiljam …');
    const html = `<div style="font-family:system-ui,-apple-system,'Segoe UI',sans-serif;font-size:15px;line-height:1.6;color:#1a1a1a">${telo}</div>`;
    /* »Odgovori-na« = tvoj pravi e-naslov (iz profila), da odgovori strank padejo
       tja (npr. tvoj Gmail), ne na pošiljno domeno pinartflow.com, kjer pošte ni. */
    let replyTo = '';
    try { replyTo = String(JSON.parse(localStorage.getItem('pinart-kalkulator-v2') || '{}').ponudnik?.email || ''); } catch { /* brez profila */ }
    const rez = await posljiMail({ to: [za], subject: pisiZadeva.trim(), html, replyTo: replyTo || undefined });
    setPisiPosiljam(false);
    if (rez.ok) {
      const vnos = dodajPosto({ projectId: selectedId, smer: 'poslano', prejemniki: [za], zadeva: pisiZadeva.trim() });
      void pushProjectMail({ projectExternalId: selectedId, direction: 'out', toEmails: [za], subject: pisiZadeva.trim(), occurredAt: new Date().toISOString() }).catch(() => undefined);
      setPosta(p => [vnos, ...p]);
      setPisiOdprt(false); setPisiZadeva(''); if (pisiTeloRef.current) pisiTeloRef.current.innerHTML = '';
    } else {
      setPisiStatus('Napaka: ' + (rez.napaka || 'pošiljanje ni uspelo.'));
    }
  };
  /* ob odprtju sestavljalnika prednapolni telo s podpisom (iz profila, localStorage).
     Vstavi se kot NAVADNO besedilo — email v podpisu NI klikabilen (ne ovijemo v
     mailto), da stranke raje kliknejo »Odgovori«. Kurzor postavimo na vrh. */
  useEffect(() => {
    if (!pisiOdprt) return;
    const el = pisiTeloRef.current;
    if (!el) return;
    let podpis = '';
    try { podpis = String(JSON.parse(localStorage.getItem('pinart-kalkulator-v2') || '{}').podpisMaila || ''); } catch { /* brez podpisa */ }
    const varno = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    el.innerHTML = podpis.trim() ? `<div><br></div><div style="color:#777">${varno(podpis).replace(/\n/g, '<br>')}</div>` : '';
    el.focus();
    try { const sel = window.getSelection(); const range = document.createRange(); range.setStart(el, 0); range.collapse(true); sel?.removeAllRanges(); sel?.addRange(range); } catch { /* fokus ni ključen */ }
  }, [pisiOdprt]);
  /* V predogledu (demo) pokažemo primere povezav, da se vidi poln videz razdelka;
     v pravem računu beremo dejansko shranjene povezave. */
  useEffect(() => {
    const demo: FlowProjectLink[] = [
      { oznaka: 'Figma · Dizajn', url: 'https://figma.com' },
      { oznaka: 'Miro · Moodboard', url: 'https://miro.com' },
      { oznaka: 'Drive · Gradiva', url: 'https://drive.google.com' },
    ];
    setLinks(samoOgled ? demo : (selectedId ? loadProjectLinks(selectedId) : []));
    /* vzorčna pošta za predogled — deterministična, datumi nekaj dni nazaj */
    const preDnevi = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString(); };
    const demoPosta: PostaVnos[] = [
      { id: 'demo-posta-1', projectId: selectedId, smer: 'poslano', prejemniki: ['info@volkbabica.si'], zadeva: 'Ponudba — Volk & Babica d.o.o.', datum: preDnevi(2) },
      { id: 'demo-posta-2', projectId: selectedId, smer: 'poslano', prejemniki: ['ana@volkbabica.si', 'racuni@volkbabica.si'], zadeva: 'Pogodba o sodelovanju', datum: preDnevi(6) },
      { id: 'demo-posta-3', projectId: selectedId, smer: 'poslano', prejemniki: ['info@volkbabica.si'], zadeva: 'Račun R-2026-014', datum: preDnevi(13) },
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
            telo: m.bodyHtml || m.bodyText,
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
  const racunVrstica = (item: FlowInvoice) => { const kaj = racunKaj(item); return <span key={item.id} className="pw-racun-v pw-vrstica-klik" {...klik('racuni', item)}><span className="pw-racun-l"><b>Račun {item.number || ''}</b>{kaj && <small>{kaj}</small>}</span><span className="pw-racun-d"><i className="pw-status" data-tone={item.paid ? 'success' : 'waiting'}><i aria-hidden style={pikaStil(item.paid ? 'success' : 'waiting')} />{item.paid ? 'Plačan' : 'Odprt'}</i><strong>{money(item.amount)}</strong></span></span>; };
  const strosekVrstica = (item: FlowExpense) => <span key={item.id} className="pw-racun-v pw-vrstica-klik" {...klik('stroski', item)}><span className="pw-racun-l"><b>{item.title}</b><small>{item.category || 'Projektni strošek'}</small></span><span className="pw-racun-d"><strong>{money(item.amount)}</strong></span></span>;
  /* iskalno besedilo za slide (naziv/številka/opis/kategorija) — malo, da . includes() dela brez razlik velikih/malih črk */
  const pogodbaTekst = (item: FlowContract) => `${item.title} ${item.status}`.toLocaleLowerCase('sl-SI');
  const racunTekst = (item: FlowInvoice) => `${item.number || ''} ${racunKaj(item)} ${item.paid ? 'plačan' : 'odprt'}`.toLocaleLowerCase('sl-SI');
  const strosekTekst = (item: FlowExpense) => `${item.title} ${item.category || ''}`.toLocaleLowerCase('sl-SI');
  /* podatki za odprti SLIDE: naslov + filtriran+paginiran seznam trenutno izbranega tipa */
  const NA_STRAN = 12;
  const vsiEyebrow = vsiOdprt === 'pogodbe' ? 'VSE POGODBE' : vsiOdprt === 'racuni' ? 'VSI RAČUNI' : 'VSI STROŠKI';
  const vsiNaslov = vsiOdprt === 'pogodbe' ? 'Vse pogodbe' : vsiOdprt === 'racuni' ? 'Vsi računi' : 'Vsi stroški';
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
  };

  return <div className={styles.projectsPage}><style dangerouslySetInnerHTML={{ __html: overflowFix + pwStyles }} />
    {!selected && !zunanjiFilter && <ArhivFilter
      iskanje={search}
      onIskanje={setSearch}
      placeholder="Poišči projekt, stranko ali številko ponudbe …"
      datumOd={datumOd}
      datumDo={datumDo}
      onDatumOd={setDatumOd}
      onDatumDo={setDatumDo}
      statusOznaka="Stanje projekta"
      statusVrednost={filter}
      onStatus={v => setFilter(v as ProjektStatus)}
      statusOpcije={[{ vrednost: 'vse', oznaka: 'Vsi' }, { vrednost: 'aktivni', oznaka: 'Aktivni' }, { vrednost: 'cakajo', oznaka: 'Čakajo' }, { vrednost: 'zakljuceni', oznaka: 'Zaključeni' }]}
      aktivnihFiltrov={(filter !== 'vse' ? 1 : 0) + (datumOd || datumDo ? 1 : 0)}
      onPocisti={() => { setFilter('vse'); setDatumOd(''); setDatumDo(''); }}
      akcija={<>
        <Link className="af-akcija-gumb" href={`${base}/kalkulator/orodje`}>+ Nova ponudba</Link>
        <Link className="af-akcija-gumb" href={`${base}/kalkulator/nov-projekt`}>+ Nov projekt</Link>
      </>}
    />}

    {/* preklop Seznam|Pipeline — v produkciji izrise ta pilulo ArhivWorkspace (arh-pogled-preklop);
        tu samo za samostojno rabo (zunanjiFilter=false), da API pogled/onPogled dela tudi brez Arhiva */}
    {!selected && !zunanjiFilter && (
      <div className="pw-pogled-preklop" role="tablist" aria-label="Pogled projektov">
        <button type="button" role="tab" aria-selected={pogled === 'seznam'} className={pogled === 'seznam' ? 'on' : ''} onClick={() => setPogled('seznam')}>Seznam</button>
        <button type="button" role="tab" aria-selected={pogled === 'pipeline'} className={pogled === 'pipeline' ? 'on' : ''} onClick={() => setPogled('pipeline')}>Pipeline</button>
      </div>
    )}

    {!selected ? (
      projects.length === 0 ? (
        <div className={styles.projectStoryEmpty}><span><svg className="puscica-svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M7 17L17 7M8 7h9v9" /></svg></span><strong>Najprej ustvari ponudbo.</strong><p>Ta bo postala osnova projekta in povezala vse nadaljnje dokumente.</p></div>
      ) : (
        <div className="pw-seznam">
          {pogled === 'pipeline' ? (
            <>
              {samoOgled && <p className="pw-pipeline-namig">Premikanje kartic med fazami je v predogledu (demo) onemogočeno — prijavi se v svoj račun.</p>}
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
                              title={!project.real ? 'Izpeljano iz ponudbe — ni vlečljivo' : (samoOgled ? 'V predogledu premikanje ni na voljo' : undefined)}
                            >
                              <strong>{project.offer.title}</strong>
                              <span className="pw-mut">{project.offer.client || 'Brez stranke'}</span>
                              <span className="pw-posel-spodaj">
                                <span className="pw-posel-vrednost">{project.agreed ? money(project.agreed) : '—'}</span>
                                <i className="pw-posel-pika" data-tone={info.tone} aria-hidden />
                              </span>
                            </div>
                          );
                        }) : <p className="pw-pipeline-prazno">Prazno.</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : visible.length ? (
            <div className="pw-tabela-ovoj">
              <div className="pw-tabela">
                {/* naslov + stevec sta DEL tabele (znotraj okvirja), ne lebdita nad njo */}
                <div className="pw-tabela-naslov"><p className={styles.eyebrow}>PROJEKTI</p><strong>{visible.length}</strong></div>
                <header><span>Projekt</span><span>Stranka</span><span>Datum</span><span>Status</span><span className="pw-desno">Vrednost</span><span /></header>
                {visible.map(project => { const info = projectStatusInfo(project.offer.status); return (
                  <button key={project.offer.id} type="button" className="pw-vrstica" onClick={() => selectProject(project.offer.id)}>
                    <span className="pw-glavna"><span className="pw-ikona" aria-hidden><FolderOpen size={17} /></span><strong>{project.offer.title}</strong></span>
                    <span className="pw-mut">{project.offer.client}</span>
                    <span className="pw-mut">{datStr(project.offer.date)}</span>
                    <span><span className="pw-status-ured" data-editable="" title="Spremeni status" onClick={e => e.stopPropagation()}>
                      <span className="pw-status" data-tone={info.tone} style={{ display: 'inline-flex', alignItems: 'center', flexWrap: 'nowrap', whiteSpace: 'nowrap' }}><i aria-hidden style={pikaStil(info.tone)} />{project.real ? projektStatusOznaka[project.real.status] : statusLabel[project.offer.status]}<svg width="9" height="9" viewBox="0 0 12 8" fill="none" aria-hidden style={{ marginLeft: '.45rem', flex: 'none', opacity: .55 }}><path d="M1 1.5l5 5 5-5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg></span>
                      {project.real
                        ? <select className="pw-status-select" aria-label="Spremeni status projekta" value={project.real.status} onChange={e => naStatusProjekt(project.real!, e.target.value as ProjektEntitetaStatus)}>{(Object.entries(projektStatusOznaka) as Array<[ProjektEntitetaStatus, string]>).map(([v, label]) => <option key={v} value={v}>{label}</option>)}</select>
                        : <select className="pw-status-select" aria-label="Spremeni status" value={project.offer.status} onChange={e => naStatusOffer(project.offer.id, e.target.value as FlowOfferStatus)}>{(Object.entries(statusLabel) as Array<[FlowOfferStatus, string]>).map(([v, label]) => <option key={v} value={v}>{label}</option>)}</select>}
                    </span></span>
                    <span className="pw-desno">{project.agreed ? money(project.agreed) : '—'}</span>
                    <span className="pw-kazalec" aria-hidden>›</span>
                  </button>
                ); })}
              </div>
            </div>
          ) : <p className="pw-prazno">Ni projektov v tem pogledu.</p>}
        </div>
      )
    ) : (
      <section ref={storyRef} className={`${styles.projectStory} pw-stran`}>
        <button type="button" className="pw-nazaj" onClick={goBack} aria-label="Nazaj na seznam projektov"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M19 12H5M11 18l-6-6 6-6" /></svg> Nazaj</button>
        <header><div><p className={styles.eyebrow}>PROJEKT · {selected.offer.number || 'BREZ ŠTEVILKE'}</p><h2>{selected.offer.title}</h2><span><Link href={`${base}/kalkulator/stranke?stranka=${encodeURIComponent(selected.offer.client)}`} className="pw-narocnik-link">{selected.offer.client}</Link> · {new Date(selected.offer.date).toLocaleDateString('sl-SI')}</span></div><span className="pw-det-statusured" data-editable="" title="Spremeni status">
          <span className="pw-status" data-tone={projectStatusInfo(selected.offer.status).tone} style={{ display: 'inline-flex', alignItems: 'center', flexWrap: 'nowrap', whiteSpace: 'nowrap' }}><i aria-hidden style={pikaStil(projectStatusInfo(selected.offer.status).tone)} />{selected.real ? projektStatusOznaka[selected.real.status] : statusLabel[selected.offer.status]}<svg width="9" height="9" viewBox="0 0 12 8" fill="none" aria-hidden style={{ marginLeft: '.45rem', flex: 'none', opacity: .55 }}><path d="M1 1.5l5 5 5-5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg></span>
          {selected.real
            ? <select className="pw-status-select" aria-label="Spremeni status projekta" value={selected.real.status} onChange={event => naStatusProjekt(selected.real!, event.target.value as ProjektEntitetaStatus)}>{(Object.entries(projektStatusOznaka) as Array<[ProjektEntitetaStatus, string]>).map(([v, label]) => <option key={v} value={v}>{label}</option>)}</select>
            : <select className="pw-status-select" aria-label="Spremeni status" value={selected.offer.status} onChange={event => naStatusOffer(selected.offer.id, event.target.value as FlowOfferStatus)}>{(Object.entries(statusLabel) as Array<[FlowOfferStatus, string]>).map(([v, label]) => <option key={v} value={v}>{label}</option>)}</select>}
        </span></header>
        <div className={styles.projectMoney}><label><small>Dogovorjena vrednost</small><span><input type="number" min="0" step="0.01" value={selected.agreed || ''} onChange={event => saveAmount(selected.offer.id, Number(event.target.value))} /> €</span><b className={styles.subpageMetricIcon}><MetricIcon type="document" /></b></label><span><small>Zaračunano</small><strong>{money(selected.billed)}</strong><b className={styles.subpageMetricIcon}><MetricIcon type="paid" /></b></span><span className={selected.unbilled > 0 ? styles.projectNeedsInvoice : ''}><small>Še ni zaračunano</small><strong>{selected.agreed ? money(selected.unbilled) : '—'}</strong><b className={styles.subpageMetricIcon}><MetricIcon type="cost" /></b></span><span><small>Ocenjeni rezultat</small><strong>{money(selected.profit)}</strong><b className={styles.subpageMetricIcon}><MetricIcon type="profit" /></b></span></div>
        <div style={{ display: 'flex', gap: '.55rem', alignItems: 'stretch', flexWrap: 'wrap', margin: '.55rem 0 0' }}>
        {selected.real && (
          <article className="pw-karta pw-cilji" style={{ flex: '1 1 300px', minWidth: 0, margin: 0 }}>
            <p className={styles.eyebrow}>00 · CILJI IN ŽELJE</p>
            <h3>Kaj si stranka želi doseči?</h3>
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
            ) : (!selected.real.zelje && !(selected.real.opisStranke || selected.real.panoga || selected.real.ciljnaSkupina || selected.real.dizajnZelje || selected.real.voice || selected.real.konkurenca) && <p className="pw-cilji-prazno">Želje in cilji še niso dodani.</p>)}
            {(selected.real.opisStranke || selected.real.panoga || selected.real.ciljnaSkupina || selected.real.dizajnZelje || selected.real.voice || selected.real.konkurenca) && (<>
              <p className="pw-cilji-podnaslov">Brief</p>
              <div className="pw-cilji-vprasanja">
                {selected.real.opisStranke && <div className="pw-vprasanje-vrstica"><div><b>Stranka</b><span>{selected.real.opisStranke}</span></div></div>}
                {selected.real.panoga && <div className="pw-vprasanje-vrstica"><div><b>Panoga</b><span>{selected.real.panoga}</span></div></div>}
                {selected.real.ciljnaSkupina && <div className="pw-vprasanje-vrstica"><div><b>Persona</b><span>{selected.real.ciljnaSkupina}</span></div></div>}
                {selected.real.dizajnZelje && <div className="pw-vprasanje-vrstica"><div><b>Dizajn</b><span>{selected.real.dizajnZelje}</span></div></div>}
                {selected.real.voice && <div className="pw-vprasanje-vrstica"><div><b>Voice</b><span>{selected.real.voice}</span></div></div>}
                {selected.real.konkurenca && <div className="pw-vprasanje-vrstica"><div><b>Konkurenca</b><span>{selected.real.konkurenca}</span></div></div>}
              </div>
            </>)}
            {selected.real.dodatnaVprasanja && selected.real.dodatnaVprasanja.length > 0 && (<>
              <p className="pw-cilji-podnaslov">Dodatna vprašanja</p>
              <div className="pw-cilji-vprasanja">
                {selected.real.dodatnaVprasanja.map(v => (
                  <div key={v.id} className="pw-vprasanje-vrstica"><div><b>{v.vprasanje}</b><span>{v.odgovor}</span></div></div>
                ))}
              </div>
            </>)}
            {selected.real.dodeljeni && selected.real.dodeljeni.length > 0 && (<>
              <p className="pw-cilji-podnaslov">Dodeljeni</p>
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
        <article className={styles.projectAgreement} style={{ position: 'relative', flex: '1 1 300px', minWidth: 0, display: 'flex', flexDirection: 'column', padding: '1rem', border: '1px solid color-mix(in oklch, var(--ink) 4%, transparent)', borderRadius: '1rem', background: 'linear-gradient(135deg, oklch(97% .025 295), oklch(97% .025 165))', overflow: 'hidden' }}><p className={styles.eyebrow}>01 · DOGOVORJENO</p><h3>Kaj je bilo v ponudbi?</h3>{selected.offer.scope.length ? <ul>{selected.offer.scope.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ul> : selected.real ? <p>Ta projekt še nima ponudbe. Pripravi jo v kalkulatorju, ko bo obseg jasen.</p> : <p>Starejša ponudba nima strukturiranega obsega. Odpri jo v kalkulatorju za celotno besedilo.</p>}<Link href={`${base}/kalkulator/orodje?od=pregled`} aria-label="Ustvari ponudbo za ta projekt" title="Ustvari ponudbo"><Plus size={18} weight="bold" /></Link></article></div><div className={styles.projectNarrative}><article style={{ background: 'linear-gradient(140deg, oklch(96% .035 160), oklch(88% .075 163))' }}><p className={styles.eyebrow}>02 · POGODBE</p><h3>{selected.contracts.length ? `${selected.contracts.length} povezanih` : 'Brez pogodbe'}</h3>{pogodbeSort.slice(0, NAJNOVEJSIH).map(pogodbaVrstica)}{pogodbeSort.length > NAJNOVEJSIH && <button type="button" className="pw-vec" onClick={() => openVsi('pogodbe')}>Prikaži vse ({pogodbeSort.length}) →</button>}<Link href={`${base}/kalkulator/pogodbe`} aria-label="Dodaj pogodbo za ta projekt"><Plus size={18} weight="bold" /></Link></article><article style={{ background: 'linear-gradient(140deg, oklch(96% .035 295), oklch(88% .075 297))' }}><p className={styles.eyebrow}>03 · RAČUNI</p><h3>{money(selected.billed)}</h3>{racuniSort.slice(0, NAJNOVEJSIH).map(racunVrstica)}{racuniSort.length > NAJNOVEJSIH && <button type="button" className="pw-vec" onClick={() => openVsi('racuni')}>Prikaži vse ({racuniSort.length}) →</button>}<Link href={`${base}/kalkulator/racuni`} aria-label="Dodaj račun za ta projekt"><Plus size={18} weight="bold" /></Link></article><article style={{ background: 'linear-gradient(140deg, oklch(97% .03 65), oklch(89% .075 60))' }}><p className={styles.eyebrow}>04 · STROŠKI</p><h3>{money(selected.costs)}</h3>{strosekSort.slice(0, NAJNOVEJSIH).map(strosekVrstica)}{strosekSort.length > NAJNOVEJSIH && <button type="button" className="pw-vec" onClick={() => openVsi('stroski')}>Prikaži vse ({strosekSort.length}) →</button>}<Link href={`${base}/kalkulator/stroski`} aria-label="Dodaj strošek za ta projekt"><Plus size={18} weight="bold" /></Link></article><article className="pw-karta pw-dokumentacija"><p className={styles.eyebrow}>05 · DOKUMENTACIJA</p><h3>Povezave do zunanjih datotek</h3>{links.length ? (<div className="pw-linki">{links.map((link, index) => (<div key={`${link.url}-${index}`} className="pw-link-vrstica"><a href={link.url} target="_blank" rel="noopener noreferrer">{link.oznaka}</a>{!samoOgled && <button type="button" className="pw-link-brisi" onClick={() => removeLink(index)} aria-label={`Izbriši povezavo ${link.oznaka}`}>×</button>}</div>))}</div>) : <p className="pw-link-prazno">Še ni dodanih povezav.</p>}{!samoOgled && dodajOdprt && (<div className="pw-link-obrazec"><input type="text" value={linkOznaka} onChange={event => setLinkOznaka(event.target.value)} placeholder="npr. Figma" aria-label="Oznaka povezave" /><input type="url" value={linkUrl} onChange={event => setLinkUrl(event.target.value)} placeholder="https://…" aria-label="Naslov povezave (Figma, Miro, IDD, mapa Drive …)" /><button type="button" className="pw-link-dodaj" onClick={addLink} disabled={!linkOznaka.trim() || !linkUrl.trim()}>+ Dodaj povezavo</button></div>)}{samoOgled && dodajOdprt && <p className="pw-opozorilo">Dodajanje povezav ni na voljo v predogledu (demo). Prijavi se v svoj račun.</p>}<button type="button" className="pw-dok-dodaj" onClick={() => setDodajOdprt(open => !open)} aria-label={dodajOdprt ? 'Zapri dodajanje povezave' : 'Dodaj povezavo'}><Plus size={16} weight="bold" /></button></article></div>

        <div className="pw-dodatno">
          <article className="pw-karta pw-posta">
            <div className="pw-posta-glava">
              <div><p className={styles.eyebrow}>06 · KOMUNIKACIJE</p><h3>Vse na enem mestu</h3></div>
              {!beriMail && posta.length > 0 && (
                <div style={{ position: 'relative', flex: '0 1 320px', margin: '0 auto 0 1rem' }}>
                  <MagnifyingGlass size={15} weight="bold" style={{ position: 'absolute', left: '.65rem', top: '50%', transform: 'translateY(-50%)', color: 'color-mix(in oklch, var(--ink) 45%, transparent)', pointerEvents: 'none' }} />
                  <input value={postaIsk} onChange={e => setPostaIsk(e.target.value)} placeholder="Išči po zadevi ali naslovu …" style={{ width: '100%', boxSizing: 'border-box', padding: '.42rem .7rem .42rem 2rem', border: '1px solid color-mix(in oklch, var(--ink) 5%, transparent)', borderRadius: '.6rem', background: 'oklch(100% 0 0 / .55)', font: '500 .8rem var(--font-sans), sans-serif', color: 'var(--ink)' }} />
                </div>
              )}
              <button type="button" className="pw-posta-nova" disabled={samoOgled} title={samoOgled ? 'Na voljo v načinu »Moji podatki« — zdaj gledaš predogled' : 'Napiši sporočilo stranki'} onClick={odpriPisanje}>✎ Nova pošta</button>
            </div>
            {pisiOdprt && !samoOgled && (
              <div className="pw-pisi">
                <label className="pw-pisi-v"><span>Za</span><input type="email" value={pisiZa} onChange={e => setPisiZa(e.target.value)} placeholder="stranka@email.si" /></label>
                <label className="pw-pisi-v"><span>Zadeva</span><input type="text" value={pisiZadeva} onChange={e => setPisiZadeva(e.target.value)} placeholder="Zadeva sporočila" /></label>
                <div className="pw-pisi-orodja">
                  <button type="button" onMouseDown={e => { e.preventDefault(); oblikuj('bold'); }} title="Krepko" aria-label="Krepko"><TextB size={15} weight="bold" /></button>
                  <button type="button" onMouseDown={e => { e.preventDefault(); oblikuj('italic'); }} title="Ležeče" aria-label="Ležeče"><TextItalic size={15} weight="bold" /></button>
                  <button type="button" onMouseDown={e => { e.preventDefault(); oblikuj('insertUnorderedList'); }} title="Označen seznam" aria-label="Označen seznam"><ListBullets size={15} weight="bold" /></button>
                  <button type="button" onMouseDown={e => { e.preventDefault(); vstaviPovezavo(); }} title="Povezava" aria-label="Povezava"><LinkSimple size={15} weight="bold" /></button>
                </div>
                <div className="pw-pisi-telo" ref={pisiTeloRef} contentEditable suppressContentEditableWarning role="textbox" aria-label="Besedilo sporočila" data-placeholder="Napiši sporočilo …" />
                {pisiStatus && <p className="pw-pisi-status">{pisiStatus}</p>}
                <div className="pw-pisi-akcije">
                  <button type="button" className="pw-pisi-preklic" onClick={() => setPisiOdprt(false)}>Prekliči</button>
                  <button type="button" className="pw-pisi-preklic" onClick={() => {
                    const za = pisiZa.trim(); const zadeva = pisiZadeva.trim(); const telo = pisiTeloRef.current?.innerHTML || '';
                    if (!selectedId || (!za && !zadeva && !telo.replace(/<[^>]+>/g, '').trim())) { setPisiOdprt(false); return; }
                    const id = crypto.randomUUID(); const now = new Date().toISOString();
                    setPosta(p => [{ id, projectId: selectedId, smer: 'poslano', prejemniki: za ? [za] : [], zadeva, datum: now, telo, osnutek: true } as PostaVnos, ...p]);
                    void saveDraft({ id, projectExternalId: selectedId, direction: 'out', toEmails: za ? [za] : [], subject: zadeva, bodyHtml: telo, isDraft: true, occurredAt: now }).catch(() => undefined);
                    setPisiOdprt(false); setMapa('osnutki'); setBeriMail(null);
                  }}>Shrani osnutek</button>
                  <button type="button" className="pw-pisi-poslji" disabled={pisiPosiljam} onClick={posljiPisanje}>{pisiPosiljam ? 'Pošiljam …' : 'Pošlji'}</button>
                </div>
              </div>
            )}
            <div style={{ position: 'relative', zIndex: 1, display: 'flex', gap: '1rem', alignItems: 'flex-start', margin: '.75rem 0 0' }}>
              <div className="pw-posta-mape" style={{ flex: 'none', width: 138, display: 'flex', flexDirection: 'column', gap: '.25rem' }}>
              {([{ id: 'prejeto', ime: 'Prejeto', Ikona: Tray }, { id: 'poslano', ime: 'Poslano', Ikona: PaperPlaneTilt }, { id: 'osnutki', ime: 'Osnutki', Ikona: NotePencil }, { id: 'kos', ime: 'Koš', Ikona: Trash }] as const).map(({ id, ime, Ikona }) => {
                const st = posta.filter(v => (v.izbrisano ? 'kos' : v.osnutek ? 'osnutki' : v.smer === 'poslano' ? 'poslano' : 'prejeto') === id).length;
                const on = mapa === id;
                return <button key={id} type="button" onClick={() => { setMapa(id); setBeriMail(null); }} style={{ display: 'flex', alignItems: 'center', gap: '.5rem', width: '100%', textAlign: 'left', border: 'none', background: on ? 'color-mix(in oklch, var(--ink) 9%, transparent)' : 'transparent', color: 'var(--ink)', borderRadius: '.6rem', padding: '.5rem .7rem', font: `${on ? 700 : 500} .78rem var(--font-sans), sans-serif`, cursor: 'pointer' }}><Ikona size={16} weight={on ? 'fill' : 'regular'} /><span style={{ flex: 1 }}>{ime}</span>{st ? <span style={{ fontWeight: 700, opacity: .55 }}>{st}</span> : null}</button>;
              })}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
              {(() => {
                const osebe = Array.from(new Set(posta.flatMap(v => v.prejemniki).filter(Boolean)));
                return osebe.length > 1 ? (
                  <select value={postaOseba} onChange={e => setPostaOseba(e.target.value)} aria-label="Filter po prejemniku" style={{ display: 'block', margin: '0 0 .5rem auto', border: `1px solid ${postaOseba ? 'var(--ink)' : 'color-mix(in oklch, var(--ink) 14%, transparent)'}`, background: postaOseba ? 'var(--ink)' : 'transparent', color: postaOseba ? 'var(--paper)' : 'var(--ink)', borderRadius: '999px', padding: '.28rem .72rem', font: '700 .66rem var(--font-sans), sans-serif', cursor: 'pointer', maxWidth: '70%' }}>
                    <option value="" style={{ color: 'var(--ink)', background: 'var(--paper)' }}>Vsi prejemniki</option>
                    {osebe.map(o => <option key={o} value={o} style={{ color: 'var(--ink)', background: 'var(--paper)' }}>{o}</option>)}
                  </select>
                ) : null;
              })()}
            {beriMail ? (
              <div style={{ position: 'relative', zIndex: 1, margin: '.75rem 0 0', padding: '.9rem', border: '1px solid color-mix(in oklch, var(--ink) 5%, transparent)', borderRadius: '.85rem', background: 'oklch(100% 0 0 / .72)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '.5rem', flexWrap: 'wrap', marginBottom: '.55rem' }}>
                  <button type="button" onClick={() => setBeriMail(null)} style={{ border: 0, background: 'none', color: 'var(--ink)', font: '700 .7rem var(--font-sans), sans-serif', cursor: 'pointer', padding: 0 }}>← Nazaj na seznam</button>
                  {!samoOgled && <div style={{ display: 'flex', gap: '.45rem' }}>
                    {beriMail.izbrisano ? <>
                      <button type="button" onClick={() => { const id = beriMail.id; void restoreProjectMail(id).catch(() => undefined); setPosta(p => p.map(v => v.id === id ? { ...v, izbrisano: undefined } : v)); setBeriMail(null); }} style={{ border: '1px solid var(--ink)', background: 'none', color: 'var(--ink)', borderRadius: '999px', padding: '.24rem .7rem', font: '700 .64rem var(--font-sans), sans-serif', cursor: 'pointer' }}>Obnovi</button>
                      <button type="button" onClick={() => { const id = beriMail.id; void deleteProjectMailPermanent(id).catch(() => undefined); setPosta(p => p.filter(v => v.id !== id)); setBeriMail(null); }} style={{ border: '1px solid oklch(58% .18 25)', background: 'none', color: 'oklch(52% .18 25)', borderRadius: '999px', padding: '.24rem .7rem', font: '700 .64rem var(--font-sans), sans-serif', cursor: 'pointer' }}>Zbriši dokončno</button>
                    </> : <button type="button" onClick={() => { const id = beriMail.id; void trashProjectMail(id).catch(() => undefined); setPosta(p => p.map(v => v.id === id ? { ...v, izbrisano: new Date().toISOString() } : v)); setBeriMail(null); }} style={{ display: 'inline-flex', alignItems: 'center', gap: '.3rem', border: '1px solid color-mix(in oklch, var(--ink) 20%, transparent)', background: 'none', color: 'var(--ink)', borderRadius: '999px', padding: '.24rem .7rem', font: '700 .64rem var(--font-sans), sans-serif', cursor: 'pointer' }}><Trash size={13} weight="bold" /> V koš</button>}
                  </div>}
                </div>
                <b style={{ display: 'block', fontSize: '.92rem' }}>{beriMail.zadeva || '(brez zadeve)'}</b>
                <small style={{ display: 'block', color: 'var(--muted)', margin: '.15rem 0 .7rem' }}>{beriMail.prejemniki.join(', ')} · {datStr(beriMail.datum)}</small>
                {beriMail.telo
                  ? (beriMail.smer === 'prejeto'
                      ? <div style={{ whiteSpace: 'pre-wrap', fontSize: '.85rem', lineHeight: 1.55 }}>{beriMail.telo.replace(/<[^>]+>/g, ' ')}</div>
                      : <div style={{ fontSize: '.85rem', lineHeight: 1.55 }} dangerouslySetInnerHTML={{ __html: beriMail.telo }} />)
                  : <p style={{ color: 'var(--muted)', fontSize: '.82rem' }}>To sporočilo nima shranjenega besedila (starejši/lokalni zapis).</p>}
              </div>
            ) : (() => {
              const q = postaIsk.trim().toLowerCase();
              const seznam = posta.filter(v => (v.izbrisano ? 'kos' : v.osnutek ? 'osnutki' : v.smer === 'poslano' ? 'poslano' : 'prejeto') === mapa).filter(v => !q || `${v.zadeva} ${v.prejemniki.join(' ')}`.toLowerCase().includes(q)).filter(v => !postaOseba || v.prejemniki.includes(postaOseba));
              return seznam.length ? (
                <ul className="pw-posta-seznam">
                  {seznam.map(vnos => (
                    <li key={vnos.id} onClick={() => setBeriMail(vnos)} style={{ cursor: 'pointer', border: '1px solid color-mix(in oklch, var(--ink) 4%, transparent)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '.6rem', alignItems: 'baseline' }}>
                        <b style={{ fontSize: '.82rem', fontWeight: 700, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{vnos.prejemniki.join(', ') || '—'}</b>
                        <small style={{ flex: 'none', color: 'var(--muted)', fontSize: '.66rem' }}>{datStr(vnos.datum)}{casStr(vnos.datum) ? ` · ${casStr(vnos.datum)}` : ''}</small>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '.5rem', alignItems: 'baseline' }}>
                        <span style={{ fontSize: '.8rem', color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{vnos.zadeva || '(brez zadeve)'}</span>
                        <span style={{ flex: 'none', fontSize: '.5rem', fontWeight: 800, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--muted)' }}>{vnos.izbrisano ? 'Koš' : vnos.osnutek ? 'Osnutek' : vnos.smer === 'poslano' ? 'Poslano' : 'Prejeto'}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="pw-posta-prazno">{mapa === 'prejeto' ? 'Še ni prejete pošte — prižge se, ko aktiviramo dohodno pošto.' : mapa === 'osnutki' ? 'Ni osnutkov.' : mapa === 'kos' ? 'Koš je prazen.' : 'Še ni poslane pošte. Klikni Nova pošta in piši stranki.'}</p>
              );
            })()}
              </div>
            </div>
          </article>
          <Link href={`${base}/kalkulator/stranke?stranka=${encodeURIComponent(selected.offer.client)}`} className="pw-karta pw-dnevnik-link">
            <p className={styles.eyebrow}>07 · CRM DNEVNIK</p>
            <h3>Klici, sestanki, dogovori</h3>
            <p>Kronologija odnosa s stranko »{selected.offer.client}« — odpri na strani stranke.</p>
            <b className="pw-znacka pw-znacka-live">Odpri <svg className="puscica-svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M7 17L17 7M8 7h9v9" /></svg></b>
          </Link>
        </div>
      </section>
    )}

    {/* SLIDE "Vsi <tip>" z desne — vzorec styles.detailBackdrop/detailPanel + lepljivi X
        (glej ArhivWorkspace .arh-det-x); poln seznam za pogodbe/računi/stroški TA projekta */}
    {vsiOdprt && selected && (
      <div className={`${styles.detailBackdrop} pw-vsi-backdrop`} role="presentation" onMouseDown={closeVsi}>
        <aside className={`${styles.detailPanel} pw-vsi-panel`} role="dialog" aria-modal="true" aria-labelledby="pw-vsi-naslov" onMouseDown={e => e.stopPropagation()}>
          <button type="button" className="pw-vsi-x" onClick={closeVsi} aria-label="Zapri">✕</button>
          <p className={styles.eyebrow}>{vsiEyebrow}</p>
          <h2 id="pw-vsi-naslov">{vsiNaslov}</h2>
          <p className="pw-vsi-projekt">{selected.offer.title}</p>

          {/* preklop načina prikaza + iskalnik V ISTI VRSTI (Strani/Drsenje levo, lupa desno) */}
          <div className="pw-vsi-orodja">
          <div className="pw-vsi-nacin" role="tablist" aria-label="Način prikaza">
            <button type="button" role="tab" aria-selected={vsiNacin === 'strani'} className={vsiNacin === 'strani' ? 'pw-vsi-nacin-aktivna' : ''} onClick={() => setVsiNacin('strani')}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="4" y="4" width="7" height="16" rx="1.2" /><rect x="13" y="4" width="7" height="16" rx="1.2" /></svg>
              Strani
            </button>
            <button type="button" role="tab" aria-selected={vsiNacin === 'drsenje'} className={vsiNacin === 'drsenje' ? 'pw-vsi-nacin-aktivna' : ''} onClick={() => setVsiNacin('drsenje')}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="7" y="2.5" width="10" height="18" rx="5" /><line x1="12" y1="7" x2="12" y2="10" /></svg>
              Drsenje
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
                  placeholder="Išči po nazivu, številki, opisu, kategoriji …"
                  aria-label="Išči"
                />
                <button type="button" className="pw-vsi-isci-x" onClick={() => { setVsiIskanje(''); setVsiStran(1); setVsiIskanjeOdprto(false); }} aria-label="Zapri iskanje">×</button>
              </div>
            ) : (
              <button type="button" className="pw-vsi-lupa" onClick={() => setVsiIskanjeOdprto(true)} aria-label="Išči">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
              </button>
            )}
          </div>
          </div>

          <div className="pw-vsi-seznam" data-nacin={vsiNacin}>
            {vsiPrikaz.length ? vsiPrikaz : <p className="pw-prazno">Ni zadetkov.</p>}
          </div>

          {vsiNacin === 'strani' && vsiStrani > 1 && (
            <nav className="pw-vsi-strani" aria-label="Strani">
              <button type="button" onClick={() => setVsiStran(s => Math.max(1, s - 1))} disabled={vsiStranAktivna <= 1} aria-label="Prejšnja stran">‹</button>
              {Array.from({ length: vsiStrani }, (_, i) => i + 1).map(n => (
                <button key={n} type="button" className={n === vsiStranAktivna ? 'pw-vsi-stran-aktivna' : ''} onClick={() => setVsiStran(n)} aria-current={n === vsiStranAktivna ? 'page' : undefined}>{n}</button>
              ))}
              <button type="button" onClick={() => setVsiStran(s => Math.min(vsiStrani, s + 1))} disabled={vsiStranAktivna >= vsiStrani} aria-label="Naslednja stran">›</button>
            </nav>
          )}
        </aside>
      </div>
    )}

    {/* PREDOGLED posameznega dokumenta (klik na vrstico na kartici ali v slideu) */}
    {vrsticaDetajl && selected && (() => {
      const { tip, item } = vrsticaDetajl;
      const zapri = () => setVrsticaDetajl(null);
      return (
        <div className={`${styles.detailBackdrop} pw-vsi-backdrop`} role="presentation" onMouseDown={zapri}>
          <aside className={`${styles.detailPanel} pw-det-panel`} role="dialog" aria-modal="true" aria-labelledby="pw-det-naslov" onMouseDown={e => e.stopPropagation()}>
            <button type="button" className="pw-vsi-x" onClick={zapri} aria-label="Zapri">✕</button>
            {tip === 'racuni' && (() => {
              const r = item as FlowInvoice;
              const its = r.items || [];
              const imaPopust = its.some(i => (i.popust || 0) > 0);
              const imaDdv = its.some(i => (i.ddv || 0) > 0);
              return <>
                <p className={styles.eyebrow}>RAČUN · {r.paid ? 'PLAČAN' : 'ODPRT'}</p>
                <h2 id="pw-det-naslov">Račun {r.number || ''}</h2>
                <p className="pw-vsi-projekt">{selected.offer.title} · {selected.offer.client}</p>
                <div className="pw-det-meta">
                  <span><small>Datum</small><strong>{new Date(r.date).toLocaleDateString('sl-SI')}</strong></span>
                  {typeof r.dueDays === 'number' && <span><small>Rok plačila</small><strong>{r.dueDays} dni</strong></span>}
                  <span><small>Status</small><strong className={`pw-det-status ${r.paid ? 'placan' : 'odprt'}`}>{r.paid ? 'Plačan' : 'Odprt'}</strong></span>
                </div>
                {its.length ? (<>
                  <div className="pw-det-tabela-ovoj"><table className="pw-det-tabela">
                    <thead><tr><th>Opis</th><th>Kol.</th><th>Cena</th>{imaPopust && <th>Popust</th>}{imaDdv && <th>DDV</th>}<th>Skupaj</th></tr></thead>
                    <tbody>{its.map((it, i) => <tr key={`${it.opis}-${i}`}><td>{it.opis}</td><td>{it.kolicina}</td><td>{money(it.cena)}</td>{imaPopust && <td>{it.popust ? `${it.popust}%` : '—'}</td>}{imaDdv && <td>{it.ddv ? `${it.ddv}%` : '—'}</td>}<td>{money(it.kolicina * it.cena * (1 - (it.popust || 0) / 100))}</td></tr>)}</tbody>
                  </table></div>
                  <div className="pw-det-vsote">
                    {typeof r.net === 'number' && <div><span>Neto</span><strong>{money(r.net)}</strong></div>}
                    {typeof r.vatAmount === 'number' && r.vatAmount > 0 && <div><span>DDV</span><strong>{money(r.vatAmount)}</strong></div>}
                    <div className="pw-det-skupaj"><span>Za plačilo</span><strong>{money(r.amount)}</strong></div>
                  </div>
                </>) : (
                  <div className="pw-det-vsote"><div className="pw-det-skupaj"><span>Za plačilo</span><strong>{money(r.amount)}</strong></div></div>
                )}
                <div className="pw-det-akcije">
                  <button type="button" className="pw-det-poslji" onClick={() => posljiDokument(selected.offer.client, `Račun ${r.number || ''}`.trim(), `Pozdravljeni,\n\nv prilogi vam pošiljam račun ${r.number || ''} v znesku ${money(r.amount)}.\n\nLep pozdrav`)}>Pošlji naročniku <svg className="puscica-svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M7 17L17 7M8 7h9v9" /></svg></button>
                  <Link href={`${base}/kalkulator/racuni`} className="pw-det-uredi">Uredi v Računih <svg className="puscica-svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M7 17L17 7M8 7h9v9" /></svg></Link>
                </div>
              </>;
            })()}
            {tip === 'pogodbe' && (() => {
              const c = item as FlowContract;
              return <>
                <p className={styles.eyebrow}>POGODBA · {c.status}</p>
                <h2 id="pw-det-naslov">{c.title}</h2>
                <p className="pw-vsi-projekt">{selected.offer.title} · {selected.offer.client}</p>
                <div className="pw-det-meta"><span><small>Datum</small><strong>{new Date(c.date).toLocaleDateString('sl-SI')}</strong></span><span><small>Status</small><strong>{c.status}</strong></span></div>
                <p className="pw-det-opomba">Celotno besedilo pogodbe odpri in uredi v razdelku Pogodbe.</p>
                <div className="pw-det-akcije">
                  <button type="button" className="pw-det-poslji" onClick={() => posljiDokument(selected.offer.client, `Pogodba — ${c.title}`, `Pozdravljeni,\n\nv prilogi vam pošiljam pogodbo »${c.title}«. Prosim za pregled in podpis.\n\nLep pozdrav`)}>Pošlji naročniku <svg className="puscica-svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M7 17L17 7M8 7h9v9" /></svg></button>
                  <Link href={`${base}/kalkulator/pogodbe`} className="pw-det-uredi">Odpri v Pogodbah <svg className="puscica-svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M7 17L17 7M8 7h9v9" /></svg></Link>
                </div>
              </>;
            })()}
            {tip === 'stroski' && (() => {
              const s = item as FlowExpense;
              return <>
                <p className={styles.eyebrow}>STROŠEK</p>
                <h2 id="pw-det-naslov">{s.title}</h2>
                <p className="pw-vsi-projekt">{selected.offer.title}</p>
                <div className="pw-det-meta"><span><small>Kategorija</small><strong>{s.category || 'Projektni strošek'}</strong></span><span><small>Znesek</small><strong>{money(s.amount)}</strong></span></div>
                <Link href={`${base}/kalkulator/stroski`} className="pw-det-uredi">Uredi v Stroških <svg className="puscica-svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M7 17L17 7M8 7h9v9" /></svg></Link>
              </>;
            })()}
          </aside>
        </div>
      );
    })()}

  </div>;
}
