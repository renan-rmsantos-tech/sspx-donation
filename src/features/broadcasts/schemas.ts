import { z } from 'zod';

export const sendBroadcastSchema = z.object({
  subject: z
    .string()
    .min(1, 'Assunto é obrigatório')
    .max(150, 'Assunto deve ter no máximo 150 caracteres'),
  message: z
    .string()
    .min(1, 'Mensagem é obrigatória')
    .max(5000, 'Mensagem deve ter no máximo 5000 caracteres'),
});

export type SendBroadcastInput = z.infer<typeof sendBroadcastSchema>;
