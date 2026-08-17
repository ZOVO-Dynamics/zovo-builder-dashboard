#!/usr/bin/env bash
set -euo pipefail

if [ ! -f "package.json" ]; then
  echo "Erreur : aucun package.json trouvé ici. Lance ce script depuis ~/zovo-builder-dashboard"
  exit 1
fi

if [ ! -f "src/hooks/useGenesis.ts" ]; then
  echo "Erreur : src/hooks/useGenesis.ts introuvable. As-tu bien lancé install-genesis-dashboard.sh avant ?"
  exit 1
fi

cp "src/hooks/useGenesis.ts" "src/hooks/useGenesis.ts.bak-$(date +%s)"
echo "Sauvegarde créée."

cat > "src/hooks/useGenesis.ts" << 'ZOVOGENESISEOF'
import { useEffect, useState } from "react";
import { GenesisBus, GenesisEvent } from "../core/ZovoGenesisBus";

/**
 * useGenesis
 * -----------
 * Consomme le GenesisBus client (src/core/ZovoGenesisBus.ts, en mémoire).
 * Contrat conservé à l'identique de ce qu'attendent déjà GenesisUI.tsx et
 * LandingUI.tsx : { status, projectedFiles }, sans argument.
 *
 * Ce hook ne parle pas au réseau lui-même — c'est volontaire. Le pont vers
 * le vrai backend (ZovoBridge / WebSocket serveur) se fait via un module
 * séparé qui traduit les événements serveur en GenesisBus.emit(...) côté
 * client, pour que ce hook et les composants existants n'aient jamais à
 * changer, qu'on soit en mode simulé (setTimeout) ou branché en réel.
 */

export interface ProjectedFile {
  id: string;
  file: string;
  action: "create" | "modify";
  message?: string;
}

export type GenesisStatus = "idle" | "thinking" | "writing" | "complete";

export interface UseGenesisResult {
  status: GenesisStatus;
  projectedFiles: ProjectedFile[];
}

export function useGenesis(): UseGenesisResult {
  const [status, setStatus] = useState<GenesisStatus>("idle");
  const [projectedFiles, setProjectedFiles] = useState<ProjectedFile[]>([]);

  useEffect(() => {
    const handleThinkingStart = () => {
      setStatus("thinking");
    };

    const handleFileProjected = (payload: {
      file: string;
      action: "create" | "modify";
      message?: string;
    }) => {
      setStatus("writing");
      setProjectedFiles((prev) => [
        ...prev,
        {
          id: `${payload.file}-${Date.now()}-${Math.random()
            .toString(36)
            .slice(2, 8)}`,
          file: payload.file,
          action: payload.action,
          message: payload.message,
        },
      ]);
    };

    const handleWritingStart = () => {
      setStatus("writing");
    };

    const handleIntegrationComplete = () => {
      setStatus("complete");
      // Laisse les cartes affichées un court instant (effet "Fusion" visuel)
      // avant de les vider et de repasser l'orbe au repos.
      setTimeout(() => {
        setProjectedFiles([]);
        setStatus("idle");
      }, 900);
    };

    GenesisBus.on(GenesisEvent.THINKING_START, handleThinkingStart);
    GenesisBus.on(GenesisEvent.FILE_PROJECTED, handleFileProjected);
    GenesisBus.on(GenesisEvent.WRITING_START, handleWritingStart);
    GenesisBus.on(GenesisEvent.INTEGRATION_COMPLETE, handleIntegrationComplete);

    return () => {
      GenesisBus.off(GenesisEvent.THINKING_START, handleThinkingStart);
      GenesisBus.off(GenesisEvent.FILE_PROJECTED, handleFileProjected);
      GenesisBus.off(GenesisEvent.WRITING_START, handleWritingStart);
      GenesisBus.off(
        GenesisEvent.INTEGRATION_COMPLETE,
        handleIntegrationComplete
      );
    };
  }, []);

  return { status, projectedFiles };
}
ZOVOGENESISEOF

echo " -> src/hooks/useGenesis.ts réécrit (compatible GenesisBus client existant)"
echo ""
echo "=== Vérification TypeScript (tsc --noEmit) ==="
if npx tsc --noEmit; then
  echo "OK : aucune erreur TypeScript."
else
  echo "ATTENTION : erreurs TypeScript ci-dessus a corriger."
  exit 1
fi
