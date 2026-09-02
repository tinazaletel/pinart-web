import https from 'node:https';
import { FURS_NASLOVI, FURS_NASLOVI_PROSTORI, type FursOkolje } from './furs';

const NAJVEC_ODGOVORA = 512_000;

export type FursHttpNastavitve = {
  okolje: FursOkolje;
  certifikatPem: string;
  zasebniKljucPem: string;
  gesloKljuca?: string;
  timeoutMs?: number;
};

export type FursVrstaZahteve = 'racun' | 'prostor';

/** Zahtevek uporablja mTLS. Naslov ni vhod uporabnika, ampak zaprt uradni seznam. */
export function posljiFurs(token: string, nastavitve: FursHttpNastavitve, vrsta: FursVrstaZahteve = 'racun'): Promise<string> {
  const naslov = new URL(vrsta === 'prostor' ? FURS_NASLOVI_PROSTORI[nastavitve.okolje] : FURS_NASLOVI[nastavitve.okolje]);
  const telo = JSON.stringify({ token });
  return new Promise((resolve, reject) => {
    const zahteva = https.request({
      protocol: naslov.protocol,
      hostname: naslov.hostname,
      port: naslov.port,
      path: naslov.pathname,
      method: 'POST',
      cert: nastavitve.certifikatPem,
      key: nastavitve.zasebniKljucPem,
      passphrase: nastavitve.gesloKljuca,
      minVersion: 'TLSv1.2',
      timeout: nastavitve.timeoutMs ?? 15_000,
      headers: {
        'content-type': 'application/json; charset=UTF-8',
        'content-length': Buffer.byteLength(telo),
        accept: 'application/json',
      },
    }, (odgovor) => {
      const kosi: Buffer[] = [];
      let velikost = 0;
      odgovor.on('data', (kos: Buffer) => {
        velikost += kos.length;
        if (velikost > NAJVEC_ODGOVORA) {
          odgovor.destroy(new Error('Odgovor FURS je nepričakovano velik.'));
          return;
        }
        kosi.push(kos);
      });
      odgovor.on('end', () => {
        const vsebina = Buffer.concat(kosi).toString('utf8');
        if (!odgovor.statusCode || odgovor.statusCode < 200 || odgovor.statusCode >= 300) {
          reject(new Error(`FURS je zahtevek zavrnil (HTTP ${odgovor.statusCode || 0}).`));
          return;
        }
        try {
          const json = JSON.parse(vsebina) as { token?: unknown };
          if (typeof json.token !== 'string') throw new Error('Odgovor FURS ne vsebuje žetona.');
          resolve(json.token);
        } catch (napaka) {
          reject(napaka instanceof Error ? napaka : new Error('Odgovora FURS ni mogoče prebrati.'));
        }
      });
    });
    zahteva.on('timeout', () => zahteva.destroy(new Error('FURS se ni odzval pravočasno.')));
    zahteva.on('error', reject);
    zahteva.end(telo);
  });
}
