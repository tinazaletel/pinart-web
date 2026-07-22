'use client';

import { useEffect } from 'react';
import { getAccessTier } from '@/lib/pinartFlowEntitlements';

/**
 * Zapise paket v <body data-paket>, da lahko CSS pokaze kljucavnice ob
 * zaklenjenih postavkah menija.
 *
 * Prek CSS in ne prek propsov zato, ker meni izrisuje streznik na 14 straneh —
 * podajanje paketa skozi vsako od njih bi pomenilo 14 enakih sprememb.
 *
 * To je SAMO videz. Prava zascita je na strani sami (strezniska preveritev),
 * sicer bi zadostovalo, da nekdo v brskalniku popravi atribut.
 */
export default function PaketZnak() {
  useEffect(() => {
    let zivo = true;
    getAccessTier()
      .then(t => { if (zivo) document.body.dataset.paket = t; })
      .catch(() => undefined);
    return () => { zivo = false; };
  }, []);

  return null;
}
