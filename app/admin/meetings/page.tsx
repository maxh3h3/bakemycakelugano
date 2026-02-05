import { redirect } from 'next/navigation';
import { validateSession, getUserRole } from '@/lib/auth/session';
import AdminHeader from '@/components/admin/AdminHeader';
import MeetingsView from '@/components/admin/MeetingsView';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function AdminMeetingsPage() {
  // Check authentication
  const isAuthenticated = await validateSession();
  if (!isAuthenticated) {
    redirect('/admin/login');
  }

  // Check role (only owner can manage meetings)
  const role = await getUserRole();
  if (role !== 'owner') {
    redirect('/admin/orders');
  }

  return (
    <div className="min-h-screen bg-cream-50">
      <AdminHeader role={role} />
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-heading font-bold text-brown-500 mb-2">
              Встречи
            </h1>
            <p className="text-charcoal-600">
              Планирование и управление встречами с клиентами
            </p>
          </div>

          {/* Meetings View */}
          <MeetingsView />
        </div>
      </main>
    </div>
  );
}
