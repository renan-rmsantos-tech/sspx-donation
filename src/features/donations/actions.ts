'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import {
  donations,
  products,
  fundTransfers,
} from '@/lib/db/schema';
import { eq, and, gte, inArray, sql } from 'drizzle-orm';
import { ZodError } from 'zod';
import {
  createMonetaryDonationSchema,
  createPhysicalPledgeSchema,
  generateUploadUrlSchema,
  createFundTransferSchema,
  sendThankYouEmailSchema,
} from './schemas';
import { Resend } from 'resend';
import {
  generateSignedUploadUrl,
  uploadFileDirect,
} from '@/lib/storage/supabase';
import { generateStoragePath } from '@/lib/utils/format';
import { validateSession, getSession } from '@/lib/auth/session';
import { sendDonationConfirmation } from './notifications';

interface ActionResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  details?: unknown;
}

/**
 * Create a monetary donation and update product progress atomically
 */
export async function createMonetaryDonation(
  input: unknown
): Promise<
  ActionResult<{ donationId: string; notificationSent: boolean }>
> {
  try {
    const validated = createMonetaryDonationSchema.parse(input);

    // Check if product exists
    const product = await db.query.products.findFirst({
      where: eq(products.id, validated.productId),
    });

    if (!product) {
      return {
        success: false,
        error: 'PRODUCT_NOT_FOUND',
      };
    }

    // Reject if already fully funded
    if (
      product.targetAmount != null &&
      product.currentAmount >= product.targetAmount
    ) {
      return {
        success: false,
        error: 'ALREADY_FUNDED',
      };
    }

    // Create donation
    const donationResult = await db
      .insert(donations)
      .values({
        productId: validated.productId,
        donationType: 'monetary',
        amount: validated.amount,
        donorName: validated.donorName || null,
        donorEmail: validated.donorEmail,
        receiptPath: validated.receiptPath,
      })
      .returning({ id: donations.id, createdAt: donations.createdAt });

    // Update product current amount and mark as fulfilled if target is reached
    const newAmount = product.currentAmount + validated.amount;
    const nowFulfilled =
      product.targetAmount != null && newAmount >= product.targetAmount;

    await db
      .update(products)
      .set({
        currentAmount: newAmount,
        isFulfilled: nowFulfilled ? true : product.isFulfilled,
        updatedAt: new Date(),
      })
      .where(eq(products.id, validated.productId));

    revalidatePath('/');
    revalidatePath('/admin');
    revalidatePath('/admin/dashboard');

    const notificationResult = await sendDonationConfirmation({
      donorName: validated.donorName?.trim() || 'Doador(a)',
      donorEmail: validated.donorEmail,
      productName: product.name,
      donationType: 'monetary',
      donationDate: donationResult[0].createdAt.toISOString(),
      amount: validated.amount,
    });

    if (!notificationResult.success) {
      return {
        success: true,
        data: {
          donationId: donationResult[0].id,
          notificationSent: false,
        },
        details: {
          notification: notificationResult,
        },
      };
    }

    return {
      success: true,
      data: {
        donationId: donationResult[0].id,
        notificationSent: true,
      },
    };
  } catch (error) {
    console.error('createMonetaryDonation error:', error);

    if (error instanceof ZodError) {
      return {
        success: false,
        error: 'VALIDATION_ERROR',
        details: error.flatten(),
      };
    }

    return {
      success: false,
      error: 'INTERNAL_ERROR',
    };
  }
}

/**
 * Create a physical pledge and mark product as fulfilled
 */
export async function createPhysicalPledge(
  input: unknown
): Promise<
  ActionResult<{ donationId: string; notificationSent: boolean }>
> {
  try {
    const validated = createPhysicalPledgeSchema.parse(input);

    // Check if product exists
    const product = await db.query.products.findFirst({
      where: eq(products.id, validated.productId),
    });

    if (!product) {
      return {
        success: false,
        error: 'PRODUCT_NOT_FOUND',
      };
    }

    if (product.isFulfilled) {
      return {
        success: false,
        error: 'ALREADY_FULFILLED',
      };
    }

    // Create donation
    const pledgeResult = await db
      .insert(donations)
      .values({
        productId: validated.productId,
        donationType: 'physical',
        donorName: validated.donorName,
        donorPhone: validated.donorPhone,
        donorEmail: validated.donorEmail,
      })
      .returning({ id: donations.id, createdAt: donations.createdAt });

    // Update product fulfilled status
    await db
      .update(products)
      .set({
        isFulfilled: true,
        updatedAt: new Date(),
      })
      .where(eq(products.id, validated.productId));

    revalidatePath('/');
    revalidatePath('/admin');
    revalidatePath('/admin/dashboard');

    const notificationResult = await sendDonationConfirmation({
      donorName: validated.donorName,
      donorEmail: validated.donorEmail,
      productName: product.name,
      donationType: 'physical',
      donationDate: pledgeResult[0].createdAt.toISOString(),
    });

    if (!notificationResult.success) {
      return {
        success: true,
        data: {
          donationId: pledgeResult[0].id,
          notificationSent: false,
        },
        details: {
          notification: notificationResult,
        },
      };
    }

    return {
      success: true,
      data: {
        donationId: pledgeResult[0].id,
        notificationSent: true,
      },
    };
  } catch (error) {
    console.error('createPhysicalPledge error:', error);

    if (error instanceof ZodError) {
      return {
        success: false,
        error: 'VALIDATION_ERROR',
        details: error.flatten(),
      };
    }

    return {
      success: false,
      error: 'INTERNAL_ERROR',
    };
  }
}

/**
 * Generate a signed URL for file upload to Supabase Storage
 */
export async function generateUploadUrl(
  input: unknown
): Promise<
  ActionResult<{ signedUrl: string; path: string }>
> {
  try {
    const validated = generateUploadUrlSchema.parse(input);
    const path = generateStoragePath(
      validated.bucket,
      validated.fileExtension
    );

    const { signedUrl, path: storagePath } = await generateSignedUploadUrl(
      validated.bucket,
      path
    );

    return {
      success: true,
      data: {
        signedUrl,
        path: storagePath,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('generateUploadUrl error:', message, error);

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
      details: { message },
    };
  }
}

/**
 * Upload file directly (server-side). Bypasses RLS via service_role.
 * Use for receipts (public) or pix-qr (admin only).
 */
export async function uploadFile(
  formData: FormData
): Promise<ActionResult<{ path: string }>> {
  try {
    const bucket = formData.get('bucket') as string | null;
    const file = formData.get('file') as File | null;

    if (!bucket || !file) {
      return {
        success: false,
        error: 'VALIDATION_ERROR',
        details: { message: 'Bucket and file are required' },
      };
    }

    if (bucket !== 'receipts' && bucket !== 'pix-qr') {
      return {
        success: false,
        error: 'VALIDATION_ERROR',
        details: { message: 'Invalid bucket' },
      };
    }

    if (bucket === 'pix-qr') {
      const isAdmin = await validateSession();
      if (!isAdmin) {
        return { success: false, error: 'UNAUTHORIZED' };
      }
    }

    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const allowedExt = ['jpg', 'jpeg', 'png', 'webp', 'pdf'];
    if (!allowedExt.includes(ext)) {
      return {
        success: false,
        error: 'VALIDATION_ERROR',
        details: { message: 'Invalid file type' },
      };
    }

    const path = generateStoragePath(bucket, ext);
    const fileBuffer = await file.arrayBuffer();

    await uploadFileDirect(bucket, path, Buffer.from(fileBuffer), {
      contentType: file.type || 'application/octet-stream',
      upsert: true,
    });

    return {
      success: true,
      data: { path },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('uploadFile error:', message, error);

    return {
      success: false,
      error: 'STORAGE_ERROR',
      details: { message },
    };
  }
}

/**
 * Toggle the verification status of a donation (admin only)
 */
export async function toggleDonationVerified(
  donationId: string
): Promise<ActionResult<{ isVerified: boolean }>> {
  try {
    const isAdmin = await validateSession();
    if (!isAdmin) {
      return { success: false, error: 'UNAUTHORIZED' };
    }

    const donation = await db.query.donations.findFirst({
      where: eq(donations.id, donationId),
      columns: { id: true, isVerified: true },
    });

    if (!donation) {
      return { success: false, error: 'NOT_FOUND' };
    }

    const newValue = !donation.isVerified;

    await db
      .update(donations)
      .set({ isVerified: newValue })
      .where(eq(donations.id, donationId));

    revalidatePath('/admin/financeiro');

    return {
      success: true,
      data: { isVerified: newValue },
    };
  } catch (error) {
    console.error('toggleDonationVerified error:', error);
    return { success: false, error: 'INTERNAL_ERROR' };
  }
}

/**
 * Create a fund transfer between products with transaction atomicity and row-level locking
 */
export async function createFundTransfer(
  input: unknown
): Promise<ActionResult<{ transferId: string }>> {
  try {
    // Check admin authorization
    const session = await getSession();
    if (!session.isAdmin) {
      return {
        success: false,
        error: 'UNAUTHORIZED',
      };
    }

    const validated = createFundTransferSchema.parse(input);

    // Use transaction to ensure atomicity
    const result = await db.transaction(async (tx) => {
      // Validate both products exist before attempting balance mutation.
      const transferProducts = await tx.query.products.findMany({
        columns: {
          id: true,
          currentAmount: true,
          targetAmount: true,
        },
        where: inArray(products.id, [
          validated.sourceProductId,
          validated.targetProductId,
        ]),
      });

      if (transferProducts.length !== 2) {
        throw new Error('PRODUCT_NOT_FOUND');
      }

      const sourceProduct = transferProducts.find(
        (p) => p.id === validated.sourceProductId
      );

      if (!sourceProduct) {
        throw new Error('PRODUCT_NOT_FOUND');
      }

      // Only the surplus (currentAmount - targetAmount) is available for transfer.
      const surplusCents =
        sourceProduct.targetAmount !== null
          ? sourceProduct.currentAmount - sourceProduct.targetAmount
          : sourceProduct.currentAmount;

      // Fast-fail before write for clearer domain error.
      if (surplusCents < validated.amount) {
        throw new Error('INSUFFICIENT_BALANCE');
      }

      // Guarded decrement: ensures the result stays >= targetAmount (never transfers below the goal).
      const sourceUpdate = await tx
        .update(products)
        .set({
          currentAmount: sql`${products.currentAmount} - ${validated.amount}`,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(products.id, validated.sourceProductId),
            gte(
              products.currentAmount,
              sql`${validated.amount} + COALESCE(${products.targetAmount}, 0)`
            )
          )
        )
        .returning({ id: products.id });

      if (sourceUpdate.length === 0) {
        throw new Error('INSUFFICIENT_BALANCE');
      }

      // Update target product and mark as fulfilled if target is reached
      const targetProduct = transferProducts.find(
        (p) => p.id === validated.targetProductId
      );
      const targetNewAmount =
        (targetProduct?.currentAmount ?? 0) + validated.amount;
      const targetNowFulfilled =
        targetProduct?.targetAmount != null &&
        targetNewAmount >= targetProduct.targetAmount;

      const targetUpdate = await tx
        .update(products)
        .set({
          currentAmount: sql`${products.currentAmount} + ${validated.amount}`,
          isFulfilled: targetNowFulfilled ? true : undefined,
          updatedAt: new Date(),
        })
        .where(eq(products.id, validated.targetProductId))
        .returning({ id: products.id });

      if (targetUpdate.length === 0) {
        throw new Error('PRODUCT_NOT_FOUND');
      }

      // Insert audit record
      const transferResult = await tx
        .insert(fundTransfers)
        .values({
          sourceProductId: validated.sourceProductId,
          targetProductId: validated.targetProductId,
          amount: validated.amount,
          adminUsername: session.username || 'unknown',
        })
        .returning({ id: fundTransfers.id });

      return transferResult[0].id;
    });

    revalidatePath('/');
    revalidatePath('/admin');
    revalidatePath('/admin/dashboard');
    revalidatePath('/admin/transfers');

    return {
      success: true,
      data: { transferId: result },
    };
  } catch (error) {
    console.error('createFundTransfer error:', error);

    if (error instanceof ZodError) {
      return {
        success: false,
        error: 'VALIDATION_ERROR',
        details: error.flatten(),
      };
    }

    const errorMessage = error instanceof Error ? error.message : String(error);

    if (errorMessage === 'INSUFFICIENT_BALANCE') {
      return {
        success: false,
        error: 'INSUFFICIENT_BALANCE',
      };
    }

    if (errorMessage === 'PRODUCT_NOT_FOUND') {
      return {
        success: false,
        error: 'PRODUCT_NOT_FOUND',
      };
    }

    if (errorMessage === 'INVALID_TRANSFER_PRODUCTS') {
      return {
        success: false,
        error: 'VALIDATION_ERROR',
        details: {
          fieldErrors: {
            sourceProductId: [
              'Transferências só podem envolver produtos monetários.',
            ],
            targetProductId: [
              'Transferências só podem envolver produtos monetários.',
            ],
          },
        },
      };
    }

    return {
      success: false,
      error: 'INTERNAL_ERROR',
    };
  }
}

/**
 * Send a thank-you email to a donor (admin only)
 */
export async function sendThankYouEmail(
  input: unknown
): Promise<ActionResult<{ emailId: string }>> {
  try {
    const isAdmin = await validateSession();
    if (!isAdmin) {
      return { success: false, error: 'UNAUTHORIZED' };
    }

    const validated = sendThankYouEmailSchema.parse(input);

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.error('sendThankYouEmail: RESEND_API_KEY is not configured');
      return {
        success: false,
        error: 'INTERNAL_ERROR',
        details: { message: 'Serviço de email não configurado.' },
      };
    }

    const resend = new Resend(apiKey);

    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
      to: validated.donorEmail,
      subject: validated.subject,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
          <h2 style="color: #1E3D59; margin-bottom: 16px;">${validated.subject}</h2>
          <p style="color: #333; font-size: 16px; line-height: 1.6; white-space: pre-wrap;">${validated.message}</p>
          <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 24px 0;" />
          <p style="color: #9B7B5A; font-size: 14px;">Colégio São José — Campanha de Doações</p>
        </div>
      `,
    });

    if (error) {
      console.error('sendThankYouEmail Resend error:', error);
      return {
        success: false,
        error: 'INTERNAL_ERROR',
        details: { message: error.message },
      };
    }

    return {
      success: true,
      data: { emailId: data!.id },
    };
  } catch (error) {
    console.error('sendThankYouEmail error:', error);

    if (error instanceof ZodError) {
      return {
        success: false,
        error: 'VALIDATION_ERROR',
        details: error.flatten(),
      };
    }

    return {
      success: false,
      error: 'INTERNAL_ERROR',
    };
  }
}
