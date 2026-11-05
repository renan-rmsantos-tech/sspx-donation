import { defineProtoConfig } from '@compozy/proto/config';

/** Galeria de protótipos: `npm run proto dev` (veja docs/design/prototyping.md). */
export default defineProtoConfig({
  title: 'Doações Colégio São José',
  locale: 'pt-BR',
  prototypes: ['src/**/*.proto.tsx'],
  drafts: 'src/drafts',
  // Seções da galeria.
  specs: {
    publico: 'Site público',
    painel: 'Painel administrativo',
  },
  dev: { port: 4480 },
  guards: {
    // Protótipos e drafts renderizam views com fixtures: nunca alcançam banco,
    // sessão, storage, envio de e-mail, server actions nem as APIs de servidor
    // do Next. `import type` é apagado antes do guard e continua liberado.
    forbidRuntimeImports: [
      'src/lib/db',
      'src/lib/auth',
      'src/lib/storage',
      // Server actions (`'use server'`) e consultas ao banco.
      'src/features/**/actions.ts',
      'src/features/**/queries.ts',
      // Envio de e-mails (Resend).
      'src/features/donations/notifications.ts',
      'src/features/broadcasts/delivery.ts',
      'src/middleware.ts',
      'next/headers',
      'next/server',
      'next/cache',
      'server-only',
      'postgres',
      'drizzle-orm',
      'iron-session',
      'resend',
      '@aws-sdk/client-s3',
      '@aws-sdk/s3-request-presigner',
    ],
  },
});
