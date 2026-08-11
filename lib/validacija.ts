export class NapakaValidacije extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NapakaValidacije';
  }
}

export async function preberiJson<T = Record<string, unknown>>(
  request: Request,
  najvecBajtov = 100_000,
): Promise<T> {
  const contentType = request.headers.get('content-type')?.toLowerCase() ?? '';
  if (!contentType.includes('application/json')) {
    throw new NapakaValidacije('Pričakovano je JSON telo zahtevka.');
  }

  const napovedanaVelikost = Number(request.headers.get('content-length') ?? 0);
  if (Number.isFinite(napovedanaVelikost) && napovedanaVelikost > najvecBajtov) {
    throw new NapakaValidacije(`Zahtevek je prevelik (največ ${najvecBajtov} B).`);
  }

  const reader = request.body?.getReader();
  if (!reader) throw new NapakaValidacije('Telo zahtevka manjka.');

  const deli: Uint8Array[] = [];
  let velikost = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    velikost += value.byteLength;
    if (velikost > najvecBajtov) {
      await reader.cancel();
      throw new NapakaValidacije(`Zahtevek je prevelik (največ ${najvecBajtov} B).`);
    }
    deli.push(value);
  }

  const zdruzeno = new Uint8Array(velikost);
  let odmik = 0;
  for (const del of deli) {
    zdruzeno.set(del, odmik);
    odmik += del.byteLength;
  }

  try {
    const parsed = JSON.parse(new TextDecoder().decode(zdruzeno)) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new NapakaValidacije('JSON telo mora biti objekt.');
    }
    return parsed as T;
  } catch (error) {
    if (error instanceof NapakaValidacije) throw error;
    throw new NapakaValidacije('JSON telo ni veljavno.');
  }
}

export function sporociloValidacije(error: unknown) {
  return error instanceof NapakaValidacije ? error.message : 'Neveljaven zahtevek.';
}

export function jeEmail(value: unknown): value is string {
  return typeof value === 'string' && value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function omejenNiz(value: unknown, najvec: number, obvezen = false): value is string {
  return typeof value === 'string' && value.length <= najvec && (!obvezen || value.trim().length > 0);
}
