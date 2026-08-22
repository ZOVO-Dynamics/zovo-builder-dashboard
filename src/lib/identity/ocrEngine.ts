import { createWorker } from "tesseract.js";

export interface OcrResult {
  rawText: string;
  confidence: number;
}

/**
 * Sans ce delai, un chargement de modele Tesseract anormalement lent
 * (contention CPU, cache de langue absent) bloquait silencieusement la
 * requete jusqu'a ce que le proxy en amont (Cloudflare, ~100s) coupe la
 * connexion - constate en production sur /api/register. Le document est
 * alors simplement traite comme illisible par l'appelant, avec le message
 * clair deja existant, plutot que de laisser la requete pendre.
 */
const OCR_TIMEOUT_MS = 45000;

/** Execution locale, WASM (tesseract.js) - aucune donnee envoyee a un service tiers. */
export async function runOcr(buffer: Buffer, timeoutMs: number = OCR_TIMEOUT_MS): Promise<OcrResult> {
  const worker = await createWorker("fra+eng");
  let timedOut = false;
  try {
    const timeout = new Promise<never>((_, reject) => {
      setTimeout(() => {
        timedOut = true;
        reject(new Error("OCR : délai dépassé"));
      }, timeoutMs);
    });
    const { data } = await Promise.race([worker.recognize(buffer), timeout]);
    return { rawText: data.text, confidence: data.confidence };
  } finally {
    // En cas de timeout, le worker peut encore etre occupe par le job
    // interne : on ne bloque pas la reponse dessus, on le termine en
    // arriere-plan et on avale l'erreur (deja hors du chemin critique).
    if (timedOut) {
      worker.terminate().catch(() => {});
    } else {
      await worker.terminate();
    }
  }
}
