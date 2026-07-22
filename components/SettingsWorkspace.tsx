'use client';

import { useEffect, useRef, useState } from 'react';
import VidezDokumentov from '@/components/VidezDokumentov';
import { DOK_BARVA_PRIVZETA, DOK_FONT_PRIVZETI } from '@/lib/dokVidez';
import styles from './SettingsWorkspace.module.css';

/* Nastavitve aplikacije. Vsebina je PRENESENA iz profila kalkulatorja (videz
   dokumentov, logotip, izbris podatkov), da ni na dveh mestih razlicno.
   Vse zivi v localStorage — istih kljucih kot kalkulator, zato velja povsod. */
const K_NAST = 'pinart-kalkulator-v2';
const K_LOGO = 'pinart-kalkulator-logo';
const K_PROFILI = 'pinart-kalkulator-profili';
const K_ARHIV = 'pinart-kalkulator-arhiv';
const K_PODJETJA = 'pinart-kalkulator-podjetja';
const K_LEAD = 'pinart-kalkulator-kontakt';

export default function SettingsWorkspace({ base }: { base: string }) {
  const [barva, setBarva] = useState(DOK_BARVA_PRIVZETA);
  const [font, setFont] = useState(DOK_FONT_PRIVZETI);
  const [logo, setLogo] = useState('');
  const [nalozeno, setNalozeno] = useState(false);
  const [sporocilo, setSporocilo] = useState('');
  const datoteka = useRef<HTMLInputElement>(null);

  /* Preberi obstojece nastavitve iz istega kljuca kot kalkulator. */
  useEffect(() => {
    try {
      const s = JSON.parse(localStorage.getItem(K_NAST) || '{}');
      if (s.dokBarva) setBarva(String(s.dokBarva));
      if (s.dokFont) setFont(String(s.dokFont));
    } catch { /* pokvarjen zapis ignoriramo */ }
    try { setLogo(localStorage.getItem(K_LOGO) || ''); } catch { /* ignoriraj */ }
    setNalozeno(true);
  }, []);

  /* Shrani nazaj v K_NAST, ne da bi povozil ostale nastavitve kalkulatorja. */
  useEffect(() => {
    if (!nalozeno) return;
    try {
      const s = JSON.parse(localStorage.getItem(K_NAST) || '{}');
      localStorage.setItem(K_NAST, JSON.stringify({ ...s, dokBarva: barva, dokFont: font }));
    } catch { /* ignoriraj */ }
  }, [barva, font, nalozeno]);

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
    };
    fr.readAsDataURL(f);
  }

  function odstraniLogo() {
    setLogo('');
    try { localStorage.removeItem(K_LOGO); } catch { /* ignoriraj */ }
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

  /* Enak izbris kot v kalkulatorju (ponastaviVse), da se vedeta enako. */
  function izbrisiVse() {
    if (!window.confirm('Izbrišem vse podatke tega orodja (cene, podjetja, zgodovino ponudb, profile)? Tega ni mogoče razveljaviti.')) return;
    try {
      [K_NAST, K_PROFILI, K_ARHIV, K_PODJETJA, K_LEAD, K_LOGO, 'pinart-kalk-pogoji-ok'].forEach(k => localStorage.removeItem(k));
    } catch { /* ignoriraj */ }
    window.location.reload();
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

        {nalozeno && <VidezDokumentov barva={barva} font={font} onBarva={setBarva} onFont={setFont} />}
      </section>

      <section className={styles.card}>
        <h2>Vprašalnik</h2>
        <p>
          Ponovno te vpraša po imenu, trgu in izkušnjah. Tvoje cene, stranke in ponudbe ostanejo.
        </p>
        <button type="button" className={styles.gumb} onClick={ponastaviVprasalnik}>Ponovi vprašalnik</button>
      </section>

      {/* "Pomoč in kontakt" odstranjen: Pomoč je zdaj svoja stran v meniju,
          tukaj je bila podvojena. */}

      <section className={`${styles.card} ${styles.nevarno}`}>
        <h2>Izbriši vse podatke</h2>
        <p>
          Odstrani cene, podjetja, stranke, zgodovino ponudb in profile iz tega brskalnika.
          Tvoj račun ostane — izbrišejo se samo podatki orodja. Tega ni mogoče razveljaviti.
        </p>
        <button type="button" className={styles.gumbNevaren} onClick={izbrisiVse}>Izbriši vse podatke</button>
      </section>
    </div>
  );
}
