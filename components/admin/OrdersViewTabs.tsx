'use client';

import { useState } from 'react';
import type { Database } from '@/lib/supabase/types';
import OrdersTable from './OrdersTable';

type Order = Database['public']['Tables']['orders']['Row'];
type OrderItem = Database['public']['Tables']['order_items']['Row'];

interface OrderWithItems extends Order {
  order_items: OrderItem[];
}

interface OrdersViewTabsProps {
  orders: OrderWithItems[];
}

type ViewTab = 'today' | 'week' | 'month' | 'all';

export default function OrdersViewTabs({ orders }: OrdersViewTabsProps) {
  const [activeTab, setActiveTab] = useState<ViewTab>('today');

  // Filter orders based on active tab
  const getFilteredOrders = (): OrderWithItems[] => {
    const now = new Date();
    
    switch (activeTab) {
      case 'today': {
        const today = new Date(now);
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);
        
        return orders.filter(o => {
          if (!o.delivery_date) return false;
          const orderDate = new Date(o.delivery_date);
          orderDate.setHours(0, 0, 0, 0);
          return orderDate.getTime() >= today.getTime() && orderDate.getTime() < tomorrow.getTime();
        });
      }
      
      case 'week': {
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay()); // Start of week (Sunday)
        weekStart.setHours(0, 0, 0, 0);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 7);
        
        return orders.filter(o => {
          if (!o.delivery_date) return false;
          const orderDate = new Date(o.delivery_date);
          return orderDate >= weekStart && orderDate < weekEnd;
        });
      }
      
      case 'month': {
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        monthEnd.setHours(23, 59, 59, 999);
        
        return orders.filter(o => {
          if (!o.delivery_date) return false;
          const orderDate = new Date(o.delivery_date);
          return orderDate >= monthStart && orderDate <= monthEnd;
        });
      }
      
      case 'all':
      default:
        return orders;
    }
  };

  const filteredOrders = getFilteredOrders();

  // Get date range text
  const getDateRangeText = (): string => {
    const now = new Date();
    switch (activeTab) {
      case 'today':
        return now.toLocaleDateString('en-US', { 
          weekday: 'long', 
          month: 'long', 
          day: 'numeric', 
          year: 'numeric' 
        });
      case 'week': {
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay());
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        return `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
      }
      case 'month':
        return now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      case 'all':
        return 'All time';
    }
  };

  const tabs = [
    { id: 'today' as ViewTab, label: 'Today' },
    { id: 'week' as ViewTab, label: 'This Week' },
    { id: 'month' as ViewTab, label: 'This Month' },
    { id: 'all' as ViewTab, label: 'All Orders' },
  ];

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="bg-white rounded-2xl shadow-md border-2 border-cream-200 p-2">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={              `
                px-4 py-3 rounded-xl font-medium transition-all duration-200
                ${activeTab === tab.id
                  ? 'bg-brown-500 text-white shadow-lg scale-105'
                  : 'bg-cream-50 text-charcoal-700 hover:bg-cream-100 hover:scale-102'
                }
              `}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Date Range & Count */}
      <div className="flex items-center justify-between px-2">
        <div>
          <h3 className="text-lg font-heading font-bold text-charcoal-900">
            {getDateRangeText()}
          </h3>
          <p className="text-sm text-charcoal-500">
            Showing {filteredOrders.length} {filteredOrders.length === 1 ? 'order' : 'orders'}
          </p>
        </div>
        
        {/* Quick Filter by Payment Status */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-charcoal-500">Quick filters:</span>
          <span className="px-3 py-1 rounded-full text-xs bg-orange-100 text-orange-700 border border-orange-300">
            {filteredOrders.filter(o => !o.paid).length} Unpaid
          </span>
        </div>
      </div>

      {/* Orders Table */}
      {filteredOrders.length > 0 ? (
        <OrdersTable orders={filteredOrders} />
      ) : (
        <div className="bg-white rounded-2xl shadow-md border-2 border-cream-200 p-12 text-center">
          <div className="text-charcoal-400 mb-4">
            <svg
              className="w-16 h-16 mx-auto"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <h3 className="text-xl font-heading font-bold text-charcoal-900 mb-2">
            No orders for this period
          </h3>
          <p className="text-charcoal-600">
            Try selecting a different time range
          </p>
        </div>
      )}
    </div>
  );
}

