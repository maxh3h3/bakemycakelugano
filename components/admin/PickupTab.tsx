// components/admin/PickupTab.tsx
'use client';

import { useState } from 'react';
import { Clock, ShoppingBag } from 'lucide-react';
import { parseDateFromDB, formatDateForDB, extractTimeForSorting } from '@/lib/utils';
import PaymentToggle from '@/components/admin/PaymentToggle';
import type { OrderWithItems } from '@/app/admin/delivery/page';

interface PickupTabProps {
  orders: OrderWithItems[];
}

type TimeTab = 'today' | 'tomorrow' | 'week';

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('de-CH', { style: 'currency', currency: 'CHF' }).format(amount);
}

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

export default function PickupTab({ orders: initialOrders }: PickupTabProps) {
  const [orders, setOrders] = useState<OrderWithItems[]>(initialOrders);
  const [activeTab, setActiveTab] = useState<TimeTab>('today');
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());

  const today = new Date();
  const todayStr = formatDateForDB(today);
  const tomorrowDate = new Date(today);
  tomorrowDate.setDate(today.getDate() + 1);
  const tomorrowStr = formatDateForDB(tomorrowDate);

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

  const getFilteredOrders = (tab: TimeTab): OrderWithItems[] => {
    const filtered = orders.filter((o) => {
      if (!o.delivery_date) return false;
      if (tab === 'today') return o.delivery_date === todayStr;
      if (tab === 'tomorrow') return o.delivery_date === tomorrowStr;
      const { weekStart, weekEnd } = getWeekRange();
      const d = parseDateFromDB(o.delivery_date);
      return d >= weekStart && d <= weekEnd;
    });

    return filtered.sort((a, b) => {
      const aTime = extractTimeForSorting(a.delivery_time);
      const bTime = extractTimeForSorting(b.delivery_time);
      if (aTime !== null && bTime !== null) return aTime - bTime;
      if (aTime !== null) return -1;
      if (bTime !== null) return 1;
      return 0;
    });
  };

  const handleTogglePaid = async (order: OrderWithItems) => {
    const { id, paid: isPaid } = order;
    setLoadingIds((prev) => { const next = new Set(prev); next.add(id); return next; });
    const endpoint = isPaid ? `/api/admin/orders/${id}/mark-unpaid` : `/api/admin/orders/${id}/mark-paid`;
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (!response.ok) throw new Error('Failed');
      setOrders((prev) =>
        prev.map((o) =>
          o.id === id ? { ...o, paid: !isPaid, payment_method: isPaid ? o.payment_method : 'cash' } : o
        )
      );
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Ошибка');
    } finally {
      setLoadingIds((prev) => { const next = new Set(prev); next.delete(id); return next; });
    }
  };

  const todayCount = getFilteredOrders('today').length;
  const tomorrowCount = getFilteredOrders('tomorrow').length;
  const filteredOrders = getFilteredOrders(activeTab);

  const tabs: { id: TimeTab; label: string }[] = [
    { id: 'today', label: `Сегодня (${todayCount})` },
    { id: 'tomorrow', label: `Завтра (${tomorrowCount})` },
    { id: 'week', label: 'Эта неделя' },
  ];

  return (
    <div className="space-y-4">
      {/* Sub-tab pills */}
      <div className="bg-white rounded-2xl shadow-sm border-2 border-cream-200 p-2">
        <div className="grid grid-cols-3 gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 rounded-xl font-semibold text-sm transition-all duration-200 ${
                activeTab === tab.id
                  ? 'bg-brown-500 text-white shadow-md scale-[1.02]'
                  : 'bg-cream-50 text-charcoal-700 hover:bg-cream-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Order list */}
      {filteredOrders.length === 0 ? (
        <div className="bg-white rounded-2xl border-2 border-cream-200 p-12 text-center shadow-sm">
          <Clock className="w-12 h-12 mx-auto text-charcoal-300 mb-3" />
          <h3 className="text-lg font-heading font-bold text-charcoal-700 mb-1">Нет заказов</h3>
          <p className="text-sm text-charcoal-500">На выбранный день заказов на самовывоз нет</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredOrders.map((order) => {
            const isLoading = loadingIds.has(order.id);
            const itemsSummary = order.order_items
              .map((i) => `${i.product_name}${i.quantity > 1 ? ` ×${i.quantity}` : ''}`)
              .join(', ');

            return (
              <div
                key={order.id}
                className={`bg-white rounded-2xl border-2 shadow-sm transition-all duration-200 ${
                  order.paid ? 'border-emerald-200' : 'border-amber-200'
                }`}
              >
                {/* Colored top bar */}
                <div
                  className={`h-1 rounded-t-2xl ${order.paid ? 'bg-emerald-400' : 'bg-amber-400'}`}
                />

                <div className="p-4 sm:p-5">
                  {/* Desktop: 6-column grid */}
                  <div className="hidden md:grid md:grid-cols-[auto_1fr_auto_1fr_auto_auto] md:items-center md:gap-4">
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
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                        <ShoppingBag className="w-3 h-3" />
                        Самовывоз
                      </span>
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
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-bold text-brown-500">
                          #{order.order_number ?? order.id.slice(0, 8)}
                        </span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                          <ShoppingBag className="w-3 h-3" />
                          Самовывоз
                        </span>
                      </div>
                      <PaymentToggle
                        paid={order.paid ?? false}
                        loading={isLoading}
                        onToggle={() => handleTogglePaid(order)}
                      />
                    </div>

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
