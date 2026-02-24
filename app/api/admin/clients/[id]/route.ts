import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRole } from '@/lib/auth/require-admin-role';
import { supabaseAdmin } from '@/lib/supabase/server';
import { deleteClient } from '@/lib/clients/utils';

/**
 * GET /api/admin/clients/[id]
 * Get a single client with order history
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdminRole(['owner']);
    if (auth instanceof NextResponse) return auth;

    const { id: clientId } = await params;

    // Fetch client
    const { data: client, error: clientError } = await (supabaseAdmin as any)
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .single();

    if (clientError) {
      if (clientError.code === 'PGRST116') {
        return NextResponse.json(
          { success: false, error: 'Client not found' },
          { status: 404 }
        );
      }
      console.error('Error fetching client:', clientError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch client' },
        { status: 500 }
      );
    }

    // Fetch client's orders with order items
    const { data: orders, error: ordersError } = await supabaseAdmin
      .from('orders')
      .select(`
        id,
        order_number,
        total_amount,
        delivery_date,
        created_at,
        paid,
        channel,
        order_items (
          id,
          product_name,
          quantity,
          unit_price,
          subtotal
        )
      `)
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });

    if (ordersError) {
      console.error('Error fetching orders:', ordersError);
      // Return client without orders rather than failing completely
    }

    // Map snake_case DB fields to camelCase TypeScript fields
    const mappedClient = {
      id: client.id,
      name: client.name,
      email: client.email,
      phone: client.phone,
      whatsapp: client.whatsapp,
      instagramHandle: client.instagram_handle,
      preferredContact: client.preferred_contact,
      firstOrderDate: client.first_order_date,
      lastOrderDate: client.last_order_date,
      totalOrders: client.total_orders,
      totalSpent: client.total_spent,
      notes: client.notes,
      clientType: client.client_type || 'individual',
      createdAt: client.created_at,
      updatedAt: client.updated_at,
    };

    return NextResponse.json({
      success: true,
      client: mappedClient,
      orders: orders || [],
    });
  } catch (error) {
    console.error('Error in GET /api/admin/clients/[id]:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/clients/[id]
 * Update client information
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdminRole(['owner']);
    if (auth instanceof NextResponse) return auth;

    const { id: clientId } = await params;
    const body = await request.json();
    const {
      name,
      email,
      phone,
      whatsapp,
      instagram_handle,
      preferred_contact,
      notes,
      client_type,
    } = body;

    // Validate at least name or one contact method is being updated
    if (!name && !email && !phone && !instagram_handle && !preferred_contact && notes === undefined && client_type === undefined) {
      return NextResponse.json(
        { success: false, error: 'No fields to update' },
        { status: 400 }
      );
    }

    // Build update object with only provided fields
    const updates: any = {};
    if (name !== undefined) updates.name = name.trim();
    if (email !== undefined) updates.email = email?.trim() || null;
    if (phone !== undefined) updates.phone = phone?.trim() || null;
    if (whatsapp !== undefined) updates.whatsapp = whatsapp?.trim() || null;
    if (instagram_handle !== undefined) updates.instagram_handle = instagram_handle?.trim() || null;
    if (preferred_contact !== undefined) updates.preferred_contact = preferred_contact || null;
    if (notes !== undefined) updates.notes = notes?.trim() || null;
    if (client_type !== undefined) updates.client_type = client_type;

    // Update client
    const { data: client, error: updateError } = await (supabaseAdmin as any)
      .from('clients')
      .update(updates)
      .eq('id', clientId)
      .select()
      .single();

    if (updateError) {
      if (updateError.code === 'PGRST116') {
        return NextResponse.json(
          { success: false, error: 'Client not found' },
          { status: 404 }
        );
      }
      // Check for unique constraint violation
      if (updateError.code === '23505') {
        return NextResponse.json(
          { success: false, error: 'A client with this email or phone already exists' },
          { status: 409 }
        );
      }
      console.error('Error updating client:', updateError);
      return NextResponse.json(
        { success: false, error: 'Failed to update client' },
        { status: 500 }
      );
    }

    // Map snake_case DB fields to camelCase TypeScript fields
    const mappedClient = {
      id: client.id,
      name: client.name,
      email: client.email,
      phone: client.phone,
      whatsapp: client.whatsapp,
      instagramHandle: client.instagram_handle,
      preferredContact: client.preferred_contact,
      firstOrderDate: client.first_order_date,
      lastOrderDate: client.last_order_date,
      totalOrders: client.total_orders,
      totalSpent: client.total_spent,
      notes: client.notes,
      clientType: client.client_type || 'individual',
      createdAt: client.created_at,
      updatedAt: client.updated_at,
    };

    return NextResponse.json({
      success: true,
      message: 'Client updated successfully',
      client: mappedClient,
    });
  } catch (error) {
    console.error('Error in PATCH /api/admin/clients/[id]:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/clients/[id]
 * Delete a client (only if no orders)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdminRole(['owner']);
    if (auth instanceof NextResponse) return auth;

    const { id: clientId } = await params;

    // Use utility function to delete client
    const result = await deleteClient(clientId);

    if (!result.success) {
      if (result.error?.includes('existing orders')) {
        return NextResponse.json(
          { success: false, error: result.error },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to delete client' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Client deleted successfully',
    });
  } catch (error) {
    console.error('Error in DELETE /api/admin/clients/[id]:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
