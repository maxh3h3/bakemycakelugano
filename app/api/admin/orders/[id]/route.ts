import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRole } from '@/lib/auth/require-admin-role';
import { supabaseAdmin } from '@/lib/supabase/server';
import { updateClientStats } from '@/lib/clients/utils';

// Update an order
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdminRole(['owner']);
    if (auth instanceof NextResponse) return auth;

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

    // Check if order exists and get current order_number
    const { data: existingOrder, error: fetchError } = await supabaseAdmin
      .from('orders')
      .select('id, client_id, order_number')
      .eq('id', id)
      .single() as { data: { id: string; client_id: string | null; order_number: string | null } | null; error: any };

    if (fetchError || !existingOrder) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      );
    }

    // If delivery_date is being updated, update order number date part while preserving counter
    let newOrderNumber: string | null = null;
    if (updateData.delivery_date && existingOrder.order_number) {
      try {
        // Extract the sequential counter from the existing order number
        // Format: DD-MM-XXX
        const orderNumberParts = existingOrder.order_number.split('-');
        
        if (orderNumberParts.length === 3) {
          const sequentialCounter = orderNumberParts[2]; // Keep the XXX part
          
          // Extract day and month from new delivery date (YYYY-MM-DD)
          const [year, month, day] = updateData.delivery_date.split('-');
          
          // Build new order number with new date but same counter
          newOrderNumber = `${day}-${month}-${sequentialCounter}`;
          updateData.order_number = newOrderNumber;
          
          console.log(`Updated order number: ${existingOrder.order_number} → ${newOrderNumber} (preserved counter: ${sequentialCounter})`);
        } else {
          console.warn(`Invalid order number format: ${existingOrder.order_number}. Skipping order number update.`);
        }
      } catch (orderNumberError) {
        console.error('Error updating order number:', orderNumberError);
        return NextResponse.json(
          { success: false, error: 'Failed to update order number' },
          { status: 500 }
        );
      }
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

    // If delivery_date, delivery_type, or delivery_time was updated, also update all related order_items
    if (updateData.delivery_date || updateData.delivery_type || updateData.delivery_time) {
      const orderItemsUpdate: any = {
        updated_at: new Date().toISOString(),
      };
      
      // Update delivery_date if changed (denormalized for production view filtering)
      if (updateData.delivery_date) {
        orderItemsUpdate.delivery_date = updateData.delivery_date;
      }
      
      // Update delivery_type if changed (denormalized for filtering immediate sales)
      if (updateData.delivery_type) {
        orderItemsUpdate.delivery_type = updateData.delivery_type;
      }
      
      // Update delivery_time if changed (denormalized for decoration view)
      if (updateData.delivery_time !== undefined) {
        orderItemsUpdate.delivery_time = updateData.delivery_time;
      }
      
      // Also update order_number in order_items if it was regenerated
      if (newOrderNumber) {
        orderItemsUpdate.order_number = newOrderNumber;
      }

      const { error: itemsUpdateError } = await (supabaseAdmin as any)
        .from('order_items')
        .update(orderItemsUpdate)
        .eq('order_id', id);

      if (itemsUpdateError) {
        console.error('Error updating order items:', itemsUpdateError);
        // Log the error but don't fail the entire request
        // The order was updated successfully, items can be fixed manually if needed
        console.warn('Order updated successfully but failed to update related order items');
      } else {
        const updatedFields = [];
        if (updateData.delivery_date) updatedFields.push('delivery_date');
        if (updateData.delivery_type) updatedFields.push('delivery_type');
        if (updateData.delivery_time !== undefined) updatedFields.push('delivery_time');
        if (newOrderNumber) updatedFields.push('order_number');
        console.log(`Updated ${updatedFields.join(', ')} for all order items in order ${id}`);
      }
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
    const auth = await requireAdminRole(['owner']);
    if (auth instanceof NextResponse) return auth;

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

    // Delete associated financial transaction first (if exists)
    try {
      const { error: financeDeleteError } = await supabaseAdmin
        .from('financial_transactions')
        .delete()
        .eq('source_type', 'order')
        .eq('source_id', id);

      if (financeDeleteError) {
        console.error('Error deleting financial transaction:', financeDeleteError);
        // Don't fail the order deletion if this fails - transaction might not exist
      } else {
        console.log('Associated financial transaction deleted for order:', id);
      }
    } catch (financeError) {
      console.error('Failed to delete financial transaction:', financeError);
      // Continue with order deletion
    }

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
