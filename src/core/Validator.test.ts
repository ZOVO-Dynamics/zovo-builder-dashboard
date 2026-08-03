import { describe, it, expect } from "vitest";
import { extractFileErrors } from "./Validator";

describe("extractFileErrors", () => {
  it("extrait une seule erreur pour un seul fichier", () => {
    const output = `src/app/page.tsx(10,5): error TS2322: Type 'string' is not assignable to type 'number'.`;
    const result = extractFileErrors(output);

    expect(result.size).toBe(1);
    expect(result.get("src/app/page.tsx")).toEqual([
      "error TS2322: Type 'string' is not assignable to type 'number'.",
    ]);
  });

  it("regroupe plusieurs erreurs pour un même fichier", () => {
    const output = [
      `src/app/page.tsx(10,5): error TS2322: Type 'string' is not assignable to type 'number'.`,
      `src/app/page.tsx(15,2): error TS2304: Cannot find name 'foo'.`,
    ].join("\n");

    const result = extractFileErrors(output);

    expect(result.size).toBe(1);
    expect(result.get("src/app/page.tsx")).toHaveLength(2);
  });

  it("sépare les erreurs de fichiers différents", () => {
    const output = [
      `src/app/page.tsx(10,5): error TS2322: Type mismatch.`,
      `src/lib/utils.ts(3,1): error TS2304: Cannot find name 'bar'.`,
    ].join("\n");

    const result = extractFileErrors(output);

    expect(result.size).toBe(2);
    expect(result.has("src/app/page.tsx")).toBe(true);
    expect(result.has("src/lib/utils.ts")).toBe(true);
  });

  it("retourne une map vide si aucune erreur détectée", () => {
    const output = "Compilation successful, no errors found.";
    const result = extractFileErrors(output);

    expect(result.size).toBe(0);
  });

  it("ignore les lignes qui ne matchent pas le format attendu", () => {
    const output = [
      `Some random log line`,
      `src/app/page.tsx(10,5): error TS2322: Real error.`,
      `Another unrelated line`,
    ].join("\n");

    const result = extractFileErrors(output);

    expect(result.size).toBe(1);
    expect(result.get("src/app/page.tsx")).toEqual(["error TS2322: Real error."]);
  });
});
