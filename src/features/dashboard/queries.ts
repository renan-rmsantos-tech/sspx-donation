'use server';

import { db } from '@/lib/db';
import { donations, products } from '@/lib/db/schema';
import { eq, sum, countDistinct, count, and, gte } from 'drizzle-orm';
import { startOfWeek, startOfMonth } from 'date-fns';

export interface DashboardStats {
  totalMonetaryDonations: number;
  weeklyMonetaryTotal: number;
  monthlyMonetaryTotal: number;
  totalDonationCount: number;
  totalPhysicalFulfilled: number;
  totalPhysicalPending: number;
  hasTransfersAvailable: boolean;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  try {
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 0 });
    const monthStart = startOfMonth(new Date());

    // Get total monetary donations, weekly, monthly, and count
    const [monetaryResult, weeklyResult, monthlyResult, countResult] = await Promise.all([
      db
        .select({ total: sum(donations.amount) })
        .from(donations)
        .where(eq(donations.donationType, 'monetary')),
      db
        .select({ total: sum(donations.amount) })
        .from(donations)
        .where(and(eq(donations.donationType, 'monetary'), gte(donations.createdAt, weekStart))),
      db
        .select({ total: sum(donations.amount) })
        .from(donations)
        .where(and(eq(donations.donationType, 'monetary'), gte(donations.createdAt, monthStart))),
      db
        .select({ total: count() })
        .from(donations),
    ]);

    const totalMonetaryDonations = monetaryResult[0]?.total ? Number(monetaryResult[0].total) : 0;
    const weeklyMonetaryTotal = weeklyResult[0]?.total ? Number(weeklyResult[0].total) : 0;
    const monthlyMonetaryTotal = monthlyResult[0]?.total ? Number(monthlyResult[0].total) : 0;
    const totalDonationCount = countResult[0]?.total ? Number(countResult[0].total) : 0;

    // Get products fulfilled/pending counts (published products only)
    const physicalResult = await db
      .select({ isFulfilled: products.isFulfilled, count: countDistinct(products.id) })
      .from(products)
      .where(eq(products.isPublished, true))
      .groupBy(products.isFulfilled);

    const totalPhysicalFulfilled =
      physicalResult.find((r) => r.isFulfilled === true)?.count || 0;
    const totalPhysicalPending =
      physicalResult.find((r) => r.isFulfilled === false)?.count || 0;

    // Check if transfers are available: at least 1 monetary product with surplus + 2 target products
    const productsForTransfer = await db.query.products.findMany({
      columns: {
        id: true,
        isPublished: true,
        isFulfilled: true,
        donationMode: true,
        currentAmount: true,
        targetAmount: true,
      },
    });
    const hasSourceProduct = productsForTransfer.some(
      (p) =>
        p.isPublished &&
        (p.donationMode === 'monetary' || p.donationMode === 'both') &&
        p.targetAmount !== null &&
        p.currentAmount > p.targetAmount
    );
    const targetProductCount = productsForTransfer.filter(
      (p) => p.isPublished && !p.isFulfilled
    ).length;
    const hasTransfersAvailable = hasSourceProduct && targetProductCount >= 2;

    return {
      totalMonetaryDonations,
      weeklyMonetaryTotal,
      monthlyMonetaryTotal,
      totalDonationCount,
      totalPhysicalFulfilled: Number(totalPhysicalFulfilled),
      totalPhysicalPending: Number(totalPhysicalPending),
      hasTransfersAvailable,
    };
  } catch (error) {
    console.error('getDashboardStats error:', error);
    return {
      totalMonetaryDonations: 0,
      weeklyMonetaryTotal: 0,
      monthlyMonetaryTotal: 0,
      totalDonationCount: 0,
      totalPhysicalFulfilled: 0,
      totalPhysicalPending: 0,
      hasTransfersAvailable: false,
    };
  }
}
