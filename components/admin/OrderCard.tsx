'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { format } from 'date-fns';
import type { Database } from '@/lib/supabase/types';
import { formatDeliveryAddress } from '@/lib/schemas/delivery';
import { parseDateFromDB } from '@/lib/utils';
import EditOrderItemModal from './EditOrderItemModal';
import AddOrderItemModal from './AddOrderItemModal';
import ConfirmationDialog from '@/components/ui/ConfirmationDialog';

type Order = Database['public']['Tables']['orders']['Row'];
type OrderItem = Database['public']['Tables']['order_items']['Row'];

interface OrderWithItems extends Order {
  order_items: OrderItem[];
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

  // Sync local state when prop changes (e.g., from router.refresh())
  useEffect(() => {
    setOrder(initialOrder);
  }, [initialOrder]);

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
      alert(error instanceof Error ? error.message : 'Failed to delete order. Please try again.');
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

  return (
    <>
      <div className="bg-white rounded-2xl shadow-md border-2 border-cream-200 overflow-hidden transition-all duration-300 hover:shadow-lg">
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
              <p className="text-xs font-semibold text-purple-600 uppercase mb-1">Customer</p>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-bold text-charcoal-900">{order.customer_name}</p>
                  {order.client_id && (
                    <span
                      className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold"
                      title="Returning customer"
                    >
                      ★
                    </span>
                  )}
                </div>
                <p className="text-xs text-purple-700">{order.customer_email}</p>
              </div>
            </div>

            {/* Total & Payment */}
            <div className={`rounded-xl p-4 border-2 flex-1 min-h-[100px] flex flex-col justify-between ${
              order.paid 
                ? 'bg-green-50 border-green-200' 
                : 'bg-rose-50 border-rose-200'
            }`}>
              <p className={`text-xs font-semibold uppercase mb-1 ${
                order.paid ? 'text-green-600' : 'text-rose-600'
              }`}>Total</p>
              <div>
                <p className={`text-xl font-bold ${
                  order.paid ? 'text-green-700' : 'text-rose-700'
                }`}>
                  {formatCurrency(order.total_amount, order.currency)}
                </p>
              </div>
            </div>

            {/* Delivery Type */}
            <div className="bg-blue-50 rounded-xl p-4 border-2 border-blue-200 flex-1 min-h-[100px] flex flex-col justify-between">
              <p className="text-xs font-semibold text-blue-600 uppercase mb-1">Delivery</p>
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
                  title="Edit Order"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    />
                  </svg>
                </button>
              )}

              {/* Expand/Collapse Button */}
              <button
                onClick={toggleExpansion}
                className="p-3 rounded-full bg-cream-100 text-charcoal-700 hover:bg-cream-200 transition-all"
                title={isExpanded ? "Collapse" : "Expand"}
              >
                <svg
                  className={`w-5 h-5 transition-transform duration-300 ${
                    isExpanded ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Expanded Order Details */}
        <div
          className={`border-t-2 border-cream-200 bg-cream-50/30 overflow-hidden transition-all duration-300 ease-in-out ${
            isExpanded ? 'max-h-[3000px] opacity-100' : 'max-h-0 opacity-0'
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
                      'Saving...'
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                        Save Changes
                      </>
                    )}
                  </button>
                  <button
                    onClick={cancelEditingOrder}
                    disabled={isSavingOrder}
                    className="flex-1 px-6 py-3 rounded-full border-2 border-cream-300 bg-white text-charcoal-700 font-semibold hover:bg-cream-50 transition-all disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => setDeleteConfirm({ isOpen: true, orderId: order.id })}
                    disabled={isSavingOrder}
                    className="flex-1 px-6 py-3 rounded-full bg-rose-500 text-white font-semibold hover:bg-rose-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-md"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                    Delete Order
                  </button>
                </div>
              </div>
            )}

            {/* Delivery Details Section */}
            <div className="mb-6">
              <h4 className="font-heading font-semibold text-brown-500 mb-3">
                Delivery Information
              </h4>
              {isEditingOrder ? (
                // EDIT MODE
                <div className="bg-white p-4 rounded-xl border-2 border-brown-300">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Delivery Type */}
                    <div>
                      <label className="block text-sm font-medium text-charcoal-700 mb-1">
                        Delivery Type
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
                        <option value="delivery">Delivery</option>
                        <option value="pickup">Pickup</option>
                      </select>
                    </div>

                    {/* Delivery Date */}
                    <div>
                      <label className="block text-sm font-medium text-charcoal-700 mb-1">
                        Delivery Date
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
                        Delivery Time
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

                    {/* Payment Status */}
                    <div className="flex items-center pt-6">
                      <label className="flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editFormData.paid}
                          onChange={(e) =>
                            setEditFormData({ ...editFormData, paid: e.target.checked })
                          }
                          className="w-5 h-5 rounded border-2 border-cream-300 text-brown-500 focus:ring-brown-500 focus:ring-2"
                        />
                        <span className="ml-2 text-sm font-medium text-charcoal-700">
                          Mark as Paid
                        </span>
                      </label>
                    </div>

                    {/* Payment Method */}
                    <div className="col-span-1 md:col-span-2">
                      <label className="block text-sm font-medium text-charcoal-700 mb-1">
                        Payment Method
                      </label>
                      <select
                        value={editFormData.payment_method}
                        onChange={(e) =>
                          setEditFormData({ ...editFormData, payment_method: e.target.value })
                        }
                        className="w-full px-3 py-2 rounded-lg border-2 border-cream-300 focus:border-brown-500 focus:outline-none"
                      >
                        <option value="">Select payment method...</option>
                        <option value="cash">Cash</option>
                        <option value="twint">Twint</option>
                        <option value="stripe">Stripe</option>
                      </select>
                    </div>

                    {/* Delivery Address (only if delivery type = delivery) */}
                    {editFormData.delivery_type === 'delivery' && (
                      <div className="col-span-1 md:col-span-2">
                        <label className="block text-sm font-medium text-charcoal-700 mb-2">
                          Delivery Address
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
                              placeholder="Street Address"
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
                              placeholder="City"
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
                              placeholder="Postal Code"
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
                              placeholder="Country"
                              className="w-full px-3 py-2 rounded-lg border-2 border-cream-300 focus:border-brown-500 focus:outline-none"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Customer Notes */}
                    <div className="col-span-1 md:col-span-2">
                      <label className="block text-sm font-medium text-charcoal-700 mb-1">
                        Customer Notes
                      </label>
                      <textarea
                        value={editFormData.customer_notes}
                        onChange={(e) =>
                          setEditFormData({ ...editFormData, customer_notes: e.target.value })
                        }
                        placeholder="Any special requests or notes"
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
                    <span className="text-charcoal-500">Type:</span>{' '}
                    <span className="font-medium capitalize">
                      {order.delivery_type || 'N/A'}
                    </span>
                  </p>
                  {order.delivery_date && (
                    <p>
                      <span className="text-charcoal-500">Date:</span>{' '}
                      <span className="font-medium">
                        {format(parseDateFromDB(order.delivery_date), 'MMMM dd, yyyy')}
                      </span>
                    </p>
                  )}
                  {order.delivery_address && (
                    <p>
                      <span className="text-charcoal-500">Address:</span>{' '}
                      <span className="font-medium">{formatDeliveryAddress(order.delivery_address)}</span>
                    </p>
                  )}
                  {order.delivery_time && (
                    <p>
                      <span className="text-charcoal-500">Time:</span>{' '}
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
                  Customer Notes
                </h4>
                <p className="text-sm text-charcoal-700 bg-white p-4 rounded-xl border border-cream-300">
                  {order.customer_notes}
                </p>
              </div>
            )}

            {/* Order Items */}
            <div>
              <h4 className="font-heading font-semibold text-brown-500 mb-3">Order Items</h4>
              <div className="space-y-4">
                {order.order_items.map((item) => (
                  <div
                    key={item.id}
                    className="bg-white rounded-xl p-5 border-2 border-cream-300 shadow-sm"
                  >
                    {/* Item Header with Title and Price */}
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div className="flex items-start gap-4 flex-grow">
                        {/* Product Image */}
                        {item.product_image_url && (
                          <div className="flex-shrink-0">
                            <Image
                              src={item.product_image_url}
                              alt={item.product_name}
                              width={80}
                              height={80}
                              className="rounded-xl object-cover border-2 border-cream-300 shadow-sm"
                            />
                          </div>
                        )}

                        {/* Product Title */}
                        <div>
                          <h5 className="font-heading font-bold text-2xl text-charcoal-900">
                            {item.product_name}
                          </h5>
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
                            title="Edit Item"
                          >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                              />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Info Grid - Below Title */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                      {item.flavour_name && (
                        <div className="bg-purple-50 border-2 border-purple-300 rounded-xl p-3">
                          <p className="text-xs font-semibold text-purple-600 uppercase mb-1">
                            Flavour
                          </p>
                          <p className="text-base font-bold text-charcoal-900">
                            {item.flavour_name}
                          </p>
                        </div>
                      )}

                      {item.size_label && (
                        <div className="bg-blue-50 border-2 border-blue-300 rounded-xl p-3">
                          <p className="text-xs font-semibold text-blue-600 uppercase mb-1">Size</p>
                          <p className="text-base font-bold text-charcoal-900">
                            {item.size_label}
                          </p>
                        </div>
                      )}

                      <div className="bg-green-50 border-2 border-green-300 rounded-xl p-3">
                        <p className="text-xs font-semibold text-green-600 uppercase mb-1">
                          Quantity
                        </p>
                        <p className="text-base font-bold text-charcoal-900">{item.quantity}</p>
                      </div>

                      {item.weight_kg && (
                        <div className="bg-orange-50 border-2 border-orange-300 rounded-xl p-3">
                          <p className="text-xs font-semibold text-orange-600 uppercase mb-1">
                            Weight
                          </p>
                          <p className="text-base font-bold text-charcoal-900">
                            {item.weight_kg} kg
                          </p>
                        </div>
                      )}

                      {item.diameter_cm && (
                        <div className="bg-pink-50 border-2 border-pink-300 rounded-xl p-3">
                          <p className="text-xs font-semibold text-pink-600 uppercase mb-1">
                            Diameter
                          </p>
                          <p className="text-base font-bold text-charcoal-900">
                            {item.diameter_cm} cm
                          </p>
                        </div>
                      )}

                      {item.production_status && (
                        <div className="bg-indigo-50 border-2 border-indigo-300 rounded-xl p-3">
                          <p className="text-xs font-semibold text-indigo-600 uppercase mb-1">
                            Status
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
                              <svg
                                className="w-5 h-5 text-purple-600"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                                />
                              </svg>
                              <p className="text-sm font-bold text-purple-700 uppercase tracking-wide">
                                Writing on Cake
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
                              <svg
                                className="w-5 h-5 text-blue-600"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
                                />
                              </svg>
                              <p className="text-sm font-bold text-blue-700 uppercase tracking-wide">
                                Decoration Notes
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
                              <svg
                                className="w-5 h-5 text-amber-600"
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
                              <p className="text-sm font-bold text-amber-700 uppercase tracking-wide">
                                Staff Notes
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
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 4v16m8-8H4"
                      />
                    </svg>
                    Add New Item to Order
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
        title="Delete Order?"
        message="Are you sure you want to delete this order? This will permanently delete all order items and cannot be undone. The customer's client record will remain but their stats will be updated."
        confirmText="Delete Order"
        cancelText="Cancel"
        variant="danger"
        isLoading={isDeleting}
      />
    </>
  );
}
