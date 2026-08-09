// Configuration centrale du produit "ZOVO Correction & Validation".
// Ne jamais hardcoder "29.99" ailleurs dans le code — importer ces constantes.

export const ZOVO_REPAIR_PRICE_CAD = Number(process.env.ZOVO_REPAIR_PRICE_CAD || "29.99");
export const ZOVO_REPAIR_PRICE_CENTS = Math.round(ZOVO_REPAIR_PRICE_CAD * 100);
export const ZOVO_REPAIR_CURRENCY = "cad";

// Optionnel : si un Stripe Price a été créé côté dashboard Stripe (recommandé en
// production pour un meilleur suivi comptable), son ID va ici. Sinon, le checkout
// retombe sur un price_data dynamique construit à partir des constantes ci-dessus.
export const ZOVO_REPAIR_PRICE_ID = process.env.ZOVO_REPAIR_PRICE_ID || null;

export const ZOVO_REPAIR_MAX_ATTEMPTS = Number(process.env.ZOVO_REPAIR_MAX_ATTEMPTS || "5");

export const ZOVO_REPAIR_PRODUCT_NAME = "ZOVO Correction & Validation";
export const ZOVO_REPAIR_PRODUCT_DESCRIPTION =
  "Laissez ZOVO analyser, corriger et valider automatiquement votre projet. Aucune connaissance en programmation nécessaire.";
