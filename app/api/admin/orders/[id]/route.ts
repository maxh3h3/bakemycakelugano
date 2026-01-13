import { NextRequest, NextResponse } from 'next/server';
import { validateSession } from '@/lib/auth/session';
import { supabaseAdmin } from '@/lib/supabase/server';
import { updateClientStats } from '@/lib/clients/utils';

// Update an order
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    const isAuthenticated = await validateSession();
    if (!isAuthenticated) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await request.json();

    // Define allowed fields for update
    const allowedFields = [
      'delivery_type',
      'delivery_date',
      'delivery_time',
      'delivery_address',
      'paid',
      'payment_method',
      'customer_notes',
    ];

    // Build update object with only allowed fields
    const updateData: any = {};
    
    for (const field of allowedFields) {
      if (field in body) {
        updateData[field] = body[field];
      }
    }

    // Special handling: if delivery_type changes to 'pickup', clear delivery_address
    if (updateData.delivery_type === 'pickup') {
      updateData.delivery_address = null;
    }

    // Validate delivery_date format if provided
    if (updateData.delivery_date) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(updateData.delivery_date)) {
        return NextResponse.json(
          { success: false, error: 'Invalid date format. Use YYYY-MM-DD' },
          { status: 400 }
        );
      }
    }

    // Add updated_at timestamp
    updateData.updated_at = new Date().toISOString();

    // Check if order exists
    const { data: existingOrder, error: fetchError } = await supabaseAdmin
      .from('orders')
      .select('id, client_id')
      .eq('id', id)
      .single() as { data: { id: string; client_id: string | null } | null; error: any };

    if (fetchError || !existingOrder) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      );
    }

    // Update the order
    const { data: updatedOrder, error: updateError } = await (supabaseAdmin as any)
      .from('orders')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating order:', updateError);
      return NextResponse.json(
        { success: false, error: 'Failed to update order' },
        { status: 500 }
      );
    }

    // If paid status changed, update client stats
    if ('paid' in body && existingOrder.client_id) {
      try {
        await updateClientStats(existingOrder.client_id);
        console.log('Client stats updated after order update');
      } catch (statsError) {
        console.error('Failed to update client stats:', statsError);
        // Non-critical error, don't fail the update
      }
    }

    return NextResponse.json({
      success: true,
      order: updatedOrder,
    });
  } catch (error) {
    console.error('Error in order update:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Delete an order
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    const isAuthenticated = await validateSession();
    if (!isAuthenticated) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;

    // Get the order first to check if it exists and get client_id
    const { data: order, error: fetchError } = await supabaseAdmin
      .from('orders')
      .select('id, client_id')
      .eq('id', id)
      .single();

    if (fetchError || !order) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      );
    }

    const clientId = (order as any).client_id;

    // Delete the order (cascade will delete order_items)
    const { error: deleteError } = await supabaseAdmin
      .from('orders')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Error deleting order:', deleteError);
      return NextResponse.json(
        { success: false, error: 'Failed to delete order' },
        { status: 500 }
      );
    }

    // Update client stats if this order was linked to a client
    if (clientId) {
      try {
        await updateClientStats(clientId);
        console.log('Client stats updated after order deletion');
      } catch (statsError) {
        console.error('Failed to update client stats:', statsError);
        // Non-critical error, don't fail the deletion
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Order deleted successfully',
    });
  } catch (error) {
    console.error('Error in order deletion:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
