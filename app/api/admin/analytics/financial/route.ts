import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import {
  RAMENNAYA_CLIENT_ID,
  DIVORAA_CLIENT_ID,
  VITRINA_CLIENT_ID,
} from '@/lib/constants/quick-sale-clients';

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
 * Returns comprehensive financial analytics.
 * Breakdown cards (expenses by category, revenue by mixed channels) support filters via query params:
 * - breakdownFilter: 'month' | 'year' | 'last_year' | 'period'
 * - breakdownDateFrom, breakdownDateTo: YYYY-MM-DD (required when breakdownFilter='period')
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const breakdownFilter =
      (searchParams.get('breakdownFilter') as 'month' | 'year' | 'last_year' | 'period') || 'month';
    const breakdownDateFrom = searchParams.get('breakdownDateFrom');
    const breakdownDateTo = searchParams.get('breakdownDateTo');

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

    // Breakdown date range based on filter
    let breakdownStart: string;
    let breakdownEnd: string;
    const m = now.getMonth();
    const y = now.getFullYear();

    if (breakdownFilter === 'period' && breakdownDateFrom && breakdownDateTo) {
      breakdownStart = breakdownDateFrom;
      breakdownEnd = breakdownDateTo;
    } else if (breakdownFilter === 'month') {
      breakdownStart = `${y}-${String(m + 1).padStart(2, '0')}-01`;
      breakdownEnd = new Date(y, m + 1, 0).toISOString().split('T')[0];
    } else if (breakdownFilter === 'year') {
      breakdownStart = `${y}-01-01`;
      breakdownEnd = `${y}-12-31`;
    } else if (breakdownFilter === 'last_year') {
      breakdownStart = `${y - 1}-01-01`;
      breakdownEnd = `${y - 1}-12-31`;
    } else {
      // default month
      breakdownStart = `${y}-${String(m + 1).padStart(2, '0')}-01`;
      breakdownEnd = new Date(y, m + 1, 0).toISOString().split('T')[0];
    }

    // Expense breakdown by category (filtered by breakdown range)
    const breakdownExpenses = allTransactions.filter(
      (t) =>
        t.type === 'expense' &&
        t.date >= breakdownStart &&
        t.date <= breakdownEnd
    );
    const expensesByCategory: Record<string, number> = {};
    breakdownExpenses.forEach((t) => {
      const category = t.expense_category || 'other';
      expensesByCategory[category] =
        (expensesByCategory[category] || 0) + parseFloat(t.amount || '0');
    });

    // Revenue by mixed channels (website, ramen, divoraa+walkins) - filtered by breakdown range
    const breakdownRevenue = allTransactions.filter(
      (t) =>
        t.type === 'revenue' &&
        t.date >= breakdownStart &&
        t.date <= breakdownEnd
    );

    let website = 0;
    let ramen = 0;
    let divoraa = 0;
    let vitrina = 0;
    let directContact = 0;

    breakdownRevenue.forEach((t) => {
      const amt = parseFloat(t.amount || '0');
      const clientId = t.client_id;
      const channel = (t.channel || '').toLowerCase();

      if (clientId === RAMENNAYA_CLIENT_ID) {
        ramen += amt;
      } else if (channel === 'website') {
        website += amt;
      } else if (channel === 'divoraa' || clientId === DIVORAA_CLIENT_ID) {
        divoraa += amt;
      } else if (channel === 'walk_in' || clientId === VITRINA_CLIENT_ID) {
        vitrina += amt;
      } else {
        // Phone, WhatsApp, Instagram, Email, etc.
        directContact += amt;
      }
    });

    const revenueTotal = website + ramen + divoraa + vitrina + directContact;
    const websitePercent = revenueTotal > 0 ? (website / revenueTotal) * 100 : 0;

    const revenueByMixedChannels = {
      total: parseFloat(revenueTotal.toFixed(2)),
      website: parseFloat(website.toFixed(2)),
      websitePercent: parseFloat(websitePercent.toFixed(1)),
      ramen: parseFloat(ramen.toFixed(2)),
      divoraa: parseFloat(divoraa.toFixed(2)),
      vitrina: parseFloat(vitrina.toFixed(2)),
      directContact: parseFloat(directContact.toFixed(2)),
      breakdownStart,
      breakdownEnd,
      breakdownFilter,
    };

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
        revenueByMixedChannels,
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
