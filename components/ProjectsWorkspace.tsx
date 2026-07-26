'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { Plus, FolderOpen } from '@phosphor-icons/react';
import styles from '@/app/[locale]/kalkulator/pregled/pregled.module.css';
import ArhivFilter from '@/components/ArhivFilter';
import MetricIcon from '@/components/MetricIcon';
import { loadFlowData, loadProjectLinks, saveOfferAmount, saveProjectLinks, type FlowClient, type FlowContract, type FlowExpense, type FlowInvoice, type FlowOffer, type FlowOfferStatus, type FlowProjectLink } from '@/lib/pinartFlowStore';
import { podatkiZaPredogled, usePredogled } from '@/lib/predogled';
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
.pw-seznam-glava strong{font:500 1.5rem var(--font-serif),Georgia,serif;color:var(--ink)}
.pw-tabela-ovoj{width:100%;overflow-x:auto;-webkit-overflow-scrolling:touch;border-radius:1.4rem}
.pw-tabela{min-width:640px;display:grid;grid-template-columns:minmax(0,2.1fr) minmax(0,1.3fr) minmax(0,1fr) minmax(0,1.1fr) minmax(0,1fr) 1.6rem;background:oklch(98% .008 87 / .92);border:1px solid var(--line);border-radius:1.4rem;overflow:hidden}
.pw-tabela-naslov{grid-column:1 / -1;display:flex;align-items:center;justify-content:space-between;gap:1rem;padding:.95rem 1rem .85rem;background:oklch(95% .035 300);border-bottom:1px solid rgba(17,17,17,.08)}
.pw-tabela-naslov .${styles.eyebrow}{color:oklch(45% .12 300)}
.pw-tabela-naslov strong{font-family:var(--font-serif),Didot,serif;font-weight:500;font-size:1.6rem;line-height:1;color:var(--ink)}
.pw-tabela > header{display:grid;grid-template-columns:subgrid;grid-column:1 / -1;gap:1.1rem;padding:.75rem .9rem;font-size:.66rem;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);border-bottom:1px solid var(--line)}
.pw-vrstica{display:grid;grid-template-columns:subgrid;grid-column:1 / -1;align-items:center;gap:1.1rem;padding:.85rem .9rem;border:0;border-top:1px solid var(--line);background:transparent;font:inherit;color:var(--ink);text-align:left;cursor:pointer;transition:background .14s}
.pw-tabela > button.pw-vrstica:first-of-type{border-top:0}
.pw-vrstica:hover{background:linear-gradient(125deg, oklch(94% .045 295), oklch(93% .04 165))}
.pw-vrstica > span{min-width:0;font-size:.72rem;overflow-wrap:anywhere}
.pw-glavna{display:flex;align-items:center;gap:.6rem;min-width:0}
.pw-glavna strong{font-weight:700;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:.72rem}
.pw-ikona{display:grid;place-items:center;width:2rem;height:2rem;border-radius:50%;background:oklch(94% .045 295);color:var(--ink);flex:none}
.pw-mut{color:var(--muted)}
.pw-desno{text-align:right;font-weight:700}
.pw-kazalec{color:var(--muted);font-size:1.1rem;text-align:center}
.pw-status{display:inline-flex;align-items:center;gap:.42rem;width:max-content;max-width:100%;padding:.32rem .66rem;border:1px solid oklch(86% .012 87);border-radius:999px;background:oklch(95% .01 87);color:oklch(40% .02 70);font-size:.62rem;font-weight:700;white-space:nowrap}
.pw-status::before{content:'';width:.48rem;height:.48rem;border-radius:50%;background:var(--pika,oklch(62% .02 70));flex:none}
.pw-status[data-tone='waiting']{--pika:oklch(72% .16 75)}
.pw-status[data-tone='success']{--pika:oklch(62% .15 150)}
.pw-status[data-tone='danger']{--pika:oklch(58% .19 25)}
.pw-status[data-tone='neutral']{--pika:oklch(62% .02 70)}
.pw-prazno{padding:2rem;color:var(--muted);font-size:.72rem;text-align:center;border:1px solid var(--line);border-radius:1.4rem;background:oklch(98% .008 87 / .92)}
.pw-stran{padding:1rem;scroll-margin-top:5.5rem}
.pw-nazaj{display:inline-flex;align-items:center;gap:.4rem;margin:0 0 .8rem;padding:.55rem .95rem;border:1px solid var(--line);border-radius:999px;background:oklch(98% .008 87 / .92);font:700 .62rem var(--font-sans),sans-serif;color:var(--ink);cursor:pointer}
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
.pw-dokumentacija h3{margin:0;font:600 1.15rem var(--font-serif),Georgia,serif}
.pw-linki{display:flex;flex-direction:column;gap:.4rem;margin:.7rem 0 0}
.pw-link-vrstica{display:flex;align-items:center;gap:.5rem;padding:.5rem .65rem;border:1px solid var(--line);border-radius:.7rem;background:oklch(100% 0 0 / .55)}
.pw-link-vrstica a{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--ink);font-weight:700;font-size:.72rem;text-decoration:none}
.pw-link-vrstica a:hover{text-decoration:underline}
.pw-link-brisi{flex:none;display:grid;place-items:center;width:1.5rem;height:1.5rem;padding:0;border:1px solid var(--line);border-radius:50%;background:transparent;color:var(--muted);font-size:.85rem;line-height:1;cursor:pointer}
.pw-link-brisi:hover{background:var(--ink);color:var(--paper);border-color:var(--ink)}
.pw-link-prazno{margin:.7rem 0 0;color:var(--muted);font-size:.68rem}
.pw-link-obrazec{display:grid;grid-template-columns:1fr;gap:.45rem;margin-top:.7rem}
.pw-link-obrazec input{padding:.5rem .65rem;border:1px solid var(--line);border-radius:.6rem;background:oklch(100% 0 0 / .7);font:inherit;font-size:.72rem;color:var(--ink);min-width:0}
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
.pw-vsi-panel h2{margin:.4rem 0 .2rem;font-family:var(--font-serif),Didot,serif;font-weight:600;font-size:clamp(1.6rem,3vw,2.2rem);line-height:1.05;color:var(--ink)}
.pw-vsi-projekt{margin:0 0 1.1rem;color:var(--muted);font-size:.72rem}
/* × zapri = na višini nadnaslova (eyebrow), enako v vseh panelih (slide + predogled računa/pogodbe/stroška) */
.pw-vsi-x{position:absolute;top:1.6rem;right:1.6rem;z-index:8;display:grid;place-items:center;width:2.2rem;height:2.2rem;padding:0;border:1px solid rgba(17,17,17,.18);border-radius:50%;background:var(--paper);color:var(--ink);font-size:1rem;line-height:1;cursor:pointer;box-shadow:0 4px 14px rgba(17,17,17,.12)}
/* status v predogledu: plačan zelen, odprt jantarni; znesek »za plačilo« z outline (kot Bodoni številke) */
.pw-det-status.placan{color:oklch(55% .15 150)}
.pw-det-status.odprt{color:oklch(58% .15 65)}
.pw-det-skupaj strong{-webkit-text-stroke:.4px var(--ink);text-shadow:0 1px 2px oklch(100% 0 0 / .4)}
.pw-vsi-x:hover{background:var(--ink);color:var(--paper)}
/* orodna vrsta slidea: preklop levo, iskalnik desno — v ISTI vrsti */
.pw-vsi-orodja{display:flex;align-items:center;justify-content:space-between;gap:.5rem;flex-wrap:wrap;margin:0 0 .85rem}
/* preklop načina prikaza (segmentna pilula): Strani (paginacija) | Drsenje (ves seznam) */
.pw-vsi-nacin{display:inline-flex;align-items:center;gap:.2rem;width:max-content;margin:0;padding:.2rem;border:1px solid var(--line);border-radius:999px;background:oklch(97% .006 87 / .8)}
.pw-vsi-nacin button{display:inline-flex;align-items:center;gap:.35rem;padding:.35rem .8rem;border:0;border-radius:999px;background:none;font:700 .62rem var(--font-sans),sans-serif;color:var(--muted);cursor:pointer}
.pw-vsi-nacin button.pw-vsi-nacin-aktivna{background:var(--ink);color:var(--paper)}
/* zložljiv iskalnik: okrogel gumb z lupo -> ob kliku postane input; × zapre nazaj v gumb */
.pw-vsi-iskalnik{display:flex;align-items:center;gap:.5rem;margin:0;flex:0 1 auto}
.pw-vsi-lupa{flex:none;display:grid;place-items:center;width:2.3rem;height:2.3rem;padding:0;border:1px solid var(--line);border-radius:50%;background:oklch(98% .008 87 / .92);color:var(--ink);cursor:pointer}
.pw-vsi-lupa:hover{background:var(--ink);color:var(--paper);border-color:var(--ink)}
/* polje se razširi IZ gumba (desni izvor), × je ZNOTRAJ polja desno */
.pw-vsi-isci-polje{position:relative;display:flex;align-items:center;transform-origin:right center;animation:pwIsciIn .3s cubic-bezier(.16,1,.3,1) both}
@keyframes pwIsciIn{from{opacity:0;transform:scaleX(.4)}to{opacity:1;transform:scaleX(1)}}
.pw-vsi-isci-polje input[type='search']{width:min(20rem,62vw);min-width:0;padding:.55rem 2.3rem .55rem .9rem;border:1px solid var(--line);border-radius:999px;background:oklch(100% 0 0 / .8);font:inherit;font-size:.75rem;color:var(--ink)}
.pw-vsi-isci-x{position:absolute;right:.35rem;top:50%;transform:translateY(-50%);display:grid;place-items:center;width:1.7rem;height:1.7rem;padding:0;border:0;border-radius:50%;background:oklch(94% .008 87);color:var(--ink);font-size:.95rem;line-height:1;cursor:pointer}
.pw-vsi-isci-x:hover{background:var(--ink);color:var(--paper)}
/* seznam vrstic v slideu — ista osnova kot .projectNarrative article > span (module CSS),
   tu podvojeno, ker vrstice v slideu NISO neposredni otroci .projectNarrative article */
/* seznam VEDNO lahko drsi znotraj (flex:1) -> glava (naslov+×) in paginacija ostaneta fiksni in NE izgineta;
   z 12/stran gre stran v pogled, zato se drsnik praviloma ne pokaže (fit = brez drsnika) */
.pw-vsi-seznam{flex:1 1 auto;min-height:0;overflow-y:auto;display:flex;flex-direction:column;margin:0;padding-right:.25rem}
.pw-vsi-seznam > span{display:grid;gap:.2rem;padding:.55rem 0;border-bottom:1px solid var(--line)}
.pw-vsi-seznam > span:last-child{border-bottom:0}
.pw-vsi-seznam > span b{font-size:.68rem}
.pw-vsi-seznam > span small{color:var(--muted);font-size:.58rem}
.pw-vsi-seznam .pw-racun-v{grid-template-columns:1fr auto;align-items:center}
.pw-vsi-strani{flex:none;display:flex;align-items:center;justify-content:center;flex-wrap:wrap;gap:.35rem;margin:0;padding-top:.85rem;border-top:1px solid var(--line)}
.pw-vsi-strani button{display:grid;place-items:center;min-width:2rem;height:2rem;padding:0 .5rem;border:1px solid var(--line);border-radius:.6rem;background:oklch(98% .008 87 / .92);font:700 .68rem var(--font-sans),sans-serif;color:var(--ink);cursor:pointer}
.pw-vsi-strani button:hover{background:var(--ink);color:var(--paper);border-color:var(--ink)}
.pw-vsi-strani button:disabled{opacity:.4;cursor:not-allowed}
.pw-vsi-strani button.pw-vsi-stran-aktivna{background:var(--ink);color:var(--paper);border-color:var(--ink)}
/* klikabilna vrstica (kartica + slide) -> predogled */
.pw-vrstica-klik{cursor:pointer;transition:background .14s}
.pw-vrstica-klik:hover{background:oklch(100% 0 0 / .28)}
.pw-vrstica-klik:focus-visible{outline:2px solid var(--akcent,#6E4FA6);outline-offset:2px}
/* PREDOGLED dokumenta (panel z desne) */
.pw-det-panel{width:min(42rem,100vw);animation:pwVsiIn .5s cubic-bezier(.16,1,.3,1) both}
.pw-det-panel h2{margin:.3rem 0 .1rem;font-family:var(--font-serif),Didot,serif;font-weight:600;font-size:clamp(1.5rem,3vw,2.1rem);line-height:1.05;color:var(--ink)}
.pw-det-meta{display:flex;flex-wrap:wrap;gap:.4rem 1.4rem;margin:1rem 0;padding:.9rem 0;border-top:1px solid var(--line);border-bottom:1px solid var(--line)}
.pw-det-meta span{display:flex;flex-direction:column;gap:.15rem}
.pw-det-meta small{font-size:.58rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--muted)}
.pw-det-meta strong{font-size:.82rem;color:var(--ink)}
.pw-det-tabela-ovoj{overflow-x:auto;margin-top:.4rem}
.pw-det-tabela{width:100%;border-collapse:collapse;font-size:.78rem}
.pw-det-tabela th{padding:.4rem .5rem;text-align:right;font-size:.56rem;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);border-bottom:1px solid var(--line);white-space:nowrap}
.pw-det-tabela th:first-child{text-align:left}
.pw-det-tabela td{padding:.5rem .5rem;text-align:right;border-bottom:1px solid oklch(0% 0 0 / .06);font-variant-numeric:tabular-nums;white-space:nowrap}
.pw-det-tabela td:first-child{text-align:left;white-space:normal;font-weight:600}
.pw-det-vsote{margin-top:.8rem;display:grid;gap:.25rem;justify-items:end}
.pw-det-vsote > div{display:flex;gap:1.2rem;align-items:baseline;font-size:.8rem;color:var(--muted)}
.pw-det-vsote > div strong{min-width:5rem;text-align:right;font-variant-numeric:tabular-nums;color:var(--ink)}
.pw-det-skupaj{margin-top:.25rem;padding-top:.45rem;border-top:1px solid var(--line)}
.pw-det-skupaj span{font-size:.66rem;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--muted)}
.pw-det-skupaj strong{font:500 1.4rem var(--font-serif),Georgia,serif}
.pw-det-opomba{margin:.6rem 0 0;color:var(--muted);font-size:.74rem;line-height:1.5}
.pw-det-uredi{display:inline-flex;align-items:center;gap:.35rem;margin-top:1.1rem;font-size:.8rem;font-weight:600;color:var(--muted);text-decoration:underline;text-underline-offset:2px}
.pw-det-uredi:hover{color:var(--ink)}
.pw-det-akcije{display:flex;flex-wrap:wrap;align-items:center;gap:.5rem 1rem;margin-top:1.1rem}
.pw-det-akcije .pw-det-uredi{margin-top:0}
.pw-det-poslji{display:inline-flex;align-items:center;gap:.35rem;padding:.55rem .95rem;border:1px solid var(--ink);border-radius:999px;background:var(--ink);color:var(--paper);font:700 .74rem var(--font-sans),sans-serif;cursor:pointer}
.pw-det-poslji:hover{background:transparent;color:var(--ink)}
.pw-kmalu-red{display:grid;grid-template-columns:1fr 1fr;gap:.55rem}
.pw-kmalu{opacity:.85}
.pw-kmalu h3{margin:0;font:600 1.05rem var(--font-serif),Georgia,serif}
.pw-kmalu p{margin:.5rem 0 0;color:var(--muted);font-size:.72rem;line-height:1.4}
/* CRM dnevnik kartica = ŽIVA povezava na stran stranke (ne več »Kmalu« — dnevnik obstaja) */
.pw-dnevnik-link{text-decoration:none;color:inherit;transition:transform .16s cubic-bezier(.16,1,.3,1),box-shadow .16s}
.pw-dnevnik-link h3{margin:0;font:600 1.05rem var(--font-serif),Georgia,serif}
.pw-dnevnik-link p{margin:.5rem 0 0;color:var(--muted);font-size:.72rem;line-height:1.4}
.pw-dnevnik-link:hover{transform:translateY(-2px);box-shadow:0 .8rem 2rem oklch(22% .04 300/.14)}
.pw-znacka-live{background:oklch(90% .06 297);color:oklch(42% .16 297)}
.pw-znacka{display:inline-flex;align-items:center;width:max-content;margin-top:.7rem;padding:.3rem .6rem;border-radius:999px;background:oklch(90% .02 87);color:var(--muted);font-size:.58rem;font-weight:800;letter-spacing:.08em;text-transform:uppercase}
/* "00 · CILJI IN ŽELJE" — samostojna kartica NAD .projectNarrative (ne znotraj njegove
   4-stolpne mreže, ker so barve 02/03/04 vezane na nth-child; vrivanje bi jih premaknilo
   in podrlo obstoječe gradiente). Isti mehki violet/mint jezik kot .projectAgreement. */
.pw-cilji{margin:.55rem 0 0;background:linear-gradient(135deg,oklch(97% .03 300),oklch(97% .03 165))}
.pw-cilji h3{margin:0;font:600 1.15rem var(--font-serif),Georgia,serif}
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
/* "+ Nov projekt" — onboarding kot CHAT (posnema videz/tok chata ponudbe v
   KalkulatorApp.tsx: mehurcek vprasanja levo z violet piko, moj odgovor
   desno v mint mehurcku, klik nanj znova odpre polje za urejanje, NAPREJ
   vodi na naslednje vprasanje — vse na EMI navpicni povrsini, brez menjave
   strani). .pw-nov-mreza/.pw-nov-polje/.pw-nov-cilj/.pw-nov-dodaj-cilj/
   .pw-nov-preklici ostanejo (uporabljeni znotraj koraka "Cilji" + datuma). */
.pw-nov-panel{width:min(36rem,100vw)}
.pw-nov-polje{display:flex;flex-direction:column;gap:.35rem;min-width:0}
.pw-nov-polje span{font-size:.68rem;font-weight:700;color:var(--muted)}
.pw-nov-polje input,.pw-nov-polje select,.pw-nov-polje textarea{width:100%;box-sizing:border-box;padding:.6rem .75rem;border:1px solid var(--line);border-radius:.7rem;background:oklch(100% 0 0 / .7);font:inherit;font-size:.8rem;color:var(--ink)}
.pw-nov-polje textarea{resize:vertical;min-height:5rem;font-family:inherit}
.pw-nov-polje select{cursor:pointer}
.pw-nov-mreza{display:grid;grid-template-columns:1fr 1fr;gap:.65rem}
.pw-nov-cilj{display:grid;grid-template-columns:1.4fr 1fr 1fr auto;align-items:center;gap:.4rem}
.pw-nov-cilj input{box-sizing:border-box;padding:.55rem .65rem;border:1px solid var(--line);border-radius:.6rem;background:oklch(100% 0 0 / .7);font:inherit;font-size:.74rem;color:var(--ink);min-width:0}
.pw-nov-dodaj-cilj{align-self:start;margin-top:.1rem;padding:.5rem .85rem;border:1px dashed color-mix(in oklch,var(--ink) 28%,transparent);border-radius:.7rem;background:transparent;font:700 .68rem var(--font-sans),sans-serif;color:var(--ink);cursor:pointer}
.pw-nov-dodaj-cilj:hover{background:oklch(100% 0 0 / .5)}
.pw-nov-preklici{padding:.55rem .95rem;border:1px solid var(--line);border-radius:999px;background:transparent;color:var(--ink);font:700 .74rem var(--font-sans),sans-serif;cursor:pointer}
.pw-nov-preklici:hover{background:var(--ink);color:var(--paper);border-color:var(--ink)}
/* pogovorni tok — glava/naslov panela ostane, tok se zacne pod njim */
.pw-chat-tok{display:flex;flex-direction:column;gap:1rem;margin:1.2rem 0 0}
@keyframes pwChatIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
.pw-chat-bot,.pw-chat-jaz,.pw-chat-izbire,.pw-chat-vnos{animation:pwChatIn .38s cubic-bezier(.16,1,.3,1) both}
@media (prefers-reduced-motion:reduce){.pw-chat-bot,.pw-chat-jaz,.pw-chat-izbire,.pw-chat-vnos{animation:none}}
/* mehurcek bota: violet-mehka pika (isti "Pinart mehurcek" jezik kot ostali chat) + oblacek levo poravnan */
.pw-chat-bot{display:flex;max-width:94%}
.pw-chat-bot .pw-chat-mehur{position:relative;padding:.85rem 1.15rem .85rem 2.55rem;border-radius:18px;border-bottom-left-radius:6px;background:oklch(96% .022 300);border:1px solid color-mix(in oklch,var(--ink) 7%,transparent);font-size:.86rem;line-height:1.5}
.pw-chat-bot .pw-chat-mehur::before{content:'';position:absolute;left:.8rem;top:.98rem;width:1.1rem;height:1.1rem;border-radius:50%;background:radial-gradient(58% 48% at 30% 24%,rgba(255,255,255,.92),rgba(255,255,255,0) 62%),conic-gradient(from 210deg,#7C3AED,#EC4899,#F59E0B,#38BDF8,#7C3AED);box-shadow:0 2px 6px rgba(124,58,237,.28)}
.pw-chat-bot .pw-chat-mehur b{display:block;font-weight:700;color:var(--ink)}
.pw-chat-bot .pw-chat-mehur small{display:block;margin-top:.2rem;font-weight:400;font-size:.76rem;color:color-mix(in oklch,var(--ink) 62%,transparent)}
/* moj odgovor: mint mehurcek, desno poravnan, klikljiv (odpre urejanje v mestu) */
.pw-chat-jaz{align-self:flex-end;max-width:94%}
.pw-chat-mehur-ured{display:inline-flex;align-items:center;gap:.55rem;padding:.7rem 1.05rem;border-radius:18px;border-bottom-right-radius:6px;background:oklch(89% .05 165);border:1px solid color-mix(in oklch,var(--ink) 7%,transparent);color:var(--ink);font:inherit;font-size:.82rem;font-weight:600;text-align:left;cursor:pointer;transition:transform .15s,box-shadow .15s}
.pw-chat-mehur-ured:hover{transform:translateY(-1px);box-shadow:0 7px 18px rgba(40,25,40,.13)}
.pw-chat-mehur-ured svg{opacity:.4;flex:none;transition:opacity .15s}
.pw-chat-mehur-ured:hover svg{opacity:.85}
/* vnosno polje pod vprasanjem bota — zamaknjeno pod mehurcek, "Naprej" pilula z ink ozadjem */
.pw-chat-vnos{display:flex;flex-direction:column;align-items:flex-start;gap:.6rem;max-width:calc(100% - 1rem);margin:-.2rem 0 0 .3rem}
.pw-chat-polje{width:100%;box-sizing:border-box;padding:.7rem 1.05rem;border:1px solid rgba(17,17,17,.14);border-radius:999px;background:#fff;font:inherit;font-size:.85rem;font-weight:600;color:var(--ink);box-shadow:0 4px 14px rgba(40,25,40,.05);outline:none}
textarea.pw-chat-polje{border-radius:1rem;resize:vertical;min-height:4.4rem;font-weight:400;line-height:1.5;font-family:inherit}
select.pw-chat-polje{cursor:pointer}
.pw-chat-polje:focus{border-color:color-mix(in oklch,var(--ink) 45%,transparent)}
.pw-chat-naprej{align-self:flex-start;display:inline-flex;align-items:center;gap:.4rem;padding:.6rem 1.1rem;border:0;border-radius:999px;background:var(--ink);color:var(--paper);font:700 .74rem var(--font-sans),sans-serif;cursor:pointer}
.pw-chat-naprej:disabled{opacity:.45;cursor:not-allowed}
.pw-chat-naprej:hover:not(:disabled){background:color-mix(in oklch,var(--ink) 82%,transparent)}
/* izbirne kartice (status) — pod vprasanjem bota, klik takoj potrdi in gre naprej */
.pw-chat-izbire{display:flex;flex-direction:column;gap:.5rem;margin:-.2rem 0 0 .3rem}
.pw-chat-opcija{display:flex;align-items:center;gap:.75rem;width:min(360px,100%);padding:.75rem .95rem;border:1px solid var(--line);border-radius:14px;background:oklch(99% .006 87 / .85);font:inherit;color:var(--ink);text-align:left;cursor:pointer;transition:transform .18s,border-color .18s,box-shadow .18s}
.pw-chat-opcija:hover{transform:translateY(-2px);border-color:color-mix(in oklch,var(--ink) 28%,transparent);box-shadow:0 8px 20px rgba(40,25,40,.08)}
.pw-crk{display:grid;place-items:center;width:1.7rem;height:1.7rem;border-radius:8px;background:oklch(94% .045 295);color:var(--ink);font-weight:800;font-size:.74rem;flex:none}
/* dodatna vprasanja (moja lastna Q&A) */
.pw-vprasanje-vrstica{display:flex;align-items:flex-start;justify-content:space-between;gap:.6rem;padding:.6rem .75rem;border:1px solid var(--line);border-radius:.8rem;background:oklch(100% 0 0 / .55)}
.pw-vprasanje-vrstica div{display:flex;flex-direction:column;gap:.15rem;min-width:0}
.pw-vprasanje-vrstica b{font-size:.76rem;color:var(--ink);font-weight:700}
.pw-vprasanje-vrstica span{font-size:.72rem;color:color-mix(in oklch,var(--ink) 62%,transparent)}
/* dodeljeni sodelavci — klikljivi cipsi (ista logika kot chip-podrocje v kalkulatorju) */
.pw-chat-sodelavci{display:flex;flex-wrap:wrap;gap:.5rem}
.pw-chat-sodelavec{display:flex;align-items:center;gap:.55rem;padding:.5rem .85rem .5rem .5rem;border:1px solid var(--line);border-radius:999px;background:oklch(99% .006 87 / .85);font:inherit;color:var(--ink);cursor:pointer;transition:border-color .16s,background .16s}
.pw-chat-sodelavec b{font-size:.74rem;font-weight:700}
.pw-chat-sodelavec small{display:block;color:color-mix(in oklch,var(--ink) 55%,transparent);font-size:.6rem}
.pw-chat-sod-krog{display:grid;place-items:center;width:1.7rem;height:1.7rem;border-radius:50%;background:oklch(90% .045 297);color:oklch(40% .16 297);font-size:.6rem;font-weight:800;flex:none}
.pw-chat-sodelavec.on{border-color:var(--ink);background:oklch(93% .04 165)}
.pw-chat-sodelavec.on .pw-chat-sod-krog{background:var(--ink);color:var(--paper)}
.pw-chat-deli{align-self:flex-start;display:inline-flex;align-items:center;gap:.4rem;margin-top:.2rem;padding:.55rem .9rem;border:1px solid var(--ink);border-radius:999px;background:transparent;color:var(--ink);font:700 .7rem var(--font-sans),sans-serif;cursor:pointer}
.pw-chat-deli:hover:not(:disabled){background:var(--ink);color:var(--paper)}
.pw-chat-deli:disabled{opacity:.45;cursor:not-allowed}
.pw-chat-koncno{margin-top:.4rem}
@media (max-width:640px){
.pw-link-obrazec{grid-template-columns:1fr}
.pw-kmalu-red{grid-template-columns:1fr}
.pw-nov-mreza{grid-template-columns:1fr}
.pw-nov-cilj{grid-template-columns:1fr;gap:.3rem;padding:.6rem;border:1px solid var(--line);border-radius:.7rem}
.pw-chat-vnos,.pw-chat-izbire{margin-left:0}
.pw-chat-bot,.pw-chat-jaz{max-width:97%}
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
  /* V predogledu (demo) pokažemo primere povezav, da se vidi poln videz razdelka;
     v pravem računu beremo dejansko shranjene povezave. */
  useEffect(() => {
    const demo: FlowProjectLink[] = [
      { oznaka: 'Figma · Dizajn', url: 'https://figma.com' },
      { oznaka: 'Miro · Moodboard', url: 'https://miro.com' },
      { oznaka: 'Drive · Gradiva', url: 'https://drive.google.com' },
    ];
    setLinks(samoOgled ? demo : (selectedId ? loadProjectLinks(selectedId) : []));
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
  const pogodbaVrstica = (item: FlowContract) => <span key={item.id} className="pw-vrstica-klik" {...klik('pogodbe', item)}><b>{item.title}</b><i className="pw-status" data-tone={statusTon(item.status)}>{item.status}</i></span>;
  const racunKaj = (item: FlowInvoice) => item.title || item.items?.[0]?.opis || selected?.offer.title || '';
  const racunVrstica = (item: FlowInvoice) => { const kaj = racunKaj(item); return <span key={item.id} className="pw-racun-v pw-vrstica-klik" {...klik('racuni', item)}><span className="pw-racun-l"><b>Račun {item.number || ''}</b>{kaj && <small>{kaj}</small>}</span><span className="pw-racun-d"><i className="pw-status" data-tone={item.paid ? 'success' : 'waiting'}>{item.paid ? 'Plačan' : 'Odprt'}</i><strong>{money(item.amount)}</strong></span></span>; };
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
        <div className={styles.projectStoryEmpty}><span>↗</span><strong>Najprej ustvari ponudbo.</strong><p>Ta bo postala osnova projekta in povezala vse nadaljnje dokumente.</p></div>
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
                    <span><span className="pw-status" data-tone={info.tone}>{info.label}</span></span>
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
        <button type="button" className="pw-nazaj" onClick={goBack} aria-label="Nazaj na seznam projektov">← Nazaj</button>
        <header><div><p className={styles.eyebrow}>PROJEKT · {selected.offer.number || 'BREZ ŠTEVILKE'}</p><h2>{selected.offer.title}</h2><span><Link href={`${base}/kalkulator/stranke?stranka=${encodeURIComponent(selected.offer.client)}`} className="pw-narocnik-link">{selected.offer.client}</Link> · {new Date(selected.offer.date).toLocaleDateString('sl-SI')}</span></div><b>{selected.real ? projektStatusOznaka[selected.real.status] : statusLabel[selected.offer.status]}</b></header>
        <div className={styles.projectMoney}><label><small>Dogovorjena vrednost</small><span><input type="number" min="0" step="0.01" value={selected.agreed || ''} onChange={event => saveAmount(selected.offer.id, Number(event.target.value))} /> €</span><b className={styles.subpageMetricIcon}><MetricIcon type="document" /></b></label><span><small>Zaračunano</small><strong>{money(selected.billed)}</strong><b className={styles.subpageMetricIcon}><MetricIcon type="paid" /></b></span><span className={selected.unbilled > 0 ? styles.projectNeedsInvoice : ''}><small>Še ni zaračunano</small><strong>{selected.agreed ? money(selected.unbilled) : '—'}</strong><b className={styles.subpageMetricIcon}><MetricIcon type="cost" /></b></span><span><small>Ocenjeni rezultat</small><strong>{money(selected.profit)}</strong><b className={styles.subpageMetricIcon}><MetricIcon type="profit" /></b></span></div>
        {selected.real && (
          <article className="pw-karta pw-cilji">
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
            ) : (!selected.real.zelje && <p className="pw-cilji-prazno">Želje in cilji še niso dodani.</p>)}
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
        <div className={styles.projectNarrative}><article className={styles.projectAgreement}><p className={styles.eyebrow}>01 · DOGOVORJENO</p><h3>Kaj je bilo v ponudbi?</h3>{selected.offer.scope.length ? <ul>{selected.offer.scope.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ul> : selected.real ? <p>Ta projekt še nima ponudbe. Pripravi jo v kalkulatorju, ko bo obseg jasen.</p> : <p>Starejša ponudba nima strukturiranega obsega. Odpri jo v kalkulatorju za celotno besedilo.</p>}</article><article><p className={styles.eyebrow}>02 · POGODBE</p><h3>{selected.contracts.length ? `${selected.contracts.length} povezanih` : 'Brez pogodbe'}</h3>{pogodbeSort.slice(0, NAJNOVEJSIH).map(pogodbaVrstica)}{pogodbeSort.length > NAJNOVEJSIH && <button type="button" className="pw-vec" onClick={() => openVsi('pogodbe')}>Prikaži vse ({pogodbeSort.length}) →</button>}<Link href={`${base}/kalkulator/pogodbe`} aria-label="Dodaj pogodbo za ta projekt"><Plus size={18} weight="bold" /></Link></article><article><p className={styles.eyebrow}>03 · RAČUNI</p><h3>{money(selected.billed)}</h3>{racuniSort.slice(0, NAJNOVEJSIH).map(racunVrstica)}{racuniSort.length > NAJNOVEJSIH && <button type="button" className="pw-vec" onClick={() => openVsi('racuni')}>Prikaži vse ({racuniSort.length}) →</button>}<Link href={`${base}/kalkulator/racuni`} aria-label="Dodaj račun za ta projekt"><Plus size={18} weight="bold" /></Link></article><article><p className={styles.eyebrow}>04 · STROŠKI</p><h3>{money(selected.costs)}</h3>{strosekSort.slice(0, NAJNOVEJSIH).map(strosekVrstica)}{strosekSort.length > NAJNOVEJSIH && <button type="button" className="pw-vec" onClick={() => openVsi('stroski')}>Prikaži vse ({strosekSort.length}) →</button>}<Link href={`${base}/kalkulator/stroski`} aria-label="Dodaj strošek za ta projekt"><Plus size={18} weight="bold" /></Link></article><article className="pw-karta pw-dokumentacija"><p className={styles.eyebrow}>05 · DOKUMENTACIJA</p><h3>Povezave do zunanjih datotek</h3>{links.length ? (<div className="pw-linki">{links.map((link, index) => (<div key={`${link.url}-${index}`} className="pw-link-vrstica"><a href={link.url} target="_blank" rel="noopener noreferrer">{link.oznaka}</a>{!samoOgled && <button type="button" className="pw-link-brisi" onClick={() => removeLink(index)} aria-label={`Izbriši povezavo ${link.oznaka}`}>×</button>}</div>))}</div>) : <p className="pw-link-prazno">Še ni dodanih povezav.</p>}{!samoOgled && dodajOdprt && (<div className="pw-link-obrazec"><input type="text" value={linkOznaka} onChange={event => setLinkOznaka(event.target.value)} placeholder="npr. Figma" aria-label="Oznaka povezave" /><input type="url" value={linkUrl} onChange={event => setLinkUrl(event.target.value)} placeholder="https://…" aria-label="Naslov povezave (Figma, Miro, IDD, mapa Drive …)" /><button type="button" className="pw-link-dodaj" onClick={addLink} disabled={!linkOznaka.trim() || !linkUrl.trim()}>+ Dodaj povezavo</button></div>)}{samoOgled && dodajOdprt && <p className="pw-opozorilo">Dodajanje povezav ni na voljo v predogledu (demo). Prijavi se v svoj račun.</p>}<button type="button" className="pw-dok-dodaj" onClick={() => setDodajOdprt(open => !open)} aria-label={dodajOdprt ? 'Zapri dodajanje povezave' : 'Dodaj povezavo'}><Plus size={16} weight="bold" /></button></article></div>

        <div className="pw-dodatno">
          <div className="pw-kmalu-red">
            <article className="pw-karta pw-kmalu">
              <p className={styles.eyebrow}>06 · KOMUNIKACIJE</p>
              <h3>Vse na enem mestu</h3>
              <p>E-pošta in dogovori tega projekta na enem mestu.</p>
              <b className="pw-znacka">Kmalu</b>
            </article>
            <Link href={`${base}/kalkulator/stranke?stranka=${encodeURIComponent(selected.offer.client)}`} className="pw-karta pw-dnevnik-link">
              <p className={styles.eyebrow}>07 · CRM DNEVNIK</p>
              <h3>Klici, sestanki, dogovori</h3>
              <p>Kronologija odnosa s stranko »{selected.offer.client}« — odpri na strani stranke.</p>
              <b className="pw-znacka pw-znacka-live">Odpri ↗</b>
            </Link>
          </div>
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
                  <button type="button" className="pw-det-poslji" onClick={() => posljiDokument(selected.offer.client, `Račun ${r.number || ''}`.trim(), `Pozdravljeni,\n\nv prilogi vam pošiljam račun ${r.number || ''} v znesku ${money(r.amount)}.\n\nLep pozdrav`)}>Pošlji naročniku ↗</button>
                  <Link href={`${base}/kalkulator/racuni`} className="pw-det-uredi">Uredi v Računih ↗</Link>
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
                  <button type="button" className="pw-det-poslji" onClick={() => posljiDokument(selected.offer.client, `Pogodba — ${c.title}`, `Pozdravljeni,\n\nv prilogi vam pošiljam pogodbo »${c.title}«. Prosim za pregled in podpis.\n\nLep pozdrav`)}>Pošlji naročniku ↗</button>
                  <Link href={`${base}/kalkulator/pogodbe`} className="pw-det-uredi">Odpri v Pogodbah ↗</Link>
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
                <Link href={`${base}/kalkulator/stroski`} className="pw-det-uredi">Uredi v Stroških ↗</Link>
              </>;
            })()}
          </aside>
        </div>
      );
    })()}

  </div>;
}
