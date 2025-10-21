#!/bin/bash

# ========================================
# FLEET CARE - ENVIRONMENT SWITCHER
# ========================================
# Script SEGURO para cambiar entre ambientes
#
# SEGURIDAD:
# - Detecta ambiente actual antes de cambiar
# - Backup con timestamp (no sobrescribe backups previos)
# - Valida URLs antes de aplicar cambios
# - Confirmación doble para producción
#
# Uso:
#   ./scripts/env-switch.sh development
#   ./scripts/env-switch.sh staging
#   ./scripts/env-switch.sh production
# ========================================

set -e  # Exit on error

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Función para extraer valor de variable de un archivo
get_env_value() {
  local file=$1
  local var=$2
  grep "^$var=" "$file" 2>/dev/null | cut -d '=' -f2- | tr -d '"' | tr -d "'" | head -1
}

# Función para detectar ambiente actual
detect_current_env() {
  if [ ! -f .env ]; then
    echo "none"
    return
  fi

  local supabase_url=$(get_env_value ".env" "NEXT_PUBLIC_SUPABASE_URL")

  if [[ $supabase_url == *"rvenejfnqodzwpptxppk"* ]]; then
    echo "staging"
  elif [[ $supabase_url == *"localhost"* ]] || [[ $supabase_url == "" ]]; then
    echo "development"
  else
    # Verificar si es el proyecto de producción (cuando exista)
    local app_url=$(get_env_value ".env" "NEXT_PUBLIC_APP_URL")
    if [[ $app_url == *"fleetcare.com"* ]]; then
      echo "production"
    else
      echo "unknown"
    fi
  fi
}

# Función para mostrar uso
show_usage() {
  echo -e "${BLUE}========================================${NC}"
  echo -e "${BLUE}Fleet Care - Environment Switcher${NC}"
  echo -e "${BLUE}========================================${NC}"
  echo ""
  echo -e "Uso: ${GREEN}./scripts/env-switch.sh [environment]${NC}"
  echo ""
  echo "Ambientes disponibles:"
  echo -e "  ${GREEN}development${NC}  - Desarrollo local"
  echo -e "  ${GREEN}staging${NC}      - Pre-producción"
  echo -e "  ${GREEN}production${NC}   - Producción"
  echo ""
  echo "Ejemplos:"
  echo -e "  ${YELLOW}./scripts/env-switch.sh development${NC}"
  echo -e "  ${YELLOW}./scripts/env-switch.sh staging${NC}"
  echo ""
  exit 1
}

# Validar argumentos
if [ $# -eq 0 ]; then
  echo -e "${RED}❌ Error: Debes especificar un ambiente${NC}"
  echo ""
  show_usage
fi

TARGET_ENV=$1

# Validar ambiente
if [[ ! "$TARGET_ENV" =~ ^(development|staging|production)$ ]]; then
  echo -e "${RED}❌ Error: Ambiente inválido: $TARGET_ENV${NC}"
  echo ""
  show_usage
fi

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Fleet Care - Cambio de Ambiente${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Detectar ambiente actual
CURRENT_ENV=$(detect_current_env)

echo -e "${CYAN}📋 Estado Actual:${NC}"
echo ""
echo -e "  Ambiente actual:  ${YELLOW}${CURRENT_ENV}${NC}"
echo -e "  Ambiente destino: ${GREEN}${TARGET_ENV}${NC}"
echo ""

# Si ya estamos en el ambiente correcto
if [ "$CURRENT_ENV" = "$TARGET_ENV" ]; then
  echo -e "${GREEN}✓ Ya estás en el ambiente: $TARGET_ENV${NC}"
  echo ""
  exit 0
fi

# Validar que existe el archivo .env del ambiente destino
ENV_FILE=".env.local"
case $TARGET_ENV in
  development)
    ENV_FILE=".env.local"
    ;;
  staging)
    ENV_FILE=".env.staging"
    ;;
  production)
    ENV_FILE=".env.production"
    ;;
esac

if [ ! -f "$ENV_FILE" ]; then
  echo -e "${RED}❌ Error: Archivo $ENV_FILE no encontrado${NC}"
  echo ""
  if [ "$TARGET_ENV" = "development" ]; then
    echo -e "${YELLOW}💡 Tip: Crea tu archivo de desarrollo:${NC}"
    echo -e "   ${CYAN}cp .env.example .env.local${NC}"
    echo ""
  fi
  exit 1
fi

# Mostrar información del ambiente destino
echo -e "${CYAN}🔍 Validando ambiente destino...${NC}"
echo ""

TARGET_SUPABASE_URL=$(get_env_value "$ENV_FILE" "NEXT_PUBLIC_SUPABASE_URL")
TARGET_APP_URL=$(get_env_value "$ENV_FILE" "NEXT_PUBLIC_APP_URL")

if [[ $TARGET_SUPABASE_URL =~ https://([^.]+)\.supabase\.co ]]; then
  TARGET_PROJECT_ID="${BASH_REMATCH[1]}"
  echo -e "  Proyecto Supabase: ${CYAN}${TARGET_PROJECT_ID}${NC}"
else
  echo -e "  ${YELLOW}⚠️  No se detectó URL de Supabase${NC}"
fi

echo -e "  App URL:           ${CYAN}${TARGET_APP_URL}${NC}"
echo ""

# PROTECCIÓN ESPECIAL PARA PRODUCCIÓN
if [ "$TARGET_ENV" = "production" ]; then
  echo -e "${RED}${BOLD}╔════════════════════════════════════════╗${NC}"
  echo -e "${RED}${BOLD}║  ⚠️  ADVERTENCIA CRÍTICA - PRODUCCIÓN  ║${NC}"
  echo -e "${RED}${BOLD}╔════════════════════════════════════════╗${NC}"
  echo ""
  echo -e "${RED}Estás a punto de cambiar a PRODUCCIÓN${NC}"
  echo -e "${RED}Esto afectará DATOS REALES de CLIENTES${NC}"
  echo ""
  echo -e "Escribe exactamente: ${BOLD}CAMBIAR A PRODUCCION${NC}"
  read -p "> " production_confirm

  if [ "$production_confirm" != "CAMBIAR A PRODUCCION" ]; then
    echo ""
    echo -e "${YELLOW}Operación cancelada - Confirmación incorrecta${NC}"
    exit 0
  fi
  echo ""
fi

# Confirmar cambio normal
echo -e "${YELLOW}⚠️  ¿Deseas cambiar al ambiente: ${BOLD}${TARGET_ENV}${NC}${YELLOW}?${NC}"
echo ""
echo "Se creará un backup automático de tu .env actual"
echo ""
read -p "Confirmar (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
  echo ""
  echo -e "${YELLOW}Operación cancelada${NC}"
  exit 0
fi

echo ""

# Backup del .env actual con timestamp
if [ -f .env ]; then
  TIMESTAMP=$(date +%Y%m%d_%H%M%S)
  BACKUP_FILE=".env.backup.${CURRENT_ENV}.${TIMESTAMP}"

  echo -e "${BLUE}📦 Creando backup de .env actual...${NC}"
  cp .env "$BACKUP_FILE"

  # También crear .env.backup (último backup)
  cp .env .env.backup

  echo -e "${GREEN}✓ Backup creado: $BACKUP_FILE${NC}"
  echo -e "${GREEN}✓ Backup rápido: .env.backup${NC}"
fi

# Cambiar al ambiente especificado
echo -e "${BLUE}🔄 Aplicando cambio...${NC}"

cp "$ENV_FILE" .env

echo -e "${GREEN}✓ Archivo .env actualizado${NC}"
echo ""

# Verificar el cambio
NEW_ENV=$(detect_current_env)

if [ "$NEW_ENV" != "$TARGET_ENV" ]; then
  echo -e "${RED}❌ Error: El cambio no se aplicó correctamente${NC}"
  echo -e "${YELLOW}Restaurando backup...${NC}"
  if [ -f .env.backup ]; then
    cp .env.backup .env
    echo -e "${GREEN}✓ Backup restaurado${NC}"
  fi
  exit 1
fi

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}✅ Cambio de ambiente completado${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "  Ambiente anterior: ${YELLOW}${CURRENT_ENV}${NC}"
echo -e "  Ambiente actual:   ${GREEN}${TARGET_ENV}${NC}"
echo ""

# Advertencias específicas por ambiente
case $TARGET_ENV in
  staging)
    echo -e "${YELLOW}⚠️  IMPORTANTE: Estás usando la BD de STAGING${NC}"
    echo -e "${YELLOW}   Proyecto: rvenejfnqodzwpptxppk${NC}"
    ;;
  production)
    echo -e "${RED}⚠️  CRÍTICO: Estás usando la BD de PRODUCCIÓN${NC}"
    echo -e "${RED}   ¡Extrema precaución con cualquier cambio!${NC}"
    ;;
esac

echo ""
echo -e "${CYAN}📋 Comandos útiles:${NC}"
echo ""
echo -e "  Ver BD:              ${YELLOW}npm run prisma:studio${NC}"
echo -e "  Iniciar app:         ${YELLOW}npm run dev${NC}"
echo -e "  Verificar ambiente:  ${YELLOW}./scripts/check-env.sh${NC}"
echo ""
echo -e "${CYAN}📦 Backups disponibles:${NC}"
echo ""
echo -e "  Último backup:       ${YELLOW}.env.backup${NC}"
echo -e "  Backup timestamped:  ${YELLOW}$BACKUP_FILE${NC}"
echo ""
echo -e "${YELLOW}Para restaurar el backup:${NC}"
echo -e "  ${CYAN}cp .env.backup .env${NC}"
echo ""
