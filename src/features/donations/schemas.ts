import { z } from 'zod';
import { isValidBrazilianPhone } from '@/lib/utils/format';

export const createMonetaryDonationSchema = z.object({
  productId: z.string().uuid('Invalid product ID'),
  amount: z
    .number()
    .int('Amount must be an integer')
    .positive('Amount must be positive')
    .min(100, 'Minimum donation is R$ 1.00'),
  donorName: z.string().max(200, 'Name is too long').optional().or(z.literal('')),
  donorEmail: z.string().email('E-mail inválido'),
  receiptPath: z.string().min(1, 'Receipt path is required'),
});

export type CreateMonetaryDonationInput = z.infer<
  typeof createMonetaryDonationSchema
>;

export const createPhysicalPledgeSchema = z.object({
  productId: z.string().uuid('Invalid product ID'),
  donorName: z
    .string()
    .min(1, 'Name is required')
    .max(200, 'Name is too long'),
  donorPhone: z
    .string()
    .min(1, 'Phone is required')
    .refine(
      (phone) => isValidBrazilianPhone(phone),
      'Invalid Brazilian phone number'
    ),
  donorEmail: z.string().email('E-mail inválido'),
});

export type CreatePhysicalPledgeInput = z.infer<
  typeof createPhysicalPledgeSchema
>;

export const generateUploadUrlSchema = z.object({
  bucket: z.enum(['receipts', 'pix-qr'], {
    errorMap: () => ({ message: 'Invalid bucket' }),
  }),
  fileExtension: z
    .string()
    .min(1)
    .max(10)
    .regex(/^[a-z0-9]+$/, 'Invalid file extension'),
});

export type GenerateUploadUrlInput = z.infer<typeof generateUploadUrlSchema>;

export const createFundTransferSchema = z
  .object({
    sourceProductId: z.string().uuid('Invalid source product ID'),
    targetProductId: z.string().uuid('Invalid target product ID'),
    amount: z
      .number()
      .int('Amount must be an integer')
      .positive('Amount must be positive')
      .min(100, 'Minimum transfer is R$ 1.00'),
  })
  .refine(
    (data) => data.sourceProductId !== data.targetProductId,
    {
      message: 'Source and target products must be different',
      path: ['targetProductId'],
    }
  );

export type CreateFundTransferInput = z.infer<typeof createFundTransferSchema>;

export const sendThankYouEmailSchema = z.object({
  donationId: z.string().uuid('ID da doação inválido'),
  donorEmail: z.string().email('E-mail inválido'),
  subject: z
    .string()
    .min(1, 'Assunto é obrigatório')
    .max(100, 'Assunto deve ter no máximo 100 caracteres'),
  message: z
    .string()
    .min(1, 'Mensagem é obrigatória')
    .max(300, 'Mensagem deve ter no máximo 300 caracteres'),
});

export type SendThankYouEmailInput = z.infer<typeof sendThankYouEmailSchema>;
