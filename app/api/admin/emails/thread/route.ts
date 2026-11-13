import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRole } from '@/lib/auth/require-admin-role';
import { supabaseAdmin } from '@/lib/supabase/server';
import { contactInfo } from '@/lib/email/contacts';
import type { EmailThreadDetail } from '@/lib/email/types';

// GET /api/admin/emails/thread?contact=email@addr
// The conversation plus every order of the client behind the address.
export async function GET(request: NextRequest) {
  const auth = await requireAdminRole(['owner']);
  if (auth instanceof NextResponse) return auth;

  const contact = request.nextUrl.searchParams.get('contact')?.toLowerCase();
  if (!contact) return NextResponse.json({ error: 'contact param required' }, { status: 400 });

  const { data, error } = await (supabaseAdmin as any)
    .from('order_emails')
    .select('id, direction, from_email, to_email, subject, body_text, body_html, message_id, in_reply_to, email_date, order_id, attachments')
    .or(`from_email.eq.${contact},to_email.eq.${contact}`)
    .is('hidden_at', null)
    .order('email_date', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const emails = data ?? [];
  const linked = [...new Set(emails.map((e: any) => e.order_id).filter(Boolean))] as string[];

  let info = { name: null as string | null, orders: [] as EmailThreadDetail['orders'] };
  try {
    info = (await contactInfo([contact], { linkedOrderIds: new Map([[contact, linked]]), withItems: true })).get(contact) ?? info;
  } catch (e) {
    console.error('[emails/thread] contact lookup failed:', e);
  }

  const body: EmailThreadDetail = { emails, orders: info.orders, contact, name: info.name };
  return NextResponse.json(body);
}
