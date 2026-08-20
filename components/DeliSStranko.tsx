'use client';

/* DELI PROJEKT S STRANKO — ustvarjanje in preklic povezave do portala.
 *
 * Stranka ni uporabnica Flowa in ne bo delala računa, zato dostop nosi žeton v
 * povezavi. Ta se pokaže SAMO ob nastanku; v bazi je le njegova zgostitev.
 *
 * Kar stranka vidi, določa zaledje (app/api/portal/[zeton]) — tu tega ne
 * ponavljamo, da se seznama ne bi razšla. Povemo pa naravnost, česa NE vidi,
 * ker je to prvo vprašanje vsakogar, ki tak gumb prvič pritisne.
 */

import { useCallback, useEffect, useState } from 'react';

type Povezava = {
  id: string;
  prejemnik: string | null;
  created_at: string;
  expires_at: string | null;
  revoked_at: string | null;
  last_seen_at: string | null;
  ogledov: number;
};

const datum = (s: string | null) => {
  if (!s) return '';
  const d = new Date(s);
  return isNaN(d.getTime()) ? '' : d.toLocaleDateString('sl-SI');
};

export default function DeliSStranko({ projektId, jeEn = false }: { projektId: string; jeEn?: boolean }) {
  const L = (sl: string, en: string) => (jeEn ? en : sl);
  const [povezave, setPovezave] = useState<Povezava[]>([]);
  const [nalagam, setNalagam] = useState(true);
  const [odprt, setOdprt] = useState(false);
  const [prejemnik, setPrejemnik] = useState('');
  const [dela, setDela] = useState(false);
  const [napaka, setNapaka] = useState('');
  /* Nov žeton se pokaže samo tu in samo enkrat — potem ga ni več od nikoder. */
  const [novaPovezava, setNovaPovezava] = useState('');
  const [kopirano, setKopirano] = useState(false);

  const nalozi = useCallback(async () => {
    try {
      const res = await fetch(`/api/portal?projekt=${encodeURIComponent(projektId)}`);
      if (!res.ok) { setPovezave([]); return; }
      const d = await res.json();
      setPovezave(Array.isArray(d?.povezave) ? d.povezave : []);
    } catch {
      setPovezave([]);
    } finally {
      setNalagam(false);
    }
  }, [projektId]);

  useEffect(() => { void nalozi(); }, [nalozi]);

  const ustvari = async () => {
    setDela(true); setNapaka(''); setNovaPovezava('');
    try {
      const res = await fetch('/api/portal', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ projekt: projektId, prejemnik: prejemnik.trim() }),
      });
      const d = await res.json();
      if (!res.ok || !d?.zeton) { setNapaka(d?.napaka || L('Povezave ni bilo mogoče ustvariti.', 'The link could not be created.')); return; }
      setNovaPovezava(`${window.location.origin}/p/${d.zeton}`);
      setPrejemnik('');
      setOdprt(false);
      await nalozi();
    } catch {
      setNapaka(L('Ne morem do zaledja. Poskusi znova.', 'Cannot reach the backend. Try again.'));
    } finally {
      setDela(false);
    }
  };

  const preklici = async (id: string) => {
    if (!window.confirm(L('Preklic je takojšen — kdor ima to povezavo, projekta ne bo več videl. Nadaljujem?',
                          'Revoking is immediate — whoever has this link will lose access. Continue?'))) return;
    setDela(true); setNapaka('');
    try {
      const res = await fetch('/api/portal', {
        method: 'PATCH', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) { const d = await res.json().catch(() => null); setNapaka(d?.napaka || L('Preklic ni uspel.', 'Revoking failed.')); return; }
      await nalozi();
    } finally {
      setDela(false);
    }
  };

  const kopiraj = () => {
    navigator.clipboard?.writeText(novaPovezava).then(() => {
      setKopirano(true);
      setTimeout(() => setKopirano(false), 2000);
    }).catch(() => { });
  };

  if (nalagam) return null;
  const zive = povezave.filter(p => !p.revoked_at);

  return (
    <div className="ds">
      <p className="ds-naslov">{L('Deli s stranko', 'Share with the client')}</p>

      {novaPovezava && (
        /* Edini trenutek, ko žeton obstaja v vidni obliki. */
        <div className="ds-nova">
          <p className="ds-nova-txt">{L('Povezava je nastala. Pokaže se samo zdaj — shrani ali pošlji jo.', 'The link is ready. It is shown only now — save or send it.')}</p>
          <div className="ds-nova-vrsta">
            <input readOnly value={novaPovezava} onFocus={e => e.currentTarget.select()} />
            <button type="button" onClick={kopiraj}>{kopirano ? L('Kopirano ✓', 'Copied ✓') : L('Kopiraj', 'Copy')}</button>
          </div>
        </div>
      )}

      {zive.length > 0 && (
        <div className="ds-seznam">
          {zive.map(p => (
            <div key={p.id} className="ds-vrstica">
              <span className="ds-kdo">
                <b>{p.prejemnik || L('Povezava brez imena', 'Unnamed link')}</b>
                <small>
                  {L('ustvarjena', 'created')} {datum(p.created_at)}
                  {p.last_seen_at
                    ? ` · ${L('odprta', 'opened')} ${datum(p.last_seen_at)}${p.ogledov > 1 ? ` (${p.ogledov}×)` : ''}`
                    : ` · ${L('še ni odprta', 'not opened yet')}`}
                </small>
              </span>
              <button type="button" className="ds-preklic" disabled={dela} onClick={() => preklici(p.id)}>
                {L('Prekliči', 'Revoke')}
              </button>
            </div>
          ))}
        </div>
      )}

      {odprt ? (
        <div className="ds-obrazec">
          <label>
            <span>{L('Za koga je povezava (samo zate)', 'Who is it for (only you see this)')}</span>
            <input value={prejemnik} onChange={e => setPrejemnik(e.target.value)}
              placeholder={L('npr. Ana, kavarna Luna', 'e.g. Ana, Luna café')} />
          </label>
          <div className="ds-akcije">
            <button type="button" className="ds-glavni" disabled={dela} onClick={ustvari}>
              {dela ? L('Ustvarjam …', 'Creating …') : L('Ustvari povezavo', 'Create link')}
            </button>
            <button type="button" className="ds-drugi" onClick={() => { setOdprt(false); setNapaka(''); }}>
              {L('Prekliči', 'Cancel')}
            </button>
          </div>
        </div>
      ) : (
        <button type="button" className="ds-dodaj" onClick={() => { setOdprt(true); setNovaPovezava(''); }}>
          + {L('Nova povezava za stranko', 'New client link')}
        </button>
      )}

      {napaka && <p className="ds-napaka" role="alert">{napaka}</p>}

      <p className="ds-tiho">
        {L('Stranka vidi projekt, brief, cilje, roke in povezave do datotek. Ponudb, pogodb, računov, stroškov in klepeta z ekipo NE vidi. Povezava deluje brez prijave, zato jo daj samo tistemu, ki mu je namenjena.',
           'The client sees the project, brief, goals, deadlines and file links. They do NOT see quotes, contracts, invoices, costs or team chat. The link works without a login, so give it only to the person it is meant for.')}
      </p>

      <style jsx>{`
        .ds { display: flex; flex-direction: column; gap: .6rem; }
        .ds-naslov { margin: 0; font-size: .68rem; font-weight: 800; letter-spacing: .16em; text-transform: uppercase; color: #6b655d; }
        .ds-nova { padding: .8rem .9rem; border: 1px solid #2F5D50; border-radius: .8rem; background: rgba(47,93,80,.06); display: flex; flex-direction: column; gap: .5rem; }
        .ds-nova-txt { margin: 0; font-size: .8rem; font-weight: 600; color: #2F5D50; }
        .ds-nova-vrsta { display: flex; gap: .4rem; }
        .ds-nova-vrsta input { flex: 1; min-width: 0; padding: .45rem .6rem; border: 1px solid rgba(17,17,17,.14); border-radius: .5rem; background: #fff; font: 500 .78rem inherit; }
        .ds-nova-vrsta button { flex: none; padding: .45rem .8rem; border: 0; border-radius: .5rem; background: #2F5D50; color: #fff; font: 700 .76rem inherit; cursor: pointer; }
        .ds-seznam { display: flex; flex-direction: column; gap: .35rem; }
        .ds-vrstica { display: flex; align-items: center; gap: .6rem; justify-content: space-between; padding: .5rem .7rem; border: 1px solid rgba(17,17,17,.1); border-radius: .7rem; background: #fff; }
        .ds-kdo { display: flex; flex-direction: column; min-width: 0; }
        .ds-kdo b { font-size: .84rem; font-weight: 650; color: var(--ink, #111); }
        .ds-kdo small { font-size: .72rem; color: #6b655d; }
        .ds-preclic, .ds-preklic { flex: none; padding: .3rem .7rem; border: 1px solid rgba(17,17,17,.16); border-radius: 999px; background: #fff; font: 700 .74rem inherit; color: #6b655d; cursor: pointer; }
        .ds-preklic:hover:not(:disabled) { border-color: #a4342a; color: #a4342a; }
        .ds-obrazec { display: flex; flex-direction: column; gap: .5rem; }
        .ds-obrazec label { display: grid; gap: .25rem; font-size: .68rem; font-weight: 800; color: #6b655d; }
        .ds-obrazec input { padding: .5rem .65rem; border: 1px solid rgba(17,17,17,.14); border-radius: .6rem; background: #fff; font: 500 .86rem inherit; color: var(--ink, #111); }
        .ds-akcije { display: flex; gap: .4rem; }
        .ds-glavni, .ds-drugi, .ds-dodaj { padding: .5rem .9rem; border-radius: 999px; font: 800 .78rem inherit; cursor: pointer; }
        .ds-glavni { border: 0; background: #6E4FA6; color: #fff; }
        .ds-glavni:disabled { opacity: .5; cursor: default; }
        .ds-drugi { border: 1px solid rgba(17,17,17,.16); background: #fff; color: var(--ink, #111); }
        .ds-dodaj { align-self: flex-start; border: 1px dashed rgba(17,17,17,.25); background: transparent; color: var(--ink, #111); }
        .ds-dodaj:hover { border-color: #6E4FA6; color: #6E4FA6; }
        .ds-napaka { margin: 0; font-size: .8rem; font-weight: 600; color: #a4342a; }
        .ds-tiho { margin: 0; font-size: .74rem; line-height: 1.45; color: #6b655d; }
      `}</style>
    </div>
  );
}
