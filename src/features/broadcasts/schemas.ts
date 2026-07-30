import { z } from 'zod';
import { broadcastContentSchema } from './content';

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

export const sendBroadcastSchema = z.object({
  subject: z
    .string()
    .trim()
    .min(1, 'Assunto é obrigatório')
    .max(150, 'Assunto deve ter no máximo 150 caracteres'),
  content: broadcastContentSchema,
  senderName: senderNameSchema,
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
  testEmail: z
    .string()
    .trim()
    .min(1, 'Email de teste é obrigatório')
    .email('Email inválido'),
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
