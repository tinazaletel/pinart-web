#!/usr/bin/env node

/* Primerja deklaracije v migracijah z OpenAPI opisom Supabase REST API-ja.
   Ne izvaja SQL-a ali RPC-jev in kljuca nikoli ne izpise. */
import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';

async function lokalnoOkolje() {
  const vrednosti = {};
  try {
    const vsebina = await readFile(resolve(process.cwd(), '.env.local'), 'utf8');
    for (const vrstica of vsebina.split(/\r?\n/)) {
      const zadetek = vrstica.match(/^\s*(?:export\s+)?([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (!zadetek) continue;
      vrednosti[zadetek[1]] = zadetek[2].replace(/^(['"])(.*)\1$/, '$2');
    }
  } catch { /* okoljske spremenljivke zadoscajo */ }
  return vrednosti;
}

const env = { ...(await lokalnoOkolje()), ...process.env };
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Manjkata NEXT_PUBLIC_SUPABASE_URL ali SUPABASE_SERVICE_ROLE_KEY.');
  process.exitCode = 2;
} else {
  const mapa = resolve(process.cwd(), 'supabase/migrations');
  const datoteke = (await readdir(mapa)).filter(v => v.endsWith('.sql')).sort();
  const iskano = [];
  for (const datoteka of datoteke) {
    const sql = await readFile(resolve(mapa, datoteka), 'utf8');
    for (const m of sql.matchAll(/\bcreate\s+table\s+(?:if\s+not\s+exists\s+)?(?:(?:public)\.)?"?([a-z_][a-z0-9_]*)"?/gi)) iskano.push({ vrsta: 'tabela', ime: m[1], datoteka });
    for (const m of sql.matchAll(/\bcreate\s+(?:or\s+replace\s+)?function\s+(?:(?:public)\.)?"?([a-z_][a-z0-9_]*)"?/gi)) iskano.push({ vrsta: 'funkcija', ime: m[1], datoteka });
  }
  const response = await fetch(`${url.replace(/\/$/, '')}/rest/v1/`, { headers: { apikey: key, Authorization: `Bearer ${key}`, Accept: 'application/openapi+json' } });
  if (!response.ok) throw new Error(`Branje sheme ni uspelo (HTTP ${response.status}).`);
  const schema = await response.json();
  const definicije = new Set(Object.keys(schema.definitions || schema.components?.schemas || {}));
  const poti = new Set(Object.keys(schema.paths || {}));
  const manjkajo = iskano.filter(v => v.vrsta === 'tabela' ? !definicije.has(v.ime) : !poti.has(`/rpc/${v.ime}`));
  if (!manjkajo.length) console.log('Baza vsebuje vse tabele in funkcije, deklarirane v migracijah.');
  else {
    console.log(`Manjka ${manjkajo.length} objektov:`);
    for (const v of manjkajo) console.log(`- ${v.vrsta}: ${v.ime} (${v.datoteka})`);
    process.exitCode = 1;
  }
}
