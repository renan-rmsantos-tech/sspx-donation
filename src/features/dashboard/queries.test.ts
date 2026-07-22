// @ts-nocheck - Mock chain types don't match Drizzle's PgSelectBuilder
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getDashboardStats } from './queries';

vi.mock('@/lib/db', () => ({
  db: {
    select: vi.fn(),
    query: {
      products: {
        findMany: vi.fn().mockResolvedValue([]),
      },
    },
  },
}));

/**
 * getDashboardStats issues, in order:
 *   1. monetary total  -> select().from().where()
 *   2. weekly total    -> select().from().where()
 *   3. monthly total   -> select().from().where()
 *   4. donation count  -> select().from()            (awaited directly, no where)
 *   5. physical counts -> select().from().where().groupBy()
 * plus db.query.products.findMany() for hasTransfersAvailable.
 */
function mockStats(db, { monetary = [{ total: null }], physical = [] } = {}) {
  const totalOnly = (rows) => ({
    from: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(rows) }),
  });
  vi.mocked(db.select)
    .mockReturnValueOnce(totalOnly(monetary))
    .mockReturnValueOnce(totalOnly([{ total: null }]))
    .mockReturnValueOnce(totalOnly([{ total: null }]))
    .mockReturnValueOnce({ from: vi.fn().mockResolvedValue([{ total: 0 }]) })
    .mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          groupBy: vi.fn().mockResolvedValue(physical),
        }),
      }),
    });
}

describe('getDashboardStats', () => {
  beforeEach(async () => {
    const { db } = await import('@/lib/db');
    vi.mocked(db.select).mockReset();
    vi.mocked(db.query.products.findMany).mockResolvedValue([]);
  });

  describe('monetary aggregation', () => {
    it('should sum total monetary donations across all monetary donations', async () => {
      const { db } = await import('@/lib/db');
      mockStats(db, { monetary: [{ total: 15000 }] });

      const result = await getDashboardStats();

      expect(result.totalMonetaryDonations).toBe(15000);
      expect(result.hasTransfersAvailable).toBe(false);
    });

    it('should aggregate multiple monetary donations across products', async () => {
      const { db } = await import('@/lib/db');
      mockStats(db, {
        monetary: [{ total: 50000 }],
        physical: [
          { isFulfilled: false, count: 2 },
          { isFulfilled: true, count: 1 },
        ],
      });

      const result = await getDashboardStats();

      expect(result.totalMonetaryDonations).toBe(50000);
      expect(result.totalPhysicalFulfilled).toBe(1);
      expect(result.totalPhysicalPending).toBe(2);
    });

    it('should return 0 when no monetary donations exist', async () => {
      const { db } = await import('@/lib/db');
      mockStats(db, { monetary: [{ total: null }] });

      const result = await getDashboardStats();

      expect(result.totalMonetaryDonations).toBe(0);
    });

    it('should handle sum returning null (empty donations table)', async () => {
      const { db } = await import('@/lib/db');
      mockStats(db, { monetary: [] });

      const result = await getDashboardStats();

      expect(result.totalMonetaryDonations).toBe(0);
    });
  });

  describe('physical fulfilled/pending counts', () => {
    it('should count physical products by fulfillment status', async () => {
      const { db } = await import('@/lib/db');
      mockStats(db, {
        monetary: [{ total: 0 }],
        physical: [
          { isFulfilled: true, count: 3 },
          { isFulfilled: false, count: 5 },
        ],
      });

      const result = await getDashboardStats();

      expect(result.totalPhysicalFulfilled).toBe(3);
      expect(result.totalPhysicalPending).toBe(5);
    });

    it('should return 0 for fulfilled when no physical products are fulfilled', async () => {
      const { db } = await import('@/lib/db');
      mockStats(db, {
        monetary: [{ total: 0 }],
        physical: [{ isFulfilled: false, count: 4 }],
      });

      const result = await getDashboardStats();

      expect(result.totalPhysicalFulfilled).toBe(0);
      expect(result.totalPhysicalPending).toBe(4);
    });

    it('should return 0 for pending when all physical products are fulfilled', async () => {
      const { db } = await import('@/lib/db');
      mockStats(db, {
        monetary: [{ total: 0 }],
        physical: [{ isFulfilled: true, count: 2 }],
      });

      const result = await getDashboardStats();

      expect(result.totalPhysicalFulfilled).toBe(2);
      expect(result.totalPhysicalPending).toBe(0);
    });

    it('should return 0 for both when no physical products exist', async () => {
      const { db } = await import('@/lib/db');
      mockStats(db, { monetary: [{ total: 0 }], physical: [] });

      const result = await getDashboardStats();

      expect(result.totalPhysicalFulfilled).toBe(0);
      expect(result.totalPhysicalPending).toBe(0);
    });
  });

  describe('edge cases', () => {
    it('should return zeros when no products and no donations', async () => {
      const { db } = await import('@/lib/db');
      mockStats(db, { monetary: [{ total: null }], physical: [] });

      const result = await getDashboardStats();

      expect(result.totalMonetaryDonations).toBe(0);
      expect(result.totalPhysicalFulfilled).toBe(0);
      expect(result.totalPhysicalPending).toBe(0);
      expect(result.hasTransfersAvailable).toBe(false);
    });

    it('should handle mixed dataset: monetary only', async () => {
      const { db } = await import('@/lib/db');
      mockStats(db, { monetary: [{ total: 25000 }], physical: [] });

      const result = await getDashboardStats();

      expect(result.totalMonetaryDonations).toBe(25000);
      expect(result.totalPhysicalFulfilled).toBe(0);
      expect(result.totalPhysicalPending).toBe(0);
    });

    it('should handle mixed dataset: physical only', async () => {
      const { db } = await import('@/lib/db');
      mockStats(db, {
        monetary: [{ total: null }],
        physical: [
          { isFulfilled: true, count: 1 },
          { isFulfilled: false, count: 2 },
        ],
      });

      const result = await getDashboardStats();

      expect(result.totalMonetaryDonations).toBe(0);
      expect(result.totalPhysicalFulfilled).toBe(1);
      expect(result.totalPhysicalPending).toBe(2);
    });

    it('should return zeros on database error', async () => {
      const { db } = await import('@/lib/db');
      // Every db.select() call in the Promise.all must return a consumable
      // (rejecting) chain — otherwise a later call throws synchronously and
      // orphans an earlier rejected promise as an unhandled rejection.
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockRejectedValue(new Error('DB connection failed')),
        }),
      });

      const result = await getDashboardStats();

      expect(result).toEqual({
        totalMonetaryDonations: 0,
        weeklyMonetaryTotal: 0,
        monthlyMonetaryTotal: 0,
        totalDonationCount: 0,
        totalPhysicalFulfilled: 0,
        totalPhysicalPending: 0,
        hasTransfersAvailable: false,
      });
    });
  });

  describe('consistency with product/donation semantics', () => {
    it('should reflect product isFulfilled for physical counts', async () => {
      const { db } = await import('@/lib/db');
      mockStats(db, {
        monetary: [{ total: 0 }],
        physical: [
          { isFulfilled: true, count: 1 },
          { isFulfilled: false, count: 1 },
        ],
      });

      const result = await getDashboardStats();

      expect(result.totalPhysicalFulfilled).toBe(1);
      expect(result.totalPhysicalPending).toBe(1);
    });

    it('should use donations.amount for monetary total (not product.currentAmount)', async () => {
      const { db } = await import('@/lib/db');
      mockStats(db, { monetary: [{ total: 100000 }] });

      const result = await getDashboardStats();

      expect(result.totalMonetaryDonations).toBe(100000);
    });
  });

  describe('hasTransfersAvailable', () => {
    it('should return true when a monetary product has surplus and 2+ non-fulfilled targets exist', async () => {
      const { db } = await import('@/lib/db');
      mockStats(db, { monetary: [{ total: 0 }] });
      vi.mocked(db.query.products.findMany).mockResolvedValue([
        {
          id: 'p1',
          isPublished: true,
          isFulfilled: false,
          donationMode: 'monetary',
          currentAmount: 12000,
          targetAmount: 10000,
        },
        {
          id: 'p2',
          isPublished: true,
          isFulfilled: false,
          donationMode: 'physical',
          currentAmount: 0,
          targetAmount: 5000,
        },
        {
          id: 'p3',
          isPublished: true,
          isFulfilled: false,
          donationMode: 'physical',
          currentAmount: 0,
          targetAmount: 3000,
        },
      ]);

      const result = await getDashboardStats();

      expect(result.hasTransfersAvailable).toBe(true);
    });

    it('should return false when monetary product has surplus but fewer than 2 non-fulfilled targets', async () => {
      const { db } = await import('@/lib/db');
      mockStats(db, { monetary: [{ total: 0 }] });
      vi.mocked(db.query.products.findMany).mockResolvedValue([
        {
          id: 'p1',
          isPublished: true,
          isFulfilled: false,
          donationMode: 'monetary',
          currentAmount: 12000,
          targetAmount: 10000,
        },
        {
          id: 'p2',
          isPublished: true,
          isFulfilled: true,
          donationMode: 'physical',
          currentAmount: 5000,
          targetAmount: 5000,
        },
      ]);

      const result = await getDashboardStats();

      expect(result.hasTransfersAvailable).toBe(false);
    });

    it('should return false when no monetary product has surplus (currentAmount <= targetAmount)', async () => {
      const { db } = await import('@/lib/db');
      mockStats(db, { monetary: [{ total: 0 }] });
      vi.mocked(db.query.products.findMany).mockResolvedValue([
        {
          id: 'p1',
          isPublished: true,
          isFulfilled: false,
          donationMode: 'monetary',
          currentAmount: 8000,
          targetAmount: 10000,
        },
        {
          id: 'p2',
          isPublished: true,
          isFulfilled: false,
          donationMode: 'monetary',
          currentAmount: 10000,
          targetAmount: 10000,
        },
        {
          id: 'p3',
          isPublished: true,
          isFulfilled: false,
          donationMode: 'physical',
          currentAmount: 0,
          targetAmount: 3000,
        },
      ]);

      const result = await getDashboardStats();

      expect(result.hasTransfersAvailable).toBe(false);
    });

    it('should return false when only physical donation mode products exist (no monetary surplus)', async () => {
      const { db } = await import('@/lib/db');
      mockStats(db, { monetary: [{ total: 0 }] });
      vi.mocked(db.query.products.findMany).mockResolvedValue([
        {
          id: 'p1',
          isPublished: true,
          isFulfilled: false,
          donationMode: 'physical',
          currentAmount: 0,
          targetAmount: 5000,
        },
        {
          id: 'p2',
          isPublished: true,
          isFulfilled: false,
          donationMode: 'physical',
          currentAmount: 0,
          targetAmount: 3000,
        },
      ]);

      const result = await getDashboardStats();

      expect(result.hasTransfersAvailable).toBe(false);
    });

    it('should return false when monetary product has surplus but targetAmount is null', async () => {
      const { db } = await import('@/lib/db');
      mockStats(db, { monetary: [{ total: 0 }] });
      vi.mocked(db.query.products.findMany).mockResolvedValue([
        {
          id: 'p1',
          isPublished: true,
          isFulfilled: false,
          donationMode: 'monetary',
          currentAmount: 5000,
          targetAmount: null,
        },
        {
          id: 'p2',
          isPublished: true,
          isFulfilled: false,
          donationMode: 'physical',
          currentAmount: 0,
          targetAmount: 3000,
        },
        {
          id: 'p3',
          isPublished: true,
          isFulfilled: false,
          donationMode: 'physical',
          currentAmount: 0,
          targetAmount: 2000,
        },
      ]);

      const result = await getDashboardStats();

      expect(result.hasTransfersAvailable).toBe(false);
    });
  });
});
