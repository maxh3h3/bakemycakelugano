import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRole } from '@/lib/auth/require-admin-role';
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
    const auth = await requireAdminRole(['owner', 'cook']);
    if (auth instanceof NextResponse) return auth;

    const { id } = await params;
    const body = await request.json();
    // Distinguish "not provided" (use existing/default) from an explicit
    // null (clear the cash flag) - `payment_method || fallback` can't tell those apart.
    const methodProvided = Object.prototype.hasOwnProperty.call(body, 'payment_method');
    const payment_method = body.payment_method as string | null | undefined;

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

    const method = methodProvided ? payment_method : (order.payment_method || 'cash');

    // Order already paid: only allow correcting the payment method,
    // keeping the existing revenue transaction in sync
    if (order.paid) {
      if (order.payment_method === method) {
        return NextResponse.json({ success: true, message: 'Способ оплаты не изменился' });
      }

      const { error: updateError } = await supabase
        .from('orders')
        .update({ payment_method: method, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (updateError) {
        console.error('Error updating payment method:', updateError);
        return NextResponse.json(
          { success: false, error: 'Не удалось обновить способ оплаты' },
          { status: 500 }
        );
      }

      const { error: txError } = await supabase
        .from('financial_transactions')
        .update({ payment_method: method })
        .eq('source_type', 'order')
        .eq('source_id', id);

      if (txError) {
        console.error('Error syncing revenue transaction payment method:', txError);
      }

      return NextResponse.json({ success: true, message: 'Способ оплаты обновлён' });
    }

    // Update order to paid
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        paid: true,
        payment_method: method,
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
      // Use order date (delivery_date or created_at) for the transaction, not when it's marked paid
      const orderDate = order.delivery_date ?? order.created_at;
      const result = await createRevenueFromOrder({
        orderId: order.id,
        orderNumber: order.order_number,
        customerName: customerName,
        totalAmount: order.total_amount.toString(),
        currency: order.currency,
        clientId: order.client_id,
        paymentMethod: method,
        channel: order.channel || 'phone',
        createdAt: orderDate,
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
