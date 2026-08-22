import { createWorker } from "tesseract.js";

export interface OcrResult {
  rawText: string;
  confidence: number;
}

/** Execution locale, WASM (tesseract.js) - aucune donnee envoyee a un service tiers. */
export async function runOcr(buffer: Buffer): Promise<OcrResult> {
  const worker = await createWorker("fra+eng");
  try {
    const { data } = await worker.recognize(buffer);
    return { rawText: data.text, confidence: data.confidence };
  } finally {
    await worker.terminate();
  }
}
