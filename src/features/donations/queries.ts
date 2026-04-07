'use server';

import { db } from '@/lib/db';
import { donations, products, fundTransfers } from '@/lib/db/schema';
import { eq, desc, and, gt, inArray, isNotNull, gte, lte, ilike, sum, count } from 'drizzle-orm';
import { startOfWeek, startOfMonth } from 'date-fns';
import { DonationFilters } from './lib/parse-filters';

export async function getDonationsByProductId(productId: string) {
  try {
    const result = await db.query.donations.findMany({
      where: eq(donations.productId, productId),
    });
    return result;
  } catch (error) {
    console.error('getDonationsByProductId error:', error);
    return [];
  }
}

export async function getTotalMonetaryDonations() {
  try {
    const result = await db
      .select({ sum: donations.amount })
      .from(donations)
      .where(eq(donations.donationType, 'monetary'));

    return (result[0]?.sum as number) || 0;
  } catch (error) {
    console.error('getTotalMonetaryDonations error:', error);
    return 0;
  }
}

export async function getPhysicalDonationStats() {
  try {
    const fulfilled = await db.query.products.findMany({
      where: eq(products.isFulfilled, true),
    });

    const pending = await db.query.products.findMany({
      where: eq(products.isFulfilled, false),
    });

    return {
      fulfilled: fulfilled.length,
      pending: pending.length,
    };
  } catch (error) {
    console.error('getPhysicalDonationStats error:', error);
    return {
      fulfilled: 0,
      pending: 0,
    };
  }
}

export async function getFundTransfers(filters?: { productId?: string }) {
  try {
    let query = db.query.fundTransfers.findMany({
      with: {
        sourceProduct: true,
        targetProduct: true,
      },
      orderBy: desc(fundTransfers.createdAt),
    });

    if (filters?.productId) {
      // If productId is provided, fetch transfers where it's either source or target
      // We'll do this in memory since Drizzle doesn't easily support OR conditions with relations
      const allTransfers = await query;
      return allTransfers.filter(
        (t) =>
          t.sourceProductId === filters.productId ||
          t.targetProductId === filters.productId
      );
    }

    const result = await query;
    return result;
  } catch (error) {
    console.error('getFundTransfers error:', error);
    return [];
  }
}

export type ProductForTransfer = {
  id: string;
  name: string;
  currentAmount: number;
  targetAmount: number | null;
};

export interface FinancialSummary {
  weeklyTotal: number;
  monthlyTotal: number;
}

export interface DonationRow {
  id: string;
  donationType: string;
  amount: number | null;
  donorName: string | null;
  donorEmail: string | null;
  receiptPath: string | null;
  isVerified: boolean;
  emailSentAt: Date | null;
  createdAt: Date;
  productName: string | null;
}

export interface PaginatedDonations {
  donations: DonationRow[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
}

export async function getProductsForTransfer(): Promise<{
  sourceProducts: ProductForTransfer[];
  targetProducts: ProductForTransfer[];
}> {
  try {
    const [sourceProducts, targetProducts] = await Promise.all([
      // Source: monetary products where donations exceed the target (has surplus to transfer)
      db.query.products.findMany({
        columns: {
          id: true,
          name: true,
          currentAmount: true,
          targetAmount: true,
        },
        where: and(
          eq(products.isPublished, true),
          inArray(products.donationMode, ['monetary', 'both']),
          isNotNull(products.targetAmount),
          gt(products.currentAmount, products.targetAmount)
        ),
      }),
      db.query.products.findMany({
        columns: {
          id: true,
          name: true,
          currentAmount: true,
          targetAmount: true,
        },
        where: and(
          eq(products.isPublished, true),
          eq(products.isFulfilled, false)
        ),
      }),
    ]);

    return { sourceProducts, targetProducts };
  } catch (error) {
    console.error('getProductsForTransfer error:', error);
    return { sourceProducts: [], targetProducts: [] };
  }
}

const PAGE_SIZE = 20;

export async function getFinancialSummary(): Promise<FinancialSummary> {
  try {
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 0 });
    const monthStart = startOfMonth(new Date());

    const [weeklyResult, monthlyResult] = await Promise.all([
      db
        .select({ total: sum(donations.amount) })
        .from(donations)
        .where(
          and(
            eq(donations.donationType, 'monetary'),
            gte(donations.createdAt, weekStart)
          )
        ),
      db
        .select({ total: sum(donations.amount) })
        .from(donations)
        .where(
          and(
            eq(donations.donationType, 'monetary'),
            gte(donations.createdAt, monthStart)
          )
        ),
    ]);

    return {
      weeklyTotal: weeklyResult[0]?.total ? Number(weeklyResult[0].total) : 0,
      monthlyTotal: monthlyResult[0]?.total ? Number(monthlyResult[0].total) : 0,
    };
  } catch (error) {
    console.error('[getFinancialSummary] Failed:', error);
    return {
      weeklyTotal: 0,
      monthlyTotal: 0,
    };
  }
}

export async function getDonationsFiltered(
  filters: DonationFilters
): Promise<PaginatedDonations> {
  try {
    const offset = (filters.page - 1) * PAGE_SIZE;

    // Build dynamic WHERE conditions
    const conditions = [];

    if (filters.donationType) {
      conditions.push(eq(donations.donationType, filters.donationType));
    }

    if (filters.dateFrom) {
      conditions.push(gte(donations.createdAt, filters.dateFrom));
    }

    if (filters.dateTo) {
      conditions.push(lte(donations.createdAt, filters.dateTo));
    }

    if (filters.donorName) {
      conditions.push(ilike(donations.donorName, `%${filters.donorName}%`));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Execute data and count queries in parallel
    const [donationRows, countResult] = await Promise.all([
      db
        .select({
          id: donations.id,
          donationType: donations.donationType,
          amount: donations.amount,
          donorName: donations.donorName,
          donorEmail: donations.donorEmail,
          receiptPath: donations.receiptPath,
          isVerified: donations.isVerified,
          emailSentAt: donations.emailSentAt,
          createdAt: donations.createdAt,
          productName: products.name,
        })
        .from(donations)
        .leftJoin(products, eq(donations.productId, products.id))
        .where(whereClause)
        .orderBy(desc(donations.createdAt))
        .limit(PAGE_SIZE)
        .offset(offset),
      db
        .select({ total: count() })
        .from(donations)
        .where(whereClause),
    ]);

    const totalCount = countResult[0]?.total ? Number(countResult[0].total) : 0;
    const totalPages = Math.ceil(totalCount / PAGE_SIZE);

    return {
      donations: donationRows,
      totalCount,
      totalPages,
      currentPage: filters.page,
    };
  } catch (error) {
    console.error('[getDonationsFiltered] filters:', filters, 'error:', error);
    return {
      donations: [],
      totalCount: 0,
      totalPages: 0,
      currentPage: filters.page,
    };
  }
}
