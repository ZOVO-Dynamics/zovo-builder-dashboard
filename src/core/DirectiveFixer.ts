import fs from "fs";
import path from "path";
import * as ts from "typescript";

/**
 * DirectiveFixer (AST-based)
 * ---------------------------------------------------------------
 * Remplace l'ancienne version basée sur des regex par une analyse
 * réelle de l'AST TypeScript. Résout les problèmes suivants :
 *  - faux positifs sur les appels de méthode (obj.useCache())
 *  - directives "use client" fantômes à l'intérieur de chaînes/commentaires
 *  - conflit avec "use server" (Server Actions)
 *  - non-idempotence (une 2e exécution ne doit rien changer)
 *  - portée incohérente entre les fonctions d'ajout et de nettoyage
 *
 * Ne cible que .tsx/.jsx (JSX requis) et exclut explicitement les
 * fichiers qui ne devraient jamais recevoir "use client" (routes API,
 * middleware, instrumentation, config).
 */

const NATIVE_HOOKS = new Set([
  "useState", "useEffect", "useRef", "useReducer", "useContext",
  "useMemo", "useCallback", "useLayoutEffect", "useTransition",
  "useDeferredValue", "useImperativeHandle", "useSyncExternalStore", "useId",
]);

const CUSTOM_HOOK_NAME = /^use[A-Z]\w*$/;

const EXCLUDED_FILENAMES = /^(middleware|instrumentation)\.tsx?$/;
const EXCLUDED_DIR_SEGMENTS = new Set(["api"]); // app/api/**/route.ts etc.

interface FileEditResult {
  file: string;
  action: "added" | "removed-duplicate" | "normalized" | "conflict-use-server" | "unchanged";
}

export function fixDirectives(projectDir: string): FileEditResult[] {
  const results: FileEditResult[] = [];
  const srcDir = path.join(projectDir, "src");
  if (!fs.existsSync(srcDir)) return results;

  function walk(dir: string) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        if (entry.name === "node_modules" || entry.name === ".next") continue;
        walk(fullPath);
        continue;
      }

      if (!/\.(tsx|jsx)$/.test(entry.name)) continue;
      if (EXCLUDED_FILENAMES.test(entry.name)) continue;

      const relSegments = path.relative(srcDir, fullPath).split(path.sep);
      if (relSegments.some((seg) => EXCLUDED_DIR_SEGMENTS.has(seg))) continue;

      const result = processFile(fullPath, projectDir);
      if (result) results.push(result);
    }
  }

  walk(srcDir);
  return results;
}

function processFile(fullPath: string, projectDir: string): FileEditResult | null {
  const originalText = fs.readFileSync(fullPath, "utf-8");
  const scriptKind = fullPath.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.JSX;

  const sourceFile = ts.createSourceFile(
    fullPath,
    originalText,
    ts.ScriptTarget.Latest,
    /* setParentNodes */ true,
    scriptKind
  );

  // 1. Lire le "prologue" : les premières instructions qui sont des
  //    littéraux de chaîne (les vraies directives JS, pas n'importe
  //    quelle chaîne présente ailleurs dans le fichier).
  const prologue: { text: string; node: ts.ExpressionStatement }[] = [];
  for (const stmt of sourceFile.statements) {
    if (ts.isExpressionStatement(stmt) && ts.isStringLiteral(stmt.expression)) {
      prologue.push({ text: stmt.expression.text, node: stmt });
    } else {
      break; // une directive doit être en tête ; on arrête au premier non-littéral
    }
  }

  const hasUseClient = prologue.some((p) => p.text === "use client");
  const hasUseServer = prologue.some((p) => p.text === "use server");

  // 2. Détecter les directives "use client" mal placées ou dupliquées
  //    (hors prologue) : ce sont de vraies ExpressionStatement isolées,
  //    jamais du texte à l'intérieur d'une chaîne/commentaire quelconque.
  const strayDirectives: ts.ExpressionStatement[] = [];
  function scanForStray(node: ts.Node, insidePrologue: boolean) {
    if (
      !insidePrologue &&
      ts.isExpressionStatement(node) &&
      ts.isStringLiteral(node.expression) &&
      node.expression.text === "use client"
    ) {
      strayDirectives.push(node);
    }
    ts.forEachChild(node, (child) => scanForStray(child, false));
  }
  for (const stmt of sourceFile.statements.slice(prologue.length)) {
    scanForStray(stmt, false);
  }

  // 3. Détecter l'usage de hooks via de vrais appels de fonction
  //    (Identifier direct uniquement -> obj.useX() n'est jamais matché).
  let usesHooks = false;
  function scanForHooks(node: ts.Node) {
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      (NATIVE_HOOKS.has(node.expression.text) || CUSTOM_HOOK_NAME.test(node.expression.text))
    ) {
      usesHooks = true;
      return;
    }
    ts.forEachChild(node, scanForHooks);
  }
  scanForHooks(sourceFile);

  // --- Décision ---

  if (hasUseServer) {
    // Ne jamais ajouter "use client" par-dessus une Server Action.
    // On retire quand même les doublons "use client" mal placés s'il y en a.
    if (strayDirectives.length > 0) {
      const cleaned = stripStrayStatements(originalText, sourceFile, strayDirectives);
      fs.writeFileSync(fullPath, cleaned, "utf-8");
      return { file: path.relative(projectDir, fullPath), action: "conflict-use-server" };
    }
    return null;
  }

  const needsClient = usesHooks;

  if (needsClient && !hasUseClient) {
    let text = originalText;
    if (strayDirectives.length > 0) {
      text = stripStrayStatements(text, sourceFile, strayDirectives);
    }
    const fixed = '"use client";\n\n' + text.replace(/^\uFEFF/, "");
    fs.writeFileSync(fullPath, fixed, "utf-8");
    return { file: path.relative(projectDir, fullPath), action: "added" };
  }

  if (!needsClient && hasUseClient) {
    // Le fichier n'a plus besoin de la directive (ex: hooks retirés) :
    // on la laisse — la retirer serait plus risqué que la garder inutilement.
    // On nettoie seulement les doublons mal placés.
  }

  if (strayDirectives.length > 0) {
    const cleaned = stripStrayStatements(originalText, sourceFile, strayDirectives);
    fs.writeFileSync(fullPath, cleaned, "utf-8");
    return { file: path.relative(projectDir, fullPath), action: "removed-duplicate" };
  }

  return null; // idempotent : rien à faire
}

/** Retire des ExpressionStatement précis du texte source, sans toucher au reste. */
function stripStrayStatements(
  text: string,
  sourceFile: ts.SourceFile,
  stmts: ts.ExpressionStatement[]
): string {
  // On retire du texte en partant de la fin pour ne pas décaler les positions.
  const sorted = [...stmts].sort((a, b) => b.getStart(sourceFile) - a.getStart(sourceFile));
  let result = text;
  for (const stmt of sorted) {
    const start = stmt.getFullStart();
    const end = stmt.getEnd();
    result = result.slice(0, start) + result.slice(end);
  }
  return result.replace(/\n{3,}/g, "\n\n");
}
