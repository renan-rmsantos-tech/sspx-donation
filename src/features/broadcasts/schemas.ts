import { z } from 'zod';
import {
  BROADCAST_SIGNATURE_MAX_LENGTH,
  DEFAULT_BROADCAST_SIGNATURE,
  broadcastContentSchema,
  broadcastDraftContentSchema,
} from './content';

const optionalEmail = z
  .string()
  .trim()
  .email('Email inválido')
  .optional()
  .or(z.literal('').transform(() => undefined));

const senderNameSchema = z
  .string()
  .trim()
  .min(1, 'Identificação do remetente é obrigatória')
  .max(150, 'Remetente deve ter no máximo 150 caracteres');

const signatureTextSchema = z
  .string()
  .max(
    BROADCAST_SIGNATURE_MAX_LENGTH,
    `O texto da assinatura deve ter no máximo ${BROADCAST_SIGNATURE_MAX_LENGTH} caracteres`
  )
  .default(DEFAULT_BROADCAST_SIGNATURE);

export const sendBroadcastSchema = z.object({
  subject: z
    .string()
    .trim()
    .min(1, 'Assunto é obrigatório')
    .max(150, 'Assunto deve ter no máximo 150 caracteres'),
  content: broadcastContentSchema,
  senderName: senderNameSchema,
  signatureText: signatureTextSchema,
  bccEmail: optionalEmail,
});

export const sendTestBroadcastSchema = z.object({
  subject: z
    .string()
    .trim()
    .min(1, 'Assunto é obrigatório')
    .max(150, 'Assunto deve ter no máximo 150 caracteres'),
  content: broadcastContentSchema,
  senderName: senderNameSchema,
  signatureText: signatureTextSchema,
  testEmail: z
    .string()
    .trim()
    .min(1, 'Email de teste é obrigatório')
    .email('Email inválido'),
});

export const saveBroadcastDraftSchema = z.object({
  composerId: z.string().uuid(),
  subject: z.string().max(150, 'Assunto deve ter no máximo 150 caracteres'),
  senderName: z
    .string()
    .max(150, 'Remetente deve ter no máximo 150 caracteres'),
  signatureText: signatureTextSchema,
  bccEmail: z.string().max(320, 'Email deve ter no máximo 320 caracteres'),
  testEmail: z.string().max(320, 'Email deve ter no máximo 320 caracteres'),
  content: broadcastDraftContentSchema,
});

export const uploadBroadcastImageSchema = z.object({
  composerId: z.string().uuid(),
});

export const deleteTemporaryBroadcastImageSchema = z.object({
  path: z
    .string()
    .regex(
      /^temporary\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.jpg$/i,
      'O caminho temporário da imagem é inválido.'
    ),
});

export type SendBroadcastInput = z.infer<typeof sendBroadcastSchema>;
export type SendTestBroadcastInput = z.infer<typeof sendTestBroadcastSchema>;
export type SaveBroadcastDraftInput = z.infer<
  typeof saveBroadcastDraftSchema
>;
