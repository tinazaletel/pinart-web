'use client';

import { useState } from 'react';
import styles from '@/app/[locale]/kalkulator/pregled/pregled.module.css';

/**
 * Deljenje orodja iz noge menija.
 *
 * Na telefonu odpre sistemski list za deljenje (Web Share), kjer ljudje ze
 * znajo izbrati WhatsApp ali sporocila. Kjer tega ni (namizni brskalniki),
 * kopira povezavo — brez lastnega okna z ikonami omrezij, ki bi ga bilo treba
 * vzdrzevati.
 */
export default function DeliAplikacijo() {
  const [sporocilo, setSporocilo] = useState('');

  const deli = async () => {
    const naslov = 'Pinart Flow';
    const besedilo = 'Orodje, ki ti pove, koliko je vredno tvoje delo — ponudbe, pogodbe, računi in cene na enem mestu.';
    const url = 'https://www.pinart.si/flow';
    try {
      if (navigator.share) {
        await navigator.share({ title: naslov, text: besedilo, url });
        return;
      }
      await navigator.clipboard.writeText(`${besedilo} ${url}`);
      setSporocilo('Povezava je kopirana.');
      setTimeout(() => setSporocilo(''), 2600);
    } catch {
      /* uporabnik je deljenje preklical — to ni napaka in ne rabi sporocila */
    }
  };

  return (
    <button type="button" className={styles.deliGumb} onClick={deli}>
      <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor"
        strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="18" cy="5" r="2.6" /><circle cx="6" cy="12" r="2.6" /><circle cx="18" cy="19" r="2.6" />
        <path d="M8.4 10.8 15.6 6.4M8.4 13.2l7.2 4.4" />
      </svg>
      <span>{sporocilo || 'Deli Pinart Flow'}</span>
    </button>
  );
}
