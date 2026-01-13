import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { validateSession, getUserRole } from '@/lib/auth/session';
import { supabaseAdmin } from '@/lib/supabase/server';
import AdminHeader from '@/components/admin/AdminHeader';
import OrdersViewTabs from '@/components/admin/OrdersViewTabs';
import CreateOrderButton from '@/components/admin/CreateOrderButton';
import type { Database } from '@/lib/supabase/types';
import { parseDateFromDB } from '@/lib/utils';

type Order = Database['public']['Tables']['orders']['Row'];
type OrderItem = Database['public']['Tables']['order_items']['Row'];

interface OrderWithItems extends Order {
  order_items: OrderItem[];
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function AdminOrdersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  // Await params
  const { locale } = await params;

  // Get translations
  const t = await getTranslations('admin');

  // Check authentication
  const isAuthenticated = await validateSession();
  if (!isAuthenticated) {
    redirect(`/${locale}/admin/login`);
  }

  // Check role (only owner can see orders page)
  const role = await getUserRole();
  if (role !== 'owner') {
    redirect(`/${locale}/admin/production`); // Cooks go to production
  }
  
  // Fetch all orders with their items
  const { data, error } = await supabaseAdmin
    .from('orders')
    .select('*, order_items(*)')
    .order('created_at', { ascending: false });

  if (error || !data) {
    console.error('Error fetching orders:', error);
    return (
      <div className="min-h-screen bg-cream-50">
        <AdminHeader />
        <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="max-w-7xl mx-auto">
            <div className="bg-white rounded-2xl shadow-md border-2 border-rose-300 p-12 text-center">
              <div className="text-rose-500 mb-4">
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
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <h2 className="text-2xl font-heading font-bold text-charcoal-900 mb-2">
                {t('errorLoadingOrders')}
              </h2>
              <p className="text-charcoal-600">
                {t('errorFetchingOrders')}
              </p>
              {error && (
                <p className="text-sm text-charcoal-500 mt-2">
                  {error.message}
                </p>
              )}
            </div>
          </div>
        </main>
      </div>
    );
  }

  const orders = data as OrderWithItems[];

  // Calculate stats
  const stats = {
    total: orders.length,
    today: orders.filter(o => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const orderDate = o.delivery_date ? parseDateFromDB(o.delivery_date) : null;
      if (!orderDate) return false;
      return orderDate.getTime() === today.getTime();
    }).length,
    thisWeek: orders.filter(o => {
      const today = new Date();
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay());
      weekStart.setHours(0, 0, 0, 0);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 7);
      const orderDate = o.delivery_date ? parseDateFromDB(o.delivery_date) : null;
      if (!orderDate) return false;
      return orderDate >= weekStart && orderDate < weekEnd;
    }).length,
    unpaid: orders.filter((o) => !o.paid).length,
    paid: orders.filter((o) => o.paid).length,
    totalRevenue: orders
      .filter((o) => o.paid)
      .reduce((sum, o) => sum + o.total_amount, 0),
  };

  return (
    <div className="min-h-screen bg-cream-50">
      <AdminHeader role={role} />
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Page Header */}
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-heading font-bold text-brown-500 mb-2">
                Orders Dashboard
              </h1>
              <p className="text-charcoal-600">
                Manage all orders, track payments, and view detailed information
              </p>
            </div>
            <CreateOrderButton />
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            <div className="bg-white rounded-2xl shadow-md border-2 border-cream-200 p-6">
              <p className="text-sm text-charcoal-500 mb-1">Total Orders</p>
              <p className="text-3xl font-mono font-bold text-brown-500 tabular-nums">
                {stats.total}
              </p>
            </div>

            <div className="bg-white rounded-2xl shadow-md border-2 border-cream-200 p-6">
              <p className="text-sm text-charcoal-500 mb-1">Today</p>
              <p className="text-3xl font-mono font-bold text-blue-600 tabular-nums">
                {stats.today}
              </p>
            </div>

            <div className="bg-white rounded-2xl shadow-md border-2 border-cream-200 p-6">
              <p className="text-sm text-charcoal-500 mb-1">This Week</p>
              <p className="text-3xl font-mono font-bold text-purple-600 tabular-nums">
                {stats.thisWeek}
              </p>
            </div>

            <div className="bg-white rounded-2xl shadow-md border-2 border-cream-200 p-6">
              <p className="text-sm text-charcoal-500 mb-1">Total Revenue</p>
              <p className="text-3xl font-mono font-bold text-green-600 tabular-nums">
                {new Intl.NumberFormat('de-CH', {
                  style: 'currency',
                  currency: 'CHF',
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                }).format(stats.totalRevenue)}
              </p>
            </div>

            <div className="bg-white rounded-2xl shadow-md border-2 border-cream-200 p-6">
              <p className="text-sm text-charcoal-500 mb-1">Paid Orders</p>
              <p className="text-3xl font-mono font-bold text-green-500 tabular-nums">
                {stats.paid}
              </p>
            </div>

            <div className="bg-white rounded-2xl shadow-md border-2 border-cream-200 p-6">
              <p className="text-sm text-charcoal-500 mb-1">Unpaid Orders</p>
              <p className="text-3xl font-mono font-bold text-orange-600 tabular-nums">
                {stats.unpaid}
              </p>
            </div>
          </div>

          {/* Orders with Tabs (Today, Week, Month, All) */}
          {orders && orders.length > 0 ? (
            <OrdersViewTabs orders={orders} />
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
                    d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                  />
                </svg>
              </div>
              <h2 className="text-2xl font-heading font-bold text-charcoal-900 mb-2">
                No Orders Yet
              </h2>
              <p className="text-charcoal-600">
                Orders will appear here once customers start placing them
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
