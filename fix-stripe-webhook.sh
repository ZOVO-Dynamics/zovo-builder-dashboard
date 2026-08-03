#!/bin/bash

set -e

FILE="src/app/api/webhooks/stripe/route.ts"

echo "=== Backup ==="
cp "$FILE" "$FILE.backup.$(date +%Y%m%d-%H%M%S)"

python3 <<'PY'
from pathlib import Path

path = Path("src/app/api/webhooks/stripe/route.ts")

text = path.read_text()

if 'case "customer.subscription.created"' in text:
    print("Le case existe déjà.")
    exit()

needle = '      case "customer.subscription.updated":'

insert = '''
      case "customer.subscription.created": {
        const subscription = event.data.object as Stripe.Subscription;

        await prisma.subscription.upsert({
          where: {
            stripeSubscriptionId: subscription.id,
          },
          update: {
            status: subscription.status,
            stripePriceId: subscription.items.data[0]?.price.id,
            currentPeriodEnd: new Date(
              (subscription as any).current_period_end * 1000
            ),
          },
          create: {
            stripeSubscriptionId: subscription.id,
            stripeCustomerId: subscription.customer as string,
            stripePriceId: subscription.items.data[0]?.price.id,
            status: subscription.status,
            currentPeriodEnd: new Date(
              (subscription as any).current_period_end * 1000
            ),
          },
        });

        break;
      }

'''

if needle not in text:
    raise Exception("Bloc customer.subscription.updated introuvable")

text = text.replace(needle, insert + needle)

path.write_text(text)

print("Ajout terminé.")
PY

echo "=== Vérification ==="
grep -n "customer.subscription.created" "$FILE"

echo "=== Build ==="
npm run build

echo "=== Restart ==="
sudo systemctl restart zovo-dashboard

sudo systemctl status zovo-dashboard --no-pager

