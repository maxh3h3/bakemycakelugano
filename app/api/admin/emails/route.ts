import { NextResponse } from 'next/server';
import { requireAdminRole } from '@/lib/auth/require-admin-role';
import { supabaseAdmin } from '@/lib/supabase/server';

const BAKERY_EMAIL = process.env.BAKERY_OWNER_EMAIL || 'info@bakemycakelugano.ch';

export async function GET() {
  const auth = await requireAdminRole(['owner']);
  if (auth instanceof NextResponse) return auth;

  const { data, error } = await (supabaseAdmin as any)
    .from('order_emails')
    .select('id, direction, from_email, to_email, subject, body_text, email_date, order_id')
    .order('email_date', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Group by contact email (the non-bakery side of each email)
  const threadMap = new Map<string, {
    contact: string;
    latestSubject: string;
    latestDate: string;
    preview: string;
    count: number;
    linkedOrderId: string | null;
  }>();

  for (const email of data || []) {
    const contact = email.direction === 'inbound' ? email.from_email : email.to_email;
    if (!contact || contact.toLowerCase() === BAKERY_EMAIL.toLowerCase()) continue;

    if (!threadMap.has(contact)) {
      threadMap.set(contact, {
        contact,
        latestSubject: email.subject || '(no subject)',
        latestDate: email.email_date,
        preview: (email.body_text || '').slice(0, 100).replace(/\s+/g, ' '),
        count: 1,
        linkedOrderId: email.order_id,
      });
    } else {
      threadMap.get(contact)!.count++;
      if (!threadMap.get(contact)!.linkedOrderId && email.order_id) {
        threadMap.get(contact)!.linkedOrderId = email.order_id;
      }
    }
  }

  const threads = Array.from(threadMap.values());
  return NextResponse.json({ threads });
}
