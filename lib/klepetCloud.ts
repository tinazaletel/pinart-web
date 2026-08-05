/* Oblacni klepet (Supabase) — kolaboracija med sodelavci prek RLS po e-mailu.
   Vzorec kot lib/pinartMailCloud.ts. Brez prijave/tabele vse funkcije tiho
   vrnejo null/[], klijent pa degradira na lokalni klepet (lib/klepet.ts).
   Nit = projekt + sortirani e-maili udelezencev (nit_key) -> enak kljuc z obeh
   strani, zato Tina in mama vidita isto nit. */

import { createClient } from '@/utils/supabase/client';

export type OblacnoSporocilo = {
  id: string;
  threadId: string;
  body: string;
  senderEmail: string;
  senderName?: string;
  odMaila?: string;
  createdAt: string;
};

const norm = (e: string) => (e || '').trim().toLowerCase();

/* deterministicni kljuc niti: vkljucuje VSE udelezence (sortirano) */
export function nitKljuc(projectId: string, udelezenciEmaili: string[]): string {
  const set = Array.from(new Set(udelezenciEmaili.map(norm).filter(Boolean))).sort();
  return `${projectId}::${set.join('|')}`;
}

export async function mojEmail(): Promise<string | null> {
  try {
    const { data } = await createClient().auth.getUser();
    return data.user?.email ? norm(data.user.email) : null;
  } catch {
    return null;
  }
}

/* Poskrbi za nit + udelezence (jaz + izbrani sodelavci). Vrne threadId ali null. */
export async function zagotoviNit(
  projectId: string,
  udelezenci: { email: string; ime?: string }[],
): Promise<string | null> {
  const supa = createClient();
  let uid: string | null = null;
  let email: string | null = null;
  try {
    const { data } = await supa.auth.getUser();
    uid = data.user?.id || null;
    email = data.user?.email ? norm(data.user.email) : null;
  } catch {
    return null;
  }
  if (!uid || !email) return null;

  const udel = udelezenci.map(u => ({ email: norm(u.email), ime: u.ime })).filter(u => !!u.email && u.email !== email);
  const kljuc = nitKljuc(projectId, [email, ...udel.map(u => u.email)]);

  const { data: obstojeca } = await supa.from('chat_thread').select('id').eq('nit_key', kljuc).maybeSingle();
  if (obstojeca?.id) return String(obstojeca.id);

  const { data: nova, error } = await supa
    .from('chat_thread')
    .insert({ project_external_id: projectId, nit_key: kljuc, created_by: uid })
    .select('id')
    .single();
  if (error || !nova?.id) return null;
  const threadId = String(nova.id);

  const vrstice = [{ thread_id: threadId, email, ime: null as string | null }, ...udel.map(u => ({ thread_id: threadId, email: u.email, ime: u.ime || null }))];
  await supa.from('chat_participant').upsert(vrstice, { onConflict: 'thread_id,email' });
  return threadId;
}

const izVrstice = (r: Record<string, unknown>, threadId: string): OblacnoSporocilo => ({
  id: String(r.id),
  threadId,
  body: String(r.body ?? ''),
  senderEmail: norm(String(r.sender_email ?? '')),
  senderName: r.sender_name ? String(r.sender_name) : undefined,
  odMaila: r.od_maila ? String(r.od_maila) : undefined,
  createdAt: String(r.created_at ?? ''),
});

export async function nalozSporocila(threadId: string): Promise<OblacnoSporocilo[]> {
  try {
    const { data, error } = await createClient()
      .from('chat_message').select('*').eq('thread_id', threadId).order('created_at', { ascending: true });
    if (error) return [];
    return (data || []).map(r => izVrstice(r as Record<string, unknown>, threadId));
  } catch {
    return [];
  }
}

export async function posljiSporocilo(threadId: string, body: string, odMaila?: string, senderName?: string): Promise<OblacnoSporocilo | null> {
  const supa = createClient();
  const email = await mojEmail();
  if (!email) return null;
  const { data, error } = await supa
    .from('chat_message')
    .insert({ thread_id: threadId, sender_email: email, sender_name: senderName || null, body, od_maila: odMaila || null })
    .select('*').single();
  if (error || !data) return null;
  return izVrstice(data as Record<string, unknown>, threadId);
}

/* Realtime: cb ob vsakem novem sporocilu niti; vrne odjavo. */
export function narociSporocila(threadId: string, cb: (m: OblacnoSporocilo) => void): () => void {
  const supa = createClient();
  const ch = supa
    .channel(`chat_${threadId}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_message', filter: `thread_id=eq.${threadId}` }, payload => {
      cb(izVrstice(payload.new as Record<string, unknown>, threadId));
    })
    .subscribe();
  return () => { void supa.removeChannel(ch); };
}

/* Vse niti, kjer sem udelezenec (RLS poskrbi za filter) — za vpogled »skupni klepeti«. */
export async function mojeNiti(): Promise<{ threadId: string; projectId?: string }[]> {
  try {
    const { data, error } = await createClient().from('chat_thread').select('id, project_external_id').order('created_at', { ascending: false });
    if (error) return [];
    return (data || []).map(r => ({ threadId: String(r.id), projectId: r.project_external_id ? String(r.project_external_id) : undefined }));
  } catch {
    return [];
  }
}
