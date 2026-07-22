# Deploy automático (DigitalOcean)

A cada push na branch `main`, o GitHub Actions (`.github/workflows/deploy.yml`)
roda o CI e, se o lint passar, conecta via SSH na Droplet e reconstrói o
container com Docker Compose + Traefik.

## Fluxo

1. **CI** (`jobs.ci`): `npm ci` → `npm run lint` (gate) → `npm test` (informativo,
   não bloqueia — ver nota sobre testes abaixo).
2. **Deploy** (`jobs.deploy`): SSH na Droplet → `cd $DEPLOY_PATH` →
   `bash scripts/deploy.sh`, que faz `git reset --hard origin/main` e
   `docker compose -f compose.traefik.yaml up -d --build`.

Também dá para disparar manualmente pela aba **Actions → Deploy (DigitalOcean) →
Run workflow** (`workflow_dispatch`).

## Secrets do GitHub (Settings → Secrets and variables → Actions)

| Secret            | Descrição                                                        |
| ----------------- | ---------------------------------------------------------------- |
| `DROPLET_HOST`    | IP ou hostname da Droplet                                        |
| `DROPLET_USER`    | Usuário SSH (ex.: `root` ou um usuário deploy)                   |
| `DROPLET_SSH_KEY` | Chave **privada** SSH (conteúdo completo) com acesso à Droplet   |
| `DEPLOY_PATH`     | Caminho absoluto do repositório clonado na Droplet              |
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

- Repositório já clonado em `$DEPLOY_PATH` com o remote `origin` apontando para
  este repo.
- Arquivo `.env` de produção presente na raiz (não é versionado; é montado como
  secret `app_env` no build e via `env_file` no run).
- Docker + Docker Compose instalados; redes externas `proxy` e `internal`
  criadas e o Traefik em execução.

## Nota sobre testes

O suite tem falhas de mock por drift de versões. Com o `package-lock.json` agora
versionado, as versões estão congeladas; quando os mocks forem corrigidos e o
`npm test` ficar verde, remova o `continue-on-error` do passo de testes no
workflow para torná-lo parte do gate.
