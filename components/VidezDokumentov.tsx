'use client';

/* Nastavitev videza dokumentov: barva poudarka + pisava naslovov + (novo) VEC
   PREDLOG, ker ima uporabnica vec podjetij. Uporablja kalkulator (profil),
   retainer (profil) in nastavitve. Barva/pisava se se vedno shranita v K_NAST
   prek starsa (onBarva/onFont) — to ostane NESPREMENJENO, da doc builderji
   (ki berejo dokBarva/dokFont) delujejo naprej brez sprememb. Predloge
   (seznam + aktivna + logo/glava/noga) so NOVO, samostojno upravljane tu in
   shranjene prek lib/dokVidez.ts (nalozitePredloge/shranitePredloge) — ob
   vsaki spremembi aktivne predloge se njena barva/pisava/logo zrcalita nazaj
   skozi onBarva/onFont/onLogo, da starsevo stanje ostane usklajeno. */

import { useEffect, useRef, useState, type CSSProperties, type RefObject } from 'react';
import {
  DOK_FONTI, DOK_FONT_IMENA, dokFontStack, DOK_BARVA_PRIVZETA, DOK_FONT_PRIVZETI,
  type DokPredloga, nalozitePredloge, shranitePredloge, noviIdPredloge,
  DOK_PODLOGE_A4,
} from '@/lib/dokVidez';

const BARVE = ['#6E4FA6', '#7C4DD6', '#3730A3', '#111111', '#2F5D50', '#A44A3F', '#B8860B'];

/* naloži izbrane Google pisave v aplikacijo, da je predogled na zaslonu pravilen */
function naloziPisave() {
  if (typeof document === 'undefined') return;
  DOK_FONT_IMENA.forEach(ime => {
    const g = DOK_FONTI[ime]?.google;
    if (!g) return;
    const id = 'dokfont-' + ime.replace(/\s+/g, '-');
    if (document.getElementById(id)) return;
    const l = document.createElement('link');
    l.id = id; l.rel = 'stylesheet';
    l.href = `https://fonts.googleapis.com/css2?family=${g}&display=swap`;
    document.head.appendChild(l);
  });
}

export default function VidezDokumentov({
  barva, font, onBarva, onFont, logo, onLogo,
}: {
  barva: string; font: string;
  onBarva: (v: string) => void; onFont: (v: string) => void;
  logo?: string; onLogo?: (v: string) => void;
}) {
  useEffect(() => { naloziPisave(); }, []);

  /* seznam predlog + aktivna izbira — samostojno upravljano tukaj,
     nalozeno/shranjeno prek lib/dokVidez.ts (migracija stare nastavitve
     v "Privzeta" se zgodi samodejno ob prvem branju). */
  const [predloge, setPredloge] = useState<DokPredloga[]>([]);
  const [aktivnaId, setAktivnaId] = useState('');
  const [nalozeno, setNalozeno] = useState(false);

  useEffect(() => {
    const z = nalozitePredloge();
    setPredloge(z.predloge);
    setAktivnaId(z.aktivnaId);
    setNalozeno(true);
  }, []);

  const aktivna = predloge.find(p => p.id === aktivnaId);

  /* posodobi eno predlogo (po id) + persistiraj celoten seznam */
  const posodobiPredlogo = (id: string, delno: Partial<DokPredloga>) => {
    setPredloge(prev => {
      const next = prev.map(p => (p.id === id ? { ...p, ...delno } : p));
      shranitePredloge(next, aktivnaId);
      return next;
    });
  };

  const izberiBarvo = (b: string) => {
    onBarva(b);
    if (aktivnaId) posodobiPredlogo(aktivnaId, { barva: b });
  };
  const izberiFont = (f: string) => {
    onFont(f);
    if (aktivnaId) posodobiPredlogo(aktivnaId, { font: f });
  };

  /* preklopi AKTIVNO predlogo: njena barva/pisava/logo se takoj zrcalijo
     navzgor (onBarva/onFont/onLogo), da starsevo stanje (in s tem dokumenti)
     takoj odrazajo izbrano predlogo. */
  const izberiPredlogo = (p: DokPredloga) => {
    setAktivnaId(p.id);
    shranitePredloge(predloge, p.id);
    onBarva(p.barva || DOK_BARVA_PRIVZETA);
    onFont(p.font || DOK_FONT_PRIVZETI);
    onLogo?.(p.logo || '');
  };

  const dodajPredlogo = () => {
    const nova: DokPredloga = { id: noviIdPredloge(), ime: 'Nova predloga', barva: DOK_BARVA_PRIVZETA, font: DOK_FONT_PRIVZETI };
    const next = [...predloge, nova];
    setPredloge(next);
    setAktivnaId(nova.id);
    shranitePredloge(next, nova.id);
    onBarva(nova.barva); onFont(nova.font); onLogo?.('');
  };

  const izbrisiPredlogo = (id: string) => {
    if (predloge.length <= 1) return;
    if (!window.confirm('Izbrišem to predlogo?')) return;
    const next = predloge.filter(p => p.id !== id);
    const novaAktivna = aktivnaId === id ? next[0].id : aktivnaId;
    setPredloge(next);
    setAktivnaId(novaAktivna);
    shranitePredloge(next, novaAktivna);
    if (aktivnaId === id) {
      const akt = next[0];
      onBarva(akt.barva || DOK_BARVA_PRIVZETA);
      onFont(akt.font || DOK_FONT_PRIVZETI);
      onLogo?.(akt.logo || '');
    }
  };

  const platnicaRef = useRef<HTMLInputElement>(null);
  const ozadjeRef = useRef<HTMLInputElement>(null);

  /* uvoz lastne slike -> data URI, shranjen na aktivno predlogo (platnica/ozadje) */
  const uvoziSliko = (file: File | undefined, polje: 'platnica' | 'ozadje') => {
    if (!file || !aktivna) return;
    if (file.size > 2_000_000) { window.alert('Slika je prevelika (nad 2 MB). Izberi manjšo ali stisnjeno.'); return; }
    const r = new FileReader();
    r.onload = () => posodobiPredlogo(aktivna.id, { [polje]: String(r.result || '') } as Partial<DokPredloga>);
    r.readAsDataURL(file);
  };

  /* izbirnik podloge (naslovnica / notranje strani): galerija A4 sličic + »Brez«
     + čist gumb za uvoz (skrit sistemski file input). Vrednost -> aktivna predloga. */
  const podlogaBlok = (polje: 'platnica' | 'ozadje', oznaka: string, opis: string, ref: RefObject<HTMLInputElement>) => {
    if (!aktivna) return null;
    const vrednost = aktivna[polje];
    const jeUvoz = !!vrednost && vrednost.startsWith('data:');
    const izberi = (v: string | undefined) => posodobiPredlogo(aktivna.id, { [polje]: v } as Partial<DokPredloga>);
    return (
      <div className="vd-podloga-skupina">
        <div className="vd-podloga-glava">
          <span className="vd-oznaka">{oznaka}</span>
          <span className="vd-podloga-opis">{opis}</span>
        </div>
        <div className="vd-tiles">
          <button type="button" className={'vd-tile vd-tile-brez' + (!vrednost ? ' on' : '')} onClick={() => izberi(undefined)} title="Brez podloge — prazno ozadje">
            <svg viewBox="0 0 28 40" aria-hidden><rect x="2" y="2" width="24" height="36" rx="3" /><line x1="6" y1="34" x2="22" y2="6" /></svg>
            <span>Brez</span>
          </button>
          {DOK_PODLOGE_A4.map(url => (
            <button key={url} type="button" className={'vd-tile' + (vrednost === url ? ' on' : '')} style={{ backgroundImage: `url(${url})` }} aria-label={`${oznaka} — ${url.split('/').pop()}`} onClick={() => izberi(url)}>
              {vrednost === url && <span className="vd-tile-check" aria-hidden>✓</span>}
            </button>
          ))}
          {jeUvoz && (
            <button type="button" className="vd-tile on" style={{ backgroundImage: `url(${vrednost})` }} title="Tvoja slika — klikni Uvozi za zamenjavo" aria-label="Uvožena slika" onClick={() => ref.current?.click()}>
              <span className="vd-tile-check" aria-hidden>✓</span>
            </button>
          )}
          <button type="button" className="vd-tile vd-tile-uvoz" onClick={() => ref.current?.click()} title="Uvozi svojo sliko (JPG ali PNG)">
            <svg viewBox="0 0 24 24" aria-hidden><path d="M12 15V4" /><path d="M8 8l4-4 4 4" /><path d="M5 15v3a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-3" /></svg>
            <span>Uvozi</span>
          </button>
          <input ref={ref} type="file" accept="image/*" hidden onChange={e => { uvoziSliko(e.target.files?.[0], polje); e.currentTarget.value = ''; }} />
        </div>
      </div>
    );
  };

  return (
    <div className="vd-ovoj">
      <p className="vd-uvod">Ta barva in pisava se uporabita na <b>vseh dokumentih</b> — ponudbah, računih in pogodbah. Nastaviš enkrat, stil je povsod enak.</p>

      {nalozeno && (
        <div className="vd-blok">
          <span className="vd-oznaka">Predloge {predloge.length > 1 ? `(${predloge.length})` : ''}</span>
          <div className="vd-predloge">
            {predloge.map(p => (
              <button key={p.id} type="button"
                className={'vd-predloga' + (p.id === aktivnaId ? ' on' : '')}
                style={{ '--vd-pill-barva': p.barva } as CSSProperties}
                onClick={() => izberiPredlogo(p)}>
                <span className="vd-predloga-pika" />
                {p.ime || 'Predloga'}
              </button>
            ))}
            <button type="button" className="vd-predloga vd-predloga-dodaj" onClick={dodajPredlogo}>+ Nova predloga</button>
          </div>
          {aktivna && (
            <div className="vd-predloga-urejanje">
              <label className="vd-pp">
                <span>Ime predloge</span>
                <input type="text" value={aktivna.ime} onChange={e => posodobiPredlogo(aktivna.id, { ime: e.target.value })} placeholder="npr. Pinart" />
              </label>
              {predloge.length > 1 && (
                <button type="button" className="vd-predloga-izbrisi" onClick={() => izbrisiPredlogo(aktivna.id)}>Izbriši to predlogo</button>
              )}
            </div>
          )}
        </div>
      )}

      <div className="vd-blok">
        <span className="vd-oznaka">Barva poudarka</span>
        <div className="vd-barve">
          {BARVE.map(b => (
            <button key={b} type="button" aria-label={b}
              className={'vd-barva' + (barva.toLowerCase() === b.toLowerCase() ? ' on' : '')}
              style={{ background: b }} onClick={() => izberiBarvo(b)} />
          ))}
          <label className="vd-barva vd-barva-custom" title="Poljubna barva">
            <input type="color" value={barva} onChange={e => izberiBarvo(e.target.value)} />
            <span aria-hidden>+</span>
          </label>
        </div>
      </div>

      <div className="vd-blok">
        <span className="vd-oznaka">Pisava naslovov</span>
        <div className="vd-fonti">
          {DOK_FONT_IMENA.map(f => (
            <button key={f} type="button"
              className={'vd-font' + (font === f ? ' on' : '')}
              style={{ fontFamily: dokFontStack(f) }} onClick={() => izberiFont(f)}>
              {f}
            </button>
          ))}
        </div>
      </div>

      {nalozeno && aktivna && (
        <div className="vd-blok">
          <span className="vd-oznaka">Glava in noga dokumenta (neobvezno)</span>
          <label className="vd-pp">
            <span>Glava — kratek napis ob imenu (npr. slogan)</span>
            <input type="text" value={aktivna.glava || ''} onChange={e => posodobiPredlogo(aktivna.id, { glava: e.target.value })} placeholder="npr. Studio za znamke in digital" />
          </label>
          <label className="vd-pp">
            <span>Noga — besedilo na dnu dokumenta (npr. kontakt, pravno obvestilo)</span>
            <textarea rows={2} value={aktivna.noga || ''} onChange={e => posodobiPredlogo(aktivna.id, { noga: e.target.value })} placeholder="npr. Pinart d.o.o. · info@pinart.si · www.pinart.si" />
          </label>
        </div>
      )}

      {nalozeno && aktivna && (
        <div className="vd-blok">
          <span className="vd-oznaka">Podloge dokumenta (neobvezno)</span>
          {podlogaBlok('platnica', 'Naslovnica', 'ozadje prve strani', platnicaRef)}
          {podlogaBlok('ozadje', 'Notranje strani', 'ozadje vsebinskih strani', ozadjeRef)}
        </div>
      )}

      <div className="vd-blok">
        <span className="vd-oznaka">Predogled</span>
        <div className="vd-doc-preview" style={{ '--vd-akcent': barva } as CSSProperties}>
          <div className={'vd-doc vd-doc-cover' + (aktivna?.platnica ? ' has-bg' : '')} style={aktivna?.platnica ? { backgroundImage: `url(${aktivna.platnica})` } : undefined}>
            <div className="vd-doc-inner-wrap">
              {logo && <img className="vd-doc-logo" src={logo} alt="" />}
              <span className="vd-doc-kick">PONUDBA</span>
              <h4 className="vd-doc-naslov" style={{ fontFamily: dokFontStack(font) }}>Naslov dokumenta</h4>
              {aktivna?.glava && <span className="vd-doc-glava">{aktivna.glava}</span>}
              <span className="vd-doc-crta" />
              <span className="vd-doc-firma">{aktivna?.ime || 'Tvoje podjetje'}</span>
            </div>
            <span className="vd-doc-oznaka-strani">Naslovnica</span>
          </div>
          <div className={'vd-doc vd-doc-inner' + (aktivna?.ozadje ? ' has-bg' : '')} style={aktivna?.ozadje ? { backgroundImage: `url(${aktivna.ozadje})` } : undefined}>
            <div className="vd-doc-inner-wrap">
              <span className="vd-doc-kick2">VSEBINA</span>
              <h5 className="vd-doc-h5" style={{ fontFamily: dokFontStack(font) }}>Predlog rešitve</h5>
              <span className="vd-doc-line" /><span className="vd-doc-line" /><span className="vd-doc-line short" />
              <span className="vd-doc-line" /><span className="vd-doc-line short" />
            </div>
            <span className="vd-doc-oznaka-strani">Notranja stran</span>
          </div>
        </div>
      </div>

      {(barva.toLowerCase() !== DOK_BARVA_PRIVZETA.toLowerCase() || font !== DOK_FONT_PRIVZETI) && (
        <button type="button" className="vd-ponastavi" onClick={() => {
          onBarva(DOK_BARVA_PRIVZETA); onFont(DOK_FONT_PRIVZETI);
          if (aktivnaId) posodobiPredlogo(aktivnaId, { barva: DOK_BARVA_PRIVZETA, font: DOK_FONT_PRIVZETI });
        }}>
          Ponastavi na privzeto
        </button>
      )}

      <style jsx>{`
        .vd-ovoj { display: flex; flex-direction: column; gap: 1.5rem; }
        .vd-uvod { margin: 0; font-size: .9rem; line-height: 1.55; color: #4a4550; }
        .vd-blok { display: flex; flex-direction: column; gap: .7rem; }
        .vd-oznaka { font-size: .72rem; font-weight: 700; letter-spacing: .16em; text-transform: uppercase; color: #8a8177; }
        .vd-predloge { display: flex; flex-wrap: wrap; gap: .5rem; align-items: center; }
        .vd-predloga { display: inline-flex; align-items: center; gap: .45rem; padding: .5rem .9rem; border-radius: 999px; border: 1.5px solid rgba(17,17,17,.15); background: #fff; color: #111; font-size: .82rem; font-weight: 600; cursor: pointer; transition: border-color .15s, background .15s, color .15s; }
        .vd-predloga:hover { border-color: rgba(17,17,17,.4); }
        .vd-predloga.on { border-color: #111; background: #111; color: #F5F2EA; }
        .vd-predloga-pika { width: 9px; height: 9px; border-radius: 999px; background: var(--vd-pill-barva, #111); flex: none; }
        .vd-predloga-dodaj { background: transparent; border-style: dashed; color: #4a4550; font-weight: 500; }
        .vd-predloga-dodaj:hover { border-style: solid; }
        .vd-predloga-urejanje { display: flex; flex-wrap: wrap; align-items: flex-end; gap: .8rem; margin-top: .3rem; }
        .vd-predloga-izbrisi { background: none; border: none; color: #a44a3f; font-size: .8rem; text-decoration: underline; text-underline-offset: .2em; cursor: pointer; padding: 0 0 .55rem; }
        .vd-predloga-izbrisi:hover { color: #7a332a; }
        .vd-pp { display: flex; flex-direction: column; gap: .35rem; font-size: .78rem; color: #4a4550; flex: 1 1 220px; }
        .vd-pp input, .vd-pp textarea { font: inherit; font-size: .92rem; color: #111; padding: .55rem .75rem; border-radius: 9px; border: 1.5px solid rgba(17,17,17,.15); background: #fff; resize: vertical; }
        .vd-pp input:focus, .vd-pp textarea:focus { outline: none; border-color: rgba(17,17,17,.4); }
        .vd-pred-glava { display: block; margin-top: .3rem; font-size: .78rem; letter-spacing: .04em; color: var(--vd-akcent); font-weight: 600; }
        .vd-pred-noga { margin-top: .9rem !important; padding-top: .7rem; border-top: 1px solid rgba(17,17,17,.1); font-size: .78rem !important; color: #9a9088 !important; white-space: pre-line; }
        .vd-barve { display: flex; flex-wrap: wrap; gap: .6rem; }
        .vd-barva { width: 38px; height: 38px; border-radius: 999px; border: 2px solid rgba(0,0,0,.08); cursor: pointer; padding: 0; transition: transform .15s, box-shadow .15s; }
        .vd-barva:hover { transform: translateY(-2px); }
        .vd-barva.on { box-shadow: 0 0 0 2px #fff, 0 0 0 4px #111; }
        .vd-barva-custom { position: relative; display: flex; align-items: center; justify-content: center; background: #fff; color: #111; font-size: 1.2rem; font-weight: 600; overflow: hidden; }
        .vd-barva-custom input { position: absolute; inset: 0; opacity: 0; cursor: pointer; }
        .vd-fonti { display: flex; flex-wrap: wrap; gap: .6rem; }
        .vd-font { padding: .6rem 1.1rem; border-radius: 999px; border: 1.5px solid rgba(17,17,17,.15); background: #fff; color: #111; font-size: 1.05rem; cursor: pointer; transition: border-color .15s, background .15s; }
        .vd-font:hover { border-color: rgba(17,17,17,.4); }
        .vd-font.on { border-color: #111; background: #111; color: #F5F2EA; }
        .vd-predogled { border: 1px solid rgba(17,17,17,.1); border-radius: 14px; padding: 1.4rem 1.5rem; background: #FCFBF7; }
        .vd-pred-kick { font-size: .68rem; letter-spacing: .24em; text-transform: uppercase; font-weight: 700; color: var(--vd-akcent); }
        .vd-predogled h3 { margin: .5rem 0 0; font-size: 1.7rem; font-weight: 600; color: #111; line-height: 1.1; }
        .vd-pred-crta { display: block; width: 48px; height: 2px; background: var(--vd-akcent); margin: .9rem 0; }
        .vd-predogled p { margin: 0; font-size: .9rem; color: #5a5560; line-height: 1.5; }
        .vd-ponastavi { align-self: flex-start; background: none; border: none; color: #8a8177; font-size: .82rem; text-decoration: underline; text-underline-offset: .2em; cursor: pointer; padding: 0; }
        .vd-ponastavi:hover { color: #111; }
        /* ── Podloge: galerija A4 sličic ── */
        .vd-podloga-skupina { display: flex; flex-direction: column; gap: .5rem; }
        .vd-podloga-glava { display: flex; align-items: baseline; gap: .5rem; flex-wrap: wrap; }
        .vd-podloga-glava .vd-oznaka { text-transform: none; letter-spacing: .01em; font-size: .84rem; font-weight: 700; color: #2a2530; }
        .vd-podloga-opis { font-size: .74rem; color: #9a9088; }
        .vd-tiles { display: flex; flex-wrap: wrap; gap: .55rem; }
        .vd-tile { width: 74px; height: 104px; border-radius: 9px; border: 1.5px solid rgba(17,17,17,.14); background-size: cover; background-position: center; background-color: #fff; cursor: pointer; padding: 0; position: relative; overflow: hidden; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: .25rem; transition: border-color .15s, transform .15s, box-shadow .15s; }
        .vd-tile:hover { transform: translateY(-2px); border-color: rgba(17,17,17,.4); }
        .vd-tile.on { border-color: #111; box-shadow: 0 0 0 2px #fff, 0 0 0 3.5px #111; }
        .vd-tile-check { position: absolute; top: 5px; right: 5px; width: 18px; height: 18px; border-radius: 50%; background: #111; color: #fff; font-size: 11px; display: flex; align-items: center; justify-content: center; box-shadow: 0 1px 3px rgba(0,0,0,.3); }
        .vd-tile-brez, .vd-tile-uvoz { color: #8a8177; font-size: .72rem; font-weight: 600; }
        .vd-tile-brez:hover, .vd-tile-uvoz:hover { color: #111; }
        .vd-tile-brez svg { width: 26px; height: 37px; stroke: currentColor; stroke-width: 1.4; fill: none; opacity: .55; }
        .vd-tile-uvoz { border-style: dashed; }
        .vd-tile-uvoz svg { width: 20px; height: 20px; stroke: currentColor; stroke-width: 1.8; fill: none; stroke-linecap: round; stroke-linejoin: round; }
        /* ── Predogled dokumenta (naslovnica + notranja stran) ── */
        .vd-doc-preview { display: flex; flex-wrap: wrap; gap: 1rem; padding: 1.3rem; border-radius: 14px; background: #F1EEE7; }
        .vd-doc { position: relative; width: 150px; height: 212px; border-radius: 6px; background: #FCFBF7; background-size: cover; background-position: center; box-shadow: 0 6px 18px rgba(20,15,18,.14); overflow: hidden; flex: none; }
        .vd-doc.has-bg::before { content: ''; position: absolute; inset: 0; z-index: 0; }
        .vd-doc-cover.has-bg::before { background: linear-gradient(180deg, rgba(20,15,18,.28), rgba(20,15,18,.5)); }
        .vd-doc-inner.has-bg::before { background: rgba(255,255,255,.55); }
        .vd-doc-inner-wrap { position: relative; z-index: 1; height: 100%; display: flex; flex-direction: column; padding: 16px 14px; }
        .vd-doc-cover .vd-doc-inner-wrap { justify-content: center; align-items: flex-start; }
        .vd-doc-logo { width: 34px; height: auto; margin-bottom: 10px; }
        .vd-doc-kick, .vd-doc-kick2 { font-size: 7px; letter-spacing: .22em; font-weight: 700; color: var(--vd-akcent); }
        .vd-doc-cover.has-bg .vd-doc-kick { color: #fff; }
        .vd-doc-naslov { margin: 6px 0 0; font-size: 15px; line-height: 1.05; color: #141414; font-weight: 600; }
        .vd-doc-cover.has-bg .vd-doc-naslov, .vd-doc-cover.has-bg .vd-doc-firma { color: #fff; }
        .vd-doc-glava { font-size: 7px; color: var(--vd-akcent); margin-top: 3px; font-weight: 600; }
        .vd-doc-crta { display: block; width: 30px; height: 2px; background: var(--vd-akcent); margin: 9px 0; }
        .vd-doc-cover.has-bg .vd-doc-crta { background: #fff; }
        .vd-doc-firma { font-size: 8px; color: #555; font-weight: 600; }
        .vd-doc-h5 { margin: 5px 0 10px; font-size: 12px; color: #141414; font-weight: 600; }
        .vd-doc-line { display: block; height: 4px; border-radius: 2px; background: rgba(20,15,18,.14); margin-bottom: 6px; }
        .vd-doc-line.short { width: 62%; }
        .vd-doc-inner.has-bg .vd-doc-line { background: rgba(20,15,18,.22); }
        .vd-doc-oznaka-strani { position: absolute; bottom: 6px; left: 0; right: 0; text-align: center; font-size: 8px; color: #9a9088; z-index: 1; }
        .vd-doc-cover.has-bg .vd-doc-oznaka-strani, .vd-doc-inner.has-bg .vd-doc-oznaka-strani { color: rgba(255,255,255,.9); }
      `}</style>
    </div>
  );
}
