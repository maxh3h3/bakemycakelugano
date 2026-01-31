import { supabaseAdmin } from '@/lib/supabase/server';

/**
 * Generates a unique order number in the format DD-MM-NN
 * where DD is the day, MM is the month, and NN is a sequential number for that month
 * 
 * @param deliveryDate - The delivery date for the order in YYYY-MM-DD format
 * @returns A unique order number string (e.g., "12-01-05" for the 5th order in January delivered on the 12th)
 */
export async function generateOrderNumber(deliveryDate: string): Promise<string> {
  // Extract day and month directly from the string to avoid timezone issues
  // deliveryDate format: YYYY-MM-DD
  const [year, month, day] = deliveryDate.split('-');
  
  // Create pattern to match all orders in this month (any day)
  // Pattern: __-MM-% matches any day, specific month, any sequential number
  const monthPattern = `__-${month}-%`;

  // Find the highest existing sequential number for this month
  const { data: lastOrder, error: lastOrderError } = await (supabaseAdmin
    .from('orders') as any)
    .select('order_number')
    .ilike('order_number', monthPattern)
    .order('order_number', { ascending: false })
    .limit(1)
    .single();

  let nextNum = 1;
  if (lastOrder && !lastOrderError && lastOrder.order_number) {
    const lastNum = parseInt(lastOrder.order_number.split('-')[2]);
    if (!isNaN(lastNum)) {
      nextNum = lastNum + 1;
    }
  }

  const orderNumber = `${day}-${month}-${nextNum.toString().padStart(2, '0')}`;
  
  return orderNumber;
}

