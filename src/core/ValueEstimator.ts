import { ComplexityTier, computeComplexityTier } from "./ComplexityAnalyzer";

// Permet de retrouver les features probables d'un projet déjà généré à partir
// de ce qui est réellement persisté (composants/dépendances), sans dépendre du
// tableau `features` d'origine qui n'est pas sauvegardé sur ProjectVersion.
const FEATURE_SIGNATURES: Record<string, { components?: string[]; dependencies?: string[] }> = {
  authentication: { components: ["AuthProvider", "LoginForm", "SignupForm"], dependencies: ["bcryptjs"] },
  payments: { components: ["CheckoutForm", "PricingTable"], dependencies: ["stripe", "@stripe/stripe-js"] },
  chat: { components: ["ChatWindow", "MessageList"] },
  admin: { components: ["AdminPanel", "UserTable"] },
  dashboard: { components: ["Dashboard", "DashboardStats"] },
  database: { dependencies: ["prisma", "@prisma/client"] },
  crud: { components: ["ItemList", "ItemForm"] },
  search: { components: ["SearchBar", "SearchResults"] },
  notifications: { components: ["NotificationBell", "NotificationList"] },
  profile: { components: ["ProfileForm", "AvatarUpload"] },
  email: { dependencies: ["resend"] },
};

export interface BlueprintLike {
  files: string[];
  components: string[];
  dependencies: string[];
}

export function inferFeatures(blueprint: Pick<BlueprintLike, "components" | "dependencies">): string[] {
  const found: string[] = [];
  for (const [feature, sig] of Object.entries(FEATURE_SIGNATURES)) {
    const hasComponent = sig.components?.some((c) => blueprint.components.includes(c));
    const hasDependency = sig.dependencies?.some((d) => blueprint.dependencies.includes(d));
    if (hasComponent || hasDependency) found.push(feature);
  }
  return found;
}

export interface ValueEstimate {
  estimatedValueCents: number;
  complexityTier: ComplexityTier;
  detectedFeatures: string[];
  fileCount: number;
}

// Constantes centralisées : à ajuster ici uniquement, jamais en dur ailleurs.
export const VALUE_TIER_BASE_CENTS: Record<ComplexityTier, number> = {
  simple: 15000, // 150 $
  moyen: 40000, // 400 $
  complexe: 90000, // 900 $
};
export const VALUE_CENTS_PER_FEATURE = 5000; // 50 $ par feature détectée
export const VALUE_CENTS_PER_FILE_BEYOND_BASELINE = 500; // 5 $ par fichier au-delà du seuil
export const VALUE_FILE_BASELINE = 10;
export const VALUE_MAX_FILE_BONUS_CENTS = 40000; // 400 $ max de bonus fichiers
export const VALUE_MIN_CENTS = 10000; // 100 $ plancher
export const VALUE_MAX_CENTS = 300000; // 3000 $ plafond

/**
 * Estimation de la valeur de revente d'un projet déjà généré, basée uniquement
 * sur des données déjà persistées (aucun appel IA, résultat déterministe et
 * instantané). Formule volontairement simple et transparente : base par tier
 * de complexité + bonus par feature détectée + bonus par volume de fichiers,
 * avec plancher et plafond pour éviter les valeurs absurdes.
 */
export function estimateProjectValue(blueprint: BlueprintLike): ValueEstimate {
  const detectedFeatures = inferFeatures(blueprint);
  const complexityTier = computeComplexityTier(detectedFeatures);

  const base = VALUE_TIER_BASE_CENTS[complexityTier];
  const featureBonus = detectedFeatures.length * VALUE_CENTS_PER_FEATURE;
  const fileCount = blueprint.files.length;
  const fileBonus = Math.min(
    Math.max(0, fileCount - VALUE_FILE_BASELINE) * VALUE_CENTS_PER_FILE_BEYOND_BASELINE,
    VALUE_MAX_FILE_BONUS_CENTS
  );

  const raw = base + featureBonus + fileBonus;
  const estimatedValueCents = Math.min(Math.max(raw, VALUE_MIN_CENTS), VALUE_MAX_CENTS);

  return { estimatedValueCents, complexityTier, detectedFeatures, fileCount };
}
