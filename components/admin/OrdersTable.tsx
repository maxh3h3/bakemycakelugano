'use client';

import { useState } from 'react';
import Image from 'next/image';
import { format } from 'date-fns';
import type { Database } from '@/lib/supabase/types';
import { formatDeliveryAddress } from '@/lib/schemas/delivery';

type Order = Database['public']['Tables']['orders']['Row'];
type OrderItem = Database['public']['Tables']['order_items']['Row'];

interface OrderWithItems extends Order {
  order_items: OrderItem[];
}

interface OrdersTableProps {
  orders: OrderWithItems[];
}

const statusColors = {
  pending: 'bg-rose-100 text-rose-700 border-rose-300',
  confirmed: 'bg-blue-100 text-blue-700 border-blue-300',
  preparing: 'bg-yellow-100 text-yellow-700 border-yellow-300',
  ready: 'bg-green-100 text-green-700 border-green-300',
  completed: 'bg-charcoal-100 text-charcoal-700 border-charcoal-300',
  cancelled: 'bg-rose-200 text-rose-800 border-rose-400',
};

export default function OrdersTable({ orders }: OrdersTableProps) {
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Filter orders
  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customer_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (order.order_number && order.order_number.toLowerCase().includes(searchQuery.toLowerCase())) ||
      order.id.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const toggleOrderExpansion = (orderId: string) => {
    setExpandedOrderId(expandedOrderId === orderId ? null : orderId);
  };

  const formatCurrency = (amount: number, currency: string = 'CHF') => {
    return new Intl.NumberFormat('de-CH', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-md border-2 border-cream-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Search */}
          <div>
            <label htmlFor="search" className="block text-sm font-medium text-charcoal-900 mb-2">
              Search Orders
            </label>
            <input
              type="text"
              id="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, email, or order ID..."
              className="w-full px-4 py-2 rounded-full border-2 border-cream-300 focus:border-brown-500 focus:outline-none focus:ring-2 focus:ring-brown-500/20 bg-cream-50/50"
            />
          </div>

          {/* Status Filter */}
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-charcoal-900 mb-2">
              Filter by Status
            </label>
            <select
              id="status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-4 py-2 rounded-full border-2 border-cream-300 focus:border-brown-500 focus:outline-none focus:ring-2 focus:ring-brown-500/20 bg-cream-50/50"
            >
              <option value="all">All Orders</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="preparing">Preparing</option>
              <option value="ready">Ready</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      {/* Orders Count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-charcoal-600">
          Showing <span className="font-semibold text-brown-500">{filteredOrders.length}</span> of{' '}
          <span className="font-semibold">{orders.length}</span> orders
        </p>
      </div>

      {/* Orders List */}
      <div className="space-y-4">
        {filteredOrders.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-md border-2 border-cream-200 p-12 text-center">
            <p className="text-charcoal-500 text-lg">No orders found</p>
          </div>
        ) : (
          filteredOrders.map((order) => (
            <div
              key={order.id}
              className="bg-white rounded-2xl shadow-md border-2 border-cream-200 overflow-hidden transition-all hover:shadow-lg"
            >
              {/* Order Header - Clickable */}
              <button
                onClick={() => toggleOrderExpansion(order.id)}
                className="w-full p-6 text-left hover:bg-cream-50/50 transition-colors"
              >
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
                  {/* Order Number & Date */}
                  <div>
                    <p className="text-xs text-charcoal-500 mb-1">Order #</p>
                    <p className="font-mono text-lg font-bold text-brown-500">
                      {order.order_number || order.id.slice(0, 8) + '...'}
                    </p>
                    <p className="text-xs text-charcoal-500 mt-1">
                      {format(new Date(order.created_at), 'MMM dd, HH:mm')}
                    </p>
                    {order.delivery_date && (
                      <p className="text-xs font-semibold text-blue-600 mt-1">
                        Delivery: {format(new Date(order.delivery_date), 'MMM dd')}
                      </p>
                    )}
                  </div>

                  {/* Customer */}
                  <div>
                    <p className="text-xs text-charcoal-500 mb-1">Customer</p>
                    <p className="font-medium text-charcoal-900">{order.customer_name}</p>
                    <p className="text-xs text-charcoal-500">{order.customer_email}</p>
                  </div>

                  {/* Total & Payment */}
                  <div>
                    <p className="text-xs text-charcoal-500 mb-1">Total</p>
                    <p className="text-lg font-bold text-brown-500">
                      {formatCurrency(order.total_amount, order.currency)}
                    </p>
                    {order.paid ? (
                      <p className="text-xs font-semibold text-green-600 mt-1">
                        ✓ Paid {order.payment_method ? `(${order.payment_method})` : ''}
                      </p>
                    ) : (
                      <p className="text-xs font-semibold text-orange-600 mt-1">
                        ⚠ Unpaid
                      </p>
                    )}
                  </div>

                  {/* Delivery Type */}
                  <div>
                    <p className="text-xs text-charcoal-500 mb-1">Delivery</p>
                    <p className="font-medium text-charcoal-900 capitalize">
                      {order.delivery_type || 'N/A'}
                    </p>
                  </div>

                  {/* Status */}
                  <div className="flex items-center justify-between">
                    <span
                      className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold border-2 ${
                        statusColors[order.status as keyof typeof statusColors] ||
                        statusColors.pending
                      }`}
                    >
                      {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                    </span>
                    <svg
                      className={`w-5 h-5 text-charcoal-500 transition-transform ${
                        expandedOrderId === order.id ? 'rotate-180' : ''
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
                  </div>
                </div>
              </button>

              {/* Expanded Order Details */}
              {expandedOrderId === order.id && (
                <div className="border-t-2 border-cream-200 bg-cream-50/30 p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    {/* Customer Details */}
                    <div>
                      <h4 className="font-heading font-semibold text-brown-500 mb-3">
                        Customer Information
                      </h4>
                      <div className="space-y-2 text-sm">
                        <p>
                          <span className="text-charcoal-500">Name:</span>{' '}
                          <span className="font-medium">{order.customer_name}</span>
                        </p>
                        <p>
                          <span className="text-charcoal-500">Email:</span>{' '}
                          <span className="font-medium">{order.customer_email}</span>
                        </p>
                        {order.customer_phone && (
                          <p>
                            <span className="text-charcoal-500">Phone:</span>{' '}
                            <span className="font-medium">{order.customer_phone}</span>
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Delivery Details */}
                    <div>
                      <h4 className="font-heading font-semibold text-brown-500 mb-3">
                        Delivery Information
                      </h4>
                      <div className="space-y-2 text-sm">
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
                              {format(new Date(order.delivery_date), 'MMMM dd, yyyy')}
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
                    </div>
                  </div>

                  {/* Customer Notes */}
                  {order.customer_notes && (
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
                    <div className="space-y-3">
                      {order.order_items.map((item) => (
                        <div
                          key={item.id}
                          className="bg-white rounded-xl p-4 border border-cream-300 flex items-start space-x-4"
                        >
                          {/* Product Image */}
                          {item.product_image_url && (
                            <div className="flex-shrink-0">
                              <Image
                                src={item.product_image_url}
                                alt={item.product_name}
                                width={60}
                                height={60}
                                className="rounded-lg object-cover"
                              />
                            </div>
                          )}

                          {/* Product Details */}
                          <div className="flex-grow">
                            <p className="font-semibold text-charcoal-900">{item.product_name}</p>
                            <div className="mt-1 space-y-1 text-sm text-charcoal-600">
                              {item.size_label && (
                                <p>
                                  <span className="text-charcoal-500">Size:</span> {item.size_label}
                                </p>
                              )}
                              {item.flavour_name && (
                                <p>
                                  <span className="text-charcoal-500">Flavour:</span> {item.flavour_name}
                                </p>
                              )}
                              <p>
                                <span className="text-charcoal-500">Quantity:</span> {item.quantity}
                              </p>
                              {item.writing_on_cake && (
                                <div className="mt-2 bg-purple-50 border border-purple-300 rounded px-2 py-1">
                                  <p className="text-xs text-purple-600 font-semibold">Writing on Cake:</p>
                                  <p className="text-sm text-purple-900 font-bold">{item.writing_on_cake}</p>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Price */}
                          <div className="text-right">
                            <p className="font-semibold text-brown-500">
                              {formatCurrency(item.subtotal, order.currency)}
                            </p>
                            <p className="text-xs text-charcoal-500">
                              {formatCurrency(item.unit_price, order.currency)} each
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Payment Info */}
                  <div className="mt-6 pt-6 border-t border-cream-300">
                    <div className="flex justify-between items-center">
                      <div className="text-sm">
                        <span className="text-charcoal-500">Payment:</span>{' '}
                        {order.paid ? (
                          <span className="font-semibold text-green-600">
                            ✓ Paid {order.payment_method ? `(${order.payment_method})` : ''}
                          </span>
                        ) : (
                          <span className="font-semibold text-orange-600">
                            Unpaid
                          </span>
                        )}
                      </div>
                      <span className="text-lg font-bold text-brown-500">
                        Total: {formatCurrency(order.total_amount, order.currency)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

