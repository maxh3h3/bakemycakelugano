/**
 * Financial Transactions Helper Module
 * 
 * Centralized functions for creating revenue and expense transactions.
 * This ensures consistency across the application.
 */

import { supabaseAdmin } from '@/lib/supabase/server';

interface CreateRevenueFromOrderParams {
  orderId: string;
  orderNumber: string | null;
  customerName: string;
  totalAmount: string;
  currency: string;
  clientId: string | null;
  paymentMethod: string | null;
  channel: string | null;
  createdAt: string;
}

interface CreateManualRevenueParams {
  date: string;
  amount: number;
  description: string;
  clientId?: string | null;
  paymentMethod?: string | null;
  channel?: string;
  notes?: string | null;
  createdByUserId?: string | null;
}

interface CreateExpenseParams {
  date: string;
  amount: number;
  category: string;
  description: string;
  notes?: string | null;
  receiptUrl?: string | null;
  createdByUserId?: string | null;
}

/**
 * Create a revenue transaction from a paid order
 * Called when an order payment is completed (Stripe, manual, etc.)
 */
export async function createRevenueFromOrder(params: CreateRevenueFromOrderParams) {
  const {
    orderId,
    orderNumber,
    customerName,
    totalAmount,
    currency,
    clientId,
    paymentMethod,
    channel,
    createdAt,
  } = params;

  // Check if transaction already exists for this order
  const { data: existing } = await supabaseAdmin
    .from('financial_transactions')
    .select('id')
    .eq('source_type', 'order')
    .eq('source_id', orderId)
    .single();

  if (existing) {
    console.log(`Revenue transaction already exists for order ${orderId}`);
    return { success: true, data: existing, alreadyExists: true };
  }

  // Create revenue transaction
  const transaction = {
    type: 'revenue',
    date: new Date(createdAt).toISOString().split('T')[0], // Extract date portion
    amount: parseFloat(totalAmount).toFixed(2),
    currency: currency || 'CHF',
    description: orderNumber 
      ? `Order #${orderNumber} - ${customerName}`
      : `Order - ${customerName}`,
    source_type: 'order',
    source_id: orderId,
    client_id: clientId,
    payment_method: paymentMethod,
    channel: channel || 'website',
    expense_category: null,
    receipt_url: null,
    notes: null,
  };

  const { data, error } = await supabaseAdmin
    .from('financial_transactions')
    .insert(transaction as any)
    .select()
    .single();

  if (error) {
    console.error('Error creating revenue transaction:', error);
    return { success: false, error };
  }

  console.log(`✅ Revenue transaction created for order ${orderId}: ${totalAmount} ${currency}`);
  return { success: true, data };
}

/**
 * Create a manual revenue entry (for bulk entries like Divoraa monthly totals)
 * Does NOT create an order - pure accounting entry
 */
export async function createManualRevenue(params: CreateManualRevenueParams) {
  const {
    date,
    amount,
    description,
    clientId = null,
    paymentMethod = null,
    channel = 'other',
    notes = null,
    createdByUserId = null,
  } = params;

  const transaction = {
    type: 'revenue',
    date,
    amount: parseFloat(amount.toString()).toFixed(2),
    currency: 'CHF',
    description: description.trim(),
    source_type: 'manual',
    source_id: null,
    client_id: clientId,
    payment_method: paymentMethod,
    channel,
    expense_category: null,
    receipt_url: null,
    notes: notes?.trim() || null,
    created_by_user_id: createdByUserId,
  };

  const { data, error } = await supabaseAdmin
    .from('financial_transactions')
    .insert(transaction as any)
    .select()
    .single();

  if (error) {
    console.error('Error creating manual revenue:', error);
    return { success: false, error };
  }

  console.log(`✅ Manual revenue created: ${amount} CHF - ${description}`);
  return { success: true, data };
}

/**
 * Create an expense transaction
 * Used by the expense API and other expense recording flows
 */
export async function createExpense(params: CreateExpenseParams) {
  const {
    date,
    amount,
    category,
    description,
    notes = null,
    receiptUrl = null,
    createdByUserId = null,
  } = params;

  const transaction = {
    type: 'expense',
    date,
    amount: parseFloat(amount.toString()).toFixed(2),
    currency: 'CHF',
    description: description.trim(),
    source_type: 'manual',
    source_id: null,
    client_id: null,
    payment_method: null,
    channel: null,
    expense_category: category,
    receipt_url: receiptUrl,
    notes: notes?.trim() || null,
    created_by_user_id: createdByUserId,
  };

  const { data, error } = await supabaseAdmin
    .from('financial_transactions')
    .insert(transaction as any)
    .select()
    .single();

  if (error) {
    console.error('Error creating expense:', error);
    return { success: false, error };
  }

  console.log(`✅ Expense created: ${amount} CHF - ${category} - ${description}`);
  return { success: true, data };
}

/**
 * Helper to check if a revenue transaction exists for an order
 */
export async function revenueExistsForOrder(orderId: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from('financial_transactions')
    .select('id')
    .eq('source_type', 'order')
    .eq('source_id', orderId)
    .single();

  return !!data;
}
