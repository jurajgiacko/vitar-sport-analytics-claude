#!/bin/bash
# VITAR Sport Analytics - Update Script
# Dvojklik na tento súbor spustí aktualizáciu

cd "$(dirname "$0")"

echo "=========================================="
echo "VITAR Sport Analytics - Aktualizácia"
echo "=========================================="
echo ""

# Spusti Python analytics
echo "1. Spracovávam XML súbory..."
python3 analytics.py

echo ""
echo "2. Ukladám zmeny do Git..."
git add data.js items.js

# Skontroluj či sú zmeny
if git diff --staged --quiet; then
    echo "   Žiadne nové dáta na uloženie."
else
    git commit -m "Update data $(date +%Y-%m-%d)"
    echo ""
    echo "3. Posielam na GitHub..."
    git push
    echo ""
    echo "=========================================="
    echo "HOTOVO! Webovka sa aktualizuje o chvíľu."
    echo "https://vitar-sport-analytics-claude.vercel.app/"
    echo "=========================================="
fi

echo ""
echo "Stlač Enter pre zatvorenie..."
read
