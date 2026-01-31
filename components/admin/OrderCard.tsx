'use client';

import { useState, useEffect, useRef } from 'react';
import OrderItemImageCarousel from '@/components/admin/OrderItemImageCarousel';
import { format } from 'date-fns';
import type { Database } from '@/lib/supabase/types';
import { formatDeliveryAddress } from '@/lib/schemas/delivery';
import { parseDateFromDB } from '@/lib/utils';
import EditOrderItemModal from '@/components/admin/EditOrderItemModal';
import AddOrderItemModal from '@/components/admin/AddOrderItemModal';
import ConfirmationDialog from '@/components/ui/ConfirmationDialog';
import t from '@/lib/admin-translations-extended';
import { Edit, ChevronDown, Check, Trash2, Pencil, Paintbrush, FileText, Plus } from 'lucide-react';

type Order = Database['public']['Tables']['orders']['Row'];
type OrderItem = Database['public']['Tables']['order_items']['Row'];
type Client = Database['public']['Tables']['clients']['Row'];

interface OrderWithItems extends Order {
  order_items: OrderItem[];
  client: Client | null;
}

interface OrderCardProps {
  order: OrderWithItems;
  onUpdate: () => void;
}

interface OrderEditFormData {
  delivery_type: string;
  delivery_date: string;
  delivery_time: string;
  delivery_address: {
    street: string;
    city: string;
    postalCode: string;
    country: string;
  } | null;
  paid: boolean;
  payment_method: string;
  customer_notes: string;
}

export default function OrderCard({ order: initialOrder, onUpdate }: OrderCardProps) {
  const [order, setOrder] = useState<OrderWithItems>(initialOrder);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditingOrder, setIsEditingOrder] = useState(false);
  const [editFormData, setEditFormData] = useState<OrderEditFormData>({
    delivery_type: order.delivery_type || 'delivery',
    delivery_date: order.delivery_date || '',
    delivery_time: order.delivery_time || '',
    delivery_address: order.delivery_address || null,
    paid: order.paid || false,
    payment_method: order.payment_method || '',
    customer_notes: order.customer_notes || '',
  });
  const [editingItem, setEditingItem] = useState<OrderItem | null>(null);
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [isSavingOrder, setIsSavingOrder] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; orderId: string | null }>({
    isOpen: false,
    orderId: null,
  });
  const [isDeleting, setIsDeleting] = useState(false);
  const [isMarkingPaid, setIsMarkingPaid] = useState(false);
  const [showPaymentSelector, setShowPaymentSelector] = useState(false);
  const paymentSelectorRef = useRef<HTMLDivElement>(null);

  // Sync local state when prop changes (e.g., from router.refresh())
  useEffect(() => {
    setOrder(initialOrder);
  }, [initialOrder]);

  // Close payment selector when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (paymentSelectorRef.current && !paymentSelectorRef.current.contains(event.target as Node)) {
        setShowPaymentSelector(false);
      }
    };

    if (showPaymentSelector) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showPaymentSelector]);

  const formatCurrency = (amount: number, currency: string = 'CHF') => {
    return new Intl.NumberFormat('de-CH', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  const toggleExpansion = async () => {
    // If collapsing while in edit mode, save changes first
    if (isExpanded && isEditingOrder) {
      await saveOrderChanges();
    }
    setIsExpanded(!isExpanded);
  };

  const startEditingOrder = () => {
    setEditFormData({
      delivery_type: order.delivery_type || 'delivery',
      delivery_date: order.delivery_date || '',
      delivery_time: order.delivery_time || '',
      delivery_address: order.delivery_address || null,
      paid: order.paid || false,
      payment_method: order.payment_method || '',
      customer_notes: order.customer_notes || '',
    });
    setIsEditingOrder(true);
  };

  const cancelEditingOrder = () => {
    setIsEditingOrder(false);
    setEditFormData({
      delivery_type: order.delivery_type || 'delivery',
      delivery_date: order.delivery_date || '',
      delivery_time: order.delivery_time || '',
      delivery_address: order.delivery_address || null,
      paid: order.paid || false,
      payment_method: order.payment_method || '',
      customer_notes: order.customer_notes || '',
    });
  };

  const saveOrderChanges = async () => {
    setIsSavingOrder(true);

    try {
      const response = await fetch(`/api/admin/orders/${order.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          delivery_type: editFormData.delivery_type,
          delivery_date: editFormData.delivery_date || null,
          delivery_time: editFormData.delivery_time || null,
          delivery_address: editFormData.delivery_address,
          paid: editFormData.paid,
          payment_method: editFormData.payment_method || null,
          customer_notes: editFormData.customer_notes || null,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update order');
      }

      const { order: updatedOrder } = await response.json();

      // Update local state optimistically
      setOrder(prev => ({
        ...prev,
        ...updatedOrder,
      }));

      setIsEditingOrder(false);
      
      // Refresh in background without reload
      onUpdate();
    } catch (error) {
      console.error('Error updating order:', error);
      alert('Failed to update order. Please try again.');
    } finally {
      setIsSavingOrder(false);
    }
  };

  const deleteOrder = async (orderId: string) => {
    setIsDeleting(true);

    try {
      const response = await fetch(`/api/admin/orders/${orderId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete order');
      }

      onUpdate();
    } catch (error) {
      console.error('Error deleting order:', error);
      alert(error instanceof Error ? error.message : t.failedToDeleteOrder + '. ' + t.tryAgain);
      setIsDeleting(false);
      setDeleteConfirm({ isOpen: false, orderId: null });
    }
  };

  const handleItemUpdate = () => {
    // Refresh in background
    onUpdate();
  };

  const handleItemAdd = () => {
    // Refresh in background
    onUpdate();
  };

  const handlePaymentStatusChange = async (newPaidStatus: string) => {
    if (newPaidStatus === '') return;
    
    const isPaid = newPaidStatus === 'paid';
    
    // If marking as unpaid, we'll just update the order
    // If marking as paid, we'll call the mark-paid endpoint which creates revenue transaction
    
    setIsMarkingPaid(true);
    setShowPaymentSelector(false);

    try {
      if (isPaid) {
        // Call mark-paid endpoint (creates revenue transaction)
        const response = await fetch(`/api/admin/orders/${order.id}/mark-paid`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ payment_method: 'cash' }), // Default to cash
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to mark order as paid');
        }

        // Update local state optimistically
        setOrder(prev => ({
          ...prev,
          paid: true,
          payment_method: 'cash',
        }));
      } else {
        // Mark as unpaid (just update order, don't create revenue transaction)
        const response = await fetch(`/api/admin/orders/${order.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ paid: false }),
        });

        if (!response.ok) {
          throw new Error('Failed to update payment status');
        }

        // Update local state optimistically
        setOrder(prev => ({
          ...prev,
          paid: false,
        }));
      }

      // Refresh in background
      onUpdate();
    } catch (error) {
      console.error('Error updating payment status:', error);
      alert(error instanceof Error ? error.message : 'Failed to update payment status. Please try again.');
    } finally {
      setIsMarkingPaid(false);
    }
  };

  return (
    <>
      <div className="bg-white rounded-2xl shadow-md border-2 border-cream-200 transition-all duration-300 hover:shadow-lg">
        {/* Order Header */}
        <div className="relative p-6">
          <div className="flex items-stretch gap-4">
            {/* Order Number & Date */}
            <div className="bg-brown-50 rounded-xl p-4 border-2 border-brown-200 flex-1 min-h-[100px] flex flex-col justify-between">
              <p className="text-xs font-semibold text-brown-600 uppercase mb-1">Order #</p>
              <div>
                <p className="font-mono text-lg font-bold text-brown-500">
                  {order.order_number || order.id.slice(0, 8) + '...'}
                </p>
                <p className="text-xs text-charcoal-500 mt-1">
                  {format(new Date(order.created_at), 'MMM dd, HH:mm')}
                </p>
              </div>
            </div>

            {/* Customer */}
            <div className="bg-purple-50 rounded-xl p-4 border-2 border-purple-200 flex-1 min-h-[100px] flex flex-col justify-between">
              <p className="text-xs font-semibold text-purple-600 uppercase mb-1">{t.customer}</p>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-bold text-charcoal-900">{order.client?.name || 'Unknown Customer'}</p>
                  {order.client && order.client.total_orders && order.client.total_orders > 1 && (
                    <span
                      className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold"
                      title="Returning customer"
                    >
                      ★
                    </span>
                  )}
                </div>
                <p className="text-xs text-purple-700">{order.client?.email || order.client?.phone || 'No contact info'}</p>
              </div>
            </div>

            {/* Total & Payment */}
            <div 
              ref={paymentSelectorRef}
              className={`rounded-xl p-4 border-2 flex-1 min-h-[100px] flex flex-col justify-between relative ${
                order.paid 
                  ? 'bg-green-50 border-green-200' 
                  : 'bg-rose-50 border-rose-200'
              }`}
            >
              <p className={`text-xs font-semibold uppercase mb-1 ${
                order.paid ? 'text-green-600' : 'text-rose-600'
              }`}>{t.total}</p>
              <div 
                className="cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => !isMarkingPaid && setShowPaymentSelector(!showPaymentSelector)}
              >
                <p className={`text-xl font-bold ${
                  order.paid ? 'text-green-700' : 'text-rose-700'
                }`}>
                  {isMarkingPaid ? 'Обработка...' : formatCurrency(order.total_amount, order.currency)}
                </p>
              </div>

              {/* Payment Status Selector - Above */}
              {showPaymentSelector && !isMarkingPaid && (
                <div className="absolute bottom-full left-0 right-0 mb-2 z-[9999] bg-white rounded-lg shadow-2xl border-2 border-cream-300 overflow-hidden">
                  <button
                    onClick={() => handlePaymentStatusChange('paid')}
                    className={`w-full px-4 py-3 text-left transition-colors flex items-center gap-2 border-b border-cream-200 ${
                      order.paid 
                        ? 'bg-green-100 text-green-800 font-semibold' 
                        : 'hover:bg-green-50 text-charcoal-900'
                    }`}
                  >
                    <span className="text-sm">Оплачено</span>
                  </button>
                  <button
                    onClick={() => handlePaymentStatusChange('unpaid')}
                    className={`w-full px-4 py-3 text-left transition-colors flex items-center gap-2 ${
                      !order.paid 
                        ? 'bg-rose-100 text-rose-800 font-semibold' 
                        : 'hover:bg-rose-50 text-charcoal-900'
                    }`}
                  >
                    <span className="text-sm">Не оплачено</span>
                  </button>
                </div>
              )}
            </div>

            {/* Delivery Type */}
            <div className="bg-blue-50 rounded-xl p-4 border-2 border-blue-200 flex-1 min-h-[100px] flex flex-col justify-between">
              <p className="text-xs font-semibold text-blue-600 uppercase mb-1">{t.delivery}</p>
              <p className="font-bold text-charcoal-900 capitalize">
                {order.delivery_type || 'N/A'}
              </p>
            </div>

            {/* Action Buttons - Vertically Centered */}
            <div className="flex flex-col items-center justify-center gap-2">
              {/* Edit Order Button */}
              {!isEditingOrder && (
                <button
                  onClick={() => {
                    if (!isExpanded) {
                      setIsExpanded(true);
                    }
                    startEditingOrder();
                  }}
                  className="p-3 rounded-full bg-blue-500 text-white hover:bg-blue-600 transition-all shadow-md hover:shadow-lg hover:scale-110"
                  title={t.editOrder}
                >
                  <Edit className="w-5 h-5" />
                </button>
              )}

              {/* Expand/Collapse Button */}
              <button
                onClick={toggleExpansion}
                className="p-3 rounded-full bg-cream-100 text-charcoal-700 hover:bg-cream-200 transition-all"
                title={isExpanded ? "Свернуть" : "Развернуть"}
              >
                <ChevronDown
                  className={`w-5 h-5 transition-transform duration-300 ${
                    isExpanded ? 'rotate-180' : ''
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Expanded Order Details */}
        <div
          className={`border-t-2 border-cream-200 bg-cream-50/30 transition-all duration-300 ease-in-out ${
            isExpanded ? 'max-h-[3000px] opacity-100' : 'max-h-0 opacity-0 overflow-hidden'
          }`}
        >
          <div className="p-6">
            {/* Action Buttons - Top of expanded section */}
            {isEditingOrder && (
              <div className="mb-6 pb-6 border-b-2 border-cream-200">
                <div className="flex gap-3">
                  <button
                    onClick={saveOrderChanges}
                    disabled={isSavingOrder}
                    className="flex-1 px-6 py-3 rounded-full bg-brown-500 text-white font-semibold hover:bg-brown-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md"
                  >
                    {isSavingOrder ? (
                      t.saving
                    ) : (
                      <>
                        <Check className="w-5 h-5" />
                        {t.save}
                      </>
                    )}
                  </button>
                  <button
                    onClick={cancelEditingOrder}
                    disabled={isSavingOrder}
                    className="flex-1 px-6 py-3 rounded-full border-2 border-cream-300 bg-white text-charcoal-700 font-semibold hover:bg-cream-50 transition-all disabled:opacity-50"
                  >
                    {t.cancel}
                  </button>
                  <button
                    onClick={() => setDeleteConfirm({ isOpen: true, orderId: order.id })}
                    disabled={isSavingOrder}
                    className="flex-1 px-6 py-3 rounded-full bg-rose-500 text-white font-semibold hover:bg-rose-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-md"
                  >
                    <Trash2 className="w-5 h-5" />
                    {t.deleteOrder}
                  </button>
                </div>
              </div>
            )}

            {/* Delivery Details Section */}
            <div className="mb-6">
              <h4 className="font-heading font-semibold text-brown-500 mb-3">
                Информация о доставке
              </h4>
              {isEditingOrder ? (
                // EDIT MODE
                <div className="bg-white p-4 rounded-xl border-2 border-brown-300">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Delivery Type */}
                    <div>
                      <label className="block text-sm font-medium text-charcoal-700 mb-1">
                        {t.deliveryType}
                      </label>
                      <select
                        value={editFormData.delivery_type}
                        onChange={(e) => {
                          const newType = e.target.value;
                          setEditFormData({
                            ...editFormData,
                            delivery_type: newType,
                            delivery_address: newType === 'pickup' ? null : editFormData.delivery_address,
                          });
                        }}
                        className="w-full px-3 py-2 rounded-lg border-2 border-cream-300 focus:border-brown-500 focus:outline-none"
                      >
                        <option value="delivery">{t.delivery}</option>
                        <option value="pickup">{t.pickup}</option>
                      </select>
                    </div>

                    {/* Delivery Date */}
                    <div>
                      <label className="block text-sm font-medium text-charcoal-700 mb-1">
                        {t.deliveryDate}
                      </label>
                      <input
                        type="date"
                        value={editFormData.delivery_date}
                        onChange={(e) =>
                          setEditFormData({ ...editFormData, delivery_date: e.target.value })
                        }
                        className="w-full px-3 py-2 rounded-lg border-2 border-cream-300 focus:border-brown-500 focus:outline-none"
                      />
                    </div>

                    {/* Delivery Time */}
                    <div>
                      <label className="block text-sm font-medium text-charcoal-700 mb-1">
                        {t.deliveryTime}
                      </label>
                      <input
                        type="text"
                        value={editFormData.delivery_time}
                        onChange={(e) =>
                          setEditFormData({ ...editFormData, delivery_time: e.target.value })
                        }
                        placeholder="e.g., 14:00-16:00"
                        className="w-full px-3 py-2 rounded-lg border-2 border-cream-300 focus:border-brown-500 focus:outline-none"
                      />
                    </div>

                    {/* Delivery Address (only if delivery type = delivery) */}
                    {editFormData.delivery_type === 'delivery' && (
                      <div className="col-span-1 md:col-span-2">
                        <label className="block text-sm font-medium text-charcoal-700 mb-2">
                          {t.deliveryAddress}
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="col-span-2">
                            <input
                              type="text"
                              value={editFormData.delivery_address?.street || ''}
                              onChange={(e) =>
                                setEditFormData({
                                  ...editFormData,
                                  delivery_address: {
                                    ...(editFormData.delivery_address || {
                                      street: '',
                                      city: '',
                                      postalCode: '',
                                      country: '',
                                    }),
                                    street: e.target.value,
                                  },
                                })
                              }
                              placeholder="Адрес улицы"
                              className="w-full px-3 py-2 rounded-lg border-2 border-cream-300 focus:border-brown-500 focus:outline-none"
                            />
                          </div>
                          <div>
                            <input
                              type="text"
                              value={editFormData.delivery_address?.city || ''}
                              onChange={(e) =>
                                setEditFormData({
                                  ...editFormData,
                                  delivery_address: {
                                    ...(editFormData.delivery_address || {
                                      street: '',
                                      city: '',
                                      postalCode: '',
                                      country: '',
                                    }),
                                    city: e.target.value,
                                  },
                                })
                              }
                              placeholder={t.city}
                              className="w-full px-3 py-2 rounded-lg border-2 border-cream-300 focus:border-brown-500 focus:outline-none"
                            />
                          </div>
                          <div>
                            <input
                              type="text"
                              value={editFormData.delivery_address?.postalCode || ''}
                              onChange={(e) =>
                                setEditFormData({
                                  ...editFormData,
                                  delivery_address: {
                                    ...(editFormData.delivery_address || {
                                      street: '',
                                      city: '',
                                      postalCode: '',
                                      country: '',
                                    }),
                                    postalCode: e.target.value,
                                  },
                                })
                              }
                              placeholder="Индекс"
                              className="w-full px-3 py-2 rounded-lg border-2 border-cream-300 focus:border-brown-500 focus:outline-none"
                            />
                          </div>
                          <div className="col-span-2">
                            <input
                              type="text"
                              value={editFormData.delivery_address?.country || ''}
                              onChange={(e) =>
                                setEditFormData({
                                  ...editFormData,
                                  delivery_address: {
                                    ...(editFormData.delivery_address || {
                                      street: '',
                                      city: '',
                                      postalCode: '',
                                      country: '',
                                    }),
                                    country: e.target.value,
                                  },
                                })
                              }
                              placeholder={t.country}
                              className="w-full px-3 py-2 rounded-lg border-2 border-cream-300 focus:border-brown-500 focus:outline-none"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Customer Notes */}
                    <div className="col-span-1 md:col-span-2">
                      <label className="block text-sm font-medium text-charcoal-700 mb-1">
                        {t.notes}
                      </label>
                      <textarea
                        value={editFormData.customer_notes}
                        onChange={(e) =>
                          setEditFormData({ ...editFormData, customer_notes: e.target.value })
                        }
                        placeholder="Любые особые пожелания или примечания"
                        rows={3}
                        className="w-full px-3 py-2 rounded-lg border-2 border-cream-300 focus:border-brown-500 focus:outline-none resize-none"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                // VIEW MODE
                <div className="space-y-2 text-sm bg-white p-4 rounded-xl border border-cream-300">
                  <p>
                    <span className="text-charcoal-500">Тип:</span>{' '}
                    <span className="font-medium capitalize">
                      {order.delivery_type === 'delivery' ? t.delivery : order.delivery_type === 'pickup' ? t.pickup : 'N/A'}
                    </span>
                  </p>
                  {order.delivery_date && (
                    <p>
                      <span className="text-charcoal-500">Дата:</span>{' '}
                      <span className="font-medium">
                        {format(parseDateFromDB(order.delivery_date), 'MMMM dd, yyyy')}
                      </span>
                    </p>
                  )}
                  {order.delivery_address && (
                    <p>
                      <span className="text-charcoal-500">Адрес:</span>{' '}
                      <span className="font-medium">{formatDeliveryAddress(order.delivery_address)}</span>
                    </p>
                  )}
                  {order.delivery_time && (
                    <p>
                      <span className="text-charcoal-500">Время:</span>{' '}
                      <span className="font-medium">{order.delivery_time}</span>
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Customer Notes (view only when not editing) */}
            {!isEditingOrder && order.customer_notes && (
              <div className="mb-6">
                <h4 className="font-heading font-semibold text-brown-500 mb-3">
                  {t.notes}
                </h4>
                <p className="text-sm text-charcoal-700 bg-white p-4 rounded-xl border border-cream-300">
                  {order.customer_notes}
                </p>
              </div>
            )}

            {/* Order Items */}
            <div>
              <h4 className="font-heading font-semibold text-brown-500 mb-3">{t.orderItems}</h4>
              <div className="space-y-4">
                {order.order_items.map((item) => (
                  <div
                    key={item.id}
                    className="bg-white rounded-xl p-5 border-2 border-cream-300 shadow-sm"
                  >
                    {/* Item Header with Title and Price */}
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div className="flex items-start gap-4 flex-grow">
                        {/* Product Images - Enhanced Size */}
                        {item.product_image_urls && item.product_image_urls.length > 0 ? (
                          <div className="flex-shrink-0">
                            <OrderItemImageCarousel
                              urls={item.product_image_urls}
                              containerClassName="relative w-32 h-32 rounded-xl border-2 border-cream-300 shadow-md overflow-hidden hover:shadow-xl transition-shadow cursor-pointer"
                              imageClassName="object-cover hover:scale-105 transition-transform duration-200"
                            />
                          </div>
                        ) : (
                          <div className="flex-shrink-0 w-32 h-32 rounded-xl border-2 border-dashed border-cream-400 bg-cream-50 flex items-center justify-center">
                            <div className="text-center px-3">
                              <svg 
                                className="w-10 h-10 mx-auto mb-2 text-cream-400" 
                                fill="none" 
                                stroke="currentColor" 
                                viewBox="0 0 24 24"
                              >
                                <path 
                                  strokeLinecap="round" 
                                  strokeLinejoin="round" 
                                  strokeWidth={2} 
                                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" 
                                />
                              </svg>
                              <p className="text-xs text-cream-500 font-medium">No photo</p>
                            </div>
                          </div>
                        )}

                        {/* Product Title */}
                        <div className="flex-grow">
                          <h5 className="font-heading font-bold text-2xl text-charcoal-900">
                            {item.product_name}
                          </h5>
                          {item.product_image_urls && item.product_image_urls.length > 0 && (
                            <p className="text-xs text-charcoal-500 mt-1">
                              {item.product_image_urls.length} {item.product_image_urls.length === 1 ? 'photo' : 'photos'}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Price and Edit Button */}
                      <div className="flex items-start gap-3">
                        {/* Price */}
                        <div className="bg-cream-50 border-2 border-cream-300 rounded-xl px-6 py-3 text-right min-w-[140px]">
                          <p className="text-2xl font-bold text-brown-600">
                            {formatCurrency(item.subtotal, order.currency)}
                          </p>
                        </div>

                        {/* Edit Item Button */}
                        {!isEditingOrder && (
                          <button
                            onClick={() => setEditingItem(item)}
                            className="p-3 rounded-xl bg-blue-500 text-white hover:bg-blue-600 transition-all shadow-md hover:shadow-lg hover:scale-105"
                            title={t.editItem}
                          >
                            <Edit className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Info Grid - Below Title */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                      {item.flavour_name && (
                        <div className="bg-purple-50 border-2 border-purple-300 rounded-xl p-3">
                          <p className="text-xs font-semibold text-purple-600 uppercase mb-1">
                            {t.flavour}
                          </p>
                          <p className="text-base font-bold text-charcoal-900">
                            {item.flavour_name}
                          </p>
                        </div>
                      )}

                      <div className="bg-green-50 border-2 border-green-300 rounded-xl p-3">
                        <p className="text-xs font-semibold text-green-600 uppercase mb-1">
                          {t.quantity}
                        </p>
                        <p className="text-base font-bold text-charcoal-900">{item.quantity}</p>
                      </div>

                      {item.weight_kg && (
                        <div className="bg-orange-50 border-2 border-orange-300 rounded-xl p-3">
                          <p className="text-xs font-semibold text-orange-600 uppercase mb-1">
                            Вес
                          </p>
                          <p className="text-base font-bold text-charcoal-900">
                            {item.weight_kg}
                          </p>
                        </div>
                      )}

                      {item.diameter_cm && (
                        <div className="bg-pink-50 border-2 border-pink-300 rounded-xl p-3">
                          <p className="text-xs font-semibold text-pink-600 uppercase mb-1">
                            Диаметр
                          </p>
                          <p className="text-base font-bold text-charcoal-900">
                            {item.diameter_cm} cm
                          </p>
                        </div>
                      )}

                      {item.production_status && (
                        <div className="bg-indigo-50 border-2 border-indigo-300 rounded-xl p-3">
                          <p className="text-xs font-semibold text-indigo-600 uppercase mb-1">
                            {t.status}
                          </p>
                          <p className="text-base font-bold text-charcoal-900 capitalize">
                            {item.production_status}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Special Notes Section */}
                    {(item.writing_on_cake || item.internal_decoration_notes || item.staff_notes) && (
                      <div className="space-y-3 mt-4">
                        {item.writing_on_cake && (
                          <div className="bg-gradient-to-r from-purple-50 to-purple-100 border-2 border-purple-300 rounded-xl p-4">
                            <div className="flex items-center gap-3 mb-2">
                              <Pencil className="w-5 h-5 text-purple-600" />
                              <p className="text-sm font-bold text-purple-700 uppercase tracking-wide">
                                {t.writingOnCake}
                              </p>
                            </div>
                            <p className="text-base text-purple-900 pl-8">
                              {item.writing_on_cake}
                            </p>
                          </div>
                        )}

                        {item.internal_decoration_notes && (
                          <div className="bg-gradient-to-r from-blue-50 to-blue-100 border-2 border-blue-300 rounded-xl p-4">
                            <div className="flex items-center gap-3 mb-2">
                              <Paintbrush className="w-5 h-5 text-blue-600" />
                              <p className="text-sm font-bold text-blue-700 uppercase tracking-wide">
                                Примечания по декору
                              </p>
                            </div>
                            <p className="text-base text-blue-900 pl-8">
                              {item.internal_decoration_notes}
                            </p>
                          </div>
                        )}

                        {item.staff_notes && (
                          <div className="bg-gradient-to-r from-amber-50 to-amber-100 border-2 border-amber-300 rounded-xl p-4">
                            <div className="flex items-center gap-3 mb-2">
                              <FileText className="w-5 h-5 text-amber-600" />
                              <p className="text-sm font-bold text-amber-700 uppercase tracking-wide">
                                Примечания персонала
                              </p>
                            </div>
                            <p className="text-base text-amber-900 pl-8">{item.staff_notes}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}

                {/* Add Item Button */}
                {!isEditingOrder && (
                  <button
                    onClick={() => setIsAddingItem(true)}
                    className="w-full p-6 border-2 border-dashed border-brown-300 rounded-xl hover:border-brown-500 hover:bg-brown-50 transition-all text-brown-600 font-semibold flex items-center justify-center gap-2"
                  >
                    <Plus className="w-6 h-6" />
                    {t.addItem}
                  </button>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Edit Item Modal */}
      {editingItem && (
        <EditOrderItemModal
          item={editingItem}
          orderId={order.id}
          currency={order.currency}
          onClose={() => setEditingItem(null)}
          onUpdate={handleItemUpdate}
        />
      )}

      {/* Add Item Modal */}
      {isAddingItem && (
        <AddOrderItemModal
          orderId={order.id}
          orderDeliveryDate={order.delivery_date || ''}
          currency={order.currency}
          onClose={() => setIsAddingItem(false)}
          onSuccess={handleItemAdd}
        />
      )}

      {/* Delete Order Confirmation */}
      <ConfirmationDialog
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, orderId: null })}
        onConfirm={() => deleteConfirm.orderId && deleteOrder(deleteConfirm.orderId)}
        title={t.deleteOrder + "?"}
        message="Вы уверены, что хотите удалить этот заказ? Это безвозвратно удалит все позиции заказа. Запись клиента останется, но его статистика будет обновлена."
        confirmText={t.deleteOrder}
        cancelText={t.cancel}
        variant="danger"
        isLoading={isDeleting}
      />
    </>
  );
}
