'use server';

import { db } from '@/lib/db';
import { donations, broadcasts } from '@/lib/db/schema';
import { isNotNull, desc } from 'drizzle-orm';

/**
 * Returns the number of unique donor email addresses that would receive a broadcast.
 */
export async function getBroadcastRecipientCount(): Promise<number> {
  try {
    const rows = await db
      .selectDistinct({ email: donations.donorEmail })
      .from(donations)
      .where(isNotNull(donations.donorEmail));

    return rows.filter((r) => !!r.email && r.email.trim().length > 0).length;
  } catch (error) {
    console.error('getBroadcastRecipientCount error:', error);
    return 0;
  }
}

/**
 * Returns the unique donor emails for broadcast targeting.
 */
export async function getBroadcastRecipientEmails(): Promise<string[]> {
  const rows = await db
    .selectDistinct({ email: donations.donorEmail })
    .from(donations)
    .where(isNotNull(donations.donorEmail));

  const seen = new Set<string>();
  for (const r of rows) {
    const e = r.email?.trim().toLowerCase();
    if (e && e.includes('@')) seen.add(e);
  }
  return Array.from(seen);
}

export async function listBroadcasts() {
  try {
    return await db
      .select()
      .from(broadcasts)
      .orderBy(desc(broadcasts.createdAt))
      .limit(50);
  } catch (error) {
    console.error('listBroadcasts error:', error);
    return [];
  }
}

