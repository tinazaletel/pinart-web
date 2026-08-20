import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { omejiApi } from '@/lib/rate-limit';

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

async function kontekst(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ napaka: 'Prijava je potekla.' }, { status: 401 }) };
  const admin = createAdminClient();
  if (!admin) return { error: NextResponse.json({ napaka: 'Nastavitve niso na voljo.' }, { status: 503 }) };
  const { data: member } = await admin.from('organization_members').select('organization_id,role,disabled_at').eq('user_id', user.id).in('role', ['owner', 'admin']).is('disabled_at', null).limit(1).maybeSingle();
  if (!member) return { error: NextResponse.json({ napaka: 'Za to dejanje nimaš dovoljenja.' }, { status: 403 }) };
  const limit = await omejiApi(request, 'povprasevanje-nastavitve', 30, user.id);
  if (limit) return { error: limit };
  return { admin, organizationId: member.organization_id };
}

export async function GET(request: Request) {
  const ctx = await kontekst(request); if ('error' in ctx) return ctx.error;
  const { data } = await ctx.admin.from('organizations').select('name,inquiry_slug').eq('id', ctx.organizationId).single();
  return NextResponse.json({ studio: data?.name, slug: data?.inquiry_slug || '' });
}

export async function PUT(request: Request) {
  const ctx = await kontekst(request); if ('error' in ctx) return ctx.error;
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const slug = typeof body.slug === 'string' ? body.slug.trim().toLowerCase() : '';
  if (!SLUG.test(slug) || slug.length > 80) return NextResponse.json({ napaka: 'Oznaka naj vsebuje samo male črke, številke in vezaje.' }, { status: 400 });
  const { error } = await ctx.admin.from('organizations').update({ inquiry_slug: slug }).eq('id', ctx.organizationId);
  if (error?.code === '23505') return NextResponse.json({ napaka: 'Ta oznaka je že zasedena.' }, { status: 409 });
  if (error) return NextResponse.json({ napaka: 'Oznake ni bilo mogoče shraniti.' }, { status: 500 });
  return NextResponse.json({ slug });
}
