#!/bin/bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR"

# Si el puerto 3000 tiene algún proceso previo trabado, liberarlo limpiamente
PID=$(lsof -ti:3000 2>/dev/null)
if [ -n "$PID" ]; then
    echo "Liberando puerto 3000 ocupado previamente..."
    kill -9 $PID 2>/dev/null
    sleep 0.8
fi

echo "================================================================="
echo "🚀 Iniciando Plataforma Doctor Pyme SG-SST..."
echo "================================================================="
(sleep 1.2 && open http://localhost:3000) &
/usr/bin/ruby server.rb
