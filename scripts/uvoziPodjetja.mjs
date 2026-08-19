/* UVOZ POSLOVNEGA REGISTRA V SUPABASE
 *
 * Vir: Poslovni register Slovenije (AJPES) prek portala OPSI, CC BY 4.0.
 * Datoteka je prevelika za nalaganje prek Table Editorja, zato jo pošljemo
 * v svežnjih prek zaledja.
 *
 * Uporaba:
 *   node scripts/uvoziPodjetja.mjs <pot-do-podjetja.csv>
 *
 * Skript prebere SUPABASE_SERVICE_ROLE_KEY iz okolja ali iz .env.local in ga
 * NIKOLI ne izpiše. Service-role ključ je nujen, ker gre za pisanje v skupno
 * referenčno tabelo, ki je za navadnega uporabnika samo berljiva.
 */

import { readFileSync, existsSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

function izOkolja(ime) {
  if (process.env[ime]) return process.env[ime];
  if (!existsSync('.env.local')) return undefined;
  for (const vrstica of readFileSync('.env.local', 'utf8').split('\n')) {
    const enacaj = vrstica.indexOf('=');
    if (enacaj === -1) continue;
    if (vrstica.slice(0, enacaj).trim() !== ime) continue;
    return vrstica.slice(enacaj + 1).trim().replace(/^["']|["']$/g, '');
  }
  return undefined;
}

const url = izOkolja('NEXT_PUBLIC_SUPABASE_URL');
const kljuc = izOkolja('SUPABASE_SERVICE_ROLE_KEY');
const pot = process.argv[2];

if (!url || !kljuc) {
  console.error('Manjka NEXT_PUBLIC_SUPABASE_URL ali SUPABASE_SERVICE_ROLE_KEY (okolje ali .env.local).');
  process.exit(1);
}
if (!pot || !existsSync(pot)) {
  console.error('Podaj pot do podjetja.csv, npr.: node scripts/uvoziPodjetja.mjs ~/Desktop/podjetja.csv');
  process.exit(1);
}

/* Preprost CSV bralec, ki spoštuje narekovaje — imena podjetij so polna vejic. */
function razcleni(vrstica) {
  const polja = [];
  let trenutno = '';
  let vNarekovajih = false;
  for (let i = 0; i < vrstica.length; i += 1) {
    const z = vrstica[i];
    if (z === '"') {
      if (vNarekovajih && vrstica[i + 1] === '"') { trenutno += '"'; i += 1; }
      else vNarekovajih = !vNarekovajih;
    } else if (z === ',' && !vNarekovajih) {
      polja.push(trenutno); trenutno = '';
    } else {
      trenutno += z;
    }
  }
  polja.push(trenutno);
  return polja;
}

const supabase = createClient(url, kljuc, { auth: { persistSession: false } });

const vrstice = readFileSync(pot, 'utf8').split('\n');
vrstice.shift(); // glava

const SVEZENJ = 1000;
let svezenj = [];
let poslanih = 0;

async function posljiSvezenj() {
  if (!svezenj.length) return;
  const { error } = await supabase.from('podjetja').upsert(svezenj, { onConflict: 'maticna' });
  if (error) {
    console.error('\nNapaka pri pošiljanju:', error.message);
    process.exit(1);
  }
  poslanih += svezenj.length;
  process.stdout.write(`\rPoslano: ${poslanih}`);
  svezenj = [];
}

for (const vrstica of vrstice) {
  if (!vrstica.trim()) continue;
  const [maticna, ime, oblika, naslov, posta_st, posta, iskalno, davcna, ddv] = razcleni(vrstica);
  if (!maticna || !ime) continue;
  svezenj.push({ maticna, ime, oblika, naslov, posta_st, posta, iskalno, davcna: davcna || null, ddv: ddv === '1' });
  if (svezenj.length >= SVEZENJ) await posljiSvezenj();
}
await posljiSvezenj();

console.log(`\nKončano — v registru je ${poslanih} subjektov.`);
