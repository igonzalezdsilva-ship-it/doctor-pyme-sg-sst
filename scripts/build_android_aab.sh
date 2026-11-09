#!/bin/bash
# ==============================================================================
# SCRIPT DE GENERACIÓN Y FIRMA DE ANDROID APP BUNDLE (.AAB) - DOCTOR PYME
# Package Name: co.doctorpyme.app
# Keystore: android/keystore/doctorpyme-release.keystore
# ==============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$ROOT_DIR"

echo "================================================================="
echo "🤖 DOCTOR PYME: EMPAQUETADOR DE ANDROID APP BUNDLE (.AAB)"
echo "================================================================="
echo "📁 Directorio raíz: $ROOT_DIR"
echo "📦 Package Name: co.doctorpyme.app"
echo "🔑 Keystore: android/keystore/doctorpyme-release.keystore"
echo "-----------------------------------------------------------------"

# Verificar Keystore
if [ -f "$ROOT_DIR/android/keystore/doctorpyme-release.keystore" ]; then
    echo "✓ Keystore de producción presente."
    openssl pkcs12 -info -in "$ROOT_DIR/android/keystore/doctorpyme-release.keystore" -noout -passin pass:DoctorPyme2026* 2>/dev/null && echo "✓ Clave y contraseña validadas con éxito."
else
    echo "⚠️ Keystore no encontrado en android/keystore/. Generando nuevo almacén..."
    mkdir -p "$ROOT_DIR/android/keystore"
    openssl genrsa -out "$ROOT_DIR/android/keystore/doctorpyme-key.pem" 2048
    openssl req -new -x509 -key "$ROOT_DIR/android/keystore/doctorpyme-key.pem" -out "$ROOT_DIR/android/keystore/doctorpyme-cert.pem" -days 10000 -subj "/C=CO/ST=Cundinamarca/L=Bogota/O=Doctor Pyme/OU=Desarrollo SST/CN=Doctor Pyme"
    openssl pkcs12 -export -in "$ROOT_DIR/android/keystore/doctorpyme-cert.pem" -inkey "$ROOT_DIR/android/keystore/doctorpyme-key.pem" -out "$ROOT_DIR/android/keystore/doctorpyme-release.keystore" -name doctorpyme -passout pass:DoctorPyme2026*
fi

# Extraer y mostrar huella digital SHA-256 para Google Play
echo "-----------------------------------------------------------------"
echo "🔐 HUELLA DIGITAL SHA-256 DEL CERTIFICADO:"
SHA256=$(openssl x509 -in "$ROOT_DIR/android/keystore/doctorpyme-cert.pem" -noout -fingerprint -sha256 2>/dev/null | cut -d'=' -f2)
echo "$SHA256"
echo "-----------------------------------------------------------------"
echo "📌 Esta huella ya está configurada en .well-known/assetlinks.json"

echo "
=================================================================
MÉTODOS DE COMPILACIÓN A ARCHIVO .AAB DISPONIBLES:
=================================================================
OPCIÓN A (Recomendada en 1 Clic con GitHub Actions CI/CD):
1. Sube tu código al repositorio en GitHub.
2. Ve a la pestaña 'Actions' > 'Generar Android App Bundle (.aab) Doctor Pyme'.
3. Presiona 'Run workflow'.
4. Descarga el archivo 'DoctorPyme-Release-AAB.zip' que contendrá el .aab firmado.

OPCIÓN B (PWABuilder - Método Oficial de Microsoft & Google Play):
1. Ingresa a https://www.pwabuilder.com
2. Digita la URL: https://doctorpyme.co/app
3. Haz clic en 'Package for Stores' > 'Android (Google Play)'.
4. Selecciona 'Signing key' > 'Upload key' y sube el archivo:
   $ROOT_DIR/android/keystore/doctorpyme-release.keystore
   - Key alias: doctorpyme
   - Password: DoctorPyme2026*
   - Package ID: co.doctorpyme.app
5. Presiona 'Generate Package' y descarga tu archivo .aab firmado listo.

OPCIÓN C (Bubblewrap CLI local en terminal):
1. Instalar bubblewrap: npm install -g @bubblewrap/cli
2. Inicializar proyecto: bubblewrap init --manifest=https://doctorpyme.co/manifest.json
3. Compilar: bubblewrap build
"
