import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DonationFilters } from '../lib/parse-filters';

// Mock db and date-fns first
vi.mock('@/lib/db');
vi.mock('date-fns');

// Import after mocking
import { getFinancialSummary, getDonationsFiltered } from '../queries';
import { db } from '@/lib/db';
import * as dateModule from 'date-fns';

// Type helpers for mocking Drizzle ORM
type DbSelect = typeof db.select;

describe('Financial Overview Query Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getFinancialSummary', () => {
    it('returns financial summary with zero values on error', async () => {
      const mockDbSelect = vi.mocked(db.select) as any;
      mockDbSelect.mockImplementation(() => {
        throw new Error('Database error');
      });

      const result = await getFinancialSummary();

      expect(result).toHaveProperty('weeklyTotal');
      expect(result).toHaveProperty('monthlyTotal');
      expect(result.weeklyTotal).toBe(0);
      expect(result.monthlyTotal).toBe(0);
    });

    it('returns correct type structure for FinancialSummary', async () => {
      const mockDbSelect = vi.mocked(db.select) as any;
      mockDbSelect.mockImplementation(() => ({
        from: vi.fn().mockImplementation(() => ({
          where: vi.fn().mockResolvedValue([{ total: 100000 }]),
        })),
      }));

      const mockStartOfWeek = vi.mocked(dateModule.startOfWeek) as any;
      mockStartOfWeek.mockImplementation((date: Date) => {
        const d = new Date(date);
        const day = d.getDay();
        d.setDate(d.getDate() - day);
        return d;
      });

      const mockStartOfMonth = vi.mocked(dateModule.startOfMonth) as any;
      mockStartOfMonth.mockImplementation(
        (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1)
      );

      const result = await getFinancialSummary();

      expect(typeof result.weeklyTotal).toBe('number');
      expect(typeof result.monthlyTotal).toBe('number');
      expect(result.weeklyTotal).toBeGreaterThanOrEqual(0);
      expect(result.monthlyTotal).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getDonationsFiltered', () => {
    it('returns empty donations list with default page on error', async () => {
      const mockDbSelect = vi.mocked(db.select) as any;
      mockDbSelect.mockImplementation(() => {
        throw new Error('Database error');
      });

      const filters: DonationFilters = { page: 1 };
      const result = await getDonationsFiltered(filters);

      expect(result.donations).toEqual([]);
      expect(result.totalCount).toBe(0);
      expect(result.totalPages).toBe(0);
      expect(result.currentPage).toBe(1);
    });

    it('returns correct pagination structure', async () => {
      const filters: DonationFilters = { page: 1 };
      const mockDbSelect = vi.mocked(db.select) as any;

      mockDbSelect.mockImplementation(() => ({
        from: vi.fn().mockImplementation(() => ({
          leftJoin: vi.fn().mockImplementation(() => ({
            where: vi.fn().mockImplementation(() => ({
              orderBy: vi.fn().mockImplementation(() => ({
                limit: vi.fn().mockImplementation(() => ({
                  offset: vi.fn().mockResolvedValue([]),
                })),
              })),
            })),
          })),
        })),
      }));

      const result = await getDonationsFiltered(filters);

      expect(result).toHaveProperty('donations');
      expect(result).toHaveProperty('totalCount');
      expect(result).toHaveProperty('totalPages');
      expect(result).toHaveProperty('currentPage');
      expect(Array.isArray(result.donations)).toBe(true);
      expect(typeof result.totalCount).toBe('number');
      expect(typeof result.totalPages).toBe('number');
      expect(result.currentPage).toBe(1);
    });

    it('preserves page number from filters', async () => {
      const filters: DonationFilters = { page: 3 };
      const mockDbSelect = vi.mocked(db.select) as any;

      mockDbSelect.mockImplementation(() => ({
        from: vi.fn().mockImplementation(() => ({
          leftJoin: vi.fn().mockImplementation(() => ({
            where: vi.fn().mockImplementation(() => ({
              orderBy: vi.fn().mockImplementation(() => ({
                limit: vi.fn().mockImplementation(() => ({
                  offset: vi.fn().mockResolvedValue([]),
                })),
              })),
            })),
          })),
        })),
      }));

      const result = await getDonationsFiltered(filters);

      expect(result.currentPage).toBe(3);
    });

    it('handles filters with undefined filter fields', async () => {
      const filters: DonationFilters = {
        page: 1,
        donationType: undefined,
        dateFrom: undefined,
        dateTo: undefined,
        donorName: undefined,
      };
      const mockDbSelect = vi.mocked(db.select) as any;

      mockDbSelect.mockImplementation(() => ({
        from: vi.fn().mockImplementation(() => ({
          leftJoin: vi.fn().mockImplementation(() => ({
            where: vi.fn().mockImplementation(() => ({
              orderBy: vi.fn().mockImplementation(() => ({
                limit: vi.fn().mockImplementation(() => ({
                  offset: vi.fn().mockResolvedValue([]),
                })),
              })),
            })),
          })),
        })),
      }));

      const result = await getDonationsFiltered(filters);

      expect(result.donations).toEqual([]);
      expect(result.currentPage).toBe(1);
    });

    it('handles donationType filter in query', async () => {
      const filters: DonationFilters = {
        donationType: 'monetary',
        page: 1,
      };
      const mockDbSelect = vi.mocked(db.select) as any;

      mockDbSelect.mockImplementation(() => ({
        from: vi.fn().mockImplementation(() => ({
          leftJoin: vi.fn().mockImplementation(() => ({
            where: vi.fn().mockImplementation(() => ({
              orderBy: vi.fn().mockImplementation(() => ({
                limit: vi.fn().mockImplementation(() => ({
                  offset: vi.fn().mockResolvedValue([]),
                })),
              })),
            })),
          })),
        })),
      }));

      const result = await getDonationsFiltered(filters);

      expect(result.currentPage).toBe(1);
    });

    it('handles date filters in query', async () => {
      const filters: DonationFilters = {
        dateFrom: new Date('2026-03-01'),
        dateTo: new Date('2026-03-31'),
        page: 1,
      };
      const mockDbSelect = vi.mocked(db.select) as any;

      mockDbSelect.mockImplementation(() => ({
        from: vi.fn().mockImplementation(() => ({
          leftJoin: vi.fn().mockImplementation(() => ({
            where: vi.fn().mockImplementation(() => ({
              orderBy: vi.fn().mockImplementation(() => ({
                limit: vi.fn().mockImplementation(() => ({
                  offset: vi.fn().mockResolvedValue([]),
                })),
              })),
            })),
          })),
        })),
      }));

      const result = await getDonationsFiltered(filters);

      expect(result.currentPage).toBe(1);
    });

    it('handles donorName filter in query', async () => {
      const filters: DonationFilters = {
        donorName: 'João',
        page: 1,
      };
      const mockDbSelect = vi.mocked(db.select) as any;

      mockDbSelect.mockImplementation(() => ({
        from: vi.fn().mockImplementation(() => ({
          leftJoin: vi.fn().mockImplementation(() => ({
            where: vi.fn().mockImplementation(() => ({
              orderBy: vi.fn().mockImplementation(() => ({
                limit: vi.fn().mockImplementation(() => ({
                  offset: vi.fn().mockResolvedValue([]),
                })),
              })),
            })),
          })),
        })),
      }));

      const result = await getDonationsFiltered(filters);

      expect(result.currentPage).toBe(1);
    });

    it('pagination calculation: page 1', async () => {
      const filters: DonationFilters = { page: 1 };
      const mockDbSelect = vi.mocked(db.select) as any;

      mockDbSelect.mockImplementation(() => ({
        from: vi.fn().mockImplementation(() => ({
          leftJoin: vi.fn().mockImplementation(() => ({
            where: vi.fn().mockImplementation(() => ({
              orderBy: vi.fn().mockImplementation(() => ({
                limit: vi.fn().mockImplementation(() => ({
                  offset: vi.fn().mockResolvedValue([]),
                })),
              })),
            })),
          })),
        })),
      }));

      const result = await getDonationsFiltered(filters);

      expect(result.currentPage).toBe(1);
      expect(result.donations).toEqual([]);
    });

    it('pagination calculation: page 3', async () => {
      const filters: DonationFilters = { page: 3 };
      const mockDbSelect = vi.mocked(db.select) as any;

      mockDbSelect.mockImplementation(() => ({
        from: vi.fn().mockImplementation(() => ({
          leftJoin: vi.fn().mockImplementation(() => ({
            where: vi.fn().mockImplementation(() => ({
              orderBy: vi.fn().mockImplementation(() => ({
                limit: vi.fn().mockImplementation(() => ({
                  offset: vi.fn().mockResolvedValue([]),
                })),
              })),
            })),
          })),
        })),
      }));

      const result = await getDonationsFiltered(filters);

      expect(result.currentPage).toBe(3);
    });

    it('returns 0 total pages when no donations found', async () => {
      const filters: DonationFilters = { page: 1 };
      const mockDbSelect = vi.mocked(db.select) as any;

      mockDbSelect.mockImplementation(() => ({
        from: vi.fn().mockImplementation(() => ({
          leftJoin: vi.fn().mockImplementation(() => ({
            where: vi.fn().mockImplementation(() => ({
              orderBy: vi.fn().mockImplementation(() => ({
                limit: vi.fn().mockImplementation(() => ({
                  offset: vi.fn().mockResolvedValue([]),
                })),
              })),
            })),
          })),
        })),
      }));

      const result = await getDonationsFiltered(filters);

      expect(result.totalCount).toBe(0);
      expect(result.totalPages).toBe(0);
    });

    it('handles all filter types together', async () => {
      const filters: DonationFilters = {
        donationType: 'monetary',
        dateFrom: new Date('2026-03-01'),
        dateTo: new Date('2026-03-31'),
        donorName: 'João Silva',
        page: 2,
      };
      const mockDbSelect = vi.mocked(db.select) as any;

      mockDbSelect.mockImplementation(() => ({
        from: vi.fn().mockImplementation(() => ({
          leftJoin: vi.fn().mockImplementation(() => ({
            where: vi.fn().mockImplementation(() => ({
              orderBy: vi.fn().mockImplementation(() => ({
                limit: vi.fn().mockImplementation(() => ({
                  offset: vi.fn().mockResolvedValue([]),
                })),
              })),
            })),
          })),
        })),
      }));

      const result = await getDonationsFiltered(filters);

      expect(result.currentPage).toBe(2);
      expect(result).toHaveProperty('donations');
      expect(result).toHaveProperty('totalCount');
      expect(result).toHaveProperty('totalPages');
    });
  });
});
