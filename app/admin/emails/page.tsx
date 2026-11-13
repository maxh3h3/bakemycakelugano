import { redirect } from 'next/navigation';
import { validateSession, getUserRole } from '@/lib/auth/session';
import AdminHeader from '@/components/admin/AdminHeader';
import EmailsPage from '@/components/admin/emails/EmailsPage';

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
      <main className="container mx-auto px-2 py-3 sm:px-6 md:py-8 lg:px-8">
        <div className="mx-auto max-w-7xl">
          {/* On phones the thread list carries its own heading. */}
          <div className="mb-6 hidden md:block">
            <h1 className="font-heading text-2xl font-bold text-charcoal-900">Email</h1>
            <p className="mt-1 text-sm text-charcoal-500">Переписка с клиентами — входящие и ваши ответы из любой почты</p>
          </div>
          <EmailsPage />
        </div>
      </main>
    </div>
  );
}
