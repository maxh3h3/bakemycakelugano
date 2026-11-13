import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRole } from '@/lib/auth/require-admin-role';
import { supabaseAdmin } from '@/lib/supabase/server';

// POST /api/admin/emails/link
// Links all unlinked emails for a contact to a newly created order
export async function POST(request: NextRequest) {
  const auth = await requireAdminRole(['owner']);
  if (auth instanceof NextResponse) return auth;

  const { contact: rawContact, orderId } = await request.json();
  const contact = typeof rawContact === 'string' ? rawContact.toLowerCase() : '';
  if (!contact || !orderId) {
    return NextResponse.json({ error: 'contact and orderId required' }, { status: 400 });
  }

  // Update all unlinked, visible emails from/to this contact
  const { count, error } = await (supabaseAdmin as any)
    .from('order_emails')
    .update({ order_id: orderId })
    .or(`from_email.eq.${contact},to_email.eq.${contact}`)
    .is('order_id', null)
    .is('hidden_at', null)
    .select('id', { count: 'exact', head: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ linked: count ?? 0 });
}
