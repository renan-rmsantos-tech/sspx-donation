import { getDashboardStats } from '@/features/dashboard/queries';
import { AdminDashboard } from '@/features/dashboard/components/AdminDashboard';

export default async function DashboardPage() {
  const stats = await getDashboardStats();

  return <AdminDashboard stats={stats} />;
}
