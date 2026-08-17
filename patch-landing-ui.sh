#!/usr/bin/env bash
set -euo pipefail

FILE="src/components/genesis/LandingUI.tsx"

if [ ! -f "$FILE" ]; then
  echo "Erreur : $FILE introuvable. Lance ce script depuis ~/zovo-builder-dashboard"
  exit 1
fi

if grep -q "ZovoBridgeClient" "$FILE"; then
  echo "Le patch semble deja applique. Rien a faire."
  exit 0
fi

cp "$FILE" "${FILE}.bak-$(date +%s)"
echo "Sauvegarde creee (LandingUI.tsx)."

python3 - "$FILE" << 'PYEOF'
import sys, re

path = sys.argv[1]
with open(path) as f:
    content = f.read()

# 1. Ajoute l'import de ZovoBridgeClient juste apres l'import de ZovoGenesisBus
import_pattern = re.compile(
    r'(import\s*\{\s*GenesisBus\s*,\s*GenesisEvent\s*\}\s*from\s*[\'"]\.\./\.\./core/ZovoGenesisBus[\'"]\s*;)'
)
if not import_pattern.search(content):
    print("ATTENTION : import GenesisBus non trouve, patch d'import non applique.")
    sys.exit(1)

content = import_pattern.sub(
    r'\1\nimport { ZovoBridgeClient } from \'../../core/ZovoBridgeClient\';',
    content,
    count=1
)

# 2. Remplace le handleSubmit simule par un vrai appel API + ZovoBridgeClient
old_submit_pattern = re.compile(
    r'const\s+handleSubmit\s*=\s*\(e:\s*React\.FormEvent\)\s*=>\s*\{.*?\n  \};',
    re.DOTALL
)

match = old_submit_pattern.search(content)
if not match:
    print("ATTENTION : handleSubmit non trouve meme avec regex tolerante, patch NON applique.")
    sys.exit(1)

new_submit = '''const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue) return;

    const jobId = `job-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const bridge = new ZovoBridgeClient(jobId);

    const prompt = inputValue;
    setInputValue("");

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, jobId }),
      });
      await res.json();
    } catch (err) {
      console.error("Erreur de génération Genesis:", err);
    } finally {
      // Laisse le temps au dernier événement (INTEGRATION_COMPLETE) d'arriver
      // avant de fermer la connexion WebSocket de ce job.
      setTimeout(() => bridge.close(), 2000);
    }
  };'''

content = content[:match.start()] + new_submit + content[match.end():]

with open(path, "w") as f:
    f.write(content)
print("LandingUI.tsx patche : handleSubmit branche sur le vrai backend via ZovoBridgeClient.")
PYEOF

echo ""
echo "=== Vérification TypeScript (tsc --noEmit) ==="
if npx tsc --noEmit; then
  echo "OK : aucune erreur TypeScript."
else
  echo "ATTENTION : erreurs TypeScript ci-dessus a corriger."
  exit 1
fi
