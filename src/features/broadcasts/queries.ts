'use server';

import { db } from '@/lib/db';
import { donations, broadcasts, broadcastDrafts } from '@/lib/db/schema';
import { getSession } from '@/lib/auth/session';
import { isNotNull, desc, eq } from 'drizzle-orm';
import {
  BroadcastDraftSnapshot,
  broadcastDraftContentSchema,
  extractBroadcastImagePaths,
} from './content';

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

export async function getBroadcastDraft(): Promise<BroadcastDraftSnapshot | null> {
  try {
    const session = await getSession();
    if (!session.isAdmin || !session.username) return null;

    const rows = await db
      .select()
      .from(broadcastDrafts)
      .where(eq(broadcastDrafts.adminUsername, session.username))
      .limit(1);
    const draft = rows[0];
    if (!draft) return null;

    const content = broadcastDraftContentSchema.safeParse(draft.content);
    if (!content.success) {
      console.error('getBroadcastDraft invalid stored content:', content.error);
      return null;
    }

    return {
      composerId: draft.composerId,
      subject: draft.subject,
      senderName: draft.senderName,
      signatureText: draft.signatureText,
      bccEmail: draft.bccEmail ?? '',
      testEmail: draft.testEmail ?? '',
      content: content.data,
      updatedAt: draft.updatedAt.toISOString(),
    };
  } catch (error) {
    console.error('getBroadcastDraft error:', error);
    return null;
  }
}

export async function getAllBroadcastDraftImagePaths(): Promise<string[] | null> {
  try {
    const rows = await db
      .select({ content: broadcastDrafts.content })
      .from(broadcastDrafts);

    return Array.from(
      new Set(
        rows.flatMap((row) => {
          const content = broadcastDraftContentSchema.safeParse(row.content);
          return content.success
            ? extractBroadcastImagePaths(content.data)
            : [];
        })
      )
    );
  } catch (error) {
    console.error('getAllBroadcastDraftImagePaths error:', error);
    return null;
  }
}

export async function getBroadcastDraftImagePaths(
  adminUsername: string
): Promise<string[]> {
  try {
    const rows = await db
      .select({ content: broadcastDrafts.content })
      .from(broadcastDrafts)
      .where(eq(broadcastDrafts.adminUsername, adminUsername))
      .limit(1);
    const content = broadcastDraftContentSchema.safeParse(rows[0]?.content);
    return content.success ? extractBroadcastImagePaths(content.data) : [];
  } catch (error) {
    console.error('getBroadcastDraftImagePaths error:', error);
    return [];
  }
}
