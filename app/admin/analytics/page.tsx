import { redirect } from 'next/navigation';
import { validateSession } from '@/lib/auth/session';
import { supabaseAdmin } from '@/lib/supabase/server';
import AdminHeader from '@/components/admin/AdminHeader';
import { getUserRole } from '@/lib/auth/session';
import { format } from 'date-fns';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface CheckoutAttempt {
  id: string;
  customer_email: string;
  customer_name: string;
  customer_phone: string | null;
  cart_items: any[];
  total_amount: number;
  currency: string;
  converted: boolean;
  created_at: string;
  converted_at: string | null;
}

export default async function AdminAnalyticsPage() {
  const isAuthenticated = await validateSession();
  if (!isAuthenticated) {
    redirect('/admin/login');
  }

  const role = await getUserRole();
  if (role !== 'owner') {
    redirect('/admin/production');
  }

  // Fetch all checkout attempts
  const { data: attempts, error } = await (supabaseAdmin
    .from('checkout_attempts') as any)
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching checkout attempts:', error);
  }

  const checkoutAttempts: CheckoutAttempt[] = attempts || [];

  // Calculate metrics
  const totalAttempts = checkoutAttempts.length;
  const convertedAttempts = checkoutAttempts.filter((a) => a.converted);
  const abandonedAttempts = checkoutAttempts.filter((a) => !a.converted);
  
  const conversionRate = totalAttempts > 0 
    ? (convertedAttempts.length / totalAttempts) * 100 
    : 0;

  const totalRevenue = convertedAttempts.reduce((sum, a) => sum + a.total_amount, 0);
  const lostRevenue = abandonedAttempts.reduce((sum, a) => sum + a.total_amount, 0);

  const averageCartValue = totalAttempts > 0
    ? checkoutAttempts.reduce((sum, a) => sum + a.total_amount, 0) / totalAttempts
    : 0;

  // Recent abandoned (last 24 hours)
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recentAbandoned = abandonedAttempts.filter(
    (a) => new Date(a.created_at) > oneDayAgo
  );

  // Most abandoned products
  const productAbandonment: { [key: string]: { count: number; quantity: number } } = {};
  
  abandonedAttempts.forEach((attempt) => {
    attempt.cart_items.forEach((item: any) => {
      const productName = item.productName;
      if (!productAbandonment[productName]) {
        productAbandonment[productName] = { count: 0, quantity: 0 };
      }
      productAbandonment[productName].count += 1;
      productAbandonment[productName].quantity += item.quantity;
    });
  });

  const topAbandonedProducts = Object.entries(productAbandonment)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 5);

  const formatCurrency = (amount: number, currency: string = 'CHF') => {
    return new Intl.NumberFormat('de-CH', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  return (
    <div className="min-h-screen bg-cream-50">
      <AdminHeader role={role} />
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-heading font-bold text-brown-500 mb-2">
              Аналитика оформления заказов
            </h1>
            <p className="text-charcoal-600">
              Отслеживание конверсии, брошенных корзин и доходов
            </p>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {/* Total Checkouts */}
            <div className="bg-white rounded-2xl shadow-md border-2 border-cream-200 p-6">
              <p className="text-sm text-charcoal-500 mb-1">Всего оформлений</p>
              <p className="text-3xl font-mono font-bold text-brown-500 tabular-nums">
                {totalAttempts}
              </p>
              <p className="text-xs text-charcoal-500 mt-2">
                {convertedAttempts.length} завершено, {abandonedAttempts.length} брошено
              </p>
            </div>

            {/* Conversion Rate */}
            <div className="bg-white rounded-2xl shadow-md border-2 border-cream-200 p-6">
              <p className="text-sm text-charcoal-500 mb-1">Конверсия</p>
              <p className="text-3xl font-mono font-bold text-green-600 tabular-nums">
                {conversionRate.toFixed(1)}%
              </p>
              <p className="text-xs text-charcoal-500 mt-2">
                {convertedAttempts.length} успешных платежей
              </p>
            </div>

            {/* Lost Revenue */}
            <div className="bg-white rounded-2xl shadow-md border-2 border-cream-200 p-6">
              <p className="text-sm text-charcoal-500 mb-1">Упущенный доход</p>
              <p className="text-3xl font-mono font-bold text-rose-500 tabular-nums">
                {formatCurrency(lostRevenue)}
              </p>
              <p className="text-xs text-charcoal-500 mt-2">
                Из {abandonedAttempts.length} брошенных корзин
              </p>
            </div>

            {/* Average Cart Value */}
            <div className="bg-white rounded-2xl shadow-md border-2 border-cream-200 p-6">
              <p className="text-sm text-charcoal-500 mb-1">Средний чек</p>
              <p className="text-3xl font-mono font-bold text-brown-500 tabular-nums">
                {formatCurrency(averageCartValue)}
              </p>
              <p className="text-xs text-charcoal-500 mt-2">
                По всем попыткам оформления
              </p>
            </div>
          </div>

          {/* Two Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Recent Abandoned Carts */}
            <div className="bg-white rounded-2xl shadow-md border-2 border-cream-200 p-6">
              <h2 className="text-2xl font-heading font-bold text-brown-500 mb-4">
                Недавно брошенные корзины
                <span className="text-sm font-body font-normal text-charcoal-500 ml-2">
                  (За последние 24 часа)
                </span>
              </h2>
              
              {recentAbandoned.length === 0 ? (
                <p className="text-charcoal-500 text-center py-8">
                  Нет брошенных корзин за последние 24 часа
                </p>
              ) : (
                <div className="space-y-3">
                  {recentAbandoned.slice(0, 5).map((attempt) => (
                    <div
                      key={attempt.id}
                      className="border border-cream-300 rounded-xl p-4 hover:bg-cream-50 transition-colors"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-semibold text-charcoal-900">
                            {attempt.customer_name}
                          </p>
                          <p className="text-xs text-charcoal-500">
                            {attempt.customer_email}
                          </p>
                        </div>
                        <p className="font-bold text-brown-500">
                          {formatCurrency(attempt.total_amount)}
                        </p>
                      </div>
                      <div className="flex items-center justify-between text-xs text-charcoal-500">
                        <span>{attempt.cart_items.length} позиций</span>
                        <span>{format(new Date(attempt.created_at), 'HH:mm')}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Most Abandoned Products */}
            <div className="bg-white rounded-2xl shadow-md border-2 border-cream-200 p-6">
              <h2 className="text-2xl font-heading font-bold text-brown-500 mb-4">
                Наиболее часто брошенные товары
              </h2>
              
              {topAbandonedProducts.length === 0 ? (
                <p className="text-charcoal-500 text-center py-8">
                  Пока нет брошенных товаров
                </p>
              ) : (
                <div className="space-y-3">
                  {topAbandonedProducts.map(([productName, data], index) => (
                    <div
                      key={productName}
                      className="flex items-center justify-between border border-cream-300 rounded-xl p-4"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center">
                          <span className="text-sm font-bold text-rose-600">
                            {index + 1}
                          </span>
                        </div>
                        <div>
                          <p className="font-semibold text-charcoal-900">
                            {productName}
                          </p>
                          <p className="text-xs text-charcoal-500">
                            {data.quantity} ед. в брошенных корзинах
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-rose-500">{data.count}</p>
                        <p className="text-xs text-charcoal-500">раз</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* All Abandoned Carts Table */}
          <div className="bg-white rounded-2xl shadow-md border-2 border-cream-200 p-6">
            <h2 className="text-2xl font-heading font-bold text-brown-500 mb-4">
              Все брошенные корзины ({abandonedAttempts.length})
            </h2>

            {abandonedAttempts.length === 0 ? (
              <p className="text-charcoal-500 text-center py-8">
                Пока нет брошенных корзин
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-cream-300">
                      <th className="text-left py-3 px-2 text-sm font-semibold text-charcoal-700">
                        Клиент
                      </th>
                      <th className="text-left py-3 px-2 text-sm font-semibold text-charcoal-700">
                        Email
                      </th>
                      <th className="text-center py-3 px-2 text-sm font-semibold text-charcoal-700">
                        Позиции
                      </th>
                      <th className="text-right py-3 px-2 text-sm font-semibold text-charcoal-700">
                        Сумма
                      </th>
                      <th className="text-right py-3 px-2 text-sm font-semibold text-charcoal-700">
                        Дата
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {abandonedAttempts.map((attempt) => (
                      <tr
                        key={attempt.id}
                        className="border-b border-cream-200 hover:bg-cream-50 transition-colors"
                      >
                        <td className="py-3 px-2 text-sm text-charcoal-900">
                          {attempt.customer_name}
                        </td>
                        <td className="py-3 px-2 text-sm text-charcoal-600">
                          {attempt.customer_email}
                        </td>
                        <td className="py-3 px-2 text-sm text-center text-charcoal-600">
                          {attempt.cart_items.length}
                        </td>
                        <td className="py-3 px-2 text-sm text-right font-semibold text-brown-500">
                          {formatCurrency(attempt.total_amount)}
                        </td>
                        <td className="py-3 px-2 text-sm text-right text-charcoal-600">
                          {format(new Date(attempt.created_at), 'MMM dd, yyyy HH:mm')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
