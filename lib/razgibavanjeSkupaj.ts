/* RAZGIBAVANJE SKUPAJ — »cela pisarna naenkrat« (Tina, 30. 8. 2026).
 *
 * Broadcast kanal, ne tabela: povabilo velja tri sekunde in ga ni treba nikoli
 * več prebrati, zato ne rabi ne vrstice v bazi ne migracije ne RLS pravila.
 * Kanal je en na organizacijo, ime pa vsebuje njen id, tako da povabilo nikoli
 * ne uide v drugo podjetje.
 *
 * En sam kanal na zavihek: pošiljatelj svojega sporočila ne dobi nazaj
 * (Supabase privzeto ne vrača lastnih oddaj), zato bi ločen kanal za pošiljanje
 * pomenil, da povabilo prejme tudi tisti, ki ga je poslal.
 */

import type { RealtimeChannel } from '@supabase/supabase-js';
import { createClient } from '@/utils/supabase/client';
import { getOrganizationContext } from '@/lib/pinartFlowCloud';

/* Povabilo nosi čas SKUPNEGA ZAČETKA, ne trenutka pošiljanja: kdor ravno tipka
   stavek, mora imeti čas, da ga dokonča, sicer zamudi pol vaje (Tina, 30. 8.
   2026). Ura je pri vseh usklajena na sekundo natančno, ker vsak šteje do iste
   časovne znamke. */
export const PRIPRAVA_MS = 30_000;

export type Povabilo = { kdo: string; trajanje: number; zacetek: number };

export type Povezava = {
  povabi: (trajanje: number) => number;
  odjava: () => void;
};

async function mojeIme(): Promise<string> {
  const supa = createClient();
  const { data: { user } } = await supa.auth.getUser();
  const meta = user?.user_metadata as { full_name?: string; name?: string } | undefined;
  const ime = (meta?.full_name || meta?.name || '').trim();
  if (ime) return ime.split(' ')[0];
  return (user?.email || '').split('@')[0] || 'Nekdo';
}

/** Poveže se na kanal ekipe. Vrne null, če uporabnik ni prijavljen. */
export async function poveziEkipo(cb: (p: Povabilo) => void): Promise<Povezava | null> {
  const ctx = await getOrganizationContext();
  if (!ctx) return null;

  const supa = createClient();
  const ime = await mojeIme();
  let kanal: RealtimeChannel | null = supa
    .channel(`razgib_${ctx.organizationId}`)
    .on('broadcast', { event: 'zacni' }, ({ payload }) => {
      const p = payload as Partial<Povabilo>;
      if (typeof p?.trajanje !== 'number') return;
      const zacetek = Number(p.zacetek);
      /* Zamudnika ne kličemo na vlak, ki je že odpeljal. */
      if (!Number.isFinite(zacetek) || zacetek < Date.now() - 5_000) return;
      cb({ kdo: String(p.kdo || 'Nekdo'), trajanje: p.trajanje, zacetek });
    });
  kanal.subscribe();

  return {
    /** Povabi ekipo; vrne časovno znamko skupnega začetka. */
    povabi: (trajanje: number) => {
      const zacetek = Date.now() + PRIPRAVA_MS;
      void kanal?.send({ type: 'broadcast', event: 'zacni', payload: { kdo: ime, trajanje, zacetek } });
      return zacetek;
    },
    odjava: () => {
      if (kanal) { void supa.removeChannel(kanal); kanal = null; }
    },
  };
}

/** Koliko nas je v ekipi — gumb za skupno vajo nima smisla, če si sam. */
export async function steviloClanov(): Promise<number> {
  const ctx = await getOrganizationContext();
  if (!ctx) return 0;
  const supa = createClient();
  const { count, error } = await supa
    .from('organization_members')
    .select('user_id', { count: 'exact', head: true })
    .eq('organization_id', ctx.organizationId);
  return error ? 0 : (count || 0);
}
