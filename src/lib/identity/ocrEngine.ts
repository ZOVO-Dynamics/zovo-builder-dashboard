import { createWorker, type Worker as TesseractWorker } from "tesseract.js";

export interface OcrResult {
  rawText: string;
  confidence: number;
}

/**
 * Sans ce delai, un chargement de modele Tesseract anormalement lent
 * (createWorker() en particulier - telechargement des donnees de langue,
 * contention CPU) bloquait silencieusement la requete jusqu'a ce que le
 * proxy en amont (Cloudflare, ~100s) coupe la connexion - constate en
 * production sur /api/register. Le document est alors simplement traite
 * comme illisible par l'appelant, avec le message clair deja existant,
 * plutot que de laisser la requete pendre. Couvre createWorker() ET
 * recognize() : un premier correctif qui n'entourait que recognize()
 * n'a pas suffi, le blocage se produisait des la creation du worker.
 *
 * 85s plutot que 45s : constate en production que le traitement peut
 * legitimement prendre plus de 45s sur cette instance (probablement
 * telechargement des donnees de langue a chaque appel) - un delai trop
 * court transformait un cas simplement lent en echec systematique. 85s
 * laisse une marge sous le palier ~100s du proxy en amont (Cloudflare)
 * tout en laissant une vraie chance a une reconnaissance qui aurait fini
 * par aboutir. Une lenteur recurrente a ce point reste un signal a
 * investiguer cote infrastructure - ce delai borne l'echec, il ne
 * resout pas la cause.
 */
const OCR_TIMEOUT_MS = 85000;

/** Execution locale, WASM (tesseract.js) - aucune donnee envoyee a un service tiers. */
export async function runOcr(buffer: Buffer, timeoutMs: number = OCR_TIMEOUT_MS): Promise<OcrResult> {
  let timedOut = false;
  const workerBox: { current: TesseractWorker | null } = { current: null };

  const timeout = new Promise<never>((_, reject) => {
    setTimeout(() => {
      timedOut = true;
      reject(new Error("OCR : délai dépassé"));
    }, timeoutMs);
  });

  const workerCreation = createWorker("fra+eng").then((w) => {
    workerBox.current = w;
    return w;
  });

  const work = workerCreation
    .then((w) => w.recognize(buffer))
    .then(({ data }) => ({ rawText: data.text, confidence: data.confidence }));

  try {
    return await Promise.race([work, timeout]);
  } finally {
    if (timedOut) {
      // On ne bloque jamais la reponse (deja rejetee) sur la terminaison du
      // worker : s'il existe deja (bloque dans recognize), on le termine
      // tout de suite ; sinon (creation elle-meme encore en cours), on le
      // termine des qu'il devient disponible, en arriere-plan.
      if (workerBox.current) {
        workerBox.current.terminate().catch(() => {});
      } else {
        workerCreation.then((w) => w.terminate().catch(() => {})).catch(() => {});
      }
    } else {
      await workerBox.current!.terminate();
    }
  }
}
