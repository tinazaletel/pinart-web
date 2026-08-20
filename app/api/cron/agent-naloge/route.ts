import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { decryptAiSecret, normalizeAiPermissions } from '@/lib/aiConnections';
import { runAiProvider } from '@/lib/aiProviderClient';
import { pupaProviderConfig } from '@/lib/pupaProvider';

/* DELAVEC — to je tisti del, ki dela, ko je zavihek zaprt.
 *
 * Vercel nima strežnika, ki bi tekel ves čas: funkcija se zbudi ob zahtevi in
 * po odgovoru ugasne. Ozadje zato ni "postopek, ki teče", ampak "nekdo, ki
 * redno pogleda, ali kaj čaka". Ta nekdo je urnik iz vercel.json, ki to pot
 * pokliče vsako minuto.
 *
 * Iz tega sledi vse ostalo:
 *  - Zagon ima ČASOVNI PRORAČUN. Funkcija ima omejeno življenje, zato nehamo
 *    jemati nove naloge, preden nam ga zmanjka. Ostanek počaka na naslednjo
 *    minuto; vrsta se ne izgubi.
 *  - Naloga se prevzame ATOMSKO (SKIP LOCKED v bazi). Če se dva zagona
 *    prekrivata, drugi vzame naslednje naloge, ne istih.
 *  - Naloga, ki obvisi, se po petih minutah vrne v vrsto. Po treh poskusih
 *    odneha in to pošteno pove.
 */

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/* Koliko nalog teče hkrati. Trije so dovolj: ponudniki omejujejo pogostost,
   pri več pa se čakanje samo prestavi v njihovo vrsto. */
const HKRATI = 3;
/* Nove naloge jemljemo le, dokler nam ostane vsaj tolika rezerva. */
const PRORACUN_MS = 45_000;

type Naloga = {
  id: string;
  besedilo: string;
  connection_id: string | null;
  organization_id: string;
};

export async function GET(request: Request) {
  /* Vercel pošlje CRON_SECRET kot Bearer. Brez skrivnosti pot ni javna, ampak
     mrtva — sicer bi lahko kdorkoli praznil vrsto in kuril ključe. */
  const skrivnost = process.env.CRON_SECRET;
  if (!skrivnost) {
    return NextResponse.json({ napaka: 'CRON_SECRET ni nastavljen.' }, { status: 503 });
  }
  if (request.headers.get('authorization') !== `Bearer ${skrivnost}`) {
    return NextResponse.json({ napaka: 'Ni dovoljeno.' }, { status: 401 });
  }

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ napaka: 'Baza ni dosegljiva.' }, { status: 503 });

  const zacetekZagona = Date.now();
  const preostalo = () => PRORACUN_MS - (Date.now() - zacetekZagona);

  /* Najprej poberemo za sabo: obtičale naloge nazaj v vrsto. */
  await admin.rpc('osvezi_obticale_naloge');

  let opravljenih = 0;
  let padlih = 0;

  const zakljuci = async (id: string, uspeh: boolean, besedilo: string, model: string) => {
    await admin.from('agent_naloge').update({
      stanje: uspeh ? 'gotovo' : 'napaka',
      odgovor: uspeh ? besedilo.slice(0, 200_000) : null,
      napaka: uspeh ? null : besedilo.slice(0, 500),
      model: model || null,
      konec: new Date().toISOString(),
    }).eq('id', id);
    if (uspeh) opravljenih += 1; else padlih += 1;
  };

  const opravi = async (naloga: Naloga) => {
    try {
      if (naloga.connection_id) {
        const { data: povezava } = await admin.from('organization_ai_connections')
          .select('provider,model,endpoint_url,encrypted_secret,permissions,status')
          .eq('id', naloga.connection_id)
          .eq('organization_id', naloga.organization_id)
          .maybeSingle();

        if (!povezava) return zakljuci(naloga.id, false, 'Povezave ni več.', '');
        if (povezava.status === 'disabled') return zakljuci(naloga.id, false, 'Povezava je izklopljena.', '');
        if (povezava.provider === 'custom-mcp') return zakljuci(naloga.id, false, 'Izvajanje prek MCP še ni podprto.', '');

        const dovoljenja = normalizeAiPermissions(povezava.permissions);
        if (!dovoljenja.read || !dovoljenja.draft) {
          return zakljuci(naloga.id, false, 'Povezava nima dovoljenja za pripravo vsebine.', '');
        }

        const rezultat = await runAiProvider(povezava, decryptAiSecret(povezava.encrypted_secret), naloga.besedilo);
        return zakljuci(naloga.id, true, rezultat.text, rezultat.model || '');
      }

      /* Brez izbrane povezave nalogo opravi Pupa z našim ključem. */
      const pupa = pupaProviderConfig();
      if (!pupa) return zakljuci(naloga.id, false, 'Pupino zaledje ni nastavljeno.', '');
      const rezultat = await runAiProvider(pupa.connection, pupa.secret, naloga.besedilo);
      return zakljuci(naloga.id, true, rezultat.text, rezultat.model || '');
    } catch (error) {
      /* Sporočilo ponudnika je že očiščeno v aiProviderClient (brez ključev). */
      const sporocilo = error instanceof Error ? error.message : 'Naloge ni bilo mogoče izvesti.';
      return zakljuci(naloga.id, false, sporocilo, '');
    }
  };

  /* Delamo v serijah po HKRATI in po vsaki seriji pogledamo na uro. */
  while (preostalo() > 8_000) {
    const { data, error } = await admin.rpc('prevzemi_agent_naloge', { kolicina: HKRATI });
    if (error) {
      console.error('Prevzem nalog ni uspel:', error.message);
      break;
    }
    const serija = (data ?? []) as Naloga[];
    if (!serija.length) break;
    await Promise.all(serija.map(opravi));
  }

  return NextResponse.json({ opravljenih, padlih });
}
