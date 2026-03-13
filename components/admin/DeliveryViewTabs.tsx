'use client';

import { useState } from 'react';
import type { Database } from '@/lib/supabase/types';
import { parseDateFromDB, formatDateForDB, extractTimeForSorting } from '@/lib/utils';
import { formatDeliveryAddress, type DeliveryAddress } from '@/lib/schemas/delivery';
import PaymentToggle from '@/components/admin/PaymentToggle';
import {
  ArrowUp,
  ArrowDown,
  Truck,
  ShoppingBag,
  Clock,
} from 'lucide-react';

type Order = Database['public']['Tables']['orders']['Row'];
type OrderItem = Database['public']['Tables']['order_items']['Row'];
type Client = Database['public']['Tables']['clients']['Row'];

interface OrderWithItems extends Order {
  order_items: OrderItem[];
  client: Client | null;
}

interface DeliveryViewTabsProps {
  orders: OrderWithItems[];
}

type TimeTab = 'today' | 'tomorrow' | 'week';
type PaymentFilter = 'all' | 'paid' | 'unpaid';
type TypeFilter = 'all' | 'delivery' | 'pickup';

export default function DeliveryViewTabs({ orders: initialOrders }: DeliveryViewTabsProps) {
  const [orders, setOrders] = useState<OrderWithItems[]>(initialOrders);
  const [activeTab, setActiveTab] = useState<TimeTab>('today');
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>('all');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());

  const today = new Date();
  const todayStr = formatDateForDB(today);
  const tomorrowDate = new Date(today);
  tomorrowDate.setDate(today.getDate() + 1);
  const tomorrowStr = formatDateForDB(tomorrowDate);

  // Monday–Sunday of current week
  const getWeekRange = () => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - daysFromMonday);
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);
    return { weekStart, weekEnd };
  };

  const getFilteredOrders = (): OrderWithItems[] => {
    let filtered = orders.filter((o) => {
      if (!o.delivery_date) return false;

      // Time tab filter
      if (activeTab === 'today') {
        if (o.delivery_date !== todayStr) return false;
      } else if (activeTab === 'tomorrow') {
        if (o.delivery_date !== tomorrowStr) return false;
      } else {
        const { weekStart, weekEnd } = getWeekRange();
        const d = parseDateFromDB(o.delivery_date);
        if (d < weekStart || d > weekEnd) return false;
      }

      // Payment filter
      if (paymentFilter === 'paid' && !o.paid) return false;
      if (paymentFilter === 'unpaid' && o.paid) return false;

      // Type filter
      if (typeFilter === 'delivery' && o.delivery_type !== 'delivery') return false;
      if (typeFilter === 'pickup' && o.delivery_type !== 'pickup') return false;

      return true;
    });

    // Sort by time
    filtered.sort((a, b) => {
      const aDate = a.delivery_date ? parseDateFromDB(a.delivery_date).getTime() : Infinity;
      const bDate = b.delivery_date ? parseDateFromDB(b.delivery_date).getTime() : Infinity;
      const dateDiff = sortDirection === 'asc' ? aDate - bDate : bDate - aDate;
      if (dateDiff !== 0) return dateDiff;

      const aTime = extractTimeForSorting(a.delivery_time);
      const bTime = extractTimeForSorting(b.delivery_time);
      if (aTime !== null && bTime !== null) {
        return sortDirection === 'asc' ? aTime - bTime : bTime - aTime;
      }
      if (aTime !== null) return -1;
      if (bTime !== null) return 1;
      return 0;
    });

    return filtered;
  };

  const handleTogglePaid = async (order: OrderWithItems) => {
    const isPaid = order.paid;
    const id = order.id;
    setLoadingIds((prev) => new Set(prev).add(id));

    try {
      const endpoint = isPaid
        ? `/api/admin/orders/${id}/mark-unpaid`
        : `/api/admin/orders/${id}/mark-paid`;

      const body = isPaid ? {} : { payment_method: 'cash' };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to update payment status');
      }

      // Optimistic update
      setOrders((prev) =>
        prev.map((o) =>
          o.id === id
            ? { ...o, paid: !isPaid, payment_method: isPaid ? o.payment_method : 'cash' }
            : o
        )
      );
    } catch (error) {
      console.error('Error toggling payment:', error);
      alert(error instanceof Error ? error.message : 'Ошибка обновления статуса оплаты');
    } finally {
      setLoadingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('de-CH', { style: 'currency', currency: 'CHF' }).format(amount);

  const formatDate = (dateStr: string) => {
    const d = parseDateFromDB(dateStr);
    return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
  };

  const filteredOrders = getFilteredOrders();

  const tabs: { id: TimeTab; label: string }[] = [
    { id: 'today', label: 'Сегодня' },
    { id: 'tomorrow', label: 'Завтра' },
    { id: 'week', label: 'Эта неделя' },
  ];

  const paidOptions: { id: PaymentFilter; label: string }[] = [
    { id: 'all', label: 'Все' },
    { id: 'paid', label: 'Оплачены' },
    { id: 'unpaid', label: 'Не оплачены' },
  ];

  const typeOptions: { id: TypeFilter; label: string }[] = [
    { id: 'all', label: 'Все' },
    { id: 'delivery', label: 'Доставка' },
    { id: 'pickup', label: 'Самовывоз' },
  ];

  return (
    <div className="space-y-4">
      {/* Time Tabs */}
      <div className="bg-white rounded-2xl shadow-sm border-2 border-cream-200 p-2">
        <div className="grid grid-cols-3 gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                px-4 py-3 rounded-xl font-semibold text-sm transition-all duration-200
                ${activeTab === tab.id
                  ? 'bg-brown-500 text-white shadow-md scale-[1.02]'
                  : 'bg-cream-50 text-charcoal-700 hover:bg-cream-100'
                }
              `}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Filters Row */}
      <div className="flex flex-wrap items-center gap-3 px-1">
        {/* Sort direction */}
        <button
          onClick={() => setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'))}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl border-2 border-cream-300 bg-white text-charcoal-700 hover:bg-cream-100 transition-colors text-sm font-medium"
          title={sortDirection === 'asc' ? 'По возрастанию времени' : 'По убыванию времени'}
        >
          {sortDirection === 'asc' ? (
            <ArrowUp className="w-4 h-4" />
          ) : (
            <ArrowDown className="w-4 h-4" />
          )}
          <span className="hidden sm:inline">Время</span>
        </button>

        {/* Payment filter */}
        <div className="flex rounded-xl border-2 border-cream-300 bg-white overflow-hidden">
          {paidOptions.map((opt) => (
            <button
              key={opt.id}
              onClick={() => setPaymentFilter(opt.id)}
              className={`px-3 py-2 text-xs sm:text-sm font-medium transition-colors border-r last:border-r-0 border-cream-200 ${
                paymentFilter === opt.id
                  ? 'bg-brown-500 text-white'
                  : 'text-charcoal-600 hover:bg-cream-50'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Type filter */}
        <div className="flex rounded-xl border-2 border-cream-300 bg-white overflow-hidden">
          {typeOptions.map((opt) => (
            <button
              key={opt.id}
              onClick={() => setTypeFilter(opt.id)}
              className={`px-3 py-2 text-xs sm:text-sm font-medium transition-colors border-r last:border-r-0 border-cream-200 flex items-center gap-1.5 ${
                typeFilter === opt.id
                  ? 'bg-brown-500 text-white'
                  : 'text-charcoal-600 hover:bg-cream-50'
              }`}
            >
              {opt.id === 'delivery' && <Truck className="w-3.5 h-3.5" />}
              {opt.id === 'pickup' && <ShoppingBag className="w-3.5 h-3.5" />}
              {opt.label}
            </button>
          ))}
        </div>

        <span className="ml-auto text-sm text-charcoal-500 font-medium">
          {filteredOrders.length}{' '}
          {filteredOrders.length === 1 ? 'заказ' : 'заказов'}
        </span>
      </div>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <div className="bg-white rounded-2xl border-2 border-cream-200 p-12 text-center shadow-sm">
          <Clock className="w-12 h-12 mx-auto text-charcoal-300 mb-3" />
          <h3 className="text-lg font-heading font-bold text-charcoal-700 mb-1">
            Нет заказов
          </h3>
          <p className="text-sm text-charcoal-500">
            По выбранным фильтрам ничего не найдено
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredOrders.map((order) => {
            const isLoading = loadingIds.has(order.id);
            const isDelivery = order.delivery_type === 'delivery';
            const itemsSummary = order.order_items
              .map((i) => `${i.product_name}${i.quantity > 1 ? ` ×${i.quantity}` : ''}`)
              .join(', ');
            const address = isDelivery
              ? formatDeliveryAddress(order.delivery_address as DeliveryAddress | null)
              : null;

            return (
              <div
                key={order.id}
                className={`
                  bg-white rounded-2xl border-2 shadow-sm transition-all duration-200
                  ${order.paid ? 'border-emerald-200' : 'border-amber-200'}
                `}
              >
                {/* Colored top bar */}
                <div
                  className={`h-1 rounded-t-2xl ${
                    order.paid ? 'bg-emerald-400' : 'bg-amber-400'
                  }`}
                />

                <div className="p-4 sm:p-5">
                  {/* Desktop: single-row layout */}
                  <div className="hidden md:grid md:grid-cols-[auto_1fr_auto_auto_1fr_auto_auto] md:items-center md:gap-4">
                    {/* Order number */}
                    <div className="min-w-[5rem]">
                      <p className="text-xs font-semibold text-charcoal-400 uppercase tracking-wide mb-0.5">
                        Заказ
                      </p>
                      <p className="font-mono text-sm font-bold text-brown-500">
                        {order.order_number ?? order.id.slice(0, 8)}
                      </p>
                    </div>

                    {/* Client + date */}
                    <div>
                      <p className="font-semibold text-charcoal-900 truncate">
                        {order.client?.name ?? '—'}
                      </p>
                      <p className="text-xs text-charcoal-500">
                        {order.delivery_date ? formatDate(order.delivery_date) : '—'}
                        {order.delivery_time ? ` · ${order.delivery_time}` : ''}
                      </p>
                    </div>

                    {/* Type badge */}
                    <div>
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                          isDelivery
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'bg-purple-50 text-purple-700 border border-purple-200'
                        }`}
                      >
                        {isDelivery ? (
                          <Truck className="w-3 h-3" />
                        ) : (
                          <ShoppingBag className="w-3 h-3" />
                        )}
                        {isDelivery ? 'Доставка' : 'Самовывоз'}
                      </span>
                    </div>

                    {/* Address / pickup note */}
                    <div className="min-w-0">
                      {isDelivery && address ? (
                        <p className="text-xs text-charcoal-600 truncate max-w-[200px]" title={address}>
                          {address}
                        </p>
                      ) : (
                        <p className="text-xs text-charcoal-400 italic">Самовывоз</p>
                      )}
                    </div>

                    {/* Items */}
                    <div className="min-w-0">
                      <p className="text-xs text-charcoal-600 truncate" title={itemsSummary}>
                        {itemsSummary || '—'}
                      </p>
                    </div>

                    {/* Total */}
                    <div className="text-right min-w-[5rem]">
                      <p className="font-bold text-charcoal-900">
                        {formatCurrency(Number(order.total_amount))}
                      </p>
                    </div>

                    {/* Payment toggle */}
                    <div className="flex justify-end">
                      <PaymentToggle
                        paid={order.paid ?? false}
                        loading={isLoading}
                        onToggle={() => handleTogglePaid(order)}
                      />
                    </div>
                  </div>

                  {/* Mobile: stacked layout */}
                  <div className="md:hidden space-y-3">
                    {/* Top row: order number + type + payment */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-bold text-brown-500">
                          #{order.order_number ?? order.id.slice(0, 8)}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                            isDelivery
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-purple-50 text-purple-700 border border-purple-200'
                          }`}
                        >
                          {isDelivery ? (
                            <Truck className="w-3 h-3" />
                          ) : (
                            <ShoppingBag className="w-3 h-3" />
                          )}
                          {isDelivery ? 'Доставка' : 'Самовывоз'}
                        </span>
                      </div>
                      <PaymentToggle
                        paid={order.paid ?? false}
                        loading={isLoading}
                        onToggle={() => handleTogglePaid(order)}
                      />
                    </div>

                    {/* Client + time */}
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-charcoal-900">
                          {order.client?.name ?? '—'}
                        </p>
                        {order.delivery_time && (
                          <p className="text-xs text-charcoal-500 flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3" />
                            {order.delivery_time}
                            {order.delivery_date ? ` · ${formatDate(order.delivery_date)}` : ''}
                          </p>
                        )}
                      </div>
                      <p className="font-bold text-charcoal-900">
                        {formatCurrency(Number(order.total_amount))}
                      </p>
                    </div>

                    {/* Address */}
                    {isDelivery && address && (
                      <p className="text-xs text-charcoal-500 bg-cream-50 rounded-lg px-3 py-2">
                        {address}
                      </p>
                    )}

                    {/* Items */}
                    {itemsSummary && (
                      <p className="text-xs text-charcoal-500 truncate">{itemsSummary}</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
