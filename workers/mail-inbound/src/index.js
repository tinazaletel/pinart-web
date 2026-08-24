/* Cloudflare Email Worker — DOHODNA posta za Pinart Flow.
 *
 * Ujame mail poslan na <token>@pinartflow.com (catch-all), izlusci token iz
 * prejemnikovega naslova, razclenit telo (postal-mime) in POST-a na Flow
 * endpoint /api/posta/prejeto s skupno skrivnostjo v glavi.
 *
 * Endpoint nato po tokenu poisce projekt (project_inbox) in zapise mail v
 * project_mail (direction='in'). Glej app/api/posta/prejeto/route.ts.
 *
 * Nastavitve (Cloudflare -> Worker -> Settings -> Variables):
 *   - INBOUND_SECRET   (Secret) — ISTA vrednost kot v Vercel env
 *   - FLOW_INBOUND_URL  (Var)   — npr. https://pinartflow.com/api/posta/prejeto
 */

import PostalMime from 'postal-mime';

/* Priloge: metapodatke posljemo VEDNO, vsebino pa samo dokler telo zahtevka
   ostane pod mejo (Vercel serverless sprejme ~4,5 MB). Kar je prevelko, gre
   naprej brez vsebine — Flow tak zapis pokaze kot "ni shranjena". Tiho
   izginjanje je najhujse: raje vemo, da je priloga bila. */
const NAJVEC_PRILOG = 5;
const NAJVEC_SKUPAJ_BASE64 = 3_200_000;
const PREPOVEDANE = ['exe', 'bat', 'cmd', 'sh', 'js', 'msi'];

function base64(buffer) {
  const bajti = new Uint8Array(buffer);
  let niz = '';
  for (let i = 0; i < bajti.length; i += 0x8000) {
    niz += String.fromCharCode.apply(null, bajti.subarray(i, i + 0x8000));
  }
  return btoa(niz);
}

function pripraviPriloge(parsed) {
  const vhod = Array.isArray(parsed && parsed.attachments) ? parsed.attachments.slice(0, NAJVEC_PRILOG) : [];
  const izhod = [];
  let skupaj = 0;
  for (const p of vhod) {
    const ime = String(p.filename || 'priponka').split(/[\\/]/).pop().slice(0, 180);
    const koncnica = (ime.split('.').pop() || '').toLowerCase();
    /* postal-mime vrne content kot ArrayBuffer, Uint8Array ali ze base64 niz —
       pokrijemo vse tri, sicer bi se priloga tiho izgubila. */
    let kodirano = '';
    let velikost = Number(p.size || 0);
    try {
      if (typeof p.content === 'string') {
        kodirano = p.content;
        velikost = Math.floor((kodirano.length * 3) / 4);
      } else if (p.content instanceof ArrayBuffer) {
        kodirano = base64(p.content);
        velikost = p.content.byteLength;
      } else if (p.content && p.content.buffer) {
        kodirano = base64(p.content.buffer);
        velikost = p.content.byteLength;
      }
    } catch (e) {
      kodirano = '';
    }
    const zapis = { filename: ime, mimeType: String(p.mimeType || '').slice(0, 200), size: velikost };
    /* izvrsljive datoteke ne posiljamo nikoli — samo zapis, da so prisle */
    if (!PREPOVEDANE.includes(koncnica) && kodirano && skupaj + kodirano.length <= NAJVEC_SKUPAJ_BASE64) {
      zapis.content = kodirano;
      skupaj += kodirano.length;
    }
    izhod.push(zapis);
  }
  return izhod;
}

export default {
  async email(message, env) {
    const inboundSecret = env.INBOUND_SECRET;
    const endpoint = env.FLOW_INBOUND_URL;
    if (!inboundSecret || !endpoint) {
      message.setReject('Inbound ni nastavljen.');
      return;
    }

    /* prejemnik = <token>@pinartflow.com -> token je del pred @ */
    const to = String(message.to || '');
    const token = to.split('@')[0].trim();
    if (!/^[a-zA-Z0-9_-]{8,200}$/.test(token)) {
      /* ni nas naslov (npr. splosni info@) — zavrni, da posiljatelj dobi bounce */
      message.setReject('Neznan prejemnik.');
      return;
    }

    /* razclenit surovi mail (text + html + headerji) */
    let parsed = {};
    try {
      const raw = new Response(message.raw);
      parsed = await PostalMime.parse(await raw.arrayBuffer());
    } catch (e) {
      parsed = {};
    }

    const h = message.headers;
    const payload = {
      token,
      from: message.from || (parsed.from && parsed.from.address) || '',
      to,
      subject: parsed.subject || h.get('subject') || '',
      text: parsed.text || '',
      html: parsed.html || '',
      messageId: (parsed.messageId || h.get('message-id') || '').replace(/^<|>$/g, ''),
      inReplyTo: (parsed.inReplyTo || h.get('in-reply-to') || '').replace(/^<|>$/g, ''),
      attachments: pripraviPriloge(parsed),
    };

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-inbound-secret': inboundSecret,
      },
      body: JSON.stringify(payload),
    });

    /* DIAGNOSTIKA: izpiši status + telo odgovora Flow endpointa v CF log. */
    let telo = '';
    try { telo = await res.text(); } catch (e) { telo = '(brez telesa)'; }
    console.log(`Flow endpoint (${endpoint}) token=${token} -> ${res.status} ${telo.slice(0, 300)}`);

    /* 404 = neznan token (projekt nima inboxa): zavrni, da posiljatelj ve.
       Ostale napake tiho pustimo (mail se ne izgubi v CF logu). */
    if (res.status === 404) {
      message.setReject('Projekt ni najden.');
    }
  },
};
