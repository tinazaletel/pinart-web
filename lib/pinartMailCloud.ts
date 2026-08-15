import { createClient } from '@/utils/supabase/client';
import { getOrganizationContext } from '@/lib/pinartFlowCloud';

/* Projektna posta v oblaku (tabela project_mail + project_inbox).
   Oblacni ekvivalent lib/postaDnevnik.ts — poslano (zdaj) in prejeto (korak 2).
   Vse funkcije tiho vrnejo (ali []) brez prijave/tabele -> degradira na lokalno. */

export type ProjectMail = {
  id?: string;
  projectExternalId: string;
  clientId?: string;
  direction: 'out' | 'in';
  fromEmail?: string;
  toEmails: string[];
  subject?: string;
  bodyText?: string;
  bodyHtml?: string;
  summary?: string;
  messageId?: string;
  inReplyTo?: string;
  occurredAt?: string;
  isDraft?: boolean;
  deletedAt?: string;
};

const fromRow = (row: Record<string, unknown>): ProjectMail => ({
  id: String(row.id),
  projectExternalId: String(row.project_external_id),
  clientId: row.client_id ? String(row.client_id) : undefined,
  direction: row.direction === 'in' ? 'in' : 'out',
  fromEmail: row.from_email ? String(row.from_email) : undefined,
  toEmails: Array.isArray(row.to_emails) ? row.to_emails.map(String) : [],
  subject: row.subject ? String(row.subject) : undefined,
  bodyText: row.body_text ? String(row.body_text) : undefined,
  bodyHtml: row.body_html ? String(row.body_html) : undefined,
  summary: row.summary ? String(row.summary) : undefined,
  messageId: row.message_id ? String(row.message_id) : undefined,
  inReplyTo: row.in_reply_to ? String(row.in_reply_to) : undefined,
  occurredAt: row.occurred_at ? String(row.occurred_at) : undefined,
  isDraft: row.is_draft === true,
  deletedAt: row.deleted_at ? String(row.deleted_at) : undefined,
});

/* Vsa posta enega projekta, najnovejsa prva. [] brez prijave/tabele. */
export async function pullProjectMail(projectExternalId: string): Promise<ProjectMail[]> {
  const context = await getOrganizationContext();
  if (!context) return [];
  const { data, error } = await createClient()
    .from('project_mail')
    .select('*')
    .eq('organization_id', context.organizationId)
    .eq('project_external_id', projectExternalId)
    .order('occurred_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(fromRow);
}

/* VSA posta organizacije (vsi projekti), najnovejsa prva. Za osrednji hub
   (Komunikacije), da se prikaze tudi DOHODNA (odgovori strank). [] brez prijave. */
export async function pullAllMail(): Promise<ProjectMail[]> {
  const context = await getOrganizationContext();
  if (!context) return [];
  const { data, error } = await createClient()
    .from('project_mail')
    .select('*')
    .eq('organization_id', context.organizationId)
    .order('occurred_at', { ascending: false })
    .limit(500);
  if (error) throw error;
  return (data || []).map(fromRow);
}

/* Zabelezi eno posto (poslano zdaj; prejeto doda webhook v koraku 2). */
export async function pushProjectMail(entry: ProjectMail): Promise<void> {
  const context = await getOrganizationContext();
  if (!context) return;
  const { error } = await createClient().from('project_mail').insert({
    organization_id: context.organizationId,
    project_external_id: entry.projectExternalId,
    client_id: entry.clientId || null,
    direction: entry.direction,
    from_email: entry.fromEmail || null,
    to_emails: entry.toEmails,
    subject: entry.subject || null,
    body_text: entry.bodyText || null,
    body_html: entry.bodyHtml || null,
    summary: entry.summary || null,
    message_id: entry.messageId || null,
    in_reply_to: entry.inReplyTo || null,
    occurred_at: entry.occurredAt || new Date().toISOString(),
  });
  if (error) throw error;
}

/* Skriti projektni inbound naslov (token). Vrne obstojecega ali ustvari novega.
   Uporabi se kot reply-to ob posiljanju, da odgovori strank padejo v projekt. */
export async function ensureProjectInboxToken(projectExternalId: string): Promise<string | null> {
  const context = await getOrganizationContext();
  if (!context) return null;
  const supabase = createClient();
  const { data: obstojeci, error: readError } = await supabase
    .from('project_inbox')
    .select('token')
    .eq('organization_id', context.organizationId)
    .eq('project_external_id', projectExternalId)
    .maybeSingle();
  if (readError) throw readError;
  if (obstojeci?.token) return String(obstojeci.token);
  const token = `p${(typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : '').replace(/-/g, '').slice(0, 12)}`;
  const { error: insertError } = await supabase.from('project_inbox').insert({
    organization_id: context.organizationId,
    project_external_id: projectExternalId,
    token,
  });
  if (insertError) throw insertError;
  return token;
}

/* Osnutek: shrani/posodobi (is_draft=true). id je odjemalčev uuid, da ga posodabljamo. */
export async function saveDraft(entry: ProjectMail & { id: string }): Promise<void> {
  const context = await getOrganizationContext();
  if (!context) return;
  const { error } = await createClient().from('project_mail').upsert({
    id: entry.id,
    organization_id: context.organizationId,
    project_external_id: entry.projectExternalId,
    client_id: entry.clientId || null,
    direction: 'out',
    is_draft: true,
    deleted_at: null,
    from_email: entry.fromEmail || null,
    to_emails: entry.toEmails,
    subject: entry.subject || null,
    body_html: entry.bodyHtml || null,
    body_text: entry.bodyText || null,
    occurred_at: entry.occurredAt || new Date().toISOString(),
  });
  if (error) throw error;
}

/* Premakni v koš (soft-delete). */
export async function trashProjectMail(id: string): Promise<void> {
  const context = await getOrganizationContext();
  if (!context) return;
  const { error } = await createClient().from('project_mail').update({ deleted_at: new Date().toISOString() }).eq('id', id).eq('organization_id', context.organizationId);
  if (error) throw error;
}

/* Obnovi iz koša. */
export async function restoreProjectMail(id: string): Promise<void> {
  const context = await getOrganizationContext();
  if (!context) return;
  const { error } = await createClient().from('project_mail').update({ deleted_at: null }).eq('id', id).eq('organization_id', context.organizationId);
  if (error) throw error;
}

/* Trajno izbriši. */
export async function deleteProjectMailPermanent(id: string): Promise<void> {
  const context = await getOrganizationContext();
  if (!context) return;
  const { error } = await createClient().from('project_mail').delete().eq('id', id).eq('organization_id', context.organizationId);
  if (error) throw error;
}
