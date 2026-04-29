'use server';

import { revalidatePath } from 'next/cache';
import { ZodError } from 'zod';
import { Resend } from 'resend';
import { db } from '@/lib/db';
import { broadcasts } from '@/lib/db/schema';
import { getSession } from '@/lib/auth/session';
import { renderEmailHtml } from '@/features/donations/emails/layout';
import { sendBroadcastSchema, sendTestBroadcastSchema } from './schemas';
import { getBroadcastRecipientEmails } from './queries';

interface ActionResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  details?: unknown;
}

const BATCH_SIZE = 50;

interface BroadcastResult {
  broadcastId: string;
  recipientCount: number;
  successCount: number;
  failureCount: number;
}

export async function sendBroadcastEmail(
  input: unknown
): Promise<ActionResult<BroadcastResult>> {
  try {
    const session = await getSession();
    if (!session.isAdmin) {
      return { success: false, error: 'UNAUTHORIZED' };
    }

    const validated = sendBroadcastSchema.parse(input);

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.error('sendBroadcastEmail: RESEND_API_KEY is not configured');
      return {
        success: false,
        error: 'INTERNAL_ERROR',
        details: { message: 'Serviço de email não configurado.' },
      };
    }

    const recipients = await getBroadcastRecipientEmails();
    if (recipients.length === 0) {
      return { success: false, error: 'NO_RECIPIENTS' };
    }

    const resend = new Resend(apiKey);
    const fromAddress =
      process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
    const html = renderEmailHtml({
      subject: validated.subject,
      bodyText: validated.message,
      senderName: validated.senderName,
    });

    let successCount = 0;
    let failureCount = 0;

    const bcc = validated.bccEmail ? [validated.bccEmail] : undefined;

    for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
      const batch = recipients.slice(i, i + BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map((to) =>
          resend.emails.send({
            from: fromAddress,
            to,
            bcc,
            subject: validated.subject,
            html,
          })
        )
      );
      for (const r of results) {
        if (r.status === 'fulfilled' && !r.value.error) {
          successCount += 1;
        } else {
          failureCount += 1;
          if (r.status === 'fulfilled' && r.value.error) {
            console.error('broadcast send error:', r.value.error);
          } else if (r.status === 'rejected') {
            console.error('broadcast send rejected:', r.reason);
          }
        }
      }
    }

    const inserted = await db
      .insert(broadcasts)
      .values({
        subject: validated.subject,
        message: validated.message,
        recipientCount: recipients.length,
        sentSuccessCount: successCount,
        sentFailureCount: failureCount,
        sentBy: session.username || 'unknown',
        senderName: validated.senderName,
      })
      .returning({ id: broadcasts.id });

    revalidatePath('/admin/comunicacoes');

    return {
      success: true,
      data: {
        broadcastId: inserted[0].id,
        recipientCount: recipients.length,
        successCount,
        failureCount,
      },
    };
  } catch (error) {
    console.error('sendBroadcastEmail error:', error);
    if (error instanceof ZodError) {
      return {
        success: false,
        error: 'VALIDATION_ERROR',
        details: error.flatten(),
      };
    }
    return { success: false, error: 'INTERNAL_ERROR' };
  }
}

export async function sendTestBroadcastEmail(
  input: unknown
): Promise<ActionResult<{ to: string }>> {
  try {
    const session = await getSession();
    if (!session.isAdmin) {
      return { success: false, error: 'UNAUTHORIZED' };
    }

    const validated = sendTestBroadcastSchema.parse(input);

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.error('sendTestBroadcastEmail: RESEND_API_KEY is not configured');
      return {
        success: false,
        error: 'INTERNAL_ERROR',
        details: { message: 'Serviço de email não configurado.' },
      };
    }

    const resend = new Resend(apiKey);
    const fromAddress =
      process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
    const html = renderEmailHtml({
      subject: validated.subject,
      bodyText: validated.message,
      senderName: validated.senderName,
    });

    const result = await resend.emails.send({
      from: fromAddress,
      to: validated.testEmail,
      subject: `[TESTE] ${validated.subject}`,
      html,
    });

    if (result.error) {
      console.error('sendTestBroadcastEmail send error:', result.error);
      return { success: false, error: 'INTERNAL_ERROR' };
    }

    return { success: true, data: { to: validated.testEmail } };
  } catch (error) {
    console.error('sendTestBroadcastEmail error:', error);
    if (error instanceof ZodError) {
      return {
        success: false,
        error: 'VALIDATION_ERROR',
        details: error.flatten(),
      };
    }
    return { success: false, error: 'INTERNAL_ERROR' };
  }
}
