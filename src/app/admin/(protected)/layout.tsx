import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/session';
import { adminLogout } from '@/lib/auth/actions';
import { AdminShell } from './components/AdminShell';

export default async function ProtectedAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session.isAdmin) {
    redirect('/admin/login');
  }

  return <AdminShell onLogout={adminLogout}>{children}</AdminShell>;
}
