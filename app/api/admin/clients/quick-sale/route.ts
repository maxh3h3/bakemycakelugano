import { NextResponse } from 'next/server';
import { requireAdminRole } from '@/lib/auth/require-admin-role';
import { supabaseAdmin } from '@/lib/supabase/server';

/**
 * GET /api/admin/clients/quick-sale
 * Business clients that have a price list, for the quick sale modal.
 * Most active clients first.
 */
export async function GET() {
  try {
    const auth = await requireAdminRole(['owner']);
    if (auth instanceof NextResponse) return auth;

    const { data, error } = await (supabaseAdmin as any)
      .from('clients')
      .select('id, name, price_list')
      .eq('client_type', 'business')
      .neq('price_list', '[]')
      .order('total_orders', { ascending: false, nullsFirst: false });

    if (error) {
      console.error('Error fetching quick sale clients:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch clients' },
        { status: 500 }
      );
    }

    const clients = (data || []).map((c: any) => ({
      id: c.id,
      name: c.name,
      priceList: c.price_list ?? [],
    }));

    return NextResponse.json({ success: true, clients });
  } catch (error) {
    console.error('Error in GET /api/admin/clients/quick-sale:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
