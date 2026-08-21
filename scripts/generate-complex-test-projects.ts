/**
 * Genere automatiquement une serie de projets "complexes" (auth/payments/chat/admin)
 * a travers le vrai pipeline de generation (AIPromptAnalyzer -> BlueprintGenerator ->
 * ProjectWriter -> Validator), exactement comme runGenerationJob() dans
 * src/app/api/blueprint/route.ts, mais sans passer par HTTP/auth/DB/entitlements.
 *
 * But : eviter de devoir taper des prompts complexes a la main dans l'UI pour
 * tester le pipeline de generation et la boucle d'auto-correction du Validator
 * (qui reessaie jusqu'a `maxAttempts` avant de rendre un verdict valid: true/false).
 *
 * A EXECUTER SUR LE SERVEUR (jamais depuis une session Claude) :
 *   - ProjectWriter ecrit dans /home/ubuntu/zovo-generated-projects (chemin en dur),
 *     qui n'existe que sur le serveur de prod.
 *   - Chaque projet declenche de vrais appels a AI_BRIDGE_URL (https://ai.zovo.ca/api/generate)
 *     et un vrai `npm install` + `next build` : compte plusieurs minutes par projet.
 *
 *   npx tsx scripts/generate-complex-test-projects.ts
 *   npx tsx scripts/generate-complex-test-projects.ts --only=payments,chat
 *
 * Chaque prompt ci-dessous declenche au moins une feature "lourde"
 * (authentication/payments/chat/admin), donc computeComplexityTier() les
 * classe tous en "complexe" (voir src/core/ComplexityAnalyzer.ts).
 */
import aiPromptAnalyzer from "../src/core/AIPromptAnalyzer";
import blueprintGenerator from "../src/core/BlueprintGenerator";
import projectWriter from "../src/core/ProjectWriter";
import validator, { detectHallucinationWithAiFallback, fixMissingRoutePages } from "../src/core/Validator";

interface ComplexPromptCase {
  key: string;
  label: string;
  prompt: string;
}

const CASES: ComplexPromptCase[] = [
  {
    key: "auth",
    label: "Authentification",
    prompt:
      "Une application de gestion de tâches avec authentification par email/mot de passe, un tableau de bord et un profil utilisateur.",
  },
  {
    key: "payments",
    label: "Paiements",
    prompt:
      "Une plateforme de vente de formations en ligne avec paiement Stripe, une page de tarification et une page de checkout.",
  },
  {
    key: "chat",
    label: "Chat",
    prompt:
      "Une application de messagerie en temps réel entre utilisateurs, avec liste de conversations et fenêtre de discussion.",
  },
  {
    key: "admin",
    label: "Admin",
    prompt:
      "Un back-office d'administration pour gérer les utilisateurs d'une application et consulter des statistiques d'usage.",
  },
  {
    key: "combo",
    label: "Combo (auth+payments+admin)",
    prompt:
      "Une marketplace complète avec authentification utilisateur, paiement Stripe pour les achats, et un panneau d'administration pour gérer les vendeurs.",
  },
];

interface CaseResult {
  key: string;
  label: string;
  complexityTier: string;
  projectPath: string;
  valid: boolean;
  attempts?: number;
  errors: string[];
  hallucinations: string[];
  durationMs: number;
}

const AI_BRIDGE_URL = process.env.AI_BRIDGE_URL || "https://ai.zovo.ca/api/generate";

async function runCase(testCase: ComplexPromptCase): Promise<CaseResult> {
  const start = Date.now();
  console.log(`\n=== [${testCase.key}] ${testCase.label} ===`);
  console.log(`Prompt: ${testCase.prompt}`);

  const projectBlueprint = await aiPromptAnalyzer.analyze(testCase.prompt);
  console.log(`Complexité détectée: ${projectBlueprint.complexityTier} | features: ${projectBlueprint.features.join(", ")}`);

  const buildBlueprint = blueprintGenerator.generate(projectBlueprint);

  const writeResult = await projectWriter.write(
    buildBlueprint,
    projectBlueprint,
    testCase.prompt,
    (current, total, file) => {
      process.stdout.write(`\r  Écriture des fichiers: ${current}/${total} (${file ?? ""})`.padEnd(100));
    }
  );
  process.stdout.write("\n");

  const fixedRoutes = fixMissingRoutePages(writeResult.projectPath, buildBlueprint);
  if (fixedRoutes.length > 0) {
    console.log(`  Pages générées automatiquement: ${fixedRoutes.join(", ")}`);
  }

  const hallucinations = await detectHallucinationWithAiFallback(
    writeResult.projectPath,
    buildBlueprint.routes,
    {},
    AI_BRIDGE_URL
  );
  if (hallucinations.length > 0) {
    console.warn(`  Hallucinations détectées: ${hallucinations.join(" | ")}`);
  }

  console.log("  Validation (typecheck + build, avec auto-correction)...");
  const validation = await validator.validate(writeResult.projectPath, testCase.prompt, 2);

  console.log(
    `  => ${validation.valid ? "✅ VALID" : "❌ INVALID"} (tentatives: ${validation.attempts ?? 0}, fichiers corrigés: ${validation.fixedFiles.length})`
  );
  if (!validation.valid) {
    validation.errors.slice(0, 10).forEach((e) => console.log(`     - ${e}`));
  }

  return {
    key: testCase.key,
    label: testCase.label,
    complexityTier: projectBlueprint.complexityTier ?? "?",
    projectPath: writeResult.projectPath,
    valid: validation.valid,
    attempts: validation.attempts,
    errors: validation.errors,
    hallucinations,
    durationMs: Date.now() - start,
  };
}

async function main() {
  const onlyArg = process.argv.find((a) => a.startsWith("--only="));
  const only = onlyArg ? onlyArg.slice("--only=".length).split(",") : null;
  const cases = only ? CASES.filter((c) => only.includes(c.key)) : CASES;

  if (cases.length === 0) {
    console.error(`Aucun cas ne correspond à --only=${only?.join(",")}. Clés valides: ${CASES.map((c) => c.key).join(", ")}`);
    process.exit(1);
  }

  console.log(`Génération de ${cases.length} projet(s) complexe(s) de test...`);

  const results: CaseResult[] = [];
  for (const testCase of cases) {
    try {
      results.push(await runCase(testCase));
    } catch (err) {
      console.error(`  Échec inattendu pour [${testCase.key}]:`, err);
      results.push({
        key: testCase.key,
        label: testCase.label,
        complexityTier: "?",
        projectPath: "",
        valid: false,
        errors: [err instanceof Error ? err.message : String(err)],
        hallucinations: [],
        durationMs: 0,
      });
    }
  }

  console.log("\n\n=== Résumé ===");
  for (const r of results) {
    const mins = (r.durationMs / 60000).toFixed(1);
    console.log(
      `${r.valid ? "✅" : "❌"} ${r.key.padEnd(10)} tier=${r.complexityTier.padEnd(9)} tentatives=${r.attempts ?? "-"} durée=${mins}min  ${r.projectPath}`
    );
  }

  const failed = results.filter((r) => !r.valid);
  if (failed.length > 0) {
    console.log(`\n${failed.length}/${results.length} projet(s) n'ont pas atteint la validation OK.`);
    process.exit(1);
  }

  console.log(`\nTous les projets (${results.length}) ont atteint la validation OK.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
