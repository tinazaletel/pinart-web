import { getBusinessDocumentUrl, getOrganizationContext, uploadBusinessDocument } from '@/lib/pinartFlowCloud';
import { preveriPriponko, varnoImePriponke, type Priponka } from '@/lib/priponke';
import { jeSeProstora } from '@/lib/kvota';

/* jeSlika je cisto pravilo in zato zivi v lib/priponke.ts; tu ga le podamo naprej,
   da klicatelji uvazajo vse o priponkah z enega mesta. */
export { jeSlika } from '@/lib/priponke';

/* SKUPNI sloj za nalaganje priponk — pošta IN naloge gresta skozi tega, da ne
   nastaneta dva različna načina. Pravila so v lib/priponke.ts (čista, testirana),
   shramba pa je OBSTOJEČE vedro business-documents prek uploadBusinessDocument —
   isti vzorec kot priloge pri pogodbah in stroških, torej ista evidenca
   (document_files), ista pot in iste kratkožive podpisane povezave.

   Sekcija loči rabo: 'mail' za pošto, 'naloge' za naloge. Sklic je id sporočila
   oziroma naloge, da so priponke ene stvari skupaj v svoji mapi. */

export type PriponkaSekcija = 'mail' | 'naloge';
export type PodatekKvote = { porabljeno: number; kvota: number; stanje: 'ok' | 'opozorilo' | 'polno' };

/* Vrne null, kadar porabe NI MOGOČE izmeriti (ni organizacije, pot ne odgovori,
   odgovor je nesmiseln). Namenoma ne vrže napake: neuspela MERITEV ne sme
   ustaviti dela. Trde meje — 10 MB na datoteko in 20 MB na sporočilo — veljajo
   naprej, zaledje pa priponko tako ali tako preveri še enkrat. */
export async function preberiKvoto(): Promise<PodatekKvote | null> {
  try {
    const kontekst = await getOrganizationContext();
    if (!kontekst) return null;
    const odgovor = await fetch(`/api/kvota?organizationId=${encodeURIComponent(kontekst.organizationId)}`, { cache: 'no-store' });
    if (!odgovor.ok) return null;
    const podatek = await odgovor.json() as Partial<PodatekKvote>;
    if (typeof podatek.porabljeno !== 'number' || typeof podatek.kvota !== 'number' || !podatek.stanje) return null;
    return podatek as PodatekKvote;
  } catch {
    return null;
  }
}

/* Je uporabnik prijavljen (in ima organizacijo)? Priponke gredo v oblak, zato
   brez prijave ne gre — vmesnik naj to pove mirno, ne z napako. */
export async function jePriponkeMogoce(): Promise<boolean> {
  try { return Boolean(await getOrganizationContext()); } catch { return false; }
}

/* Naloži eno datoteko in vrni metapodatke (vsebina ostane v Storage).
   Vrže Error s slovenskim sporočilom, ki ga vmesnik pokaže takšnega, kot je. */
export async function naloziPriponko(datoteka: File, sekcija: PriponkaSekcija, sklic: string): Promise<Priponka> {
  const izid = preveriPriponko({ ime: datoteka.name, velikost: datoteka.size });
  if (!izid.veljavno) throw new Error(izid.napaka || 'Priponka ni veljavna.');
  /* Ustavimo SAMO, kadar imamo resnično meritev in ta pove, da je polno.
     Če kvote ni mogoče izmeriti, gre datoteka skozi — bolje naložiti brez
     meritve kot ustaviti delo zaradi okvarjenega merilnika. */
  const stanje = await preberiKvoto();
  if (stanje && !jeSeProstora(stanje.porabljeno, stanje.kvota, datoteka.size)) {
    throw new Error('Prostor za priponke je zapolnjen. Obstoječe datoteke ostajajo dostopne, nove pa trenutno ni mogoče naložiti.');
  }
  const pot = await uploadBusinessDocument(datoteka, sekcija, sklic);
  return {
    ime: varnoImePriponke(datoteka.name) || 'priponka',
    velikost: datoteka.size,
    mime: datoteka.type || undefined,
    pot,
  };
}

/* Kratkoživa podpisana povezava (vedro je zasebno).
   prenesiKot = ime datoteke -> povezava PRENESE namesto odpre. Za SVG to ni
   udobje, ampak varnost: v brskalniku se ne izriše in skripta v njem ne steče. */
export async function povezavaPriponke(pot: string, sekund = 300, prenesiKot?: string): Promise<string> {
  return getBusinessDocumentUrl(pot, sekund, prenesiKot);
}

/* Datoteke iz odložišča (Cmd+V). Zaslonska slika pride brez imena, zato ga tu
   sestavimo — čas je parameter, da funkcija ostane predvidljiva. */
export function datotekeIzOdlozisca(podatki: DataTransfer | null, zdaj: number): File[] {
  if (!podatki) return [];
  const najdene: File[] = [];
  for (const el of Array.from(podatki.items || [])) {
    if (el.kind !== 'file') continue;
    const datoteka = el.getAsFile();
    if (!datoteka) continue;
    if (datoteka.name && datoteka.name !== 'image.png') { najdene.push(datoteka); continue; }
    /* brez pravega imena: zaslonska slika — poimenujemo jo po času, da se v
       seznamu loči od prejšnje */
    const koncnica = (datoteka.type.split('/')[1] || 'png').replace(/[^a-z0-9]/gi, '') || 'png';
    najdene.push(new File([datoteka], `posnetek-${zdaj}.${koncnica}`, { type: datoteka.type }));
  }
  return najdene;
}
