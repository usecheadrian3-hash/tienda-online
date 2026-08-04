#!/usr/bin/env bash
set -e

echo "--> Instalando dependencias del backend"
pip install -r backend/requirements.txt

echo "--> Construyendo el frontend"
cd frontend
npm ci || npm install
npm run build
cd ..

echo "--> Build completado"
