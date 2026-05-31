import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRole } from '@/lib/auth/require-admin-role';
import { supabaseAdmin } from '@/lib/supabase/server';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const auth = await requireAdminRole(['owner']);
  if (auth instanceof NextResponse) return auth;

  const { orderId } = await params;

  const [emailsRes, orderRes] = await Promise.all([
    supabaseAdmin
      .from('order_emails')
      .select('id, direction, from_email, to_email, subject, body_text, body_html, message_id, in_reply_to, email_date, created_at')
      .eq('order_id', orderId)
      .order('email_date', { ascending: true, nullsFirst: false }),
    supabaseAdmin
      .from('orders')
      .select('*, order_items(*), clients(*)')
      .eq('id', orderId)
      .single(),
  ]);

  if (emailsRes.error) return NextResponse.json({ error: emailsRes.error.message }, { status: 500 });
  if (orderRes.error) return NextResponse.json({ error: orderRes.error.message }, { status: 500 });

  return NextResponse.json({ emails: emailsRes.data, order: orderRes.data });
}
