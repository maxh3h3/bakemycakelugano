import { NextRequest, NextResponse } from 'next/server';
import { validateSession } from '@/lib/auth/session';
import { supabaseAdmin } from '@/lib/supabase/server';

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
    } = body;

    // Validate required fields
    if (!quantity || !unit_price) {
      return NextResponse.json(
        { success: false, error: 'Quantity and unit price are required' },
        { status: 400 }
      );
    }

    // Update the order item
    const { data: item, error } = await supabaseAdmin
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
        updated_at: new Date().toISOString(),
      } as any)
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
      .eq('order_id', orderId);

    if (allItems) {
      const newTotal = allItems.reduce((sum, i) => sum + parseFloat(i.subtotal.toString()), 0);
      
      await supabaseAdmin
        .from('orders')
        .update({
          total_amount: newTotal,
          updated_at: new Date().toISOString(),
        } as any)
        .eq('id', orderId);
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

    // Get the item first to check order_id
    const { data: item } = await supabaseAdmin
      .from('order_items')
      .select('order_id')
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
      return NextResponse.json(
        { success: false, error: 'Cannot delete the last item in an order. Delete the entire order instead.' },
        { status: 400 }
      );
    }

    // Delete the order item
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
      .eq('order_id', orderId);

    if (remainingItems) {
      const newTotal = remainingItems.reduce((sum, i) => sum + parseFloat(i.subtotal.toString()), 0);
      
      await supabaseAdmin
        .from('orders')
        .update({
          total_amount: newTotal,
          updated_at: new Date().toISOString(),
        } as any)
        .eq('id', orderId);
    }

    return NextResponse.json({
      success: true,
      message: 'Order item deleted successfully',
    });
  } catch (error) {
    console.error('Error in order item deletion:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
