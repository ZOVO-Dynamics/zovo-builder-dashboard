/**
 * Calculateur automatique de taxes de vente — Canada (toutes provinces/territoires)
 * Taux en vigueur 2026. Source : ARC, Revenu Québec, autorités provinciales.
 * IMPORTANT : la taxe applicable dépend du LIEU DE LIVRAISON, pas du lieu du vendeur.
 */

export type ProvinceCode =
  | "QC" | "ON" | "NB" | "NS" | "PE" | "NL"
  | "AB" | "BC" | "SK" | "MB"
  | "YT" | "NT" | "NU";

export interface TaxBreakdown {
  province: ProvinceCode;
  subtotal: number;
  gst: number;        // TPS fédérale
  pst: number;         // TVQ / TVP / RST provinciale (0 si HST ou aucune)
  hst: number;         // TVH (si applicable, remplace TPS+TVP séparées)
  totalTax: number;
  total: number;
  gstNumber?: string;
  pstNumber?: string;
}

interface ProvinceTaxConfig {
  name: string;
  type: "GST_ONLY" | "GST_PST" | "GST_QST" | "HST";
  gstRate: number;
  pstRate: number;   // 0 si non applicable
  hstRate: number;   // 0 si non applicable
}

// Taux 2026 — à ajuster ici si les gouvernements modifient les taux
export const PROVINCE_TAX_RATES: Record<ProvinceCode, ProvinceTaxConfig> = {
  QC: { name: "Québec", type: "GST_QST", gstRate: 0.05, pstRate: 0.09975, hstRate: 0 },
  ON: { name: "Ontario", type: "HST", gstRate: 0, pstRate: 0, hstRate: 0.13 },
  NB: { name: "Nouveau-Brunswick", type: "HST", gstRate: 0, pstRate: 0, hstRate: 0.15 },
  NS: { name: "Nouvelle-Écosse", type: "HST", gstRate: 0, pstRate: 0, hstRate: 0.14 }, // baissé à 14% depuis le 1er avril 2025
  PE: { name: "Île-du-Prince-Édouard", type: "HST", gstRate: 0, pstRate: 0, hstRate: 0.15 },
  NL: { name: "Terre-Neuve-et-Labrador", type: "HST", gstRate: 0, pstRate: 0, hstRate: 0.15 },
  AB: { name: "Alberta", type: "GST_ONLY", gstRate: 0.05, pstRate: 0, hstRate: 0 },
  BC: { name: "Colombie-Britannique", type: "GST_PST", gstRate: 0.05, pstRate: 0.07, hstRate: 0 },
  SK: { name: "Saskatchewan", type: "GST_PST", gstRate: 0.05, pstRate: 0.06, hstRate: 0 },
  MB: { name: "Manitoba", type: "GST_PST", gstRate: 0.05, pstRate: 0.07, hstRate: 0 },
  YT: { name: "Yukon", type: "GST_ONLY", gstRate: 0.05, pstRate: 0, hstRate: 0 },
  NT: { name: "Territoires du Nord-Ouest", type: "GST_ONLY", gstRate: 0.05, pstRate: 0, hstRate: 0 },
  NU: { name: "Nunavut", type: "GST_ONLY", gstRate: 0.05, pstRate: 0, hstRate: 0 },
};

/**
 * Calcule les taxes automatiquement selon la province de livraison.
 * @param subtotal Montant avant taxes
 * @param province Code de la province de destination (lieu de livraison)
 * @param registrationNumbers Numéros d'inscription TPS/TVQ de l'entreprise (optionnel, pour affichage sur facture)
 */
export function calculateTax(
  subtotal: number,
  province: ProvinceCode,
  registrationNumbers?: { gstNumber?: string; pstNumber?: string }
): TaxBreakdown {
  const config = PROVINCE_TAX_RATES[province];
  if (!config) {
    throw new Error(`Province non reconnue: ${province}`);
  }

  let gst = 0;
  let pst = 0;
  let hst = 0;

  if (config.type === "HST") {
    hst = round2(subtotal * config.hstRate);
  } else {
    gst = round2(subtotal * config.gstRate);
    pst = round2(subtotal * config.pstRate);
  }

  const totalTax = round2(gst + pst + hst);
  const total = round2(subtotal + totalTax);

  return {
    province,
    subtotal: round2(subtotal),
    gst,
    pst,
    hst,
    totalTax,
    total,
    gstNumber: registrationNumbers?.gstNumber,
    pstNumber: registrationNumbers?.pstNumber,
  };
}

/**
 * Extrait le montant avant taxes à partir d'un total taxes incluses (TTC).
 * Utile quand seul le prix final est connu.
 */
export function extractTaxFromTotal(
  totalWithTax: number,
  province: ProvinceCode
): TaxBreakdown {
  const config = PROVINCE_TAX_RATES[province];
  const combinedRate =
    config.type === "HST" ? config.hstRate : config.gstRate + config.pstRate;

  const subtotal = round2(totalWithTax / (1 + combinedRate));
  return calculateTax(subtotal, province);
}

/**
 * Retourne le taux combiné applicable pour une province donnée (utile pour affichage rapide).
 */
export function getCombinedRate(province: ProvinceCode): number {
  const config = PROVINCE_TAX_RATES[province];
  return config.type === "HST" ? config.hstRate : config.gstRate + config.pstRate;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
