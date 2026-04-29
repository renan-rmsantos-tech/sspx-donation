import { z } from 'zod';

const optionalEmail = z
  .string()
  .trim()
  .email('Email inválido')
  .optional()
  .or(z.literal('').transform(() => undefined));

export const sendBroadcastSchema = z.object({
  subject: z
    .string()
    .min(1, 'Assunto é obrigatório')
    .max(150, 'Assunto deve ter no máximo 150 caracteres'),
  message: z
    .string()
    .min(1, 'Mensagem é obrigatória')
    .max(5000, 'Mensagem deve ter no máximo 5000 caracteres'),
  bccEmail: optionalEmail,
});

export const sendTestBroadcastSchema = z.object({
  subject: z
    .string()
    .min(1, 'Assunto é obrigatório')
    .max(150, 'Assunto deve ter no máximo 150 caracteres'),
  message: z
    .string()
    .min(1, 'Mensagem é obrigatória')
    .max(5000, 'Mensagem deve ter no máximo 5000 caracteres'),
  testEmail: z
    .string()
    .trim()
    .min(1, 'Email de teste é obrigatório')
    .email('Email inválido'),
});

export type SendBroadcastInput = z.infer<typeof sendBroadcastSchema>;
export type SendTestBroadcastInput = z.infer<typeof sendTestBroadcastSchema>;
