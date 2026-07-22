import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Strežniški odjemalec s service-role ključem. Obide RLS, zato ga sme
 * uporabljati SAMO koda v `app/api/**` in strežniške strani — nikoli
 * komponenta z 'use client'.
 *
 * Ključ je v `SUPABASE_SERVICE_ROLE_KEY` in NE sme imeti predpone
 * NEXT_PUBLIC_ (ta se vgradi v svežnj, ki ga dobi brskalnik).
 *
 * Vrne null, dokler ključ ni nastavljen — klicatelji naj se v tem primeru
 * obnašajo, kot da analitike ni: nič se ne zruši, samo ne zapiše se.
 */
export function createAdminClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createSupabaseClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
