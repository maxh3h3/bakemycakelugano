import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRole } from '@/lib/auth/require-admin-role';
import { supabaseAdmin } from '@/lib/supabase/server';

/**
 * GET /api/admin/transactions
 * List all financial transactions (both expenses and revenues)
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdminRole(['owner']);
    if (auth instanceof NextResponse) return auth;

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '500', 10);
    const type = searchParams.get('type') || ''; // 'revenue', 'expense', or '' for all
    const startDate = searchParams.get('startDate') || '';
    const endDate = searchParams.get('endDate') || '';
    const sortBy = searchParams.get('sortBy') || 'date';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    const offset = (page - 1) * limit;

    // Build query for all transactions
    let query = (supabaseAdmin as any)
      .from('financial_transactions')
      .select('*', { count: 'exact' });

    // Apply type filter if specified
    if (type === 'revenue' || type === 'expense') {
      query = query.eq('type', type);
    }

    // Apply date range filter
    if (startDate) {
      query = query.gte('date', startDate);
    }
    if (endDate) {
      query = query.lte('date', endDate);
    }

    // Apply sorting
    const ascending = sortOrder === 'asc';
    query = query.order(sortBy, { ascending });

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching transactions:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch transactions' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      transactions: data || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error) {
    console.error('Error in GET /api/admin/transactions:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
