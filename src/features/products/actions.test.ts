import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createProduct,
  updateProduct,
  deleteProduct,
  generateProductPhotoUploadUrl,
} from './actions';
import { validateSession } from '@/lib/auth/session';
import { generateSignedUploadUrl, deleteStorageObject } from '@/lib/storage/spaces';
import { generateStoragePath } from '@/lib/utils/format';

vi.mock('@/lib/db', () => ({
  db: {
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    query: {
      products: { findFirst: vi.fn() },
    },
  },
}));

vi.mock('@/lib/auth/session', () => ({
  validateSession: vi.fn(),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

vi.mock('@/lib/storage/spaces', () => ({
  generateSignedUploadUrl: vi.fn(),
  deleteStorageObject: vi.fn(),
}));

vi.mock('@/lib/utils/format', () => ({
  generateStoragePath: vi.fn(),
}));

describe('Product Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(validateSession).mockResolvedValue(true);
  });

  describe('createProduct', () => {
    it('should reject when unauthorized', async () => {
      vi.mocked(validateSession).mockResolvedValueOnce(false);

      const result = await createProduct({
        name: 'Produto',
        description: 'Desc',
        targetAmount: 10000,
        categoryIds: [],
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('UNAUTHORIZED');
    });

    it('should reject product without targetAmount', async () => {
      const result = await createProduct({
        name: 'Produto',
        description: 'Desc',
        categoryIds: [],
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('VALIDATION_ERROR');
    });

    it('should create product with targetAmount when valid', async () => {
      const { db } = await import('@/lib/db');

      vi.mocked(db.insert).mockImplementation(
        () =>
          ({
            values: () => ({
              returning: () => Promise.resolve([{ id: 'prod-123' }]),
            }),
          }) as never
      );

      const result = await createProduct({
        name: 'Vela',
        description: 'Velas',
        targetAmount: 50000,
        categoryIds: [],
      });

      expect(result.success).toBe(true);
      expect(result.data?.id).toBe('prod-123');
    });

    it('should create product with targetAmount', async () => {
      const { db } = await import('@/lib/db');

      vi.mocked(db.insert).mockImplementation(
        () =>
          ({
            values: () => ({
              returning: () => Promise.resolve([{ id: 'prod-456' }]),
            }),
          }) as never
      );

      const result = await createProduct({
        name: 'Cadeira',
        description: 'Cadeira',
        targetAmount: 50000,
        categoryIds: [],
      });

      expect(result.success).toBe(true);
      expect(result.data?.id).toBe('prod-456');
    });

    it('should create product with imagePath', async () => {
      const { db } = await import('@/lib/db');

      vi.mocked(db.insert).mockImplementation(
        () =>
          ({
            values: (values: any) => {
              expect(values.imagePath).toBe('product-photos/2024-02-18-abc123.jpg');
              return {
                returning: () => Promise.resolve([{ id: 'prod-789' }]),
              };
            },
          }) as never
      );

      const result = await createProduct({
        name: 'Produto',
        description: 'Desc',
        targetAmount: 10000,
        imagePath: 'product-photos/2024-02-18-abc123.jpg',
      });

      expect(result.success).toBe(true);
      expect(result.data?.id).toBe('prod-789');
    });

    it('should create product without imagePath', async () => {
      const { db } = await import('@/lib/db');

      vi.mocked(db.insert).mockImplementation(
        () =>
          ({
            values: (values: any) => {
              expect(values.imagePath).toBeUndefined();
              return {
                returning: () => Promise.resolve([{ id: 'prod-789' }]),
              };
            },
          }) as never
      );

      const result = await createProduct({
        name: 'Produto',
        description: 'Desc',
        targetAmount: 10000,
      });

      expect(result.success).toBe(true);
    });

    it('should include donationMode in database insert', async () => {
      const { db } = await import('@/lib/db');

      vi.mocked(db.insert).mockImplementation(
        () =>
          ({
            values: (values: any) => {
              expect(values.donationMode).toBe('monetary');
              return {
                returning: () => Promise.resolve([{ id: 'prod-donation-1' }]),
              };
            },
          }) as never
      );

      const result = await createProduct({
        name: 'Produto Monetário',
        description: 'Desc',
        targetAmount: 10000,
        donationMode: 'monetary',
      });

      expect(result.success).toBe(true);
      expect(result.data?.id).toBe('prod-donation-1');
    });

    it('should use "both" as default donationMode when not provided', async () => {
      const { db } = await import('@/lib/db');

      vi.mocked(db.insert).mockImplementation(
        () =>
          ({
            values: (values: any) => {
              expect(values.donationMode).toBe('both');
              return {
                returning: () => Promise.resolve([{ id: 'prod-donation-2' }]),
              };
            },
          }) as never
      );

      const result = await createProduct({
        name: 'Produto Padrão',
        description: 'Desc',
        targetAmount: 10000,
      });

      expect(result.success).toBe(true);
    });

    it('should accept "physical" as donationMode', async () => {
      const { db } = await import('@/lib/db');

      vi.mocked(db.insert).mockImplementation(
        () =>
          ({
            values: (values: any) => {
              expect(values.donationMode).toBe('physical');
              return {
                returning: () => Promise.resolve([{ id: 'prod-donation-3' }]),
              };
            },
          }) as never
      );

      const result = await createProduct({
        name: 'Produto Físico',
        description: 'Desc',
        targetAmount: 10000,
        donationMode: 'physical',
      });

      expect(result.success).toBe(true);
    });

    it('should accept "both" as donationMode', async () => {
      const { db } = await import('@/lib/db');

      vi.mocked(db.insert).mockImplementation(
        () =>
          ({
            values: (values: any) => {
              expect(values.donationMode).toBe('both');
              return {
                returning: () => Promise.resolve([{ id: 'prod-donation-4' }]),
              };
            },
          }) as never
      );

      const result = await createProduct({
        name: 'Produto Ambos',
        description: 'Desc',
        targetAmount: 10000,
        donationMode: 'both',
      });

      expect(result.success).toBe(true);
    });
  });

  describe('updateProduct', () => {
    it('should reject when unauthorized', async () => {
      vi.mocked(validateSession).mockResolvedValueOnce(false);

      const result = await updateProduct('prod-123', { name: 'Novo' });

      expect(result.success).toBe(false);
      expect(result.error).toBe('UNAUTHORIZED');
    });

    it('should update product when valid', async () => {
      const { db } = await import('@/lib/db');

      vi.mocked(db.update).mockReturnValue({
        set: () => ({
          where: () => Promise.resolve(undefined),
        }),
      } as never);

      vi.mocked(db.delete).mockReturnValue({
        where: () => Promise.resolve(undefined),
      } as never);

      vi.mocked(db.insert).mockReturnValue({
        values: () => Promise.resolve(undefined),
      } as never);

      const result = await updateProduct('prod-123', {
        name: 'Atualizado',
        description: 'Nova desc',
      });

      expect(result.success).toBe(true);
      expect(result.data?.id).toBe('prod-123');
    });

    it('should update product imagePath when provided', async () => {
      const { db } = await import('@/lib/db');

      vi.mocked(db.update).mockReturnValue({
        set: (updates: any) => {
          expect(updates.imagePath).toBe('product-photos/2024-02-18-abc123.jpg');
          return {
            where: () => Promise.resolve(undefined),
          };
        },
      } as never);

      vi.mocked(db.delete).mockReturnValue({
        where: () => Promise.resolve(undefined),
      } as never);

      vi.mocked(db.insert).mockReturnValue({
        values: () => Promise.resolve(undefined),
      } as never);

      const result = await updateProduct('prod-123', {
        imagePath: 'product-photos/2024-02-18-abc123.jpg',
      });

      expect(result.success).toBe(true);
    });

    it('should clear product imagePath when set to null', async () => {
      const { db } = await import('@/lib/db');

      vi.mocked(db.update).mockReturnValue({
        set: (updates: any) => {
          expect(updates.imagePath).toBeNull();
          return {
            where: () => Promise.resolve(undefined),
          };
        },
      } as never);

      vi.mocked(db.delete).mockReturnValue({
        where: () => Promise.resolve(undefined),
      } as never);

      vi.mocked(db.insert).mockReturnValue({
        values: () => Promise.resolve(undefined),
      } as never);

      const result = await updateProduct('prod-123', {
        imagePath: null,
      });

      expect(result.success).toBe(true);
    });

    it('should not update imagePath when undefined', async () => {
      const { db } = await import('@/lib/db');

      let setWasCalled = false;
      vi.mocked(db.update).mockReturnValue({
        set: (updates: any) => {
          setWasCalled = true;
          expect(updates.imagePath).toBeUndefined();
          return {
            where: () => Promise.resolve(undefined),
          };
        },
      } as never);

      vi.mocked(db.delete).mockReturnValue({
        where: () => Promise.resolve(undefined),
      } as never);

      vi.mocked(db.insert).mockReturnValue({
        values: () => Promise.resolve(undefined),
      } as never);

      const result = await updateProduct('prod-123', {
        name: 'Updated Name',
      });

      expect(result.success).toBe(true);
      expect(setWasCalled).toBe(true);
    });

    it('should include donationMode in update', async () => {
      const { db } = await import('@/lib/db');

      vi.mocked(db.update).mockReturnValue({
        set: (updates: any) => {
          expect(updates.donationMode).toBe('physical');
          return {
            where: () => Promise.resolve(undefined),
          };
        },
      } as never);

      vi.mocked(db.delete).mockReturnValue({
        where: () => Promise.resolve(undefined),
      } as never);

      vi.mocked(db.insert).mockReturnValue({
        values: () => Promise.resolve(undefined),
      } as never);

      const result = await updateProduct('prod-123', {
        donationMode: 'physical',
      });

      expect(result.success).toBe(true);
    });

    it('should call deleteStorageObject when imagePath is set to null and product has existing photo', async () => {
      const { db } = await import('@/lib/db');

      vi.mocked(db.query.products.findFirst).mockResolvedValueOnce({
        imagePath: 'product-photos/old-photo.jpg',
      } as never);

      vi.mocked(db.update).mockReturnValue({
        set: () => ({
          where: () => Promise.resolve(undefined),
        }),
      } as never);

      vi.mocked(db.delete).mockReturnValue({
        where: () => Promise.resolve(undefined),
      } as never);

      vi.mocked(db.insert).mockReturnValue({
        values: () => Promise.resolve(undefined),
      } as never);

      await updateProduct('prod-123', {
        imagePath: null,
      });

      expect(vi.mocked(deleteStorageObject)).toHaveBeenCalledWith(
        'product-photos',
        'product-photos/old-photo.jpg'
      );
    });

    it('should not call deleteStorageObject when imagePath is null but product has no existing photo', async () => {
      const { db } = await import('@/lib/db');

      vi.mocked(db.query.products.findFirst).mockResolvedValueOnce({
        imagePath: null,
      } as never);

      vi.mocked(db.update).mockReturnValue({
        set: () => ({
          where: () => Promise.resolve(undefined),
        }),
      } as never);

      vi.mocked(db.delete).mockReturnValue({
        where: () => Promise.resolve(undefined),
      } as never);

      vi.mocked(db.insert).mockReturnValue({
        values: () => Promise.resolve(undefined),
      } as never);

      await updateProduct('prod-123', {
        imagePath: null,
      });

      expect(vi.mocked(deleteStorageObject)).not.toHaveBeenCalled();
    });

    it('should continue successfully even if deleteStorageObject throws error', async () => {
      const { db } = await import('@/lib/db');

      vi.mocked(db.query.products.findFirst).mockResolvedValueOnce({
        imagePath: 'product-photos/old-photo.jpg',
      } as never);

      vi.mocked(deleteStorageObject).mockRejectedValueOnce(
        new Error('Storage deletion failed')
      );

      vi.mocked(db.update).mockReturnValue({
        set: () => ({
          where: () => Promise.resolve(undefined),
        }),
      } as never);

      vi.mocked(db.delete).mockReturnValue({
        where: () => Promise.resolve(undefined),
      } as never);

      vi.mocked(db.insert).mockReturnValue({
        values: () => Promise.resolve(undefined),
      } as never);

      const result = await updateProduct('prod-123', {
        imagePath: null,
      });

      expect(result.success).toBe(true);
    });

    it('should not call deleteStorageObject when imagePath is not set to null', async () => {
      const { db } = await import('@/lib/db');

      vi.mocked(db.update).mockReturnValue({
        set: () => ({
          where: () => Promise.resolve(undefined),
        }),
      } as never);

      vi.mocked(db.delete).mockReturnValue({
        where: () => Promise.resolve(undefined),
      } as never);

      vi.mocked(db.insert).mockReturnValue({
        values: () => Promise.resolve(undefined),
      } as never);

      await updateProduct('prod-123', {
        imagePath: 'product-photos/new-photo.jpg',
      });

      expect(vi.mocked(deleteStorageObject)).not.toHaveBeenCalled();
    });

    it('should allow simultaneous donationMode and imagePath updates', async () => {
      const { db } = await import('@/lib/db');

      vi.mocked(db.update).mockReturnValue({
        set: (updates: any) => {
          expect(updates.donationMode).toBe('monetary');
          expect(updates.imagePath).toBe('product-photos/new-photo.jpg');
          return {
            where: () => Promise.resolve(undefined),
          };
        },
      } as never);

      vi.mocked(db.delete).mockReturnValue({
        where: () => Promise.resolve(undefined),
      } as never);

      vi.mocked(db.insert).mockReturnValue({
        values: () => Promise.resolve(undefined),
      } as never);

      const result = await updateProduct('prod-123', {
        imagePath: 'product-photos/new-photo.jpg',
        donationMode: 'monetary',
      });

      expect(result.success).toBe(true);
    });
  });

  describe('deleteProduct', () => {
    it('should reject when unauthorized', async () => {
      vi.mocked(validateSession).mockResolvedValueOnce(false);

      const result = await deleteProduct('prod-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('UNAUTHORIZED');
    });

    it('should delete product when authorized', async () => {
      const { db } = await import('@/lib/db');

      vi.mocked(db.delete).mockReturnValue({
        where: () => Promise.resolve(undefined),
      } as never);

      const result = await deleteProduct('prod-123');

      expect(result.success).toBe(true);
    });
  });

  describe('generateProductPhotoUploadUrl', () => {
    beforeEach(() => {
      vi.clearAllMocks();
      vi.mocked(validateSession).mockResolvedValue(true);
      vi.mocked(generateStoragePath).mockReturnValue('product-photos/2024-02-18-abc123.jpg');
      vi.mocked(generateSignedUploadUrl).mockResolvedValue({
        signedUrl: 'https://example.com/signed-url',
        path: 'product-photos/2024-02-18-abc123.jpg',
      });
    });

    it('should reject when unauthorized', async () => {
      vi.mocked(validateSession).mockResolvedValueOnce(false);

      const result = await generateProductPhotoUploadUrl({
        fileExtension: 'jpg',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('UNAUTHORIZED');
    });

    it('should return signed URL for valid admin and jpg extension', async () => {
      const result = await generateProductPhotoUploadUrl({
        fileExtension: 'jpg',
      });

      expect(result.success).toBe(true);
      expect(result.data?.signedUrl).toBe('https://example.com/signed-url');
      expect(result.data?.path).toBe('product-photos/2024-02-18-abc123.jpg');
    });

    it('should return signed URL for valid admin and jpeg extension', async () => {
      const result = await generateProductPhotoUploadUrl({
        fileExtension: 'jpeg',
      });

      expect(result.success).toBe(true);
      expect(result.data?.signedUrl).toBe('https://example.com/signed-url');
    });

    it('should return signed URL for valid admin and png extension', async () => {
      const result = await generateProductPhotoUploadUrl({
        fileExtension: 'png',
      });

      expect(result.success).toBe(true);
      expect(result.data?.signedUrl).toBe('https://example.com/signed-url');
    });

    it('should reject invalid file extension', async () => {
      const result = await generateProductPhotoUploadUrl({
        fileExtension: 'gif',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('VALIDATION_ERROR');
    });

    it('should call generateStoragePath with correct parameters', async () => {
      await generateProductPhotoUploadUrl({
        fileExtension: 'jpg',
      });

      expect(vi.mocked(generateStoragePath)).toHaveBeenCalledWith('product-photos', 'jpg');
    });

    it('should call generateSignedUploadUrl with correct parameters', async () => {
      await generateProductPhotoUploadUrl({
        fileExtension: 'jpg',
      });

      expect(vi.mocked(generateSignedUploadUrl)).toHaveBeenCalledWith(
        'product-photos',
        'product-photos/2024-02-18-abc123.jpg'
      );
    });

    it('should handle storage errors gracefully', async () => {
      vi.mocked(generateSignedUploadUrl).mockRejectedValueOnce(
        new Error('Storage error')
      );

      const result = await generateProductPhotoUploadUrl({
        fileExtension: 'jpg',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('STORAGE_ERROR');
    });

    it('should return VALIDATION_ERROR for missing fileExtension', async () => {
      const result = await generateProductPhotoUploadUrl({});

      expect(result.success).toBe(false);
      expect(result.error).toBe('VALIDATION_ERROR');
    });
  });
});
