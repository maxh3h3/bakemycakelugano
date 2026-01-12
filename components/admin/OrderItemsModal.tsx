'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';
import type { Database } from '@/lib/supabase/types';

type Order = Database['public']['Tables']['orders']['Row'];
type OrderItem = Database['public']['Tables']['order_items']['Row'];

interface OrderWithItems extends Order {
  order_items: OrderItem[];
}

interface OrderItemsModalProps {
  order: OrderWithItems;
  onClose: () => void;
}

type ProductionStatus = 'new' | 'prepared' | 'baked' | 'creamed' | 'decorated' | 'packaged' | 'delivered';

const statusOptions: { value: ProductionStatus; label: string; color: string }[] = [
  { value: 'new', label: 'New', color: 'bg-blue-100 text-blue-700 border-blue-300' },
  { value: 'prepared', label: 'Prepared', color: 'bg-purple-100 text-purple-700 border-purple-300' },
  { value: 'baked', label: 'Baked', color: 'bg-orange-100 text-orange-700 border-orange-300' },
  { value: 'creamed', label: 'Creamed', color: 'bg-pink-100 text-pink-700 border-pink-300' },
  { value: 'decorated', label: 'Decorated', color: 'bg-indigo-100 text-indigo-700 border-indigo-300' },
  { value: 'packaged', label: 'Packaged', color: 'bg-green-100 text-green-700 border-green-300' },
  { value: 'delivered', label: 'Delivered', color: 'bg-gray-100 text-gray-700 border-gray-300' },
];

export default function OrderItemsModal({ order, onClose }: OrderItemsModalProps) {
  const router = useRouter();
  const [updatingItemId, setUpdatingItemId] = useState<string | null>(null);
  const [localOrder, setLocalOrder] = useState<OrderWithItems>(order);
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
      setLocalOrder(prev => ({
        ...prev,
        order_items: prev.order_items.map(item => 
          item.id === itemId 
            ? { ...item, production_status: newStatus }
            : item
        )
      }));

      // Show success message
      setSuccessMessage('Status updated successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);

      // Refresh the page data in the background (without reload)
      router.refresh();
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Failed to update item status. Please try again.');
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
                Order #{localOrder.order_number || localOrder.id.slice(0, 8)}
              </h2>
              <div className="flex items-center gap-4 text-sm">
                <span>Customer: {localOrder.customer_name}</span>
                {localOrder.delivery_date && (
                  <span>
                    Delivery: {format(new Date(localOrder.delivery_date), 'MMM dd, yyyy')}
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
          {/* Customer Notes */}
          {localOrder.customer_notes && (
            <div className="mb-6 bg-blue-50 rounded-xl p-4 border-2 border-blue-300">
              <h3 className="font-heading font-bold text-blue-900 mb-2">Customer Notes</h3>
              <p className="text-sm text-blue-800">{localOrder.customer_notes}</p>
            </div>
          )}

          {/* Order Items */}
          <div>
            <h3 className="font-heading font-bold text-brown-500 text-xl mb-4">
              Order Items ({localOrder.order_items?.length || 0})
            </h3>
            <div className="space-y-4">
              {localOrder.order_items && localOrder.order_items.length > 0 ? (
                localOrder.order_items.map((item) => (
                  <div
                    key={item.id}
                    className="bg-white rounded-2xl p-6 border-2 border-cream-300 shadow-md"
                  >
                    {/* Item Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h4 className="text-lg font-bold text-charcoal-900 mb-2">
                          {item.quantity}x {item.product_name}
                        </h4>
                        
                        {/* Product Details Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                          {item.size_label && (
                            <div className="bg-cream-50 rounded-lg px-3 py-2 border border-cream-300">
                              <p className="text-xs text-charcoal-500">Size</p>
                              <p className="font-semibold text-charcoal-900">{item.size_label}</p>
                            </div>
                          )}
                          {item.weight_kg && (
                            <div className="bg-cream-50 rounded-lg px-3 py-2 border border-cream-300">
                              <p className="text-xs text-charcoal-500">Weight</p>
                              <p className="font-semibold text-charcoal-900">{item.weight_kg}kg</p>
                            </div>
                          )}
                          {item.diameter_cm && (
                            <div className="bg-cream-50 rounded-lg px-3 py-2 border border-cream-300">
                              <p className="text-xs text-charcoal-500">Diameter</p>
                              <p className="font-semibold text-charcoal-900">{item.diameter_cm}cm</p>
                            </div>
                          )}
                          {item.flavour_name && (
                            <div className="bg-cream-50 rounded-lg px-3 py-2 border border-cream-300">
                              <p className="text-xs text-charcoal-500">Flavour</p>
                              <p className="font-semibold text-charcoal-900">{item.flavour_name}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Writing on Cake (Customer Request) */}
                    {item.writing_on_cake && (
                      <div className="mb-4 bg-purple-50 border-2 border-purple-300 rounded-lg p-3">
                        <p className="text-xs text-purple-600 font-semibold mb-1">Writing on Cake</p>
                        <p className="text-lg text-purple-900 font-bold">{item.writing_on_cake}</p>
                      </div>
                    )}

                    {/* Internal Decoration Notes */}
                    {item.internal_decoration_notes && (
                      <div className="mb-4 bg-orange-50 border-2 border-orange-300 rounded-lg p-3">
                        <p className="text-xs text-orange-600 font-semibold mb-1">Internal Decoration Notes</p>
                        <p className="text-sm text-orange-900">{item.internal_decoration_notes}</p>
                      </div>
                    )}

                    {/* Staff Notes */}
                    {item.staff_notes && (
                      <div className="mb-4 bg-blue-50 border-2 border-blue-300 rounded-lg p-3">
                        <p className="text-xs text-blue-600 font-semibold mb-1">Staff Notes</p>
                        <p className="text-sm text-blue-900">{item.staff_notes}</p>
                      </div>
                    )}

                    {/* Status Selector */}
                    <div>
                      <label className="block text-sm font-semibold text-charcoal-700 mb-2">
                        Production Status
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
                <p className="text-charcoal-500 text-center py-8">No items in this order</p>
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
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

