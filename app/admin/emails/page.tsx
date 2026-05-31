import { redirect } from 'next/navigation';
import { validateSession, getUserRole } from '@/lib/auth/session';
import AdminHeader from '@/components/admin/AdminHeader';
import EmailsPageClient from '@/components/admin/EmailsPageClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function AdminEmailsPage() {
  const isAuthenticated = await validateSession();
  if (!isAuthenticated) redirect('/admin/login');

  const role = await getUserRole();
  if (role !== 'owner') redirect('/admin/orders');

  return (
    <div className="min-h-screen bg-cream-50">
      <AdminHeader role="owner" />
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <h1 className="text-2xl font-heading font-bold text-charcoal-900">Email</h1>
            <p className="text-charcoal-500 text-sm mt-1">Incoming customer emails and order threads</p>
          </div>
          <EmailsPageClient />
        </div>
      </main>
    </div>
  );
}
