import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRole } from '@/lib/auth/require-admin-role';
import { supabaseAdmin } from '@/lib/supabase/server';

const BAKERY_EMAIL = process.env.BAKERY_OWNER_EMAIL || 'info@bakemycakelugano.ch';

// GET /api/admin/emails/thread?contact=email@addr
export async function GET(request: NextRequest) {
  const auth = await requireAdminRole(['owner']);
  if (auth instanceof NextResponse) return auth;

  const contact = request.nextUrl.searchParams.get('contact');
  if (!contact) return NextResponse.json({ error: 'contact param required' }, { status: 400 });

  const { data, error } = await (supabaseAdmin as any)
    .from('order_emails')
    .select('id, direction, from_email, to_email, subject, body_text, body_html, message_id, in_reply_to, email_date, order_id, attachments')
    .or(`from_email.eq.${contact},to_email.eq.${contact}`)
    .order('email_date', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Also fetch linked order if any email has one
  const linkedOrderId = (data as any[])?.find((e: any) => e.order_id)?.order_id || null;
  let order = null;
  if (linkedOrderId) {
    const { data: orderData } = await supabaseAdmin
      .from('orders')
      .select('id, order_number, delivery_date, total_amount, paid, order_items(*), clients(name, email)')
      .eq('id', linkedOrderId)
      .single();
    order = orderData;
  }

  return NextResponse.json({ emails: data || [], order, contact });
}
