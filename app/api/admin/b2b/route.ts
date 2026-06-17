import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRole } from '@/lib/auth/require-admin-role';
import { supabaseAdmin } from '@/lib/supabase/server';

// ⚠️ TEMPORARY B2B prospects CRM — see migration 045.

const VALID_STATUSES = ['new', 'contacted', 'negotiating', 'won', 'lost'];

// GET all prospects
export async function GET() {
  try {
    const auth = await requireAdminRole(['owner']);
    if (auth instanceof NextResponse) return auth;

    const { data: prospects, error } = await supabaseAdmin
      .from('b2b_prospects')
      .select('*')
      .order('reviews_count', { ascending: true, nullsFirst: true });

    if (error) {
      console.error('Error fetching b2b prospects:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch prospects' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, prospects: prospects || [] });
  } catch (error) {
    console.error('Error in GET /api/admin/b2b:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST create a new prospect (manual add from the admin page)
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdminRole(['owner']);
    if (auth instanceof NextResponse) return auth;

    const body = await request.json();
    const { name, address, reviews_count, status } = body;

    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Name is required' },
        { status: 400 }
      );
    }
    if (status && !VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        { success: false, error: 'Invalid status' },
        { status: 400 }
      );
    }

    const { data: prospect, error } = await (supabaseAdmin as any)
      .from('b2b_prospects')
      .insert({
        name: name.trim(),
        address: address ?? null,
        reviews_count:
          reviews_count === '' || reviews_count == null ? null : Number(reviews_count),
        status: status || 'new',
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating prospect:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to create prospect' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, prospect });
  } catch (error) {
    console.error('Error in POST /api/admin/b2b:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
