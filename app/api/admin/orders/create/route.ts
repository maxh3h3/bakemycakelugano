import { NextRequest, NextResponse } from 'next/server';
import { validateSession } from '@/lib/auth/session';
import { supabaseAdmin } from '@/lib/supabase/server';
import { generateOrderNumber } from '@/lib/order-number-generator';
import { validateDeliveryAddress } from '@/lib/schemas/delivery';
import { findOrCreateClient, updateClientStats } from '@/lib/clients/utils';
import { emitNewOrderEvent } from '@/lib/events/production-events';
import { createRevenueFromOrder } from '@/lib/accounting/transactions';

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const isAuthenticated = await validateSession();
    if (!isAuthenticated) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      client_id: providedClientId, // Optional: pre-existing client ID for quick sales
      customer_name,
      customer_email,
      customer_phone,
      customer_ig_handle,
      delivery_date,
      delivery_time,
      delivery_type,
      delivery_address,
      customer_notes,
      payment_method,
      paid,
      channel,
      total_amount,
      order_items,
      is_immediate, // Flag for immediate sales from shelf
    } = body;

    // Validate required fields
    const missingFields = [];
    if (!customer_name) missingFields.push('customer_name');
    if (!delivery_date) missingFields.push('delivery_date');
    
    // Contact fields are now optional - no validation required
    
    if (missingFields.length > 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing required fields', 
          missingFields 
        },
        { status: 400 }
      );
    }

    // Validate order items
    if (!order_items || !Array.isArray(order_items) || order_items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'At least one order item is required' },
        { status: 400 }
      );
    }

    // Validate delivery address for delivery orders
    const addressValidation = validateDeliveryAddress(delivery_type, delivery_address);
    if (!addressValidation.success) {
      return NextResponse.json(
        { success: false, error: addressValidation.error },
        { status: 400 }
      );
    }

    // Use provided client_id if available, otherwise find or create client
    let clientId: string;
    
    if (providedClientId) {
      // Verify the provided client exists
      const { data: existingClient, error: clientError } = await supabaseAdmin
        .from('clients')
        .select('id')
        .eq('id', providedClientId)
        .single();
      
      if (clientError || !existingClient) {
        return NextResponse.json(
          { success: false, error: 'Provided client_id does not exist' },
          { status: 400 }
        );
      }
      
      clientId = providedClientId;
      console.log('Using provided client:', clientId);
    } else {
      // Find or create client (required for all orders)
      try {
        const { client, isNew } = await findOrCreateClient(
          {
            name: customer_name,
            email: customer_email || null,
            phone: customer_phone || null,
            whatsapp: customer_phone || null,
            instagramHandle: customer_ig_handle || null,
          },
          channel
        );
        clientId = client.id;
        console.log(`${isNew ? 'Created new' : 'Found existing'} client:`, clientId);
      } catch (clientError) {
        console.error('Failed to find/create client:', clientError);
        return NextResponse.json(
          { success: false, error: 'Failed to create or find client for this order' },
          { status: 500 }
        );
      }
    }

    // Generate order number (format: DD-MM-NN)
    const order_number = await generateOrderNumber(delivery_date);

    // Ensure we have a client_id before creating the order
    if (!clientId) {
      return NextResponse.json(
        { success: false, error: 'Failed to create or find client for this order' },
        { status: 500 }
      );
    }

    // Create order
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert({
        order_number,
        client_id: clientId,
        delivery_date,
        delivery_time: delivery_time || null,
        delivery_type,
        delivery_address: addressValidation.data,
        customer_notes: customer_notes || null,
        payment_method: payment_method || null,
        paid: paid || false,
        channel: channel || 'phone',
        total_amount: total_amount || 0,
        currency: 'CHF',
      } as any)
      .select()
      .single();

    if (orderError) {
      console.error('Error creating order:', orderError);
      return NextResponse.json(
        { success: false, error: 'Failed to create order' },
        { status: 500 }
      );
    }

    // Update client stats (skip for immediate sales)
    if (clientId && !is_immediate) {
      try {
        await updateClientStats(clientId);
        console.log('Client stats updated');
      } catch (statsError) {
        console.error('Failed to update client stats:', statsError);
        // Non-critical error, continue
      }
    }

    // Create order items
    // Immediate sales are marked as 'delivered' since they're fulfilled from shelf
    const orderItemsData = order_items.map((item: any) => ({
      order_id: (order as any).id,
      order_number: order_number, // Denormalized for production view
      delivery_type: delivery_type, // Denormalized for filtering immediate sales
      product_id: item.product_id || null, // Nullable for custom manual orders
      product_name: item.product_name,
      product_image_urls: item.product_image_urls?.length ? item.product_image_urls : null,
      quantity: item.quantity,
      unit_price: item.unit_price,
      subtotal: item.subtotal,
      selected_flavour: item.selected_flavour || null,
      flavour_name: item.flavour_name || null,
      weight_kg: item.weight_kg || null,
      diameter_cm: item.diameter_cm || null,
      writing_on_cake: item.writing_on_cake || null,
      internal_decoration_notes: item.internal_decoration_notes || null,
      staff_notes: item.staff_notes || null,
      delivery_date: delivery_date, // Denormalized for production view
      production_status: is_immediate ? 'delivered' : 'new', // Immediate sales are already delivered
      completed_at: is_immediate ? new Date().toISOString() : null, // Mark completion time
    }));

    const { error: itemsError } = await supabaseAdmin
      .from('order_items')
      .insert(orderItemsData as any);

    if (itemsError) {
      console.error('Error creating order items:', itemsError);
      // Delete the order if items creation fails
      await supabaseAdmin.from('orders').delete().eq('id', (order as any).id);
      return NextResponse.json(
        { success: false, error: 'Failed to create order items' },
        { status: 500 }
      );
    }

    // Create revenue transaction if order is paid
    if (paid) {
      try {
        await createRevenueFromOrder({
          orderId: (order as any).id,
          orderNumber: order_number,
          customerName: customer_name,
          totalAmount: total_amount?.toString() || '0',
          currency: 'CHF',
          clientId: clientId,
          paymentMethod: payment_method || 'cash',
          channel: channel || 'phone',
          createdAt: (order as any).created_at,
        });
        console.log('Revenue transaction created for paid order');
      } catch (revenueError) {
        console.error('Failed to create revenue transaction:', revenueError);
        // Don't throw - order is already created, revenue can be added manually
      }
    }

    // Emit SSE event for real-time production view updates (skip for immediate sales)
    if (!is_immediate) {
      try {
        emitNewOrderEvent({
          orderId: (order as any).id,
          orderNumber: order_number,
          deliveryDate: delivery_date,
          itemCount: order_items.length,
        });
        console.log('SSE new_order event emitted');
      } catch (sseError) {
        console.error('Failed to emit SSE event:', sseError);
        // Don't throw - order is already created, SSE is not critical
      }
    } else {
      console.log('Immediate sale - skipping SSE production event');
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Order created successfully',
        order,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error in order creation:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

