// src/core/ZovoGenesisBus.ts
//
// Bus d'événements minimal pour connecter le pipeline de génération (backend,
// via WebSocket/SSE à brancher séparément) à l'UI Genesis (useGenesis.ts).
//
// AUCUNE connexion réseau n'est faite ici — ce module ne fait qu'émettre/
// écouter des événements en mémoire. Il reste à brancher un vrai transport
// (WebSocket, SSE) qui appelle GenesisBus.emit(...) quand le backend envoie
// un événement réel de génération.

export enum GenesisEvent {
  THINKING_START = 'THINKING_START',
  FILE_PROJECTED = 'FILE_PROJECTED',
  WRITING_START = 'WRITING_START',
  INTEGRATION_COMPLETE = 'INTEGRATION_COMPLETE',
}

type Listener = (payload?: any) => void;

class GenesisBusImpl {
  private listeners: Map<GenesisEvent, Set<Listener>> = new Map();

  on(event: GenesisEvent, listener: Listener): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener);
  }

  off(event: GenesisEvent, listener: Listener): void {
    this.listeners.get(event)?.delete(listener);
  }

  emit(event: GenesisEvent, payload?: any): void {
    this.listeners.get(event)?.forEach((listener) => listener(payload));
  }

  removeAllListeners(): void {
    this.listeners.clear();
  }
}

export const GenesisBus = new GenesisBusImpl();
