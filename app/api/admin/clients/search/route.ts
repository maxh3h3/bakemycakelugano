import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRole } from '@/lib/auth/require-admin-role';
import { searchClients } from '@/lib/clients/utils';

/**
 * GET /api/admin/clients/search?q=query
 * Search clients for autocomplete in CreateOrderModal
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdminRole(['owner']);
    if (auth instanceof NextResponse) return auth;

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const limit = parseInt(searchParams.get('limit') || '10', 10);

    // Use utility function to search
    const results = await searchClients(query, limit);

    return NextResponse.json({
      success: true,
      clients: results,
    });
  } catch (error) {
    console.error('Error in GET /api/admin/clients/search:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
