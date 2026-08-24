/*
 * Pinart Flow — Cloudflare Email Worker za DOHODNO pošto.
 * ---------------------------------------------------------------------------
 * Ta Worker ujame vsak mail, ki pride na pinartflow.com, ga razčleni in pošlje
 * v Flow (endpoint /api/posta/prejeto), ki ga razvrsti k pravemu projektu prek
 * skritega tokena (= lokalni del naslova: <token>@pinartflow.com).
 *
 * NAMESTITEV (v Cloudflare, ko boš pripravljena — vodim te klik za klikom):
 *   1) Cloudflare > Compute (Workers) > Create > "Hello World" Worker,
 *      poimenuj ga npr. "flow-inbound". Prilepi to kodo, Deploy.
 *   2) Worker > Settings > Variables and Secrets, dodaj:
 *        FLOW_INBOUND_URL = https://<TVOJA-FLOW-DOMENA>/api/posta/prejeto
 *        INBOUND_SECRET   = <dolg naključen niz>  (ISTI kot v Vercel!)
 *        FALLBACK_EMAIL   = tina@pinart.si        (kam preusmeri, če Flow ne sprejme)
 *   3) Email Routing > Routing rules > Catch-all address > Action:
 *        "Send to a Worker" > izberi "flow-inbound". Save.
 *
 * Odvisnost postal-mime Cloudflare samodejno namesti ob Deployu (npm import).
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
    // token = lokalni del naslova prejemnika (pred @), brez morebitnega +detajla
    const to = String(message.to || '').toLowerCase();
    const token = to.split('@')[0].split('+')[0].trim();

    let parsed = {};
    try {
      parsed = await PostalMime.parse(message.raw);
    } catch (_) {
      parsed = {};
    }

    const payload = {
      token,
      from: message.from || (parsed.from && parsed.from.address) || '',
      to,
      subject: parsed.subject || '',
      text: parsed.text || '',
      html: parsed.html || '',
      messageId: parsed.messageId || '',
      inReplyTo: parsed.inReplyTo || '',
      attachments: pripraviPriloge(parsed),
    };

    let ok = false;
    try {
      const res = await fetch(env.FLOW_INBOUND_URL, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-inbound-secret': env.INBOUND_SECRET,
        },
        body: JSON.stringify(payload),
      });
      ok = res.ok;
    } catch (_) {
      ok = false;
    }

    // Če Flow pošte (še) ne sprejme, je NE zavržemo — preusmerimo na rezervni naslov.
    if (!ok && env.FALLBACK_EMAIL) {
      try {
        await message.forward(env.FALLBACK_EMAIL);
      } catch (_) {
        /* tudi forward lahko spodleti, če naslov ni potrjen — takrat pač nič */
      }
    }
  },
};
