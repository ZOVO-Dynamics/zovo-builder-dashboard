// src/core/JobEventLog.ts
//
// Journal d'événements en mémoire, par jobId, pour alimenter l'UI Genesis
// (voir src/core/ZovoGenesisBus.ts côté frontend) via le endpoint de statut
// déjà utilisé pour le polling de progression (3s, GeneratorPanel.tsx).
//
// Volontairement en mémoire, pas de migration Prisma : cohérent avec le
// risque déjà accepté ailleurs dans le pipeline (un redémarrage du service
// pendant qu'un job tourne le tue déjà silencieusement) — un redémarrage
// perd aussi ce journal, sans aggraver la situation existante.

export interface JobEvent {
  type: "THINKING_START" | "FILE_PROJECTED" | "WRITING_START" | "INTEGRATION_COMPLETE";
  payload?: Record<string, unknown>;
  ts: number;
}

const jobEvents = new Map<string, JobEvent[]>();

/** Ajoute un événement au journal d'un job (créé implicitement au premier appel). */
export function pushJobEvent(
  jobId: string,
  type: JobEvent["type"],
  payload?: Record<string, unknown>
): void {
  const list = jobEvents.get(jobId) ?? [];
  list.push({ type, payload, ts: Date.now() });
  jobEvents.set(jobId, list);
}

/** Événements après l'index `since` (exclusif) — pour un polling incrémental côté frontend. */
export function getJobEventsSince(jobId: string, since: number): JobEvent[] {
  const list = jobEvents.get(jobId) ?? [];
  if (since <= 0) return list;
  return list.slice(since);
}

/** Nombre total d'événements enregistrés pour ce job — sert de curseur au prochain poll. */
export function getJobEventCount(jobId: string): number {
  return (jobEvents.get(jobId) ?? []).length;
}

/** Nettoyage explicite — à appeler après complétion + délai, pour éviter une fuite mémoire indéfinie sur un serveur longue durée. */
export function clearJobEvents(jobId: string): void {
  jobEvents.delete(jobId);
}
