import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRole } from '@/lib/auth/require-admin-role';
import { supabaseAdmin } from '@/lib/supabase/server';

// DELETE meeting
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdminRole(['owner']);
    if (auth instanceof NextResponse) return auth;

    const { id } = await params;

    const { error } = await supabaseAdmin
      .from('meetings')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting meeting:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to delete meeting' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Meeting deleted successfully',
    });
  } catch (error) {
    console.error('Error in DELETE /api/admin/meetings/[id]:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH update meeting
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdminRole(['owner']);
    if (auth instanceof NextResponse) return auth;

    const { id } = await params;
    const body = await request.json();
    const { meeting_date, meeting_time, client_id } = body;

    const updateData: Record<string, string | null> = {
      updated_at: new Date().toISOString(),
    };

    if (meeting_date !== undefined) updateData.meeting_date = meeting_date;
    if (meeting_time !== undefined) updateData.meeting_time = meeting_time;
    if (client_id !== undefined) updateData.client_id = client_id;

    const { data: meeting, error } = await (supabaseAdmin as any)
      .from('meetings')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating meeting:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to update meeting' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Meeting updated successfully',
      meeting,
    });
  } catch (error) {
    console.error('Error in PATCH /api/admin/meetings/[id]:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
