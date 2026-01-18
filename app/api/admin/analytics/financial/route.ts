import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

interface FinancialTransaction {
  id: string;
  type: 'revenue' | 'expense';
  date: string;
  amount: string;
  currency: string;
  description: string;
  source_type: string;
  source_id: string | null;
  client_id: string | null;
  payment_method: string | null;
  channel: string | null;
  expense_category: string | null;
  receipt_url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * GET /api/admin/analytics/financial
 * 
 * Returns comprehensive financial analytics:
 * - Current year vs previous year totals
 * - Last 6 months breakdown
 * - Last 4 weeks breakdown
 * - Overall metrics
 */
export async function GET(request: NextRequest) {
  try {
    const now = new Date();
    const currentYear = now.getFullYear();
    const previousYear = currentYear - 1;

    // Date ranges
    const currentYearStart = `${currentYear}-01-01`;
    const currentYearEnd = `${currentYear}-12-31`;
    const previousYearStart = `${previousYear}-01-01`;
    const previousYearEnd = `${previousYear}-12-31`;

    // Last 6 months
    const sixMonthsAgo = new Date(now);
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const sixMonthsAgoStr = sixMonthsAgo.toISOString().split('T')[0];

    // Last 4 weeks
    const fourWeeksAgo = new Date(now);
    fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
    const fourWeeksAgoStr = fourWeeksAgo.toISOString().split('T')[0];

    // Fetch all financial transactions
    const { data: transactions, error } = await supabaseAdmin
      .from('financial_transactions')
      .select('*')
      .order('date', { ascending: false });

    if (error) {
      console.error('Error fetching transactions:', error);
      return NextResponse.json(
        { error: 'Failed to fetch financial data' },
        { status: 500 }
      );
    }

    const allTransactions: FinancialTransaction[] = (transactions || []) as FinancialTransaction[];

    // Helper function to calculate totals
    const calculateTotals = (items: FinancialTransaction[], startDate: string, endDate: string) => {
      const filtered = items.filter(
        (t) => t.date >= startDate && t.date <= endDate
      );
      const revenue = filtered
        .filter((t) => t.type === 'revenue')
        .reduce((sum, t) => sum + parseFloat(t.amount || '0'), 0);
      const expenses = filtered
        .filter((t) => t.type === 'expense')
        .reduce((sum, t) => sum + parseFloat(t.amount || '0'), 0);
      const profit = revenue - expenses;

      return {
        revenue: parseFloat(revenue.toFixed(2)),
        expenses: parseFloat(expenses.toFixed(2)),
        profit: parseFloat(profit.toFixed(2)),
        profitMargin: revenue > 0 ? parseFloat(((profit / revenue) * 100).toFixed(2)) : 0,
      };
    };

    // Current year totals
    const currentYearTotals = calculateTotals(
      allTransactions,
      currentYearStart,
      currentYearEnd
    );

    // Previous year totals
    const previousYearTotals = calculateTotals(
      allTransactions,
      previousYearStart,
      previousYearEnd
    );

    // Year-over-year growth
    const yoyGrowth = {
      revenue:
        previousYearTotals.revenue > 0
          ? parseFloat(
              (
                ((currentYearTotals.revenue - previousYearTotals.revenue) /
                  previousYearTotals.revenue) *
                100
              ).toFixed(2)
            )
          : 0,
      expenses:
        previousYearTotals.expenses > 0
          ? parseFloat(
              (
                ((currentYearTotals.expenses - previousYearTotals.expenses) /
                  previousYearTotals.expenses) *
                100
              ).toFixed(2)
            )
          : 0,
      profit:
        previousYearTotals.profit > 0 && previousYearTotals.profit !== 0
          ? parseFloat(
              (
                ((currentYearTotals.profit - previousYearTotals.profit) /
                  Math.abs(previousYearTotals.profit)) *
                100
              ).toFixed(2)
            )
          : 0,
    };

    // Last 6 months breakdown
    const last6Months = [];
    for (let i = 5; i >= 0; i--) {
      const monthDate = new Date(now);
      monthDate.setMonth(monthDate.getMonth() - i);
      const year = monthDate.getFullYear();
      const month = monthDate.getMonth() + 1;
      const monthStr = month.toString().padStart(2, '0');
      const startDate = `${year}-${monthStr}-01`;
      const endDate = new Date(year, month, 0).toISOString().split('T')[0];

      const totals = calculateTotals(allTransactions, startDate, endDate);
      last6Months.push({
        month: monthDate.toLocaleDateString('en-US', {
          month: 'short',
          year: 'numeric',
        }),
        monthNum: month,
        year,
        ...totals,
      });
    }

    // Last 4 weeks breakdown
    const last4Weeks = [];
    for (let i = 3; i >= 0; i--) {
      const weekEnd = new Date(now);
      weekEnd.setDate(weekEnd.getDate() - i * 7);
      const weekStart = new Date(weekEnd);
      weekStart.setDate(weekStart.getDate() - 6);

      const startDate = weekStart.toISOString().split('T')[0];
      const endDate = weekEnd.toISOString().split('T')[0];

      const totals = calculateTotals(allTransactions, startDate, endDate);
      last4Weeks.push({
        week: `${weekStart.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        })} - ${weekEnd.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        })}`,
        startDate,
        endDate,
        ...totals,
      });
    }

    // Overall metrics (all time)
    const allTimeRevenue = allTransactions
      .filter((t) => t.type === 'revenue')
      .reduce((sum, t) => sum + parseFloat(t.amount || '0'), 0);
    const allTimeExpenses = allTransactions
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + parseFloat(t.amount || '0'), 0);
    const allTimeProfit = allTimeRevenue - allTimeExpenses;

    // Expense breakdown by category (current year)
    const currentYearExpenses = allTransactions.filter(
      (t) =>
        t.type === 'expense' &&
        t.date >= currentYearStart &&
        t.date <= currentYearEnd
    );
    const expensesByCategory: Record<string, number> = {};
    currentYearExpenses.forEach((t) => {
      const category = t.expense_category || 'other';
      expensesByCategory[category] =
        (expensesByCategory[category] || 0) + parseFloat(t.amount || '0');
    });

    // Revenue by channel (current year)
    const currentYearRevenue = allTransactions.filter(
      (t) =>
        t.type === 'revenue' &&
        t.date >= currentYearStart &&
        t.date <= currentYearEnd
    );
    const revenueByChannel: Record<string, number> = {};
    currentYearRevenue.forEach((t) => {
      const channel = t.channel || 'other';
      revenueByChannel[channel] =
        (revenueByChannel[channel] || 0) + parseFloat(t.amount || '0');
    });

    return NextResponse.json({
      currentYear: {
        year: currentYear,
        ...currentYearTotals,
      },
      previousYear: {
        year: previousYear,
        ...previousYearTotals,
      },
      yoyGrowth,
      last6Months,
      last4Weeks,
      allTime: {
        revenue: parseFloat(allTimeRevenue.toFixed(2)),
        expenses: parseFloat(allTimeExpenses.toFixed(2)),
        profit: parseFloat(allTimeProfit.toFixed(2)),
      },
      breakdown: {
        expensesByCategory: Object.entries(expensesByCategory).map(([category, amount]) => ({
          category,
          amount: parseFloat(amount.toFixed(2)),
        })),
        revenueByChannel: Object.entries(revenueByChannel).map(([channel, amount]) => ({
          channel,
          amount: parseFloat(amount.toFixed(2)),
        })),
      },
    });
  } catch (error) {
    console.error('Error in financial analytics:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
