import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DashboardStatsCards } from '../DashboardStatsCards';

describe('DashboardStatsCards', () => {
  it('should render all three metric cards', () => {
    render(
      <DashboardStatsCards
        stats={{
          totalMonetaryDonations: 10000,
          weeklyMonetaryTotal: 5000,
          monthlyMonetaryTotal: 8000,
          totalDonationCount: 10,
          totalPhysicalFulfilled: 1,
          totalPhysicalPending: 2,
          hasTransfersAvailable: false,
        }}
      />
    );
    expect(screen.getByText('Total de Doações em Dinheiro')).toBeInTheDocument();
    expect(screen.getByText('Itens Atendidos')).toBeInTheDocument();
    expect(screen.getByText('Itens Pendentes')).toBeInTheDocument();
  });

  it('should format monetary amount in pt-BR locale', () => {
    render(
      <DashboardStatsCards
        stats={{
          totalMonetaryDonations: 12345,
          weeklyMonetaryTotal: 0,
          monthlyMonetaryTotal: 0,
          totalDonationCount: 1,
          totalPhysicalFulfilled: 0,
          totalPhysicalPending: 0,
          hasTransfersAvailable: false,
        }}
      />
    );
    expect(screen.getByText(/R\$\s*123,45/)).toBeInTheDocument();
  });

  it('should display physical counts', () => {
    render(
      <DashboardStatsCards
        stats={{
          totalMonetaryDonations: 0,
          weeklyMonetaryTotal: 0,
          monthlyMonetaryTotal: 0,
          totalDonationCount: 8,
          totalPhysicalFulfilled: 5,
          totalPhysicalPending: 3,
          hasTransfersAvailable: false,
        }}
      />
    );
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('should render new weekly and monthly cards', () => {
    render(
      <DashboardStatsCards
        stats={{
          totalMonetaryDonations: 0,
          weeklyMonetaryTotal: 5000,
          monthlyMonetaryTotal: 10000,
          totalDonationCount: 5,
          totalPhysicalFulfilled: 0,
          totalPhysicalPending: 0,
          hasTransfersAvailable: false,
        }}
      />
    );
    expect(screen.getByText('Total da Semana')).toBeInTheDocument();
    expect(screen.getByText('Total do Mês')).toBeInTheDocument();
    expect(screen.getByText('Total de Doações')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
  });
});
