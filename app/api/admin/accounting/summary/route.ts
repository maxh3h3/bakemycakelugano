import { NextRequest, NextResponse } from 'next/server';
import { validateSession } from '@/lib/auth/session';
import { supabaseAdmin } from '@/lib/supabase/server';

/**
 * GET /api/admin/accounting/summary
 * Get accounting summary including revenue, expenses, and profit/loss
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const isAuthenticated = await validateSession();
    if (!isAuthenticated) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate') || '';
    const endDate = searchParams.get('endDate') || '';

    // Calculate default date range if not provided (current month)
    const now = new Date();
    const defaultStartDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const defaultEndDate = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

    const effectiveStartDate = startDate || defaultStartDate;
    const effectiveEndDate = endDate || defaultEndDate;

    // Fetch revenue from orders (paid orders only)
    let revenueQuery = (supabaseAdmin as any)
      .from('orders')
      .select('total_amount')
      .eq('paid', true);

    if (effectiveStartDate) {
      revenueQuery = revenueQuery.gte('created_at', effectiveStartDate);
    }
    if (effectiveEndDate) {
      // Add one day to include the end date
      const endDatePlusOne = new Date(effectiveEndDate);
      endDatePlusOne.setDate(endDatePlusOne.getDate() + 1);
      revenueQuery = revenueQuery.lt('created_at', endDatePlusOne.toISOString().split('T')[0]);
    }

    const { data: orders, error: ordersError } = await revenueQuery;

    if (ordersError) {
      console.error('Error fetching orders:', ordersError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch revenue data' },
        { status: 500 }
      );
    }

    // Calculate total revenue
    const totalRevenue = orders?.reduce((sum: number, order: any) => sum + parseFloat(order.total_amount || 0), 0) || 0;
    const totalOrders = orders?.length || 0;

    // Fetch expenses
    let expensesQuery = (supabaseAdmin as any)
      .from('expenses')
      .select('amount, category');

    if (effectiveStartDate) {
      expensesQuery = expensesQuery.gte('date', effectiveStartDate);
    }
    if (effectiveEndDate) {
      expensesQuery = expensesQuery.lte('date', effectiveEndDate);
    }

    const { data: expenses, error: expensesError } = await expensesQuery;

    if (expensesError) {
      console.error('Error fetching expenses:', expensesError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch expenses data' },
        { status: 500 }
      );
    }

    // Calculate total expenses and breakdown by category
    const totalExpenses = expenses?.reduce((sum: number, expense: any) => sum + parseFloat(expense.amount || 0), 0) || 0;
    
    const expensesByCategory = expenses?.reduce((acc: Record<string, number>, expense: any) => {
      const category = expense.category || 'other';
      acc[category] = (acc[category] || 0) + parseFloat(expense.amount || 0);
      return acc;
    }, {} as Record<string, number>) || {};

    // Calculate profit/loss
    const profitLoss = totalRevenue - totalExpenses;
    const profitMargin = totalRevenue > 0 ? (profitLoss / totalRevenue) * 100 : 0;

    // Fetch monthly trends for the past 6 months
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const sixMonthsAgoStr = sixMonthsAgo.toISOString().split('T')[0];

    // Get monthly revenue
    const { data: monthlyOrders, error: monthlyOrdersError } = await (supabaseAdmin as any)
      .from('orders')
      .select('total_amount, created_at')
      .eq('paid', true)
      .gte('created_at', sixMonthsAgoStr);

    // Get monthly expenses
    const { data: monthlyExpenses, error: monthlyExpensesError } = await (supabaseAdmin as any)
      .from('expenses')
      .select('amount, date')
      .gte('date', sixMonthsAgoStr);

    // Calculate monthly breakdown
    const monthlyData: Record<string, { revenue: number; expenses: number; profit: number }> = {};

    monthlyOrders?.forEach((order: any) => {
      const month = order.created_at.substring(0, 7); // YYYY-MM
      if (!monthlyData[month]) {
        monthlyData[month] = { revenue: 0, expenses: 0, profit: 0 };
      }
      monthlyData[month].revenue += parseFloat(order.total_amount || 0);
    });

    monthlyExpenses?.forEach((expense: any) => {
      const month = expense.date.substring(0, 7); // YYYY-MM
      if (!monthlyData[month]) {
        monthlyData[month] = { revenue: 0, expenses: 0, profit: 0 };
      }
      monthlyData[month].expenses += parseFloat(expense.amount || 0);
    });

    // Calculate profit for each month
    Object.keys(monthlyData).forEach((month) => {
      monthlyData[month].profit = monthlyData[month].revenue - monthlyData[month].expenses;
    });

    // Convert to array and sort by month
    const monthlyTrends = Object.entries(monthlyData)
      .map(([month, data]) => ({
        month,
        revenue: data.revenue,
        expenses: data.expenses,
        profit: data.profit,
      }))
      .sort((a, b) => a.month.localeCompare(b.month));

    return NextResponse.json({
      success: true,
      summary: {
        dateRange: {
          start: effectiveStartDate,
          end: effectiveEndDate,
        },
        revenue: {
          total: totalRevenue,
          ordersCount: totalOrders,
          averageOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
        },
        expenses: {
          total: totalExpenses,
          byCategory: expensesByCategory,
        },
        profitLoss: {
          amount: profitLoss,
          margin: profitMargin,
          isProfit: profitLoss >= 0,
        },
        trends: monthlyTrends,
      },
    });
  } catch (error) {
    console.error('Error in GET /api/admin/accounting/summary:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
