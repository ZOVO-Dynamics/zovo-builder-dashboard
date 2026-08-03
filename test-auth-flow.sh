#!/bin/bash

cd ~/zovo-builder-dashboard || exit

echo "=============================="
echo " ZOVO AUTH FLOW TEST"
echo "=============================="

echo ""
echo "=== LOGIN API ==="

curl -i -X POST http://localhost:3001/api/auth/callback/credentials \
-H "Content-Type: application/x-www-form-urlencoded" \
-d "email=test6@zovo.ca&password=Test123456&redirect=false"

echo ""

echo ""
echo "=== AUTH ROUTES ==="

curl -s http://localhost:3001/api/auth/providers

echo ""

echo "=============================="
echo " FIN AUTH TEST"
echo "=============================="

