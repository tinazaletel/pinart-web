/* Klient helper za vabila v ekipo (Faza 2). Kliče /api/ekipa/vabi, ki ustvari
   vpis v organization_invitations in pošlje e-pošto s povezavo za sprejem.
   Ključa/tokenov klient ne vidi — vse teče prek strežniške poti. */

export interface VabiloRezultat {
  ok: boolean;
  napaka?: string;
  poslano?: boolean;   // je e-pošta res odšla
  povezava?: string;   // ročna povezava, če e-pošta ni nastavljena
}

/* vloga: 'admin' (poln dostop do organizacije) ali 'member' (član). */
export async function posljiVabilo(email: string, vloga: 'admin' | 'member' = 'member'): Promise<VabiloRezultat> {
  try {
    const res = await fetch('/api/ekipa/vabi', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim().toLowerCase(), role: vloga }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, napaka: data?.error || 'Vabila ni bilo mogoče poslati.' };
    return { ok: true, poslano: Boolean(data?.poslano), povezava: data?.povezava, napaka: data?.opozorilo };
  } catch {
    return { ok: false, napaka: 'Vabila ni bilo mogoče poslati (povezava).' };
  }
}

export interface ClanOblak { userId: string; email: string; fullName: string; role: string; isSelf: boolean; }
export interface VabiloOblak { id: string; email: string; role: string; expiresAt: string; }
export interface SedeziOblak { zasedeni: number; meja: number; plan: string; planOznaka: string; }
export interface EkipaOblak { jeAdmin: boolean; clani: ClanOblak[]; vabila: VabiloOblak[]; sedezi?: SedeziOblak; }

/* Prebere pravo ekipo iz oblaka (člani + čakajoča vabila). null = ni povezano/napaka. */
export async function preberiEkipo(): Promise<EkipaOblak | null> {
  try {
    const res = await fetch('/api/ekipa/clani', { method: 'GET' });
    if (!res.ok) return null;
    const data = await res.json().catch(() => null);
    if (!data || !Array.isArray(data.clani)) return null;
    return { jeAdmin: Boolean(data.jeAdmin), clani: data.clani, vabila: Array.isArray(data.vabila) ? data.vabila : [], sedezi: data.sedezi };
  } catch {
    return null;
  }
}

export async function odstraniClana(userId: string): Promise<{ ok: boolean; napaka?: string }> {
  try {
    const res = await fetch('/api/ekipa/clani', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId }),
    });
    const data = await res.json().catch(() => ({}));
    return res.ok ? { ok: true } : { ok: false, napaka: data?.error || 'Napaka.' };
  } catch { return { ok: false, napaka: 'Napaka (povezava).' }; }
}

export async function prekliciVabilo(inviteId: string): Promise<{ ok: boolean; napaka?: string }> {
  try {
    const res = await fetch('/api/ekipa/vabi', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ inviteId }),
    });
    const data = await res.json().catch(() => ({}));
    return res.ok ? { ok: true } : { ok: false, napaka: data?.error || 'Napaka.' };
  } catch { return { ok: false, napaka: 'Napaka (povezava).' }; }
}

/* Prenos lastništva na drugega člana; ti postaneš admin. */
export async function prenesiLastnistvo(userId: string): Promise<{ ok: boolean; napaka?: string; opozorilo?: string }> {
  try {
    const res = await fetch('/api/ekipa/lastnistvo', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId }),
    });
    const data = await res.json().catch(() => ({}));
    return res.ok ? { ok: true, opozorilo: data?.opozorilo } : { ok: false, napaka: data?.error || 'Napaka.' };
  } catch { return { ok: false, napaka: 'Napaka (povezava).' }; }
}
