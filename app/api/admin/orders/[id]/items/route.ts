import { NextRequest, NextResponse } from 'next/server';
import { validateSession } from '@/lib/auth/session';
import { supabaseAdmin } from '@/lib/supabase/server';
import { emitItemAddedEvent } from '@/lib/events/production-events';

// Get all items for an order
export async function GET(
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

    const { id: orderId } = await params;

    // Fetch all items for the order
    const { data: items, error } = await supabaseAdmin
      .from('order_items')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching order items:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch order items' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      items: items || [],
    });
  } catch (error) {
    console.error('Error in order items fetch:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Add a new item to an order
export async function POST(
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

    const { id: orderId } = await params;
    const body = await request.json();
    const {
      product_name,
      product_image_urls,
      quantity,
      unit_price,
      subtotal,
      selected_flavour,
      flavour_name,
      writing_on_cake,
      internal_decoration_notes,
      staff_notes,
      weight_kg,
      diameter_cm,
      delivery_date,
    } = body;

    // Validate required fields
    if (!product_name || !quantity || !unit_price) {
      return NextResponse.json(
        { success: false, error: 'Product name, quantity, and unit price are required' },
        { status: 400 }
      );
    }

    // Fetch order to get order_number, delivery_date, and delivery_type
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('order_number, delivery_date, delivery_type')
      .eq('id', orderId)
      .single() as { data: { order_number: string | null; delivery_date: string | null; delivery_type: string | null } | null; error: any };

    if (orderError || !order) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      );
    }

    // Create the new order item
    const { data: item, error } = await supabaseAdmin
      .from('order_items')
      .insert({
        order_id: orderId,
        order_number: order.order_number, // Denormalized for production view
        delivery_type: order.delivery_type, // Denormalized for filtering immediate sales
        delivery_date: delivery_date || order.delivery_date, // Use provided or inherit from order
        delivery_time: order.delivery_time, // Denormalized for decoration view
        product_id: null, // Manual items don't have product_id
        product_name,
        product_image_urls: product_image_urls?.length ? product_image_urls : null,
        quantity,
        unit_price,
        subtotal: subtotal || quantity * unit_price,
        selected_flavour: selected_flavour || null,
        flavour_name: flavour_name || null,
        writing_on_cake,
        internal_decoration_notes,
        staff_notes,
        weight_kg,
        diameter_cm,
        production_status: 'new',
      } as any)
      .select()
      .single();

    if (error) {
      console.error('Error adding order item:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to add order item' },
        { status: 500 }
      );
    }

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
      emitItemAddedEvent({
        itemId: (item as any).id,
        orderId: orderId,
        orderNumber: order.order_number || '',
        productName: product_name,
        deliveryDate: delivery_date || order.delivery_date || undefined,
      });
      console.log('[SSE] Item added event emitted for order:', order.order_number);
    } catch (sseError) {
      console.error('Failed to emit SSE event:', sseError);
      // Don't fail the request if SSE broadcast fails
    }

    return NextResponse.json({
      success: true,
      message: 'Order item added successfully',
      item,
    });
  } catch (error) {
    console.error('Error in order item creation:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
