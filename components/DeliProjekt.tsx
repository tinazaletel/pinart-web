'use client';

/* DELJENJE PROJEKTA S ČLANOM EKIPE — dva nivoja (dogovor 19. 8. 2026).
 *
 *   Sodelavec    — vidi projekt: brief, cilje, naloge, datoteke, komunikacijo.
 *                  Ponudb, pogodb, računov in stroškov NE vidi.
 *   Polni dostop — vidi vse na projektu, tudi finančno in pravno.
 *
 * Nastavlja se NA PROJEKTU, ne pri osebi: ista oseba je lahko pri enem projektu
 * polna, pri drugem ne. Tako je tudi odločitev tam, kjer nastane.
 *
 * Kako je izvedeno: oba nivoja stojita na obstoječem sistemu iz Faze 4
 * (record_shares + sme_videti_zapis), zato ni novih pravil v bazi.
 *   · Sodelavec  = deljen zapis 'projects'
 *   · Polni      = deljen 'projects' IN 'clients' — deljena stranka po
 *                  sme_videti_zapis samodejno odpre svoje ponudbe, račune in
 *                  pogodbe. Posledica, ki jo je treba vedeti: polni dostop
 *                  odpre TE dokumente tudi za morebitne druge projekte iste
 *                  stranke. Zato je v vmesniku to izrecno napisano.
 */

import { useCallback, useEffect, useState } from 'react';
import { preberiEkipo, preberiDeljenja, deliZapis, prekliciDeljenje, type EkipaOblak } from '@/lib/ekipa';
import { dbIdZaZapis } from '@/lib/pinartFlowCloud';

type Raven = 'brez' | 'sodelavec' | 'polni';

export default function DeliProjekt({
  projektId, strankaId, jeEn = false,
}: {
  projektId: string;
  /* lokalni id stranke (Projekt.strankaId) — potreben za polni dostop */
  strankaId?: string;
  jeEn?: boolean;
}) {
  const L = (sl: string, en: string) => (jeEn ? en : sl);
  const [ekipa, setEkipa] = useState<EkipaOblak | null>(null);
  const [projektDbId, setProjektDbId] = useState<string | null>(null);
  const [strankaDbId, setStrankaDbId] = useState<string | null>(null);
  const [deljenProjekt, setDeljenProjekt] = useState<string[]>([]);
  const [deljenaStranka, setDeljenaStranka] = useState<string[]>([]);
  const [nalagam, setNalagam] = useState(true);
  const [delam, setDelam] = useState<string | null>(null);
  const [napaka, setNapaka] = useState('');
  const [dodajOdprt, setDodajOdprt] = useState(false);

  const naloziDeljenja = useCallback(async (pid: string | null, sid: string | null) => {
    const [p, s] = await Promise.all([
      pid ? preberiDeljenja('projects', pid) : Promise.resolve([]),
      sid ? preberiDeljenja('clients', sid) : Promise.resolve([]),
    ]);
    setDeljenProjekt(p);
    setDeljenaStranka(s);
  }, []);

  useEffect(() => {
    let ziv = true;
    (async () => {
      setNalagam(true);
      const [e, pid, sid] = await Promise.all([
        preberiEkipo(),
        dbIdZaZapis('projects', projektId),
        strankaId ? dbIdZaZapis('clients', strankaId) : Promise.resolve(null),
      ]);
      if (!ziv) return;
      setEkipa(e); setProjektDbId(pid); setStrankaDbId(sid);
      await naloziDeljenja(pid, sid);
      if (ziv) setNalagam(false);
    })();
    return () => { ziv = false; };
  }, [projektId, strankaId, naloziDeljenja]);

  /* Deliti je smiselno le s ČLANI — lastnik in admin vidita vse tako ali tako. */
  const clani = (ekipa?.clani || []).filter(c => c.role === 'member' && !c.isSelf);

  const ravenZa = (userId: string): Raven => {
    if (deljenaStranka.includes(userId) && deljenProjekt.includes(userId)) return 'polni';
    if (deljenProjekt.includes(userId)) return 'sodelavec';
    return 'brez';
  };

  const nastavi = async (userId: string, ciljna: Raven) => {
    if (!projektDbId) return;
    setDelam(userId); setNapaka('');
    const trenutna = ravenZa(userId);
    try {
      /* projekt: potreben pri obeh nivojih */
      if (ciljna === 'brez' && trenutna !== 'brez') await prekliciDeljenje('projects', projektDbId, userId);
      if (ciljna !== 'brez' && trenutna === 'brez') await deliZapis('projects', projektDbId, userId);

      /* stranka: samo pri polnem dostopu */
      if (strankaDbId) {
        const imaStranko = deljenaStranka.includes(userId);
        if (ciljna === 'polni' && !imaStranko) await deliZapis('clients', strankaDbId, userId);
        if (ciljna !== 'polni' && imaStranko) await prekliciDeljenje('clients', strankaDbId, userId);
      }
      await naloziDeljenja(projektDbId, strankaDbId);
    } catch {
      setNapaka(L('Spremembe ni bilo mogoče shraniti.', 'The change could not be saved.'));
    } finally {
      setDelam(null);
    }
  };

  if (nalagam) return null;
  /* Ekipa brez članov: deliti ni s kom — praznega vmesnika ne kažemo. */
  if (!ekipa || clani.length === 0) return null;

  if (!projektDbId) {
    return (
      <p className="dp-tiho">
        {L('Projekt še ni sinhroniziran v oblak, zato ga še ni mogoče deliti. Osveži stran čez trenutek.',
           'This project is not in the cloud yet, so it cannot be shared. Refresh in a moment.')}
      </p>
    );
  }

  const RAVNI: { v: Raven; ime: string; opis: string }[] = [
    { v: 'brez', ime: L('Nima dostopa', 'No access'), opis: L('Projekta ne vidi.', 'Cannot see the project.') },
    { v: 'sodelavec', ime: L('Sodelavec', 'Collaborator'), opis: L('Brief, cilji, naloge, datoteke, komunikacija.', 'Brief, goals, tasks, files, messages.') },
    { v: 'polni', ime: L('Polni dostop', 'Full access'), opis: L('Tudi ponudbe, pogodbe, računi in stroški.', 'Also quotes, contracts, invoices and costs.') },
  ];

  const naProjektu = clani.filter(c => ravenZa(c.userId) !== 'brez');
  const naVoljo = clani.filter(c => ravenZa(c.userId) === 'brez');

  return (
    <div className="dp">
      <p className="dp-naslov">{L('Dostop do projekta', 'Project access')}</p>

      {naProjektu.length === 0 ? (
        <p className="dp-tiho">{L('Nihče iz ekipe še nima dostopa do tega projekta.', 'Nobody from the team has access to this project yet.')}</p>
      ) : naProjektu.map(c => {
        const raven = ravenZa(c.userId);
        return (
          <div key={c.userId} className="dp-vrstica">
            <span className="dp-ime">{c.fullName || c.email}</span>
            <span className="dp-desno">
              <span className="dp-ravni" role="group" aria-label={c.fullName || c.email}>
                <button type="button" className={'dp-raven' + (raven === 'sodelavec' ? ' on' : '')}
                  disabled={delam === c.userId}
                  title={L('Brief, cilji, naloge, datoteke, komunikacija.', 'Brief, goals, tasks, files, messages.')}
                  onClick={() => nastavi(c.userId, 'sodelavec')}>{L('Sodelavec', 'Collaborator')}</button>
                <button type="button" className={'dp-raven' + (raven === 'polni' ? ' on' : '')}
                  disabled={delam === c.userId || !strankaDbId}
                  title={!strankaDbId
                    ? L('Projekt nima pripete stranke — polni dostop se veže nanjo.', 'This project has no client attached — full access is tied to it.')
                    : L('Tudi ponudbe, pogodbe, računi in stroški.', 'Also quotes, contracts, invoices and costs.')}
                  onClick={() => nastavi(c.userId, 'polni')}>{L('Polni dostop', 'Full access')}</button>
              </span>
              <button type="button" className="dp-odstrani" disabled={delam === c.userId}
                aria-label={L('Odstrani z projekta', 'Remove from project') + ' — ' + (c.fullName || c.email)}
                onClick={() => nastavi(c.userId, 'brez')}>×</button>
            </span>
          </div>
        );
      })}

      {naVoljo.length > 0 && (
        <div className="dp-dodaj">
          <button type="button" className="dp-dodaj-gumb" aria-expanded={dodajOdprt}
            onClick={() => setDodajOdprt(o => !o)}>+ {L('Dodaj člana ekipe', 'Add team member')}</button>
          {dodajOdprt && (
            <div className="dp-meni">
              {naVoljo.map(c => (
                /* Nov clan zacne kot Sodelavec — nikoli takoj s financami. */
                <button key={c.userId} type="button" className="dp-meni-opt"
                  onClick={() => { setDodajOdprt(false); nastavi(c.userId, 'sodelavec'); }}>
                  {c.fullName || c.email}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {naProjektu.length > 0 && (
        <p className="dp-tiho">
          {L('Sodelavec vidi brief, cilje, naloge, datoteke in komunikacijo — ponudb, pogodb, računov in stroškov ne. Polni dostop odpre tudi te.',
             'A collaborator sees the brief, goals, tasks, files and messages — not quotes, contracts, invoices or costs. Full access opens those too.')}
          {!strankaDbId ? ' ' + L('Polni dostop je zaklenjen, ker projekt nima pripete stranke.', 'Full access is locked because this project has no client attached.') : ''}
        </p>
      )}
      {napaka && <p className="dp-napaka" role="alert">{napaka}</p>}

      <style jsx>{`
        .dp { display: flex; flex-direction: column; gap: .55rem; }
        .dp-naslov { margin: 0; font-size: .68rem; font-weight: 800; letter-spacing: .16em; text-transform: uppercase; color: #8a8177; }
        .dp-vrstica { display: flex; flex-wrap: wrap; align-items: center; gap: .5rem; justify-content: space-between; }
        .dp-ime { font-size: .86rem; font-weight: 600; color: var(--ink, #111); }
        .dp-ravni { display: inline-flex; border: 1px solid rgba(17,17,17,.14); border-radius: 999px; overflow: hidden; }
        .dp-raven { padding: .38rem .75rem; border: 0; background: #fff; color: #6b655d; font: 600 .74rem inherit; cursor: pointer; transition: background .15s, color .15s; }
        .dp-raven + .dp-raven { border-left: 1px solid rgba(17,17,17,.14); }
        .dp-raven:hover:not(:disabled):not(.on) { background: #F5F2EA; }
        .dp-raven.on { background: #6E4FA6; color: #fff; }
        /* Izbrano stanje »Nima dostopa« ni odobritev, zato ni vijolicno —
           sicer bi bralo kot »dostop je dan«. */
        .dp-desno { display: inline-flex; align-items: center; gap: .4rem; }
        .dp-odstrani { width: 1.7rem; height: 1.7rem; border-radius: 50%; border: 1px solid rgba(17,17,17,.14); background: #fff; color: #8a8177; font-size: .9rem; line-height: 1; cursor: pointer; }
        .dp-odstrani:hover:not(:disabled) { border-color: #a4342a; color: #a4342a; }
        .dp-dodaj { position: relative; align-self: flex-start; }
        .dp-dodaj-gumb { padding: .4rem .8rem; border: 1px dashed rgba(17,17,17,.25); border-radius: 999px; background: transparent; color: var(--ink, #111); font: 700 .76rem inherit; cursor: pointer; }
        .dp-dodaj-gumb:hover { border-color: #6E4FA6; color: #6E4FA6; }
        .dp-meni { position: absolute; top: 100%; left: 0; z-index: 30; margin-top: .3rem; min-width: 12rem; padding: .25rem; background: #fff; border: 1px solid rgba(17,17,17,.12); border-radius: 12px; box-shadow: 0 12px 30px rgba(17,17,17,.12); }
        .dp-meni-opt { display: block; width: 100%; padding: .45rem .6rem; border: 0; border-radius: 8px; background: transparent; text-align: left; font: 600 .82rem inherit; color: var(--ink, #111); cursor: pointer; }
        .dp-meni-opt:hover { background: #F5F2EA; }
        .dp-raven:disabled { opacity: .45; cursor: default; }
        .dp-legenda { margin: .1rem 0 0; padding-left: 1.05rem; display: flex; flex-direction: column; gap: .3rem; font-size: .78rem; line-height: 1.45; color: #8a8177; }
        .dp-legenda b { color: var(--ink, #111); }
        .dp-tiho { margin: 0; font-size: .78rem; line-height: 1.45; color: #8a8177; }
        .dp-napaka { margin: 0; font-size: .8rem; color: #a4342a; }
      `}</style>
    </div>
  );
}
