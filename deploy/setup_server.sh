#!/bin/bash
# =============================================================================
# Script de Aprovisionamiento Automático para Ubuntu 22.04 / 24.04 LTS
# Doctor Pyme SG-SST (www.doctorpyme.co y www.doctorpyme.co/sst)
# =============================================================================
set -e

echo "🚀 Iniciando aprovisionamiento del servidor para Doctor Pyme..."

# 1. Actualizar repositorios e instalar paquetes base
sudo apt update && sudo apt upgrade -y
sudo apt install -y nginx ruby certbot python3-certbot-nginx git ufw curl unzip

# 2. Configurar Firewall UFW
echo "🛡️ Configurando Firewall..."
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable

# 3. Crear directorios de la aplicación
echo "📁 Preparando directorios en /var/www/doctorpyme..."
sudo mkdir -p /var/www/doctorpyme/sst
sudo mkdir -p /var/www/doctorpyme/landing
sudo mkdir -p /var/backups/doctorpyme
sudo mkdir -p /var/log/doctorpyme

# 4. Asignar permisos al usuario www-data
sudo chown -R www-data:www-data /var/www/doctorpyme
sudo chmod -R 775 /var/www/doctorpyme

echo "✅ Aprovisionamiento base completado."
echo "👉 Ahora descomprime tu release v4.4 en /var/www/doctorpyme/sst"
echo "👉 Copia landing/ en /var/www/doctorpyme/landing"
echo "👉 Copia doctorpyme.conf a /etc/nginx/sites-available/ y activa con certbot"
