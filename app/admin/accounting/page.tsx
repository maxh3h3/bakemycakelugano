import { redirect } from 'next/navigation';
import { validateSession, getUserRole } from '@/lib/auth/session';
import AdminHeader from '@/components/admin/AdminHeader';
import AccountingPageClient from '@/components/admin/AccountingPageClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function AccountingPage() {
  // Check authentication
  const isAuthenticated = await validateSession();
  if (!isAuthenticated) {
    redirect('/admin/login');
  }

  // Get user role
  const role = await getUserRole();

  // Only owner can access accounting
  if (role !== 'owner') {
    redirect('/admin/orders');
  }

  return (
    <>
      <AdminHeader role={role} />
      <AccountingPageClient />
    </>
  );
}
