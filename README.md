# Plataforma de Doações — Colégio São José

Plataforma transparente de doações para igrejas, construída com Next.js 15, Drizzle ORM e PostgreSQL.

**Produção**: [ajude-o-colegio-sao-jose.com](https://ajude-o-colegio-sao-jose.com), hospedada em uma Droplet da DigitalOcean (Docker Compose + Traefik), com arquivos no DigitalOcean Spaces e emails via Resend. Detalhes em [`docs/deploy.md`](docs/deploy.md).

## Stack

| Camada | Tecnologia |
|--------|------------|
| Frontend | Next.js 15 (App Router), React 19, Tailwind CSS + shadcn/ui |
| Banco de dados | PostgreSQL + Drizzle ORM |
| Autenticação | iron-session (credenciais fixas do admin via env) |
| Storage de arquivos | DigitalOcean Spaces (S3-compatível) |
| Emails | Resend |
| Testes | Vitest |
| Infra de produção | Droplet DigitalOcean + Docker Compose + Traefik (TLS Let's Encrypt) |
| CI/CD | GitHub Actions (lint + testes → deploy via SSH) |

## Pré-requisitos

- **Node.js** 22+
- **npm**
- **Docker** (para o PostgreSQL local via Supabase CLI)
- Acesso a um **DigitalOcean Spaces** (para as features de upload — QR Code PIX, fotos de produtos e comprovantes)

> O Supabase CLI é usado **apenas como PostgreSQL local de desenvolvimento**. A aplicação não depende mais de nenhum serviço Supabase (auth, storage ou banco hospedado).

---

## Rodando localmente

### 1. Clonar e instalar dependências

```bash
git clone <url-do-repositorio>
cd sspx-donation
npm install
```

### 2. Configurar variáveis de ambiente

```bash
cp .env.example .env.local
```

Principais variáveis (lista completa e comentada no [`.env.example`](.env.example)):

| Variável | Descrição | Local (padrão) |
|----------|-----------|----------------|
| `DATABASE_URL` | URL do PostgreSQL | `postgresql://postgres:postgres@127.0.0.1:54322/postgres` |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | Credenciais do admin | `admin` / `admin123` |
| `SESSION_PASSWORD` | Chave da sessão (**32+ caracteres**) | Altere em produção |
| `DO_SPACES_*` | Endpoint, região, credenciais e buckets do Spaces | — |
| `NEXT_PUBLIC_SPACES_PIX_QR_URL` / `NEXT_PUBLIC_SPACES_PRODUCT_PHOTOS_URL` | URLs públicas dos buckets | — |
| `NEXT_PUBLIC_SITE_URL` | URL pública do site (usada nos emails) | `http://localhost:3000` |
| `RESEND_API_KEY` / `RESEND_FROM_EMAIL` | Envio de emails | Opcional em dev |

> Sem as credenciais do Spaces o app roda normalmente, mas os fluxos de upload (QR Code do PIX, foto de produto, comprovante) falham ao serem usados.

### 3. Subir o PostgreSQL local

```bash
npm run supabase:start
```

Aguarde até aparecer "Started supabase local development setup". O banco fica em `127.0.0.1:54322`.

### 4. Aplicar migrações (e seed, se quiser)

```bash
npm run db:migrate      # aplica as migrações do Drizzle (src/lib/db/migrations/)
# ou, para recriar o banco do zero com dados de exemplo:
npm run supabase:reset  # aplica supabase/migrations/ + supabase/seed.sql
```

### 5. Iniciar o servidor de desenvolvimento

```bash
npm run dev
```

- **App**: http://localhost:3000
- **Admin**: http://localhost:3000/admin

> Se o seu shell exporta um `DATABASE_URL` de produção, use `npm run dev:local` — ele descarta o valor do shell e usa o dos arquivos `.env*`.

### Comandos úteis

```bash
npm run test           # Rodar testes
npm run test:watch     # Testes em modo watch
npm run test:coverage  # Cobertura de testes
npm run db:generate    # Gera migração a partir do schema (src/lib/db/schema.ts)
npm run db:migrate     # Aplica migrações pendentes
npm run db:studio      # Interface visual do Drizzle
npm run supabase:stop  # Parar o PostgreSQL local
```

---

## Migrações

1. Altere `src/lib/db/schema.ts`
2. `npm run db:generate` → cria o SQL em `src/lib/db/migrations/` (**fonte da verdade**)
3. Espelhe o SQL em `supabase/migrations/<timestamp>_<nome>.sql` (usado pelo `supabase:reset` local)
4. Local: `npm run db:migrate`
5. Produção: aplique na Droplet — ver ["Migrações em produção" em docs/deploy.md](docs/deploy.md#migrações-em-produção)

---

## Deploy

O deploy é automático: **push na `main`** → GitHub Actions roda lint + testes (gates) → conecta via SSH na Droplet → `scripts/deploy.sh` reconstrói e sobe o container com Docker Compose + Traefik.

Arquitetura, secrets, pré-requisitos da Droplet, migrações em produção e rollback: [`docs/deploy.md`](docs/deploy.md).

---

## Estrutura do projeto

```
src/
├── app/
│   ├── (public)/        # Catálogo público (lista e detalhe de produtos)
│   └── admin/           # Painel administrativo (login + rotas protegidas:
│                        #   dashboard, products, categories, pix,
│                        #   comunicacoes, financeiro, transfers)
├── features/
│   ├── donations/       # Fluxos de doação + emails
│   ├── products/        # Produtos (regular / bolsa de estudo)
│   ├── categories/      # Categorias
│   ├── pix/             # Configuração PIX
│   ├── broadcasts/      # Comunicados por email
│   └── dashboard/       # Estatísticas
├── lib/
│   ├── db/              # Drizzle: client, schema e migrações
│   ├── auth/            # iron-session
│   └── storage/         # DigitalOcean Spaces (S3)
└── middleware.ts        # Proteção de rotas
supabase/                # Postgres local de dev (config, migrações espelhadas, seed)
scripts/deploy.sh        # Script de deploy executado na Droplet
compose.traefik.yaml     # Compose de produção (Traefik + app)
Dockerfile               # Imagem de produção
```

---

## Troubleshooting

### Erro de conexão com o banco

- Confirme que o Docker está rodando
- Verifique `npm run supabase:start`
- Valide `DATABASE_URL` no `.env.local`
- `DATABASE_URL` exportado no shell? Use `npm run dev:local`

### Migrações falhando

- Revise o SQL em `src/lib/db/migrations/`
- Reset local: `npm run supabase:reset`
- Se o `DATABASE_URL` do runtime não servir para DDL, defina `DATABASE_URL_MIGRATE`

### Login admin não funciona

- `SESSION_PASSWORD` deve ter 32+ caracteres
- Confira `ADMIN_USERNAME` e `ADMIN_PASSWORD` nas variáveis de ambiente
- Limpe cookies do navegador e tente novamente

### Upload de arquivos falha (PIX, fotos de produto, comprovantes)

- Confirme as variáveis `DO_SPACES_*` (endpoint, região, credenciais e os três buckets)
- Os buckets precisam existir no Spaces: `receipts` (privado), `pix-qr` e `product-photos` (públicos)
- Uploads assinados são feitos direto do browser: o Spaces precisa de **CORS liberado** para a origem do site
- Imagens não aparecem? Confira `NEXT_PUBLIC_SPACES_*_URL` e os `remotePatterns` em `next.config.ts`

---

## Licença

Projeto privado.
