/* Klient helper za pošiljanje e-pošte prek /api/posta (Resend na strežniku).
   Ključa RESEND_API_KEY klient NIKOLI ne vidi — vse teče prek strežniške poti.
   Uporaba: const r = await posljiMail({ to, subject, html }); if (!r.ok) ... */

export interface MailVsebina {
  /* en prejemnik ali več (pošiljanje več osebam hkrati) */
  to: string | string[];
  subject: string;
  html: string;
  /* neobvezen naslov za odgovore (npr. tvoja e-pošta) */
  replyTo?: string;
  organizationId?: string;
  idempotencyKey?: string;
  demo?: boolean;
}

export interface MailRezultat {
  ok: boolean;
  napaka?: string;
  id?: string;
}

export interface MailPredogled {
  veljavno: boolean;
  prejemniki: string[];
  zadeva: string;
  opozorila: string[];
}

const EPOSTA_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Preveri pošto pred pošiljanjem, brez stranskih učinkov. */
export function pripraviMail(v: Partial<MailVsebina>): MailPredogled {
  const prejemniki = (Array.isArray(v.to) ? v.to : v.to ? [v.to] : [])
    .map(naslov => String(naslov).trim().toLowerCase())
    .filter(Boolean);
  const zadeva = String(v.subject || '').trim();
  const opozorila: string[] = [];
  if (!prejemniki.length) opozorila.push('Dodaj vsaj enega prejemnika.');
  if (prejemniki.some(naslov => !EPOSTA_RE.test(naslov))) opozorila.push('Preveri e-poštne naslove.');
  if (prejemniki.length > 50) opozorila.push('Največje število prejemnikov je 50.');
  if (!zadeva) opozorila.push('Dodaj zadevo.');
  if (zadeva.length > 300) opozorila.push('Zadeva je predolga.');
  if (!String(v.html || '').trim()) opozorila.push('Dodaj vsebino sporočila.');
  return { veljavno: opozorila.length === 0, prejemniki, zadeva, opozorila };
}

export async function posljiMail(v: MailVsebina): Promise<MailRezultat> {
  try {
    const predogled = pripraviMail(v);
    if (!predogled.veljavno) return { ok: false, napaka: predogled.opozorila[0] };
    const idempotencyKey = v.idempotencyKey || crypto.randomUUID();
    const res = await fetch('/api/posta', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...v, idempotencyKey }),
    });
    const data = await res.json().catch(() => ({} as { error?: string; id?: string }));
    if (!res.ok) return { ok: false, napaka: data.error || 'Pošiljanje ni uspelo.' };
    return { ok: true, id: data.id };
  } catch {
    return { ok: false, napaka: 'Ni povezave s strežnikom.' };
  }
}
