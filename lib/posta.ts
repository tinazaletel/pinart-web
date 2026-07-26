/* Klient helper za pošiljanje e-pošte prek /api/posta (Resend na strežniku).
   Ključa RESEND_API_KEY klient NIKOLI ne vidi — vse teče prek strežniške poti.
   Uporaba: const r = await posljiMail({ to, subject, html }); if (!r.ok) ... */

export interface MailVsebina {
  to: string;
  subject: string;
  html: string;
  /* neobvezen naslov za odgovore (npr. tvoja e-pošta) */
  replyTo?: string;
}

export interface MailRezultat {
  ok: boolean;
  napaka?: string;
  id?: string;
}

export async function posljiMail(v: MailVsebina): Promise<MailRezultat> {
  try {
    const res = await fetch('/api/posta', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(v),
    });
    const data = await res.json().catch(() => ({} as { error?: string; id?: string }));
    if (!res.ok) return { ok: false, napaka: data.error || 'Pošiljanje ni uspelo.' };
    return { ok: true, id: data.id };
  } catch {
    return { ok: false, napaka: 'Ni povezave s strežnikom.' };
  }
}
