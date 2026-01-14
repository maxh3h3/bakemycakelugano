import { redirect } from 'next/navigation';
import { validateSession, getUserRole } from '@/lib/auth/session';
import AdminHeader from '@/components/admin/AdminHeader';
import AccountingPageClient from '@/components/admin/AccountingPageClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function AccountingPage({
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

  // Get user role
  const role = await getUserRole();

  // Only owner can access accounting
  if (role !== 'owner') {
    redirect(`/${locale}/admin/orders`);
  }

  return (
    <>
      <AdminHeader role={role} />
      <AccountingPageClient />
    </>
  );
}
