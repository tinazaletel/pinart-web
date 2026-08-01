'use client';

/* Osrednje Komunikacije — VSA posta vseh projektov na enem mestu (temelj huba).
   Vir = preberiVsePoste() (lokalni dnevnik, ki ze zdruzuje oblacno sinhronizirano
   posto po projektih). Bere/organizira (mape, iskanje, kos); sestavljanje ostaja
   zaenkrat na projektu (ProjectsWorkspace). Projektni predal ostane nedotaknjen. */

import { useEffect, useMemo, useState } from 'react';
import { Tray, PaperPlaneTilt, NotePencil, Trash, EnvelopeSimple, ChatCircle, VideoCamera } from '@phosphor-icons/react';
import { preberiVsePoste, type PostaVnos } from '@/lib/postaDnevnik';
import { trashProjectMail, restoreProjectMail, deleteProjectMailPermanent } from '@/lib/pinartMailCloud';

const datStr = (iso: string) => {
  try { return new Date(iso).toLocaleDateString('sl-SI', { day: 'numeric', month: 'short', year: 'numeric' }); }
  catch { return iso; }
};
const mapaOf = (v: PostaVnos): 'prejeto' | 'poslano' | 'osnutki' | 'kos' =>
  v.izbrisano ? 'kos' : v.osnutek ? 'osnutki' : v.smer === 'poslano' ? 'poslano' : 'prejeto';

const MAPE = [
  { id: 'prejeto', ime: 'Prejeto', Ikona: Tray },
  { id: 'poslano', ime: 'Poslano', Ikona: PaperPlaneTilt },
  { id: 'osnutki', ime: 'Osnutki', Ikona: NotePencil },
  { id: 'kos', ime: 'Koš', Ikona: Trash },
] as const;

export default function CommsWorkspace() {
  const [posta, setPosta] = useState<PostaVnos[]>([]);
  const [mapa, setMapa] = useState<'prejeto' | 'poslano' | 'osnutki' | 'kos'>('poslano');
  const [beri, setBeri] = useState<PostaVnos | null>(null);
  const [isk, setIsk] = useState('');

  useEffect(() => { setPosta(preberiVsePoste()); }, []);

  const stevci = useMemo(() => {
    const c: Record<string, number> = { prejeto: 0, poslano: 0, osnutki: 0, kos: 0 };
    posta.forEach(v => { c[mapaOf(v)] += 1; });
    return c;
  }, [posta]);

  const q = isk.trim().toLowerCase();
  const seznam = posta
    .filter(v => mapaOf(v) === mapa)
    .filter(v => !q || `${v.zadeva} ${v.prejemniki.join(' ')}`.toLowerCase().includes(q));

  const vKos = (id: string) => { void trashProjectMail(id).catch(() => undefined); setPosta(p => p.map(v => v.id === id ? { ...v, izbrisano: new Date().toISOString() } : v)); setBeri(null); };
  const obnovi = (id: string) => { void restoreProjectMail(id).catch(() => undefined); setPosta(p => p.map(v => v.id === id ? { ...v, izbrisano: undefined } : v)); setBeri(null); };
  const zbrisi = (id: string) => { void deleteProjectMailPermanent(id).catch(() => undefined); setPosta(p => p.filter(v => v.id !== id)); setBeri(null); };

  const prazno = mapa === 'prejeto'
    ? 'Prejeta pošta pride, ko povežeš Gmail. Do takrat Flow beleži komunikacijo, ki jo pošlješ iz Flow (ponudbe, računi, sporočila).'
    : mapa === 'osnutki' ? 'Ni osnutkov.'
    : mapa === 'kos' ? 'Koš je prazen.'
    : 'Še ni poslane pošte. Piši stranki iz projekta.';

  return (
    <div style={{ display: 'flex', gap: '1.1rem', alignItems: 'flex-start' }}>
      <nav aria-label="Komunikacije" style={{ flex: 'none', width: 78, display: 'flex', flexDirection: 'column', gap: '.4rem', position: 'sticky', top: '1rem' }}>
        {([
          { id: 'mail', ime: 'Mail', Ikona: EnvelopeSimple, aktiven: true },
          { id: 'chat', ime: 'Chat', Ikona: ChatCircle, aktiven: false },
          { id: 'meet', ime: 'Meet', Ikona: VideoCamera, aktiven: false },
        ] as const).map(({ id, ime, Ikona, aktiven }) => (
          <div key={id} title={aktiven ? ime : `${ime} — kmalu (poveži zunanjo storitev)`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '.2rem', padding: '.6rem .3rem', borderRadius: '.85rem', cursor: aktiven ? 'default' : 'not-allowed', background: aktiven ? 'color-mix(in oklch, var(--ink) 8%, transparent)' : 'transparent', color: aktiven ? 'var(--ink)' : 'color-mix(in oklch, var(--ink) 42%, transparent)' }}>
            <Ikona size={22} weight={aktiven ? 'fill' : 'regular'} />
            <span style={{ font: '700 .62rem var(--font-sans), sans-serif' }}>{ime}</span>
            {!aktiven && <span style={{ font: '700 .48rem var(--font-sans), sans-serif', letterSpacing: '.04em', opacity: .8 }}>KMALU</span>}
          </div>
        ))}
      </nav>
      <article style={{ flex: 1, minWidth: 0, padding: '1.2rem 1.3rem', border: '1px solid color-mix(in oklch, var(--ink) 10%, transparent)', borderRadius: '1rem', background: 'oklch(100% 0 0 / .5)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '.7rem', flexWrap: 'wrap', margin: '0 0 1rem', padding: '.7rem .85rem', borderRadius: '.75rem', background: 'color-mix(in oklch, var(--ink) 5%, transparent)' }}>
        <p style={{ margin: 0, flex: 1, minWidth: 220, fontSize: '.82rem', lineHeight: 1.45, color: 'var(--ink)' }}>
          <b>Kmalu:</b> poveži Gmail ali katerikoli email (IMAP) in Flow bo za-projekt-relevantne niti razvrstil k pravim projektom. Flow ni drugi predal — je poslovni zapis komunikacije.
        </p>
        <button type="button" disabled title="Pride kmalu" style={{ flex: 'none', border: '1px solid color-mix(in oklch, var(--ink) 20%, transparent)', background: 'transparent', color: 'var(--muted)', borderRadius: 999, padding: '.4rem .85rem', font: '700 .72rem var(--font-sans), sans-serif', cursor: 'not-allowed' }}>Poveži email (kmalu)</button>
      </div>
      <div style={{ display: 'flex', gap: '.35rem', flexWrap: 'wrap' }}>
        {MAPE.map(({ id, ime, Ikona }) => {
          const on = mapa === id;
          const st = stevci[id];
          return (
            <button key={id} type="button" onClick={() => { setMapa(id); setBeri(null); }}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '.35rem', border: `1px solid ${on ? 'var(--ink)' : 'color-mix(in oklch, var(--ink) 14%, transparent)'}`, background: on ? 'var(--ink)' : 'transparent', color: on ? 'var(--paper)' : 'var(--ink)', borderRadius: 999, padding: '.32rem .78rem', font: '700 .7rem var(--font-sans), sans-serif', cursor: 'pointer' }}>
              <Ikona size={14} weight="bold" />{ime}{st ? ` · ${st}` : ''}
            </button>
          );
        })}
      </div>

      {!beri && posta.length > 0 && (
        <input value={isk} onChange={e => setIsk(e.target.value)} placeholder="Išči po zadevi ali naslovu …"
          style={{ width: '100%', boxSizing: 'border-box', margin: '.7rem 0 0', padding: '.5rem .75rem', border: '1px solid color-mix(in oklch, var(--ink) 12%, transparent)', borderRadius: '.6rem', background: 'oklch(100% 0 0 / .55)', font: '500 .85rem var(--font-sans), sans-serif', color: 'var(--ink)' }} />
      )}

      {beri ? (
        <div style={{ margin: '.85rem 0 0', padding: '1rem', border: '1px solid color-mix(in oklch, var(--ink) 10%, transparent)', borderRadius: '.85rem', background: 'oklch(100% 0 0 / .72)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '.5rem', flexWrap: 'wrap', marginBottom: '.6rem' }}>
            <button type="button" onClick={() => setBeri(null)} style={{ border: 0, background: 'none', color: 'var(--ink)', font: '700 .74rem var(--font-sans), sans-serif', cursor: 'pointer', padding: 0 }}>← Nazaj na seznam</button>
            <div style={{ display: 'flex', gap: '.45rem' }}>
              {beri.izbrisano ? (
                <>
                  <button type="button" onClick={() => obnovi(beri.id)} style={{ border: '1px solid var(--ink)', background: 'none', color: 'var(--ink)', borderRadius: 999, padding: '.26rem .75rem', font: '700 .68rem var(--font-sans), sans-serif', cursor: 'pointer' }}>Obnovi</button>
                  <button type="button" onClick={() => zbrisi(beri.id)} style={{ border: '1px solid oklch(58% .18 25)', background: 'none', color: 'oklch(52% .18 25)', borderRadius: 999, padding: '.26rem .75rem', font: '700 .68rem var(--font-sans), sans-serif', cursor: 'pointer' }}>Zbriši dokončno</button>
                </>
              ) : (
                <button type="button" onClick={() => vKos(beri.id)} style={{ display: 'inline-flex', alignItems: 'center', gap: '.3rem', border: '1px solid color-mix(in oklch, var(--ink) 20%, transparent)', background: 'none', color: 'var(--ink)', borderRadius: 999, padding: '.26rem .75rem', font: '700 .68rem var(--font-sans), sans-serif', cursor: 'pointer' }}><Trash size={14} weight="bold" /> V koš</button>
              )}
            </div>
          </div>
          <b style={{ display: 'block', fontSize: '.98rem' }}>{beri.zadeva || '(brez zadeve)'}</b>
          <small style={{ display: 'block', color: 'var(--muted)', margin: '.2rem 0 .8rem' }}>{beri.prejemniki.join(', ')} · {datStr(beri.datum)}</small>
          {beri.telo
            ? (beri.smer === 'prejeto'
                ? <div style={{ whiteSpace: 'pre-wrap', fontSize: '.88rem', lineHeight: 1.55 }}>{beri.telo.replace(/<[^>]+>/g, ' ')}</div>
                : <div style={{ fontSize: '.88rem', lineHeight: 1.55 }} dangerouslySetInnerHTML={{ __html: beri.telo }} />)
            : <p style={{ color: 'var(--muted)', fontSize: '.85rem' }}>To sporočilo nima shranjenega besedila (starejši/lokalni zapis).</p>}
        </div>
      ) : seznam.length ? (
        <ul style={{ listStyle: 'none', margin: '.85rem 0 0', padding: 0, display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
          {seznam.map(vnos => (
            <li key={vnos.id} onClick={() => setBeri(vnos)}
              style={{ cursor: 'pointer', padding: '.7rem .85rem', border: '1px solid color-mix(in oklch, var(--ink) 9%, transparent)', borderRadius: '.75rem', background: 'oklch(100% 0 0 / .6)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '.5rem', alignItems: 'baseline' }}>
                <b style={{ fontSize: '.9rem' }}>{vnos.zadeva || '(brez zadeve)'}</b>
                <span style={{ font: '700 .64rem var(--font-sans), sans-serif', color: 'var(--muted)', flex: 'none' }}>{vnos.izbrisano ? 'Koš' : vnos.osnutek ? 'Osnutek' : vnos.smer === 'poslano' ? 'Poslano' : 'Prejeto'}</span>
              </div>
              <small style={{ display: 'block', color: 'var(--muted)', marginTop: '.15rem' }}>{vnos.prejemniki.join(', ') || '—'} · {datStr(vnos.datum)}</small>
            </li>
          ))}
        </ul>
      ) : (
        <p style={{ color: 'var(--muted)', fontSize: '.88rem', margin: '1rem 0 0' }}>{prazno}</p>
      )}
    </article>
    </div>
  );
}
