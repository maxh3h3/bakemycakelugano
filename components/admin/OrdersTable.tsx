'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Database } from '@/lib/supabase/types';
import OrderCard from './OrderCard';

type Order = Database['public']['Tables']['orders']['Row'];
type OrderItem = Database['public']['Tables']['order_items']['Row'];

interface OrderWithItems extends Order {
  order_items: OrderItem[];
}

interface OrdersTableProps {
  orders: OrderWithItems[];
}

type PaymentFilter = 'all' | 'paid' | 'unpaid';

export default function OrdersTable({ orders }: OrdersTableProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>('all');

  // Filter orders
  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customer_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (order.order_number && order.order_number.toLowerCase().includes(searchQuery.toLowerCase())) ||
      order.id.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesPayment =
      paymentFilter === 'all' ||
      (paymentFilter === 'paid' && order.paid) ||
      (paymentFilter === 'unpaid' && !order.paid);

    return matchesSearch && matchesPayment;
  });

  // Count by payment status
  const paidCount = orders.filter((order) => order.paid).length;
  const unpaidCount = orders.filter((order) => !order.paid).length;

  const refreshOrders = () => {
    // Use Next.js router refresh to update data without full page reload
    router.refresh();
  };

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <div className="bg-white rounded-2xl shadow-md border-2 border-cream-200 p-6">
        <div className="space-y-4">
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

          {/* Payment Status Filter */}
          <div>
            <div className="flex gap-3">
              <button
                onClick={() => setPaymentFilter('all')}
                className={`px-6 py-2.5 rounded-full font-semibold transition-all ${
                  paymentFilter === 'all'
                    ? 'bg-brown-500 text-white shadow-md'
                    : 'bg-cream-100 text-charcoal-700 hover:bg-cream-200'
                }`}
              >
                All Orders
                <span className="ml-2 text-sm opacity-75">({orders.length})</span>
              </button>
              <button
                onClick={() => setPaymentFilter('paid')}
                className={`px-6 py-2.5 rounded-full font-semibold transition-all ${
                  paymentFilter === 'paid'
                    ? 'bg-green-500 text-white shadow-md'
                    : 'bg-green-100 text-green-700 hover:bg-green-200'
                }`}
              >
                Paid
                <span className="ml-2 text-sm opacity-75">({paidCount})</span>
              </button>
              <button
                onClick={() => setPaymentFilter('unpaid')}
                className={`px-6 py-2.5 rounded-full font-semibold transition-all ${
                  paymentFilter === 'unpaid'
                    ? 'bg-orange-500 text-white shadow-md'
                    : 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                }`}
              >
                Unpaid
                <span className="ml-2 text-sm opacity-75">({unpaidCount})</span>
              </button>
            </div>
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
            <OrderCard key={order.id} order={order} onUpdate={refreshOrders} />
          ))
        )}
      </div>
    </div>
  );
}
