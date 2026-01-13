import { NextRequest, NextResponse } from 'next/server';
import { validateSession } from '@/lib/auth/session';
import { supabaseAdmin } from '@/lib/supabase/server';
import { generateOrderNumber } from '@/lib/order-number-generator';
import { validateDeliveryAddress } from '@/lib/schemas/delivery';
import { findOrCreateClient, updateClientStats } from '@/lib/clients/utils';

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
    } = body;

    // Validate required fields
    const missingFields = [];
    if (!customer_name) missingFields.push('customer_name');
    if (!delivery_date) missingFields.push('delivery_date');
    
    // Validate channel-specific contact fields
    if (channel === 'phone' || channel === 'whatsapp' || channel === 'walk_in') {
      if (!customer_phone) missingFields.push('customer_phone');
    } else if (channel === 'instagram') {
      if (!customer_ig_handle) missingFields.push('customer_ig_handle');
    } else if (channel === 'email') {
      if (!customer_email) missingFields.push('customer_email');
    }
    
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

    // Find or create client
    let clientId: string | null = null;
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
      // Continue without client_id - order will still be created with legacy fields
    }

    // Generate order number (format: DD-MM-NN)
    const order_number = await generateOrderNumber(delivery_date);

    // Create order
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert({
        order_number,
        client_id: clientId,
        customer_name,
        customer_email,
        customer_phone,
        customer_ig_handle: customer_ig_handle || null,
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

    // Update client stats
    if (clientId) {
      try {
        await updateClientStats(clientId);
        console.log('Client stats updated');
      } catch (statsError) {
        console.error('Failed to update client stats:', statsError);
        // Non-critical error, continue
      }
    }

    // Create order items
    const orderItemsData = order_items.map((item: any) => ({
      order_id: (order as any).id,
      order_number: order_number, // Denormalized for production view
      product_id: item.product_id || null, // Nullable for custom manual orders
      product_name: item.product_name,
      product_image_url: item.product_image_url || null,
      quantity: item.quantity,
      unit_price: item.unit_price,
      subtotal: item.subtotal,
      selected_size: item.selected_size || null,
      size_label: item.size_label || null,
      selected_flavour: item.selected_flavour || null,
      flavour_name: item.flavour_name || null,
      weight_kg: item.weight_kg || null,
      diameter_cm: item.diameter_cm || null,
      writing_on_cake: item.writing_on_cake || null,
      internal_decoration_notes: item.internal_decoration_notes || null,
      staff_notes: item.staff_notes || null,
      delivery_date: delivery_date, // Denormalized for production view
      production_status: 'new',
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

