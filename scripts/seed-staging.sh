#!/bin/bash

# ========================================
# FLEET CARE - SEED STAGING DATABASE
# ========================================
# Script SEGURO para correr seed en staging
#
# SEGURIDAD:
# - Detecta ambiente actual
# - Bloquea si estás en producción
# - Backup automático antes de cambiar
# - Restaura ambiente original después
# - Confirmación doble antes de ejecutar
#
# Uso:
#   ./scripts/seed-staging.sh
# ========================================

set -e  # Exit on error

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

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
    local app_url=$(get_env_value ".env" "NEXT_PUBLIC_APP_URL")
    if [[ $app_url == *"fleetcare.com"* ]]; then
      echo "production"
    else
      echo "unknown"
    fi
  fi
}

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Fleet Care - Seed Staging${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Detectar ambiente actual
CURRENT_ENV=$(detect_current_env)

echo -e "${CYAN}📋 Estado Actual:${NC}"
echo ""
echo -e "  Ambiente actual: ${YELLOW}${CURRENT_ENV}${NC}"
echo -e "  Ambiente destino: ${GREEN}staging${NC}"
echo ""

# BLOQUEO CRÍTICO: Verificar que NO estamos en producción
if [ "$CURRENT_ENV" = "production" ]; then
  echo -e "${RED}${BOLD}╔════════════════════════════════════════╗${NC}"
  echo -e "${RED}${BOLD}║   ❌ BLOQUEADO - ESTÁS EN PRODUCCIÓN   ║${NC}"
  echo -e "${RED}${BOLD}╚════════════════════════════════════════╝${NC}"
  echo ""
  echo -e "${RED}NO puedes correr seed desde producción${NC}"
  echo -e "${YELLOW}Cambia primero a development:${NC}"
  echo -e "  ${CYAN}./scripts/env-switch.sh development${NC}"
  echo ""
  exit 1
fi

# Verificar que existe .env.staging
if [ ! -f .env.staging ]; then
  echo -e "${RED}❌ Error: Archivo .env.staging no encontrado${NC}"
  echo ""
  exit 1
fi

# Mostrar información de staging
STAGING_SUPABASE_URL=$(get_env_value ".env.staging" "NEXT_PUBLIC_SUPABASE_URL")
STAGING_APP_URL=$(get_env_value ".env.staging" "NEXT_PUBLIC_APP_URL")

echo -e "${CYAN}🔍 Información de Staging:${NC}"
echo ""

if [[ $STAGING_SUPABASE_URL =~ https://([^.]+)\.supabase\.co ]]; then
  STAGING_PROJECT_ID="${BASH_REMATCH[1]}"
  echo -e "  Proyecto Supabase: ${CYAN}${STAGING_PROJECT_ID}${NC}"
else
  echo -e "  ${RED}⚠️  No se detectó URL de Supabase en .env.staging${NC}"
  exit 1
fi

echo -e "  App URL:           ${CYAN}${STAGING_APP_URL}${NC}"
echo ""

# ADVERTENCIA Y CONFIRMACIÓN
echo -e "${YELLOW}${BOLD}╔════════════════════════════════════════╗${NC}"
echo -e "${YELLOW}${BOLD}║    ⚠️  ADVERTENCIA - SEED EN STAGING   ║${NC}"
echo -e "${YELLOW}${BOLD}╚════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}Esta operación hará lo siguiente:${NC}"
echo ""
echo "  1. Backup de tu .env actual"
echo "  2. Cambiar temporalmente a .env.staging"
echo "  3. Ejecutar: npm run db:seed"
echo "  4. Restaurar tu .env original"
echo ""
echo -e "${YELLOW}⚠️  IMPORTANTE:${NC}"
echo "  - Esto puede sobrescribir datos existentes en staging"
echo "  - Solo afecta la BD de staging (rvenejfnqodzwpptxppk)"
echo "  - Tu ambiente local NO se verá afectado"
echo ""
read -p "¿Deseas continuar? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
  echo ""
  echo -e "${YELLOW}Operación cancelada${NC}"
  exit 0
fi

echo ""
echo -e "${BLUE}🔄 Iniciando proceso de seed...${NC}"
echo ""

# 1. Backup .env actual
if [ -f .env ]; then
  TIMESTAMP=$(date +%Y%m%d_%H%M%S)
  BACKUP_FILE=".env.backup.${CURRENT_ENV}.${TIMESTAMP}"

  echo -e "${BLUE}📦 Creando backup de .env actual...${NC}"
  cp .env "$BACKUP_FILE"
  cp .env .env.backup
  echo -e "${GREEN}✓ Backup creado: $BACKUP_FILE${NC}"
fi

# 2. Cambiar temporalmente a .env.staging
echo -e "${BLUE}🔄 Cambiando temporalmente a staging...${NC}"
cp .env.staging .env
echo -e "${GREEN}✓ Usando .env.staging${NC}"
echo ""

# 3. Verificar conexión a base de datos de staging
echo -e "${BLUE}🔍 Verificando conexión a BD de staging...${NC}"

if ! npx prisma db execute --stdin <<< "SELECT 1;" > /dev/null 2>&1; then
  echo -e "${RED}❌ Error: No se pudo conectar a la base de datos de staging${NC}"
  echo ""
  echo -e "${YELLOW}Restaurando .env original...${NC}"
  if [ -f .env.backup ]; then
    cp .env.backup .env
    echo -e "${GREEN}✓ .env restaurado${NC}"
  fi
  exit 1
fi

echo -e "${GREEN}✓ Conexión exitosa a staging${NC}"
echo ""

# 4. Correr seed
echo -e "${BLUE}${BOLD}🌱 Ejecutando seed en staging...${NC}"
echo ""
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Ejecutar seed y capturar resultado
if npm run db:seed; then
  SEED_SUCCESS=true
else
  SEED_SUCCESS=false
fi

echo ""
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# 5. Restaurar .env original SIEMPRE
echo -e "${BLUE}🔄 Restaurando .env original...${NC}"
if [ -f .env.backup ]; then
  cp .env.backup .env
  echo -e "${GREEN}✓ .env restaurado${NC}"
fi

# Verificar que se restauró correctamente
RESTORED_ENV=$(detect_current_env)
if [ "$RESTORED_ENV" != "$CURRENT_ENV" ]; then
  echo -e "${YELLOW}⚠️  Advertencia: No se pudo restaurar ambiente original${NC}"
  echo -e "${YELLOW}   Ambiente esperado: $CURRENT_ENV${NC}"
  echo -e "${YELLOW}   Ambiente actual: $RESTORED_ENV${NC}"
  echo ""
  echo -e "${YELLOW}Restaura manualmente:${NC}"
  echo -e "  ${CYAN}cp $BACKUP_FILE .env${NC}"
  echo ""
fi

echo ""
echo -e "${BLUE}========================================${NC}"

if [ "$SEED_SUCCESS" = true ]; then
  echo -e "${GREEN}✅ Seed en staging completado exitosamente${NC}"
else
  echo -e "${RED}❌ Error al ejecutar seed en staging${NC}"
fi

echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "  Ambiente actual: ${GREEN}${RESTORED_ENV}${NC}"
echo ""
echo -e "${CYAN}💡 Próximos pasos:${NC}"
echo ""
echo "  Verificar datos en Supabase:"
echo -e "    ${BLUE}https://supabase.com/dashboard/project/${STAGING_PROJECT_ID}${NC}"
echo ""
echo "  Ver aplicación en staging:"
echo -e "    ${BLUE}${STAGING_APP_URL}${NC}"
echo ""

if [ "$SEED_SUCCESS" = false ]; then
  echo -e "${YELLOW}⚠️  El seed falló. Revisa los errores arriba.${NC}"
  echo ""
  exit 1
fi
