'use client';

import { useState } from 'react';
import type { Database } from '@/lib/supabase/types';
import OrderItemsModal from './OrderItemsModal';

type Order = Database['public']['Tables']['orders']['Row'];
type OrderItem = Database['public']['Tables']['order_items']['Row'];

interface OrderWithItems extends Order {
  order_items: OrderItem[];
}

interface ProductionViewProps {
  orders: OrderWithItems[];
}

type ViewMode = 'today' | 'week' | 'month';

const statusColors: Record<string, string> = {
  pending: 'bg-rose-100 text-rose-700 border-rose-300',
  confirmed: 'bg-blue-100 text-blue-700 border-blue-300',
  preparing: 'bg-yellow-100 text-yellow-700 border-yellow-300',
  ready: 'bg-green-100 text-green-700 border-green-300',
  completed: 'bg-gray-100 text-gray-700 border-gray-300',
  cancelled: 'bg-red-100 text-red-700 border-red-300',
};

export default function ProductionView({ orders }: ProductionViewProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('today');
  const [selectedOrder, setSelectedOrder] = useState<OrderWithItems | null>(null);

  // Get week days
  function getWeekDays(): Date[] {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay()); // Sunday
    
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

  // Get orders for a specific day
  function getOrdersForDay(day: Date): OrderWithItems[] {
    const dayStr = dateToLocalString(day);
    return orders.filter(order => order.delivery_date === dayStr);
  }

  const weekDays = getWeekDays();
  const monthDays = getMonthDays();
  const today = new Date();
  const todayStr = dateToLocalString(today);
  const todayOrders = orders.filter(order => order.delivery_date === todayStr);

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
              Today ({todayOrders.length})
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
            {todayOrders.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-md border-2 border-cream-200 p-12 text-center">
                <p className="text-lg text-charcoal-500">No orders for today</p>
              </div>
            ) : (
              todayOrders.map((order) => (
                <button
                  key={order.id}
                  onClick={() => setSelectedOrder(order)}
                  className="w-full bg-white rounded-2xl shadow-md border-2 border-cream-200 p-6 hover:shadow-lg hover:border-brown-300 transition-all text-left"
                >
                  <div className="flex items-start gap-4">
                    {/* Order Number */}
                    <div className="flex-shrink-0">
                      <p className="text-xs text-charcoal-500 mb-1">Order #</p>
                      <p className="text-xl font-mono font-bold text-brown-500">
                        {order.order_number || order.id.slice(0, 8)}
                      </p>
                    </div>

                    {/* Product Items */}
                    <div className="flex-1 space-y-2">
                      {order.order_items && order.order_items.length > 0 ? (
                        order.order_items.map((item, idx) => (
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
                        ))
                      ) : (
                        <p className="text-sm text-charcoal-500">No items</p>
                      )}
                    </div>

                    {/* Status */}
                    <div className="flex-shrink-0 flex items-center gap-2">
                      <span
                        className={`inline-flex px-4 py-2 rounded-full text-sm font-semibold border-2 ${
                          statusColors[order.status] || statusColors.pending
                        }`}
                      >
                        {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                      </span>
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-4">
            {weekDays.map((day, index) => {
              const dayOrders = getOrdersForDay(day);
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
                      {dayOrders.length}
                    </p>
                  </div>

                  {/* Orders for this day */}
                  <div className="space-y-2">
                    {dayOrders.length === 0 ? (
                      <p className="text-xs text-charcoal-400 italic text-center py-4">
                        No orders
                      </p>
                    ) : (
                      dayOrders.map((order) => (
                        <button
                          key={order.id}
                          onClick={() => setSelectedOrder(order)}
                          className="w-full p-3 rounded-xl border-2 border-cream-300 hover:border-brown-400 hover:bg-cream-50 transition-all text-left"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-mono font-semibold text-charcoal-500">
                              {order.order_number || '#' + order.id.slice(0, 6)}
                            </span>
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full border ${
                                statusColors[order.status] || statusColors.pending
                              }`}
                            >
                              {order.status.slice(0, 4)}
                            </span>
                          </div>
                          {order.order_items && order.order_items.length > 0 ? (
                            <div className="space-y-1.5">
                              {order.order_items.map((item, idx) => (
                                <div key={idx} className="text-xs">
                                  <p className="font-semibold text-charcoal-900 truncate">
                                    {item.quantity}x {item.product_name}
                                  </p>
                                  <div className="flex flex-wrap gap-1 mt-0.5">
                                    {item.flavour_name && (
                                      <span className="text-charcoal-600">🍰 {item.flavour_name}</span>
                                    )}
                                    {item.size_label && (
                                      <span className="text-charcoal-600">📏 {item.size_label}</span>
                                    )}
                                    {item.diameter_cm && (
                                      <span className="text-charcoal-600">⭕ {item.diameter_cm}cm</span>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-charcoal-500">No items</p>
                          )}
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
              const dayOrders = getOrdersForDay(day);
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
                    {dayOrders.length > 0 && (
                      <p className="text-xl font-mono font-bold text-brown-500 mt-1">
                        {dayOrders.length}
                      </p>
                    )}
                  </div>

                  {/* Orders for this day */}
                  <div className="space-y-1.5">
                    {dayOrders.length === 0 ? (
                      <p className="text-xs text-charcoal-300 italic text-center py-2">
                        -
                      </p>
                    ) : (
                      dayOrders.map((order) => (
                        <button
                          key={order.id}
                          onClick={() => setSelectedOrder(order)}
                          className="w-full p-2 rounded-lg border border-cream-300 hover:border-brown-400 hover:bg-cream-50 transition-all text-left"
                        >
                          <div className="mb-1">
                            <span className="text-xs font-mono font-semibold text-charcoal-500">
                              {order.order_number || '#' + order.id.slice(0, 6)}
                            </span>
                          </div>
                          {order.order_items && order.order_items.length > 0 ? (
                            <div className="space-y-1">
                              {order.order_items.map((item, idx) => (
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
                          ) : (
                            <p className="text-xs text-charcoal-500">No items</p>
                          )}
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
      {selectedOrder && (
        <OrderItemsModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
        />
      )}
    </>
  );
}

