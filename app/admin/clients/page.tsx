import { redirect } from 'next/navigation';
import { validateSession, getUserRole } from '@/lib/auth/session';
import AdminHeader from '@/components/admin/AdminHeader';
import ClientsPageClient from '@/components/admin/ClientsPageClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function ClientsPage() {
  // Check authentication
  const isAuthenticated = await validateSession();
  if (!isAuthenticated) {
    redirect('/admin/login');
  }

  // Get user role
  const role = await getUserRole();

  return (
    <>
      <AdminHeader role={role} />
      <ClientsPageClient />
    </>
  );
}
