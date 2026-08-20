'use client';

/* DELJENJE ZAPISA S ČLANOM EKIPE — Faza 4, Stage 3 (vmesnik).
   Po Stage 2 član vidi SAMO zapise, ki jih je sam ustvaril. Ta komponenta da
   lastniku/adminu gumb, da zapis izrecno deli z izbranim članom.

   Posebnost: deljenje STRANKE (resource='clients') samodejno odpre tudi vse
   njene ponudbe, račune in pogodbe — tako se ne deli vsak dokument posebej
   (glej sme_videti_zapis v migraciji Stage 1).

   Zapis mora biti sinhroniziran v oblak (ima vrstico v bazi); dokler ni,
   pokažemo mirno pojasnilo namesto gumbov. */

import { useEffect, useState } from 'react';
import { preberiEkipo, preberiDeljenja, deliZapis, prekliciDeljenje, type DeljivVir, type EkipaOblak } from '@/lib/ekipa';
import { dbIdZaZapis } from '@/lib/pinartFlowCloud';

type Zbirka = 'offers' | 'invoices' | 'expenses' | 'contracts' | 'clients' | 'projects';

export default function DeliZapis({
  vir, lokalniId, naslov, jeEn = false,
}: {
  vir: Extract<DeljivVir, Zbirka>;
  /* id zapisa, kot ga pozna aplikacija (v bazi shranjen kot external_id) */
  lokalniId: string;
  /* kratek opis zapisa za sporočila (npr. ime stranke) */
  naslov?: string;
  jeEn?: boolean;
}) {
  const L = (sl: string, en: string) => (jeEn ? en : sl);
  const [ekipa, setEkipa] = useState<EkipaOblak | null>(null);
  const [dbId, setDbId] = useState<string | null>(null);
  const [deljeno, setDeljeno] = useState<string[]>([]);
  const [nalagam, setNalagam] = useState(true);
  const [delam, setDelam] = useState<string | null>(null);
  const [sporocilo, setSporocilo] = useState('');

  useEffect(() => {
    let ziv = true;
    (async () => {
      setNalagam(true);
      const [e, id] = await Promise.all([preberiEkipo(), dbIdZaZapis(vir, lokalniId)]);
      if (!ziv) return;
      setEkipa(e);
      setDbId(id);
      if (id) {
        const s = await preberiDeljenja(vir, id);
        if (ziv) setDeljeno(s);
      }
      if (ziv) setNalagam(false);
    })();
    return () => { ziv = false; };
  }, [vir, lokalniId]);

  /* Deliti je smiselno le s ČLANI — lastnik in admin vidita vse tako ali tako. */
  const clani = (ekipa?.clani || []).filter(c => c.role === 'member' && !c.isSelf);

  const preklopi = async (userId: string, zeDeljeno: boolean) => {
    if (!dbId) return;
    setDelam(userId);
    setSporocilo('');
    const rez = zeDeljeno
      ? await prekliciDeljenje(vir, dbId, userId)
      : await deliZapis(vir, dbId, userId);
    setDelam(null);
    if (!rez.ok) { setSporocilo(rez.napaka || L('Ni uspelo.', 'Failed.')); return; }
    setDeljeno(prev => (zeDeljeno ? prev.filter(x => x !== userId) : [...prev, userId]));
  };

  if (nalagam) return <p className="dz-tiho">{L('Preverjam deljenje …', 'Checking sharing …')}</p>;

  /* Ekipa brez članov: deljenje nima s kom — ne kažemo praznega vmesnika. */
  if (!ekipa || clani.length === 0) return null;

  if (!dbId) {
    return (
      <p className="dz-tiho">
        {L('Ta zapis še ni shranjen v oblaku, zato ga še ni mogoče deliti.', 'This record is not in the cloud yet, so it cannot be shared.')}
      </p>
    );
  }

  return (
    <div className="dz">
      <p className="dz-naslov">
        {L('Deli s članom ekipe', 'Share with a team member')}
        {naslov ? <span className="dz-zapis"> · {naslov}</span> : null}
      </p>
      {vir === 'clients' && (
        <p className="dz-tiho">{L('Deljena stranka odpre članu tudi njene ponudbe, račune in pogodbe.', 'Sharing a client also opens their quotes, invoices and contracts.')}</p>
      )}
      <div className="dz-seznam">
        {clani.map(c => {
          const jeDeljeno = deljeno.includes(c.userId);
          return (
            <button key={c.userId} type="button"
              className={'dz-clan' + (jeDeljeno ? ' on' : '')}
              disabled={delam === c.userId}
              onClick={() => preklopi(c.userId, jeDeljeno)}>
              <span className="dz-ime">{c.fullName || c.email}</span>
              <span className="dz-stanje">
                {delam === c.userId ? '…' : jeDeljeno ? L('Deljeno ✓', 'Shared ✓') : L('Deli', 'Share')}
              </span>
            </button>
          );
        })}
      </div>
      {sporocilo && <p className="dz-napaka" role="status">{sporocilo}</p>}

      <style jsx>{`
        .dz { display: flex; flex-direction: column; gap: .55rem; }
        .dz-naslov { margin: 0; font-size: .72rem; font-weight: 700; letter-spacing: .16em; text-transform: uppercase; color: #6b655d; }
        .dz-zapis { font-weight: 500; letter-spacing: .02em; text-transform: none; }
        .dz-tiho { margin: 0; font-size: .82rem; color: #6b655d; line-height: 1.45; }
        .dz-seznam { display: flex; flex-wrap: wrap; gap: .45rem; }
        .dz-clan { display: inline-flex; align-items: center; gap: .5rem; padding: .45rem .85rem; border-radius: 999px; border: 1.5px solid rgba(17,17,17,.15); background: #fff; color: #111; font: inherit; font-size: .82rem; font-weight: 600; cursor: pointer; transition: border-color .15s, background .15s, color .15s; }
        .dz-clan:hover:not(:disabled) { border-color: rgba(17,17,17,.4); }
        .dz-clan.on { border-color: #6E4FA6; background: #6E4FA6; color: #fff; }
        .dz-clan:disabled { opacity: .6; cursor: default; }
        .dz-stanje { font-size: .74rem; font-weight: 700; opacity: .85; }
        .dz-napaka { margin: 0; font-size: .8rem; color: #a4342a; }
      `}</style>
    </div>
  );
}
