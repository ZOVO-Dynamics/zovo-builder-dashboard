import fs from "fs";
import path from "path";
import { findInventedApiRoutes, generateMissingApiRoute } from "../src/core/Validator";

const projectDir = "/home/ubuntu/zovo-generated-projects/zovo-web-app-1786141251203";
const authProviderPath = path.join(projectDir, "src/components/AuthProvider.tsx");
const content = fs.readFileSync(authProviderPath, "utf-8");

const invented = findInventedApiRoutes(projectDir, content);
console.log("Routes détectées comme manquantes:", invented);

async function main() {
  for (const apiPath of invented) {
    const lines = content.split("\n");
    const idx = lines.findIndex((l) => l.includes(apiPath));
    const context = lines.slice(Math.max(0, idx - 15), idx + 15).join("\n");
    console.log(`\n--- Génération de ${apiPath} ---`);
    const created = await generateMissingApiRoute(projectDir, apiPath, context, "Application todo-app avec authentification, tableau de bord, profil utilisateur");
    console.log(`Résultat: ${created ? "créé" : "échec ou déjà existant"}`);
  }
}
main();
