import { supabaseAdmin } from '@/lib/supabase/server';

/**
 * Generates a unique order number in the format DD-MM-NN
 * where DD is the day, MM is the month, and NN is a sequential number for that day
 * 
 * @param deliveryDate - The delivery date for the order in YYYY-MM-DD format
 * @returns A unique order number string (e.g., "12-01-01" for the first order on January 12th)
 */
export async function generateOrderNumber(deliveryDate: string): Promise<string> {
  // Extract day and month directly from the string to avoid timezone issues
  // deliveryDate format: YYYY-MM-DD
  const [year, month, day] = deliveryDate.split('-');
  const prefix = `${day}-${month}-`;

  // Find the highest existing number for this day
  const { data: lastOrder, error: lastOrderError } = await (supabaseAdmin
    .from('orders') as any)
    .select('order_number')
    .ilike('order_number', `${prefix}%`)
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

  const orderNumber = `${prefix}${nextNum.toString().padStart(2, '0')}`;
  
  return orderNumber;
}

