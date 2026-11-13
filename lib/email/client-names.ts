import { supabaseAdmin } from '@/lib/supabase/server';

/** Lowercased email → client name, for the addresses that belong to known clients. */
export async function clientNamesByEmail(emails: string[]): Promise<Map<string, string>> {
  const names = new Map<string, string>();
  if (emails.length === 0) return names;

  // clients.email is free text with mixed case, and there are only a few hundred
  // rows, so match in memory instead of one case-insensitive query per address.
  const { data } = await (supabaseAdmin as any)
    .from('clients')
    .select('name, email')
    .not('email', 'is', null);

  const wanted = new Set(emails.map(e => e.toLowerCase()));
  for (const c of data ?? []) {
    const email = String(c.email).trim().toLowerCase();
    if (c.name && wanted.has(email) && !names.has(email)) names.set(email, c.name);
  }
  return names;
}
