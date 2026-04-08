import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { getDashboardStats } from '@/features/dashboard/queries';
import DashboardPage from './page';

vi.mock('@/features/dashboard/queries', () => ({
  getDashboardStats: vi.fn(),
}));

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getDashboardStats).mockResolvedValue({
      totalMonetaryDonations: 0,
      weeklyMonetaryTotal: 0,
      monthlyMonetaryTotal: 0,
      totalDonationCount: 0,
      totalPhysicalFulfilled: 0,
      totalPhysicalPending: 0,
      hasTransfersAvailable: false,
    });
  });

  describe('Rendering', () => {
    it('should render dashboard heading', async () => {
      const Page = await DashboardPage();
      render(Page);
      expect(screen.getByRole('heading', { level: 1, name: 'Painel' })).toBeInTheDocument();
    });

    it('should display total monetary donations metric', async () => {
      vi.mocked(getDashboardStats).mockResolvedValue({
        totalMonetaryDonations: 50000,
        weeklyMonetaryTotal: 0,
        monthlyMonetaryTotal: 0,
        totalDonationCount: 1,
        totalPhysicalFulfilled: 0,
        totalPhysicalPending: 0,
        hasTransfersAvailable: false,
      });
      const Page = await DashboardPage();
      render(Page);
      expect(screen.getByText('Total de Doações em Dinheiro')).toBeInTheDocument();
      expect(screen.getByText(/R\$\s*500,00/)).toBeInTheDocument();
    });

    it('should display physical fulfilled metric', async () => {
      vi.mocked(getDashboardStats).mockResolvedValue({
        totalMonetaryDonations: 0,
        weeklyMonetaryTotal: 0,
        monthlyMonetaryTotal: 0,
        totalDonationCount: 3,
        totalPhysicalFulfilled: 3,
        totalPhysicalPending: 0,
        hasTransfersAvailable: false,
      });
      const Page = await DashboardPage();
      render(Page);
      expect(screen.getByText('Itens Atendidos')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('should display physical pending metric', async () => {
      vi.mocked(getDashboardStats).mockResolvedValue({
        totalMonetaryDonations: 0,
        weeklyMonetaryTotal: 0,
        monthlyMonetaryTotal: 0,
        totalDonationCount: 5,
        totalPhysicalFulfilled: 0,
        totalPhysicalPending: 5,
        hasTransfersAvailable: false,
      });
      const Page = await DashboardPage();
      render(Page);
      expect(screen.getByText('Itens Pendentes')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
    });
  });

  describe('Empty state', () => {
    it('should render zero values when no data', async () => {
      const Page = await DashboardPage();
      render(Page);
      expect(screen.getByText('Total de Doações em Dinheiro')).toBeInTheDocument();
      expect(screen.getByText('Total de Doações')).toBeInTheDocument();
    });

    it('should display new metric cards', async () => {
      vi.mocked(getDashboardStats).mockResolvedValue({
        totalMonetaryDonations: 100,
        weeklyMonetaryTotal: 100,
        monthlyMonetaryTotal: 100,
        totalDonationCount: 1,
        totalPhysicalFulfilled: 0,
        totalPhysicalPending: 0,
        hasTransfersAvailable: false,
      });
      const Page = await DashboardPage();
      render(Page);
      expect(screen.getByText('Total da Semana')).toBeInTheDocument();
      expect(screen.getByText('Total do Mês')).toBeInTheDocument();
    });
  });

  describe('Mixed data', () => {
    it('should display all metrics with mixed monetary and physical data', async () => {
      vi.mocked(getDashboardStats).mockResolvedValue({
        totalMonetaryDonations: 25000,
        weeklyMonetaryTotal: 10000,
        monthlyMonetaryTotal: 20000,
        totalDonationCount: 5,
        totalPhysicalFulfilled: 2,
        totalPhysicalPending: 3,
        hasTransfersAvailable: false,
      });
      const Page = await DashboardPage();
      render(Page);
      expect(screen.getByText('Total de Doações em Dinheiro')).toBeInTheDocument();
      expect(screen.getByText('Itens Atendidos')).toBeInTheDocument();
      expect(screen.getByText('Itens Pendentes')).toBeInTheDocument();
      expect(screen.getByText(/R\$\s*250,00/)).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
    });
  });

  describe('Transfer alert', () => {
    it('should display transfer alert when hasTransfersAvailable is true', async () => {
      vi.mocked(getDashboardStats).mockResolvedValue({
        totalMonetaryDonations: 0,
        totalPhysicalFulfilled: 0,
        totalPhysicalPending: 0,
        weeklyMonetaryTotal: 0,
        monthlyMonetaryTotal: 0,
        totalDonationCount: 0,
        hasTransfersAvailable: true,
      });
      const Page = await DashboardPage();
      render(Page);
      expect(screen.getByTestId('dashboard-transfer-alert')).toBeInTheDocument();
      expect(
        screen.getByText('Há transferências de fundos disponíveis para realizar.')
      ).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Ir para Transferências' })).toHaveAttribute(
        'href',
        '/admin/transfers'
      );
    });

    it('should not display transfer alert when hasTransfersAvailable is false', async () => {
      vi.mocked(getDashboardStats).mockResolvedValue({
        totalMonetaryDonations: 0,
        weeklyMonetaryTotal: 0,
        monthlyMonetaryTotal: 0,
        totalDonationCount: 0,
        totalPhysicalFulfilled: 0,
        totalPhysicalPending: 0,
        hasTransfersAvailable: false,
      });
      const Page = await DashboardPage();
      render(Page);
      expect(screen.queryByTestId('dashboard-transfer-alert')).not.toBeInTheDocument();
    });
  });

  describe('Data fetching', () => {
    it('should call getDashboardStats', async () => {
      await DashboardPage();
      expect(getDashboardStats).toHaveBeenCalledTimes(1);
    });
  });
});
