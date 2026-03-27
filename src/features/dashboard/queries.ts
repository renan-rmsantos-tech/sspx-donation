'use server';

import { db } from '@/lib/db';
import { donations, products } from '@/lib/db/schema';
import { eq, sum, countDistinct } from 'drizzle-orm';

export interface DashboardStats {
  totalMonetaryDonations: number;
  totalPhysicalFulfilled: number;
  totalPhysicalPending: number;
  hasTransfersAvailable: boolean;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  try {
    // Get total monetary donations
    const monetaryResult = await db
      .select({ total: sum(donations.amount) })
      .from(donations)
      .where(eq(donations.donationType, 'monetary'));

    const totalMonetaryDonations = (monetaryResult[0]?.total as unknown as number) || 0;

    // Get products fulfilled/pending counts (all products)
    const physicalResult = await db
      .select({ isFulfilled: products.isFulfilled, count: countDistinct(products.id) })
      .from(products)
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
      totalPhysicalFulfilled: Number(totalPhysicalFulfilled),
      totalPhysicalPending: Number(totalPhysicalPending),
      hasTransfersAvailable,
    };
  } catch (error) {
    console.error('getDashboardStats error:', error);
    return {
      totalMonetaryDonations: 0,
      totalPhysicalFulfilled: 0,
      totalPhysicalPending: 0,
      hasTransfersAvailable: false,
    };
  }
}
