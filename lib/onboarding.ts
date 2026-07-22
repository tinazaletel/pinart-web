'use client';

import { createClient } from '@/utils/supabase/client';
import { getOrganizationContext } from './pinartFlowCloud';

/**
 * Uvodna nastavitev = uvodni pogovor v KALKULATORJU.
 *
 * Namenoma NI svojega zaslona. Kalkulator ze vpraša ime, izkušnje, podjetje in
 * podrocja — z mehurcki in v svojem slogu. Druga, vzporedna razlicica istih
 * vprasanj bi bila samo slabsa kopija.
 *
 * Ta modul zato nicesar ne sprasuje. Naredi troje:
 *  1. prebere, na katera vprasanja je uporabnik ze odgovoril (iz istega
 *     localStorage zapisa, ki ga pise kalkulator in stran Profil),
 *  2. te odgovore prezrcali v oblak, da prezivijo menjavo naprave,
 *  3. pove nadzorni plosci, koliko se manjka.
 *
 * Mesecni cilj je peto vprasanje in ga kalkulator nima — sodi na "Cilji",
 * ne v pogovor o ponudbi, zato ga tukaj ne stejemo.
 */

/* zapis kalkulatorja; iste kljuce pise tudi stran Profil */
export const KLJUC_LOCAL = 'pinart-kalkulator-v2';

export type Odgovori = {
  ime?: string;
  izkusnje?: string;
  podjetje?: string;
  podrocja?: string[];
};

export const KORAKOV = 4;

function preberiLocal(): Record<string, any> {
  try { return JSON.parse(localStorage.getItem(KLJUC_LOCAL) || '{}'); } catch { return {}; }
}

/** Kaj je uporabnik ze povedal kalkulatorju. */
export function lokalniOdgovori(): Odgovori {
  const l = preberiLocal();
  const podrocja = Array.isArray(l.obIzbor) ? l.obIzbor.map(String) : [];
  return {
    ime: l.imeUporabnika || undefined,
    izkusnje: l.izkusnje || undefined,
    podjetje: l.ponudnik?.ime || undefined,
    podrocja: podrocja.length ? podrocja : undefined,
  };
}

export function stejOdgovore(o: Odgovori): number {
  return [o.ime, o.izkusnje, o.podjetje, o.podrocja?.length].filter(Boolean).length;
}

export function jeKoncan(o = lokalniOdgovori()): boolean {
  return stejOdgovore(o) >= KORAKOV;
}

/**
 * Prezrcali odgovore v oblak in javi anonimno statistiko, ko je pogovor
 * koncan. Klice se ob nalaganju nadzorne plosce: to je edina stran, ki jo
 * uporabnik zanesljivo obisce po pogovoru, kalkulator pa je prevelik, da bi
 * vanj vrival se en ucinek.
 *
 * Napake so namenoma tihe — brez omrezja odgovori ostanejo na napravi in
 * se prenesejo ob naslednjem obisku.
 */
export async function sinhronizirajZOblakom(): Promise<void> {
  const o = lokalniOdgovori();
  if (!stejOdgovore(o)) return;
  try {
    const context = await getOrganizationContext();
    if (!context) return;
    const supabase = createClient();
    const { data } = await supabase.from('organization_settings')
      .select('onboarding,onboarding_done_at').eq('organization_id', context.organizationId).maybeSingle();
    const prej = (data?.onboarding && typeof data.onboarding === 'object' ? data.onboarding : {}) as Odgovori;
    const zdruzeno: Odgovori = { ...prej, ...o };
    /* ne pisi, ce se ni spremenilo nic — sicer je pri vsakem obisku en zapis vec */
    const enako = JSON.stringify(prej) === JSON.stringify(zdruzeno);
    const koncano = jeKoncan(zdruzeno);
    if (enako && (!koncano || data?.onboarding_done_at)) return;

    const payload: Record<string, unknown> = {
      organization_id: context.organizationId,
      onboarding: zdruzeno,
      updated_at: new Date().toISOString(),
    };
    if (koncano && !data?.onboarding_done_at) payload.onboarding_done_at = new Date().toISOString();
    await supabase.from('organization_settings').upsert(payload, { onConflict: 'organization_id' });

    if (koncano && !data?.onboarding_done_at) javiStatistiki('onboarding_koncan', zdruzeno);
  } catch { /* lokalno je shranjeno; oblak dohiti ob naslednjem obisku */ }
}

/** Odgovori iz oblaka — za napravo, ki lokalnega zapisa se nima. */
export async function potegniZOblaka(): Promise<{ odgovori: Odgovori; koncano: boolean } | null> {
  try {
    const context = await getOrganizationContext();
    if (!context) return null;
    const { data } = await createClient().from('organization_settings')
      .select('onboarding,onboarding_done_at').eq('organization_id', context.organizationId).maybeSingle();
    if (!data) return null;
    const o = (data.onboarding && typeof data.onboarding === 'object' ? data.onboarding : {}) as Odgovori;
    return { odgovori: o, koncano: !!data.onboarding_done_at };
  } catch { return null; }
}

/**
 * Anonimni zapis v statistiko: izkusnje in podrocja, brez imena, e-poste in
 * imena podjetja. Iz tega nastane kontekst za primerjavo cen na trgu —
 * brez njega so zbrane cene samo kup stevilk.
 */
export function javiStatistiki(ime: 'onboarding_koncan', o: Odgovori) {
  try {
    void fetch('/api/dogodek', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ime,
        pot: '/kalkulator/orodje',
        naprava: window.innerWidth < 720 ? 'mobile' : 'desktop',
        jezik: document.documentElement.lang || 'sl',
        lastnosti: { podrocja: (o.podrocja || []).join('+'), izkusnje: o.izkusnje || '' },
      }),
    });
  } catch { /* statistika ne sme nikoli ustaviti uporabnika */ }
}
