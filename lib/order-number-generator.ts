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

  // Fetch ALL orders for this month (not just sorted by string)
  // We need to parse sequential numbers numerically to find the true maximum
  const { data: monthOrders, error: ordersError } = await (supabaseAdmin
    .from('orders') as any)
    .select('order_number')
    .ilike('order_number', monthPattern);

  let nextNum = 1;
  
  if (monthOrders && !ordersError && monthOrders.length > 0) {
    // Extract all sequential numbers and find the maximum numerically
    const sequentialNumbers = monthOrders
      .map((order: any) => {
        if (!order.order_number) return 0;
        const parts = order.order_number.split('-');
        const num = parseInt(parts[2]);
        return isNaN(num) ? 0 : num;
      })
      .filter((num: number) => num > 0);
    
    if (sequentialNumbers.length > 0) {
      const maxNum = Math.max(...sequentialNumbers);
      nextNum = maxNum + 1;
    }
  }

  const orderNumber = `${day}-${month}-${nextNum.toString().padStart(2, '0')}`;
  
  return orderNumber;
}

