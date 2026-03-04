'use client';

import { useState, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  CreditCard,
  PieChart,
  Calendar,
  Minus,
} from 'lucide-react';
import DatePicker from '@/components/products/DatePicker';

type BreakdownFilter = 'month' | 'year' | 'last_year' | 'period';

interface RevenueByMixedChannels {
  total: number;
  website: number;
  websitePercent: number;
  ramen: number;
  divoraa: number;
  vitrina: number;
  directContact: number;
  breakdownStart: string;
  breakdownEnd: string;
  breakdownFilter: string;
}

interface FinancialData {
  currentYear: {
    year: number;
    revenue: number;
    expenses: number;
    profit: number;
    profitMargin: number;
  };
  previousYear: {
    year: number;
    revenue: number;
    expenses: number;
    profit: number;
    profitMargin: number;
  };
  yoyGrowth: {
    revenue: number;
    expenses: number;
    profit: number;
  };
  last6Months: Array<{
    month: string;
    revenue: number;
    expenses: number;
    profit: number;
  }>;
  last4Weeks: Array<{
    week: string;
    revenue: number;
    expenses: number;
    profit: number;
  }>;
  allTime: {
    revenue: number;
    expenses: number;
    profit: number;
  };
  breakdown: {
    expensesByCategory: Array<{ category: string; amount: number }>;
    revenueByMixedChannels: RevenueByMixedChannels;
  };
}

const CUSTOM_RANGE_MIN_DATE = new Date('2000-01-01');

function getDefaultBreakdownFrom(): Date {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

const CATEGORY_LABELS: Record<string, string> = {
  ingredients: '🥚 Ингредиенты',
  utilities: '⚡ Коммунальные услуги',
  labor: '👨‍🍳 Зарплаты',
  supplies: '📦 Упаковка',
  consumables: '🧻 Расходные материалы',
  delivery: '🚗 Доставка',
  marketing: '📢 Маркетинг',
  rent: '🏠 Аренда',
  other: '📌 Другое',
};

export default function FinancialDashboard() {
  const [data, setData] = useState<FinancialData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<'6months' | '4weeks'>('6months');
  const [breakdownFilter, setBreakdownFilter] = useState<BreakdownFilter>('month');
  const [breakdownDateFrom, setBreakdownDateFrom] = useState<Date | undefined>(getDefaultBreakdownFrom);
  const [breakdownDateTo, setBreakdownDateTo] = useState<Date | undefined>(() => new Date());

  useEffect(() => {
    fetchAnalytics();
  }, [breakdownFilter, breakdownDateFrom, breakdownDateTo]);

  const fetchAnalytics = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('breakdownFilter', breakdownFilter);
      if (breakdownFilter === 'period' && breakdownDateFrom && breakdownDateTo) {
        params.set('breakdownDateFrom', breakdownDateFrom.toISOString().split('T')[0]);
        params.set('breakdownDateTo', breakdownDateTo.toISOString().split('T')[0]);
      }
      const response = await fetch(`/api/admin/analytics/financial?${params.toString()}`);
      if (response.ok) {
        const analyticsData = await response.json();
        setData(analyticsData);
      } else {
        console.error('Failed to fetch analytics');
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `CHF ${amount.toFixed(2)}`;
  };

  const formatPercentage = (value: number) => {
    const sign = value > 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}%`;
  };

  const GrowthIndicator = ({ value }: { value: number }) => {
    if (value === 0) {
      return (
        <span className="flex items-center gap-1 text-gray-600 text-sm font-semibold">
          <Minus className="w-4 h-4" />
          {formatPercentage(value)}
        </span>
      );
    }
    
    return value > 0 ? (
      <span className="flex items-center gap-1 text-green-600 text-sm font-semibold">
        <TrendingUp className="w-4 h-4" />
        {formatPercentage(value)}
      </span>
    ) : (
      <span className="flex items-center gap-1 text-red-600 text-sm font-semibold">
        <TrendingDown className="w-4 h-4" />
        {formatPercentage(value)}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brown-500"></div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-20">
        <p className="text-charcoal-600">Не удалось загрузить данные</p>
      </div>
    );
  }

  const periodData = selectedPeriod === '6months' ? data.last6Months : data.last4Weeks;

  return (
    <div className="space-y-6">
      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Revenue Card */}
        <div className="bg-white rounded-2xl shadow-md p-6 border-2 border-green-100">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-green-100 rounded-xl">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
            <GrowthIndicator value={data.yoyGrowth.revenue} />
          </div>
          <h3 className="text-sm font-semibold text-charcoal-600 mb-1">Выручка {data.currentYear.year}</h3>
          <p className="text-3xl font-bold text-charcoal-900 mb-2">{formatCurrency(data.currentYear.revenue)}</p>
          <p className="text-xs text-charcoal-500">
            {data.previousYear.year}: {formatCurrency(data.previousYear.revenue)}
          </p>
        </div>

        {/* Expenses Card */}
        <div className="bg-white rounded-2xl shadow-md p-6 border-2 border-red-100">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-red-100 rounded-xl">
              <CreditCard className="w-6 h-6 text-red-600" />
            </div>
            <GrowthIndicator value={data.yoyGrowth.expenses} />
          </div>
          <h3 className="text-sm font-semibold text-charcoal-600 mb-1">Расходы {data.currentYear.year}</h3>
          <p className="text-3xl font-bold text-charcoal-900 mb-2">{formatCurrency(data.currentYear.expenses)}</p>
          <p className="text-xs text-charcoal-500">
            {data.previousYear.year}: {formatCurrency(data.previousYear.expenses)}
          </p>
        </div>

        {/* Profit Card */}
        <div className="bg-white rounded-2xl shadow-md p-6 border-2 border-brown-100">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-brown-100 rounded-xl">
              <PieChart className="w-6 h-6 text-brown-600" />
            </div>
            <GrowthIndicator value={data.yoyGrowth.profit} />
          </div>
          <h3 className="text-sm font-semibold text-charcoal-600 mb-1">Прибыль {data.currentYear.year}</h3>
          <p className={`text-3xl font-bold mb-2 ${data.currentYear.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatCurrency(data.currentYear.profit)}
          </p>
          <p className="text-xs text-charcoal-500">
            Маржа: {data.currentYear.profitMargin.toFixed(1)}%
          </p>
        </div>
      </div>

      {/* Period Selector & Chart */}
      <div className="bg-white rounded-2xl shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-heading font-bold text-charcoal-900 flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Динамика по периодам
          </h3>
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedPeriod('6months')}
              className={`px-4 py-2 rounded-lg font-semibold text-sm transition-colors ${
                selectedPeriod === '6months'
                  ? 'bg-brown-500 text-white'
                  : 'bg-cream-100 text-charcoal-700 hover:bg-cream-200'
              }`}
            >
              Последние 6 месяцев
            </button>
            <button
              onClick={() => setSelectedPeriod('4weeks')}
              className={`px-4 py-2 rounded-lg font-semibold text-sm transition-colors ${
                selectedPeriod === '4weeks'
                  ? 'bg-brown-500 text-white'
                  : 'bg-cream-100 text-charcoal-700 hover:bg-cream-200'
              }`}
            >
              Последние 4 недели
            </button>
          </div>
        </div>

        {/* Simple Bar Chart */}
        <div className="space-y-4">
          {periodData.map((period, index) => {
            const label = selectedPeriod === '6months' 
              ? (period as any).month 
              : (period as any).week;
            const maxValue = Math.max(...periodData.map((p) => Math.max(p.revenue, p.expenses)));
            const revenueWidth = maxValue > 0 ? (period.revenue / maxValue) * 100 : 0;
            const expensesWidth = maxValue > 0 ? (period.expenses / maxValue) * 100 : 0;

            return (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-charcoal-700 w-32">{label}</span>
                  <div className="flex-1 flex gap-2 items-center">
                    <div className="flex-1 h-8 bg-cream-100 rounded-lg overflow-hidden relative">
                      <div
                        className="absolute h-full bg-green-500 transition-all duration-300 flex items-center justify-end pr-2"
                        style={{ width: `${revenueWidth}%` }}
                      >
                        {period.revenue > 0 && (
                          <span className="text-xs font-bold text-white">
                            {formatCurrency(period.revenue)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex-1 h-8 bg-cream-100 rounded-lg overflow-hidden relative">
                      <div
                        className="absolute h-full bg-red-500 transition-all duration-300 flex items-center justify-end pr-2"
                        style={{ width: `${expensesWidth}%` }}
                      >
                        {period.expenses > 0 && (
                          <span className="text-xs font-bold text-white">
                            {formatCurrency(period.expenses)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <span
                    className={`text-sm font-bold w-24 text-right ${
                      period.profit >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {formatCurrency(period.profit)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-6 mt-6 pt-6 border-t-2 border-cream-200">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-500 rounded"></div>
            <span className="text-sm font-semibold text-charcoal-700">Выручка</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-500 rounded"></div>
            <span className="text-sm font-semibold text-charcoal-700">Расходы</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-brown-500 rounded"></div>
            <span className="text-sm font-semibold text-charcoal-700">Прибыль</span>
          </div>
        </div>
      </div>

      {/* Breakdown Section */}
      <div className="space-y-4">
        {/* Shared filter for both breakdown cards */}
        <div className="bg-white rounded-2xl shadow-md p-4 border-2 border-cream-200">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-semibold text-charcoal-700">Период:</span>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setBreakdownFilter('month')}
                className={`px-3 py-1.5 rounded-lg font-semibold text-sm transition-colors ${
                  breakdownFilter === 'month'
                    ? 'bg-brown-500 text-white'
                    : 'bg-cream-100 text-charcoal-700 hover:bg-cream-200'
                }`}
              >
                Этот месяц
              </button>
              <button
                onClick={() => setBreakdownFilter('year')}
                className={`px-3 py-1.5 rounded-lg font-semibold text-sm transition-colors ${
                  breakdownFilter === 'year'
                    ? 'bg-brown-500 text-white'
                    : 'bg-cream-100 text-charcoal-700 hover:bg-cream-200'
                }`}
              >
                Этот год
              </button>
              <button
                onClick={() => setBreakdownFilter('last_year')}
                className={`px-3 py-1.5 rounded-lg font-semibold text-sm transition-colors ${
                  breakdownFilter === 'last_year'
                    ? 'bg-brown-500 text-white'
                    : 'bg-cream-100 text-charcoal-700 hover:bg-cream-200'
                }`}
              >
                Прошлый год
              </button>
              <button
                onClick={() => {
                  setBreakdownFilter('period');
                  if (!breakdownDateFrom) setBreakdownDateFrom(getDefaultBreakdownFrom());
                  if (!breakdownDateTo) setBreakdownDateTo(new Date());
                }}
                className={`px-3 py-1.5 rounded-lg font-semibold text-sm transition-colors ${
                  breakdownFilter === 'period'
                    ? 'bg-brown-500 text-white'
                    : 'bg-cream-100 text-charcoal-700 hover:bg-cream-200'
                }`}
              >
                Период
              </button>
              {breakdownFilter === 'period' && (
                <div className="flex flex-wrap items-end gap-2 ml-2">
                  <div className="w-44">
                    <DatePicker
                      selectedDate={breakdownDateFrom}
                      onDateChange={setBreakdownDateFrom}
                      locale="ru"
                      minDate={CUSTOM_RANGE_MIN_DATE}
                      label="С"
                      placeholder="С даты"
                      showHelperText={false}
                    />
                  </div>
                  <div className="w-44">
                    <DatePicker
                      selectedDate={breakdownDateTo}
                      onDateChange={setBreakdownDateTo}
                      locale="ru"
                      minDate={breakdownDateFrom ?? CUSTOM_RANGE_MIN_DATE}
                      label="По"
                      placeholder="По дату"
                      showHelperText={false}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Expenses by Category */}
          <div className="bg-white rounded-2xl shadow-md p-6">
            <h3 className="text-lg font-heading font-bold text-charcoal-900 mb-4">
              Расходы по категориям
            </h3>
            <div className="space-y-3">
              {data.breakdown.expensesByCategory
                .sort((a, b) => b.amount - a.amount)
                .map((item) => {
                  const total = data.breakdown.expensesByCategory.reduce((sum, i) => sum + i.amount, 0);
                  const percentage = total > 0 ? (item.amount / total) * 100 : 0;
                  return (
                    <div key={item.category} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-charcoal-700">
                          {CATEGORY_LABELS[item.category] || item.category}
                        </span>
                        <span className="text-sm font-bold text-charcoal-900">
                          {formatCurrency(item.amount)}
                        </span>
                      </div>
                      <div className="h-2 bg-cream-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-red-500 transition-all duration-300"
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              {data.breakdown.expensesByCategory.length === 0 && (
                <p className="text-sm text-charcoal-500 text-center py-4">Нет данных о расходах</p>
              )}
            </div>
          </div>

          {/* Revenue by Mixed Channels */}
          <div className="bg-white rounded-2xl shadow-md p-6">
            <h3 className="text-lg font-heading font-bold text-charcoal-900 mb-4">
              Выручка по источникам
            </h3>
            {(() => {
              const r = data.breakdown.revenueByMixedChannels;
              const total = r.total;
              const items = [
                {
                  label: '🌐 Сайт',
                  amount: r.website,
                  sublabel: total > 0 ? `${r.websitePercent}%` : null,
                },
                {
                  label: '🍜 Раменная',
                  amount: r.ramen,
                  sublabel: null,
                },
                {
                  label: '📱 Дивора',
                  amount: r.divoraa,
                  sublabel: null,
                },
                {
                  label: '🏪 Витрина',
                  amount: r.vitrina,
                  sublabel: null,
                },
                {
                  label: '📞 Прямой контакт',
                  amount: r.directContact,
                  sublabel: null,
                },
              ].filter((i) => i.amount > 0);

              if (items.length === 0) {
                return (
                  <p className="text-sm text-charcoal-500 text-center py-4">Нет данных о выручке</p>
                );
              }

              return (
                <div className="space-y-4">
                  <div className="flex items-center justify-between py-2 border-b-2 border-cream-200">
                    <span className="text-base font-bold text-charcoal-900">Всего</span>
                    <span className="text-lg font-bold text-green-600">
                      {formatCurrency(total)}
                    </span>
                  </div>
                  {items.map((item) => {
                    const percentage = total > 0 ? (item.amount / total) * 100 : 0;
                    return (
                      <div key={item.label} className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold text-charcoal-700 flex items-center gap-2">
                            {item.label}
                            {item.sublabel && (
                              <span className="text-charcoal-500 font-normal">({item.sublabel})</span>
                            )}
                          </span>
                          <span className="text-sm font-bold text-charcoal-900">
                            {formatCurrency(item.amount)}
                          </span>
                        </div>
                        <div className="h-2 bg-cream-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-green-500 transition-all duration-300"
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </div>
      </div>
    </div>
  );
}
