'use client';

import { useState } from 'react';
import type { Database } from '@/lib/supabase/types';
import OrderItemsModal from './OrderItemsModal';

type OrderItem = Database['public']['Tables']['order_items']['Row'];

interface ProductionViewProps {
  items: OrderItem[];
}

type ViewMode = 'today' | 'week' | 'month';

// Group items by order_number for display
interface OrderGroup {
  order_number: string;
  order_id: string;
  delivery_date: string;
  items: OrderItem[];
}

export default function ProductionView({ items }: ProductionViewProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('today');
  const [selectedOrderGroup, setSelectedOrderGroup] = useState<OrderGroup | null>(null);

  // Group items by order_number
  function groupItemsByOrder(orderItems: OrderItem[]): OrderGroup[] {
    const groups = new Map<string, OrderGroup>();

    orderItems.forEach((item) => {
      const key = item.order_number || item.order_id;
      
      if (!groups.has(key)) {
        groups.set(key, {
          order_number: item.order_number || 'N/A',
          order_id: item.order_id,
          delivery_date: item.delivery_date || '',
          items: [],
        });
      }
      
      groups.get(key)!.items.push(item);
    });

    return Array.from(groups.values());
  }

  // Get week days
  function getWeekDays(): Date[] {
    const today = new Date();
    const startOfWeek = new Date(today);
    // Start week with Monday instead of Sunday
    const dayOfWeek = today.getDay();
    const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    startOfWeek.setDate(today.getDate() - daysFromMonday);
    
    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      days.push(day);
    }
    return days;
  }

  // Get all days in current month
  function getMonthDays(): Date[] {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const days = [];
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    return days;
  }

  // Convert Date to local YYYY-MM-DD string (avoiding timezone issues)
  function dateToLocalString(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Get order groups for a specific day
  function getOrderGroupsForDay(day: Date): OrderGroup[] {
    const dayStr = dateToLocalString(day);
    const dayItems = items.filter(item => item.delivery_date === dayStr);
    return groupItemsByOrder(dayItems);
  }

  const weekDays = getWeekDays();
  const monthDays = getMonthDays();
  const today = new Date();
  const todayStr = dateToLocalString(today);
  const todayItems = items.filter(item => item.delivery_date === todayStr);
  const todayOrderGroups = groupItemsByOrder(todayItems);

  return (
    <>
      <div className="space-y-6">
        {/* View Mode Tabs */}
        <div className="bg-white rounded-2xl shadow-md border-2 border-cream-200 p-2">
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => setViewMode('today')}
              className={`
                px-6 py-3 rounded-xl font-medium transition-all duration-200
                ${viewMode === 'today'
                  ? 'bg-brown-500 text-white shadow-lg scale-105'
                  : 'bg-cream-50 text-charcoal-700 hover:bg-cream-100'
                }
              `}
            >
              Today ({todayOrderGroups.length})
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`
                px-6 py-3 rounded-xl font-medium transition-all duration-200
                ${viewMode === 'week'
                  ? 'bg-brown-500 text-white shadow-lg scale-105'
                  : 'bg-cream-50 text-charcoal-700 hover:bg-cream-100'
                }
              `}
            >
              Week View
            </button>
            <button
              onClick={() => setViewMode('month')}
              className={`
                px-6 py-3 rounded-xl font-medium transition-all duration-200
                ${viewMode === 'month'
                  ? 'bg-brown-500 text-white shadow-lg scale-105'
                  : 'bg-cream-50 text-charcoal-700 hover:bg-cream-100'
                }
              `}
            >
              Month View
            </button>
          </div>
        </div>

        {/* Today View */}
        {viewMode === 'today' && (
          <div className="space-y-4">
            {todayOrderGroups.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-md border-2 border-cream-200 p-12 text-center">
                <p className="text-lg text-charcoal-500">No orders for today</p>
              </div>
            ) : (
              todayOrderGroups.map((orderGroup) => (
                <button
                  key={orderGroup.order_id}
                  onClick={() => setSelectedOrderGroup(orderGroup)}
                  className="w-full bg-white rounded-2xl shadow-md border-2 border-cream-200 p-6 hover:shadow-lg hover:border-brown-300 transition-all text-left"
                >
                  <div className="flex items-start gap-4">
                    {/* Order Number */}
                    <div className="flex-shrink-0">
                      <p className="text-xs text-charcoal-500 mb-1">Order #</p>
                      <p className="text-xl font-mono font-bold text-brown-500">
                        {orderGroup.order_number}
                      </p>
                    </div>

                    {/* Product Items */}
                    <div className="flex-1 space-y-2">
                      {orderGroup.items.map((item, idx) => (
                        <div key={idx} className="bg-cream-50 rounded-lg p-3 border border-cream-300">
                          <p className="font-semibold text-charcoal-900 mb-1">
                            {item.quantity}x {item.product_name}
                          </p>
                          <div className="flex flex-wrap gap-2 text-xs">
                            {item.flavour_name && (
                              <span className="bg-white px-2 py-1 rounded border border-cream-300">
                                🍰 {item.flavour_name}
                              </span>
                            )}
                            {item.size_label && (
                              <span className="bg-white px-2 py-1 rounded border border-cream-300">
                                📏 {item.size_label}
                              </span>
                            )}
                            {item.diameter_cm && (
                              <span className="bg-white px-2 py-1 rounded border border-cream-300">
                                ⭕ {item.diameter_cm}cm
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Production Status Summary */}
                    <div className="flex-shrink-0 flex items-center gap-2">
                      <span className="text-brown-500 text-2xl">→</span>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        )}

        {/* Week View */}
        {viewMode === 'week' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {weekDays.map((day, index) => {
              const dayOrderGroups = getOrderGroupsForDay(day);
              const dayStr = dateToLocalString(day);
              const isToday = dayStr === todayStr;

              return (
                <div
                  key={index}
                  className={`
                    bg-white rounded-2xl shadow-md p-4
                    ${isToday ? 'border-4 border-brown-500' : 'border-2 border-cream-200'}
                  `}
                >
                  {/* Day Header */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between">
                      <p className="text-lg font-heading font-bold text-charcoal-900">
                        {day.toLocaleDateString('en-US', { weekday: 'short' })}
                      </p>
                      {isToday && (
                        <span className="px-2 py-1 rounded-full text-xs font-bold bg-brown-500 text-white">
                          Today
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-charcoal-500">
                      {day.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </p>
                    <p className="text-2xl font-mono font-bold text-brown-500 mt-2">
                      {dayOrderGroups.length}
                    </p>
                  </div>

                  {/* Orders for this day */}
                  <div className="space-y-2">
                    {dayOrderGroups.length === 0 ? (
                      <p className="text-xs text-charcoal-400 italic text-center py-4">
                        No orders
                      </p>
                    ) : (
                      dayOrderGroups.map((orderGroup) => (
                        <button
                          key={orderGroup.order_id}
                          onClick={() => setSelectedOrderGroup(orderGroup)}
                          className="w-full p-6 rounded-xl border-2 border-cream-300 hover:border-brown-400 hover:bg-cream-50 transition-all text-left"
                        >
                          <div className="mb-4">
                            <span className="text-2xl font-mono font-bold text-charcoal-600">
                              {orderGroup.order_number}
                            </span>
                          </div>
                          <div className="space-y-3">
                            {orderGroup.items.map((item, idx) => (
                              <div key={idx}>
                                <p className="text-xl font-bold text-charcoal-900 mb-2">
                                  {item.quantity}x {item.product_name}
                                </p>
                                <div className="flex flex-wrap gap-2 text-base">
                                  {item.flavour_name && (
                                    <span className="text-charcoal-600">🍰 {item.flavour_name}</span>
                                  )}
                                  {item.size_label && (
                                    <span className="text-charcoal-600">📏 {item.size_label}</span>
                                  )}
                                  {item.diameter_cm && (
                                    <span className="text-charcoal-600">⭕ {item.diameter_cm}cm</span>
                                  )}
                                  {item.weight_kg && (
                                    <span className="text-charcoal-600">⚖️ {item.weight_kg}kg</span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Month View */}
        {viewMode === 'month' && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {monthDays.map((day, index) => {
              const dayOrderGroups = getOrderGroupsForDay(day);
              const dayStr = dateToLocalString(day);
              const isToday = dayStr === todayStr;
              const isPast = day < today && !isToday;

              return (
                <div
                  key={index}
                  className={`
                    rounded-xl shadow-md p-3
                    ${isToday 
                      ? 'bg-brown-50 border-3 border-brown-500' 
                      : isPast
                      ? 'bg-gray-50 border-2 border-gray-200 opacity-60'
                      : 'bg-white border-2 border-cream-200'
                    }
                  `}
                >
                  {/* Day Header */}
                  <div className="mb-2">
                    <div className="flex items-center justify-between">
                      <p className={`text-sm font-bold ${isToday ? 'text-brown-700' : 'text-charcoal-700'}`}>
                        {day.toLocaleDateString('en-US', { weekday: 'short' })}
                      </p>
                      {isToday && (
                        <span className="px-1.5 py-0.5 rounded-full text-xs font-bold bg-brown-500 text-white">
                          Today
                        </span>
                      )}
                    </div>
                    <p className="text-lg font-bold text-charcoal-900">
                      {day.getDate()}
                    </p>
                    {dayOrderGroups.length > 0 && (
                      <p className="text-xl font-mono font-bold text-brown-500 mt-1">
                        {dayOrderGroups.length}
                      </p>
                    )}
                  </div>

                  {/* Orders for this day */}
                  <div className="space-y-1.5">
                    {dayOrderGroups.length === 0 ? (
                      <p className="text-xs text-charcoal-300 italic text-center py-2">
                        -
                      </p>
                    ) : (
                      dayOrderGroups.map((orderGroup) => (
                        <button
                          key={orderGroup.order_id}
                          onClick={() => setSelectedOrderGroup(orderGroup)}
                          className="w-full p-2 rounded-lg border border-cream-300 hover:border-brown-400 hover:bg-cream-50 transition-all text-left"
                        >
                          <div className="mb-1">
                            <span className="text-xs font-mono font-semibold text-charcoal-500">
                              {orderGroup.order_number}
                            </span>
                          </div>
                          <div className="space-y-1">
                            {orderGroup.items.map((item, idx) => (
                              <div key={idx} className="text-xs">
                                <p className="font-semibold text-charcoal-900 truncate text-[10px]">
                                  {item.quantity}x {item.product_name}
                                </p>
                                <div className="text-[9px] text-charcoal-600 space-x-1">
                                  {item.flavour_name && <span>🍰{item.flavour_name}</span>}
                                  {item.size_label && <span>📏{item.size_label}</span>}
                                  {item.diameter_cm && <span>⭕{item.diameter_cm}cm</span>}
                                </div>
                              </div>
                            ))}
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Order Items Modal */}
      {selectedOrderGroup && (
        <OrderItemsModal
          orderGroup={selectedOrderGroup}
          onClose={() => setSelectedOrderGroup(null)}
        />
      )}
    </>
  );
}
