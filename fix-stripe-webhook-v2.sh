#!/bin/bash
set -e

FILE="src/app/api/webhooks/stripe/route.ts"

echo "=== Backup ==="
cp "$FILE" "$FILE.backup.$(date +%Y%m%d-%H%M%S)"

python3 <<'PY'
from pathlib import Path

path = Path("src/app/api/webhooks/stripe/route.ts")
text = path.read_text()

start_marker = '      case "customer.subscription.created": {'
end_marker = '      case "customer.subscription.updated":'

start_idx = text.find(start_marker)
end_idx = text.find(end_marker)

if start_idx == -1 or end_idx == -1:
    raise Exception("Marqueurs introuvables - vérifier le fichier manuellement")

replacement = '''      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;

        await prisma.subscription.updateMany({
          where: { stripeSubscriptionId: subscription.id },
          data: {
            status: subscription.status,
            stripePriceId: subscription.items.data[0]?.price.id,
            currentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
          },
        });
        break;
      }

'''

# On coupe tout entre start_marker et le prochain "default:" (qui suit updated/deleted)
default_idx = text.find('      default:', end_idx)
if default_idx == -1:
    raise Exception("Bloc 'default:' introuvable après le case updated/deleted")

new_text = text[:start_idx] + replacement + text[default_idx:]
path.write_text(new_text)

print("Fusion des cases terminée.")
PY

echo "=== Vérification ==="
grep -n "customer.subscription" "$FILE"

echo "=== Build ==="
npm run build

echo "=== Restart ==="
sudo systemctl restart zovo-dashboard
sudo systemctl status zovo-dashboard --no-pager
