#!/bin/bash

# Script para probar migraciones con diferentes configuraciones
# Uso: bash scripts/test-migrate.sh

set -e

PROJECT_ID="rvenejfnqodzwpptxppk"
PASSWORD="etmcFKSW1984"
REGION="aws-1-us-east-2"

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║     TEST DE MIGRACIONES PRISMA - SUPABASE                 ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════════╝${NC}"

# Backup .env actual
if [ -f .env ]; then
    echo -e "\n${YELLOW}Haciendo backup de .env actual...${NC}"
    cp .env .env.backup.test
    echo -e "${GREEN}✅ Backup creado: .env.backup.test${NC}"
fi

# Función para testear una configuración
test_config() {
    local NAME=$1
    local DATABASE_URL=$2
    local DIRECT_URL=$3

    echo -e "\n${CYAN}${'='*60}${NC}"
    echo -e "${CYAN}Testeando: $NAME${NC}"
    echo -e "${CYAN}${'='*60}${NC}"

    # Crear .env temporal
    cat > .env.test << EOF
DATABASE_URL="$DATABASE_URL"
DIRECT_URL="$DIRECT_URL"
EOF

    echo -e "${BLUE}DATABASE_URL: ${DATABASE_URL//:*@/:***@}${NC}"
    echo -e "${BLUE}DIRECT_URL: ${DIRECT_URL//:*@/:***@}${NC}"

    # Test 1: Migrate status
    echo -e "\n${YELLOW}1. Probando 'prisma migrate status'...${NC}"
    if DATABASE_URL="$DATABASE_URL" DIRECT_URL="$DIRECT_URL" npx prisma migrate status 2>&1 | tee /tmp/migrate-test.log; then
        echo -e "${GREEN}✅ migrate status exitoso${NC}"
    else
        echo -e "${RED}❌ migrate status falló${NC}"
        echo -e "${YELLOW}Ver errores en /tmp/migrate-test.log${NC}"
        return 1
    fi

    # Test 2: Migrate resolve (simulación)
    echo -e "\n${YELLOW}2. Probando 'prisma migrate resolve' (dry-run)...${NC}"
    if DATABASE_URL="$DATABASE_URL" DIRECT_URL="$DIRECT_URL" npx prisma migrate resolve --help > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Comando migrate resolve disponible${NC}"
    else
        echo -e "${RED}❌ Comando migrate resolve no disponible${NC}"
    fi

    # Test 3: DB Pull (verificar schema remoto)
    echo -e "\n${YELLOW}3. Probando 'prisma db pull' (verificar acceso)...${NC}"
    if DATABASE_URL="$DATABASE_URL" DIRECT_URL="$DIRECT_URL" timeout 30s npx prisma db pull --force 2>&1 | grep -q "introspection"; then
        echo -e "${GREEN}✅ db pull funcionó (puede leer schema remoto)${NC}"
    else
        echo -e "${YELLOW}⚠️  db pull tuvo problemas (puede ser timeout)${NC}"
    fi

    # Limpiar
    rm -f .env.test

    echo -e "\n${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}Configuración '$NAME' completada${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

    return 0
}

# Configuración 1: Pooled Transaction Mode para runtime, Pooled Session para migraciones
echo -e "\n${CYAN}═══════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}CONFIG 1: Pooled (Transaction) + Pooled (Session)${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}"
test_config \
    "Pooled Transaction + Pooled Session" \
    "postgresql://postgres.$PROJECT_ID:$PASSWORD@$REGION.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1" \
    "postgresql://postgres.$PROJECT_ID:$PASSWORD@$REGION.pooler.supabase.com:5432/postgres?pgbouncer=true"

# Configuración 2: Pooled para runtime, Direct para migraciones
echo -e "\n${CYAN}═══════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}CONFIG 2: Pooled (Transaction) + Direct (5432)${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}"
test_config \
    "Pooled Transaction + Direct 5432" \
    "postgresql://postgres.$PROJECT_ID:$PASSWORD@$REGION.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1" \
    "postgresql://postgres.$PROJECT_ID:$PASSWORD@$REGION.pooler.supabase.com:5432/postgres"

# Configuración 3: Ambos direct (no pooler)
echo -e "\n${CYAN}═══════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}CONFIG 3: Direct 5432 (sin pooler)${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}"
test_config \
    "Direct 5432 (sin pooler)" \
    "postgresql://postgres.$PROJECT_ID:$PASSWORD@$REGION.pooler.supabase.com:5432/postgres" \
    "postgresql://postgres.$PROJECT_ID:$PASSWORD@$REGION.pooler.supabase.com:5432/postgres"

# Configuración 4: Host db.* (conexión directa alternativa)
echo -e "\n${CYAN}═══════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}CONFIG 4: Direct via db.* host${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}"
test_config \
    "Direct db.* host" \
    "postgresql://postgres.$PROJECT_ID:$PASSWORD@db.$PROJECT_ID.supabase.co:5432/postgres" \
    "postgresql://postgres.$PROJECT_ID:$PASSWORD@db.$PROJECT_ID.supabase.co:5432/postgres"

# Configuración 5: SSL mode variations
echo -e "\n${CYAN}═══════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}CONFIG 5: Pooled con sslmode=require${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}"
test_config \
    "Pooled con SSL" \
    "postgresql://postgres.$PROJECT_ID:$PASSWORD@$REGION.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1&sslmode=require" \
    "postgresql://postgres.$PROJECT_ID:$PASSWORD@$REGION.pooler.supabase.com:5432/postgres?sslmode=require"

# Restaurar .env original
if [ -f .env.backup.test ]; then
    echo -e "\n${YELLOW}Restaurando .env original...${NC}"
    mv .env.backup.test .env
    echo -e "${GREEN}✅ .env restaurado${NC}"
fi

echo -e "\n\n${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║                    TESTS COMPLETADOS                      ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════════╝${NC}"

echo -e "\n${YELLOW}Revisar logs arriba para ver qué configuración funcionó.${NC}"
echo -e "${YELLOW}Si todas fallaron, verificar:${NC}"
echo -e "  ${BLUE}1. IP allowlist en Supabase Dashboard${NC}"
echo -e "  ${BLUE}2. Proyecto activo (no pausado)${NC}"
echo -e "  ${BLUE}3. Credenciales correctas${NC}"
echo -e "  ${BLUE}4. Firewall local bloqueando puertos${NC}"
