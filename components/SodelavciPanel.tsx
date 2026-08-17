'use client';

import { useEffect, useState } from 'react';
import type { Naloga, Sodelavec } from '@/lib/naloge';
import { preberiNaloge, shraniNaloge } from '@/lib/naloge';
import { preberiSodelavci, shraniSodelavci, VLOGE, vlogaOznaka } from '@/lib/sodelavci';
import { usePredogled, demoSodelavci } from '@/lib/predogled';
import { posljiVabilo, preberiEkipo, odstraniClana, prekliciVabilo, prenesiLastnistvo, type EkipaOblak } from '@/lib/ekipa';
import styles from './SodelavciPanel.module.css';

/* DB vloga (membership_role) -> slovenska oznaka za značko. */
const OBLAK_VLOGA: Record<string, string> = {
  owner: 'Lastnik', admin: 'Admin', accounting: 'Računovodstvo', accountant: 'Računovodstvo', member: 'Član', viewer: 'Bralec',
};

/* Razdelek »Sodelavci« + pod-blok »Prenos ob odhodu«.
   PRENESEN iz SettingsWorkspace na stran »Račun in ekipa«, da vsi ljudje/ekipa
   živijo na enem mestu. Logika je enaka: seznam ekipe je lokalna shramba iz
   lib/sodelavci.ts (isti seznam bere tudi Task Manager za dodeljevanje nalog). */
export default function SodelavciPanel() {
  /* --- Sodelavci / ekipa: lokalna shramba iz lib/sodelavci.ts (glej tudi
     Task Manager, ki isti seznam uporablja za dodeljevanje nalog). --- */
  const [sodelavci, setSodelavci] = useState<Sodelavec[]>([]);
  const [novoIme, setNovoIme] = useState('');
  const [novEmail, setNovEmail] = useState('');
  const [novaVloga, setNovaVloga] = useState<Sodelavec['vloga']>('clan');
  const [ekipaSporocilo, setEkipaSporocilo] = useState('');

  /* --- Prenos ob odhodu (offboarding): ko nekdo zapusti ekipo, njegove
     naloge prenesemo na naslednika in ga deaktiviramo — v enem koraku. --- */
  const [odhajaId, setOdhajaId] = useState('');
  const [naslednikId, setNaslednikId] = useState('');
  const [prenosSporocilo, setPrenosSporocilo] = useState('');
  /* Predogled: »Prazno · nov uporabnik« = prazna ekipa, »Demo« = demo ekipa,
     »Moji podatki« = prava shramba. Prej je vedno bral preberiSodelavci(), zato
     je nov uporabnik videl demo sodelavce. */
  const [preview] = usePredogled();

  /* --- Prava ekipa iz oblaka (organization_members + čakajoča vabila). Ločeno
     od zgornjega localStorage seznama: ta pove, kdo ima RESNIČEN dostop (login),
     zgornji pa se uporablja za dodeljevanje nalog. --- */
  const [ekipa, setEkipa] = useState<EkipaOblak | null>(null);
  const [ekipaNalaga, setEkipaNalaga] = useState(false);
  const [oblakSporocilo, setOblakSporocilo] = useState('');
  const [prenosLastnikId, setPrenosLastnikId] = useState('');

  /* Sem lastnik? (za prikaz prenosa lastništva) */
  const semLastnik = Boolean(ekipa?.clani.some((c) => c.isSelf && c.role === 'owner'));
  const drugiClani = (ekipa?.clani || []).filter((c) => !c.isSelf);

  async function osveziEkipo() {
    if (preview !== 'mine') { setEkipa(null); return; }
    setEkipaNalaga(true);
    const rez = await preberiEkipo();
    setEkipa(rez);
    setEkipaNalaga(false);
  }

  useEffect(() => {
    if (preview === 'empty') { setSodelavci([]); return; }
    if (preview !== 'mine') { setSodelavci(demoSodelavci()); return; }
    setSodelavci(preberiSodelavci());
  }, [preview]);

  useEffect(() => { osveziEkipo(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [preview]);

  async function odstraniIzEkipe(userId: string, oznaka: string) {
    if (!window.confirm(`Odstranim ${oznaka} iz ekipe? Izgubi dostop do delovnega prostora.`)) return;
    const rez = await odstraniClana(userId);
    if (!rez.ok) { setOblakSporocilo(rez.napaka || 'Napaka pri odstranjevanju.'); return; }
    setOblakSporocilo(`${oznaka} odstranjen/a iz ekipe.`);
    osveziEkipo();
  }

  async function prekliciCakajoce(inviteId: string, oznaka: string) {
    if (!window.confirm(`Prekličem vabilo za ${oznaka}?`)) return;
    const rez = await prekliciVabilo(inviteId);
    if (!rez.ok) { setOblakSporocilo(rez.napaka || 'Napaka pri preklicu.'); return; }
    setOblakSporocilo(`Vabilo za ${oznaka} preklicano.`);
    osveziEkipo();
  }

  async function prenesiLastnistvoNa() {
    const cilj = drugiClani.find((c) => c.userId === prenosLastnikId);
    if (!cilj) return;
    const oznaka = cilj.fullName || cilj.email || 'izbrano osebo';
    if (!window.confirm(`Prenesem lastništvo na ${oznaka}? Postane lastnik, ti pa admin. To lahko naredi le lastnik.`)) return;
    const rez = await prenesiLastnistvo(cilj.userId);
    if (!rez.ok) { setOblakSporocilo(rez.napaka || 'Prenosa ni bilo mogoče izvesti.'); return; }
    setOblakSporocilo(rez.opozorilo || `Lastništvo preneseno na ${oznaka}. Zdaj si admin.`);
    setPrenosLastnikId('');
    osveziEkipo();
  }

  /* Vsaka sprememba ekipe (dodaj/uredi vlogo/aktiven/briši) gre skozi to
     funkcijo — posodobi stanje in v pravem načinu takoj shrani, da se Task
     Manager (bere isti kljuc) vidi usklajen. V demo/praznem načinu NE piše v
     pravo shrambo (predogled je samo za gledanje). */
  function posodobiEkipo(next: Sodelavec[]) {
    setSodelavci(next);
    if (preview === 'mine') shraniSodelavci(next);
  }

  function spremeniVlogo(id: string, vloga: Sodelavec['vloga']) {
    posodobiEkipo(sodelavci.map((s) => (s.id === id ? { ...s, vloga } : s)));
  }

  function preklopiAktiven(id: string) {
    posodobiEkipo(sodelavci.map((s) => (s.id === id ? { ...s, aktiven: !s.aktiven } : s)));
  }

  function izbrisiSodelavca(id: string) {
    const oseba = sodelavci.find((s) => s.id === id);
    if (oseba && !window.confirm(`Izbrišem sodelavca ${oseba.ime}?`)) return;
    posodobiEkipo(sodelavci.filter((s) => s.id !== id));
  }

  async function dodajSodelavca(e: React.FormEvent) {
    e.preventDefault();
    const ime = novoIme.trim();
    const email = novEmail.trim();
    if (!ime || !email) { setEkipaSporocilo('Vnesi ime in e-pošto sodelavca.'); return; }
    const nov: Sodelavec = { id: 'sod_' + Date.now(), ime, email, vloga: novaVloga, aktiven: true };
    posodobiEkipo([...sodelavci, nov]);
    setNovoIme(''); setNovEmail(''); setNovaVloga('clan');
    /* Pravo vabilo (žeton -> član organizacije) pošljemo LE v pravem načinu.
       V demo/praznem predogledu je dodajanje samo lokalna simulacija. */
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setEkipaSporocilo('Sodelavec dodan (neveljaven e-naslov — vabilo ni poslano).'); return; }
    if (preview !== 'mine') { setEkipaSporocilo('Sodelavec dodan (predogled — vabilo se v pravem računu pošlje samodejno).'); return; }
    setEkipaSporocilo('Sodelavec dodan. Pošiljam vabilo …');
    /* Vloga: admin -> poln dostop; vodja/član -> član organizacije (natančnejši
       scoping vidljivosti pride v Fazi 4). */
    const dbVloga = novaVloga === 'admin' ? 'admin' : 'member';
    try {
      const rez = await posljiVabilo(email, dbVloga);
      if (!rez.ok) { setEkipaSporocilo(`Sodelavec dodan (vabilo ni šlo: ${rez.napaka || 'napaka'}).`); return; }
      if (rez.poslano) setEkipaSporocilo(`Sodelavec dodan + vabilo poslano na ${email}.`);
      else if (rez.povezava) setEkipaSporocilo(`Sodelavec dodan. Povezavo za sprejem deli ročno: ${rez.povezava}`);
      else setEkipaSporocilo(`Sodelavec dodan${rez.napaka ? ` (${rez.napaka})` : ''}.`);
      osveziEkipo(); /* pokaži novo čakajoče vabilo v oblak seznamu */
    } catch {
      setEkipaSporocilo('Sodelavec dodan (vabilo ni šlo).');
    }
  }

  /* Prenos ob odhodu: vse naloge odhajajoče osebe (dodeljenoOsebaId) prepišemo
     na naslednika in odhajajočo osebo deaktiviramo (aktiven:false). NE gre za
     pravi izbris dostopa (login) — to caka pravo vec-uporabnisko zaledje. */
  function prenesiObOdhodu() {
    const odhaja = sodelavci.find((s) => s.id === odhajaId);
    const naslednik = sodelavci.find((s) => s.id === naslednikId);
    if (!odhaja || !naslednik) return;
    if (!window.confirm('Prenesem vse naloge odhajajoče osebe na naslednika in jo deaktiviram?')) return;

    /* Prepiši dodelitev na vseh nalogah, ki so bile dodeljene odhajajoči osebi. */
    const naloge = preberiNaloge();
    const steviloPrenesenih = naloge.filter((n: Naloga) => n.dodeljenoOsebaId === odhajaId).length;
    const posodobljene = naloge.map((n: Naloga) =>
      n.dodeljenoOsebaId === odhajaId
        ? { ...n, dodeljenoOsebaId: naslednik.id, dodeljenoOsebaIme: naslednik.ime }
        : n
    );
    shraniNaloge(posodobljene);

    /* Odhajajočo osebo deaktiviraj — login ostane dejaven, glej opombo v UI. */
    posodobiEkipo(sodelavci.map((s) => (s.id === odhajaId ? { ...s, aktiven: false } : s)));

    setPrenosSporocilo(`Preneseno ${steviloPrenesenih} nalog na ${naslednik.ime}. ${odhaja.ime} deaktivirana.`);
    setOdhajaId('');
    setNaslednikId('');
  }

  return (
    <div className={styles.wrap}>
      {preview === 'mine' && (
        <section className={styles.card}>
          <h2>Ekipa v oblaku</h2>
          <p>Kdo ima <b>resničen dostop</b> do delovnega prostora — člani in čakajoča vabila. Vabilo se sprejme, ko se oseba prijavi z istim e-naslovom.</p>

          {ekipaNalaga && !ekipa && <p className={styles.opomba}>Nalagam ekipo …</p>}

          {ekipa && ekipa.clani.length > 0 && (
            <ul className={styles.ekipaSeznam}>
              {ekipa.clani.map((c) => {
                const oznaka = c.fullName || c.email || 'Član';
                return (
                  <li key={c.userId} className={styles.ekipaVrstica}>
                    <div className={styles.ekipaOseba}>
                      <span className={styles.ekipaIme}>{oznaka}{c.isSelf ? ' (ti)' : ''}</span>
                      {c.email && c.email !== oznaka && <span className={styles.ekipaEmail}>{c.email}</span>}
                    </div>
                    <span className={styles.znacka}>{OBLAK_VLOGA[c.role] || c.role}</span>
                    {ekipa.jeAdmin && !c.isSelf && c.role !== 'owner' && (
                      <button
                        type="button"
                        className={styles.krogGumb}
                        onClick={() => odstraniIzEkipe(c.userId, oznaka)}
                        aria-label={`Odstrani ${oznaka}`}
                        title="Odstrani iz ekipe"
                      >×</button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          {ekipa && ekipa.vabila.length > 0 && (
            <>
              <h3 className={styles.prenosNaslov}>Čakajoča vabila</h3>
              <ul className={styles.ekipaSeznam}>
                {ekipa.vabila.map((v) => (
                  <li key={v.id} className={styles.ekipaVrstica}>
                    <div className={styles.ekipaOseba}>
                      <span className={styles.ekipaIme}>{v.email}</span>
                      <span className={styles.ekipaEmail}>Povabljen/a · čaka na sprejem</span>
                    </div>
                    <span className={styles.znacka}>{OBLAK_VLOGA[v.role] || v.role}</span>
                    <button
                      type="button"
                      className={styles.krogGumb}
                      onClick={() => prekliciCakajoce(v.id, v.email)}
                      aria-label={`Prekliči vabilo za ${v.email}`}
                      title="Prekliči vabilo"
                    >×</button>
                  </li>
                ))}
              </ul>
            </>
          )}

          {semLastnik && drugiClani.length > 0 && (
            <div className={styles.prenosBlok}>
              <h3 className={styles.prenosNaslov}>Prenos lastništva</h3>
              <p className={styles.opomba}>Predaj vlogo lastnika drugemu članu (npr. ob odhodu). Ti postaneš admin — dostopa ne izgubiš.</p>
              <div className={styles.prenosVrstica}>
                <select
                  className={styles.ekipaVloga}
                  value={prenosLastnikId}
                  onChange={(e) => setPrenosLastnikId(e.target.value)}
                  aria-label="Novi lastnik"
                >
                  <option value="">Novi lastnik…</option>
                  {drugiClani.map((c) => <option key={c.userId} value={c.userId}>{c.fullName || c.email}</option>)}
                </select>
                <button
                  type="button"
                  className={styles.gumb}
                  onClick={prenesiLastnistvoNa}
                  disabled={!prenosLastnikId}
                >
                  Prenesi lastništvo
                </button>
              </div>
            </div>
          )}

          {ekipa && !ekipa.jeAdmin && <p className={styles.opomba}>Za povabila in urejanje ekipe potrebuješ skrbniške pravice.</p>}
          {ekipa === null && !ekipaNalaga && <p className={styles.opomba}>Ekipa v oblaku še ni na voljo (poveži se s podjetjem oz. poženi migracijo).</p>}
          {oblakSporocilo && <p className={styles.opomba} role="status">{oblakSporocilo}</p>}
        </section>
      )}

      <section className={styles.card}>
        <h2>Sodelavci</h2>
        <p>Imena za <b>dodeljevanje nalog</b> in prenos ob odhodu. Za resničen dostop (login) glej »Ekipa v oblaku« zgoraj.</p>

        {sodelavci.length > 0 && (
          <ul className={styles.ekipaSeznam}>
            {sodelavci.map((s) => (
              <li key={s.id} className={styles.ekipaVrstica}>
                <div className={styles.ekipaOseba}>
                  <span className={styles.ekipaIme}>{s.ime}</span>
                  <span className={styles.ekipaEmail}>{s.email}</span>
                </div>

                <span className={`${styles.znacka} ${styles['znacka_' + s.vloga] || ''}`}>
                  {vlogaOznaka(s.vloga)}
                </span>

                <select
                  className={styles.ekipaVloga}
                  value={s.vloga}
                  onChange={(e) => spremeniVlogo(s.id, e.target.value as Sodelavec['vloga'])}
                  aria-label={`Vloga — ${s.ime}`}
                >
                  {VLOGE.map((v) => <option key={v.vloga} value={v.vloga}>{v.oznaka}</option>)}
                </select>

                <label className={styles.preklop} title={s.aktiven ? 'Aktiven' : 'Neaktiven'}>
                  <input
                    type="checkbox"
                    checked={s.aktiven}
                    onChange={() => preklopiAktiven(s.id)}
                    aria-label={`${s.aktiven ? 'Deaktiviraj' : 'Aktiviraj'} ${s.ime}`}
                  />
                  <span className={styles.preklopDrsnik} />
                </label>

                <button
                  type="button"
                  className={styles.krogGumb}
                  onClick={() => izbrisiSodelavca(s.id)}
                  aria-label={`Izbriši ${s.ime}`}
                  title="Izbriši"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}

        <form className={styles.dodajObrazec} onSubmit={dodajSodelavca}>
          <input
            type="text"
            placeholder="Ime in priimek"
            value={novoIme}
            onChange={(e) => setNovoIme(e.target.value)}
            aria-label="Ime novega sodelavca"
          />
          <input
            type="email"
            placeholder="E-pošta"
            value={novEmail}
            onChange={(e) => setNovEmail(e.target.value)}
            aria-label="E-pošta novega sodelavca"
          />
          <select
            value={novaVloga}
            onChange={(e) => setNovaVloga(e.target.value as Sodelavec['vloga'])}
            aria-label="Vloga novega sodelavca"
          >
            {VLOGE.map((v) => <option key={v.vloga} value={v.vloga}>{v.oznaka}</option>)}
          </select>
          <button type="submit" className={styles.gumb}>Dodaj sodelavca</button>
        </form>

        {ekipaSporocilo && <p className={styles.opomba} role="status">{ekipaSporocilo}</p>}

        <div className={styles.prenosBlok}>
          <h3 className={styles.prenosNaslov}>Prenos ob odhodu</h3>
          <p className={styles.opomba}>
            Ko nekdo zapusti ekipo, v enem koraku prenesi vse njegove naloge na naslednika in ga deaktiviraj —
            brez ročnega preklapljanja vsake naloge posebej.
          </p>

          <div className={styles.prenosVrstica}>
            <select
              className={styles.ekipaVloga}
              value={odhajaId}
              onChange={(e) => setOdhajaId(e.target.value)}
              aria-label="Oseba odhaja"
            >
              <option value="">Oseba odhaja…</option>
              {sodelavci.map((s) => <option key={s.id} value={s.id}>{s.ime}</option>)}
            </select>

            <span className={styles.prenosPuscica} aria-hidden="true">→</span>

            <select
              className={styles.ekipaVloga}
              value={naslednikId}
              onChange={(e) => setNaslednikId(e.target.value)}
              aria-label="Prevzame (naslednik)"
            >
              <option value="">Prevzame (naslednik)…</option>
              {sodelavci
                .filter((s) => s.aktiven && s.id !== odhajaId)
                .map((s) => <option key={s.id} value={s.id}>{s.ime}</option>)}
            </select>

            <button
              type="button"
              className={styles.gumb}
              onClick={prenesiObOdhodu}
              disabled={!odhajaId || !naslednikId || odhajaId === naslednikId}
            >
              Prenesi in deaktiviraj
            </button>
          </div>

          {prenosSporocilo && <p className={styles.opomba} role="status">{prenosSporocilo}</p>}

          <p className={styles.prenosOpozorilo}>
            Prenese se delo (naloge), oseba pa postane neaktivna.
          </p>
        </div>
      </section>
    </div>
  );
}
