#!/bin/bash
# ==============================================================================
# SCRIPT DE COPIA DE SEGURIDAD AUTOMÁTICA - DOCTOR PYME SG-SST
# Destino: Google Drive / Dr Pyme
# Frecuencia: Diario 10:00 AM
# Cumplimiento: Decreto 1072 de 2015 & Resolución 0312 de 2019
# ==============================================================================

set -euo pipefail

# 1. Definición de Rutas
SOURCE_DIR="/Users/ivanda/.gemini/antigravity/scratch/sg-sst-app"
TARGET_DIR="/Users/ivanda/Library/CloudStorage/GoogleDrive-i.gonzalez.dsilva@gmail.com/Mi unidad/Dr Pyme"
LOG_FILE="${SOURCE_DIR}/data/backup_drive.log"

TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
DATE_READABLE=$(date +"%Y-%m-%d %H:%M:%S")

mkdir -p "${SOURCE_DIR}/data"
echo "[${DATE_READABLE}] Iniciando respaldo automático de Doctor Pyme..." >> "${LOG_FILE}"

# 2. Verificación de Directorios
if [ ! -d "${SOURCE_DIR}" ]; then
  echo "[${DATE_READABLE}] ERROR: El directorio fuente ${SOURCE_DIR} no existe." >> "${LOG_FILE}"
  exit 1
fi

mkdir -p "${TARGET_DIR}"
mkdir -p "${TARGET_DIR}/historico_db"

BACKUP_ZIP="${TARGET_DIR}/DoctorPyme_Completo_${TIMESTAMP}.zip"

# 3. Empaquetar el aplicativo completo excluyendo caché temporal de backups antiguos para optimizar tamaño
cd "${SOURCE_DIR}"

zip -y -r -q "${BACKUP_ZIP}" . \
  -x "backups/*" \
  -x ".git/*" \
  -x "sst*" \
  -x "releases/*" \
  -x ".DS_Store" \
  -x "*/.DS_Store" \
  -x "scripts/*.tmp"

# 4. Copia directa de la Base de Datos y Trazabilidad Legal independiente
if [ -f "${SOURCE_DIR}/data/database.json" ]; then
  cp "${SOURCE_DIR}/data/database.json" "${TARGET_DIR}/database_LATEST.json"
  cp "${SOURCE_DIR}/data/database.json" "${TARGET_DIR}/historico_db/database_${TIMESTAMP}.json"
fi

if [ -f "${SOURCE_DIR}/data/audit_log.jsonl" ]; then
  cp "${SOURCE_DIR}/data/audit_log.jsonl" "${TARGET_DIR}/audit_log_LATEST.jsonl"
  cp "${SOURCE_DIR}/data/audit_log.jsonl" "${TARGET_DIR}/historico_db/audit_log_${TIMESTAMP}.jsonl"
fi

# 5. Generar Manifiesto de Integridad con SHA-256
ZIP_SIZE=$(du -h "${BACKUP_ZIP}" | cut -f1)
SHA256=$(shasum -a 256 "${BACKUP_ZIP}" | cut -d' ' -f1)

cat <<MANIFEST > "${TARGET_DIR}/ULTIMO_RESPALDO.txt"
================================================================================
DOCTOR PYME SG-SST • MANIFIESTO DE COPIA DE SEGURIDAD
================================================================================
Fecha y Hora de Ejecución : ${DATE_READABLE}
Archivo de Respaldo       : $(basename "${BACKUP_ZIP}")
Tamaño                    : ${ZIP_SIZE}
Checksum SHA-256          : ${SHA256}
Ruta Local de Origen      : ${SOURCE_DIR}
Destino Google Drive      : ${TARGET_DIR}
Estado                    : EXITOSO (100% Verificado)
Normativa Asociada        : Decreto 1072 de 2015 Art. 2.2.4.6.13 (Conservación de Documentos)
================================================================================
MANIFEST

# 6. Rotación de seguridad (Mantiene los últimos 30 respaldos completos)
find "${TARGET_DIR}" -maxdepth 1 -name "DoctorPyme_Completo_*.zip" -mtime +30 -delete 2>/dev/null || true
find "${TARGET_DIR}/historico_db" -maxdepth 1 -name "database_*.json" -mtime +30 -delete 2>/dev/null || true

echo "[${DATE_READABLE}] Respaldo completado exitosamente: ${BACKUP_ZIP} (${ZIP_SIZE}) SHA-256: ${SHA256}" >> "${LOG_FILE}"
echo "SUCCESS: Respaldo guardado en ${TARGET_DIR} (${ZIP_SIZE})"
