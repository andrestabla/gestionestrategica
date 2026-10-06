#!/bin/zsh
# ──────────────────────────────────────────────────────────────────
#  4Shine Empresas · Plataforma de gestión estratégica
#  Doble clic para encender el servidor local en http://localhost:3000
#  Deja esta ventana abierta mientras uses la plataforma.
#  Para apagarla: Ctrl+C en esta ventana (o simplemente ciérrala).
# ──────────────────────────────────────────────────────────────────
export PATH="/usr/local/bin:/opt/homebrew/bin:$PATH"
cd "$(dirname "$0")"

URL="http://localhost:3000"

echo ""
echo "  ▄ 4SHINE EMPRESAS"
echo "  Plataforma de gestión estratégica"
echo ""

# Si ya está encendida, solo abre el navegador
if curl -s -o /dev/null --max-time 2 "$URL"; then
  echo "  La plataforma ya está corriendo en $URL"
  open "$URL"
  exit 0
fi

# Primera vez: instalar dependencias
if [ ! -d node_modules ]; then
  echo "  Instalando dependencias (solo la primera vez, puede tardar unos minutos)…"
  npm install || { echo "  ✗ Falló la instalación. Revisa la conexión a internet."; read -r; exit 1; }
fi

# Abre el navegador apenas el servidor responda
(
  for i in {1..90}; do
    if curl -s -o /dev/null --max-time 1 "$URL"; then
      open "$URL"
      exit 0
    fi
    sleep 1
  done
) &

echo "  Encendiendo el servidor en $URL …"
echo "  El navegador se abrirá automáticamente cuando esté listo."
echo ""
npm run dev
