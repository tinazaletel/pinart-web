/* Prepiše docs/CENE-TRZNA-RAZISKAVA-2026.md v strojno berljive vire.
 *
 * Zakaj pretvornik in ne ročni prepis: virov je devetdeset. Ročno prepisani bi
 * se ob prvem osveževanju raziskave razšli z dokumentom, in razhajanje med
 * tem, kar pišemo, in tem, kar je v viru, je pri tej funkciji najhujša možna
 * napaka — vsa njena vrednost stoji na tem, da drži.
 *
 * Zagon:  node scripts/trzniOkviriIzRaziskave.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';

const DOK = 'docs/CENE-TRZNA-RAZISKAVA-2026.md';

/* Naslov razdelka v raziskavi → id storitve v lib/pricingCatalog.ts */
const PRESLIKAVA = {
  'Logotip + osnovna identiteta': 'logo',
  'Celostna grafična podoba': 'cgp',
  'Publikacija / tiskovina': 'publikacija',
  'Embalaža': 'embalaza',
  'Ilustracija / vizualni svet': 'ilustracija',
  'Spletna stran': 'web',
  'UX/UI dizajn': 'uxui',
  'UX/UI mobilne aplikacije': 'aplikacija',
  'Dizajn sistem': 'dizajnsistem',
  'Social media vodenje': 'smm',
  'PR / odnosi z javnostmi': 'pr',
  'Fotografiranje': 'fotografija',
  'Video produkcija': 'video',
  'Motion / animacija': 'motion',
  '3D vizualizacija': 'render3d',
  'Interier dizajn': 'interier',
  'Arhitekturno oblikovanje': 'arhitektura',
  'Razstavni / scenski dizajn': 'razstava',
  'Produktni / pohištveni dizajn': 'produktni',
  'Kreativna direkcija': 'direkcija',
  'Brand strategija': 'strategija',
};

const besedilo = readFileSync(DOK, 'utf8');
const razdelki = besedilo.split(/\n### /).slice(1);
const izhod = {};

for (const r of razdelki) {
  const naslov = r.split('\n')[0].trim();
  const id = PRESLIKAVA[naslov];
  if (!id) continue;

  const viri = [];
  for (const vrstica of r.split('\n')) {
    if (!vrstica.startsWith('|')) continue;
    const celice = vrstica.split('|').slice(1, -1).map(c => c.trim());
    if (celice.length < 4) continue;
    /* preskoči glavo in ločilno vrstico */
    if (/^-+:?$/.test(celice[0]) || /^:?-+/.test(celice[1] || '')) continue;
    if (/^(ponudnik|vir|storitev)\b/i.test(celice[0])) continue;
    const povezava = celice[celice.length - 1].match(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/);
    viri.push({
      ponudnik: celice[0],
      cena: celice[1],
      obseg: celice[2],
      url: povezava ? povezava[2] : null,
    });
  }
  if (viri.length) izhod[id] = viri;
}

const glava = `/* SAMODEJNO USTVARJENO — ne urejaj ročno.
 * Vir: ${DOK}
 * Osveži z: node scripts/trzniOkviriIzRaziskave.mjs
 */

export type VirCene = { ponudnik: string; cena: string; obseg: string; url: string | null };

export const VIRI_CEN: Record<string, VirCene[]> = `;

writeFileSync('lib/trzniOkviriViri.ts', glava + JSON.stringify(izhod, null, 2) + ';\n');

/* Odjemalcu gredo SAMO števila, nikoli imena ponudnikov.
 *
 * Če bi imena zgolj skrili v vmesniku, bi ostala v svežnju, ki ga dobi
 * brskalnik — kdorkoli bi jih našel v nekaj sekundah, kar je slabše od odkrite
 * objave: videti je kot prikrivanje. Dokler pravna presoja ni znana, imena
 * ostanejo v repozitoriju in ne gredo na splet. */
const stevila = Object.fromEntries(Object.entries(izhod).map(([k, v]) => [k, v.length]));
writeFileSync('lib/trzniOkviriStevilo.ts',
  `/* SAMODEJNO USTVARJENO — ne urejaj rocno.\n * Vir: ${DOK}\n * Samo STEVILA virov; imena ponudnikov namenoma ne pridejo v odjemalca.\n */\n\nexport const VIRI_STEVILO: Record<string, number> = ` +
  JSON.stringify(stevila, null, 2) + ';\n');
const skupaj = Object.values(izhod).reduce((n, v) => n + v.length, 0);
console.log(`zapisano: ${Object.keys(izhod).length} storitev, ${skupaj} virov`);
