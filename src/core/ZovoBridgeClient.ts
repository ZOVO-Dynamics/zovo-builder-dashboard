import { GenesisBus, GenesisEvent } from "../core/ZovoGenesisBus";

/**
 * ZovoBridgeClient
 * -----------------
 * Pont côté navigateur : ouvre une connexion WebSocket vers le ZovoBridge
 * serveur (monté sur /genesis) et traduit les événements réels du backend
 * en GenesisBus.emit(...) côté client — le même bus déjà consommé par
 * useGenesis.ts / LandingUI.tsx / GenesisUI.tsx.
 *
 * Aucun composant existant n'a besoin de changer : ce module remplace
 * juste la source des événements (WebSocket réel au lieu de setTimeout
 * simulés), en amont du GenesisBus client.
 *
 * Le protocole serveur (ZovoBridge.ts) utilise des types d'événements
 * plus riches (WRITING_PROGRESS, VALIDATION_ERROR, ROLLBACK, etc.) que le
 * GenesisBus client actuel ne connaît pas encore : on ne traduit ici que
 * les 4 événements déjà supportés côté UI, le reste est ignoré sans
 * erreur pour rester tolérant à l'évolution du protocole serveur.
 */

interface ServerGenesisEvent {
  type:
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
  jobId: string;
  timestamp: number;
  payload: Record<string, unknown>;
}

export interface ZovoBridgeClientOptions {
  wsUrl?: string;
}

export class ZovoBridgeClient {
  private socket: WebSocket | null = null;
  private jobId: string;

  constructor(jobId: string, options?: ZovoBridgeClientOptions) {
    this.jobId = jobId;
    const wsUrl = options?.wsUrl ?? defaultWsUrl();
    this.connect(wsUrl);
  }

  private connect(wsUrl: string): void {
    const socket = new WebSocket(wsUrl);
    this.socket = socket;

    socket.onopen = () => {
      socket.send(JSON.stringify({ type: "SUBSCRIBE", jobId: this.jobId }));
    };

    socket.onmessage = (msg) => {
      try {
        const event = JSON.parse(msg.data) as ServerGenesisEvent;
        if (event.jobId !== this.jobId) return;
        this.translate(event);
      } catch {
        // Message non-JSON ignoré, ne casse jamais l'UI.
      }
    };

    socket.onerror = () => {
      // La reconnexion n'est pas gérée ici volontairement : à la charge
      // de l'appelant (ex: LandingUI) de recréer un ZovoBridgeClient si
      // besoin lors d'une nouvelle génération.
    };
  }

  /** Traduit un événement serveur en émission sur le GenesisBus client. */
  private translate(event: ServerGenesisEvent): void {
    switch (event.type) {
      case "THINKING_START": {
        GenesisBus.emit(GenesisEvent.THINKING_START);
        break;
      }
      case "FILE_PROJECTED": {
        const filePath = String(event.payload.filePath ?? "");
        const metadata = event.payload.metadata as
          | { shortDescription?: string }
          | undefined;
        GenesisBus.emit(GenesisEvent.FILE_PROJECTED, {
          file: filePath,
          action: "create",
          message: metadata?.shortDescription,
        });
        break;
      }
      case "WRITING_START": {
        GenesisBus.emit(GenesisEvent.WRITING_START);
        break;
      }
      case "INTEGRATION_COMPLETE": {
        GenesisBus.emit(GenesisEvent.INTEGRATION_COMPLETE);
        break;
      }
      default:
        // WRITING_PROGRESS / VALIDATION_* / ROLLBACK / THINKING_END :
        // pas encore consommés côté UI, ignorés sans erreur.
        break;
    }
  }

  /** À appeler quand l'UI n'a plus besoin de suivre ce job (démontage, nouvelle génération). */
  close(): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ type: "UNSUBSCRIBE", jobId: this.jobId }));
    }
    this.socket?.close();
    this.socket = null;
  }
}

function defaultWsUrl(): string {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!apiUrl) {
    console.warn(
      "NEXT_PUBLIC_API_URL non défini : ZovoBridgeClient ne peut pas déduire l'URL du WebSocket Genesis."
    );
    return "";
  }
  // Convertit https://api.zovo.ca -> wss://api.zovo.ca/genesis
  // (http:// -> ws:// en local/dev)
  const wsBase = apiUrl.replace(/^https:/, "wss:").replace(/^http:/, "ws:");
  return `${wsBase.replace(/\/$/, "")}/genesis`;
}
