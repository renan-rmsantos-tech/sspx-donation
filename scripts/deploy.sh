#!/usr/bin/env bash
#
# Deploy do sspx-donation na Droplet DigitalOcean.
#
# Executado pelo GitHub Actions via SSH, mas também pode ser rodado à mão na
# Droplet: `bash scripts/deploy.sh`.
#
# Fluxo: garante a branch/main atualizada, reconstrói a imagem e sobe o serviço
# com o compose do Traefik. O .env de produção precisa existir na Droplet (não
# é versionado) — é montado como secret durante o build e via env_file no run.

set -euo pipefail

COMPOSE_FILE="compose.traefik.yaml"
BRANCH="${DEPLOY_BRANCH:-main}"

echo "==> Deploy iniciado ($(date '+%Y-%m-%d %H:%M:%S'))"
echo "==> Diretório: $(pwd)"
echo "==> Branch:    ${BRANCH}"

if [ ! -f "${COMPOSE_FILE}" ]; then
  echo "ERRO: ${COMPOSE_FILE} não encontrado. Rode este script na raiz do repositório clonado na Droplet." >&2
  exit 1
fi

if [ ! -f ".env" ]; then
  echo "ERRO: .env não encontrado na raiz. O build precisa dele (secret app_env)." >&2
  exit 1
fi

echo "==> Atualizando código (git fetch + reset --hard origin/${BRANCH})"
git fetch --prune origin "${BRANCH}"
git reset --hard "origin/${BRANCH}"

echo "==> Reconstruindo e subindo o serviço"
docker compose -f "${COMPOSE_FILE}" up -d --build --remove-orphans

echo "==> Limpando imagens antigas"
docker image prune -f >/dev/null 2>&1 || true

echo "==> Deploy concluído com sucesso ($(date '+%Y-%m-%d %H:%M:%S'))"
docker compose -f "${COMPOSE_FILE}" ps
