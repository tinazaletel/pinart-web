import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { omejiApi } from '@/lib/rate-limit';
import { jeEmail, omejenNiz, preberiJson, sporociloValidacije } from '@/lib/validacija';
import { zagotoviInboxToken } from '@/lib/inboxToken';
import { posiljatelj } from '@/lib/posiljatelj';
import { preberiClanstvo } from '@/lib/clanstvo';
import { NAJVEC_PRIPONK, preveriPriponke, varnoImePriponke, type Priponka } from '@/lib/priponke';
import type { SupabaseClient } from '@supabase/supabase-js';

/* ── Priponke ────────────────────────────────────────────────────────────────
   Odjemalec posilja SAMO poti v Supabase Storage (vsebine nikoli skozi JSON —
   telo zahtevka ostane majhno). Tu jih preverimo se enkrat, ker je zaledje
   vratar: brskalniska preverba je vljudnost, ta pa odloca.

   Zakaj Resendu damo `content` (base64) in ne `path` (URL): vedro
   business-documents je ZASEBNO. `path` bi zahteval javno dosegljiv naslov —
   torej podpisano povezavo, ki bi jo bilo treba izpostaviti zunanjemu servisu
   in ki lahko potece, preden jo Resend prebere. Cel projekt to vedro bere samo
   prek kratkozivih podpisanih povezav v brskalniku (getBusinessDocumentUrl);
   z base64 ta vzorec obdrzimo — datoteka ne zapusti nasega streznika drugace
   kot v samem mailu. */
type ResendPriponka = { filename: string; content: string };

/* Do te velikosti datoteko pripnemo, cez njo posljemo povezavo. Tri megabajte
   so meja, pri kateri filtri se ne postanejo pozorni. */
const PRIPNI_DO_BAJTOV = 3 * 1024 * 1024;

/* Clovesko berljiva velikost za vrstico s povezavo. */
const berljivo = (b: number) => (b >= 1024 * 1024
  ? `${(b / 1024 / 1024).toFixed(1).replace('.', ',')} MB`
  : `${Math.max(1, Math.round(b / 1024))} kB`);

async function pripraviPriponke(
  admin: SupabaseClient,
  organizationId: string,
  surove: unknown,
): Promise<{ napaka?: string; zapisi: Priponka[]; resend: ResendPriponka[] }> {
  const prazno = { zapisi: [] as Priponka[], resend: [] as ResendPriponka[], povezave: [] as { ime: string; url: string; velikost: number }[] };
  if (surove === undefined || surove === null) return prazno;
  if (!Array.isArray(surove)) return { ...prazno, napaka: 'Priponke niso veljavne.' };
  if (!surove.length) return prazno;
  if (surove.length > NAJVEC_PRIPONK) {
    return { ...prazno, napaka: `Največ ${NAJVEC_PRIPONK} priponk na sporočilo.` };
  }

  /* 1) poti: morajo pripadati TEJ organizaciji in ne smejo bezati iz mape */
  const poti: string[] = [];
  for (const el of surove) {
    const pot = String((el as { pot?: unknown })?.pot || '').trim();
    if (!pot || pot.length > 500 || pot.includes('..') || !pot.startsWith(`${organizationId}/`)) {
      return { ...prazno, napaka: 'Priponka ne pripada temu podjetju.' };
    }
    if (poti.includes(pot)) return { ...prazno, napaka: 'Ista priponka je dodana dvakrat.' };
    poti.push(pot);
  }

  /* 2) resnica je BAZA, ne odjemalec: ime, velikost in mime preberemo iz
        document_files, tako da lagana velikost ne pomaga. */
  const { data: vrstice, error } = await admin
    .from('document_files')
    .select('bucket,path,original_name,mime,size_bytes,scan_status,deleted_at')
    .eq('organization_id', organizationId)
    .in('path', poti);
  if (error) return { ...prazno, napaka: 'Priponk ni bilo mogoče prebrati.' };

  const poPoti = new Map((vrstice || []).map((v) => [String(v.path), v]));
  const zapisi: Priponka[] = [];
  for (const pot of poti) {
    const v = poPoti.get(pot);
    if (!v || v.deleted_at) return { ...prazno, napaka: 'Priponka ne obstaja ali je arhivirana.' };
    if (v.scan_status !== 'clean') return { ...prazno, napaka: 'Priponka še ni varnostno potrjena.' };
    zapisi.push({
      ime: varnoImePriponke(String(v.original_name || '')) || 'priponka',
      velikost: Number(v.size_bytes) || 0,
      mime: v.mime ? String(v.mime) : undefined,
      pot,
    });
  }

  /* 3) meje (stevilo, 10 MB na datoteko, 20 MB skupaj) — ista funkcija kot v brskalniku */
  const meje = preveriPriponke(zapisi);
  if (!meje.veljavno) return { ...prazno, napaka: meje.napaka };

  /* 4) Velike datoteke gredo kot POVEZAVA, ne kot priponka.
        9,4 MB PDF z mlade domene je Gmail potisnil v vsiljeno posto — prejemnik
        je trdil, da ni dobil nicesar, Resend pa je porocal "Delivered"
        (Tina + Luka, 2. 9. 2026). Povezava je majhna, dostava je zanesljivejsa,
        datoteka pa je tako ali tako ze v Flowu. */
  const resend: ResendPriponka[] = [];
  const povezave: { ime: string; url: string; velikost: number }[] = [];
  for (const zapis of zapisi) {
    const vedro = String(poPoti.get(zapis.pot!)?.bucket || 'business-documents');
    if (zapis.velikost > PRIPNI_DO_BAJTOV) {
      /* Podpisana povezava, veljavna 30 dni — dovolj, da jo prejemnik odpre,
         in ne toliko, da bi vecno visela na spletu. */
      const { data: podpis } = await admin.storage.from(vedro)
        .createSignedUrl(zapis.pot!, 60 * 60 * 24 * 30);
      if (podpis?.signedUrl) {
        povezave.push({ ime: zapis.ime, url: podpis.signedUrl, velikost: zapis.velikost });
        continue;
      }
      /* Ce podpis ne uspe, raje pripnemo kot da datoteke ne posljemo. */
    }
    const { data, error: prenosNapaka } = await admin.storage.from(vedro).download(zapis.pot!);
    if (prenosNapaka || !data) return { ...prazno, napaka: `Priponke »${zapis.ime}« ni bilo mogoče prebrati.` };
    resend.push({ filename: zapis.ime, content: Buffer.from(await data.arrayBuffer()).toString('base64') });
  }
  return { zapisi, resend, povezave };
}

/* Strežniško pošiljanje e-pošte prek Resend. Ključ RESEND_API_KEY bere SAMO
   strežnik (nikoli klient). "From" naslov nastavi RESEND_FROM (npr.
   "Pinart Flow <racuni@pinart.si>"); dokler domena ni potrjena v Resend,
   se za test uporabi privzeti onboarding@resend.dev (pošlje le lastniku računa).
   Če ključa ni, vrne 503 z jasnim sporočilom — nič se ne zruši. */

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Prijava je potekla.' }, { status: 401 });
  }
  const omejitev = await omejiApi(request, 'posta', 10, user.id);
  if (omejitev) return omejitev;

  const apiKey = process.env.RESEND_API_KEY;
  const from = posiljatelj();

  let body: {
    to?: string | string[];
    subject?: string;
    html?: string;
    replyTo?: string;
    organizationId?: string;
    projectExternalId?: string;
    clientId?: string;
    idempotencyKey?: string;
    demo?: boolean;
    priponke?: unknown;
  };
  try {
    body = await preberiJson(request, 100_000);
  } catch (error) {
    return NextResponse.json({ error: sporociloValidacije(error) }, { status: 400 });
  }

  if (body.demo === true) {
    return NextResponse.json({ error: 'V predstavitvenem načinu pošiljanje ni dovoljeno.' }, { status: 403 });
  }

  const idempotencyKey = String(body.idempotencyKey || '').trim();
  if (!/^[a-zA-Z0-9._:-]{8,200}$/.test(idempotencyKey)) {
    return NextResponse.json({ error: 'Manjka veljaven ključ pošiljanja.' }, { status: 400 });
  }

  const membership = await preberiClanstvo(supabase, body.organizationId || null, user.id);
  const organizationId = membership && !membership.disabled_at ? membership.organization_id : null;
  if (!organizationId) {
    return NextResponse.json({ error: 'Podjetje ni povezano.' }, { status: 403 });
  }

  /* en prejemnik (niz) ali več (polje) — vsak mora biti veljaven e-mail */
  const prejemniki = (Array.isArray(body.to) ? body.to : body.to ? [body.to] : [])
    .map((e) => String(e).trim())
    .filter(Boolean);
  const vsiVeljavni = prejemniki.length > 0 && prejemniki.every(jeEmail);
  if (!vsiVeljavni || !body.subject || !body.html) {
    return NextResponse.json({ error: 'Manjka veljaven prejemnik, zadeva ali vsebina.' }, { status: 400 });
  }
  if (prejemniki.length > 50) {
    return NextResponse.json({ error: 'Preveč prejemnikov (največ 50).' }, { status: 400 });
  }
  if (!omejenNiz(body.subject, 300, true) || !omejenNiz(body.html, 90_000, true)) {
    return NextResponse.json({ error: 'Zadeva ali vsebina ni veljavna.' }, { status: 400 });
  }
  if (body.replyTo && !jeEmail(body.replyTo.trim())) {
    return NextResponse.json({ error: 'Naslov za odgovor ni veljaven.' }, { status: 400 });
  }
  if (body.projectExternalId !== undefined && !omejenNiz(body.projectExternalId, 200, true)) {
    return NextResponse.json({ error: 'Projekt ni veljaven.' }, { status: 400 });
  }
  if (body.clientId !== undefined && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.clientId)) {
    return NextResponse.json({ error: 'Stranka ni veljavna.' }, { status: 400 });
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ error: 'Evidenca pošiljanja ni konfigurirana.' }, { status: 503 });
  }
  if (body.clientId) {
    const { data: client } = await admin
      .from('clients')
      .select('id')
      .eq('id', body.clientId)
      .eq('organization_id', organizationId)
      .maybeSingle();
    if (!client) {
      return NextResponse.json({ error: 'Stranka ni povezana s tem podjetjem.' }, { status: 403 });
    }
  }
  /* Priponke pripravimo PRED prevzemom mail_log zapisa: ce je katera sporna,
     naj se posiljanje ne "zatakne" v stanju pending. */
  const priponke = await pripraviPriponke(admin, organizationId, body.priponke);
  if (priponke.napaka) {
    return NextResponse.json({ error: priponke.napaka }, { status: 400 });
  }

  const { data: existing } = await admin
    .from('mail_log')
    .select('id,status,provider_id')
    .eq('organization_id', organizationId)
    .eq('idempotency_key', idempotencyKey)
    .maybeSingle();
  if (existing?.status === 'sent') {
    return NextResponse.json({ ok: true, id: existing.provider_id, messageId: existing.provider_id, duplicate: true });
  }
  if (existing?.status === 'pending') {
    return NextResponse.json({ error: 'To sporočilo se že pošilja.' }, { status: 409 });
  }

  const logPayload = {
    organization_id: organizationId,
    user_id: user.id,
    idempotency_key: idempotencyKey,
    recipients: prejemniki,
    subject: body.subject.trim(),
    status: 'pending',
    provider_id: null,
    error_code: null,
    updated_at: new Date().toISOString(),
  };
  const { data: claimed, error: claimError } = existing
    ? await admin.from('mail_log').update(logPayload).eq('id', existing.id).eq('status', 'failed').select('id').maybeSingle()
    : await admin.from('mail_log').insert(logPayload).select('id').maybeSingle();
  if (claimError || !claimed) {
    return NextResponse.json({ error: 'To sporočilo se že obdeluje.' }, { status: 409 });
  }

  const zakljuciDnevnik = async (status: 'sent' | 'failed', providerId?: string, errorCode?: string) => {
    await admin.from('mail_log').update({
      status,
      provider_id: providerId || null,
      error_code: errorCode || null,
      updated_at: new Date().toISOString(),
    }).eq('id', claimed.id);
  };
  if (!apiKey) {
    await zakljuciDnevnik('failed', undefined, 'provider_not_configured');
    return NextResponse.json(
      { error: 'Pošiljanje e-pošte še ni nastavljeno (manjka RESEND_API_KEY).' },
      { status: 503 },
    );
  }

  const resend = new Resend(apiKey);
  try {
    const projectExternalId = body.projectExternalId?.trim();
    /* Vsak mail, POSLAN IZ FLOW-a, dobi inbox token za reply-to, da odgovori
       pridejo NAZAJ v Flow (skupna Komunikacija). Projekt je NEOBVEZEN — brez
       njega gre v skupni org nabiralnik ('__skupno__'). NE pobiramo tujih mailov
       iz Gmaila; ujamemo LE odgovore na naše pošte (gredo na token@domeno).
       Če je klicatelj eksplicitno podal replyTo, ga spoštujemo (npr. odvetnik). */
    const projRef = projectExternalId || '__skupno__';
    let replyTo = body.replyTo?.trim();
    let replyRef = ''; /* pod katerim projRef je bil token dejansko ustvarjen (diagnostika) */
    if (!replyTo) {
      /* FAIL-SOFT + FALLBACK: najprej poskusi projektni token; če pade (npr. manjka
         grant ali RLS), pade NAZAJ na skupni '__skupno__' token, ki zanesljivo dela —
         tako odgovori VEDNO pridejo nazaj v Flow (vsaj v skupno Komunikacijo), ne v
         osebni Gmail. Če vse pade, se mail vseeno pošlje (le brez token reply-to). */
      const inboundDomain = (process.env.INBOUND_DOMAIN || 'pinartflow.com').trim().toLowerCase();
      if (/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(inboundDomain)) {
        const kandidati = projRef === '__skupno__' ? ['__skupno__'] : [projRef, '__skupno__'];
        for (const ref of kandidati) {
          try {
            const token = await zagotoviInboxToken(organizationId, ref);
            if (token) { replyTo = `${token}@${inboundDomain}`; replyRef = ref; break; }
          } catch (tokErr) {
            console.error(`Inbox token (${ref}) ni uspel:`, tokErr instanceof Error ? tokErr.message : tokErr);
          }
        }
      }
    }
    console.log(`[posta] send org=${organizationId} projRef=${projRef} replyRef=${replyRef || '-'} replyTo=${replyTo ? replyTo.replace(/@.*/, '@…') : '(brez)'}`);
    const { data, error } = await resend.emails.send({
      from,
      to: prejemniki,
      subject: body.subject,
      html: priponke.povezave.length
        ? `${body.html}<div style="margin-top:22px;padding-top:14px;border-top:1px solid #e4e0ec;font:14px/1.6 system-ui,sans-serif;color:#3a3442">`
          + `<p style="margin:0 0 8px;font-weight:600">Priloge za prenos</p>`
          + priponke.povezave.map(v =>
              `<p style="margin:0 0 6px"><a href="${v.url}" style="color:#6D3BEB">${v.ime}</a>`
              + `<span style="color:#7a7386"> · ${berljivo(v.velikost)}</span></p>`).join('')
          + `<p style="margin:10px 0 0;font-size:12px;color:#7a7386">Povezave veljajo 30 dni.</p></div>`
        : body.html,
      ...(replyTo ? { replyTo } : {}),
      ...(priponke.resend.length ? { attachments: priponke.resend } : {}),
    });
    if (error) {
      await zakljuciDnevnik('failed', undefined, 'provider_rejected');
      console.error('Resend je zavrnil pošiljanje:', error.message || 'neznana napaka');
      return NextResponse.json({ error: 'Pošiljanje ni uspelo.' }, { status: 502 });
    }
    const messageId = data?.id;
    await zakljuciDnevnik('sent', messageId);

    /* Zapiši POSLANO v project_mail (projektni ali skupni), da se prikaže v
       Komunikaciji. Fail-soft: če zapis ne uspe, mail je že poslan — ne rušimo. */
    try {
      const zapis = {
        organization_id: organizationId,
        project_external_id: projRef,
        client_id: body.clientId || null,
        direction: 'out',
        from_email: from,
        to_emails: prejemniki,
        subject: body.subject.trim(),
        body_html: body.html,
        body_text: body.html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim(),
        message_id: messageId,
        occurred_at: new Date().toISOString(),
      };
      let { error: projectMailError } = await admin.from('project_mail').insert({ ...zapis, attachments: priponke.zapisi });
      /* 42703 = stolpca attachments ni: migracija 20260824031000_posta_priponke.sql
         se ni pognana. Mail je ze poslan — zapisimo ga vsaj brez priponk,
         namesto da bi izginil iz Komunikacije. */
      if (projectMailError?.code === '42703') {
        ({ error: projectMailError } = await admin.from('project_mail').insert(zapis));
      }
      if (projectMailError && projectMailError.code !== '23505') {
        console.error('Poslanega maila ni bilo mogoče zapisati:', projectMailError.message);
      }
    } catch (e) {
      console.error('project_mail zapis ni uspel:', e instanceof Error ? e.message : e);
    }

    return NextResponse.json({ ok: true, id: messageId, messageId });
  } catch (error) {
    await zakljuciDnevnik('failed', undefined, 'provider_exception');
    console.error('Pošiljanje e-pošte ni uspelo:', error instanceof Error ? error.message : 'neznana napaka');
    return NextResponse.json({ error: 'Napaka pri pošiljanju e-pošte.' }, { status: 502 });
  }
}
