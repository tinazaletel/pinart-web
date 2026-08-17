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
