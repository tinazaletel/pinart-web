/* STIKALO ZA DAVCNO POTRJEVANJE (FURS).
 *
 * Integracija je napisana in preverjena, ni pa se aktivirana: manjkajo pravi
 * certifikat, prijavljen poslovni prostor in sifrirni kljuc na strezniku. Do
 * takrat je vse VIDNO, a ugasnjeno — da se vidi, kam gre, in da nihce ne izda
 * racuna, ki ne bi bil davcno potrjen.
 *
 * Vklop zahteva OBOJE:
 *   NEXT_PUBLIC_FURS_OMOGOCEN=1   (vmesnik neha biti ugasnjen)
 *   FURS_SIFRIRNI_KLJUC=<32 bajtov v base64>  (streznik zna hraniti certifikat)
 * Brez njiju ostane funkcija ugasnjena sama od sebe — na demu ni treba nicesar
 * nastavljati.
 */

/** Vmesnik: ali naj bo davcno potrjevanje zivo ali ugasnjeno. */
export const FURS_OMOGOCEN = process.env.NEXT_PUBLIC_FURS_OMOGOCEN === '1';

/** Streznik: brez sifrirnega kljuca certifikata ni kam shraniti. */
export function fursNaStrezniku(): boolean {
  return FURS_OMOGOCEN && Boolean(process.env.FURS_SIFRIRNI_KLJUC);
}

export const FURS_V_PRIPRAVI_SL = 'Davčno potrjevanje računov je v pripravi. Vklopimo ga, ko bo certifikat FURS urejen in poslovni prostor prijavljen.';
export const FURS_V_PRIPRAVI_EN = 'Fiscal verification of invoices is being prepared. We will switch it on once the FURS certificate is in place and the business premises registered.';
