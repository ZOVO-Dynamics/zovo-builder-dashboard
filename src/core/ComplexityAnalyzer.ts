const HEAVY_FEATURES = ["authentication", "payments", "chat", "admin"];

export type ComplexityTier = "simple" | "moyen" | "complexe";

export function computeComplexityTier(features: string[]): ComplexityTier {
  const heavyCount = features.filter(f => HEAVY_FEATURES.includes(f)).length;

  if (heavyCount >= 1) return "complexe";
  if (features.length >= 4) return "moyen";
  return "simple";
}
