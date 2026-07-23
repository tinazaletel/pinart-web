'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import DashboardHeaderTools from './DashboardHeaderTools';
import FlowUkazi from './FlowUkazi';
import NazajNaPregled from './NazajNaPregled';
import StoparicaBliznjica from './StoparicaBliznjica';
import PredogledPreklop from './PredogledPreklop';
import { useFlowNapredek } from '@/lib/flowNapredek';
import styles from '@/app/[locale]/kalkulator/pregled/pregled.module.css';

/**
 * Zgornja vrstica čez vso širino: kje si, kateri paket imaš, in orodja.
 *
 * Prej je bilo ime izdelka v meniju, orodja pa ob velikem naslovu strani, kjer
 * so na telefonu tiščala naslov v tri vrstice. Zdaj so na enem mestu.
 *
 * Ločenega gumba "Upgrade" NI namenoma: značka paketa je že pot do nadgradnje,
 * dva gumba za isto pa naredita vtis vsiljivosti. Nadgradnjo ponudimo takrat,
 * ko uporabnik trči ob mejo brezplačnega paketa.
 */

const IMENA: Record<string, string> = {
  pregled: 'Nadzorna plošča',
  orodje: 'Ponudba',
  dolgorocno: 'Dolgoročno sodelovanje',
  pogodbe: 'Pogodba',
  racuni: 'Računi',
  stranke: 'Stranke',
  ceniki: 'Moji ceniki',
  stroski: 'Stroški',
  cilji: 'Cilji',
  cas: 'Cena & čas',
  'poslovni-nacrt': 'Poslovni okvir',
  projekti: 'Projekti',
  racunovodstvo: 'Računovodstvo',
  profil: 'Profil',
  nastavitve: 'Nastavitve',
  admin: 'Pregled poslovanja',
};

export default function FlowTopBar() {
  const pathname = usePathname() || '';
  const base = pathname.startsWith('/en/') ? '/en' : '';
  const [pomocOdprta, setPomocOdprta] = useState(false);

  /* Drsenje: navzdol se vrstica umakne, navzgor se takoj vrne — pri branju
     dolgih tabel je vsak piksel visine dobrodosel, pot nazaj pa mora biti
     na dosegu. Stanje pise v <body>, da lahko nanj odreagira tudi hamburger
     v stranski vrstici, ki je druga komponenta. */
  useEffect(() => {
    const zadnjiPolozaji = new WeakMap<EventTarget, number>();
    let zadnjiOkna = window.scrollY;
    let ceka = false;
    let zadnjiDogodek: EventTarget | null = null;
    const polozaj = (vir: EventTarget | null) => {
      if (vir instanceof HTMLElement) return vir.scrollTop;
      return window.scrollY;
    };
    const oceni = () => {
      const vir = zadnjiDogodek;
      const y = polozaj(vir);
      if (vir instanceof HTMLElement && !zadnjiPolozaji.has(vir)) {
        zadnjiPolozaji.set(vir, y);
        ceka = false;
        return;
      }
      const zadnji = vir instanceof HTMLElement
        ? zadnjiPolozaji.get(vir)!
        : zadnjiOkna;
      const b = document.body.dataset;
      b.odmaknjen = window.scrollY > 24 || (vir instanceof HTMLElement && y > 24) ? '1' : '';
      /* 6px praga: brez njega drobno tresenje prsta vklaplja in izklaplja vrstico */
      if (Math.abs(y - zadnji) > 6) {
        b.drsenje = y > zadnji && y > 90 ? 'dol' : 'gor';
        if (vir instanceof HTMLElement) zadnjiPolozaji.set(vir, y);
        else zadnjiOkna = y;
      }
      ceka = false;
    };
    const naDrsenje = (dogodek: Event) => {
      zadnjiDogodek = dogodek.target;
      if (!ceka) { ceka = true; requestAnimationFrame(oceni); }
    };
    document.addEventListener('scroll', naDrsenje, { passive: true, capture: true });
    oceni();
    return () => {
      document.removeEventListener('scroll', naDrsenje, { capture: true });
      delete document.body.dataset.drsenje;
      delete document.body.dataset.odmaknjen;
    };
  }, []);

  /* zadnji del poti, ki ga poznamo; podstran (npr. /racuni/nov) pade na starša */
  const kljuc = pathname.split('/').reverse().find(d => d in IMENA);
  const stran = kljuc ? IMENA[kljuc] : '';

  /* napredek objavi delovni prostor (kalkulator/retainer); null = ni ga */
  const napredek = useFlowNapredek();

  return (
    <div className={styles.flowTopBar}>
      {/* progress bar ZNOTRAJ headerja, na spodnjem robu — tako se premika z njim */}
      {napredek !== null && (
        <div className={styles.topNapredek} aria-hidden>
          <i style={{ width: `${Math.round(napredek * 100)}%` }} />
        </div>
      )}
      {/* puscica nazaj PRED logom, kot v kalkulatorju */}
      <NazajNaPregled />
      <Link href={`${base}/kalkulator/pregled`} className={styles.topBrand}>
        <span className={styles.brandMark} />
        <strong>Pinart</strong><span>FLOW</span>
      </Link>

      {/* BETA, ne FREE: Flow ni brezplacen, brezplacen je samo kalkulator.
          Zato tudi ni "Nadgradi" ob prehodu miske — nadgrajevati ni cesa. */}
      <span className={styles.paketZnacka} data-beta>BETA</span>
      {/* tik ob BETA, kot prej v meniju — pot nazaj na Flow landing */}
      <Link className={styles.zapriGumb} href={`${base}/flow`}>× zapri</Link>

      {stran && <><span className={styles.topLocilo} aria-hidden="true">/</span>
        <span className={styles.topStran}>{stran}</span></>}

      {/* Preklop pogleda (Prazno / Zacetek / Moji / Demo) mora biti povsod:
          v nacinu "Prazno" se spremeni tudi uvodni pogovor v kalkulatorju,
          zato je bila pot nazaj na svoje podatke prej samo prek plosce. */}
      <PredogledPreklop />

      {/* Stoparica je stanje cele aplikacije, ne lastnost ene strani. Prej je
          bila v glavi vsake strani in je pri kalkulatorju visela cez panel
          ponudbe.
          Namenoma NI v ".topDesno": ta se na telefonu skrije (orodja gredo v
          predal), tekoce merjenje pa mora biti vidno tudi tam. */}
      <StoparicaBliznjica />

      <div className={styles.topDesno}>
        <a className={styles.feedbackGumb}
          href="mailto:tina@pinart.si?subject=Pinart%20Flow%20%E2%80%94%20povratna%20informacija">
          Feedback
        </a>

        <FlowUkazi base={base} />

        <div className={styles.pomocOvoj}>
          <button type="button" className={styles.pomocGumb} onClick={() => setPomocOdprta(v => !v)}
            aria-label="Pomoč" aria-expanded={pomocOdprta} title="Pomoč">?</button>
          {pomocOdprta && <div className={styles.headerPopover}>
            <strong>Pomoč</strong>
            <Link href={`${base}/flow`} onClick={() => setPomocOdprta(false)}>Kako Flow deluje</Link>
            <Link href={`${base}/kalkulator/pogoji`} onClick={() => setPomocOdprta(false)}>Pogoji in zasebnost</Link>
            <a href="mailto:tina@pinart.si?subject=Pinart%20Flow%20%E2%80%94%20pomo%C4%8D">Piši nam</a>
          </div>}
        </div>

        <DashboardHeaderTools />
      </div>
    </div>
  );
}
