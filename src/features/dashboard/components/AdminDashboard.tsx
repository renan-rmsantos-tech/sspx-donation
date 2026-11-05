import type { DashboardStats } from '../queries';
import { DashboardStatsCards } from './DashboardStatsCards';
import { DashboardTransferAlert } from './DashboardTransferAlert';

interface AdminDashboardProps {
  stats: DashboardStats;
}

/** Painel do admin: alerta de transferências e totais de doações. */
export function AdminDashboard({ stats }: AdminDashboardProps) {
  return (
    <div className="flex flex-col gap-8">
      <h1 className="font-serif font-bold text-[36px] leading-[44px] text-[#1E3D59]">
        Painel
      </h1>
      <div className="flex flex-col gap-6">
        <DashboardTransferAlert hasTransfersAvailable={stats.hasTransfersAvailable} />
        <DashboardStatsCards stats={stats} />
      </div>
    </div>
  );
}
