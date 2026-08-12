import { randomBytes } from 'node:crypto';
import { createAdminClient } from '@/utils/supabase/admin';

/** Strežniško zagotovi stabilen inbound token za projekt. */
export async function zagotoviInboxToken(
  organizationId: string,
  projectExternalId: string,
): Promise<string> {
  const admin = createAdminClient();
  if (!admin) throw new Error('Service-role odjemalec ni konfiguriran.');
  const poisci = () => admin
    .from('project_inbox')
    .select('token')
    .eq('organization_id', organizationId)
    .eq('project_external_id', projectExternalId)
    .limit(1)
    .maybeSingle();

  const { data: obstojeci, error: searchError } = await poisci();
  if (searchError) throw new Error(`Inbox tokena ni bilo mogoče poiskati: ${searchError.message}`);
  if (obstojeci?.token) return String(obstojeci.token);

  for (let poskus = 0; poskus < 3; poskus += 1) {
    const token = `p${randomBytes(6).toString('hex')}`;
    const { data, error } = await admin
      .from('project_inbox')
      .insert({
        organization_id: organizationId,
        project_external_id: projectExternalId,
        token,
      })
      .select('token')
      .single();
    if (!error && data?.token) return String(data.token);

    if (error?.code === '23505') {
      const { data: ustvarjenVzporedno } = await poisci();
      if (ustvarjenVzporedno?.token) return String(ustvarjenVzporedno.token);
      continue;
    }
    throw new Error(`Inbox tokena ni bilo mogoče ustvariti: ${error?.message || 'neznana napaka'}`);
  }

  throw new Error('Inbox tokena ni bilo mogoče ustvariti.');
}
