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

import { useEffect, useState, type CSSProperties } from 'react';
import {
  DOK_FONTI, DOK_FONT_IMENA, dokFontStack, DOK_BARVA_PRIVZETA, DOK_FONT_PRIVZETI,
  type DokPredloga, nalozitePredloge, shranitePredloge, noviIdPredloge,
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

      <div className="vd-predogled" style={{ '--vd-akcent': barva } as CSSProperties}>
        <span className="vd-pred-kick">Ponudba — predogled</span>
        <h3 style={{ fontFamily: dokFontStack(font) }}>Naslov dokumenta</h3>
        {aktivna?.glava && <span className="vd-pred-glava">{aktivna.glava}</span>}
        <span className="vd-pred-crta" />
        <p>Tako izgledajo naslovi in poudarki v tvojih dokumentih.</p>
        {aktivna?.noga && <p className="vd-pred-noga">{aktivna.noga}</p>}
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
        /* v stolpcu (.vd-blok) flex-basis 220px postane VIŠINA → ogromne vrzeli; tu naj bo naravna višina */
        .vd-blok > .vd-pp { flex: 0 0 auto; }
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
      `}</style>
    </div>
  );
}
