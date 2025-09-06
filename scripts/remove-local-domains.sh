#!/bin/bash

# Script para remover dominios locales de Fleet Care
# Ejecutar con: sudo bash scripts/remove-local-domains.sh

echo "🧹 Removiendo dominios locales de Fleet Care..."

# Crear archivo temporal sin las líneas de Fleet Care
sudo grep -v "Fleet Care\|admin.localhost\|tenant1.localhost\|tenant2.localhost\|transportes-abc.localhost\|logistica-xyz.localhost" /etc/hosts > /tmp/hosts_clean

# Reemplazar el archivo hosts
sudo cp /tmp/hosts_clean /etc/hosts

# Limpiar archivo temporal
rm /tmp/hosts_clean

echo "✅ Dominios locales removidos!"
echo "💾 Si necesitas restaurar el backup original, están en /etc/hosts.backup.*"