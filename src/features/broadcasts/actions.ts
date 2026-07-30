'use server';

import { revalidatePath } from 'next/cache';
import { ZodError } from 'zod';
import { Resend } from 'resend';
import { randomUUID } from 'node:crypto';
import { db } from '@/lib/db';
import { broadcasts } from '@/lib/db/schema';
import { getSession } from '@/lib/auth/session';
import {
  copyStorageObject,
  deleteStorageObjectsOlderThan,
  deleteStorageObject,
  uploadFileDirect,
} from '@/lib/storage/spaces';
import { getPublicUrl } from '@/lib/storage/public-url';
import {
  deleteTemporaryBroadcastImageSchema,
  sendBroadcastSchema,
  sendTestBroadcastSchema,
  uploadBroadcastImageSchema,
} from './schemas';
import { getBroadcastRecipientEmails } from './queries';
import {
  BroadcastContentV1,
  extractBroadcastPlainText,
} from './content';
import {
  renderBroadcastEmailHtml,
  renderBroadcastEmailText,
} from './email';

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

interface BroadcastImageUploadResult {
  path: string;
  publicUrl: string;
}

const BROADCAST_IMAGE_MAX_BYTES = 2 * 1024 * 1024;
const TEMPORARY_IMAGE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

function replaceBlockImagePath(
  content: BroadcastContentV1,
  blockId: string,
  path: string
): BroadcastContentV1 {
  return {
    ...content,
    blocks: content.blocks.map((block) => {
      if (block.id !== blockId || block.type === 'text') return block;
      return { ...block, image: { ...block.image, path } };
    }),
  };
}

async function promoteBroadcastImages(
  content: BroadcastContentV1,
  broadcastId: string
): Promise<{ content: BroadcastContentV1; temporaryPaths: string[] }> {
  let promoted = content;
  const promotedPaths = new Map<string, string>();

  for (const block of content.blocks) {
    if (block.type === 'text' || !block.image.path.startsWith('temporary/')) {
      continue;
    }

    const existingDestination = promotedPaths.get(block.image.path);
    if (existingDestination) {
      promoted = replaceBlockImagePath(
        promoted,
        block.id,
        existingDestination
      );
      continue;
    }

    const filename = block.image.path.split('/').slice(-1)[0];
    if (!filename) throw new Error('Invalid temporary broadcast image path');

    const destinationPath = `broadcasts/${broadcastId}/${filename}`;
    await copyStorageObject(
      'broadcast-images',
      block.image.path,
      destinationPath,
      { contentType: 'image/jpeg', publicRead: true }
    );
    promotedPaths.set(block.image.path, destinationPath);
    promoted = replaceBlockImagePath(promoted, block.id, destinationPath);
  }

  return {
    content: promoted,
    temporaryPaths: Array.from(promotedPaths.keys()),
  };
}

export async function uploadBroadcastImage(
  formData: FormData
): Promise<ActionResult<BroadcastImageUploadResult>> {
  try {
    const session = await getSession();
    if (!session.isAdmin) return { success: false, error: 'UNAUTHORIZED' };

    const { composerId } = uploadBroadcastImageSchema.parse({
      composerId: formData.get('composerId'),
    });
    const file = formData.get('file');
    if (!(file instanceof Blob)) {
      return {
        success: false,
        error: 'VALIDATION_ERROR',
        details: { message: 'Selecione uma imagem para enviar.' },
      };
    }
    if (
      file.type !== 'image/jpeg' ||
      file.size === 0 ||
      file.size > BROADCAST_IMAGE_MAX_BYTES
    ) {
      return {
        success: false,
        error: 'VALIDATION_ERROR',
        details: {
          message: 'A imagem otimizada deve ser um JPEG de até 2 MB.',
        },
      };
    }

    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    if (
      bytes.length < 4 ||
      bytes[0] !== 0xff ||
      bytes[1] !== 0xd8 ||
      bytes[2] !== 0xff
    ) {
      return {
        success: false,
        error: 'VALIDATION_ERROR',
        details: { message: 'O arquivo enviado não é uma imagem JPEG válida.' },
      };
    }

    try {
      await deleteStorageObjectsOlderThan(
        'broadcast-images',
        'temporary/',
        new Date(Date.now() - TEMPORARY_IMAGE_MAX_AGE_MS)
      );
    } catch (cleanupError) {
      console.error('broadcast temporary image cleanup error:', cleanupError);
    }

    const path = `temporary/${composerId}/${randomUUID()}.jpg`;
    await uploadFileDirect(
      'broadcast-images',
      path,
      arrayBuffer,
      { contentType: 'image/jpeg' }
    );

    return {
      success: true,
      data: {
        path,
        publicUrl: getPublicUrl('broadcast-images', path),
      },
    };
  } catch (error) {
    console.error('uploadBroadcastImage error:', error);
    if (error instanceof ZodError) {
      return {
        success: false,
        error: 'VALIDATION_ERROR',
        details: error.flatten(),
      };
    }
    return {
      success: false,
      error: 'STORAGE_ERROR',
      details: { message: 'Não foi possível preparar o upload da imagem.' },
    };
  }
}

export async function deleteTemporaryBroadcastImage(
  input: unknown
): Promise<ActionResult<null>> {
  try {
    const session = await getSession();
    if (!session.isAdmin) return { success: false, error: 'UNAUTHORIZED' };

    const { path } = deleteTemporaryBroadcastImageSchema.parse(input);
    await deleteStorageObject('broadcast-images', path);
    return { success: true, data: null };
  } catch (error) {
    console.error('deleteTemporaryBroadcastImage error:', error);
    if (error instanceof ZodError) {
      return {
        success: false,
        error: 'VALIDATION_ERROR',
        details: error.flatten(),
      };
    }
    return { success: false, error: 'STORAGE_ERROR' };
  }
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
    const broadcastId = randomUUID();
    const promoted = await promoteBroadcastImages(
      validated.content,
      broadcastId
    );
    const content = promoted.content;
    const html = renderBroadcastEmailHtml({
      subject: validated.subject,
      content,
      senderName: validated.senderName,
    });
    const text = renderBroadcastEmailText(content, validated.senderName);

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
            text,
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
        id: broadcastId,
        subject: validated.subject,
        message: extractBroadcastPlainText(content),
        recipientCount: recipients.length,
        sentSuccessCount: successCount,
        sentFailureCount: failureCount,
        sentBy: session.username || 'unknown',
        senderName: validated.senderName,
        content,
      })
      .returning({ id: broadcasts.id });

    await Promise.all(
      promoted.temporaryPaths.map((path) =>
        deleteStorageObject('broadcast-images', path)
      )
    );

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
    const html = renderBroadcastEmailHtml({
      subject: validated.subject,
      content: validated.content,
      senderName: validated.senderName,
    });
    const text = renderBroadcastEmailText(
      validated.content,
      validated.senderName
    );

    const result = await resend.emails.send({
      from: fromAddress,
      to: validated.testEmail,
      subject: `[TESTE] ${validated.subject}`,
      html,
      text,
    });

    if (result.error) {
      console.error('sendTestBroadcastEmail send error:', result.error);
      return {
        success: false,
        error: 'INTERNAL_ERROR',
        details: { message: result.error.message },
      };
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
