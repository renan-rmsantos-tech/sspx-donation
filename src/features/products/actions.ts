'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { products, productCategories } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { ZodError } from 'zod';
import { createProductSchema, updateProductSchema, generateProductPhotoUploadUrlSchema } from './schemas';
import { validateSession } from '@/lib/auth/session';
import { generateSignedUploadUrl, deleteStorageObject } from '@/lib/storage/supabase';
import { generateStoragePath } from '@/lib/utils/format';

interface ActionResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  details?: unknown;
}

export async function generateProductPhotoUploadUrl(
  input: unknown
): Promise<ActionResult<{ signedUrl: string; path: string }>> {
  try {
    const isAdmin = await validateSession();
    if (!isAdmin) {
      return {
        success: false,
        error: 'UNAUTHORIZED',
      };
    }

    const validated = generateProductPhotoUploadUrlSchema.parse(input);

    const path = generateStoragePath('product-photos', validated.fileExtension);
    const { signedUrl } = await generateSignedUploadUrl('product-photos', path);

    return {
      success: true,
      data: { signedUrl, path },
    };
  } catch (error) {
    console.error('generateProductPhotoUploadUrl error:', error);

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
      details: { message: 'Failed to generate signed upload URL' },
    };
  }
}

export async function createProduct(
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  try {
    const isAdmin = await validateSession();
    if (!isAdmin) {
      return {
        success: false,
        error: 'UNAUTHORIZED',
      };
    }

    const validated = createProductSchema.parse(input);

    const result = await db
      .insert(products)
      .values({
        name: validated.name,
        description: validated.description,
        targetAmount: validated.targetAmount,
        currentAmount: 0,
        isPublished: validated.isPublished ?? true,
        imagePath: validated.imagePath ?? undefined,
        donationMode: validated.donationMode ?? 'both',
        productType: validated.productType ?? 'regular',
      })
      .returning({ id: products.id });

    // Add categories
    if (validated.categoryIds && validated.categoryIds.length > 0) {
      await db.insert(productCategories).values(
        validated.categoryIds.map((categoryId) => ({
          productId: result[0].id,
          categoryId,
        }))
      );
    }

    revalidatePath('/');
    revalidatePath('/admin');
    revalidatePath('/admin/products');
    revalidatePath('/admin/dashboard');

    return {
      success: true,
      data: { id: result[0].id },
    };
  } catch (error) {
    console.error('createProduct error:', error);

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

export async function updateProduct(
  id: string,
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  try {
    const isAdmin = await validateSession();
    if (!isAdmin) {
      return {
        success: false,
        error: 'UNAUTHORIZED',
      };
    }

    const validated = updateProductSchema.parse(input);

    const updates: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (validated.name !== undefined) updates.name = validated.name;
    if (validated.description !== undefined) updates.description = validated.description;
    if (validated.targetAmount !== undefined) updates.targetAmount = validated.targetAmount;
    if (validated.isPublished !== undefined) updates.isPublished = validated.isPublished;
    if (validated.imagePath !== undefined) {
      updates.imagePath = validated.imagePath;

      // Handle photo deletion when imagePath is explicitly set to null
      if (validated.imagePath === null) {
        const existingProduct = await db.query.products.findFirst({
          where: eq(products.id, id),
        });

        if (existingProduct?.imagePath) {
          try {
            await deleteStorageObject('product-photos', existingProduct.imagePath);
          } catch (error) {
            // Log storage deletion errors but don't block database update
            console.error('Error deleting product photo from storage:', error);
          }
        }
      }
    }
    if (validated.donationMode !== undefined) updates.donationMode = validated.donationMode;
    if (validated.productType !== undefined) updates.productType = validated.productType;

    await db.update(products).set(updates).where(eq(products.id, id));

    // Update categories if provided
    if (validated.categoryIds) {
      await db
        .delete(productCategories)
        .where(eq(productCategories.productId, id));

      if (validated.categoryIds.length > 0) {
        await db.insert(productCategories).values(
          validated.categoryIds.map((categoryId) => ({
            productId: id,
            categoryId,
          }))
        );
      }
    }

    revalidatePath('/');
    revalidatePath('/admin');
    revalidatePath('/admin/products');
    revalidatePath('/admin/dashboard');

    return {
      success: true,
      data: { id },
    };
  } catch (error) {
    console.error('updateProduct error:', error);

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

export async function deleteProduct(id: string): Promise<ActionResult<null>> {
  try {
    const isAdmin = await validateSession();
    if (!isAdmin) {
      return {
        success: false,
        error: 'UNAUTHORIZED',
      };
    }

    await db.delete(products).where(eq(products.id, id));

    revalidatePath('/');
    revalidatePath('/admin');
    revalidatePath('/admin/products');
    revalidatePath('/admin/dashboard');

    return {
      success: true,
    };
  } catch (error) {
    console.error('deleteProduct error:', error);
    return {
      success: false,
      error: 'INTERNAL_ERROR',
    };
  }
}
