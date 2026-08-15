type IncomingMail = {
  fromEmail?: string | null;
  subject?: string | null;
  bodyText?: string | null;
};

export function replySubject(subject?: string | null): string {
  const clean = subject?.trim() || 'Sporočilo';
  return /^re\s*:/i.test(clean) ? clean : `Re: ${clean}`;
}

export function buildMailReplyPrompt(mail: IncomingMail, instructions?: string): string {
  return [
    'Pripravi samo osnutek odgovora na spodnji e-poštni naslov.',
    'Odgovori v istem jeziku kot prejeto sporočilo, profesionalno, prijazno in jedrnato.',
    'Ne izmišljaj si dejstev, cen, rokov ali obljub. Če pomemben podatek manjka, prosi za pojasnilo.',
    'Vrni samo besedilo odgovora brez zadeve, razlage ali oznak Markdown.',
    '',
    `Pošiljatelj: ${mail.fromEmail?.trim() || '(ni podatka)'}`,
    `Zadeva: ${mail.subject?.trim() || '(brez zadeve)'}`,
    'Prejeto sporočilo:',
    mail.bodyText?.trim() || '(prazno sporočilo)',
    instructions?.trim() ? `\nDodatna navodila uporabnika:\n${instructions.trim()}` : '',
  ].filter(Boolean).join('\n');
}
