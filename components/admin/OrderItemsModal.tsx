// BUSINESS CONTEXT: Production Order Details Modal for Kitchen Staff
// Used by: Production team (cooks and decorators)
// 
// Workflow: Accessed from ProductionView when clicking on an order. Shows full production
// details for all items in a single order. Staff update production status as they progress
// through each stage of the baking/decoration workflow.
//
// Business Rules:
// - Displays all items grouped by order_number for coordinated production
// - Shows critical production info: weight, diameter, flavour (for recipe/assembly)
// - Highlights customer requests: writing on cake (exact text to write)
// - Shows decoration notes and staff notes for production guidance
// - Production status workflow: new → prepared → baked → creamed → decorated → packaged → delivered
// - Status updates are optimistic (instant UI feedback) with background persistence
//
// Data Relationships: order_items (grouped by order_number from orders table)
// Critical Fields: product_image_urls (visual reference), writing_on_cake (customer text),
//                  production_status (workflow stage), delivery_date (deadline)

'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';
import OrderItemImageCarousel from '@/components/admin/OrderItemImageCarousel';
import type { Database } from '@/lib/supabase/types';
import { parseDateFromDB } from '@/lib/utils';
import t from '@/lib/admin-translations-extended';

type OrderItem = Database['public']['Tables']['order_items']['Row'];

interface OrderGroup {
  order_number: string;
  order_id: string;
  delivery_date: string;
  items: OrderItem[];
}

interface OrderItemsModalProps {
  orderGroup: OrderGroup;
  onClose: () => void;
}

type ProductionStatus = 'new' | 'prepared' | 'baked' | 'creamed' | 'decorated' | 'packaged' | 'delivered';

const statusOptions: { value: ProductionStatus; label: string; color: string }[] = [
  { value: 'new', label: 'Новый', color: 'bg-blue-100 text-blue-700 border-blue-300' },
  { value: 'prepared', label: 'Подготовлен', color: 'bg-purple-100 text-purple-700 border-purple-300' },
  { value: 'baked', label: 'Испечен', color: 'bg-orange-100 text-orange-700 border-orange-300' },
  { value: 'creamed', label: 'Покрыт кремом', color: 'bg-pink-100 text-pink-700 border-pink-300' },
  { value: 'decorated', label: 'Украшен', color: 'bg-indigo-100 text-indigo-700 border-indigo-300' },
  { value: 'packaged', label: 'Упакован', color: 'bg-green-100 text-green-700 border-green-300' },
  { value: 'delivered', label: 'Доставлен', color: 'bg-gray-100 text-gray-700 border-gray-300' },
];

export default function OrderItemsModal({ orderGroup, onClose }: OrderItemsModalProps) {
  // Lock body scroll when modal is open
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  const router = useRouter();
  const [updatingItemId, setUpdatingItemId] = useState<string | null>(null);
  const [localItems, setLocalItems] = useState<OrderItem[]>(orderGroup.items);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const updateItemStatus = async (itemId: string, newStatus: ProductionStatus) => {
    setUpdatingItemId(itemId);
    setSuccessMessage(null);

    try {
      const response = await fetch('/api/admin/production/status', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId, status: newStatus }),
      });

      if (!response.ok) {
        throw new Error('Failed to update status');
      }

      const result = await response.json();

      // Update local state optimistically
      setLocalItems(prev => 
        prev.map(item => 
          item.id === itemId 
            ? { ...item, production_status: newStatus }
            : item
        )
      );

      // Show success message
      setSuccessMessage('Статус успешно обновлен!');
      setTimeout(() => setSuccessMessage(null), 3000);

      // Refresh the page data in the background (without reload)
      router.refresh();
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Не удалось обновить статус позиции. Попробуйте еще раз.');
    } finally {
      setUpdatingItemId(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-brown-500 to-brown-600 text-white p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex-1">
              <h2 className="text-3xl font-heading font-bold mb-2">
                Order #{orderGroup.order_number}
              </h2>
              <div className="flex items-center gap-4 text-sm">
                {orderGroup.delivery_date && (
                  <span>
                    {t.delivery}: {format(parseDateFromDB(orderGroup.delivery_date), 'MMM dd, yyyy')}
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
            >
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* Success Message */}
          {successMessage && (
            <div className="mt-3 bg-green-500 text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 animate-fade-in">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              {successMessage}
            </div>
          )}
        </div>


        {/* Modal Body - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Order Items */}
          <div>
            <h3 className="font-heading font-bold text-brown-500 text-xl mb-4">
              {t.orderItems} ({localItems.length})
            </h3>
            <div className="space-y-4">
              {localItems.length > 0 ? (
                localItems.map((item) => (
                  <div
                    key={item.id}
                    className="bg-white rounded-2xl p-6 border-2 border-cream-300 shadow-md"
                  >
                    {/* Item Header */}
                    <div className="flex items-start gap-6 mb-4">
                      <div className="flex-1">
                        <h4 className="text-2xl font-bold text-charcoal-900 mb-4">
                          {item.quantity}x {item.product_name}
                        </h4>
                        
                        {/* Product Details Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                          {item.weight_kg && (
                            <div className="bg-orange-50 rounded-xl px-4 py-3 border-2 border-orange-300">
                              <p className="text-sm font-semibold text-orange-600 uppercase mb-1">Вес</p>
                              <p className="text-2xl font-bold text-orange-900">{item.weight_kg}</p>
                            </div>
                          )}
                          {item.diameter_cm && (
                            <div className="bg-blue-50 rounded-xl px-4 py-3 border-2 border-blue-300">
                              <p className="text-sm font-semibold text-blue-600 uppercase mb-1">Диаметр</p>
                              <p className="text-2xl font-bold text-blue-900">{item.diameter_cm}см</p>
                            </div>
                          )}
                          {item.flavour_name && (
                            <div className="bg-purple-50 rounded-xl px-4 py-3 border-2 border-purple-300">
                              <p className="text-sm font-semibold text-purple-600 uppercase mb-1">{t.flavour}</p>
                              <p className="text-2xl font-bold text-purple-900">{item.flavour_name}</p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Product Images Reference */}
                      {item.product_image_urls && item.product_image_urls.length > 0 && (
                        <div className="flex-shrink-0">
                          <OrderItemImageCarousel
                            urls={item.product_image_urls}
                            containerClassName="relative w-64 h-64 rounded-2xl overflow-hidden border-4 border-brown-300 shadow-2xl"
                            imageClassName="object-cover"
                          />
                        </div>
                      )}
                    </div>

                    {/* Writing on Cake (Customer Request) */}
                    {item.writing_on_cake && (
                      <div className="mb-4 bg-purple-50 border-2 border-purple-300 rounded-lg p-3">
                        <p className="text-xs text-purple-600 font-semibold mb-1">{t.writingOnCake}</p>
                        <p className="text-lg text-purple-900 font-bold">{item.writing_on_cake}</p>
                      </div>
                    )}

                    {/* Internal Decoration Notes */}
                    {item.internal_decoration_notes && (
                      <div className="mb-4 bg-orange-50 border-2 border-orange-300 rounded-lg p-3">
                        <p className="text-xs text-orange-600 font-semibold mb-1">Примечания по декору</p>
                        <p className="text-sm text-orange-900">{item.internal_decoration_notes}</p>
                      </div>
                    )}

                    {/* Staff Notes */}
                    {item.staff_notes && (
                      <div className="mb-4 bg-blue-50 border-2 border-blue-300 rounded-lg p-3">
                        <p className="text-xs text-blue-600 font-semibold mb-1">Примечания персонала</p>
                        <p className="text-sm text-blue-900">{item.staff_notes}</p>
                      </div>
                    )}

                    {/* Status Selector */}
                    <div>
                      <label className="block text-sm font-semibold text-charcoal-700 mb-2">
                        Статус производства
                      </label>
                      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
                        {statusOptions.map((status) => {
                          const isActive = item.production_status === status.value;
                          return (
                            <button
                              key={status.value}
                              onClick={() => {
                                if (!isActive) {
                                  updateItemStatus(item.id, status.value);
                                }
                              }}
                              disabled={updatingItemId === item.id}
                              className={`
                                px-3 py-2 rounded-lg text-sm font-medium border-2 transition-all
                                ${isActive 
                                  ? `${status.color} ring-2 ring-brown-500 scale-105 shadow-lg` 
                                  : updatingItemId === item.id
                                  ? 'bg-gray-200 text-gray-500 border-gray-300 cursor-wait'
                                  : 'bg-white text-charcoal-600 border-cream-300 hover:border-brown-400 hover:scale-105'
                                }
                              `}
                            >
                              {status.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-charcoal-500 text-center py-8">Нет позиций в этом заказе</p>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-cream-50 border-t-2 border-cream-200 p-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-3 bg-brown-500 text-white rounded-xl font-semibold hover:bg-brown-600 transition-colors"
          >
            {t.close}
          </button>
        </div>
      </div>
    </div>
  );
}
