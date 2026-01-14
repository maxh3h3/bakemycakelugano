import { redirect } from 'next/navigation';
import { validateSession, getUserRole } from '@/lib/auth/session';
import { supabaseAdmin } from '@/lib/supabase/server';
import AdminHeader from '@/components/admin/AdminHeader';
import ProductionView from '@/components/admin/ProductionView';
import type { Database } from '@/lib/supabase/types';
import { formatDateForDB } from '@/lib/utils';

type OrderItem = Database['public']['Tables']['order_items']['Row'];

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function AdminProductionPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  // Await params
  const { locale } = await params;

  // Check authentication
  const isAuthenticated = await validateSession();
  if (!isAuthenticated) {
    redirect(`/${locale}/admin/login`);
  }

  // Check role (cook or owner can see production)
  const role = await getUserRole();
  if (role !== 'cook' && role !== 'owner') {
    redirect(`/${locale}/admin/orders`);
  }

  // Get today's date for filtering
  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay()); // Start of week (Sunday)
  startOfWeek.setHours(0, 0, 0, 0);
  
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 28); // 4 weeks
  
  // Fetch order_items directly with delivery dates in the next 4 weeks
  // NO JOIN - This is the whole point of denormalization!
  // Exclude immediate sales (walk-in shelf sales fulfilled immediately)
  const { data, error } = await supabaseAdmin
    .from('order_items')
    .select('*')
    .gte('delivery_date', formatDateForDB(startOfWeek))
    .lte('delivery_date', formatDateForDB(endOfWeek))
    .neq('delivery_type', 'immediate') // Filter out immediate sales from production view
    .order('delivery_date', { ascending: true })
    .order('order_number', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching production items:', error);
  }

  const items = (data || []) as OrderItem[];

  return (
    <div className="min-h-screen bg-cream-50">
      <AdminHeader role={role} />
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-[2000px] mx-auto">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-heading font-bold text-brown-500 mb-2">
              Production Schedule
            </h1>
            <p className="text-charcoal-600">
              Kitchen workflow - Click items to view details and update status
            </p>
            <p className="text-sm text-charcoal-500 mt-1">
              {today.toLocaleDateString('en-US', { 
                weekday: 'long', 
                month: 'long', 
                day: 'numeric', 
                year: 'numeric' 
              })}
            </p>
          </div>

          {/* Production View (Daily + Weekly) */}
          {items.length > 0 ? (
            <ProductionView items={items} />
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
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                  />
                </svg>
              </div>
              <h2 className="text-2xl font-heading font-bold text-charcoal-900 mb-2">
                No orders scheduled
              </h2>
              <p className="text-charcoal-600">
                All caught up! Check back when new orders come in.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
