import { redirect } from 'next/navigation';
import { validateSession, getUserRole } from '@/lib/auth/session';
import { supabaseAdmin } from '@/lib/supabase/server';
import AdminHeader from '@/components/admin/AdminHeader';
import DeliveryPageTabs from '@/components/admin/DeliveryPageTabs';
import type { Database } from '@/lib/supabase/types';

type Order = Database['public']['Tables']['orders']['Row'];
type OrderItem = Database['public']['Tables']['order_items']['Row'];
type Client = Database['public']['Tables']['clients']['Row'];

export interface OrderWithItems extends Order {
  order_items: OrderItem[];
  client: Client | null;
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function AdminDeliveryPage() {
  const isAuthenticated = await validateSession();
  if (!isAuthenticated) {
    redirect('/admin/login');
  }

  const role = await getUserRole();
  if (role !== 'cook' && role !== 'owner' && role !== 'delivery') {
    redirect('/admin/login');
  }

  // Fetch orders for the next 2 weeks (plus yesterday for late stragglers)
  const now = new Date();
  const from = new Date(now);
  from.setDate(from.getDate() - 1);

  const to = new Date(now);
  to.setDate(to.getDate() + 14);

  const fromStr = from.toISOString().split('T')[0];
  const toStr = to.toISOString().split('T')[0];

  const { data, error } = await supabaseAdmin
    .from('orders')
    .select(`
      *,
      order_items(*),
      client:clients(*)
    `)
    .gte('delivery_date', fromStr)
    .lte('delivery_date', toStr)
    .order('delivery_date', { ascending: true })
    .order('created_at', { ascending: true });

  if (error || !data) {
    console.error('Error fetching delivery orders:', error);
    return (
      <div className="min-h-screen bg-cream-50">
        <AdminHeader role={role} />
        <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="max-w-5xl mx-auto">
            <div className="bg-white rounded-2xl shadow-md border-2 border-rose-300 p-12 text-center">
              <p className="text-rose-500 font-semibold">Ошибка загрузки заказов</p>
              {error && <p className="text-sm text-charcoal-500 mt-2">{error.message}</p>}
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Exclude immediate (walk-in shelf) sales — they have no delivery/pickup
  const orders = (data as OrderWithItems[]).filter(
    (o) => o.delivery_type !== 'immediate'
  );

  return (
    <div className="min-h-screen bg-cream-50">
      <AdminHeader role={role} />
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-5xl mx-auto">
          <div className="mb-6 md:mb-8">
            <h1 className="text-2xl sm:text-3xl font-heading font-bold text-brown-500 mb-1">
              Доставки и самовывоз
            </h1>
            <p className="text-sm text-charcoal-500">
              Статус оплаты и информация о доставке / самовывозе
            </p>
          </div>

          <DeliveryPageTabs orders={orders} />
        </div>
      </main>
    </div>
  );
}
