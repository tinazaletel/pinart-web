'use client';

import { useEffect, useRef, useState } from 'react';
import VidezDokumentov from '@/components/VidezDokumentov';
import { preberiPupaStanje, nastaviPupaStanje } from '@/lib/pupaNastavitve';
import { DOK_BARVA_PRIVZETA, DOK_FONT_PRIVZETI, nastaviLogoAktivne } from '@/lib/dokVidez';
import styles from './SettingsWorkspace.module.css';

/* Nastavitve videza (stran "Dizajn"). Vsebina je PRENESENA iz profila
   kalkulatorja (videz dokumentov, logotip), da ni na dveh mestih razlicno.
   Vse zivi v localStorage — istih kljucih kot kalkulator, zato velja povsod.
   Izbris vseh podatkov je bil premaknjen v "Moj profil". */
const K_NAST = 'pinart-kalkulator-v2';
const K_LOGO = 'pinart-kalkulator-logo';

export default function SettingsWorkspace({ base }: { base: string }) {
  const [barva, setBarva] = useState(DOK_BARVA_PRIVZETA);
  const [font, setFont] = useState(DOK_FONT_PRIVZETI);
  const [logo, setLogo] = useState('');
  const [nalozeno, setNalozeno] = useState(false);
  const [sporocilo, setSporocilo] = useState('');
  const datoteka = useRef<HTMLInputElement>(null);
  const [podpis, setPodpis] = useState('');
  const [pupaVklop, setPupaVklop] = useState(true);

  useEffect(() => { setPupaVklop(preberiPupaStanje() !== 'izklopljena'); }, []);
  const preklopiPupo = (vklop: boolean) => { setPupaVklop(vklop); nastaviPupaStanje(vklop ? 'vklopljena' : 'izklopljena'); };

  /* Preberi obstojece nastavitve iz istega kljuca kot kalkulator. */
  useEffect(() => {
    try {
      const s = JSON.parse(localStorage.getItem(K_NAST) || '{}');
      if (s.dokBarva) setBarva(String(s.dokBarva));
      if (s.dokFont) setFont(String(s.dokFont));
      if (typeof s.podpisMaila === 'string') setPodpis(s.podpisMaila);
    } catch { /* pokvarjen zapis ignoriramo */ }
    try { setLogo(localStorage.getItem(K_LOGO) || ''); } catch { /* ignoriraj */ }
    setNalozeno(true);
  }, []);

  /* Shrani nazaj v K_NAST, ne da bi povozil ostale nastavitve kalkulatorja. */
  useEffect(() => {
    if (!nalozeno) return;
    try {
      const s = JSON.parse(localStorage.getItem(K_NAST) || '{}');
      localStorage.setItem(K_NAST, JSON.stringify({ ...s, dokBarva: barva, dokFont: font, podpisMaila: podpis }));
    } catch { /* ignoriraj */ }
  }, [barva, font, podpis, nalozeno]);

  function naloziLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 600_000) { setSporocilo('Slika je prevelika (največ 600 kB). Zmanjšaj jo in poskusi znova.'); return; }
    const fr = new FileReader();
    fr.onload = () => {
      const url = String(fr.result || '');
      setLogo(url);
      try { localStorage.setItem(K_LOGO, url); setSporocilo('Logotip je shranjen.'); }
      catch { setSporocilo('Shramba je polna — logotipa ni bilo mogoče shraniti.'); }
      nastaviLogoAktivne(url);   /* zapomni tudi na AKTIVNO predlogo (vec predlog) */
    };
    fr.readAsDataURL(f);
  }

  function odstraniLogo() {
    setLogo('');
    try { localStorage.removeItem(K_LOGO); } catch { /* ignoriraj */ }
    nastaviLogoAktivne('');
    if (datoteka.current) datoteka.current.value = '';
    setSporocilo('Logotip je odstranjen.');
  }

  /* Ponovi uvodni pogovor: v zapisu kalkulatorja odklopi zakljucek uvoda in
     postavi pogovor na prvi korak. Odgovori (ime, izkusnje, podrocja) ostanejo
     in se v pogovoru prednapolnijo — samo znova gres skozenj. Cene, stranke in
     ponudbe se ne dotaknejo. onboarding-koncan zbrisemo, da se vrne tudi kartica
     "Dokoncaj nastavitev". Nato odpremo kalkulator, ki iz posodobljenega zapisa
     pogovor tudi zares zene. */
  function ponastaviVprasalnik() {
    if (!window.confirm('Ponovim uvodni vprašalnik? Cene in ponudbe ostanejo.')) return;
    try {
      const s = JSON.parse(localStorage.getItem(K_NAST) || '{}');
      s.uvodKoncan = false; s.chatKorak = 0;
      localStorage.setItem(K_NAST, JSON.stringify(s));
      localStorage.removeItem('pinart-onboarding-koncan');
    } catch { /* zasebni nacin */ }
    window.location.href = `${base}/kalkulator/orodje?uvod=1`;
  }

  return (
    <div className={styles.wrap}>
      <section className={styles.card}>
        <h2>Videz dokumentov</h2>
        <p>Velja za vse dokumente — ponudbe, pogodbe, račune in dolgoročne ponudbe.</p>

        <div className={styles.logoRow}>
          <div className={styles.logoPredogled}>
            {logo
              /* eslint-disable-next-line @next/next/no-img-element -- data URL iz localStorage */
              ? <img src={logo} alt="Tvoj logotip" />
              : <span>Ni logotipa</span>}
          </div>
          <div className={styles.logoAkcije}>
            <label className={styles.gumb}>
              {logo ? 'Zamenjaj logotip' : 'Naloži logotip'}
              <input ref={datoteka} type="file" accept="image/*" onChange={naloziLogo} hidden />
            </label>
            {logo && <button type="button" className={styles.gumbTih} onClick={odstraniLogo}>Odstrani</button>}
            <small>PNG ali SVG s prosojnim ozadjem, do 600 kB.</small>
          </div>
        </div>

        {sporocilo && <p className={styles.opomba} role="status">{sporocilo}</p>}

        {nalozeno && <VidezDokumentov barva={barva} font={font} onBarva={setBarva} onFont={setFont} logo={logo} onLogo={setLogo} />}
      </section>

      <section className={styles.card}>
        <h2>Podpis pošte</h2>
        <p>Samodejno se doda na dno vsakega novega sporočila iz projekta. E-naslov lahko vključiš — vstavi se kot <b>navadno besedilo (ni klikabilen)</b>, da stranke raje kliknejo »Odgovori« kot pišejo na napačen naslov.</p>
        <textarea value={podpis} onChange={e => setPodpis(e.target.value)} rows={6} placeholder={'Tina Zaletel\nPinart · oblikovanje\n+386 40 123 456\ntina@pinart.si\npinart.si\n\nProsim, odgovorite na to sporočilo.'} style={{ width: '100%', padding: '.7rem .8rem', fontFamily: 'inherit', fontSize: '.9rem', lineHeight: 1.5, resize: 'vertical', borderRadius: '.6rem', border: '1px solid rgba(17,17,17,.15)', background: '#fff' }} />
      </section>

      <section className={styles.card}>
        <h2>Vprašalnik</h2>
        <p>
          Ponovno te vpraša po imenu, trgu in izkušnjah. Tvoje cene, stranke in ponudbe ostanejo.
        </p>
        <button type="button" className={styles.gumb} onClick={ponastaviVprasalnik}>Ponovi vprašalnik</button>
      </section>

      <section className={styles.card}>
        <h2>Pupa (AI pomočnica)</h2>
        <p>
          Pupa svetuje pri cenah, pravicah in besedilu. Ko jo vprašaš, se podatki trenutne ponudbe pošljejo AI ponudniku (Anthropic) samo zato, da ti odgovori — ne uporabijo se za učenje modela. Kadar koli jo lahko izklopiš.
        </p>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '.6rem' }}>
          <button
            type="button"
            role="switch"
            aria-checked={pupaVklop}
            aria-label={pupaVklop ? 'Izklopi Pupo' : 'Vklopi Pupo'}
            onClick={() => preklopiPupo(!pupaVklop)}
            style={{ position: 'relative', width: '2.6rem', height: '1.5rem', flex: '0 0 auto', padding: 0, border: 0, borderRadius: '999px', cursor: 'pointer', background: pupaVklop ? 'var(--accent, oklch(66% .2 297))' : 'color-mix(in oklch, var(--ink) 25%, transparent)', transition: 'background .18s' }}
          >
            <span style={{ position: 'absolute', top: '50%', left: pupaVklop ? 'calc(100% - 1.3rem)' : '.2rem', transform: 'translateY(-50%)', width: '1.1rem', height: '1.1rem', borderRadius: '50%', background: '#fff', boxShadow: '0 1px 2px rgba(0,0,0,.28)', transition: 'left .18s' }} />
          </button>
          <span style={{ fontWeight: 600, fontSize: '.92rem' }}>{pupaVklop ? 'Pupa je vklopljena' : 'Pupa je izklopljena'}</span>
        </div>
      </section>

      {/* "Pomoč in kontakt" odstranjen: Pomoč je zdaj svoja stran v meniju,
          tukaj je bila podvojena. */}
      {/* "Izbriši vse podatke" je premaknjen v "Moj profil" (ProfileWorkspace). */}
    </div>
  );
}
