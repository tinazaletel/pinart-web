import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

export type SifriranaVrednost = {
  vsebina: string;
  iv: string;
  oznaka: string;
};

export function fursSifrirniKljuc(vrednost = process.env.FURS_SIFRIRNI_KLJUC): Buffer {
  if (!vrednost) throw new Error('FURS šifrirni ključ ni nastavljen.');
  const kljuc = Buffer.from(vrednost, 'base64');
  if (kljuc.length !== 32) throw new Error('FURS šifrirni ključ mora imeti 32 bajtov v base64 obliki.');
  return kljuc;
}

export function sifrirajFursSkrivnost(cisto: string, kljuc: Buffer): SifriranaVrednost {
  const iv = randomBytes(12);
  const sifra = createCipheriv('aes-256-gcm', kljuc, iv);
  const vsebina = Buffer.concat([sifra.update(cisto, 'utf8'), sifra.final()]);
  return {
    vsebina: vsebina.toString('base64'),
    iv: iv.toString('base64'),
    oznaka: sifra.getAuthTag().toString('base64'),
  };
}

export function odsifrirajFursSkrivnost(vrednost: SifriranaVrednost, kljuc: Buffer): string {
  const odsifra = createDecipheriv('aes-256-gcm', kljuc, Buffer.from(vrednost.iv, 'base64'));
  odsifra.setAuthTag(Buffer.from(vrednost.oznaka, 'base64'));
  return Buffer.concat([
    odsifra.update(Buffer.from(vrednost.vsebina, 'base64')),
    odsifra.final(),
  ]).toString('utf8');
}
