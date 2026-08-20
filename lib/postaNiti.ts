import type { PostaVnos } from './postaDnevnik';

export type PostaNit = { id: string; zadeva: string; sporocila: PostaVnos[] };

export function normalizirajZadevo(zadeva: string): string {
  return zadeva.trim().replace(/^\s*((re|fw|fwd|odg)\s*:\s*)+/i, '').replace(/\s+/g, ' ').toLocaleLowerCase('sl-SI');
}

const strankaKljuc = (v: PostaVnos): string =>
  v.clientId || v.projectId || [...v.prejemniki].map(x => x.trim().toLowerCase()).filter(Boolean).sort().join('|') || 'brez-stranke';

/* Najprej poveži standardne mail glave. Kjer jih starejši/lokalni zapis nima,
   uporabi isto stranko oziroma projekt in normalizirano zadevo. */
export function zdruziPostoVNiti(vnosi: PostaVnos[]): PostaNit[] {
  const poMessageId = new Map<string, string>();
  const nitPoKljucu = new Map<string, PostaNit>();
  const urejeni = [...vnosi].sort((a, b) => a.datum.localeCompare(b.datum));

  for (const v of urejeni) {
    const starsi = [v.inReplyTo, ...(v.references || [])].filter(Boolean) as string[];
    const povezanaNit = starsi.map(id => poMessageId.get(id)).find(Boolean);
    const rezervni = `${strankaKljuc(v)}::${normalizirajZadevo(v.zadeva || '')}`;
    const kljuc = povezanaNit || rezervni;
    let nit = nitPoKljucu.get(kljuc);
    if (!nit) {
      nit = { id: kljuc, zadeva: normalizirajZadevo(v.zadeva || '') || '(brez zadeve)', sporocila: [] };
      nitPoKljucu.set(kljuc, nit);
    }
    nit.sporocila.push(v);
    if (v.messageId) poMessageId.set(v.messageId, nit.id);
  }
  return [...nitPoKljucu.values()].sort((a, b) =>
    (b.sporocila.at(-1)?.datum || '').localeCompare(a.sporocila.at(-1)?.datum || ''));
}
