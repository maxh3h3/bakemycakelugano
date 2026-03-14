// components/admin/DeliveryPageTabs.tsx
'use client';

import { useState } from 'react';
import DeliveryTab from '@/components/admin/DeliveryTab';
import PickupTab from '@/components/admin/PickupTab';
import type { OrderWithItems } from '@/app/admin/delivery/page';

interface DeliveryPageTabsProps {
  orders: OrderWithItems[];
}

type MainTab = 'delivery' | 'pickup';

export default function DeliveryPageTabs({ orders }: DeliveryPageTabsProps) {
  const [activeMainTab, setActiveMainTab] = useState<MainTab>('delivery');

  // Split orders — immediate orders are already excluded by the page query
  const deliveryOrders = orders.filter((o) => o.delivery_type === 'delivery');
  const pickupOrders = orders.filter((o) => o.delivery_type === 'pickup');

  const tabs: { id: MainTab; label: string; count: number }[] = [
    { id: 'delivery', label: '🚗 Доставка', count: deliveryOrders.length },
    { id: 'pickup', label: '🏪 Самовывоз', count: pickupOrders.length },
  ];

  return (
    <div className="space-y-4">
      {/* Top-level tab bar */}
      <div className="flex gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveMainTab(tab.id)}
            className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-semibold text-sm transition-all duration-200 ${
              activeMainTab === tab.id
                ? 'bg-brown-500 text-white shadow-md'
                : 'bg-white text-charcoal-700 border-2 border-cream-200 hover:bg-cream-50'
            }`}
          >
            {tab.label}
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                activeMainTab === tab.id
                  ? 'bg-white/20 text-white'
                  : 'bg-cream-100 text-charcoal-600'
              }`}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeMainTab === 'delivery' ? (
        <DeliveryTab orders={deliveryOrders} />
      ) : (
        <PickupTab orders={pickupOrders} />
      )}
    </div>
  );
}
