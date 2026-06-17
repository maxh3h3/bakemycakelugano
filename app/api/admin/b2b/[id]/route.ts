import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRole } from '@/lib/auth/require-admin-role';
import { supabaseAdmin } from '@/lib/supabase/server';

// ⚠️ TEMPORARY B2B prospects CRM — see migration 045.

const VALID_STATUSES = ['new', 'contacted', 'negotiating', 'won', 'lost'];

// PATCH update a prospect (status / name / address / reviews_count)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdminRole(['owner']);
    if (auth instanceof NextResponse) return auth;

    const { id } = await params;
    const body = await request.json();
    const { name, address, reviews_count, status } = body;

    if (status !== undefined && !VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        { success: false, error: 'Invalid status' },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (name !== undefined) updateData.name = name;
    if (address !== undefined) updateData.address = address;
    if (reviews_count !== undefined)
      updateData.reviews_count =
        reviews_count === '' || reviews_count === null ? null : Number(reviews_count);
    if (status !== undefined) updateData.status = status;

    const { data: prospect, error } = await (supabaseAdmin as any)
      .from('b2b_prospects')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating prospect:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to update prospect' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, prospect });
  } catch (error) {
    console.error('Error in PATCH /api/admin/b2b/[id]:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE a prospect
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdminRole(['owner']);
    if (auth instanceof NextResponse) return auth;

    const { id } = await params;

    const { error } = await supabaseAdmin.from('b2b_prospects').delete().eq('id', id);

    if (error) {
      console.error('Error deleting prospect:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to delete prospect' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/admin/b2b/[id]:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
