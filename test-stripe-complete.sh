#!/bin/bash

cd ~/zovo-builder-dashboard || exit

echo "======================================"
echo " ZOVO STRIPE COMPLETE DIAGNOSTIC"
echo "======================================"

echo ""
echo "=== 1. VARIABLES STRIPE ==="

grep STRIPE .env && echo "Variables Stripe détectées ✅"


echo ""
echo "=== 2. CHECKOUT ROUTE ==="

sed -n '1,220p' src/app/api/checkout/route.ts


echo ""
echo "=== 3. WEBHOOK ROUTE ==="

sed -n '1,260p' src/app/api/webhooks/stripe/route.ts


echo ""
echo "=== 4. DATABASE STRIPE ==="

grep -n "stripe\|subscription\|plan\|status" prisma/schema.prisma


echo ""
echo "=== 5. BUILD CHECK ==="

npm run build


echo ""
echo "======================================"
echo " FIN DIAGNOSTIC STRIPE"
echo "======================================"

