import type { DashboardStats } from '../queries';

/** Campanha em andamento, sem transferências pendentes. */
export const activeStats: DashboardStats = {
  totalMonetaryDonations: 1847500,
  weeklyMonetaryTotal: 92000,
  monthlyMonetaryTotal: 415000,
  totalDonationCount: 137,
  totalPhysicalFulfilled: 9,
  totalPhysicalPending: 14,
  hasTransfersAvailable: false,
};

/** Há saldo excedente em itens já atendidos para transferir. */
export const transfersAvailableStats: DashboardStats = {
  ...activeStats,
  hasTransfersAvailable: true,
};

/** Plataforma recém-publicada, sem nenhuma doação. */
export const emptyStats: DashboardStats = {
  totalMonetaryDonations: 0,
  weeklyMonetaryTotal: 0,
  monthlyMonetaryTotal: 0,
  totalDonationCount: 0,
  totalPhysicalFulfilled: 0,
  totalPhysicalPending: 0,
  hasTransfersAvailable: false,
};
