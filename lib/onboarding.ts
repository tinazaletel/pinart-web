/* Skupna, ODPORNA definicija "popolnosti profila" (o meni) za kalkulator IN
   nadzorno ploščo (banner "Dopolni manjkajoče podatke").
   En vir resnice → dashboard in kalkulator ne moreta razpasti (ista pravila).

   Uporaba:
     const manjka = manjkajociProfil({ imeUporabnika, ponudnikIme: ponudnik.ime, podrocja: [...(mojSet ?? [])] });
     if (manjka.length) { ... pokaži banner / vodi čez uvod ... }

   Banner → povezava na `?uvod=1` (obstoječi mehanizem: uvodni chat prednapolni
   že odgovorjena vprašanja, uporabnik izpolni le manjkajoča). */

export type ProfilPodatki = {
  imeUporabnika?: string;   // osebno ime
  ponudnikIme?: string;     // podjetje (ponudnik.ime)
  podrocja?: string[];      // izbrana področja / aktivne storitve (mojSet ali obIzbor)
  izkusnje?: string;        // neobvezno: ima privzeto vrednost, zato NE šteje kot manjkajoče
};

export type ManjkajocePolje = 'ime' | 'podjetje' | 'podrocja';

/* Vrne seznam manjkajočih KLJUČNIH polj. Prazno = profil je popoln.
   Namerno NE zahtevamo `izkusnje` (ima privzeto vrednost 'samostojen'). */
export function manjkajociProfil(p: ProfilPodatki): ManjkajocePolje[] {
  const manjka: ManjkajocePolje[] = [];
  if (!(p.imeUporabnika ?? '').trim()) manjka.push('ime');
  if (!(p.ponudnikIme ?? '').trim()) manjka.push('podjetje');
  if (!(p.podrocja?.length)) manjka.push('podrocja');
  return manjka;
}

export const profilPopoln = (p: ProfilPodatki): boolean => manjkajociProfil(p).length === 0;

/* Berljive oznake za banner (SL/EN). */
export function oznakaPolja(polje: ManjkajocePolje, jeEn = false): string {
  const sl: Record<ManjkajocePolje, string> = { ime: 'ime', podjetje: 'podjetje', podrocja: 'področja dela' };
  const en: Record<ManjkajocePolje, string> = { ime: 'name', podjetje: 'company', podrocja: 'work areas' };
  return (jeEn ? en : sl)[polje];
}
