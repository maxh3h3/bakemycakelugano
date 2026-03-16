import { redirect } from 'next/navigation';
import { validateSession, getUserRole } from '@/lib/auth/session';
import AdminHeader from '@/components/admin/AdminHeader';
import ClientsPageClient from '@/components/admin/ClientsPageClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function ClientsPage() {
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
    <>
      <AdminHeader role={role} />
      <ClientsPageClient />
    </>
  );
}
