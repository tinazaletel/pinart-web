/* Pupa oblačna zgodovina — branje/pisanje pogovorov v Supabase (per-uporabnik, RLS).
   Brskalniški odjemalec; RLS je ključavnica. VSE funkcije graciozno degradirajo
   (vrnejo prazno/null ob napaki ali brez prijave/tabele), da UI ne pade —
   PupaDom v tem primeru uporabi localStorage. Tabeli: 20260814170000_pupa_conversations.sql */

import { createClient } from '@/utils/supabase/client';

export type PupaSpor = { role: 'user' | 'assistant'; content: string };
export type PupaPogovorPovzetek = { id: string; naslov: string | null; updated_at: string };

async function idUporabnika(): Promise<string | null> {
  try { const { data } = await createClient().auth.getUser(); return data.user?.id ?? null; } catch { return null; }
}

/** Seznam pogovorov (za pregled zgodovine), najnovejši prvi. */
export async function nalozPogovore(): Promise<PupaPogovorPovzetek[]> {
  try {
    const { data, error } = await createClient()
      .from('pupa_conversation')
      .select('id, naslov, updated_at')
      .order('updated_at', { ascending: false })
      .limit(50);
    if (error || !data) return [];
    return data as PupaPogovorPovzetek[];
  } catch { return []; }
}

/** Sporočila enega pogovora (po vrsti). */
export async function nalozSporocila(conversationId: string): Promise<PupaSpor[]> {
  try {
    const { data, error } = await createClient()
      .from('pupa_message')
      .select('role, content')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });
    if (error || !data) return [];
    return data as PupaSpor[];
  } catch { return []; }
}

/** Ustvari nov pogovor; vrne id ali null (če ni prijave/oblaka). */
export async function ustvariPogovor(naslov: string): Promise<string | null> {
  try {
    const uid = await idUporabnika();
    if (!uid) return null;
    const { data, error } = await createClient()
      .from('pupa_conversation')
      .insert({ user_id: uid, naslov: (naslov || '').slice(0, 80) || null })
      .select('id')
      .single();
    if (error || !data) return null;
    return (data as { id: string }).id;
  } catch { return null; }
}

/** Dodaj sporočilo v pogovor + osveži updated_at (za vrstni red v zgodovini). */
export async function dodajSporocilo(conversationId: string, role: 'user' | 'assistant', content: string): Promise<boolean> {
  try {
    const sb = createClient();
    const { error } = await sb.from('pupa_message').insert({ conversation_id: conversationId, role, content });
    if (error) return false;
    await sb.from('pupa_conversation').update({ updated_at: new Date().toISOString() }).eq('id', conversationId);
    return true;
  } catch { return false; }
}
