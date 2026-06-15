import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRole } from '@/lib/auth/require-admin-role';
import { supabaseAdmin } from '@/lib/supabase/server';

// DELETE /api/admin/emails/thread/delete?contact=email@addr
export async function DELETE(request: NextRequest) {
  const auth = await requireAdminRole(['owner']);
  if (auth instanceof NextResponse) return auth;

  const contact = request.nextUrl.searchParams.get('contact');
  if (!contact) return NextResponse.json({ error: 'contact param required' }, { status: 400 });

  const { error } = await (supabaseAdmin as any)
    .from('order_emails')
    .delete()
    .or(`from_email.eq.${contact},to_email.eq.${contact}`);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ deleted: true });
}
