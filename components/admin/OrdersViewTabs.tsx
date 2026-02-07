'use client';

import { useState } from 'react';
import type { Database } from '@/lib/supabase/types';
import OrdersTable from './OrdersTable';
import { parseDateFromDB } from '@/lib/utils';
import t from '@/lib/admin-translations-extended';
import { ArrowDown, ArrowUp, User, Soup } from 'lucide-react';

type Order = Database['public']['Tables']['orders']['Row'];
type OrderItem = Database['public']['Tables']['order_items']['Row'];
type Client = Database['public']['Tables']['clients']['Row'];

interface OrderWithItems extends Order {
  order_items: OrderItem[];
  client: Client | null;
}

interface OrdersViewTabsProps {
  orders: OrderWithItems[];
}

type ViewTab = 'today' | 'week' | 'month' | 'all';

// Quick sale client IDs
const VITRINA_CLIENT_ID = '06efda69-8386-4365-a2f7-3bcf5bdc483e';
const RAMENNAYA_CLIENT_ID = '9323a8bb-6ec4-481c-b040-aa762dc626bd';

export default function OrdersViewTabs({ orders }: OrdersViewTabsProps) {
  const [activeTab, setActiveTab] = useState<ViewTab>('week');
  const [showVitrina, setShowVitrina] = useState(true);
  const [showRamennaya, setShowRamennaya] = useState(true);
  const [sortDirection, setSortDirection] = useState<'desc' | 'asc'>('asc');

  // Filter orders based on active tab and walk-in client toggles
  const getFilteredOrders = (): OrderWithItems[] => {
    const now = new Date();
    let filtered: OrderWithItems[] = [];
    
    switch (activeTab) {
      case 'today': {
        const today = new Date(now);
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);
        
        filtered = orders.filter(o => {
          if (!o.delivery_date) return false;
          const orderDate = parseDateFromDB(o.delivery_date);
          return orderDate.getTime() >= today.getTime() && orderDate.getTime() < tomorrow.getTime();
        });
        break;
      }
      
      case 'week': {
        const weekStart = new Date(now);
        // Start week with Monday instead of Sunday
        const dayOfWeek = now.getDay();
        const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        weekStart.setDate(now.getDate() - daysFromMonday);
        weekStart.setHours(0, 0, 0, 0);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 7);
        
        filtered = orders.filter(o => {
          if (!o.delivery_date) return false;
          const orderDate = parseDateFromDB(o.delivery_date);
          return orderDate >= weekStart && orderDate < weekEnd;
        });
        break;
      }
      
      case 'month': {
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        monthEnd.setHours(23, 59, 59, 999);
        
        filtered = orders.filter(o => {
          if (!o.delivery_date) return false;
          const orderDate = parseDateFromDB(o.delivery_date);
          return orderDate >= monthStart && orderDate <= monthEnd;
        });
        break;
      }
      
      case 'all':
      default:
        filtered = orders;
    }

    // Apply walk-in client filters
    return filtered.filter(o => {
      if (!showVitrina && o.client_id === VITRINA_CLIENT_ID) return false;
      if (!showRamennaya && o.client_id === RAMENNAYA_CLIENT_ID) return false;
      return true;
    });
  };

  const filteredOrders = getFilteredOrders();
  const sortedOrders = [...filteredOrders].sort((a, b) => {
    const aHasDate = Boolean(a.delivery_date);
    const bHasDate = Boolean(b.delivery_date);

    if (!aHasDate && !bHasDate) return 0;
    if (!aHasDate) return 1;
    if (!bHasDate) return -1;

    const aTime = parseDateFromDB(a.delivery_date as string).getTime();
    const bTime = parseDateFromDB(b.delivery_date as string).getTime();
    return sortDirection === 'desc' ? bTime - aTime : aTime - bTime;
  });

  // Calculate total sum of orders in the current period (regardless of paid/unpaid status)
  const totalSum = filteredOrders.reduce((sum, order) => {
    return sum + (Number(order.total_amount) || 0);
  }, 0);

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-CH', {
      style: 'currency',
      currency: 'CHF',
    }).format(amount);
  };

  // Get date range text
  const getDateRangeText = (): string => {
    const now = new Date();
    switch (activeTab) {
      case 'today':
        return now.toLocaleDateString('ru-RU', { 
          weekday: 'long', 
          month: 'long', 
          day: 'numeric', 
          year: 'numeric' 
        });
      case 'week': {
        const weekStart = new Date(now);
        // Start week with Monday instead of Sunday
        const dayOfWeek = now.getDay();
        const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        weekStart.setDate(now.getDate() - daysFromMonday);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        return `${weekStart.toLocaleDateString('ru-RU', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('ru-RU', { month: 'short', day: 'numeric', year: 'numeric' })}`;
      }
      case 'month':
        return now.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
      case 'all':
        return 'За все время';
    }
  };

  const tabs = [
    { id: 'today' as ViewTab, label: 'Сегодня' },
    { id: 'week' as ViewTab, label: 'Эта неделя' },
    { id: 'month' as ViewTab, label: 'Этот месяц' },
    { id: 'all' as ViewTab, label: t.allOrders },
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

      {/* Date Range & Count with Walk-in Filters */}
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-4">
          <div>
            <h3 className="text-lg font-heading font-bold text-charcoal-900">
              {getDateRangeText()}
            </h3>
            <p className="text-sm text-charcoal-500">
              {t.showing} {filteredOrders.length} {filteredOrders.length === 1 ? 'заказ' : 'заказов'}
            </p>
          </div>

          {/* Total Sum Counter - Only shown for non-"all" tabs */}
          {activeTab !== 'all' && (
            <div className="bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-300 rounded-2xl px-6 py-3 shadow-md">
              <div className="flex items-center gap-3">
                <div className="bg-green-500 rounded-full p-2">
                  <svg 
                    className="w-5 h-5 text-white" 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2.5} 
                      d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-xs font-semibold text-green-700 uppercase tracking-wide">
                    Общая сумма
                  </p>
                  <p className="text-xl font-bold text-green-600">
                    {formatCurrency(totalSum)}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Walk-in Client Filter Buttons */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-charcoal-600 font-semibold mr-2">Фильтры:</span>
          <button
            onClick={() => setSortDirection((prev) => (prev === 'desc' ? 'asc' : 'desc'))}
            className="flex items-center justify-center w-9 h-9 rounded-full border-2 border-cream-300 text-charcoal-700 hover:bg-cream-100 transition-colors"
            title={sortDirection === 'desc' ? t.sortNewest : t.sortOldest}
            aria-label={sortDirection === 'desc' ? t.sortNewest : t.sortOldest}
          >
            {sortDirection === 'desc' ? (
              <ArrowDown className="w-4 h-4" />
            ) : (
              <ArrowUp className="w-4 h-4" />
            )}
          </button>
          
          {/* Vitrina Toggle */}
          <button
            onClick={() => setShowVitrina(!showVitrina)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm transition-all border-2 ${
              showVitrina
                ? 'bg-brown-500 text-white border-brown-500 shadow-md'
                : 'bg-gray-100 text-gray-400 border-gray-300 opacity-50 hover:opacity-70'
            }`}
            title={showVitrina ? 'Скрыть заказы Витрины' : 'Показать заказы Витрины'}
          >
            <User className="w-4 h-4" />
            <span>Витрина</span>
          </button>

          {/* Ramennaya Toggle */}
          <button
            onClick={() => setShowRamennaya(!showRamennaya)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm transition-all border-2 ${
              showRamennaya
                ? 'bg-brown-500 text-white border-brown-500 shadow-md'
                : 'bg-gray-100 text-gray-400 border-gray-300 opacity-50 hover:opacity-70'
            }`}
            title={showRamennaya ? 'Скрыть заказы Раменной' : 'Показать заказы Раменной'}
          >
            <Soup className="w-4 h-4" />
            <span>Раменная</span>
          </button>
        </div>
      </div>

      {/* Orders Table */}
      {sortedOrders.length > 0 ? (
        <OrdersTable orders={sortedOrders} />
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
            Нет заказов за этот период
          </h3>
          <p className="text-charcoal-600">
            Попробуйте выбрать другой временной диапазон
          </p>
        </div>
      )}
    </div>
  );
}

