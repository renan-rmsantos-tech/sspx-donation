# Infraestrutura e Deploy (DigitalOcean)

Toda a produção roda na DigitalOcean:

```
push na main
    │
    ▼
GitHub Actions ── lint + testes (gates) ── SSH ──▶ Droplet
                                                    │
                                                    ├─ Traefik (rede `proxy`)
                                                    │    TLS Let's Encrypt
                                                    │    Host: ajude-o-colegio-sao-jose.com
                                                    │        │
                                                    ├─ app `donation` (Next.js, porta 3000)
                                                    │        │  rede `internal`
                                                    ├─ PostgreSQL (container `postgres`,
                                                    │    banco `donation`, rede `internal`)
                                                    │
DigitalOcean Spaces (nyc3) ◀── uploads/downloads (S3 API + URLs assinadas)
Resend ◀── emails (agradecimento e comunicados)
```

## Componentes

| Componente | Onde | Observações |
|------------|------|-------------|
| App Next.js | Container `donation` na Droplet (`compose.traefik.yaml`) | Build multi-etapa simples (`Dockerfile`), `npm start` na porta 3000 |
| Proxy / TLS | Traefik na Droplet (stack separada, rede externa `proxy`) | Certresolver `letsencrypt`; labels no compose roteiam o host |
| Banco | Container Postgres na rede externa `internal` | Acessado como `postgres:5432/donation`; não é exposto publicamente |
| Storage | DigitalOcean Spaces (S3-compatível) | Buckets: `receipts` (privado), `pix-qr` e `product-photos` (públicos) |
| Emails | Resend | `RESEND_API_KEY` / `RESEND_FROM_EMAIL` |
| CI/CD | GitHub Actions (`.github/workflows/deploy.yml`) | Deploy por SSH executando `scripts/deploy.sh` |

## Fluxo de deploy

A cada push na branch `main` (ou manualmente em **Actions → Deploy (DigitalOcean) → Run workflow**):

1. **CI** (`jobs.ci`): `npm ci` → `npm run lint` → `npm test`. **Lint e testes são gates** — se qualquer um falhar, o deploy não roda.
2. **Deploy** (`jobs.deploy`): SSH na Droplet → `cd $DEPLOY_PATH` → `git reset --hard origin/main` → `bash scripts/deploy.sh`, que reconstrói a imagem e sobe o serviço:
   `docker compose -f compose.traefik.yaml up -d --build --remove-orphans`.

O `.env` de produção (na raiz do repo clonado na Droplet) é montado como secret `app_env` durante o build (`next build` precisa dele) e injetado via `env_file` no runtime.

## Secrets do GitHub (Settings → Secrets and variables → Actions)

| Secret            | Descrição                                                        |
| ----------------- | ---------------------------------------------------------------- |
| `DROPLET_HOST`    | IP ou hostname da Droplet                                        |
| `DROPLET_USER`    | Usuário SSH (ex.: `root` ou um usuário deploy)                   |
| `DROPLET_SSH_KEY` | Chave **privada** SSH (conteúdo completo) com acesso à Droplet   |
| `DEPLOY_PATH`     | Caminho absoluto do repositório clonado na Droplet               |
| `DROPLET_SSH_PORT`| Opcional. Porta SSH (default `22`)                               |

### Gerando a chave SSH de deploy

```bash
# Na sua máquina:
ssh-keygen -t ed25519 -C "github-actions-deploy" -f deploy_key -N ""
# Autorize a pública na Droplet:
ssh-copy-id -i deploy_key.pub USER@DROPLET_HOST   # ou anexe em ~/.ssh/authorized_keys
# Cole o conteúdo de deploy_key (privada) no secret DROPLET_SSH_KEY.
```

## Pré-requisitos na Droplet

- Docker + Docker Compose instalados.
- Redes externas `proxy` e `internal` criadas (`docker network create proxy` / `internal`).
- **Traefik** em execução na rede `proxy`, com entrypoint `websecure` e certresolver `letsencrypt`.
- **PostgreSQL** em execução na rede `internal`, resolvível como `postgres`, com o banco `donation` criado.
- Repositório clonado em `$DEPLOY_PATH` com o remote `origin` apontando para este repo.
- Arquivo `.env` de produção na raiz do clone (não é versionado) com **todas** as variáveis do [`.env.example`](../.env.example) preenchidas — em especial:
  - `DATABASE_URL=postgresql://<user>:<senha>@postgres:5432/donation`
  - `DO_SPACES_*` (endpoint, região, credenciais e os três buckets)
  - `NEXT_PUBLIC_SPACES_PIX_QR_URL` / `NEXT_PUBLIC_SPACES_PRODUCT_PHOTOS_URL` e `NEXT_PUBLIC_SITE_URL` (viram build args — mudanças neles exigem rebuild)
  - `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `SESSION_PASSWORD` (32+ caracteres)
  - `RESEND_API_KEY`, `RESEND_FROM_EMAIL`

## DigitalOcean Spaces

- Buckets usados: `receipts` (**privado** — comprovantes), `pix-qr` e `product-photos` (**públicos** — ACL `public-read` aplicada no upload).
- Downloads de comprovantes usam URLs assinadas (5 min); uploads podem usar URL assinada gerada no servidor e enviada ao browser — o Spaces precisa de **CORS liberado** (método `PUT`) para a origem `https://ajude-o-colegio-sao-jose.com` (e `http://localhost:3000` em dev).
- As URLs públicas dos buckets ficam em `NEXT_PUBLIC_SPACES_*_URL` e também nos `remotePatterns` de `next.config.ts` — ao trocar de bucket/região, atualize os dois.

## Migrações em produção

O deploy **não** aplica migrações automaticamente. Após mergear uma migração nova (`src/lib/db/migrations/`), aplique-a na Droplet:

**Opção A — psql no container do Postgres** (simples, recomendado):

```bash
cd $DEPLOY_PATH
docker exec -i <container-do-postgres> psql -U <user> -d donation \
  < src/lib/db/migrations/<arquivo-novo>.sql
```

**Opção B — drizzle-kit dentro da rede `internal`** (usa o journal do Drizzle):

```bash
cd $DEPLOY_PATH
docker run --rm --network internal --env-file .env \
  -v "$PWD":/app -w /app node:22-alpine \
  sh -c "npm ci && npx drizzle-kit migrate"
```

> Prefira migrações aditivas/idempotentes (`IF NOT EXISTS`) — ver skill `drizzle-safe-migrations`.

## Deploy manual e rollback

```bash
# Deploy manual (na Droplet, na raiz do repo):
bash scripts/deploy.sh

# Rollback para um commit anterior:
git fetch origin
git reset --hard <sha-estável>
docker compose -f compose.traefik.yaml up -d --build
# (ou reverta o commit na main e deixe o CI fazer o deploy)
```

Logs e status:

```bash
docker compose -f compose.traefik.yaml ps
docker compose -f compose.traefik.yaml logs -f donation
```
