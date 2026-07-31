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
