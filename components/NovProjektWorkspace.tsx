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

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, PencilSimple } from '@phosphor-icons/react';
import { loadFlowData, saveProjectLinks, type FlowClient } from '@/lib/pinartFlowStore';
import { podatkiZaPredogled, usePredogled } from '@/lib/predogled';
import { naslednjaStevilka, preberiProjekti, shraniProjekt, type Projekt, type ProjektCilj, type ProjektPovezava, type ProjektStatus, type ProjektVprasanje } from '@/lib/projekti';
import { preberiSodelavci, vlogaOznaka } from '@/lib/sodelavci';
import type { Sodelavec } from '@/lib/naloge';

const datStr = (s: string) => { const d = new Date(s); return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('sl-SI'); };
const projektStatusOznaka: Record<ProjektStatus, string> = { aktiven: 'Aktiven', pavza: 'V pavzi', koncan: 'Končan' };

export default function NovProjektWorkspace({ base }: { base: string }) {
  const router = useRouter();
  const [nacin] = usePredogled();
  const [clients, setClients] = useState<FlowClient[]>([]);
  const [sodelavci, setSodelavci] = useState<Sodelavec[]>([]);
  const [realProjekti, setRealProjekti] = useState<Projekt[]>([]);

  useEffect(() => {
    const flow = podatkiZaPredogled(nacin, loadFlowData());
    setClients(flow.clients);
    setSodelavci(preberiSodelavci());
    setRealProjekti(preberiProjekti());
  }, [nacin]);

  const prazenObrazec = () => ({ naslov: '', strankaId: '', zacetek: '', rok: '', status: 'aktiven' as ProjektStatus, zelje: '', cilji: [] as ProjektCilj[], dodatnaVprasanja: [] as ProjektVprasanje[], povezave: [] as ProjektPovezava[], dodeljeni: [] as string[] });
  const [obrazec, setObrazec] = useState(prazenObrazec());
  /* onboarding kot CHAT (glej np-chat-* spodaj): novKorak = do kam je uporabnica
     ze prisla (0..6, 6 = vsa osnovna vprasanja odgovorjena -> dodatno+povezave+ekipa+zakljucek);
     urejamKorak = klik na ze odgovorjen mehurcek odpre polje ZNOVA V MESTU */
  const [novKorak, setNovKorak] = useState(0);
  const [urejamKorak, setUrejamKorak] = useState<number | null>(null);
  const [novoVprasanje, setNovoVprasanje] = useState({ vprasanje: '', odgovor: '' });
  const [povezavaNaslov, setPovezavaNaslov] = useState('');
  const [povezavaUrl, setPovezavaUrl] = useState('');

  const dodajCilj = () => setObrazec(o => ({ ...o, cilji: [...o.cilji, { id: crypto.randomUUID(), besedilo: '', metrika: '', tarca: '' }] }));
  const odstraniCilj = (id: string) => setObrazec(o => ({ ...o, cilji: o.cilji.filter(c => c.id !== id) }));
  const posodobiCilj = (id: string, patch: Partial<ProjektCilj>) => setObrazec(o => ({ ...o, cilji: o.cilji.map(c => c.id === id ? { ...c, ...patch } : c) }));
  /* potrdi trenutni korak vprasanja: naprej=true premakne kazalec (NAPREJ), sicer
     samo zapre "urejanje v mestu" (Shrani na ze odgovorjenem koraku) */
  const potrdiKorak = (naprej: boolean) => { setUrejamKorak(null); if (naprej) setNovKorak(k => Math.min(6, k + 1)); };
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
      id: crypto.randomUUID(),
      stevilka: naslednjaStevilka(realProjekti),
      naslov,
      strankaId: stranka?.id,
      strankaIme: stranka?.name,
      zelje: obrazec.zelje.trim() || undefined,
      cilji: obrazec.cilji.filter(c => c.besedilo.trim()).map(c => ({ id: c.id, besedilo: c.besedilo.trim(), metrika: c.metrika?.trim() || undefined, tarca: c.tarca?.trim() || undefined })),
      zacetek: obrazec.zacetek || undefined,
      rok: obrazec.rok || undefined,
      status: obrazec.status,
      created: new Date().toISOString(),
      dodatnaVprasanja: obrazec.dodatnaVprasanja.length ? obrazec.dodatnaVprasanja : undefined,
      povezave: obrazec.povezave.length ? obrazec.povezave : undefined,
      dodeljeni: obrazec.dodeljeni.length ? obrazec.dodeljeni : undefined,
    };
    shraniProjekt(projekt);
    if (obrazec.povezave.length) saveProjectLinks(`real-${projekt.id}`, obrazec.povezave.map(p => ({ oznaka: p.naslov, url: p.url })));
    router.push(`${base}/kalkulator/projekti?projekt=real-${projekt.id}`);
  };

  /* mehurcek bota (vprasanje) + moj odgovor (klikljiv, odpre urejanje v mestu) — isti
     vzorec kot chat-bot/chat-jaz v KalkulatorApp.tsx/ProjectsWorkspace, tu s predpono np- */
  const chatBot = (naslov: string, opis?: string) => <div className="np-chat-bot"><span className="np-chat-mehur"><b>{naslov}</b>{opis && <small>{opis}</small>}</span></div>;
  const chatOdgovor = (korak: number, vsebina: string) => (
    <div className="np-chat-jaz"><button type="button" className="np-chat-mehur-ured" onClick={() => setUrejamKorak(korak)} title="Klikni za popravek"><span>{vsebina}</span><PencilSimple size={13} weight="bold" aria-hidden /></button></div>
  );
  const prikazan = (i: number) => novKorak >= i;
  const aktiven = (i: number) => novKorak === i || urejamKorak === i;
  const odgovorjen = (i: number) => novKorak > i && urejamKorak !== i;

  return <div className="np">
    <div className="np-stolpec">
      <p className="np-kicker">Ustvari projekt</p>
      <h1 className="np-h1">Začni nov projekt.</h1>

      <div className="np-chat-tok">
        {/* 0 · naslov */}
        {prikazan(0) && chatBot('Kako se projekt imenuje?')}
        {odgovorjen(0) && chatOdgovor(0, obrazec.naslov.trim() || '—')}
        {aktiven(0) && (
          <form className="np-chat-vnos" onSubmit={event => { event.preventDefault(); if (obrazec.naslov.trim()) potrdiKorak(urejamKorak !== 0); }}>
            <input className="np-chat-polje" type="text" autoFocus value={obrazec.naslov} onChange={event => setObrazec(o => ({ ...o, naslov: event.target.value }))} placeholder="npr. Prenova celostne podobe" aria-label="Naslov projekta" />
            <button type="submit" className="np-chat-naprej" disabled={!obrazec.naslov.trim()}>{urejamKorak === 0 ? 'Shrani' : 'Naprej'} <ArrowRight size={15} weight="bold" aria-hidden /></button>
          </form>
        )}

        {/* 1 · stranka */}
        {prikazan(1) && chatBot('Za katero stranko je ta projekt?', clients.length ? 'Izberi iz imenika — ali nadaljuj brez stranke.' : 'V imeniku še ni strank — lahko nadaljuješ brez izbora.')}
        {odgovorjen(1) && chatOdgovor(1, clients.find(c => c.id === obrazec.strankaId)?.name || 'Brez stranke')}
        {aktiven(1) && (
          <form className="np-chat-vnos" onSubmit={event => { event.preventDefault(); potrdiKorak(urejamKorak !== 1); }}>
            <select className="np-chat-polje" value={obrazec.strankaId} onChange={event => setObrazec(o => ({ ...o, strankaId: event.target.value }))} aria-label="Stranka">
              <option value="">Brez stranke</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <button type="submit" className="np-chat-naprej">{urejamKorak === 1 ? 'Shrani' : 'Naprej'} <ArrowRight size={15} weight="bold" aria-hidden /></button>
          </form>
        )}

        {/* 2 · cilji */}
        {prikazan(2) && chatBot('Kaj so cilji projekta?', 'Dodaj enega ali več — lahko tudi preskočiš.')}
        {odgovorjen(2) && chatOdgovor(2, obrazec.cilji.filter(c => c.besedilo.trim()).length ? obrazec.cilji.filter(c => c.besedilo.trim()).map(c => c.besedilo.trim()).join(' · ') : 'Brez ciljev')}
        {aktiven(2) && (
          <div className="np-chat-vnos">
            {obrazec.cilji.map(cilj => (
              <div key={cilj.id} className="np-nov-cilj">
                <input type="text" value={cilj.besedilo} onChange={event => posodobiCilj(cilj.id, { besedilo: event.target.value })} placeholder="Cilj, npr. povečati prepoznavnost znamke" aria-label="Cilj" />
                <input type="text" value={cilj.metrika || ''} onChange={event => posodobiCilj(cilj.id, { metrika: event.target.value })} placeholder="Metrika (neobvezno)" aria-label="Metrika cilja" />
                <input type="text" value={cilj.tarca || ''} onChange={event => posodobiCilj(cilj.id, { tarca: event.target.value })} placeholder="Tarča (neobvezno)" aria-label="Tarča cilja" />
                <button type="button" className="np-link-brisi" onClick={() => odstraniCilj(cilj.id)} aria-label="Odstrani cilj">×</button>
              </div>
            ))}
            <button type="button" className="np-nov-dodaj-cilj" onClick={dodajCilj}>+ Dodaj cilj</button>
            <button type="button" className="np-chat-naprej" onClick={() => potrdiKorak(urejamKorak !== 2)}>{urejamKorak === 2 ? 'Shrani' : 'Naprej'} <ArrowRight size={15} weight="bold" aria-hidden /></button>
          </div>
        )}

        {/* 3 · želje stranke */}
        {prikazan(3) && chatBot('Kakšne so želje stranke?', 'Persona, barve, ton — prosto besedilo.')}
        {odgovorjen(3) && chatOdgovor(3, obrazec.zelje.trim() || 'Brez posebnih želja')}
        {aktiven(3) && (
          <form className="np-chat-vnos" onSubmit={event => { event.preventDefault(); potrdiKorak(urejamKorak !== 3); }}>
            <textarea className="np-chat-polje" value={obrazec.zelje} onChange={event => setObrazec(o => ({ ...o, zelje: event.target.value }))} placeholder="Npr. mlada, drzna persona; toplo-nevtralna paleta; neposreden ton …" rows={4} aria-label="Želje stranke" />
            <button type="submit" className="np-chat-naprej">{urejamKorak === 3 ? 'Shrani' : 'Naprej'} <ArrowRight size={15} weight="bold" aria-hidden /></button>
          </form>
        )}

        {/* 4 · začetek/rok */}
        {prikazan(4) && chatBot('Kdaj začneš in do kdaj?')}
        {odgovorjen(4) && chatOdgovor(4, [obrazec.zacetek && datStr(obrazec.zacetek), obrazec.rok && `do ${datStr(obrazec.rok)}`].filter(Boolean).join(' ') || 'Ni določeno')}
        {aktiven(4) && (
          <form className="np-chat-vnos" onSubmit={event => { event.preventDefault(); potrdiKorak(urejamKorak !== 4); }}>
            <div className="np-nov-mreza">
              <label className="np-nov-polje"><span>Začetek</span><input type="date" value={obrazec.zacetek} onChange={event => setObrazec(o => ({ ...o, zacetek: event.target.value }))} /></label>
              <label className="np-nov-polje"><span>Predviden rok</span><input type="date" value={obrazec.rok} onChange={event => setObrazec(o => ({ ...o, rok: event.target.value }))} /></label>
            </div>
            <button type="submit" className="np-chat-naprej">{urejamKorak === 4 ? 'Shrani' : 'Naprej'} <ArrowRight size={15} weight="bold" aria-hidden /></button>
          </form>
        )}

        {/* 5 · status — izbira takoj potrdi in gre naprej (kot binarna izbira v ponudbi) */}
        {prikazan(5) && chatBot('Kakšen je status projekta?')}
        {odgovorjen(5) && chatOdgovor(5, projektStatusOznaka[obrazec.status])}
        {aktiven(5) && (
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
        {novKorak >= 6 && (<>
          {chatBot('Želiš dodati svoja vprašanja?', 'Npr. »Ima stranka že CGP?« — vprašanje in odgovor si zapišeš sama.')}
          <div className="np-chat-vnos">
            {obrazec.dodatnaVprasanja.map(v => (
              <div key={v.id} className="np-vprasanje-vrstica">
                <div><b>{v.vprasanje}</b><span>{v.odgovor}</span></div>
                <button type="button" className="np-link-brisi" onClick={() => odstraniVprasanje(v.id)} aria-label="Odstrani vprašanje">×</button>
              </div>
            ))}
            <div className="np-link-obrazec">
              <input type="text" value={novoVprasanje.vprasanje} onChange={event => setNovoVprasanje(v => ({ ...v, vprasanje: event.target.value }))} placeholder="Vprašanje, npr. Ima stranka že CGP?" aria-label="Vprašanje" />
              <input type="text" value={novoVprasanje.odgovor} onChange={event => setNovoVprasanje(v => ({ ...v, odgovor: event.target.value }))} placeholder="Odgovor" aria-label="Odgovor" />
              <button type="button" className="np-link-dodaj" onClick={dodajVprasanje} disabled={!novoVprasanje.vprasanje.trim() || !novoVprasanje.odgovor.trim()}>+ Dodaj vprašanje</button>
            </div>
          </div>

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

          {chatBot('Deli projekt in dodeli sodelavce.', 'Klikni osebo, da jo dodeliš — »Deli projekt« pošlje vabilo dodeljenim.')}
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
            <button type="button" className="np-gumb" onClick={shraniNovProjekt} disabled={!obrazec.naslov.trim()}>Ustvari projekt</button>
            <Link className="np-gumb sek" href={`${base}/kalkulator/projekti`}>Prekliči</Link>
          </div>
        </>)}
      </div>
    </div>

    {/* stili kot pogodbe/računi: navaden <style> (globalno), zato np- predpona povsod */}
    <style>{`
      .np{min-width:0}
      .np-stolpec{width:100%;max-width:720px;margin:0 auto}
      .np-kicker{font-size:.78rem;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:var(--accent,#B25476);margin:0 0 .3rem}
      .np-h1{font-family:var(--font-serif),Didot,serif;font-weight:500;font-size:clamp(1.7rem,3.4vw,2.4rem);line-height:1;letter-spacing:-.012em;margin:0 0 2rem;color:var(--ink)}

      .np-chat-tok{display:flex;flex-direction:column;gap:1.1rem}
      @keyframes npChatIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
      .np-chat-bot,.np-chat-jaz,.np-chat-izbire,.np-chat-vnos{animation:npChatIn .38s cubic-bezier(.16,1,.3,1) both}
      @media (prefers-reduced-motion:reduce){.np-chat-bot,.np-chat-jaz,.np-chat-izbire,.np-chat-vnos{animation:none}}
      /* mehurcek bota: violet-mehka pika (isti "Pinart mehurcek" jezik kot ostali chat) + oblacek levo poravnan */
      .np-chat-bot{display:flex;max-width:94%}
      .np-chat-bot .np-chat-mehur{position:relative;padding:.9rem 1.2rem .9rem 2.6rem;border-radius:18px;border-bottom-left-radius:6px;background:oklch(96% .022 300);border:1px solid color-mix(in oklch,var(--ink) 7%,transparent);font-size:.92rem;line-height:1.5}
      .np-chat-bot .np-chat-mehur::before{content:'';position:absolute;left:.85rem;top:1rem;width:1.2rem;height:1.2rem;border-radius:50%;background:radial-gradient(58% 48% at 30% 24%,rgba(255,255,255,.92),rgba(255,255,255,0) 62%),conic-gradient(from 210deg,#7C3AED,#EC4899,#F59E0B,#38BDF8,#7C3AED);box-shadow:0 2px 6px rgba(124,58,237,.28)}
      .np-chat-bot .np-chat-mehur b{display:block;font-weight:700;color:var(--ink)}
      .np-chat-bot .np-chat-mehur small{display:block;margin-top:.2rem;font-weight:400;font-size:.82rem;color:color-mix(in oklch,var(--ink) 62%,transparent)}
      /* moj odgovor: mint mehurcek, desno poravnan, klikljiv (odpre urejanje v mestu) */
      .np-chat-jaz{align-self:flex-end;max-width:94%}
      .np-chat-mehur-ured{display:inline-flex;align-items:center;gap:.55rem;padding:.75rem 1.1rem;border-radius:18px;border-bottom-right-radius:6px;background:oklch(89% .05 165);border:1px solid color-mix(in oklch,var(--ink) 7%,transparent);color:var(--ink);font:inherit;font-size:.86rem;font-weight:600;text-align:left;cursor:pointer;transition:transform .15s,box-shadow .15s}
      .np-chat-mehur-ured:hover{transform:translateY(-1px);box-shadow:0 7px 18px rgba(40,25,40,.13)}
      .np-chat-mehur-ured svg{opacity:.4;flex:none;transition:opacity .15s}
      .np-chat-mehur-ured:hover svg{opacity:.85}
      /* vnosno polje pod vprasanjem bota — zamaknjeno pod mehurcek, "Naprej" pilula z ink ozadjem */
      .np-chat-vnos{display:flex;flex-direction:column;align-items:flex-start;gap:.65rem;max-width:calc(100% - 1rem);margin:-.2rem 0 0 .3rem}
      .np-chat-polje{width:100%;box-sizing:border-box;padding:.75rem 1.1rem;border:1px solid rgba(17,17,17,.14);border-radius:999px;background:#fff;font:inherit;font-size:.9rem;font-weight:600;color:var(--ink);box-shadow:0 4px 14px rgba(40,25,40,.05);outline:none}
      textarea.np-chat-polje{border-radius:1rem;resize:vertical;min-height:5rem;font-weight:400;line-height:1.5;font-family:inherit}
      select.np-chat-polje{cursor:pointer}
      .np-chat-polje:focus{border-color:color-mix(in oklch,var(--ink) 45%,transparent)}
      .np-chat-naprej{align-self:flex-start;display:inline-flex;align-items:center;gap:.4rem;padding:.65rem 1.2rem;border:0;border-radius:999px;background:var(--ink);color:var(--paper);font:700 .78rem var(--font-sans),sans-serif;cursor:pointer}
      .np-chat-naprej:disabled{opacity:.45;cursor:not-allowed}
      .np-chat-naprej:hover:not(:disabled){background:color-mix(in oklch,var(--ink) 82%,transparent)}
      /* izbirne kartice (status) — pod vprasanjem bota, klik takoj potrdi in gre naprej */
      .np-chat-izbire{display:flex;flex-direction:column;gap:.55rem;margin:-.2rem 0 0 .3rem}
      .np-chat-opcija{display:flex;align-items:center;gap:.8rem;width:min(380px,100%);padding:.8rem 1rem;border:1px solid var(--line);border-radius:14px;background:oklch(99% .006 87 / .85);font:inherit;color:var(--ink);text-align:left;cursor:pointer;transition:transform .18s,border-color .18s,box-shadow .18s}
      .np-chat-opcija:hover{transform:translateY(-2px);border-color:color-mix(in oklch,var(--ink) 28%,transparent);box-shadow:0 8px 20px rgba(40,25,40,.08)}
      .np-crk{display:grid;place-items:center;width:1.8rem;height:1.8rem;border-radius:8px;background:oklch(94% .045 295);color:var(--ink);font-weight:800;font-size:.78rem;flex:none}

      .np-nov-mreza{display:grid;grid-template-columns:1fr 1fr;gap:.7rem}
      .np-nov-polje{display:flex;flex-direction:column;gap:.35rem;min-width:0}
      .np-nov-polje span{font-size:.7rem;font-weight:700;color:var(--muted)}
      .np-nov-polje input{width:100%;box-sizing:border-box;padding:.65rem .8rem;border:1px solid var(--line);border-radius:.7rem;background:oklch(100% 0 0 / .7);font:inherit;font-size:.85rem;color:var(--ink)}
      .np-nov-cilj{display:grid;grid-template-columns:1.4fr 1fr 1fr auto;align-items:center;gap:.45rem}
      .np-nov-cilj input{box-sizing:border-box;padding:.6rem .7rem;border:1px solid var(--line);border-radius:.6rem;background:oklch(100% 0 0 / .7);font:inherit;font-size:.78rem;color:var(--ink);min-width:0}
      .np-nov-dodaj-cilj{align-self:start;margin-top:.1rem;padding:.55rem .9rem;border:1px dashed color-mix(in oklch,var(--ink) 28%,transparent);border-radius:.7rem;background:transparent;font:700 .7rem var(--font-sans),sans-serif;color:var(--ink);cursor:pointer}
      .np-nov-dodaj-cilj:hover{background:oklch(100% 0 0 / .5)}

      .np-link-brisi{flex:none;display:grid;place-items:center;width:1.6rem;height:1.6rem;padding:0;border:1px solid var(--line);border-radius:50%;background:transparent;color:var(--muted);font-size:.9rem;line-height:1;cursor:pointer}
      .np-link-brisi:hover{background:var(--ink);color:var(--paper)}
      .np-vprasanje-vrstica{display:flex;align-items:flex-start;justify-content:space-between;gap:.6rem;padding:.65rem .8rem;border:1px solid var(--line);border-radius:.8rem;background:oklch(100% 0 0 / .55)}
      .np-vprasanje-vrstica div{display:flex;flex-direction:column;gap:.15rem;min-width:0}
      .np-vprasanje-vrstica b{font-size:.8rem;color:var(--ink);font-weight:700}
      .np-vprasanje-vrstica span{font-size:.76rem;color:color-mix(in oklch,var(--ink) 62%,transparent)}
      .np-link-obrazec{display:grid;grid-template-columns:1fr;gap:.5rem;margin-top:.2rem}
      .np-link-obrazec input{padding:.6rem .75rem;border:1px solid var(--line);border-radius:.6rem;background:oklch(100% 0 0 / .7);font:inherit;font-size:.8rem;color:var(--ink);min-width:0}
      .np-link-dodaj{flex:none;padding:.55rem .9rem;border:1px solid var(--ink);border-radius:.6rem;background:var(--ink);color:var(--paper);font:700 .74rem var(--font-sans),sans-serif;cursor:pointer}
      .np-link-dodaj:disabled{opacity:.5;cursor:not-allowed}
      .np-linki{display:flex;flex-direction:column;gap:.45rem}
      .np-link-vrstica{display:flex;align-items:center;gap:.5rem;padding:.55rem .7rem;border:1px solid var(--line);border-radius:.7rem;background:oklch(100% 0 0 / .55)}
      .np-link-vrstica a{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--ink);font-weight:700;font-size:.78rem;text-decoration:none}
      .np-link-vrstica a:hover{text-decoration:underline}

      .np-chat-sodelavci{display:flex;flex-wrap:wrap;gap:.55rem}
      .np-chat-sodelavec{display:flex;align-items:center;gap:.6rem;padding:.55rem .9rem .55rem .55rem;border:1px solid var(--line);border-radius:999px;background:oklch(99% .006 87 / .85);font:inherit;color:var(--ink);cursor:pointer;transition:border-color .16s,background .16s}
      .np-chat-sodelavec b{font-size:.78rem;font-weight:700}
      .np-chat-sodelavec small{display:block;color:color-mix(in oklch,var(--ink) 55%,transparent);font-size:.64rem}
      .np-chat-sod-krog{display:grid;place-items:center;width:1.8rem;height:1.8rem;border-radius:50%;background:oklch(90% .045 297);color:oklch(40% .16 297);font-size:.64rem;font-weight:800;flex:none}
      .np-chat-sodelavec.on{border-color:var(--ink);background:oklch(93% .04 165)}
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
        .np-nov-mreza{grid-template-columns:1fr}
        .np-nov-cilj{grid-template-columns:1fr;gap:.35rem;padding:.65rem;border:1px solid var(--line);border-radius:.7rem}
        .np-chat-vnos,.np-chat-izbire{margin-left:0}
        .np-chat-bot,.np-chat-jaz{max-width:100%}
      }
    `}</style>
  </div>;
}
