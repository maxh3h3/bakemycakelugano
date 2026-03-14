// components/admin/DeliveryTab.tsx
'use client';

import { useState } from 'react';
import { Clock } from 'lucide-react';
import { parseDateFromDB, formatDateForDB, extractTimeForSorting } from '@/lib/utils';
import { type DeliveryAddress } from '@/lib/schemas/delivery';
import DeliveryOrderCard from '@/components/admin/DeliveryOrderCard';
import DeliveryRouteMap from '@/components/admin/DeliveryRouteMap';
import type { OrderWithItems } from '@/app/admin/delivery/page';

interface DeliveryTabProps {
  orders: OrderWithItems[];
}

type TimeTab = 'today' | 'tomorrow' | 'week';

function formatAddressForMap(addr: DeliveryAddress): string {
  const parts = [addr.street];
  const cityPart = [addr.postalCode, addr.city].filter(Boolean).join(' ');
  if (cityPart) parts.push(cityPart);
  parts.push(addr.country ?? 'Switzerland');
  return parts.join(', ');
}

export default function DeliveryTab({ orders: initialOrders }: DeliveryTabProps) {
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

  // Extract addresses for map (only today/tomorrow, only orders with address)
  const ordersWithAddress = filteredOrders.filter(
    (o) => o.delivery_address !== null && activeTab !== 'week'
  );
  const addresses = ordersWithAddress.map((o) =>
    formatAddressForMap(o.delivery_address as DeliveryAddress)
  );
  const orderInfos = ordersWithAddress.map((o) => ({
    clientName: o.client?.name ?? '—',
    deliveryTime: o.delivery_time,
  }));

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

      {/* Route map (today/tomorrow only) */}
      {activeTab !== 'week' && (
        <DeliveryRouteMap addresses={addresses} orderInfos={orderInfos} />
      )}

      {/* Order list */}
      {filteredOrders.length === 0 ? (
        <div className="bg-white rounded-2xl border-2 border-cream-200 p-12 text-center shadow-sm">
          <Clock className="w-12 h-12 mx-auto text-charcoal-300 mb-3" />
          <h3 className="text-lg font-heading font-bold text-charcoal-700 mb-1">Нет заказов</h3>
          <p className="text-sm text-charcoal-500">На выбранный день заказов на доставку нет</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredOrders.map((order) => (
            <DeliveryOrderCard
              key={order.id}
              order={order}
              isLoading={loadingIds.has(order.id)}
              onTogglePaid={() => handleTogglePaid(order)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
