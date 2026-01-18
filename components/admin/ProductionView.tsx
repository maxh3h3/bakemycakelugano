'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import type { Database } from '@/lib/supabase/types';
import OrderItemsModal from './OrderItemsModal';
import ProductionSummaryModal from './ProductionSummaryModal';
import Toast from '@/components/ui/Toast';
import { useProductionSSE } from '@/lib/hooks/useProductionSSE';
import type { ProductionEvent } from '@/lib/events/production-events';

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
  const router = useRouter();
  const [viewMode, setViewMode] = useState<ViewMode>('today');
  const [selectedOrderGroup, setSelectedOrderGroup] = useState<OrderGroup | null>(null);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  
  // Toast notification state
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastVariant, setToastVariant] = useState<'info' | 'success'>('info');
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Handle SSE events
  const handleProductionEvent = (event: ProductionEvent) => {
    console.log('[ProductionView] Received SSE event:', event);
    
    switch (event.type) {
      case 'new_order':
        setToastMessage(`New order received! Order #${event.orderNumber}`);
        setToastVariant('success');
        break;
      
      case 'status_update':
        setToastMessage(`Order #${event.orderNumber} updated to ${event.newStatus}`);
        setToastVariant('info');
        break;
      
      case 'notes_update':
        setToastMessage(`Order #${event.orderNumber} details updated`);
        setToastVariant('info');
        break;
      
      case 'item_added':
        setToastMessage(`New item added to order #${event.orderNumber}`);
        setToastVariant('success');
        break;
      
      case 'item_deleted':
        setToastMessage(`Item removed from order #${event.orderNumber}`);
        setToastVariant('info');
        break;
    }

    // Schedule page refresh after 3 seconds
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }
    
    refreshTimeoutRef.current = setTimeout(() => {
      console.log('[ProductionView] Auto-refreshing page data...');
      router.refresh();
    }, 3000);
  };

  // Initialize SSE connection
  const { connected, error } = useProductionSSE({
    enabled: true,
    onEvent: handleProductionEvent,
    onConnect: () => {
      console.log('[ProductionView] SSE connected');
    },
    onDisconnect: () => {
      console.log('[ProductionView] SSE disconnected');
    },
    onError: (err) => {
      console.error('[ProductionView] SSE error:', err);
    },
  });

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, []);

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

  // Get items for today view
  const todayViewItems = todayItems;
  
  // Get items for week view
  const weekViewItems = (() => {
    const weekDateStrings = weekDays.map(d => dateToLocalString(d));
    return items.filter(item => item.delivery_date && weekDateStrings.includes(item.delivery_date));
  })();

  return (
    <>
      {/* Toast Notification */}
      {toastMessage && (
        <Toast
          message={toastMessage}
          variant={toastVariant}
          duration={3000}
          onClose={() => setToastMessage(null)}
          show={!!toastMessage}
        />
      )}

      {/* SSE Connection Status Indicator (optional - shows at bottom right) */}
      {error && (
        <div className="fixed bottom-4 right-4 z-50 bg-red-100 text-red-700 px-4 py-2 rounded-lg shadow-lg border-2 border-red-300 text-sm">
          Connection lost - Attempting to reconnect...
        </div>
      )}

      <div className="space-y-6">
        {/* View Mode Tabs */}
        <div className="bg-white rounded-2xl shadow-md border-2 border-cream-200 p-2">
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => setViewMode('today')}
              className={`
                px-6 py-3 rounded-xl font-medium transition-all duration-200 relative
                ${viewMode === 'today'
                  ? 'bg-brown-500 text-white shadow-lg scale-105'
                  : 'bg-cream-50 text-charcoal-700 hover:bg-cream-100'
                }
              `}
            >
              <div className="flex items-center justify-between gap-3">
                <span>Today ({todayOrderGroups.length})</span>
                {viewMode === 'today' && (
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowSummaryModal(true);
                    }}
                    className="bg-white/20 hover:bg-white/30 text-white rounded-lg p-2 flex items-center justify-center transition-all cursor-pointer"
                    title="Сводка производства"
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        e.stopPropagation();
                        setShowSummaryModal(true);
                      }
                    }}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                      />
                    </svg>
                  </span>
                )}
              </div>
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`
                px-6 py-3 rounded-xl font-medium transition-all duration-200 relative
                ${viewMode === 'week'
                  ? 'bg-brown-500 text-white shadow-lg scale-105'
                  : 'bg-cream-50 text-charcoal-700 hover:bg-cream-100'
                }
              `}
            >
              <div className="flex items-center justify-between gap-3">
                <span>Week View</span>
                {viewMode === 'week' && (
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowSummaryModal(true);
                    }}
                    className="bg-white/20 hover:bg-white/30 text-white rounded-lg p-2 flex items-center justify-center transition-all cursor-pointer"
                    title="Сводка производства"
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        e.stopPropagation();
                        setShowSummaryModal(true);
                      }
                    }}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                      />
                    </svg>
                  </span>
                )}
              </div>
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
          <div className="space-y-4">
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
                    {dayOrderGroups.map((orderGroup) => (
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
                      ))}
                  </div>
                </div>
              );
            })}
            </div>
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
                    {dayOrderGroups.map((orderGroup) => (
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
                      ))}
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

      {/* Production Summary Modal */}
      {showSummaryModal && (
        <ProductionSummaryModal
          items={viewMode === 'today' ? todayViewItems : weekViewItems}
          viewMode={viewMode}
          onClose={() => setShowSummaryModal(false)}
        />
      )}
    </>
  );
}
