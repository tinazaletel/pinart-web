#!/usr/bin/env node
/*
  Pinart Flow — ročni launch varnostni testi (#11).

  Priprava:
  1. Uporabi TESTNI Supabase projekt z že izvedenimi migracijami.
  2. Pripravi ownerja organizacije A, memberja iste organizacije in organizacijo B.
  3. V organizaciji A pripravi en osnutek in en že izdan račun.
  4. Lokalno zaženi aplikacijo. Za API testa kopiraj celoten `Cookie` header iz
     prijavljene owner seje (DevTools > Network) v SECURITY_TEST_COOKIE.

  Zagon:
    SECURITY_TEST_SUPABASE_URL=... \
    SECURITY_TEST_SUPABASE_KEY=... \
    SECURITY_TEST_OWNER_EMAIL=... SECURITY_TEST_OWNER_PASSWORD=... \
    SECURITY_TEST_MEMBER_EMAIL=... SECURITY_TEST_MEMBER_PASSWORD=... \
    SECURITY_TEST_ORG_A_ID=... \
    SECURITY_TEST_ORG_B_ID=... \
    SECURITY_TEST_DRAFT_INVOICE_ID=... \
    SECURITY_TEST_ISSUED_INVOICE_ID=... \
    SECURITY_TEST_COOKIE='...' \
    SECURITY_TEST_APP_URL=http://localhost:3456 \
    node lib/varnostniTesti.mjs

  Organizacija A mora imeti aktiven paket Pro. Lokalni strežnik in ta skripta
  morata uporabljati isti AI_RATE_LIMIT_SALT in PUPA_RATE_LIMIT; strežnik mora
  imeti nastavljen tudi ANTHROPIC_API_KEY (lahko testni, ker klic zaradi 429 ne
  pride do ponudnika). Testi ne pošiljajo e-pošte in ne kličejo Anthropic.
  Številčenje porabi dve zaporedni številki v TESTNI organizaciji; zato skripte
  ne poganjaj v produkciji.
*/

import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { mergeByUpdatedAt } from './mergeByUpdatedAt.ts';

const required = [
  'SECURITY_TEST_SUPABASE_URL', 'SECURITY_TEST_SUPABASE_KEY',
  'SECURITY_TEST_OWNER_EMAIL', 'SECURITY_TEST_OWNER_PASSWORD',
  'SECURITY_TEST_MEMBER_EMAIL', 'SECURITY_TEST_MEMBER_PASSWORD',
  'SECURITY_TEST_ORG_A_ID', 'SECURITY_TEST_ORG_B_ID',
  'SECURITY_TEST_DRAFT_INVOICE_ID',
  'SECURITY_TEST_ISSUED_INVOICE_ID', 'SECURITY_TEST_COOKIE',
  'AI_RATE_LIMIT_SALT',
];

if (process.argv.includes('--help')) {
  console.log('Navodila in zahtevane spremenljivke so zapisane na vrhu lib/varnostniTesti.mjs.');
  process.exit(0);
}

const missing = required.filter(name => !process.env[name]);
if (missing.length) {
  console.error(`FAIL · Manjkajo spremenljivke: ${missing.join(', ')}`);
  process.exit(2);
}

const supabaseUrl = process.env.SECURITY_TEST_SUPABASE_URL.replace(/\/$/, '');
const supabaseKey = process.env.SECURITY_TEST_SUPABASE_KEY;
const appUrl = (process.env.SECURITY_TEST_APP_URL || 'http://localhost:3456').replace(/\/$/, '');
const cookie = process.env.SECURITY_TEST_COOKIE;

async function login(email, password) {
  const response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: supabaseKey, 'content-type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const body = await response.json();
  assert.equal(response.ok, true, `Prijava ${email} ni uspela: ${JSON.stringify(body)}`);
  return body.access_token;
}

function db(token, path, init = {}) {
  return fetch(`${supabaseUrl}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: supabaseKey,
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
      prefer: 'return=representation',
      ...(init.headers || {}),
    },
  });
}

async function json(response) {
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

const checks = [];
async function check(name, fn) {
  try {
    await fn();
    checks.push({ name, ok: true });
    console.log(`PASS · ${name}`);
  } catch (error) {
    checks.push({ name, ok: false });
    console.error(`FAIL · ${name}\n       ${error instanceof Error ? error.message : error}`);
  }
}

const ownerToken = await login(process.env.SECURITY_TEST_OWNER_EMAIL, process.env.SECURITY_TEST_OWNER_PASSWORD);
const memberToken = await login(process.env.SECURITY_TEST_MEMBER_EMAIL, process.env.SECURITY_TEST_MEMBER_PASSWORD);

await check('1/8 Organizacija A ne vidi računov organizacije B', async () => {
  const response = await db(memberToken, `invoices?organization_id=eq.${process.env.SECURITY_TEST_ORG_B_ID}&select=id`);
  assert.equal(response.ok, true);
  assert.deepEqual(await json(response), []);
});

await check('2/8 Član ne more izdati ali izbrisati računa', async () => {
  const issue = await db(memberToken, `invoices?id=eq.${process.env.SECURITY_TEST_DRAFT_INVOICE_ID}`, {
    method: 'PATCH', body: JSON.stringify({ issued_at: new Date().toISOString() }),
  });
  assert.equal(issue.ok, false, 'member je lahko izdal račun');
  const remove = await db(memberToken, `invoices?id=eq.${process.env.SECURITY_TEST_DRAFT_INVOICE_ID}`, { method: 'DELETE' });
  const removedRows = remove.ok ? await json(remove) : [];
  assert.deepEqual(removedRows, [], 'member je lahko izbrisal račun');
  const verify = await db(ownerToken, `invoices?id=eq.${process.env.SECURITY_TEST_DRAFT_INVOICE_ID}&select=id`);
  assert.equal(verify.ok, true);
  assert.equal((await json(verify)).length, 1, 'osnutek je bil dejansko izbrisan');
});

await check('3/8 Dva hkratna klica vrneta različni številki', async () => {
  const call = () => db(ownerToken, 'rpc/dodeli_stevilko', {
    method: 'POST', body: JSON.stringify({ p_vrsta: 'racun' }),
  });
  const responses = await Promise.all([call(), call()]);
  assert.equal(responses.every(response => response.ok), true);
  const numbers = await Promise.all(responses.map(json));
  assert.equal(new Set(numbers.map(String)).size, 2, `podvojeni številki: ${numbers.join(', ')}`);
});

await check('4/8 Vsebine izdanega računa ni mogoče spremeniti', async () => {
  const response = await db(ownerToken, `invoices?id=eq.${process.env.SECURITY_TEST_ISSUED_INVOICE_ID}`, {
    method: 'PATCH', body: JSON.stringify({ title: `NEDOVOLJENO-${randomUUID()}` }),
  });
  assert.equal(response.ok, false, 'vsebinski UPDATE izdanega računa je uspel');
});

await check('5/8 Neprijavljen klic /api/pupa vrne 401', async () => {
  const response = await fetch(`${appUrl}/api/pupa`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ vprasanje: 'test' }),
  });
  assert.equal(response.status, 401);
});

await check('6/8 Prekoračitev AI limita vrne 429', async () => {
  const ip = `198.51.100.${Math.floor(Math.random() * 200) + 1}`;
  const ipHash = createHash('sha256').update(`${process.env.AI_RATE_LIMIT_SALT}:${ip}`).digest('hex');
  const limit = Number(process.env.SECURITY_TEST_PUPA_LIMIT || 30);
  for (let index = 0; index < limit; index += 1) {
    const response = await db(ownerToken, 'rpc/ai_rate_check', {
      method: 'POST',
      body: JSON.stringify({
        p_organization_id: process.env.SECURITY_TEST_ORG_A_ID,
        p_ip_hash: ipHash, p_limit: limit, p_window_seconds: 3600,
        p_request_id: randomUUID(), p_model: 'security-selftest',
      }),
    });
    assert.equal(response.ok, true);
    assert.equal(await json(response), true);
  }
  const response = await fetch(`${appUrl}/api/pupa`, {
    method: 'POST',
    headers: { cookie, 'content-type': 'application/json', 'x-forwarded-for': ip },
    body: JSON.stringify({ vprasanje: 'Varnostni test limita.' }),
  });
  assert.equal(response.status, 429);
});

await check('7/8 Demo ne pošlje e-pošte in ne ustvari dnevniškega zapisa', async () => {
  const beforeResponse = await db(ownerToken, 'mail_log?select=id');
  assert.equal(beforeResponse.ok, true);
  const before = await json(beforeResponse);
  const response = await fetch(`${appUrl}/api/posta`, {
    method: 'POST', headers: { cookie, 'content-type': 'application/json' },
    body: JSON.stringify({
      demo: true, to: 'security-test@example.invalid', subject: 'NE POŠLJI',
      html: '<p>NE POŠLJI</p>', idempotencyKey: `demo-${randomUUID()}`,
    }),
  });
  assert.equal(response.status, 403);
  const afterResponse = await db(ownerToken, 'mail_log?select=id');
  assert.equal(afterResponse.ok, true);
  const after = await json(afterResponse);
  assert.equal(after.length, before.length, 'demo je ustvaril mail_log zapis');
});

await check('8/8 Stara naprava ne povozi novejšega zapisa', async () => {
  const newer = { id: 'isti', title: 'novo', updatedAt: '2026-08-10T12:00:00.000Z' };
  const stale = { id: 'isti', title: 'staro', updatedAt: '2026-08-09T12:00:00.000Z' };
  assert.deepEqual(mergeByUpdatedAt([newer], [stale]), [newer]);
  assert.deepEqual(mergeByUpdatedAt([stale], [newer]), [newer]);
  const cloudTombstone = { ...stale, deletedAt: '2026-08-09T13:00:00.000Z' };
  const newerLocal = { ...newer, updatedAt: '2026-08-11T12:00:00.000Z' };
  assert.deepEqual(mergeByUpdatedAt([cloudTombstone], [newerLocal]), [], 'lokalna naprava je obudila oblačni tombstone');
  const localTombstone = { ...stale, deletedAt: '2026-08-09T13:00:00.000Z' };
  assert.deepEqual(mergeByUpdatedAt([newerLocal], [localTombstone]), [], 'oblak je obudil lokalni tombstone');
});

const failed = checks.filter(result => !result.ok).length;
console.log(`\nRezultat: ${checks.length - failed}/${checks.length} PASS`);
process.exitCode = failed ? 1 : 0;
