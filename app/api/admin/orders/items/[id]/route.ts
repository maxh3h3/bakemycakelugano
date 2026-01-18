import { NextRequest, NextResponse } from 'next/server';
import { validateSession } from '@/lib/auth/session';
import { supabaseAdmin } from '@/lib/supabase/server';
import { emitNotesUpdateEvent, emitItemDeletedEvent } from '@/lib/events/production-events';

// Update an order item
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
    const {
      quantity,
      unit_price,
      subtotal,
      writing_on_cake,
      internal_decoration_notes,
      staff_notes,
      weight_kg,
      diameter_cm,
      selected_flavour,
      flavour_name,
      product_image_url,
    } = body;

    // Validate required fields
    if (!quantity || !unit_price) {
      return NextResponse.json(
        { success: false, error: 'Quantity and unit price are required' },
        { status: 400 }
      );
    }

    // Update the order item
    const { data: item, error } = await (supabaseAdmin as any)
      .from('order_items')
      .update({
        quantity,
        unit_price,
        subtotal,
        writing_on_cake,
        internal_decoration_notes,
        staff_notes,
        weight_kg,
        diameter_cm,
        selected_flavour: selected_flavour || null,
        flavour_name: flavour_name || null,
        product_image_url: product_image_url || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating order item:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to update order item' },
        { status: 500 }
      );
    }

    if (!item) {
      return NextResponse.json(
        { success: false, error: 'Order item not found' },
        { status: 404 }
      );
    }

    // Get the order ID to update the order total
    const orderId = (item as any).order_id;

    // Recalculate order total
    const { data: allItems } = await supabaseAdmin
      .from('order_items')
      .select('subtotal')
      .eq('order_id', orderId) as { data: Array<{ subtotal: number }> | null };

    if (allItems) {
      const newTotal = allItems.reduce((sum, i) => sum + parseFloat(i.subtotal.toString()), 0);
      
      await (supabaseAdmin as any)
        .from('orders')
        .update({
          total_amount: newTotal,
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderId);
    }

    // Emit SSE event for real-time updates to production view
    try {
      emitNotesUpdateEvent({
        itemId: (item as any).id,
        orderId: (item as any).order_id,
        orderNumber: (item as any).order_number || '',
      });
      console.log('[SSE] Item update event emitted for order item:', (item as any).id);
    } catch (sseError) {
      console.error('Failed to emit SSE event:', sseError);
      // Don't fail the request if SSE broadcast fails
    }

    return NextResponse.json({
      success: true,
      message: 'Order item updated successfully',
      item,
    });
  } catch (error) {
    console.error('Error in order item update:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Delete an order item
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

    // Get the item first to check order_id and order_number
    const { data: item } = await supabaseAdmin
      .from('order_items')
      .select('order_id, order_number')
      .eq('id', id)
      .single();

    if (!item) {
      return NextResponse.json(
        { success: false, error: 'Order item not found' },
        { status: 404 }
      );
    }

    const orderId = (item as any).order_id;

    // Check if this is the last item in the order
    const { data: allItems } = await supabaseAdmin
      .from('order_items')
      .select('id')
      .eq('order_id', orderId);

    if (allItems && allItems.length === 1) {
      // This is the last item - delete the entire order instead
      console.log('[DELETE] Last item in order - deleting entire order:', orderId);
      
      // Get order details before deletion for client stats update
      const { data: order } = await supabaseAdmin
        .from('orders')
        .select('client_id')
        .eq('id', orderId)
        .single() as { data: { client_id: string | null } | null };

      // Delete associated financial transaction first (if exists)
      try {
        const { error: financeDeleteError } = await supabaseAdmin
          .from('financial_transactions')
          .delete()
          .eq('source_type', 'order')
          .eq('source_id', orderId);

        if (financeDeleteError) {
          console.error('Error deleting financial transaction:', financeDeleteError);
          // Don't fail the order deletion if this fails
        } else {
          console.log('Associated financial transaction deleted for order:', orderId);
        }
      } catch (financeError) {
        console.error('Failed to delete financial transaction:', financeError);
        // Continue with order deletion
      }

      // Delete the order (cascades to order_items via foreign key)
      const { error: orderDeleteError } = await supabaseAdmin
        .from('orders')
        .delete()
        .eq('id', orderId);

      if (orderDeleteError) {
        console.error('Error deleting order:', orderDeleteError);
        return NextResponse.json(
          { success: false, error: 'Failed to delete order' },
          { status: 500 }
        );
      }

      // Update client stats if order had a client
      if (order?.client_id) {
        try {
          const { updateClientStats } = await import('@/lib/clients/utils');
          await updateClientStats(order.client_id);
          console.log('Client stats updated after order deletion');
        } catch (statsError) {
          console.error('Failed to update client stats:', statsError);
          // Non-critical error, continue
        }
      }

      // Emit SSE event for order deletion
      try {
        emitItemDeletedEvent({
          itemId: id,
          orderId: orderId,
          orderNumber: (item as any).order_number || '',
        });
        console.log('[SSE] Order deleted event emitted (last item removed)');
      } catch (sseError) {
        console.error('Failed to emit SSE event:', sseError);
      }

      return NextResponse.json({
        success: true,
        message: 'Last item deleted - entire order removed',
        orderDeleted: true,
      });
    }

    // Not the last item - proceed with normal item deletion
    const { error: deleteError } = await supabaseAdmin
      .from('order_items')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Error deleting order item:', deleteError);
      return NextResponse.json(
        { success: false, error: 'Failed to delete order item' },
        { status: 500 }
      );
    }

    // Recalculate order total
    const { data: remainingItems } = await supabaseAdmin
      .from('order_items')
      .select('subtotal')
      .eq('order_id', orderId) as { data: Array<{ subtotal: number }> | null };

    if (remainingItems) {
      const newTotal = remainingItems.reduce((sum, i) => sum + parseFloat(i.subtotal.toString()), 0);
      
      await (supabaseAdmin as any)
        .from('orders')
        .update({
          total_amount: newTotal,
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderId);
    }

    // Emit SSE event for real-time updates to production view
    try {
      emitItemDeletedEvent({
        itemId: id,
        orderId: orderId,
        orderNumber: (item as any).order_number || '',
      });
      console.log('[SSE] Item deleted event emitted for item:', id);
    } catch (sseError) {
      console.error('Failed to emit SSE event:', sseError);
      // Don't fail the request if SSE broadcast fails
    }

    return NextResponse.json({
      success: true,
      message: 'Order item deleted successfully',
      orderDeleted: false,
    });
  } catch (error) {
    console.error('Error in order item deletion:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
