import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRole } from '@/lib/auth/require-admin-role';
import { supabaseAdmin } from '@/lib/supabase/server';
import type { Database } from '@/lib/supabase/types';
import { emitStatusUpdateEvent } from '@/lib/events/production-events';

export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireAdminRole(['owner', 'cook']);
    if (auth instanceof NextResponse) return auth;

    const body = await request.json();
    const { itemId, status } = body;

    // Validate required fields
    if (!itemId || !status) {
      return NextResponse.json(
        { success: false, error: 'Item ID and status are required' },
        { status: 400 }
      );
    }

    // Validate status
    const validStatuses = [
      'new',
      'baked',
      'creamed',
      'decorated',
    ];

    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, error: 'Invalid status' },
        { status: 400 }
      );
    }

    // Update timestamps based on status
    const updateData: Database['public']['Tables']['order_items']['Update'] = {
      production_status: status,
      updated_at: new Date().toISOString(),
    };

    // Set started_at when moving to 'baked' (first production stage)
    if (status === 'baked') {
      updateData.started_at = new Date().toISOString();
    }

    // Set completed_at when decorated (final production stage)
    if (status === 'decorated') {
      updateData.completed_at = new Date().toISOString();
    }

    // Update the item
    const { data, error } = await (supabaseAdmin
      .from('order_items') as any)
      .update(updateData)
      .eq('id', itemId)
      .select()
      .single();

    if (error) {
      console.error('Error updating item status:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to update item status' },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { success: false, error: 'Item not found' },
        { status: 404 }
      );
    }

    // Emit SSE event for real-time updates to connected clients
    try {
      emitStatusUpdateEvent({
        itemId: data.id,
        orderId: data.order_id,
        orderNumber: data.order_number || '',
        oldStatus: body.oldStatus || 'unknown',
        newStatus: status,
        deliveryDate: data.delivery_date || undefined,
      });
    } catch (sseError) {
      // Log but don't fail the request if SSE broadcast fails
      console.error('Failed to emit SSE event:', sseError);
    }

    return NextResponse.json(
      { 
        success: true, 
        message: 'Status updated successfully',
        item: data 
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in production status update:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

