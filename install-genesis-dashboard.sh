#!/usr/bin/env bash
set -euo pipefail

if [ ! -f "package.json" ]; then
  echo "Erreur : aucun package.json trouvé ici. Lance ce script depuis ~/zovo-builder-dashboard"
  exit 1
fi

mkdir -p src/hooks
echo " -> src/hooks/useGenesis.ts"
cat > "src/hooks/useGenesis.ts" << 'ZOVOGENESISEOF'
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

// ---------------------------------------------------------------------------
// Types partagés avec le backend (à terme : importer depuis un package
// @zovo/genesis-types commun plutôt que dupliquer ces types).
// ---------------------------------------------------------------------------

export type GenesisEventType =
  | "THINKING_START"
  | "THINKING_END"
  | "FILE_PROJECTED"
  | "WRITING_START"
  | "WRITING_PROGRESS"
  | "WRITING_END"
  | "VALIDATION_START"
  | "VALIDATION_ERROR"
  | "INTEGRATION_COMPLETE"
  | "ROLLBACK";

export interface FileVisualMetadata {
  importance: "low" | "medium" | "high" | "critical";
  componentType:
    | "page"
    | "component"
    | "api-route"
    | "schema"
    | "config"
    | "hook"
    | "style"
    | "other";
  shortDescription: string;
}

export interface GenesisEvent {
  type: GenesisEventType;
  jobId: string;
  timestamp: number;
  payload: Record<string, unknown>;
}

/** État d'une carte flottante représentant un fichier en cours de génération. */
export interface FloatingCard {
  filePath: string;
  metadata: FileVisualMetadata;
  status: "projected" | "writing" | "written" | "error" | "fused";
  /** Contenu accumulé au fil du ghost-writing */
  streamedContent: string;
  progressPercent: number;
}

export type GenesisPhase = "idle" | "thinking" | "generating" | "fusing" | "error";

export interface UseGenesisResult {
  /** Phase globale, pilote l'animation de l'orbe central */
  phase: GenesisPhase;
  /** Ce que l'orbe "pense" en ce moment, pour affichage textuel */
  currentIntent: string | null;
  /** Cartes flottantes actives, indexées par filePath */
  cards: FloatingCard[];
  /** true pendant la fenêtre d'animation de fusion (cartes -> explorateur) */
  isFusing: boolean;
  /** Fichiers ayant terminé leur fusion (à retirer des cartes, ajouter à l'arbre) */
  fusedFilePaths: string[];
  /** Connexion WS active */
  isConnected: boolean;
  /** Erreur de connexion ou de rollback la plus récente */
  lastError: string | null;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * useGenesis
 * -----------
 * S'abonne au ZovoBridge (WebSocket) pour un jobId donné et traduit les
 * événements Genesis en état d'animation exploitable par l'UI React.
 * La logique métier ne dicte jamais l'animation directement : c'est
 * toujours un événement business qui déclenche un changement d'état,
 * puis l'UI en tire l'animation (règle d'or Genesis).
 */
export function useGenesis(
  jobId: string | null,
  options?: { wsUrl?: string; fusionDurationMs?: number }
): UseGenesisResult {
  const wsUrl = options?.wsUrl ?? defaultWsUrl();
  const fusionDurationMs = options?.fusionDurationMs ?? 900;

  const [phase, setPhase] = useState<GenesisPhase>("idle");
  const [currentIntent, setCurrentIntent] = useState<string | null>(null);
  const [cardsMap, setCardsMap] = useState<Map<string, FloatingCard>>(new Map());
  const [isFusing, setIsFusing] = useState(false);
  const [fusedFilePaths, setFusedFilePaths] = useState<string[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  const socketRef = useRef<WebSocket | null>(null);

  const updateCard = useCallback(
    (filePath: string, patch: Partial<FloatingCard>) => {
      setCardsMap((prev) => {
        const next = new Map(prev);
        const existing = next.get(filePath);
        if (existing) {
          next.set(filePath, { ...existing, ...patch });
        }
        return next;
      });
    },
    []
  );

  const handleEvent = useCallback(
    (event: GenesisEvent) => {
      switch (event.type) {
        case "THINKING_START": {
          setPhase("thinking");
          setCurrentIntent(String(event.payload.intent ?? ""));
          break;
        }
        case "THINKING_END": {
          setCurrentIntent(null);
          break;
        }
        case "FILE_PROJECTED": {
          setPhase("generating");
          const filePath = String(event.payload.filePath);
          const metadata = event.payload.metadata as FileVisualMetadata;
          setCardsMap((prev) => {
            const next = new Map(prev);
            next.set(filePath, {
              filePath,
              metadata,
              status: "projected",
              streamedContent: "",
              progressPercent: 0,
            });
            return next;
          });
          break;
        }
        case "WRITING_START": {
          updateCard(String(event.payload.filePath), { status: "writing" });
          break;
        }
        case "WRITING_PROGRESS": {
          const filePath = String(event.payload.filePath);
          const chunk = String(event.payload.chunk ?? "");
          const percent = Number(event.payload.percent ?? 0);
          setCardsMap((prev) => {
            const next = new Map(prev);
            const existing = next.get(filePath);
            if (existing) {
              next.set(filePath, {
                ...existing,
                streamedContent: existing.streamedContent + chunk,
                progressPercent: percent,
              });
            }
            return next;
          });
          break;
        }
        case "WRITING_END": {
          const filePath = String(event.payload.filePath);
          const success = Boolean(event.payload.success);
          updateCard(filePath, {
            status: success ? "written" : "error",
            progressPercent: 100,
          });
          break;
        }
        case "VALIDATION_ERROR": {
          const filePath = String(event.payload.filePath);
          updateCard(filePath, { status: "error" });
          setLastError(String(event.payload.message ?? "Erreur de validation"));
          break;
        }
        case "INTEGRATION_COMPLETE": {
          const filePaths = (event.payload.filePaths as string[]) ?? [];
          triggerFusion(filePaths);
          break;
        }
        case "ROLLBACK": {
          setPhase("error");
          setLastError(String(event.payload.reason ?? "Rollback"));
          const filePaths = (event.payload.filePaths as string[]) ?? [];
          setCardsMap((prev) => {
            const next = new Map(prev);
            for (const fp of filePaths) next.delete(fp);
            return next;
          });
          break;
        }
        default:
          break;
      }
    },
    [updateCard]
  );

  // -----------------------------------------------------------------
  // Fusion : les cartes flottantes valides migrent vers l'explorateur.
  // Séquence pilotée par la logique métier (INTEGRATION_COMPLETE),
  // jamais l'inverse.
  // -----------------------------------------------------------------
  const triggerFusion = useCallback(
    (filePaths: string[]) => {
      setPhase("fusing");
      setIsFusing(true);

      // Marque les cartes concernées comme "fused" pour que l'UI déclenche
      // l'animation de trajectoire carte -> explorateur.
      setCardsMap((prev) => {
        const next = new Map(prev);
        for (const fp of filePaths) {
          const existing = next.get(fp);
          if (existing) next.set(fp, { ...existing, status: "fused" });
        }
        return next;
      });

      window.setTimeout(() => {
        setFusedFilePaths((prev) => [...prev, ...filePaths]);
        setCardsMap((prev) => {
          const next = new Map(prev);
          for (const fp of filePaths) next.delete(fp);
          return next;
        });
        setIsFusing(false);
        setPhase("idle");
      }, fusionDurationMs);
    },
    [fusionDurationMs]
  );

  // -----------------------------------------------------------------
  // Connexion WebSocket + abonnement au jobId
  // -----------------------------------------------------------------
  useEffect(() => {
    if (!jobId) return;

    const socket = new WebSocket(wsUrl);
    socketRef.current = socket;

    socket.onopen = () => {
      setIsConnected(true);
      setLastError(null);
      socket.send(JSON.stringify({ type: "SUBSCRIBE", jobId }));
    };

    socket.onmessage = (msg) => {
      try {
        const event = JSON.parse(msg.data) as GenesisEvent;
        if (event.jobId !== jobId) return;
        handleEvent(event);
      } catch {
        // Message non-JSON ignoré, ne casse jamais le flux d'animation.
      }
    };

    socket.onclose = () => setIsConnected(false);
    socket.onerror = () => setLastError("Connexion Genesis interrompue");

    return () => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: "UNSUBSCRIBE", jobId }));
      }
      socket.close();
      socketRef.current = null;
    };
  }, [jobId, wsUrl, handleEvent]);

  const cards = useMemo(() => Array.from(cardsMap.values()), [cardsMap]);

  return {
    phase,
    currentIntent,
    cards,
    isFusing,
    fusedFilePaths,
    isConnected,
    lastError,
  };
}

function defaultWsUrl(): string {
  if (typeof window === "undefined") return "";
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}/genesis`;
}
ZOVOGENESISEOF

echo ""
echo "=== Vérification TypeScript (tsc --noEmit) ==="
if npx tsc --noEmit; then
  echo "OK : aucune erreur TypeScript."
else
  echo "ATTENTION : erreurs TypeScript ci-dessus a corriger."
  exit 1
fi
