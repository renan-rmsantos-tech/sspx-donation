#!/usr/bin/env bash
#
# Hook de deploy push-to-deploy — roda NO SERVIDOR, disparado por
# `git push production main`. Genérico: serve qualquer projeto docker compose
# do droplet sem edição, porque descobre o repo pelo próprio caminho do hook e
# lê o resto do `git config`.
#
# Este arquivo é compartilhado entre os projetos do droplet e deve ser mantido
# idêntico em todos. Documentação completa: sspx-catechism/infra/README.md §8.
#
# Substitui o .github/workflows/deploy.yml enquanto o GitHub Actions está
# bloqueado no nível da conta. O portão de testes NÃO vive aqui: ele está dentro
# dos Dockerfiles (`RUN go test ./...`, `RUN npx vitest run`). Se um teste quebra,
# a imagem não constrói, o `compose up` falha e este script reverte.
#
# Instalação, idêntica em qualquer projeto:
#   git config receive.denyCurrentBranch updateInstead
#   git config deploy.healthUrl   https://SEU-DOMINIO/rota-de-health
#   git config deploy.composeFile compose.traefik.yaml     # opcional (é o padrão)
#   cp scripts/post-receive.sh .git/hooks/post-receive && chmod +x .git/hooks/post-receive
#
# Copie, não faça symlink: com `updateInstead` o work-tree é atualizado ANTES do
# post-receive rodar, e reescrever o próprio script em execução corrompe o bash.
set -uo pipefail

# O git exporta estas variáveis para o hook; elas apontam para o repo/índice do
# push e quebrariam qualquer comando git executado no work-tree abaixo.
unset GIT_DIR GIT_WORK_TREE GIT_INDEX_FILE GIT_QUARANTINE_PATH

# O hook mora em <repo>/.git/hooks/post-receive, então dois níveis acima é o repo.
# É o que dispensa configurar caminho por projeto.
HOOK_DIR=$(cd "$(dirname "$0")" && pwd)
APP_DIR=${APP_DIR:-$(cd "$HOOK_DIR/../.." && pwd)}
APP_NAME=$(basename "$APP_DIR")

COMPOSE_FILE=${COMPOSE_FILE:-$(git -C "$APP_DIR" config --get deploy.composeFile || echo compose.traefik.yaml)}
HEALTH_URL=${HEALTH_URL:-$(git -C "$APP_DIR" config --get deploy.healthUrl || true)}
LOG_FILE=${LOG_FILE:-$HOME/deploy-$APP_NAME.log}
LOCK_FILE=${LOCK_FILE:-$HOME/.deploy-$APP_NAME.lock}

log() { printf '%s  %s\n' "$(date -u '+%Y-%m-%dT%H:%M:%SZ')" "$*" | tee -a "$LOG_FILE"; }

# Um deploy por projeto de cada vez. Dois pushes simultâneos se atropelariam no
# meio do build (era o `concurrency: deploy-production` do workflow do GitHub).
# O lock é por projeto, então projetos diferentes seguem deployando em paralelo.
exec 9>"$LOCK_FILE"
if ! flock -w 900 9; then
  log "outro deploy de $APP_NAME segue rodando após 15min — abortando este"
  exit 1
fi

# Bate na URL pública — valida o caminho inteiro (Traefik -> app), não só
# "o container subiu".
wait_healthy() {
  local i code
  if [ -z "$HEALTH_URL" ]; then
    log "AVISO: deploy.healthUrl não configurado — publicando sem verificar saúde"
    return 0
  fi
  for i in $(seq 1 20); do
    code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 "$HEALTH_URL" || echo 000)
    if [ "$code" = "200" ]; then
      log "health OK ($HEALTH_URL -> 200, tentativa $i)"
      return 0
    fi
    sleep 3
  done
  log "health FALHOU ($HEALTH_URL -> $code após 20 tentativas)"
  return 1
}

# $2 = "yes" quando os containers já foram trocados pela versão nova (falha no
# health check) e precisam ser reconstruídos; "no" quando o build barrou antes de
# tocar em qualquer container — aí basta reverter o código, sem restart inútil.
rollback() {
  local oldrev=$1 rebuild=$2
  if [ -z "$oldrev" ] || [ "$oldrev" = "0000000000000000000000000000000000000000" ]; then
    log "sem revisão anterior para reverter — deixando como está"
    return 1
  fi
  log "REVERTENDO para $(git -C "$APP_DIR" rev-parse --short "$oldrev")"
  git -C "$APP_DIR" reset --hard "$oldrev" >>"$LOG_FILE" 2>&1

  if [ "$rebuild" != "yes" ]; then
    log "rollback concluído — containers nunca foram tocados, versão anterior segue no ar"
    return 1
  fi

  if docker compose -f "$COMPOSE_FILE" up -d --build >>"$LOG_FILE" 2>&1; then
    log "rollback concluído — versão anterior reconstruída e no ar"
  else
    log "ROLLBACK FALHOU — intervenção manual necessária (log: $LOG_FILE)"
  fi
  return 1
}

deploy() {
  local oldrev=$1 newrev=$2
  cd "$APP_DIR" || { log "não consegui entrar em $APP_DIR"; return 1; }

  log "deploy $(git rev-parse --short "$newrev") — $(git log -1 --format=%s "$newrev")"

  # --build roda os testes dentro das imagens; falha aqui = teste ou build quebrado.
  # `docker compose up` só troca os containers depois de as imagens existirem, e
  # as imagens só existem se os testes passaram — então uma falha aqui deixa a
  # versão anterior intacta e servindo. Daí o rollback sem rebuild.
  if ! docker compose -f "$COMPOSE_FILE" up -d --build 2>&1 | tee -a "$LOG_FILE"; then
    log "BUILD/TESTES FALHARAM — nada foi publicado"
    rollback "$oldrev" no
    return 1
  fi

  # Aqui os containers JÁ são os novos; para voltar atrás é preciso reconstruir.
  if ! wait_healthy; then
    rollback "$oldrev" yes
    return 1
  fi

  docker image prune -f >>"$LOG_FILE" 2>&1
  log "deploy OK — $(git rev-parse --short HEAD) no ar"
}

status=0
while read -r oldrev newrev ref; do
  if [ "$ref" != "refs/heads/main" ]; then
    log "ignorando $ref (só main deploya)"
    continue
  fi
  deploy "$oldrev" "$newrev" || status=1
done

exit $status
