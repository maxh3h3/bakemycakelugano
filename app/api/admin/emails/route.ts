import { NextResponse } from 'next/server';
import { requireAdminRole } from '@/lib/auth/require-admin-role';
import { supabaseAdmin } from '@/lib/supabase/server';
import { clientNamesByEmail } from '@/lib/email/client-names';
import type { EmailThreadSummary } from '@/lib/email/types';

const BAKERY_EMAIL = (process.env.BAKERY_OWNER_EMAIL || 'info@bakemycakelugano.ch').toLowerCase();

// GET /api/admin/emails — one summary per contact, newest first
export async function GET() {
  const auth = await requireAdminRole(['owner']);
  if (auth instanceof NextResponse) return auth;

  // Supabase caps a response at 1000 rows, so page through all of them.
  const PAGE = 1000;
  const data: any[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data: page, error } = await (supabaseAdmin as any)
      .from('order_emails')
      .select('direction, from_email, to_email, subject, body_text, email_date, order_id')
      .is('hidden_at', null)
      .order('email_date', { ascending: false })
      .order('id')
      .range(from, from + PAGE - 1);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    data.push(...page);
    if (page.length < PAGE) break;
  }

  const threads = new Map<string, EmailThreadSummary>();

  for (const email of data) {
    const contact = (email.direction === 'inbound' ? email.from_email : email.to_email)?.toLowerCase();
    if (!contact || contact === BAKERY_EMAIL) continue;

    const existing = threads.get(contact);
    if (!existing) {
      threads.set(contact, {
        contact,
        name: null,
        latestSubject: email.subject || '(без темы)',
        latestDate: email.email_date,
        latestDirection: email.direction,
        awaitingReply: email.direction === 'inbound',
        preview: (email.body_text || '').slice(0, 140).replace(/\s+/g, ' ').trim(),
        count: 1,
        linkedOrderId: email.order_id,
      });
    } else {
      existing.count++;
      existing.linkedOrderId ??= email.order_id;
    }
  }

  const names = await clientNamesByEmail([...threads.keys()]);
  for (const t of threads.values()) t.name = names.get(t.contact) ?? null;

  return NextResponse.json({ threads: [...threads.values()] });
}
