export type TimestampedRecord = {
  id: string;
  updatedAt?: string;
  deletedAt?: string;
};

export const mergeByUpdatedAt = <T extends TimestampedRecord>(cloud: T[], local: T[]) => {
  const items = new Map<string, T>();
  const timestamp = (value?: string): number => {
    if (!value) return Number.NEGATIVE_INFINITY;
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : Number.NEGATIVE_INFINITY;
  };
  for (const item of [...cloud, ...local]) {
    const current = items.get(item.id);
    if (!current) {
      items.set(item.id, item);
      continue;
    }
    // Brisanje je enosmerno. Dokler nimamo izrecne operacije "obnovi", nobena
    // starejša naprava (niti zapis z novejšim žigom) ne sme obuditi tombstona.
    if (current.deletedAt || item.deletedAt) {
      if (!current.deletedAt) items.set(item.id, item);
      continue;
    }
    const currentTime = timestamp(current.updatedAt);
    const itemTime = timestamp(item.updatedAt);
    const bothMissing = !current.updatedAt && !item.updatedAt;
    if (itemTime > currentTime || bothMissing) {
      items.set(item.id, item);
    }
  }
  return [...items.values()].filter(item => !item.deletedAt);
};
