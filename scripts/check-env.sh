#!/bin/bash

# ========================================
# FLEET CARE - CHECK ENVIRONMENT
# ========================================
# Script para verificar el ambiente actual y validar configuración
#
# SEGURIDAD:
# - Detecta ambiente automáticamente
# - Verifica coherencia de variables
# - Lista variables faltantes o mal configuradas
# - Muestra información de base de datos
#
# Uso:
#   ./scripts/check-env.sh
# ========================================

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# Función para extraer valor de variable
get_env_value() {
  grep "^$1=" .env 2>/dev/null | cut -d '=' -f2- | tr -d '"' | tr -d "'" | head -1
}

# Función para detectar ambiente
detect_env() {
  if [ ! -f .env ]; then
    echo "none"
    return
  fi

  local supabase_url=$(get_env_value "NEXT_PUBLIC_SUPABASE_URL")

  if [[ $supabase_url == *"rvenejfnqodzwpptxppk"* ]]; then
    echo "staging"
  elif [[ $supabase_url == *"localhost"* ]] || [[ $supabase_url == "" ]]; then
    echo "development"
  else
    local app_url=$(get_env_value "NEXT_PUBLIC_APP_URL")
    if [[ $app_url == *"fleetcare.com"* ]]; then
      echo "production"
    else
      echo "unknown"
    fi
  fi
}

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Fleet Care - Environment Check${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Verificar si existe .env
if [ ! -f .env ]; then
  echo -e "${RED}❌ Archivo .env no encontrado${NC}"
  echo ""
  echo -e "${YELLOW}💡 Crea tu .env desde el template:${NC}"
  echo -e "   ${CYAN}cp .env.example .env${NC}"
  echo ""
  echo -e "   O usa el script de cambio de ambiente:${NC}"
  echo -e "   ${CYAN}./scripts/env-switch.sh development${NC}"
  echo ""
  exit 1
fi

# Extraer valores clave
ENVIRONMENT=$(get_env_value "NEXT_PUBLIC_ENVIRONMENT")
APP_URL=$(get_env_value "NEXT_PUBLIC_APP_URL")
DOMAIN=$(get_env_value "NEXT_PUBLIC_DOMAIN")
SUPABASE_URL=$(get_env_value "NEXT_PUBLIC_SUPABASE_URL")
DATABASE_URL=$(get_env_value "DATABASE_URL")
DIRECT_URL=$(get_env_value "DIRECT_URL")

# Detectar ambiente automáticamente
DETECTED_ENV=$(detect_env)

# Determinar color según ambiente
case $DETECTED_ENV in
  development)
    ENV_COLOR=$GREEN
    ENV_ICON="🟢"
    ;;
  staging)
    ENV_COLOR=$YELLOW
    ENV_ICON="🟡"
    ;;
  production)
    ENV_COLOR=$RED
    ENV_ICON="🔴"
    ;;
  *)
    ENV_COLOR=$CYAN
    ENV_ICON="❓"
    ;;
esac

# Mostrar información del ambiente
echo -e "${CYAN}${BOLD}📋 Ambiente Detectado:${NC}"
echo ""
echo -e "  ${ENV_ICON} Ambiente: ${ENV_COLOR}${BOLD}${DETECTED_ENV^^}${NC}"
echo ""

if [ "$ENVIRONMENT" != "$DETECTED_ENV" ] && [ "$DETECTED_ENV" != "unknown" ]; then
  echo -e "${YELLOW}⚠️  ADVERTENCIA: NEXT_PUBLIC_ENVIRONMENT no coincide con las URLs${NC}"
  echo -e "   Configurado: ${YELLOW}${ENVIRONMENT}${NC}"
  echo -e "   Detectado:   ${YELLOW}${DETECTED_ENV}${NC}"
  echo ""
fi

# Mostrar configuración de la aplicación
echo -e "${CYAN}${BOLD}🌐 Configuración de Aplicación:${NC}"
echo ""
echo -e "  App URL:     ${CYAN}${APP_URL}${NC}"
echo -e "  Domain:      ${CYAN}${DOMAIN}${NC}"
echo -e "  Environment: ${CYAN}${ENVIRONMENT}${NC}"
echo ""

# Mostrar información de Supabase
if [[ $SUPABASE_URL =~ https://([^.]+)\.supabase\.co ]]; then
  PROJECT_ID="${BASH_REMATCH[1]}"

  echo -e "${CYAN}${BOLD}🗄️  Base de Datos (Supabase):${NC}"
  echo ""
  echo -e "  Proyecto ID: ${CYAN}${PROJECT_ID}${NC}"
  echo -e "  URL:         ${CYAN}${SUPABASE_URL}${NC}"
  echo ""

  # Identificar proyecto específico
  case $PROJECT_ID in
    rvenejfnqodzwpptxppk)
      echo -e "  ${YELLOW}📍 STAGING DATABASE${NC}"
      ;;
    *)
      if [ "$DETECTED_ENV" = "production" ]; then
        echo -e "  ${RED}📍 PRODUCTION DATABASE${NC}"
      else
        echo -e "  ${GREEN}📍 DEVELOPMENT DATABASE${NC}"
      fi
      ;;
  esac

  echo ""
  echo -e "  Dashboard:   ${BLUE}https://supabase.com/dashboard/project/${PROJECT_ID}${NC}"
  echo ""
else
  echo -e "${YELLOW}⚠️  No se detectó URL de Supabase válida${NC}"
  echo ""
fi

# Verificar variables críticas
echo -e "${CYAN}${BOLD}✓ Validación de Variables:${NC}"
echo ""

MISSING_VARS=0

check_var() {
  local var_name=$1
  local var_value=$(get_env_value "$var_name")
  local is_optional=$2

  if [ -z "$var_value" ]; then
    if [ "$is_optional" = "optional" ]; then
      echo -e "  ${CYAN}○${NC} $var_name: ${CYAN}No configurada (opcional)${NC}"
    else
      echo -e "  ${RED}✗${NC} $var_name: ${RED}FALTA${NC}"
      ((MISSING_VARS++))
    fi
    return 1
  elif [[ $var_value == *"YOUR_"* ]] || [[ $var_value == *"your-"* ]]; then
    echo -e "  ${YELLOW}!${NC} $var_name: ${YELLOW}Usar valor de plantilla${NC}"
    ((MISSING_VARS++))
    return 1
  else
    echo -e "  ${GREEN}✓${NC} $var_name"
    return 0
  fi
}

# Variables críticas
check_var "DATABASE_URL"
check_var "DIRECT_URL"
check_var "NEXT_PUBLIC_SUPABASE_URL"
check_var "NEXT_PUBLIC_SUPABASE_ANON_KEY"
check_var "NEXT_PUBLIC_APP_URL"
check_var "NEXT_PUBLIC_DOMAIN"
check_var "NEXT_PUBLIC_ENVIRONMENT"

echo ""

# Variables opcionales
check_var "UPLOADTHING_TOKEN" "optional"
check_var "UPLOADTHING_SECRET" "optional"
check_var "TWILIO_ACCOUNT_SID" "optional"
check_var "TWILIO_AUTH_TOKEN" "optional"
check_var "TWILIO_PHONE_NUMBER" "optional"
check_var "CRON_SECRET" "optional"

echo ""
echo -e "${BLUE}========================================${NC}"

if [ $MISSING_VARS -eq 0 ]; then
  echo -e "${GREEN}✅ Configuración completa y válida${NC}"
else
  echo -e "${YELLOW}⚠️  ${MISSING_VARS} variable(s) requieren atención${NC}"
fi

echo -e "${BLUE}========================================${NC}"
echo ""

# Advertencias específicas por ambiente
case $DETECTED_ENV in
  staging)
    echo -e "${YELLOW}${BOLD}⚠️  ESTÁS EN STAGING${NC}"
    echo ""
    echo -e "  ${YELLOW}•${NC} Estás usando la base de datos de pre-producción"
    echo -e "  ${YELLOW}•${NC} Los cambios afectan el ambiente de staging"
    echo -e "  ${YELLOW}•${NC} Proyecto: rvenejfnqodzwpptxppk"
    echo ""
    ;;
  production)
    echo -e "${RED}${BOLD}🔴 ¡ESTÁS EN PRODUCCIÓN!${NC}"
    echo ""
    echo -e "  ${RED}•${NC} Extrema precaución con cualquier cambio"
    echo -e "  ${RED}•${NC} Estás manipulando datos reales de clientes"
    echo -e "  ${RED}•${NC} NO ejecutes seeds ni resets de base de datos"
    echo ""
    ;;
esac

# Comandos útiles
echo -e "${CYAN}${BOLD}💡 Comandos útiles:${NC}"
echo ""
echo -e "  Ver base de datos:    ${YELLOW}npm run prisma:studio${NC}"
echo -e "  Iniciar desarrollo:   ${YELLOW}npm run dev${NC}"
echo -e "  Cambiar ambiente:     ${YELLOW}./scripts/env-switch.sh [env]${NC}"
echo ""

if [ "$DETECTED_ENV" != "staging" ]; then
  echo -e "  Seed en staging:      ${YELLOW}./scripts/seed-staging.sh${NC}"
  echo ""
fi

# Listar backups disponibles
if compgen -G ".env.backup*" > /dev/null; then
  echo -e "${CYAN}${BOLD}📦 Backups disponibles:${NC}"
  echo ""
  for backup in .env.backup*; do
    BACKUP_SIZE=$(wc -c < "$backup" 2>/dev/null || echo "0")
    BACKUP_DATE=$(date -r "$backup" "+%Y-%m-%d %H:%M:%S" 2>/dev/null || echo "unknown")
    echo -e "  ${CYAN}•${NC} $backup"
    echo -e "    ${CYAN}└─${NC} Fecha: $BACKUP_DATE"
  done
  echo ""
  echo -e "${YELLOW}Para restaurar un backup:${NC}"
  echo -e "  ${CYAN}cp .env.backup .env${NC}"
  echo ""
fi
