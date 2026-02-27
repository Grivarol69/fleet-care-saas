#!/usr/bin/env bash
# =============================================================
#  deploy.sh — Fleet Care SaaS deploy helper
#
#  Usage:
#    ./scripts/deploy.sh staging          # develop → staging
#    ./scripts/deploy.sh production       # staging → main
#    ./scripts/deploy.sh all              # develop → staging → main
#
# =============================================================
set -euo pipefail

TARGET="${1:-}"
CURRENT_BRANCH=$(git branch --show-current)

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
info()    { echo -e "${BLUE}[deploy]${NC} $*"; }
success() { echo -e "${GREEN}[deploy]${NC} ✅ $*"; }
warn()    { echo -e "${YELLOW}[deploy]${NC} ⚠️  $*"; }
error()   { echo -e "${RED}[deploy]${NC} ❌ $*"; exit 1; }

# -----------------------------------------------------------
# Guard: working tree must be clean
# -----------------------------------------------------------
if [[ -n "$(git status --porcelain)" ]]; then
  error "Tenés cambios sin commitear. Commitealos antes de deployar."
fi

# -----------------------------------------------------------
# Guard: debe estar en develop para deploy
# -----------------------------------------------------------
if [[ "$CURRENT_BRANCH" != "develop" ]]; then
  error "Debés estar en la rama 'develop' para usar este script. Rama actual: $CURRENT_BRANCH"
fi

deploy_staging() {
  info "Deploying develop → staging..."
  git push origin develop
  success "Push develop OK"

  git checkout staging
  git merge develop --no-edit
  git push origin staging
  success "staging actualizado y pusheado → Vercel staging deploy iniciado"

  git checkout develop
  info "Volviste a develop"
}

deploy_production() {
  info "Deploying staging → main (production)..."

  # Verificar que staging esté al día con develop
  git fetch origin
  LOCAL_STAGING=$(git rev-parse origin/staging)
  LOCAL_DEVELOP=$(git rev-parse origin/develop)
  if [[ "$LOCAL_STAGING" != "$LOCAL_DEVELOP" ]]; then
    warn "staging no está al día con develop. Corré './scripts/deploy.sh staging' primero."
    read -rp "¿Continuar de todas formas? (s/N): " confirm
    [[ "$confirm" =~ ^[sS]$ ]] || error "Deploy cancelado."
  fi

  git checkout main
  git merge staging --no-edit
  git push origin main
  success "main actualizado y pusheado → Vercel production deploy iniciado"

  git checkout develop
  info "Volviste a develop"
}

# -----------------------------------------------------------
# Main
# -----------------------------------------------------------
case "$TARGET" in
  staging)
    deploy_staging
    echo ""
    success "Deploy a staging completado."
    echo -e "  🔗 Revisá el deploy en el dashboard de Vercel."
    ;;
  production)
    echo -e "${YELLOW}⚠️  Vas a deployar a PRODUCCIÓN. ¿Estás seguro?${NC}"
    read -rp "Escribí 'production' para confirmar: " confirm
    [[ "$confirm" == "production" ]] || error "Deploy cancelado."
    deploy_production
    echo ""
    success "Deploy a production completado."
    ;;
  all)
    echo -e "${YELLOW}⚠️  Vas a deployar a STAGING y luego a PRODUCCIÓN.${NC}"
    read -rp "¿Continuar? (s/N): " confirm
    [[ "$confirm" =~ ^[sS]$ ]] || error "Deploy cancelado."
    deploy_staging
    echo ""
    deploy_production
    echo ""
    success "Deploy completo: develop → staging → production."
    ;;
  *)
    echo "Uso: ./scripts/deploy.sh [staging|production|all]"
    echo ""
    echo "  staging     develop → staging (auto-deploy Vercel staging)"
    echo "  production  staging → main    (auto-deploy Vercel production)"
    echo "  all         develop → staging → main"
    exit 1
    ;;
esac
