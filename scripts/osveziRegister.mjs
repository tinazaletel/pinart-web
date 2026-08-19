/* OSVEŽITEV REGISTRA PODJETIJ — vse v enem ukazu
 *
 *   node scripts/osveziRegister.mjs
 *
 * Kaj naredi:
 *   1. prenese Poslovni register Slovenije (AJPES prek OPSI) — ime in naslov
 *   2. prenese seznama davčnih zavezancev (FURS) — pravne osebe + s.p.
 *   3. poveže ju po matični številki in zapiše v tabelo public.podjetja
 *   4. zabeleži čas osvežitve v public.register_meta (pregled poslovanja to bere)
 *
 * Oba vira sta odprta podatka pod CC BY 4.0; navedba vira je v vmesniku
 * (components/IskalnikPodjetij).
 *
 * Zakaj ročno in ne samodejno: prenos je ~150 MB in obdelava 294.000 vrstic —
 * to presega, kar zmore ena zahteva na Vercelu. AJPES osveži register dvakrat
 * mesečno, zato je ročni zagon dvakrat na mesec povsem dovolj.
 *
 * Ključ SUPABASE_SERVICE_ROLE_KEY prebere iz okolja ali .env.local in ga
 * nikoli ne izpiše.
 */

import { readFileSync, existsSync, writeFileSync, mkdtempSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createClient } from '@supabase/supabase-js';

const VIR_AJPES = 'https://podatki.gov.si/dataset/9ee1a9aa-c224-4995-b2ad-3760d7af0748/resource/beb70929-3d0d-41c6-9af2-25d525d906d3/download/opsiprs.csv';
const VIR_FURS_PO = 'https://www.fu.gov.si/fileadmin/prenosi/DURS_zavezanci_PO_csv.zip';
const VIR_FURS_DEJ = 'https://www.fu.gov.si/fileadmin/prenosi/DURS_zavezanci_DEJ_csv.zip';

function izOkolja(ime) {
  if (process.env[ime]) return process.env[ime];
  if (!existsSync('.env.local')) return undefined;
  for (const vrstica of readFileSync('.env.local', 'utf8').split('\n')) {
    const e = vrstica.indexOf('=');
    if (e === -1 || vrstica.slice(0, e).trim() !== ime) continue;
    return vrstica.slice(e + 1).trim().replace(/^["']|["']$/g, '');
  }
  return undefined;
}

const url = izOkolja('NEXT_PUBLIC_SUPABASE_URL');
const kljuc = izOkolja('SUPABASE_SERVICE_ROLE_KEY');
if (!url || !kljuc) {
  console.error('Manjka NEXT_PUBLIC_SUPABASE_URL ali SUPABASE_SERVICE_ROLE_KEY (okolje ali .env.local).');
  process.exit(1);
}

const mapa = mkdtempSync(join(tmpdir(), 'pinart-register-'));
const korak = (n, besedilo) => console.log(`\n[${n}/4] ${besedilo}`);

async function prenesi(naslov, ime) {
  const res = await fetch(naslov);
  if (!res.ok) throw new Error(`Prenos ni uspel (${res.status}): ${naslov}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const pot = join(mapa, ime);
  writeFileSync(pot, buf);
  console.log(`    ${ime} — ${(buf.length / 1048576).toFixed(1)} MB`);
  return pot;
}

/* CSV bralec, ki spoštuje narekovaje — imena podjetij so polna vejic. */
function razcleni(vrstica, locilo) {
  const polja = [];
  let t = '', vNar = false;
  for (let i = 0; i < vrstica.length; i += 1) {
    const z = vrstica[i];
    if (z === '"') {
      if (vNar && vrstica[i + 1] === '"') { t += '"'; i += 1; } else vNar = !vNar;
    } else if (z === locilo && !vNar) { polja.push(t); t = ''; }
    else t += z;
  }
  polja.push(t);
  return polja;
}

const brezSumnikov = s => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

// ── 1. AJPES ────────────────────────────────────────────────────────────────
korak(1, 'Prenašam Poslovni register (AJPES) …');
const potPrs = await prenesi(VIR_AJPES, 'opsiprs.csv');
/* datoteka je v UTF-16LE z BOM — Node jo dekodira sam, BOM odrežemo */
const prsText = readFileSync(potPrs).toString('utf16le').replace(/^\ufeff/, '');

// ── 2. FURS ─────────────────────────────────────────────────────────────────
korak(2, 'Prenašam sezname davčnih zavezancev (FURS) …');
const potPo = await prenesi(VIR_FURS_PO, 'po.zip');
const potDej = await prenesi(VIR_FURS_DEJ, 'dej.zip');
execFileSync('unzip', ['-o', '-q', potPo, '-d', join(mapa, 'po')]);
execFileSync('unzip', ['-o', '-q', potDej, '-d', join(mapa, 'dej')]);

const davcne = new Map();   // maticna -> { davcna, ddv }
function beriFurs(pot, stolpecDavcna, stolpecMaticna, stolpecDdv) {
  const vrstice = readFileSync(pot, 'utf8').replace(/^\ufeff/, '').split('\n');
  vrstice.shift();
  for (const v of vrstice) {
    if (!v.trim()) continue;
    const p = razcleni(v, ';');
    const d = (p[stolpecDavcna] || '').trim();
    const m = (p[stolpecMaticna] || '').trim();
    if (!d || !m || davcne.has(m)) continue;
    davcne.set(m, { davcna: d, ddv: stolpecDdv === null ? true : (p[stolpecDdv] || '').trim() === '*' });
  }
}
beriFurs(join(mapa, 'po', 'DURS_zavezanci_PO.csv'), 2, 3, 1);
beriFurs(join(mapa, 'dej', 'DURS_zavezanci_DEJ.csv'), 0, 1, null);
console.log(`    davčnih številk: ${davcne.size}`);

// ── 3. Sestavi in pošlji ────────────────────────────────────────────────────
korak(3, 'Sestavljam in pošiljam v bazo …');
const supabase = createClient(url, kljuc, { auth: { persistSession: false } });

const prsVrstice = prsText.split('\n');
prsVrstice.shift();
let svezenj = [], poslanih = 0, zDavcno = 0;

async function posljiSvezenj() {
  if (!svezenj.length) return;
  const { error } = await supabase.from('podjetja').upsert(svezenj, { onConflict: 'maticna' });
  if (error) { console.error('\nNapaka:', error.message); process.exit(1); }
  poslanih += svezenj.length;
  process.stdout.write(`\r    poslano: ${poslanih}`);
  svezenj = [];
}

for (const vrstica of prsVrstice) {
  if (!vrstica.trim()) continue;
  const p = razcleni(vrstica.replace(/\r$/, ''), ',');
  const [maticna, ime, , oblika, , ulica, hisna, dodatek, naselje, postaSt, posta] = p;
  const m = (maticna || '').trim();
  const i = (ime || '').trim();
  if (!m || !i) continue;

  const u = (ulica || '').trim();
  const st = ((hisna || '').trim().replace(/^0+/, '') + (dodatek || '').trim()).trim();
  const naslov = [u, st].filter(Boolean).join(' ') || (naselje || '').trim();

  const d = davcne.get(m);
  if (d) zDavcno += 1;
  svezenj.push({
    maticna: m, ime: i, oblika: (oblika || '').trim(), naslov,
    posta_st: (postaSt || '').trim(), posta: (posta || '').trim(),
    iskalno: brezSumnikov(i),
    davcna: d ? d.davcna : null, ddv: d ? d.ddv : null,
  });
  if (svezenj.length >= 1000) await posljiSvezenj();
}
await posljiSvezenj();

// ── 4. Zabeleži osvežitev ───────────────────────────────────────────────────
korak(4, 'Beležim osvežitev …');
const { error: metaNapaka } = await supabase.from('register_meta').upsert({
  kljuc: 'podjetja',
  osvezeno: new Date().toISOString(),
  stevilo: poslanih,
  opomba: `${zDavcno} z davčno`,
}, { onConflict: 'kljuc' });
if (metaNapaka) console.error('Opozorilo: časa osvežitve ni bilo mogoče zabeležiti —', metaNapaka.message);

console.log(`\n\nKončano: ${poslanih} podjetij, od tega ${zDavcno} z davčno številko.`);
