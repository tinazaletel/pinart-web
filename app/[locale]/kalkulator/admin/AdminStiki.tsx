'use client';

import { useEffect, useState } from 'react';

/**
 * NAROČNIKI NA NOVICE IN POVPRAŠEVANJA.
 *
 * Oboje je doslej obstajalo, a se nikjer ni videlo. Naročnik je prijavo
 * potrdil in Tina tega ni izvedela; povpraševanje je živelo samo v Googlovem
 * listu, in če je skript padel, stranke ni bilo nikjer (Tina, 3. 9. 2026).
 *
 * Pri povpraševanjih je najpomembnejši stolpec »posredovano«: kjer je ne,
 * je stranka pri nas, obvestilo pa ni odšlo — to je vrstica, ki jo je treba
 * poklicati ročno.
 */

type Narocnik = {
  email: string; ime: string | null; jezik: string | null;
  ustvarjeno: string; potrjeno_ob: string | null;
};
type Povprasevanje = {
  id: string; ime: string | null; email: string | null; podjetje: string | null;
  brief: string | null; proracun: string | null; termin: string | null;
  vir: string | null; posredovano: boolean; napaka: string | null; created_at: string;
};

const dan = (s: string | null) => (s
  ? new Date(s).toLocaleDateString('sl-SI', { day: 'numeric', month: 'short', year: 'numeric' })
  : '—');

export default function AdminStiki() {
  const [naroceni, setNaroceni] = useState<Narocnik[] | null>(null);
  const [povprasevanja, setPovprasevanja] = useState<Povprasevanje[]>([]);
  const [opozorilo, setOpozorilo] = useState<string | null>(null);
  const [odprt, setOdprt] = useState<string | null>(null);

  useEffect(() => {
    let ziv = true;
    fetch('/api/kalkulator-admin/stiki', { cache: 'no-store' })
      .then(async r => {
        const t = await r.json().catch(() => ({}));
        if (!ziv) return;
        setNaroceni(t.naroceni || []);
        setPovprasevanja(t.povprasevanja || []);
        setOpozorilo(t.opozorilo || null);
      })
      .catch(() => { if (ziv) setNaroceni([]); });
    return () => { ziv = false; };
  }, []);

  if (naroceni === null) return <section className="as"><h2>Naročniki in povpraševanja</h2><p>Nalagam …</p></section>;

  const potrjeni = naroceni.filter(n => n.potrjeno_ob);
  const cakajo = naroceni.filter(n => !n.potrjeno_ob);
  const neposredovana = povprasevanja.filter(p => !p.posredovano);

  return <section className="as">
    <h2>Povpraševanja</h2>
    {opozorilo && <p className="as-opozorilo">{opozorilo}</p>}
    {neposredovana.length > 0 && (
      <p className="as-opozorilo">
        {neposredovana.length === 1 ? '1 povpraševanje ni bilo posredovano naprej' : `${neposredovana.length} povpraševanj ni bilo posredovanih naprej`} —
        stranka je pri tebi, obvestilo pa ni odšlo. Pokliči jih sama.
      </p>
    )}
    {povprasevanja.length === 0 && !opozorilo && <p className="as-tiho">Še nobenega.</p>}
    {povprasevanja.map(p => (
      <article key={p.id} className={p.posredovano ? 'as-zapis' : 'as-zapis as-nujno'}>
        <button type="button" onClick={() => setOdprt(odprt === p.id ? null : p.id)}>
          <b>{p.ime || 'brez imena'}{p.podjetje ? ` · ${p.podjetje}` : ''}</b>
          <span>{dan(p.created_at)}{p.posredovano ? '' : ' · ni posredovano'}</span>
        </button>
        {odprt === p.id && (
          <div className="as-vsebina">
            {p.email && <p><a href={`mailto:${p.email}`}>{p.email}</a></p>}
            {p.brief && <p className="as-brief">{p.brief}</p>}
            <p className="as-tiho">
              {[p.proracun && `proračun: ${p.proracun}`, p.termin && `rok: ${p.termin}`, p.vir && `vir: ${p.vir}`]
                .filter(Boolean).join(' · ') || '—'}
            </p>
            {p.napaka && <p className="as-opozorilo">{p.napaka}</p>}
          </div>
        )}
      </article>
    ))}

    <h2 style={{ marginTop: '2rem' }}>Naročniki na novice</h2>
    <p className="as-tiho">
      {potrjeni.length} potrjenih{cakajo.length > 0 ? ` · ${cakajo.length} še ni kliknilo v pisemcu` : ''}
    </p>
    {naroceni.length === 0 && <p className="as-tiho">Še nobenega.</p>}
    {naroceni.map(n => (
      <div key={n.email} className="as-vrsta">
        <span>{n.ime || '—'} · <a href={`mailto:${n.email}`}>{n.email}</a></span>
        <b>{n.potrjeno_ob ? `potrjen ${dan(n.potrjeno_ob)}` : 'čaka potrditev'}</b>
      </div>
    ))}

    <style jsx>{`
      .as { margin: 2.5rem 0; }
      .as h2 { margin: 0 0 .6rem; font-size: 1.2rem; }
      .as-tiho { margin: 0 0 .6rem; font-size: .84rem;
                 color: color-mix(in oklch, var(--ink, #1c1518) 60%, transparent); }
      .as-opozorilo { margin: 0 0 .8rem; padding: .6rem .7rem; border-radius: .6rem;
                      background: color-mix(in oklch, var(--red, #B3261E) 8%, transparent);
                      color: var(--red, #B3261E); font-size: .84rem; line-height: 1.5; }
      .as-zapis { border: 1px solid color-mix(in oklch, var(--ink, #1c1518) 10%, transparent);
                  border-radius: .8rem; margin-bottom: .5rem; overflow: hidden; background: #fff; }
      .as-nujno { border-color: color-mix(in oklch, var(--red, #B3261E) 40%, transparent); }
      .as-zapis > button { display: flex; align-items: baseline; justify-content: space-between;
                           gap: 1rem; width: 100%; padding: .8rem 1rem; border: 0; background: none;
                           text-align: left; cursor: pointer; font: inherit; color: inherit; }
      .as-zapis > button span { flex: none; font-size: .78rem;
                                color: color-mix(in oklch, var(--ink, #1c1518) 58%, transparent); }
      .as-vsebina { padding: 0 1rem 1rem; font-size: .86rem; line-height: 1.5; }
      .as-brief { white-space: pre-wrap; }
      .as-vrsta { display: flex; align-items: baseline; justify-content: space-between; gap: 1rem;
                  padding: .4rem 0; font-size: .86rem;
                  border-top: 1px solid color-mix(in oklch, var(--ink, #1c1518) 7%, transparent); }
      .as-vrsta b { flex: none; font-size: .78rem; font-weight: 600;
                    color: color-mix(in oklch, var(--ink, #1c1518) 60%, transparent); }
    `}</style>
  </section>;
}
