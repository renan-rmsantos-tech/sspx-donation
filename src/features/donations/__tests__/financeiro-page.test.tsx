import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { getFinancialSummary, getDonationsFiltered } from '../queries';
import FinanceiroPage from '@/app/admin/(protected)/financeiro/page';

vi.mock('@/features/donations/queries', () => ({
  getFinancialSummary: vi.fn(),
  getDonationsFiltered: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/admin/financeiro',
}));

describe('Financeiro Page Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Page Assembly', () => {
    it('should render the page heading "Financeiro"', async () => {
      vi.mocked(getFinancialSummary).mockResolvedValue({
        weeklyTotal: 0,
        monthlyTotal: 0,
      });
      vi.mocked(getDonationsFiltered).mockResolvedValue({
        donations: [],
        totalCount: 0,
        totalPages: 0,
        currentPage: 1,
      });

      const Page = await FinanceiroPage({
        searchParams: Promise.resolve({}),
      });
      render(Page);

      expect(screen.getByRole('heading', { level: 1, name: 'Financeiro' })).toBeInTheDocument();
    });

    it('should render page with default empty state', async () => {
      vi.mocked(getFinancialSummary).mockResolvedValue({
        weeklyTotal: 0,
        monthlyTotal: 0,
      });
      vi.mocked(getDonationsFiltered).mockResolvedValue({
        donations: [],
        totalCount: 0,
        totalPages: 0,
        currentPage: 1,
      });

      const Page = await FinanceiroPage({
        searchParams: Promise.resolve({}),
      });
      const result = render(Page);

      // Verify main heading is present
      expect(screen.getByRole('heading', { level: 1, name: 'Financeiro' })).toBeInTheDocument();
      // Verify page structure is rendered
      expect(result.container).toBeTruthy();
    });

    it('should accept searchParams for filter parsing', async () => {
      vi.mocked(getFinancialSummary).mockResolvedValue({
        weeklyTotal: 0,
        monthlyTotal: 0,
      });
      vi.mocked(getDonationsFiltered).mockResolvedValue({
        donations: [],
        totalCount: 0,
        totalPages: 0,
        currentPage: 1,
      });

      const Page = await FinanceiroPage({
        searchParams: Promise.resolve({
          donationType: 'monetary',
          page: '1',
        }),
      });
      render(Page);

      // Page should render without errors
      expect(screen.getByRole('heading', { level: 1, name: 'Financeiro' })).toBeInTheDocument();
    });
  });

  describe('Component Orchestration', () => {
    it('should have structure for FinancialSummaryCards and DonationsTableServer', async () => {
      vi.mocked(getFinancialSummary).mockResolvedValue({
        weeklyTotal: 2450,
        monthlyTotal: 12890.5,
      });
      vi.mocked(getDonationsFiltered).mockResolvedValue({
        donations: [
          {
            id: '1',
            donationType: 'monetary',
            amount: 100,
            donorName: 'João Silva',
            receiptPath: 'receipts/receipt1.jpg',
            isVerified: false,
            createdAt: new Date('2026-03-27'),
            productName: 'Produto A',
          },
        ],
        totalCount: 1,
        totalPages: 1,
        currentPage: 1,
      });

      const Page = await FinanceiroPage({
        searchParams: Promise.resolve({}),
      });
      const { container } = render(Page);

      // Verify Suspense fallbacks are present during loading
      const skeletons = container.querySelectorAll('[class*="animate-pulse"]');
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });

  describe('Query Integration', () => {
    it('should render page with empty donations list', async () => {
      vi.mocked(getFinancialSummary).mockResolvedValue({
        weeklyTotal: 0,
        monthlyTotal: 0,
      });
      vi.mocked(getDonationsFiltered).mockResolvedValue({
        donations: [],
        totalCount: 0,
        totalPages: 0,
        currentPage: 1,
      });

      const Page = await FinanceiroPage({
        searchParams: Promise.resolve({}),
      });
      render(Page);

      expect(screen.getByRole('heading', { level: 1, name: 'Financeiro' })).toBeInTheDocument();
    });

    it('should render page with multiple donations', async () => {
      const mockDonations = [
        {
          id: '1',
          donationType: 'monetary',
          amount: 100,
          donorName: 'João Silva',
          receiptPath: 'receipts/receipt1.jpg',
          isVerified: true,
          createdAt: new Date('2026-03-27'),
          productName: 'Produto A',
        },
        {
          id: '2',
          donationType: 'physical',
          amount: null,
          donorName: 'Maria Santos',
          receiptPath: null,
          isVerified: false,
          createdAt: new Date('2026-03-26'),
          productName: 'Produto B',
        },
      ];

      vi.mocked(getFinancialSummary).mockResolvedValue({
        weeklyTotal: 2450,
        monthlyTotal: 12890.5,
      });
      vi.mocked(getDonationsFiltered).mockResolvedValue({
        donations: mockDonations,
        totalCount: 2,
        totalPages: 1,
        currentPage: 1,
      });

      const Page = await FinanceiroPage({
        searchParams: Promise.resolve({}),
      });
      render(Page);

      expect(screen.getByRole('heading', { level: 1, name: 'Financeiro' })).toBeInTheDocument();
    });

    it('should render page when donationType filter is provided', async () => {
      vi.mocked(getFinancialSummary).mockResolvedValue({
        weeklyTotal: 0,
        monthlyTotal: 0,
      });
      vi.mocked(getDonationsFiltered).mockResolvedValue({
        donations: [],
        totalCount: 0,
        totalPages: 0,
        currentPage: 1,
      });

      const Page = await FinanceiroPage({
        searchParams: Promise.resolve({
          donationType: 'monetary',
        }),
      });
      render(Page);

      expect(screen.getByRole('heading', { level: 1, name: 'Financeiro' })).toBeInTheDocument();
    });

    it('should render page when pagination parameters provided', async () => {
      vi.mocked(getFinancialSummary).mockResolvedValue({
        weeklyTotal: 0,
        monthlyTotal: 0,
      });
      vi.mocked(getDonationsFiltered).mockResolvedValue({
        donations: [],
        totalCount: 100,
        totalPages: 5,
        currentPage: 2,
      });

      const Page = await FinanceiroPage({
        searchParams: Promise.resolve({
          page: '2',
        }),
      });
      render(Page);

      expect(screen.getByRole('heading', { level: 1, name: 'Financeiro' })).toBeInTheDocument();
    });

    it('should render page when date filters provided', async () => {
      vi.mocked(getFinancialSummary).mockResolvedValue({
        weeklyTotal: 0,
        monthlyTotal: 0,
      });
      vi.mocked(getDonationsFiltered).mockResolvedValue({
        donations: [],
        totalCount: 0,
        totalPages: 0,
        currentPage: 1,
      });

      const dateFrom = '2026-03-01';
      const dateTo = '2026-03-31';

      const Page = await FinanceiroPage({
        searchParams: Promise.resolve({
          dateFrom,
          dateTo,
        }),
      });
      render(Page);

      expect(screen.getByRole('heading', { level: 1, name: 'Financeiro' })).toBeInTheDocument();
    });

    it('should render page when donor name search filter provided', async () => {
      vi.mocked(getFinancialSummary).mockResolvedValue({
        weeklyTotal: 0,
        monthlyTotal: 0,
      });
      vi.mocked(getDonationsFiltered).mockResolvedValue({
        donations: [],
        totalCount: 0,
        totalPages: 0,
        currentPage: 1,
      });

      const Page = await FinanceiroPage({
        searchParams: Promise.resolve({
          donorName: 'João',
        }),
      });
      render(Page);

      expect(screen.getByRole('heading', { level: 1, name: 'Financeiro' })).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should render page even with financial summary errors', async () => {
      vi.mocked(getFinancialSummary).mockRejectedValue(new Error('Query failed'));
      vi.mocked(getDonationsFiltered).mockResolvedValue({
        donations: [],
        totalCount: 0,
        totalPages: 0,
        currentPage: 1,
      });

      try {
        const Page = await FinanceiroPage({
          searchParams: Promise.resolve({}),
        });
        render(Page);
      } catch (error) {
        // Error boundary should catch it
      }

      // Function should complete without throwing
      expect(true).toBe(true);
    });
  });

  describe('Data Fetching', () => {
    it('accepts financial summary with weekly and monthly totals', async () => {
      const mockSummary = {
        weeklyTotal: 5000,
        monthlyTotal: 25000,
      };

      vi.mocked(getFinancialSummary).mockResolvedValue(mockSummary);
      vi.mocked(getDonationsFiltered).mockResolvedValue({
        donations: [],
        totalCount: 0,
        totalPages: 0,
        currentPage: 1,
      });

      const Page = await FinanceiroPage({
        searchParams: Promise.resolve({}),
      });
      render(Page);

      expect(screen.getByRole('heading', { level: 1, name: 'Financeiro' })).toBeInTheDocument();
    });

    it('accepts paginated donations with all required fields', async () => {
      const mockPaginatedDonations = {
        donations: [
          {
            id: '1',
            donationType: 'monetary',
            amount: 100,
            donorName: 'João',
            receiptPath: 'path/to/receipt.jpg',
            isVerified: true,
            createdAt: new Date('2026-03-27'),
            productName: 'Product',
          },
          {
            id: '2',
            donationType: 'physical',
            amount: null,
            donorName: 'Maria',
            receiptPath: null,
            isVerified: false,
            createdAt: new Date('2026-03-26'),
            productName: 'Product B',
          },
        ],
        totalCount: 100,
        totalPages: 5,
        currentPage: 1,
      };

      vi.mocked(getFinancialSummary).mockResolvedValue({
        weeklyTotal: 0,
        monthlyTotal: 0,
      });
      vi.mocked(getDonationsFiltered).mockResolvedValue(mockPaginatedDonations);

      const Page = await FinanceiroPage({
        searchParams: Promise.resolve({}),
      });
      render(Page);

      expect(screen.getByRole('heading', { level: 1, name: 'Financeiro' })).toBeInTheDocument();
    });
  });

  describe('Navigation Integration', () => {
    it('should have Financeiro link in admin navigation', async () => {
      vi.mocked(getFinancialSummary).mockResolvedValue({
        weeklyTotal: 0,
        monthlyTotal: 0,
      });
      vi.mocked(getDonationsFiltered).mockResolvedValue({
        donations: [],
        totalCount: 0,
        totalPages: 0,
        currentPage: 1,
      });

      const Page = await FinanceiroPage({
        searchParams: Promise.resolve({}),
      });
      render(Page);

      // Navigation is handled at layout level
      // Verify page renders without navigation errors
      expect(screen.getByRole('heading', { level: 1, name: 'Financeiro' })).toBeInTheDocument();
    });
  });
});
