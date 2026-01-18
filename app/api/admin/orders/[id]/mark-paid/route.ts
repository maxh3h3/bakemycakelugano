import { NextRequest, NextResponse } from 'next/server';
import { validateSession } from '@/lib/auth/session';
import { createClient } from '@supabase/supabase-js';
import { createRevenueFromOrder } from '@/lib/accounting/transactions';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * POST /api/admin/orders/[id]/mark-paid
 * Mark an order as paid and create revenue transaction
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    const isAuthenticated = await validateSession();
    if (!isAuthenticated) {
      return NextResponse.json(
        { success: false, error: 'Не авторизован' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { payment_method } = body;

    // Create untyped Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch the order with client info
    const { data: order, error: fetchError } = await supabase
      .from('orders')
      .select('*, clients(name)')
      .eq('id', id)
      .single();

    if (fetchError || !order) {
      return NextResponse.json(
        { success: false, error: 'Не удалось найти заказ' },
        { status: 404 }
      );
    }

    // Check if already paid
    if (order.paid) {
      return NextResponse.json(
        { success: false, error: 'Заказ уже оплачен' },
        { status: 400 }
      );
    }

    // Update order to paid
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        paid: true,
        payment_method: payment_method || order.payment_method || 'cash',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (updateError) {
      console.error('Error marking order as paid:', updateError);
      return NextResponse.json(
        { success: false, error: 'Не удалось обновить заказ' },
        { status: 500 }
      );
    }

    // Create revenue transaction
    try {
      const customerName = order.clients?.name || 'Неизвестный клиент';
      const result = await createRevenueFromOrder({
        orderId: order.id,
        orderNumber: order.order_number,
        customerName: customerName,
        totalAmount: order.total_amount.toString(),
        currency: order.currency,
        clientId: order.client_id,
        paymentMethod: payment_method || order.payment_method || 'cash',
        channel: order.channel || 'phone',
        createdAt: order.created_at,
      });

      if (!result.success) {
        console.error('Failed to create revenue transaction:', result.error);
        // Don't fail the request - order is marked as paid
        // Admin can manually add revenue transaction if needed
      }
    } catch (revenueError) {
      console.error('Error creating revenue transaction:', revenueError);
      // Don't fail the request - order is marked as paid
    }

    // Update client stats if client exists
    if (order.client_id) {
      try {
        const { updateClientStats } = await import('@/lib/clients/utils');
        await updateClientStats(order.client_id);
        console.log('Client stats updated');
      } catch (statsError) {
        console.error('Failed to update client stats:', statsError);
        // Non-critical error, continue
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Заказ отмечен как оплаченный и создана транзакция дохода',
    });
  } catch (error) {
    console.error('Error in mark-paid:', error);
    return NextResponse.json(
      { success: false, error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}
