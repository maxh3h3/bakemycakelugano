'use client';

import { useState, useEffect } from 'react';
import { DollarSign, Search, Calendar, Plus } from 'lucide-react';

interface Revenue {
  id: string;
  date: string;
  amount: string;
  currency: string;
  description: string;
  source_type: string;
  source_id: string | null;
  client_id: string | null;
  payment_method: string | null;
  channel: string | null;
  notes: string | null;
  created_at: string;
}

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

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: '💵 Наличные',
  stripe: '💳 Карта (Stripe)',
  twint: '💳 Twint',
};

export default function RevenuesTable() {
  const [revenues, setRevenues] = useState<Revenue[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [channelFilter, setChannelFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'month' | 'year'>('month');

  useEffect(() => {
    fetchRevenues();
  }, []);

  const fetchRevenues = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/transactions?type=revenue&limit=500&sortBy=date&sortOrder=desc');
      if (response.ok) {
        const data = await response.json();
        setRevenues(data.transactions || []);
      }
    } catch (error) {
      console.error('Ошибка загрузки выручки:', error);
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

  // Filter revenues
  const filteredRevenues = revenues.filter((revenue) => {
    const matchesSearch =
      revenue.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (revenue.notes && revenue.notes.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesChannel = channelFilter === 'all' || revenue.channel === channelFilter;

    let matchesDate = true;
    if (dateFilter === 'month') {
      const revenueDate = new Date(revenue.date);
      const now = new Date();
      const oneMonthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
      matchesDate = revenueDate >= oneMonthAgo;
    } else if (dateFilter === 'year') {
      const revenueDate = new Date(revenue.date);
      const currentYear = new Date().getFullYear();
      matchesDate = revenueDate.getFullYear() === currentYear;
    }

    return matchesSearch && matchesChannel && matchesDate;
  });

  // Calculate total
  const totalRevenue = filteredRevenues.reduce((sum, r) => sum + parseFloat(r.amount), 0);

  // Get unique channels from data
  const uniqueChannels = Array.from(new Set(revenues.map((r) => r.channel).filter(Boolean)));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brown-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <div className="bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-200 rounded-2xl p-6 shadow-md">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-green-700 mb-2">Общая выручка</p>
            <p className="text-4xl font-bold text-green-600">{formatCurrency(totalRevenue.toFixed(2))}</p>
            <p className="text-xs text-green-600 mt-2">
              {filteredRevenues.length} транзакц{filteredRevenues.length === 1 ? 'ия' : filteredRevenues.length < 5 ? 'ии' : 'ий'}
            </p>
          </div>
          <div className="p-4 bg-green-200 rounded-2xl">
            <DollarSign className="w-12 h-12 text-green-600" />
          </div>
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

          {/* Channel Filter */}
          <div>
            <select
              value={channelFilter}
              onChange={(e) => setChannelFilter(e.target.value)}
              className="px-4 py-2 border-2 border-cream-300 rounded-lg focus:border-brown-500 focus:outline-none font-semibold text-sm"
            >
              <option value="all">Все каналы</option>
              {uniqueChannels.map((channel) => (
                <option key={channel} value={channel || 'other'}>
                  {CHANNEL_LABELS[channel || 'other'] || channel}
                </option>
              ))}
            </select>
          </div>

          {/* Date Filter */}
          <div className="flex gap-2">
            <button
              onClick={() => setDateFilter('all')}
              className={`px-4 py-2 rounded-lg font-semibold text-sm transition-colors ${
                dateFilter === 'all'
                  ? 'bg-brown-500 text-white'
                  : 'bg-cream-100 text-charcoal-700 hover:bg-cream-200'
              }`}
            >
              Все время
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
          </div>
        </div>
      </div>

      {/* Revenues Table */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-cream-100 border-b-2 border-cream-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold text-charcoal-700 uppercase tracking-wider">
                  Дата
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-charcoal-700 uppercase tracking-wider">
                  Описание
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-charcoal-700 uppercase tracking-wider">
                  Канал
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-charcoal-700 uppercase tracking-wider">
                  Способ оплаты
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-charcoal-700 uppercase tracking-wider">
                  Источник
                </th>
                <th className="px-6 py-3 text-right text-xs font-bold text-charcoal-700 uppercase tracking-wider">
                  Сумма
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-200">
              {filteredRevenues.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-charcoal-500">
                    Выручки не найдено
                  </td>
                </tr>
              ) : (
                filteredRevenues.map((revenue) => (
                  <tr key={revenue.id} className="hover:bg-cream-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-charcoal-400" />
                        <span className="text-sm font-medium text-charcoal-900">
                          {formatDate(revenue.date)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-semibold text-charcoal-900">
                        {revenue.description}
                      </div>
                      {revenue.notes && (
                        <div className="text-xs text-charcoal-500 mt-1">{revenue.notes}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-charcoal-700">
                        {CHANNEL_LABELS[revenue.channel || 'other'] || revenue.channel || '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-charcoal-700">
                        {revenue.payment_method
                          ? PAYMENT_METHOD_LABELS[revenue.payment_method] || revenue.payment_method
                          : '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold ${
                        revenue.source_type === 'order'
                          ? 'bg-brown-100 text-brown-700'
                          : 'bg-purple-100 text-purple-700'
                      }`}>
                        {revenue.source_type === 'order' ? '📦 Заказ' : '✍️ Вручную'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <span className="text-sm font-bold text-green-600">
                        +{formatCurrency(revenue.amount)}
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
        Показано: {filteredRevenues.length} из {revenues.length}
      </div>
    </div>
  );
}
