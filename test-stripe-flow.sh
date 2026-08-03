#!/bin/bash

cd ~/zovo-builder-dashboard || exit

echo "======================================"
echo "      ZOVO STRIPE FLOW CHECK"
echo "======================================"

echo ""
echo "=== 1. STRIPE ENV ==="

if grep -q "STRIPE_SECRET_KEY" .env; then
    echo "STRIPE_SECRET_KEY trouvée ✅"
else
    echo "STRIPE_SECRET_KEY absente ❌"
fi

if grep -q "STRIPE_WEBHOOK_SECRET" .env; then
    echo "STRIPE_WEBHOOK_SECRET trouvé ✅"
else
    echo "STRIPE_WEBHOOK_SECRET absent ❌"
fi


echo ""
echo "=== 2. CHECKOUT ROUTE ==="

if [ -f src/app/api/checkout/route.ts ]; then
    echo "Route checkout présente ✅"

    grep -n "stripe.checkout.sessions.create" src/app/api/checkout/route.ts
    grep -n "metadata" src/app/api/checkout/route.ts
    grep -n "userId" src/app/api/checkout/route.ts

else
    echo "Route checkout absente ❌"
fi


echo ""
echo "=== 3. WEBHOOK STRIPE ==="

if [ -f src/app/api/webhooks/stripe/route.ts ]; then
    echo "Webhook présent ✅"

    grep -n "checkout.session.completed" src/app/api/webhooks/stripe/route.ts
    grep -n "subscription" src/app/api/webhooks/stripe/route.ts
    grep -n "stripeCustomerId" src/app/api/webhooks/stripe/route.ts

else
    echo "Webhook absent ❌"
fi


echo ""
echo "=== 4. PRISMA STRIPE FIELDS ==="

grep -R "stripeCustomerId" prisma/schema.prisma && echo "Stripe Customer DB OK ✅"

grep -R "subscription" prisma/schema.prisma && echo "Subscription DB OK ✅"

grep -R "plan" prisma/schema.prisma && echo "Plan DB OK ✅"


echo ""
echo "=== 5. CHECK API CHECKOUT ==="

curl -i \
-X POST \
http://localhost:3001/api/checkout \
-H "Content-Type: application/json" \
-d '{}'


echo ""
echo ""
echo "======================================"
echo "       FIN STRIPE CHECK"
echo "======================================"

