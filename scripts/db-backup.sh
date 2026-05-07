#!/usr/bin/env bash
# =============================================================
#  db-backup.sh — Fleet Care SaaS database backup
#
#  Genera un pg_dump de la BD apuntada por DIRECT_URL (conexión
#  directa Neon, sin PgBouncer). Los backups se guardan en
#  backups/db/ con timestamp y etiqueta de entorno.
#
#  Uso directo:
#    ./scripts/db-backup.sh [etiqueta]
#
#  Vía pnpm (usa .env activo):
#    pnpm db:backup                    # etiqueta "manual"
#    pnpm db:backup:staging            # apunta a .env.staging
#    pnpm db:backup:production         # apunta a .env.production
#
#  El archivo generado:
#    backups/db/fleet-care_<entorno>_<timestamp>.sql.gz
#
#  Para restaurar un backup:
#    gunzip -c backups/db/<archivo>.sql.gz | psql "$DIRECT_URL"
#
#  IMPORTANTE: pg_dump usa DIRECT_URL (puerto 5432), no DATABASE_URL
#  (PgBouncer puerto 6432) porque PgBouncer no soporta COPY protocol.
# =============================================================

set -euo pipefail

LABEL="${1:-manual}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="backups/db"
BACKUP_FILE="${BACKUP_DIR}/fleet-care_${LABEL}_${TIMESTAMP}.sql.gz"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'

info()    { echo -e "${BLUE}[backup]${NC} $*"; }
success() { echo -e "${GREEN}[backup]${NC} $*"; }
warn()    { echo -e "${YELLOW}[backup]${NC} $*"; }
error()   { echo -e "${RED}[backup]${NC} $*"; exit 1; }

# Verificar que pg_dump está instalado
if ! command -v pg_dump &> /dev/null; then
  error "pg_dump no encontrado. Instalá postgresql-client: sudo apt install postgresql-client"
fi

# Cargar .env si no se inyectó externamente (uso directo del script)
if [ -z "${DIRECT_URL:-}" ]; then
  if [ -f .env ]; then
    # shellcheck disable=SC1091
    set -a; source .env; set +a
  else
    error "No se encontró .env y DIRECT_URL no está definida"
  fi
fi

if [ -z "${DIRECT_URL:-}" ]; then
  error "DIRECT_URL no está definida en .env. Necesaria para pg_dump (conexión directa Neon)."
fi

# Detectar entorno por endpoint en la URL
if [[ "$DIRECT_URL" == *"ep-morning-glitter-an8fh8tp"* ]]; then
  ENV_NAME="production"
elif [[ "$DIRECT_URL" == *"ep-bitter-bonus-ai6r3tr5"* ]]; then
  ENV_NAME="staging"
else
  ENV_NAME="local"
fi

# Advertencia si es producción
if [ "$ENV_NAME" = "production" ]; then
  warn "Haciendo backup de PRODUCCIÓN (${ENV_NAME})"
fi

info "Entorno detectado: ${ENV_NAME}"
info "Destino: ${BACKUP_FILE}"

# Crear directorio si no existe
mkdir -p "$BACKUP_DIR"

# Correr pg_dump y comprimir
info "Corriendo pg_dump..."
if pg_dump "$DIRECT_URL" --no-owner --no-acl | gzip > "$BACKUP_FILE"; then
  SIZE=$(du -sh "$BACKUP_FILE" | cut -f1)
  success "Backup completado: ${BACKUP_FILE} (${SIZE})"
  echo ""
  echo -e "  Para restaurar:"
  echo -e "  ${YELLOW}gunzip -c ${BACKUP_FILE} | psql \"\$DIRECT_URL\"${NC}"
else
  rm -f "$BACKUP_FILE"
  error "pg_dump falló. Backup eliminado."
fi
