'use client';

import { useState, useEffect } from 'react';
import DatePicker from '@/components/products/DatePicker';

interface AccountingSummaryProps {
  refreshTrigger: number;
}

interface SummaryData {
  dateRange: {
    start: string;
    end: string;
  };
  revenue: {
    total: number;
    ordersCount: number;
    averageOrderValue: number;
  };
  expenses: {
    total: number;
    byCategory: Record<string, number>;
  };
  profitLoss: {
    amount: number;
    margin: number;
    isProfit: boolean;
  };
  trends: Array<{
    month: string;
    revenue: number;
    expenses: number;
    profit: number;
  }>;
}

const CATEGORY_LABELS: Record<string, string> = {
  ingredients: '🥚 Ingredients',
  utilities: '⚡ Utilities',
  labor: '👨‍🍳 Labor',
  supplies: '📦 Supplies',
  marketing: '📢 Marketing',
  rent: '🏠 Rent',
  other: '📌 Other',
};

const CATEGORY_COLORS: Record<string, string> = {
  ingredients: 'bg-amber-500',
  utilities: 'bg-yellow-500',
  labor: 'bg-blue-500',
  supplies: 'bg-green-500',
  marketing: 'bg-purple-500',
  rent: 'bg-red-500',
  other: 'bg-gray-500',
};

export default function AccountingSummary({ refreshTrigger }: AccountingSummaryProps) {
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState<'month' | 'quarter' | 'year' | 'custom'>('month');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedStartDate, setSelectedStartDate] = useState<Date | undefined>(undefined);
  const [selectedEndDate, setSelectedEndDate] = useState<Date | undefined>(undefined);

  const fetchSummary = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      
      // Calculate date range based on selection
      const now = new Date();
      let start = '';
      let end = '';

      switch (dateRange) {
        case 'month':
          start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
          end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
          break;
        case 'quarter':
          const quarter = Math.floor(now.getMonth() / 3);
          start = new Date(now.getFullYear(), quarter * 3, 1).toISOString().split('T')[0];
          end = new Date(now.getFullYear(), (quarter + 1) * 3, 0).toISOString().split('T')[0];
          break;
        case 'year':
          start = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];
          end = new Date(now.getFullYear(), 11, 31).toISOString().split('T')[0];
          break;
        case 'custom':
          start = startDate;
          end = endDate;
          break;
      }

      if (start) params.append('startDate', start);
      if (end) params.append('endDate', end);

      const response = await fetch(`/api/admin/accounting/summary?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setSummary(data.summary);
      }
    } catch (error) {
      console.error('Error fetching accounting summary:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, [refreshTrigger, dateRange, startDate, endDate]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-CH', {
      style: 'currency',
      currency: 'CHF',
    }).format(amount);
  };

  const formatMonth = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    return new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('en-US', {
      month: 'short',
      year: 'numeric',
    });
  };

  const handleStartDateChange = (date: Date | undefined) => {
    setSelectedStartDate(date);
    if (date) {
      const dateStr = date.toISOString().split('T')[0];
      setStartDate(dateStr);
    } else {
      setStartDate('');
    }
  };

  const handleEndDateChange = (date: Date | undefined) => {
    setSelectedEndDate(date);
    if (date) {
      const dateStr = date.toISOString().split('T')[0];
      setEndDate(dateStr);
    } else {
      setEndDate('');
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brown-500"></div>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="text-center py-12">
        <p className="text-charcoal-600">No data available</p>
      </div>
    );
  }

  const totalExpenses = summary.expenses.total;
  const expenseCategories = Object.entries(summary.expenses.byCategory);

  return (
    <div className="space-y-6">
      {/* Date Range Selector */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="flex flex-wrap items-center gap-4">
          <label className="font-medium text-charcoal-700">Period:</label>
          <div className="flex gap-2">
            {(['month', 'quarter', 'year', 'custom'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setDateRange(range)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  dateRange === range
                    ? 'bg-brown-500 text-white'
                    : 'bg-cream-100 text-charcoal-700 hover:bg-cream-200'
                }`}
              >
                {range.charAt(0).toUpperCase() + range.slice(1)}
              </button>
            ))}
          </div>
          
          {dateRange === 'custom' && (
            <div className="flex gap-4 items-center ml-4">
              <div className="w-64">
                <DatePicker
                  selectedDate={selectedStartDate}
                  onDateChange={handleStartDateChange}
                  locale="en"
                  minDate={new Date(2020, 0, 1)}
                />
              </div>
              <span className="text-charcoal-600 font-medium">to</span>
              <div className="w-64">
                <DatePicker
                  selectedDate={selectedEndDate}
                  onDateChange={handleEndDateChange}
                  locale="en"
                  minDate={selectedStartDate || new Date(2020, 0, 1)}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Revenue */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-charcoal-600">Revenue</p>
            <span className="text-2xl">💰</span>
          </div>
          <p className="text-3xl font-bold text-green-600">
            {formatCurrency(summary.revenue.total)}
          </p>
          <p className="text-sm text-charcoal-500 mt-1">
            {summary.revenue.ordersCount} orders
          </p>
        </div>

        {/* Expenses */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-charcoal-600">Expenses</p>
            <span className="text-2xl">💸</span>
          </div>
          <p className="text-3xl font-bold text-red-600">
            {formatCurrency(summary.expenses.total)}
          </p>
          <p className="text-sm text-charcoal-500 mt-1">
            {expenseCategories.length} categories
          </p>
        </div>

        {/* Profit/Loss */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-charcoal-600">
              {summary.profitLoss.isProfit ? 'Profit' : 'Loss'}
            </p>
            <span className="text-2xl">
              {summary.profitLoss.isProfit ? '📈' : '📉'}
            </span>
          </div>
          <p
            className={`text-3xl font-bold ${
              summary.profitLoss.isProfit ? 'text-green-600' : 'text-red-600'
            }`}
          >
            {formatCurrency(Math.abs(summary.profitLoss.amount))}
          </p>
          <p className="text-sm text-charcoal-500 mt-1">
            {summary.profitLoss.margin.toFixed(1)}% margin
          </p>
        </div>

        {/* Average Order Value */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-charcoal-600">Avg Order Value</p>
            <span className="text-2xl">🎂</span>
          </div>
          <p className="text-3xl font-bold text-brown-600">
            {formatCurrency(summary.revenue.averageOrderValue)}
          </p>
          <p className="text-sm text-charcoal-500 mt-1">per order</p>
        </div>
      </div>

      {/* Expenses Breakdown */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <h3 className="text-xl font-bold text-charcoal-900 mb-4">
          Expenses by Category
        </h3>
        
        {expenseCategories.length > 0 ? (
          <div className="space-y-4">
            {expenseCategories
              .sort((a, b) => b[1] - a[1])
              .map(([category, amount]) => {
                const percentage = totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0;
                return (
                  <div key={category}>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-charcoal-700">
                        {CATEGORY_LABELS[category] || category}
                      </span>
                      <span className="text-sm font-bold text-charcoal-900">
                        {formatCurrency(amount)} ({percentage.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="w-full bg-cream-100 rounded-full h-2">
                      <div
                        className={`${
                          CATEGORY_COLORS[category] || 'bg-gray-500'
                        } h-2 rounded-full transition-all`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        ) : (
          <p className="text-center text-charcoal-500 py-8">
            No expenses recorded yet
          </p>
        )}
      </div>

      {/* Monthly Trends */}
      {summary.trends.length > 0 && (
        <div className="bg-white rounded-xl shadow-md p-6">
          <h3 className="text-xl font-bold text-charcoal-900 mb-4">
            Monthly Trends (Last 6 Months)
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-cream-200">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-charcoal-700">
                    Month
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-charcoal-700">
                    Revenue
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-charcoal-700">
                    Expenses
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-charcoal-700">
                    Profit/Loss
                  </th>
                </tr>
              </thead>
              <tbody>
                {summary.trends.map((trend) => (
                  <tr key={trend.month} className="border-b border-cream-100">
                    <td className="py-3 px-4 text-sm text-charcoal-900">
                      {formatMonth(trend.month)}
                    </td>
                    <td className="text-right py-3 px-4 text-sm font-medium text-green-600">
                      {formatCurrency(trend.revenue)}
                    </td>
                    <td className="text-right py-3 px-4 text-sm font-medium text-red-600">
                      {formatCurrency(trend.expenses)}
                    </td>
                    <td
                      className={`text-right py-3 px-4 text-sm font-bold ${
                        trend.profit >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {formatCurrency(trend.profit)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
