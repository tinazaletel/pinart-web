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
/* metrike nad tabelo projektov — kopija arh-metrike/arh-metrika (ArhivWorkspace),
   podvojeno s predpono pw-, ker gre za drugo komponento (SAMO BRANJE videza arh-,
   ne uvoz iz druge datoteke). Isti veliki stevec (Bodoni serif) kot povsod drugod. */
.pw-metrike{display:grid;grid-template-columns:repeat(3,1fr);gap:.7rem;margin:0 0 1rem}
.pw-metrika{position:relative;overflow:hidden;display:flex;flex-direction:column;align-items:flex-start;min-height:7.4rem;padding:1rem 1.1rem;border:1px solid var(--line);border-radius:14px}
.pw-metrika small{position:relative;z-index:1;font-size:.72rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--muted)}
.pw-metrika strong{position:relative;z-index:1;margin-top:auto;font:500 1.7rem var(--font-serif),Georgia,serif;color:var(--ink);-webkit-text-stroke:.35px var(--ink);text-shadow:0 1px 2px oklch(100% 0 0 / .35)}
.pw-metrika span{position:relative;z-index:1;margin-top:.2rem;color:var(--muted);font-size:.78rem}
.pw-metrika-vrednost{background:linear-gradient(140deg,oklch(95% .035 295),oklch(90% .065 297))}
.pw-metrika-zaracunano{background:linear-gradient(140deg,oklch(96% .035 160),oklch(87% .08 163))}
.pw-metrika-odprto{background:linear-gradient(140deg,oklch(97% .03 65),oklch(90% .07 60))}
.pw-metrika-ikona{position:absolute;right:-1rem;bottom:-1.6rem;display:grid;place-items:center;width:6.6rem;aspect-ratio:1;border-radius:1.6rem;background:oklch(100% 0 0/.24);color:color-mix(in oklch,currentColor 54%,transparent);transform:rotate(-9deg)}
@media (max-width:760px){.pw-metrike{grid-template-columns:1fr 1fr}}
@media (max-width:480px){.pw-metrike{grid-template-columns:1fr}}
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
@media (max-width:640px){
.pw-link-obrazec{grid-template-columns:1fr}
.pw-kmalu-red{grid-template-columns:1fr}
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
};

export default function ProjectsWorkspace({ base, zunanjiFilter, iskanje, onIskanje, status, onStatus, datumOd: datumOdZunaj, datumDo: datumDoZunaj, onDatumOd, onDatumDo, onDetajl }: Props) {
  const [offers, setOffers] = useState<FlowOffer[]>([]); const [invoices, setInvoices] = useState<FlowInvoice[]>([]); const [expenses, setExpenses] = useState<FlowExpense[]>([]); const [contracts, setContracts] = useState<FlowContract[]>([]); const [amounts, setAmounts] = useState<Record<string, number>>({}); const [clients, setClients] = useState<FlowClient[]>([]);
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
  useEffect(() => { const data = podatkiZaPredogled(nacin, loadFlowData()); const loaded = [...data.offers].sort((a, b) => b.date.localeCompare(a.date)); setOffers(loaded); setSelectedId(''); setInvoices(data.invoices); setExpenses(data.expenses); setContracts(data.contracts); setClients(data.clients); setAmounts(Object.fromEntries(data.offers.map(offer => [offer.id, offer.agreedAmount]))); }, [nacin]);
  const projects = useMemo(() => offers.map(offer => { const projectInvoices = invoices.filter(item => item.sourceOfferId === offer.id); const projectExpenses = expenses.filter(item => item.sourceOfferId === offer.id); const projectContracts = contracts.filter(item => item.sourceOfferId === offer.id); const billed = projectInvoices.reduce((sum, item) => sum + item.amount, 0); const paid = projectInvoices.filter(item => item.paid).reduce((sum, item) => sum + item.amount, 0); const costs = projectExpenses.reduce((sum, item) => sum + item.amount, 0); const agreed = amounts[offer.id] || 0; return { offer, invoices: projectInvoices, expenses: projectExpenses, contracts: projectContracts, billed, paid, costs, agreed, unbilled: agreed ? agreed - billed : 0, profit: paid - costs }; }), [offers, invoices, expenses, contracts, amounts]);
  const visible = projects.filter(project => { const text = `${project.offer.title} ${project.offer.client} ${project.offer.number || ''}`.toLocaleLowerCase('sl-SI'); const match = text.includes(search.toLocaleLowerCase('sl-SI')); const state = filter === 'vse' || (filter === 'aktivni' ? project.offer.status === 'accepted' : filter === 'cakajo' ? project.offer.status === 'sent' : ['rejected'].includes(project.offer.status)); return match && state && vObdobju(project.offer.date, datumOd, datumDo); });
  /* povzetek nad tabelo (glej pw-metrike zgoraj) — iz trenutno vidnih projektov
     (upostevajo iskanje/filter/datum), da povzetek sledi temu, kar je v tabeli */
  const pwMetrike = useMemo(() => ({
    vrednost: visible.reduce((sum, project) => sum + project.agreed, 0),
    zaracunano: visible.reduce((sum, project) => sum + project.billed, 0),
    odprto: visible.reduce((sum, project) => sum + Math.max(0, project.agreed - project.billed), 0),
  }), [visible]);
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
      akcija={<Link className="af-akcija-gumb" href={`${base}/kalkulator/orodje`}>+ Nova ponudba</Link>}
    />}

    {!selected ? (
      projects.length === 0 ? (
        <div className={styles.projectStoryEmpty}><span>↗</span><strong>Najprej ustvari ponudbo.</strong><p>Ta bo postala osnova projekta in povezala vse nadaljnje dokumente.</p></div>
      ) : (
        <div className="pw-seznam">
          <div className="pw-metrike">
            <article className="pw-metrika pw-metrika-vrednost">
              <small>Vrednost</small><strong>{money(pwMetrike.vrednost)}</strong><span>dogovorjeno skupaj</span>
              <b className="pw-metrika-ikona"><MetricIcon type="document" /></b>
            </article>
            <article className="pw-metrika pw-metrika-zaracunano">
              <small>Zaračunano</small><strong>{money(pwMetrike.zaracunano)}</strong><span>izdani računi</span>
              <b className="pw-metrika-ikona"><MetricIcon type="paid" /></b>
            </article>
            <article className="pw-metrika pw-metrika-odprto">
              <small>Odprto</small><strong>{money(pwMetrike.odprto)}</strong><span>še ni zaračunano</span>
              <b className="pw-metrika-ikona"><MetricIcon type="profit" /></b>
            </article>
          </div>

          {visible.length ? (
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
        <header><div><p className={styles.eyebrow}>PROJEKT · {selected.offer.number || 'BREZ ŠTEVILKE'}</p><h2>{selected.offer.title}</h2><span><Link href={`${base}/kalkulator/stranke?stranka=${encodeURIComponent(selected.offer.client)}`} className="pw-narocnik-link">{selected.offer.client}</Link> · {new Date(selected.offer.date).toLocaleDateString('sl-SI')}</span></div><b>{statusLabel[selected.offer.status]}</b></header>
        <div className={styles.projectMoney}><label><small>Dogovorjena vrednost</small><span><input type="number" min="0" step="0.01" value={selected.agreed || ''} onChange={event => saveAmount(selected.offer.id, Number(event.target.value))} /> €</span><b className={styles.subpageMetricIcon}><MetricIcon type="document" /></b></label><span><small>Zaračunano</small><strong>{money(selected.billed)}</strong><b className={styles.subpageMetricIcon}><MetricIcon type="paid" /></b></span><span className={selected.unbilled > 0 ? styles.projectNeedsInvoice : ''}><small>Še ni zaračunano</small><strong>{selected.agreed ? money(selected.unbilled) : '—'}</strong><b className={styles.subpageMetricIcon}><MetricIcon type="cost" /></b></span><span><small>Ocenjeni rezultat</small><strong>{money(selected.profit)}</strong><b className={styles.subpageMetricIcon}><MetricIcon type="profit" /></b></span></div>
        <div className={styles.projectNarrative}><article className={styles.projectAgreement}><p className={styles.eyebrow}>01 · DOGOVORJENO</p><h3>Kaj je bilo v ponudbi?</h3>{selected.offer.scope.length ? <ul>{selected.offer.scope.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ul> : <p>Starejša ponudba nima strukturiranega obsega. Odpri jo v kalkulatorju za celotno besedilo.</p>}</article><article><p className={styles.eyebrow}>02 · POGODBE</p><h3>{selected.contracts.length ? `${selected.contracts.length} povezanih` : 'Brez pogodbe'}</h3>{pogodbeSort.slice(0, NAJNOVEJSIH).map(pogodbaVrstica)}{pogodbeSort.length > NAJNOVEJSIH && <button type="button" className="pw-vec" onClick={() => openVsi('pogodbe')}>Prikaži vse ({pogodbeSort.length}) →</button>}<Link href={`${base}/kalkulator/pogodbe`} aria-label="Dodaj pogodbo za ta projekt"><Plus size={18} weight="bold" /></Link></article><article><p className={styles.eyebrow}>03 · RAČUNI</p><h3>{money(selected.billed)}</h3>{racuniSort.slice(0, NAJNOVEJSIH).map(racunVrstica)}{racuniSort.length > NAJNOVEJSIH && <button type="button" className="pw-vec" onClick={() => openVsi('racuni')}>Prikaži vse ({racuniSort.length}) →</button>}<Link href={`${base}/kalkulator/racuni`} aria-label="Dodaj račun za ta projekt"><Plus size={18} weight="bold" /></Link></article><article><p className={styles.eyebrow}>04 · STROŠKI</p><h3>{money(selected.costs)}</h3>{strosekSort.slice(0, NAJNOVEJSIH).map(strosekVrstica)}{strosekSort.length > NAJNOVEJSIH && <button type="button" className="pw-vec" onClick={() => openVsi('stroski')}>Prikaži vse ({strosekSort.length}) →</button>}<Link href={`${base}/kalkulator/stroski`} aria-label="Dodaj strošek za ta projekt"><Plus size={18} weight="bold" /></Link></article><article className="pw-karta pw-dokumentacija"><p className={styles.eyebrow}>05 · DOKUMENTACIJA</p><h3>Povezave do zunanjih datotek</h3>{links.length ? (<div className="pw-linki">{links.map((link, index) => (<div key={`${link.url}-${index}`} className="pw-link-vrstica"><a href={link.url} target="_blank" rel="noopener noreferrer">{link.oznaka}</a>{!samoOgled && <button type="button" className="pw-link-brisi" onClick={() => removeLink(index)} aria-label={`Izbriši povezavo ${link.oznaka}`}>×</button>}</div>))}</div>) : <p className="pw-link-prazno">Še ni dodanih povezav.</p>}{!samoOgled && dodajOdprt && (<div className="pw-link-obrazec"><input type="text" value={linkOznaka} onChange={event => setLinkOznaka(event.target.value)} placeholder="npr. Figma" aria-label="Oznaka povezave" /><input type="url" value={linkUrl} onChange={event => setLinkUrl(event.target.value)} placeholder="https://…" aria-label="Naslov povezave (Figma, Miro, IDD, mapa Drive …)" /><button type="button" className="pw-link-dodaj" onClick={addLink} disabled={!linkOznaka.trim() || !linkUrl.trim()}>+ Dodaj povezavo</button></div>)}{samoOgled && dodajOdprt && <p className="pw-opozorilo">Dodajanje povezav ni na voljo v predogledu (demo). Prijavi se v svoj račun.</p>}<button type="button" className="pw-dok-dodaj" onClick={() => setDodajOdprt(open => !open)} aria-label={dodajOdprt ? 'Zapri dodajanje povezave' : 'Dodaj povezavo'}><Plus size={16} weight="bold" /></button></article></div>

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
