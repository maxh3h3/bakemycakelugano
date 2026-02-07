import { NextRequest, NextResponse } from 'next/server';
import { validateSession } from '@/lib/auth/session';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * POST /api/admin/orders/[id]/mark-unpaid
 * Mark an order as unpaid and delete associated revenue transaction
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

    // Create untyped Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch the order to ensure it exists
    const { data: order, error: fetchError } = await supabase
      .from('orders')
      .select('id, paid, client_id')
      .eq('id', id)
      .single();

    if (fetchError || !order) {
      return NextResponse.json(
        { success: false, error: 'Не удалось найти заказ' },
        { status: 404 }
      );
    }

    // Check if already unpaid
    if (!order.paid) {
      return NextResponse.json(
        { success: false, error: 'Заказ уже не оплачен' },
        { status: 400 }
      );
    }

    // Delete associated revenue transaction (if exists)
    try {
      const { error: deleteTransactionError } = await supabase
        .from('financial_transactions')
        .delete()
        .eq('source_type', 'order')
        .eq('source_id', id);

      if (deleteTransactionError) {
        console.error('Error deleting revenue transaction:', deleteTransactionError);
        // Don't fail the request - transaction might not exist
      } else {
        console.log(`✅ Revenue transaction deleted for order ${id}`);
      }
    } catch (transactionError) {
      console.error('Failed to delete revenue transaction:', transactionError);
      // Continue with marking as unpaid
    }

    // Update order to unpaid
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        paid: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (updateError) {
      console.error('Error marking order as unpaid:', updateError);
      return NextResponse.json(
        { success: false, error: 'Не удалось обновить заказ' },
        { status: 500 }
      );
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
      message: 'Заказ отмечен как неоплаченный и транзакция дохода удалена',
    });
  } catch (error) {
    console.error('Error in mark-unpaid:', error);
    return NextResponse.json(
      { success: false, error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}
