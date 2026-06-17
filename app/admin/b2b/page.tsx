import { redirect } from 'next/navigation';
import { validateSession, getUserRole } from '@/lib/auth/session';
import AdminHeader from '@/components/admin/AdminHeader';
import B2BView from '@/components/admin/B2BView';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function AdminB2BPage() {
  // Owner-only page
  const isAuthenticated = await validateSession();
  if (!isAuthenticated) {
    redirect('/admin/login');
  }

  const role = await getUserRole();
  if (role === 'cook') {
    redirect('/admin/production');
  } else if (role !== 'owner') {
    redirect('/admin/delivery');
  }

  return (
    <div className="min-h-screen bg-cream-50">
      <AdminHeader role={role} />
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-heading font-bold text-brown-500 mb-2">
              B2B — Рестораны и отели
            </h1>
            <p className="text-charcoal-600">
              Карта потенциальных партнёров и простой список для работы с продажами.
              Фокус — небольшие японские рестораны и отели Лугано.
            </p>
          </div>

          <B2BView />
        </div>
      </main>
    </div>
  );
}
