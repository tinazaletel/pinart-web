export type TimestampedRecord = {
  id: string;
  updatedAt?: string;
  deletedAt?: string;
};

export const mergeByUpdatedAt = <T extends TimestampedRecord>(cloud: T[], local: T[]) => {
  const items = new Map<string, T>();
  for (const item of [...cloud, ...local]) {
    const current = items.get(item.id);
    if (!current) {
      items.set(item.id, item);
      continue;
    }
    const currentTime = current.updatedAt ? Date.parse(current.updatedAt) : Number.NEGATIVE_INFINITY;
    const itemTime = item.updatedAt ? Date.parse(item.updatedAt) : Number.NEGATIVE_INFINITY;
    if (itemTime > currentTime || (itemTime === currentTime && !item.updatedAt)) {
      items.set(item.id, item);
    }
  }
  return [...items.values()].filter(item => !item.deletedAt);
};
