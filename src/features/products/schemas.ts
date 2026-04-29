import { z } from 'zod';

export const createProductSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(200, 'Name is too long'),
  description: z
    .string()
    .min(1, 'Description is required')
    .max(1000, 'Description is too long'),
  targetAmount: z
    .number()
    .int()
    .positive('Target amount must be positive'),
  isPublished: z.boolean().optional().default(true),
  categoryIds: z.array(z.string().uuid()).optional().default([]),
  imagePath: z.string().max(500).nullable().optional(),
  donationMode: z.enum(['monetary', 'physical', 'both']).optional().default('both'),
  productType: z.enum(['regular', 'scholarship']).optional().default('regular'),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;

export const updateProductSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().min(1).max(1000).optional(),
  targetAmount: z.number().int().positive().nullish(),
  isPublished: z.boolean().optional(),
  categoryIds: z.array(z.string().uuid()).optional(),
  imagePath: z.string().max(500).nullable().optional(),
  donationMode: z.enum(['monetary', 'physical', 'both']).optional(),
  productType: z.enum(['regular', 'scholarship']).optional(),
});

export type UpdateProductInput = z.infer<typeof updateProductSchema>;

export const generateProductPhotoUploadUrlSchema = z.object({
  fileExtension: z
    .string()
    .min(1)
    .max(10)
    .regex(/^(jpg|jpeg|png)$/, 'Only JPEG and PNG files are accepted'),
});

export type GenerateProductPhotoUploadUrlInput = z.infer<typeof generateProductPhotoUploadUrlSchema>;
