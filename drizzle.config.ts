import { loadEnvConfig } from '@next/env';
import { defineConfig } from 'drizzle-kit';

loadEnvConfig(process.cwd());

// Workflow de migrations:
//
// 1. Altere src/lib/db/schema.ts
// 2. Gere o SQL:  npm run db:generate
//    → cria arquivo em src/lib/db/migrations/ (fonte da verdade)
// 3. Espelhe o SQL em supabase/migrations/<timestamp>_<nome>.sql
//    (usado só pelo Postgres local do Supabase CLI em `npm run supabase:reset`)
// 4. Local: npm run db:migrate  (ou supabase:reset para recriar do zero + seed)
// 5. Produção: aplique na Droplet — ver docs/deploy.md ("Migrações em produção")
//
// DATABASE_URL_MIGRATE é um override opcional usado apenas por generate/migrate
// quando o DATABASE_URL do runtime não serve para DDL.
const url = process.env.DATABASE_URL_MIGRATE || process.env.DATABASE_URL;

if (!url) {
  throw new Error('DATABASE_URL or DATABASE_URL_MIGRATE must be set');
}

export default defineConfig({
  schema: './src/lib/db/schema.ts',
  out: './src/lib/db/migrations',
  dialect: 'postgresql',
  dbCredentials: { url },
});
