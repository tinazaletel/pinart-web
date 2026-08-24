import { timingSafeEqual } from 'crypto';
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { omejiApi } from '@/lib/rate-limit';
import { preberiJson, sporociloValidacije } from '@/lib/validacija';
import {
  NAJVEC_BAJTOV_DATOTEKA,
  NAJVEC_BAJTOV_SKUPAJ,
  NAJVEC_PRIPONK,
  jePrepovedanaDatoteka,
  varnoImePriponke,
  type Priponka,
} from '@/lib/priponke';
import type { SupabaseClient } from '@supabase/supabase-js';

/* Vedro in sekcija sta ISTA kot pri poslovnih dokumentih (lib/pinartFlowCloud.ts),
   da priponke pristanejo v isti evidenci in jih odpre isti getBusinessDocumentUrl. */
const VEDRO = 'business-documents';
const SEKCIJA = 'mail';

/* Zgornja meja telesa zahtevka. Vercel serverless funkcija sprejme ~4,5 MB,
   zato tu 4 MB — vec ne pride skozi, pa ceprav bi hoteli. Vecje priponke Worker
   poslje BREZ vsebine (samo ime in velikost) in jih zapisemo kot "ni shranjena":
   tiho izginjanje je najhujse. */
const NAJVEC_TELESA = 4_000_000;

type SurovaPriponka = { filename?: unknown; ime?: unknown; mimeType?: unknown; mime?: unknown; size?: unknown; velikost?: unknown; content?: unknown };

/* Kdo je zapisan kot nalagatelj: document_files.uploaded_by je NOT NULL in kaze
   na auth.users, dohodna posta pa nima prijavljenega uporabnika. Vzamemo
   lastnika organizacije (sicer katerega koli aktivnega clana). */
async function lastnikOrganizacije(admin: SupabaseClient, organizationId: string): Promise<string | null> {
  const { data } = await admin
    .from('organization_members')
    .select('user_id,role')
    .eq('organization_id', organizationId)
    .is('disabled_at', null);
  const vrstice = data || [];
  const lastnik = vrstice.find((v) => String(v.role) === 'owner') || vrstice.find((v) => String(v.role) === 'admin') || vrstice[0];
  return lastnik ? String(lastnik.user_id) : null;
}

/* Shrani dohodne priponke v Storage in vrne seznam za zapis na sporocilu.
   Vsaka napaka je MEHKA: priponko zabelezimo brez poti ("ni shranjena"),
   sporocilo pa se vseeno zapise. */
async function shraniDohodnePriponke(
  admin: SupabaseClient,
  organizationId: string,
  sklic: string,
  surove: unknown,
  zdaj: number,
): Promise<Priponka[]> {
  if (!Array.isArray(surove) || !surove.length) return [];
  const uploader = await lastnikOrganizacije(admin, organizationId);
  const izid: Priponka[] = [];
  let skupaj = 0;

  for (const [i, el] of surove.slice(0, NAJVEC_PRIPONK).entries()) {
    const surova = (el || {}) as SurovaPriponka;
    const ime = varnoImePriponke(String(surova.filename ?? surova.ime ?? '')) || `priponka-${i + 1}`;
    const mime = String(surova.mimeType ?? surova.mime ?? '').slice(0, 200) || undefined;
    const napovedana = Number(surova.size ?? surova.velikost ?? 0);
    const vsebina = typeof surova.content === 'string' ? surova.content : '';

    /* Izvrsljive datoteke ne shranimo NIKOLI — zabelezimo le, da so prisle. */
    if (jePrepovedanaDatoteka(ime)) {
      izid.push({ ime, velikost: Number.isFinite(napovedana) && napovedana > 0 ? napovedana : 0, mime });
      continue;
    }

    let bajti: Buffer | null = null;
    if (vsebina) {
      try { bajti = Buffer.from(vsebina, 'base64'); } catch { bajti = null; }
    }
    const velikost = bajti?.byteLength || (Number.isFinite(napovedana) && napovedana > 0 ? napovedana : 0);

    /* Prevelika, prazna ali brez vsebine -> samo zapis, brez datoteke. */
    if (!bajti || !bajti.byteLength || bajti.byteLength > NAJVEC_BAJTOV_DATOTEKA
        || skupaj + bajti.byteLength > NAJVEC_BAJTOV_SKUPAJ || !uploader) {
      izid.push({ ime, velikost, mime });
      continue;
    }

    const pot = `${organizationId}/${SEKCIJA}/${sklic}/${zdaj}-${i}-${ime}`;
    const { error: napakaShrambe } = await admin.storage.from(VEDRO).upload(pot, bajti, {
      upsert: false,
      contentType: mime || 'application/octet-stream',
    });
    if (napakaShrambe) { izid.push({ ime, velikost, mime }); continue; }

    const { error: napakaEvidence } = await admin.from('document_files').insert({
      organization_id: organizationId,
      uploaded_by: uploader,
      bucket: VEDRO,
      path: pot,
      original_name: ime,
      mime: mime || 'application/octet-stream',
      size_bytes: bajti.byteLength,
      section: SEKCIJA,
      external_id: sklic,
      scan_status: 'clean',
    });
    if (napakaEvidence) {
      /* brez evidence povezave ni mogoce podpisati -> datoteko pospravimo za sabo */
      await admin.storage.from(VEDRO).remove([pot]);
      izid.push({ ime, velikost, mime });
      continue;
    }

    skupaj += bajti.byteLength;
    izid.push({ ime, velikost: bajti.byteLength, mime, pot });
  }
  return izid;
}

/* Časovno-varno primerjanje skrivnosti (prepreči timing-uganjanje). */
function enakSkrivniKljuc(received: string, expected: string): boolean {
  const left = Buffer.from(received);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}

/* Sprejem DOHODNE e-pošte (inbound). Cloudflare Email Worker razčleni prispeli
   mail, izlušči token iz prejemnikovega naslova (<token>@pinartflow.com) in
   POST-a sem kot JSON. Tu:
     1) preverimo skupno skrivnost INBOUND_SECRET (glava x-inbound-secret),
     2) po tokenu poiščemo projekt (project_inbox -> organization + project),
     3) zapišemo v project_mail (direction='in') prek service-role odjemalca
        (obide RLS, ker pošiljatelj NI prijavljen uporabnik).
   De-dup po (organization_id, message_id) ureja unikatni indeks — podvojen
   webhook (23505) tiho preskočimo. Nič se ne zruši, če manjkajo env ključi. */

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const secret = process.env.INBOUND_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'Sprejem pošte še ni nastavljen (manjka INBOUND_SECRET).' }, { status: 503 });
  }
  if (!enakSkrivniKljuc(request.headers.get('x-inbound-secret') || '', secret)) {
    return NextResponse.json({ error: 'Neavtorizirano.' }, { status: 401 });
  }
  const omejitev = await omejiApi(request, 'posta-prejeto', 60);
  if (omejitev) return omejitev;

  let b: {
    token?: string; from?: string; to?: string; subject?: string;
    text?: string; html?: string; messageId?: string; inReplyTo?: string;
    attachments?: unknown;
  };
  try {
    b = await preberiJson(request, NAJVEC_TELESA);
  } catch (error) {
    return NextResponse.json({ error: sporociloValidacije(error) }, { status: 400 });
  }

  const token = String(b.token || '').trim();
  if (!/^[a-zA-Z0-9_-]{8,200}$/.test(token)) return NextResponse.json({ error: 'Token ni veljaven.' }, { status: 400 });

  const supabase = createAdminClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Baza ni nastavljena (manjka SUPABASE_SERVICE_ROLE_KEY).' }, { status: 503 });
  }

  /* token -> projekt */
  const { data: inbox, error: inboxErr } = await supabase
    .from('project_inbox')
    .select('organization_id, project_external_id')
    .eq('token', token)
    .maybeSingle();
  if (inboxErr) return NextResponse.json({ error: 'Napaka baze.' }, { status: 500 });
  if (!inbox) return NextResponse.json({ error: 'Neznan token.' }, { status: 404 });

  const text = String(b.text || '').slice(0, 80_000);
  const summary = text.replace(/\s+/g, ' ').trim().slice(0, 140);

  /* Sklic zdruzi priponke enega dohodnega maila v isto mapo. Cas je tu sluzben
     podatek streznika (ne render), zato je new Date() v redu. */
  const zdaj = Date.now();
  const sklic = (String(b.messageId || '').replace(/[^a-zA-Z0-9_-]+/g, '').slice(0, 40) || `prejeto-${zdaj}`);
  const priponke = await shraniDohodnePriponke(supabase, String(inbox.organization_id), sklic, b.attachments, zdaj);

  const zapis = {
    organization_id: inbox.organization_id,
    project_external_id: inbox.project_external_id,
    direction: 'in',
    from_email: String(b.from || '').slice(0, 320) || null,
    to_emails: b.to ? [String(b.to).slice(0, 320)] : [],
    subject: String(b.subject || '').slice(0, 300) || null,
    body_text: text || null,
    body_html: String(b.html || '').slice(0, 80_000) || null,
    summary: summary || null,
    message_id: String(b.messageId || '').slice(0, 500) || null,
    in_reply_to: String(b.inReplyTo || '').slice(0, 500) || null,
  };

  let { error: insErr } = await supabase.from('project_mail').insert({ ...zapis, attachments: priponke });
  /* 42703 = stolpca attachments ni (migracija 20260824031000_posta_priponke.sql
     se ni pognana): raje zapisimo mail brez priponk, kot da ga zavrnemo. */
  if (insErr?.code === '42703') {
    ({ error: insErr } = await supabase.from('project_mail').insert(zapis));
  }

  /* 23505 = podvojen (organization_id, message_id): mail že imamo, tiho OK */
  if (insErr && insErr.code !== '23505') {
    return NextResponse.json({ error: 'Zapis ni uspel.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
