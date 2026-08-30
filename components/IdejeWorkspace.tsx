'use client';

import { useEffect, useState } from 'react';
import { useLocale } from 'next-intl';

/* »Moje ideje« — živ pregled naročil in statusa gradnje, kot checklist.
   Status: d=Narejeno, p=V teku, w=Čaka tebe, t=Za narediti. Odkljukano
   (»pregledano«) se shrani v localStorage tega brskalnika. */

type Status = 'd' | 'p' | 'w' | 't';
type Ideja = { id: string; status: Status; naslov: string; opis?: string };
type Skupina = { naslov: string; items: Ideja[] };

const SKUPINE: Skupina[] = [
  { naslov: 'CRM · Stranke', items: [
    { id: 'crm1', status: 'd', naslov: 'Več kontaktov na stranki', opis: 'Vsaka oseba svoj telefon in mail.' },
    { id: 'crm2', status: 'd', naslov: 'Klik za klic / mail → zapis v dnevnik' },
    { id: 'crm3', status: 'd', naslov: 'Kontakt kartica: vloga v svojo vrsto + ikone poravnane' },
    { id: 'crm4', status: 'd', naslov: 'CRM dnevnik (klici/sestanki/dogovori)' },
    { id: 'crm6', status: 'd', naslov: 'Kartica Komunikacije na projektu', opis: 'Zdaj »06 · Vse na enem mestu« + Nova pošta.' },
    { id: 'crm5', status: 't', naslov: 'Opomnik »pokliči nazaj«' },
    { id: 'crm7', status: 'w', naslov: 'Deli s stranko (portal)', opis: 'Rabi zaledje/prijavo.' },
  ] },
  { naslov: 'Pošta & komunikacije', items: [
    { id: 'pk1', status: 'd', naslov: '»Nova pošta« sestavljalnik', opis: 'Za / zadeva / oblikovanje.' },
    { id: 'pk2', status: 'd', naslov: 'Projektna pošta v oblak', opis: 'Poslano se zabeleži na projekt.' },
    { id: 'pk3', status: 'd', naslov: 'Podpis pošte (v Nastavitvah)', opis: 'Email neklikabilen — »Odgovori«.' },
    { id: 'pk4', status: 'd', naslov: 'Združeno »Vse na enem mestu«' },
    { id: 'pk5', status: 'd', naslov: 'Poštni predal — temelj (osnutki + koš)' },
    { id: 'pk6', status: 'p', naslov: 'Poštni predal — UI', opis: 'Prejeto / Poslano / Osnutki / Koš + branje.' },
    { id: 'pk7', status: 'w', naslov: 'Prejemanje pošte (inbound)', opis: 'Rabi DNS + potrjeno Resend domeno.' },
    { id: 'pk8', status: 't', naslov: 'Komentiraj mail', opis: 'Označi (rumeno) + sticky-note; stranki citat.' },
    { id: 'pk9', status: 't', naslov: 'Native chat (Supabase Realtime) + Slack/Teams' },
    { id: 'pk10', status: 't', naslov: 'Unified composer — eno okno, vsi kanali', opis: 'Pišeš enkrat, vsak dobi po svojem kanalu.' },
  ] },
  { naslov: 'Naloge · Plan · Ekipa', items: [
    { id: 'n1', status: 'd', naslov: 'Naloga ↔ stranka/projekt + prioriteta + komentarji' },
    { id: 'n2', status: 'd', naslov: 'Plan = matrika Projekt × Oddelek + šef' },
    { id: 'n3', status: 'd', naslov: 'Tedenski razpored + status + prenos v cikel' },
    { id: 'n5', status: 'd', naslov: 'Lastna področja dela + »+« iskalnik' },
    { id: 'n6', status: 'd', naslov: 'Vloge (vodja/član) + demo-zaščita' },
    { id: 'ni1', status: 't', naslov: 'Naloge = tak pregled kot ta seznam', opis: 'Skupine + statusi + odkljukaj + napredek — v appu.' },
    { id: 'n7', status: 't', naslov: 'Gantt časovnica' },
    { id: 'n8', status: 't', naslov: '»Moj dan« (zapadlo / ta teden)' },
  ] },
  { naslov: 'Oblak & Čas', items: [
    { id: 'ob1', status: 'd', naslov: 'Čas / prisotnost v oblak', opis: 'Podatki ne izginejo (ob prijavi).' },
    { id: 'ob2', status: 'd', naslov: 'Preverjeno: vse poslovanje v oblaku' },
  ] },
  { naslov: 'Projekti', items: [
    { id: 'p1', status: 'd', naslov: 'Nov projekt = entiteta + vozlišče' },
    { id: 'p4', status: 'd', naslov: 'Pipeline poslov (faze) + drag&drop' },
    { id: 'p6', status: 'p', naslov: 'Razširjen brief', opis: 'Stranka / persona / dizajn / voice / konkurenca.' },
    { id: 'ni5', status: 't', naslov: 'Projekti tabela: ID · Stranka · Ustvarjeno · Status' },
    { id: 'p7', status: 't', naslov: 'Redesign projekt-vozlišča' },
    { id: 'pd1', status: 't', naslov: 'Detajl: Cilji + Dogovorjeno kompaktno + predogled ponudbe' },
  ] },
  { naslov: 'Koledar', items: [
    { id: 'k1', status: 'd', naslov: 'Navpična urna mreža + sestanki/klici → CRM' },
    { id: 'ni4', status: 't', naslov: 'Mini mesečni + zunanji sync (Google/iCal) + izvoz' },
    { id: 'ni6', status: 't', naslov: 'Sodelavec prisotnost/odsotnost → tvoj koledar' },
    { id: 'k2', status: 't', naslov: 'Redesign v zračni videz' },
  ] },
  { naslov: 'Meni · Dokumenti · Oblika', items: [
    { id: 'nm1', status: 'd', naslov: 'Nastavitve: podpis + videz skupaj + back gumb' },
    { id: 'nm2', status: 'd', naslov: 'Uporabniški meni: ikone na vse postavke' },
    { id: 'nm3', status: 'd', naslov: 'Odstranjen odvečen »Tvoj paket« banner' },
    { id: 'nm4', status: 'd', naslov: 'Landing hero: presledki + fiksna višina + počasnejša rotacija' },
    { id: 'nm5', status: 'd', naslov: 'Landing hero: odsev očal + leteči papir responsive' },
    { id: 'nm6', status: 'd', naslov: 'Popravek »vrže na uvod« + tabelni prikaz se ohrani' },
    { id: 'ni3', status: 't', naslov: 'Barvni tagi (kategorije različnih barv)' },
    { id: 'ni7', status: 't', naslov: 'Cenik: ikone ob funkcijah (à la Figma)' },
    { id: 'm8', status: 't', naslov: 'Knjižnica postavk · podpis na račune · prevodi EN' },
  ] },
  { naslov: 'Drive & shramba', items: [
    { id: 'ni2', status: 't', naslov: 'Drive gradiv (plačljiv po GB)' },
  ] },
  { naslov: 'Velike funkcionalnosti', items: [
    { id: 'vf1', status: 't', naslov: 'AI agent (tekst → glas)', opis: 'Piše pogodbe/ponudbe; razdeli naloge; hands-free.' },
    { id: 'vf2', status: 't', naslov: 'Plačilni sistem (Merchant of Record)' },
    { id: 'vf3', status: 't', naslov: 'PWA — namestljiv na telefon' },
  ] },
  { naslov: 'Zaledje — rabim tebe', items: [
    { id: 'z1', status: 'd', naslov: 'Maili — Resend API ključ (nastavljen)' },
    { id: 'z4', status: 'w', naslov: 'Resend domena — potrdi (DNS: SPF/DKIM)', opis: 'Da pošta res pride strankam + odklene Prejeto.' },
    { id: 'z2', status: 'w', naslov: 'Prava prijava / več-uporabnikov (Supabase env)' },
  ] },
];

const KEY = 'pinart-flow-ideje-pregledano';

export default function IdejeWorkspace() {
  const jeEn = useLocale() === 'en';
  const L = (sl: string, en: string) => (jeEn ? en : sl);
  const STATUS_LABEL: Record<Status, string> = { d: L('Narejeno', 'Done'), p: L('V teku', 'In progress'), w: L('Čaka tebe', 'Waiting for you'), t: L('Za narediti', 'To do') };
  const [pregledano, setPregledano] = useState<Record<string, boolean>>({});
  useEffect(() => { try { setPregledano(JSON.parse(localStorage.getItem(KEY) || '{}') || {}); } catch { /* prazno */ } }, []);
  const toggle = (id: string) => setPregledano(prej => {
    const nov = { ...prej, [id]: !prej[id] };
    try { localStorage.setItem(KEY, JSON.stringify(nov)); } catch { /* shramba polna */ }
    return nov;
  });
  const vsi = SKUPINE.flatMap(s => s.items);
  const stevilo = vsi.filter(i => pregledano[i.id]).length;
  const pct = vsi.length ? Math.round((stevilo / vsi.length) * 100) : 0;

  return (
    <div className="fl-ideje">
      <div className="fli-bar">
        <div className="fli-bar-vrh"><b>{stevilo} / {vsi.length} {L('pregledano', 'reviewed')}</b><small>{pct} %</small></div>
        <div className="fli-track"><div className="fli-fill" style={{ width: `${pct}%` }} /></div>
      </div>
      <p className="fli-hint">{L('Klik na vrstico = pregledano ✓ · barvni pas = status gradnje. Shrani se v tem brskalniku.', 'Click a row to mark it as reviewed ✓ · the coloured strip shows build status. Saved in this browser.')}</p>
      <div className="fli-legend">
        <span><i className="fli-dot d" /> {L('Narejeno', 'Done')}</span>
        <span><i className="fli-dot p" /> {L('V teku', 'In progress')}</span>
        <span><i className="fli-dot w" /> {L('Čaka tebe', 'Waiting for you')}</span>
        <span><i className="fli-dot t" /> {L('Za narediti', 'To do')}</span>
      </div>
      {SKUPINE.map(sk => (
        <section className="fli-grp" key={sk.naslov}>
          <h2>{sk.naslov}</h2>
          <ul>
            {sk.items.map(it => (
              <li key={it.id} className={pregledano[it.id] ? 'done' : ''} onClick={() => toggle(it.id)} role="button" tabIndex={0}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(it.id); } }}>
                <span className="fli-box" aria-hidden>✓</span>
                <span className={`fli-chip ${it.status}`}>{STATUS_LABEL[it.status]}</span>
                <span className="fli-txt"><b>{it.naslov}</b>{it.opis && <small>{it.opis}</small>}</span>
              </li>
            ))}
          </ul>
        </section>
      ))}
      <style dangerouslySetInnerHTML={{ __html: `
        .fl-ideje{max-width:820px}
        .fl-ideje .fli-bar{background:#fff;border:1px solid oklch(92% .006 82);border-radius:14px;padding:.9rem 1rem;box-shadow:0 8px 24px rgba(40,25,60,.05)}
        .fli-bar-vrh{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:.55rem}
        .fli-bar-vrh b{font-size:1.05rem;font-variant-numeric:tabular-nums;color:var(--ink)}
        .fli-bar-vrh small{color:var(--muted)}
        .fli-track{height:.55rem;background:oklch(93% .006 82);border-radius:99px;overflow:hidden}
        .fli-fill{height:100%;background:oklch(58% .13 155);border-radius:99px;transition:width .35s ease}
        .fli-hint{color:var(--muted);font-size:.8rem;margin:.5rem 0 1.1rem}
        .fli-legend{display:flex;flex-wrap:wrap;gap:.4rem .9rem;margin:0 0 1.3rem;font-size:.78rem;color:var(--muted)}
        .fli-legend span{display:inline-flex;align-items:center;gap:.35rem}
        .fli-dot{width:.6rem;height:.6rem;border-radius:50%;display:inline-block}
        .fli-dot.d{background:oklch(58% .13 155)}.fli-dot.p{background:oklch(65% .14 65)}.fli-dot.w{background:oklch(55% .09 265)}.fli-dot.t{background:oklch(60% .01 285)}
        .fli-grp{background:#fff;border:1px solid oklch(92% .006 82);border-radius:16px;box-shadow:0 8px 24px rgba(40,25,60,.05);margin-bottom:1rem;overflow:hidden}
        .fli-grp h2{font-size:.98rem;font-weight:700;margin:0;padding:.95rem 1.1rem .55rem;color:var(--ink)}
        .fli-grp ul{list-style:none;margin:0;padding:.1rem 0 .45rem}
        .fli-grp li{display:flex;align-items:flex-start;gap:.7rem;padding:.55rem 1.1rem;border-top:1px solid oklch(94% .006 82);cursor:pointer;transition:opacity .2s}
        .fli-grp li:first-child{border-top:none}
        .fli-box{flex:none;width:1.25rem;height:1.25rem;margin-top:.05rem;border:1.5px solid oklch(88% .01 82);border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:.75rem;color:transparent;transition:background .15s,border-color .15s}
        .fli-chip{flex:none;font-size:.64rem;font-weight:700;padding:.22rem .5rem;border-radius:999px;min-width:5.4rem;text-align:center;margin-top:.05rem}
        .fli-chip.d{color:oklch(46% .13 155);background:oklch(95% .04 155)}
        .fli-chip.p{color:oklch(50% .13 65);background:oklch(95% .05 75)}
        .fli-chip.w{color:oklch(48% .1 265);background:oklch(95% .03 265)}
        .fli-chip.t{color:var(--muted);background:oklch(95% .004 285)}
        .fli-txt{min-width:0;flex:1}
        .fli-txt b{font-weight:600;color:var(--ink)}
        .fli-txt small{display:block;color:var(--muted);font-size:.8rem;margin-top:.1rem}
        .fli-grp li.done .fli-box{background:oklch(58% .13 155);border-color:oklch(58% .13 155);color:#fff}
        .fli-grp li.done .fli-txt b{text-decoration:line-through;color:var(--muted)}
        .fli-grp li.done{opacity:.6}
      ` }} />
    </div>
  );
}
