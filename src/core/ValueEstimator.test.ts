import { describe, it, expect } from "vitest";
import {
  estimateProjectValue,
  inferFeatures,
  VALUE_MIN_CENTS,
  VALUE_MAX_CENTS,
  VALUE_TIER_BASE_CENTS,
} from "./ValueEstimator";

describe("inferFeatures", () => {
  it("détecte l'authentification via ses composants connus", () => {
    const features = inferFeatures({ components: ["AuthProvider", "LoginForm"], dependencies: [] });
    expect(features).toContain("authentication");
  });

  it("détecte les paiements via la dépendance stripe", () => {
    const features = inferFeatures({ components: [], dependencies: ["stripe"] });
    expect(features).toContain("payments");
  });

  it("ne détecte rien sur un blueprint minimal (aucune feature)", () => {
    const features = inferFeatures({ components: [], dependencies: ["next", "react"] });
    expect(features).toEqual([]);
  });

  it("détecte plusieurs features simultanément", () => {
    const features = inferFeatures({
      components: ["AuthProvider", "AdminPanel", "ChatWindow"],
      dependencies: ["stripe"],
    });
    expect(features).toEqual(
      expect.arrayContaining(["authentication", "admin", "chat", "payments"])
    );
  });
});

describe("estimateProjectValue", () => {
  it("attribue le tier simple et la base correspondante pour un projet minimal", () => {
    const estimate = estimateProjectValue({
      files: ["package.json", "src/app/page.tsx"],
      components: [],
      dependencies: ["next", "react"],
    });

    expect(estimate.complexityTier).toBe("simple");
    expect(estimate.estimatedValueCents).toBe(VALUE_TIER_BASE_CENTS.simple);
    expect(estimate.detectedFeatures).toEqual([]);
  });

  it("passe au tier complexe dès qu'une feature lourde est détectée (paiements)", () => {
    const estimate = estimateProjectValue({
      files: Array.from({ length: 5 }, (_, i) => `file${i}.ts`),
      components: ["CheckoutForm"],
      dependencies: ["stripe"],
    });

    expect(estimate.complexityTier).toBe("complexe");
  });

  it("ajoute un bonus par feature détectée", () => {
    const withoutFeature = estimateProjectValue({ files: [], components: [], dependencies: [] });
    const withFeature = estimateProjectValue({
      files: [],
      components: ["Dashboard"],
      dependencies: [],
    });

    expect(withFeature.estimatedValueCents).toBeGreaterThan(withoutFeature.estimatedValueCents);
  });

  it("ajoute un bonus par fichier au-delà du seuil de base, plafonné", () => {
    const fewFiles = estimateProjectValue({
      files: Array.from({ length: 5 }, (_, i) => `f${i}.ts`),
      components: [],
      dependencies: [],
    });
    const manyFiles = estimateProjectValue({
      files: Array.from({ length: 200 }, (_, i) => `f${i}.ts`),
      components: [],
      dependencies: [],
    });

    expect(manyFiles.estimatedValueCents).toBeGreaterThan(fewFiles.estimatedValueCents);
    expect(manyFiles.estimatedValueCents).toBeLessThanOrEqual(VALUE_MAX_CENTS);
  });

  it("ne descend jamais sous le plancher, ni ne dépasse le plafond", () => {
    const empty = estimateProjectValue({ files: [], components: [], dependencies: [] });
    expect(empty.estimatedValueCents).toBeGreaterThanOrEqual(VALUE_MIN_CENTS);

    const huge = estimateProjectValue({
      files: Array.from({ length: 5000 }, (_, i) => `f${i}.ts`),
      components: ["AuthProvider", "AdminPanel", "ChatWindow", "Dashboard"],
      dependencies: ["stripe", "resend", "prisma"],
    });
    expect(huge.estimatedValueCents).toBeLessThanOrEqual(VALUE_MAX_CENTS);
  });

  it("renvoie le nombre exact de fichiers passés en entrée", () => {
    const estimate = estimateProjectValue({
      files: ["a.ts", "b.ts", "c.ts"],
      components: [],
      dependencies: [],
    });
    expect(estimate.fileCount).toBe(3);
  });
});
