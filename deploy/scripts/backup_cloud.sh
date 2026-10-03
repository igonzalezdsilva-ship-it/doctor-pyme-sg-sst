#!/bin/bash
# =============================================================================
# Script de Respaldo Diario Automático para Doctor Pyme SG-SST
# Ubicación en VPS: /usr/local/bin/doctorpyme_backup.sh
# Ejecutar en crontab diario: 0 2 * * * /usr/local/bin/doctorpyme_backup.sh
# =============================================================================

APP_DIR="/var/www/doctorpyme/sst"
BACKUP_DEST="/var/backups/doctorpyme"
DATE=$(date +'%Y-%m-%d_%H-%M-%S')
TARGET_ZIP="${BACKUP_DEST}/backup_db_${DATE}.tar.gz"

mkdir -p "$BACKUP_DEST"

# 1. Comprimir base de datos física, backups y auditoría
tar -czf "$TARGET_ZIP" -C "$APP_DIR" data backups

# 2. Retener únicamente los últimos 30 respaldos locales
find "$BACKUP_DEST" -name "backup_db_*.tar.gz" -type f -mtime +30 -delete

echo "[$(date)] Respaldo generado con éxito: $TARGET_ZIP ($(du -h "$TARGET_ZIP" | cut -f1))"

# 3. Opcional: Sincronización hacia la nube (Backblaze B2, Google Cloud Storage o AWS S3)
# Descomentar si se configura Rclone o AWS CLI:
# aws s3 cp "$TARGET_ZIP" s3://doctorpyme-backups-colombia/
# rclone copy "$TARGET_ZIP" b2:doctorpyme-backups/
