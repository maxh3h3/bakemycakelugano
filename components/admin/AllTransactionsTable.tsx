'use client';

import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Search, Filter, Calendar } from 'lucide-react';

interface Transaction {
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
  created_at: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  ingredients: '🥚 Ингредиенты',
  utilities: '⚡ Коммунальные услуги',
  labor: '👨‍🍳 Зарплаты',
  supplies: '📦 Упаковка',
  equipment: '🔧 Оборудование',
  delivery: '🚗 Доставка',
  marketing: '📢 Маркетинг',
  rent: '🏠 Аренда',
  other: '📌 Другое',
};

const CHANNEL_LABELS: Record<string, string> = {
  website: '🌐 Сайт',
  whatsapp: '💬 WhatsApp',
  phone: '📞 Телефон',
  walk_in: '🏪 В магазине',
  instagram: '📸 Instagram',
  email: '📧 Email',
  manual: '✍️ Вручную',
  other: '📌 Другое',
};

export default function AllTransactionsTable() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'revenue' | 'expense'>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'week' | 'month' | 'year'>('month');

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/transactions?limit=500&sortBy=date&sortOrder=desc');
      if (response.ok) {
        const data = await response.json();
        setTransactions(data.transactions || []);
      }
    } catch (error) {
      console.error('Ошибка загрузки транзакций:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: string) => {
    return `CHF ${parseFloat(amount).toFixed(2)}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  // Helper function to get Monday of current week
  const getMondayOfCurrentWeek = () => {
    const now = new Date();
    const day = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const diff = day === 0 ? -6 : 1 - day; // Adjust if Sunday
    const monday = new Date(now);
    monday.setDate(now.getDate() + diff);
    monday.setHours(0, 0, 0, 0);
    return monday;
  };

  // Filter transactions
  const filteredTransactions = transactions.filter((transaction) => {
    const matchesSearch = transaction.description.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesType = typeFilter === 'all' || transaction.type === typeFilter;

    let matchesDate = true;
    if (dateFilter !== 'all') {
      const transactionDate = new Date(transaction.date);
      const now = new Date();
      
      if (dateFilter === 'week') {
        // Week to Date (from Monday to today)
        const monday = getMondayOfCurrentWeek();
        matchesDate = transactionDate >= monday && transactionDate <= now;
      } else if (dateFilter === 'month') {
        // Month to Date (from 1st of current month to today)
        const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        firstOfMonth.setHours(0, 0, 0, 0);
        matchesDate = transactionDate >= firstOfMonth && transactionDate <= now;
      } else if (dateFilter === 'year') {
        // Current year (effectively YTD since future dates don't exist)
        const currentYear = now.getFullYear();
        matchesDate = transactionDate.getFullYear() === currentYear;
      }
    }

    return matchesSearch && matchesType && matchesDate;
  });

  // Calculate totals
  const totalRevenue = filteredTransactions
    .filter((t) => t.type === 'revenue')
    .reduce((sum, t) => sum + parseFloat(t.amount), 0);
  const totalExpenses = filteredTransactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + parseFloat(t.amount), 0);
  const netProfit = totalRevenue - totalExpenses;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brown-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4">
          <p className="text-sm font-semibold text-green-700 mb-1">Выручка</p>
          <p className="text-2xl font-bold text-green-600">{formatCurrency(totalRevenue.toFixed(2))}</p>
        </div>
        <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4">
          <p className="text-sm font-semibold text-red-700 mb-1">Расходы</p>
          <p className="text-2xl font-bold text-red-600">{formatCurrency(totalExpenses.toFixed(2))}</p>
        </div>
        <div className={`border-2 rounded-xl p-4 ${netProfit >= 0 ? 'bg-brown-50 border-brown-200' : 'bg-red-50 border-red-200'}`}>
          <p className={`text-sm font-semibold mb-1 ${netProfit >= 0 ? 'text-brown-700' : 'text-red-700'}`}>
            Прибыль
          </p>
          <p className={`text-2xl font-bold ${netProfit >= 0 ? 'text-brown-600' : 'text-red-600'}`}>
            {formatCurrency(netProfit.toFixed(2))}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-md p-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-charcoal-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Поиск по описанию..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border-2 border-cream-300 rounded-lg focus:border-brown-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Type Filter */}
          <div className="flex gap-2">
            <button
              onClick={() => setTypeFilter('all')}
              className={`px-4 py-2 rounded-lg font-semibold text-sm transition-colors ${
                typeFilter === 'all'
                  ? 'bg-brown-500 text-white'
                  : 'bg-cream-100 text-charcoal-700 hover:bg-cream-200'
              }`}
            >
              Все
            </button>
            <button
              onClick={() => setTypeFilter('revenue')}
              className={`px-4 py-2 rounded-lg font-semibold text-sm transition-colors ${
                typeFilter === 'revenue'
                  ? 'bg-green-500 text-white'
                  : 'bg-cream-100 text-charcoal-700 hover:bg-cream-200'
              }`}
            >
              Выручка
            </button>
            <button
              onClick={() => setTypeFilter('expense')}
              className={`px-4 py-2 rounded-lg font-semibold text-sm transition-colors ${
                typeFilter === 'expense'
                  ? 'bg-red-500 text-white'
                  : 'bg-cream-100 text-charcoal-700 hover:bg-cream-200'
              }`}
            >
              Расходы
            </button>
          </div>

          {/* Date Filter */}
          <div className="flex gap-2">
            <button
              onClick={() => setDateFilter('week')}
              className={`px-4 py-2 rounded-lg font-semibold text-sm transition-colors ${
                dateFilter === 'week'
                  ? 'bg-brown-500 text-white'
                  : 'bg-cream-100 text-charcoal-700 hover:bg-cream-200'
              }`}
            >
              Неделя
            </button>
            <button
              onClick={() => setDateFilter('month')}
              className={`px-4 py-2 rounded-lg font-semibold text-sm transition-colors ${
                dateFilter === 'month'
                  ? 'bg-brown-500 text-white'
                  : 'bg-cream-100 text-charcoal-700 hover:bg-cream-200'
              }`}
            >
              Месяц
            </button>
            <button
              onClick={() => setDateFilter('year')}
              className={`px-4 py-2 rounded-lg font-semibold text-sm transition-colors ${
                dateFilter === 'year'
                  ? 'bg-brown-500 text-white'
                  : 'bg-cream-100 text-charcoal-700 hover:bg-cream-200'
              }`}
            >
              Год
            </button>
            <button
              onClick={() => setDateFilter('all')}
              className={`px-4 py-2 rounded-lg font-semibold text-sm transition-colors ${
                dateFilter === 'all'
                  ? 'bg-brown-500 text-white'
                  : 'bg-cream-100 text-charcoal-700 hover:bg-cream-200'
              }`}
            >
              Все
            </button>
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-cream-100 border-b-2 border-cream-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold text-charcoal-700 uppercase tracking-wider">
                  Дата
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-charcoal-700 uppercase tracking-wider">
                  Тип
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-charcoal-700 uppercase tracking-wider">
                  Описание
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-charcoal-700 uppercase tracking-wider">
                  Категория/Канал
                </th>
                <th className="px-6 py-3 text-right text-xs font-bold text-charcoal-700 uppercase tracking-wider">
                  Сумма
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-200">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-charcoal-500">
                    Транзакций не найдено
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((transaction) => (
                  <tr key={transaction.id} className="hover:bg-cream-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-charcoal-400" />
                        <span className="text-sm font-medium text-charcoal-900">
                          {formatDate(transaction.date)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {transaction.type === 'revenue' ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700">
                          <TrendingUp className="w-3 h-3" />
                          Выручка
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700">
                          <TrendingDown className="w-3 h-3" />
                          Расход
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-semibold text-charcoal-900">
                        {transaction.description}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-charcoal-700">
                        {transaction.type === 'expense'
                          ? CATEGORY_LABELS[transaction.expense_category || 'other'] ||
                            transaction.expense_category
                          : CHANNEL_LABELS[transaction.channel || 'other'] || transaction.channel}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <span
                        className={`text-sm font-bold ${
                          transaction.type === 'revenue' ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        {transaction.type === 'revenue' ? '+' : '-'}
                        {formatCurrency(transaction.amount)}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Results Count */}
      <div className="text-center text-sm text-charcoal-600">
        Показано транзакций: {filteredTransactions.length} из {transactions.length}
      </div>
    </div>
  );
}
