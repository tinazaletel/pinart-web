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
    };

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-inbound-secret': inboundSecret,
      },
      body: JSON.stringify(payload),
    });

    /* 404 = neznan token (projekt nima inboxa): zavrni, da posiljatelj ve.
       Ostale napake tiho pustimo (mail se ne izgubi v CF logu). */
    if (res.status === 404) {
      message.setReject('Projekt ni najden.');
    }
  },
};
