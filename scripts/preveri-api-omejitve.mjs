const base = process.env.RATE_LIMIT_TEST_BASE_URL;
const cookie = process.env.RATE_LIMIT_TEST_COOKIE;

if (!base || !cookie) {
  console.error('Nastavi RATE_LIMIT_TEST_BASE_URL in RATE_LIMIT_TEST_COOKIE.');
  process.exit(2);
}

let status = 0;
for (let i = 0; i < 12; i += 1) {
  const response = await fetch(`${base.replace(/\/$/, '')}/api/posta`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie },
    body: JSON.stringify({}),
  });
  status = response.status;
  if (status === 429) break;
}

if (status !== 429) {
  console.error(`FAIL: pričakovan 429, zadnji status ${status}.`);
  process.exit(1);
}
console.log('PASS: omejitev je vrnila 429.');
