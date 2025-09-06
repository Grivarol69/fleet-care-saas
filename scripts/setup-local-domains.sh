#!/bin/bash

# Script para configurar dominios locales para testing de multitenant
# Ejecutar con: sudo bash scripts/setup-local-domains.sh

echo "🚀 Configurando dominios locales para Fleet Care..."

# Backup del archivo hosts actual
sudo cp /etc/hosts /etc/hosts.backup.$(date +%Y%m%d_%H%M%S)

# Agregar entradas para Fleet Care
echo "# Fleet Care - Multitenant Local Development" | sudo tee -a /etc/hosts
echo "127.0.0.1 admin.localhost" | sudo tee -a /etc/hosts
echo "127.0.0.1 tenant1.localhost" | sudo tee -a /etc/hosts
echo "127.0.0.1 tenant2.localhost" | sudo tee -a /etc/hosts  
echo "127.0.0.1 transportes-abc.localhost" | sudo tee -a /etc/hosts
echo "127.0.0.1 logistica-xyz.localhost" | sudo tee -a /etc/hosts

echo "✅ Dominios locales configurados!"
echo ""
echo "Ahora puedes acceder a:"
echo "  🏠 App principal: http://localhost:3000"
echo "  👑 Super Admin:   http://admin.localhost:3000" 
echo "  🏢 Tenant 1:      http://tenant1.localhost:3000"
echo "  🏢 Tenant 2:      http://tenant2.localhost:3000"
echo ""
echo "⚠️  Recuerda ejecutar 'pnpm dev' para iniciar el servidor"