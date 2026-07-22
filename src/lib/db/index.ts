import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// Durante o `next build` (docker build) o Postgres não está acessível e o
// DATABASE_URL não é carregado. O Next importa os módulos das páginas na fase
// "collecting page data", então este módulo não pode lançar erro na importação
// nesse contexto. Fora do build, exigimos o DATABASE_URL normalmente.
// O cliente do postgres é lazy: só conecta na primeira query (nunca em build,
// pois as páginas são `force-dynamic`).
const isBuildPhase = process.env.NEXT_PHASE === 'phase-production-build';

if (!process.env.DATABASE_URL && !isBuildPhase) {
  throw new Error('DATABASE_URL environment variable is not set');
}

const client = postgres(process.env.DATABASE_URL ?? 'postgres://build-placeholder', {
  max: 1,
  idle_timeout: 20,
  connect_timeout: 10,
});

export const db = drizzle(client, { schema });
