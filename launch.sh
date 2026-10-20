#!/bin/bash
# =============================================================================
# Lanzador Oficial Doctor Pyme SG-SST
# =============================================================================

APP_DIR="/Users/ivanda/.gemini/antigravity/scratch/sg-sst-app"
URL="http://localhost:3000"

# Comprobar si el puerto 3000 ya esta activo
if ! lsof -i :3000 > /dev/null 2>&1; then
    cd "$APP_DIR" || exit 1
    nohup /usr/bin/ruby server.rb > /dev/null 2>&1 &
    sleep 1.2
fi

# Abrir la aplicacion en el navegador predeterminado
open "$URL"
