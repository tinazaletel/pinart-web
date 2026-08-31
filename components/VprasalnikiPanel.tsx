'use client';

/* VPRAŠALNIKI V MARKETINGU — sestavi vprašanja, pošlji povezavo, beri odgovore.
 *
 * Doslej je kartica »Vprašalnik« odprla navadno kampanjo: obljubila je obrazec,
 * dala pa zapis v seznamu. Tu je prava stvar (Tina, 31. 8. 2026).
 *
 * Žeton se pokaže ENKRAT, ob nastanku ali ob ponovni izdaji — v bazi je samo
 * zgostitev. Zato povezavo takoj ponudimo v kopiranje in povemo, da je drugič
 * ne bomo mogli pokazati.
 */

import { useCallback, useEffect, useState } from 'react';
import {
  ArrowClockwise, Check, Copy, Eye, Plus, Trash, X,
} from '@phosphor-icons/react';
import {
  izbrisiOdgovor, izbrisiVprasalnik, novZeton, odgovori as pridobiOdgovore,
  oznaciPregledano, shraniVprasalnik, ustvariVprasalnik, vprasalniki as pridobiVprasalnike,
} from '@/lib/vprasalnikOblak';
import { privzetaVprasanja, type Odgovor, type Vprasalnik, type Vprasanje } from '@/lib/vprasalnik';

const TIPI: Array<{ id: Vprasanje['tip']; sl: string; en: string }> = [
  { id: 'kratko', sl: 'Kratek odgovor', en: 'Short answer' },
  { id: 'dolgo', sl: 'Daljši odgovor', en: 'Long answer' },
  { id: 'izbira', sl: 'Ena izbira', en: 'Single choice' },
  { id: 'vec', sl: 'Več izbir', en: 'Multiple choice' },
  { id: 'datum', sl: 'Datum', en: 'Date' },
  { id: 'stevilka', sl: 'Številka', en: 'Number' },
];

export default function VprasalnikiPanel({ jeEn = false, base = '' }: { jeEn?: boolean; base?: string }) {
  const L = (sl: string, en: string) => (jeEn ? en : sl);
  const [seznam, setSeznam] = useState<Vprasalnik[]>([]);
  const [nalagam, setNalagam] = useState(true);
  const [urejam, setUrejam] = useState<Vprasalnik | null>(null);
  const [odgovoriZa, setOdgovoriZa] = useState<Vprasalnik | null>(null);
  const [odgovori, setOdgovori] = useState<Odgovor[]>([]);
  const [zeton, setZeton] = useState<{ id: string; zeton: string } | null>(null);
  const [kopirano, setKopirano] = useState(false);
  const [napaka, setNapaka] = useState('');

  const osvezi = useCallback(async () => {
    setNalagam(true);
    setSeznam(await pridobiVprasalnike());
    setNalagam(false);
  }, []);

  useEffect(() => { void osvezi(); }, [osvezi]);

  const povezava = (z: string) =>
    `${typeof window === 'undefined' ? '' : window.location.origin}${base}/v/${z}`;

  async function nov() {
    setNapaka('');
    const izid = await ustvariVprasalnik({ jeEn });
    if (!izid) { setNapaka(L('Ustvarjanje ni uspelo.', 'Could not create it.')); return; }
    setZeton(izid);
    setKopirano(false);
    await osvezi();
  }

  async function novaPovezava(v: Vprasalnik) {
    setNapaka('');
    const z = await novZeton(v.id);
    if (!z) { setNapaka(L('Nove povezave ni bilo mogoče izdati.', 'Could not issue a new link.')); return; }
    setZeton({ id: v.id, zeton: z });
    setKopirano(false);
  }

  async function shrani(v: Vprasalnik) {
    const ok = await shraniVprasalnik(v);
    if (!ok) { setNapaka(L('Shranjevanje ni uspelo.', 'Could not save.')); return; }
    setUrejam(null);
    await osvezi();
  }

  async function odpriOdgovore(v: Vprasalnik) {
    setOdgovoriZa(v);
    setOdgovori(await pridobiOdgovore(v.id));
  }

  /* ── urejanje vprašanj ─────────────────────────────────────────────────── */

  function spremeniVprasanje(i: number, patch: Partial<Vprasanje>) {
    if (!urejam) return;
    const v = [...urejam.vprasanja];
    v[i] = { ...v[i], ...patch };
    setUrejam({ ...urejam, vprasanja: v });
  }

  function dodajVprasanje() {
    if (!urejam) return;
    setUrejam({
      ...urejam,
      vprasanja: [...urejam.vprasanja, {
        id: `v${Date.now().toString(36)}`, tip: 'kratko',
        besedilo: '', obvezno: false,
      }],
    });
  }

  function premakni(i: number, smer: -1 | 1) {
    if (!urejam) return;
    const cilj = i + smer;
    if (cilj < 0 || cilj >= urejam.vprasanja.length) return;
    const v = [...urejam.vprasanja];
    [v[i], v[cilj]] = [v[cilj], v[i]];
    setUrejam({ ...urejam, vprasanja: v });
  }

  return (
    <section className="vpp">
      <header className="vpp-glava">
        <div>
          <h2>{L('Vprašalniki', 'Questionnaires')}</h2>
          <p>{L('Sestavi vprašanja, pošlji povezavo stranki, odgovori pridejo sem.', 'Build the questions, send the link to a client, answers land here.')}</p>
        </div>
        <button type="button" className="vpp-glavni" onClick={nov}>
          <Plus size={17} weight="bold" aria-hidden /> {L('Nov vprašalnik', 'New questionnaire')}
        </button>
      </header>

      {napaka && <p className="vpp-napaka" role="alert">{napaka}</p>}

      {zeton && (
        <div className="vpp-zeton">
          <p><strong>{L('Povezava je pripravljena.', 'The link is ready.')}</strong> {L('Pokažem jo samo zdaj — pozneje je ne moremo več prebrati, lahko pa izdaš novo.', 'It is shown only now — we cannot read it later, but you can issue a new one.')}</p>
          <div className="vpp-zeton-vrsta">
            <input readOnly value={povezava(zeton.zeton)} onFocus={e => e.currentTarget.select()} />
            <button type="button" onClick={() => {
              void navigator.clipboard?.writeText(povezava(zeton.zeton));
              setKopirano(true);
            }}>
              {kopirano ? <Check size={16} weight="bold" aria-hidden /> : <Copy size={16} aria-hidden />}
              {kopirano ? L('Kopirano', 'Copied') : L('Kopiraj', 'Copy')}
            </button>
          </div>
          <button type="button" className="vpp-tiho" onClick={() => setZeton(null)}>{L('Zapri', 'Close')}</button>
        </div>
      )}

      {nalagam && <p className="vpp-prazno">{L('Nalagam …', 'Loading …')}</p>}

      {!nalagam && !seznam.length && (
        <p className="vpp-prazno">
          {L('Vprašalnika še ni. Nov nastane z desetimi vprašanji, ki jih kreativec tako ali tako postavi na prvem sestanku — uredi jih po svoje.',
             'No questionnaire yet. A new one starts with ten questions a creative asks at the first meeting — edit them as you like.')}
        </p>
      )}

      <ul className="vpp-seznam">
        {seznam.map(v => (
          <li key={v.id} className="vpp-vrsta">
            <div className="vpp-ime">
              <strong>{v.naslov}</strong>
              <small>
                {v.vprasanja.length} {L('vprašanj', 'questions')}
                {' · '}
                {v.odgovorov ? `${v.odgovorov} ${L('odgovorov', 'answers')}` : L('brez odgovorov', 'no answers')}
                {!v.odprt && ` · ${L('zaprt', 'closed')}`}
              </small>
            </div>
            <div className="vpp-dejanja">
              <button type="button" onClick={() => odpriOdgovore(v)} disabled={!v.odgovorov}>
                <Eye size={15} aria-hidden /> {L('Odgovori', 'Answers')}
              </button>
              <button type="button" onClick={() => setUrejam(v)}>{L('Uredi', 'Edit')}</button>
              <button type="button" onClick={() => novaPovezava(v)} title={L('Izda novo povezavo; stara neha delati.', 'Issues a new link; the old one stops working.')}>
                <ArrowClockwise size={15} aria-hidden /> {L('Povezava', 'Link')}
              </button>
              <button type="button" className="vpp-brisi" onClick={async () => {
                if (!window.confirm(L('Izbrišem vprašalnik in vse njegove odgovore?', 'Delete the questionnaire and all its answers?'))) return;
                await izbrisiVprasalnik(v.id);
                await osvezi();
              }}><Trash size={15} aria-hidden /></button>
            </div>
          </li>
        ))}
      </ul>

      {/* ── urejevalnik ─────────────────────────────────────────────────── */}
      {urejam && (
        <div className="vpp-zastor" role="presentation" onMouseDown={e => e.target === e.currentTarget && setUrejam(null)}>
          <div className="vpp-plosca" role="dialog" aria-modal="true" aria-label={L('Uredi vprašalnik', 'Edit questionnaire')}>
            <button type="button" className="vpp-zapri" onClick={() => setUrejam(null)} aria-label={L('Zapri', 'Close')}><X size={18} /></button>
            <h3>{L('Uredi vprašalnik', 'Edit questionnaire')}</h3>

            <label className="vpp-vnos">
              <span>{L('Naslov', 'Title')}</span>
              <input value={urejam.naslov} onChange={e => setUrejam({ ...urejam, naslov: e.target.value })} />
            </label>
            <label className="vpp-vnos">
              <span>{L('Uvod za stranko', 'Intro for the client')}</span>
              <textarea rows={2} value={urejam.uvod || ''} onChange={e => setUrejam({ ...urejam, uvod: e.target.value })} />
            </label>
            <label className="vpp-stikalo">
              <input type="checkbox" checked={urejam.odprt} onChange={e => setUrejam({ ...urejam, odprt: e.target.checked })} />
              {L('Sprejema odgovore', 'Accepting answers')}
            </label>

            <ol className="vpp-vprasanja">
              {urejam.vprasanja.map((v, i) => (
                <li key={v.id}>
                  <div className="vpp-v-vrh">
                    <input className="vpp-v-besedilo" value={v.besedilo}
                      placeholder={L('Vprašanje', 'Question')}
                      onChange={e => spremeniVprasanje(i, { besedilo: e.target.value })} />
                    <select value={v.tip} onChange={e => spremeniVprasanje(i, { tip: e.target.value as Vprasanje['tip'] })}>
                      {TIPI.map(t => <option key={t.id} value={t.id}>{L(t.sl, t.en)}</option>)}
                    </select>
                  </div>
                  {(v.tip === 'izbira' || v.tip === 'vec') && (
                    <input className="vpp-v-moznosti" value={(v.moznosti || []).join(', ')}
                      placeholder={L('Možnosti, ločene z vejico', 'Options, comma separated')}
                      onChange={e => spremeniVprasanje(i, { moznosti: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })} />
                  )}
                  <div className="vpp-v-noga">
                    <label><input type="checkbox" checked={!!v.obvezno}
                      onChange={e => spremeniVprasanje(i, { obvezno: e.target.checked })} /> {L('obvezno', 'required')}</label>
                    <span className="vpp-v-gumbi">
                      <button type="button" onClick={() => premakni(i, -1)} aria-label={L('Gor', 'Up')}>↑</button>
                      <button type="button" onClick={() => premakni(i, 1)} aria-label={L('Dol', 'Down')}>↓</button>
                      <button type="button" onClick={() => setUrejam({ ...urejam, vprasanja: urejam.vprasanja.filter((_, j) => j !== i) })}
                        aria-label={L('Odstrani', 'Remove')}><Trash size={14} /></button>
                    </span>
                  </div>
                </li>
              ))}
            </ol>

            <div className="vpp-plosca-noga">
              <button type="button" className="vpp-tiho" onClick={dodajVprasanje}>
                <Plus size={15} weight="bold" aria-hidden /> {L('Dodaj vprašanje', 'Add question')}
              </button>
              <button type="button" className="vpp-tiho" onClick={() => setUrejam({ ...urejam, vprasanja: privzetaVprasanja(jeEn) })}>
                {L('Vrni privzeta', 'Reset to default')}
              </button>
              <button type="button" className="vpp-glavni" onClick={() => shrani(urejam)}>{L('Shrani', 'Save')}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── odgovori ────────────────────────────────────────────────────── */}
      {odgovoriZa && (
        <div className="vpp-zastor" role="presentation" onMouseDown={e => e.target === e.currentTarget && setOdgovoriZa(null)}>
          <div className="vpp-plosca" role="dialog" aria-modal="true" aria-label={L('Odgovori', 'Answers')}>
            <button type="button" className="vpp-zapri" onClick={() => setOdgovoriZa(null)} aria-label={L('Zapri', 'Close')}><X size={18} /></button>
            <h3>{odgovoriZa.naslov}</h3>
            {!odgovori.length && <p className="vpp-prazno">{L('Še ni odgovorov.', 'No answers yet.')}</p>}
            {odgovori.map(o => (
              <article key={o.id} className={'vpp-odgovor' + (o.pregledano ? ' pregledan' : '')}>
                <header>
                  <strong>{o.podjetje || o.ime || L('Brez imena', 'No name')}</strong>
                  <small>{new Date(o.ustvarjen).toLocaleString('sl-SI')}</small>
                </header>
                <dl>
                  {odgovoriZa.vprasanja.map(v => {
                    const a = o.odgovori[v.id];
                    if (!a || (Array.isArray(a) && !a.length)) return null;
                    return (
                      <div key={v.id}>
                        <dt>{v.besedilo}</dt>
                        <dd>{Array.isArray(a) ? a.join(', ') : a}</dd>
                      </div>
                    );
                  })}
                </dl>
                <footer>
                  {o.eposta && <a href={`mailto:${o.eposta}`}>{o.eposta}</a>}
                  <span className="vpp-v-gumbi">
                    <button type="button" onClick={async () => {
                      await oznaciPregledano(o.id, !o.pregledano);
                      setOdgovori(await pridobiOdgovore(odgovoriZa.id));
                    }}>{o.pregledano ? L('Označi kot novo', 'Mark as new') : L('Pregledano', 'Reviewed')}</button>
                    <button type="button" className="vpp-brisi" onClick={async () => {
                      if (!window.confirm(L('Izbrišem ta odgovor?', 'Delete this answer?'))) return;
                      await izbrisiOdgovor(o.id);
                      setOdgovori(await pridobiOdgovore(odgovoriZa.id));
                      await osvezi();
                    }}><Trash size={14} /></button>
                  </span>
                </footer>
              </article>
            ))}
          </div>
        </div>
      )}

      <style jsx>{`
        .vpp { display: grid; gap: 1rem; }
        .vpp-glava { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; flex-wrap: wrap; }
        .vpp-glava h2 { margin: 0; font-size: 1.15rem; }
        .vpp-glava p { margin: .25rem 0 0; font-size: .88rem; color: rgba(17,17,17,.62); }
        .vpp-glavni { display: inline-flex; align-items: center; gap: .4rem; padding: .6rem 1.1rem; border: 0; border-radius: 999px; background: #111; color: #fff; font: inherit; font-weight: 600; font-size: .88rem; cursor: pointer; }
        .vpp-tiho { display: inline-flex; align-items: center; gap: .4rem; padding: .55rem 1rem; border: 1px solid var(--line, rgba(17,17,17,.14)); border-radius: 999px; background: #fff; font: inherit; font-size: .86rem; cursor: pointer; }
        .vpp-napaka { margin: 0; font-size: .86rem; font-weight: 600; color: rgb(150,52,88); }
        .vpp-prazno { margin: 0; font-size: .9rem; line-height: 1.55; color: rgba(17,17,17,.6); max-width: 46rem; }

        .vpp-zeton { display: grid; gap: .6rem; padding: 1rem 1.1rem; border: 1px solid rgba(124,58,237,.3); border-radius: 14px; background: rgba(124,58,237,.06); }
        .vpp-zeton p { margin: 0; font-size: .88rem; line-height: 1.5; }
        .vpp-zeton-vrsta { display: flex; gap: .5rem; flex-wrap: wrap; }
        .vpp-zeton-vrsta input { flex: 1 1 22rem; min-width: 0; padding: .6rem .8rem; border: 1px solid var(--line, rgba(17,17,17,.14)); border-radius: .7rem; background: #fff; font: inherit; font-size: .85rem; }
        .vpp-zeton-vrsta button { display: inline-flex; align-items: center; gap: .4rem; padding: .6rem 1rem; border: 0; border-radius: .7rem; background: #111; color: #fff; font: inherit; font-size: .85rem; font-weight: 600; cursor: pointer; }

        .vpp-seznam { list-style: none; margin: 0; padding: 0; display: grid; gap: .5rem; }
        .vpp-vrsta { display: flex; align-items: center; justify-content: space-between; gap: 1rem; flex-wrap: wrap; padding: .85rem 1rem; border: 1px solid var(--line, rgba(17,17,17,.12)); border-radius: 14px; background: #fff; }
        .vpp-ime strong { display: block; font-size: .98rem; }
        .vpp-ime small { font-size: .82rem; color: rgba(17,17,17,.58); }
        .vpp-dejanja { display: flex; gap: .4rem; flex-wrap: wrap; }
        .vpp-dejanja button { display: inline-flex; align-items: center; gap: .35rem; padding: .45rem .8rem; border: 1px solid var(--line, rgba(17,17,17,.14)); border-radius: 999px; background: #fff; font: inherit; font-size: .82rem; cursor: pointer; }
        .vpp-dejanja button:disabled { opacity: .45; cursor: default; }
        .vpp-brisi { color: rgb(150,52,88); border-color: rgba(178,84,118,.35) !important; }

        .vpp-zastor { position: fixed; inset: 0; z-index: 140; background: rgba(17,17,17,.3); display: grid; place-items: center; padding: 1.2rem; }
        .vpp-plosca { position: relative; width: min(46rem, 100%); max-height: 86dvh; overflow: auto; padding: 1.5rem 1.6rem 1.6rem; border-radius: 18px; background: #fff; }
        .vpp-plosca h3 { margin: 0 0 1rem; font-size: 1.1rem; }
        .vpp-zapri { position: absolute; top: .9rem; right: .9rem; width: 2rem; height: 2rem; display: grid; place-items: center; border: 1px solid var(--line, rgba(17,17,17,.14)); border-radius: 50%; background: #fff; cursor: pointer; }
        .vpp-vnos { display: grid; gap: .3rem; margin-bottom: .8rem; }
        .vpp-vnos span { font-size: .8rem; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; color: rgba(17,17,17,.6); }
        .vpp-vnos input, .vpp-vnos textarea { width: 100%; box-sizing: border-box; padding: .6rem .8rem; border: 1px solid var(--line, rgba(17,17,17,.14)); border-radius: .7rem; font: inherit; font-size: .92rem; }
        .vpp-stikalo { display: inline-flex; align-items: center; gap: .45rem; font-size: .88rem; margin-bottom: 1rem; }

        .vpp-vprasanja { list-style: none; margin: 0; padding: 0; display: grid; gap: .6rem; }
        .vpp-vprasanja li { padding: .7rem .8rem; border: 1px solid var(--line, rgba(17,17,17,.12)); border-radius: 12px; display: grid; gap: .45rem; }
        .vpp-v-vrh { display: flex; gap: .5rem; flex-wrap: wrap; }
        .vpp-v-besedilo { flex: 1 1 18rem; min-width: 0; padding: .5rem .7rem; border: 1px solid var(--line, rgba(17,17,17,.14)); border-radius: .6rem; font: inherit; font-size: .9rem; }
        .vpp-v-vrh select { padding: .5rem .6rem; border: 1px solid var(--line, rgba(17,17,17,.14)); border-radius: .6rem; font: inherit; font-size: .85rem; background: #fff; }
        .vpp-v-moznosti { width: 100%; box-sizing: border-box; padding: .5rem .7rem; border: 1px solid var(--line, rgba(17,17,17,.14)); border-radius: .6rem; font: inherit; font-size: .85rem; }
        .vpp-v-noga { display: flex; align-items: center; justify-content: space-between; gap: .6rem; font-size: .82rem; color: rgba(17,17,17,.66); }
        .vpp-v-gumbi { display: inline-flex; gap: .3rem; }
        .vpp-v-gumbi button { width: 1.9rem; height: 1.9rem; display: grid; place-items: center; border: 1px solid var(--line, rgba(17,17,17,.14)); border-radius: 50%; background: #fff; cursor: pointer; font: inherit; }
        .vpp-plosca-noga { display: flex; gap: .5rem; flex-wrap: wrap; margin-top: 1.1rem; }

        .vpp-odgovor { padding: .9rem 1rem; border: 1px solid var(--line, rgba(17,17,17,.12)); border-radius: 14px; margin-bottom: .7rem; }
        .vpp-odgovor.pregledan { opacity: .68; }
        .vpp-odgovor header { display: flex; align-items: baseline; justify-content: space-between; gap: .8rem; margin-bottom: .6rem; }
        .vpp-odgovor header small { font-size: .78rem; color: rgba(17,17,17,.55); }
        .vpp-odgovor dl { margin: 0; display: grid; gap: .5rem; }
        .vpp-odgovor dt { font-size: .78rem; font-weight: 700; letter-spacing: .03em; text-transform: uppercase; color: rgba(17,17,17,.55); }
        .vpp-odgovor dd { margin: .15rem 0 0; font-size: .92rem; line-height: 1.5; white-space: pre-wrap; }
        .vpp-odgovor footer { display: flex; align-items: center; justify-content: space-between; gap: .8rem; margin-top: .8rem; font-size: .85rem; }
        .vpp-odgovor footer button { padding: .35rem .7rem; border: 1px solid var(--line, rgba(17,17,17,.14)); border-radius: 999px; background: #fff; font: inherit; font-size: .8rem; cursor: pointer; }
      `}</style>
    </section>
  );
}
