import fs from "fs";
import path from "path";
import * as ts from "typescript";

const projectDir = "/home/ubuntu/zovo-generated-projects/zovo-web-app-1786141251203";
const srcDir = path.join(projectDir, "src");
const componentFiles: string[] = [];

function walk(dir: string) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".next") continue;
      walk(fullPath);
    } else if (/\.tsx$/.test(entry.name)) {
      componentFiles.push(fullPath);
    }
  }
}
walk(srcDir);

for (const filePath of componentFiles) {
  const content = fs.readFileSync(filePath, "utf-8");
  const baseName = path.basename(filePath, path.extname(filePath));
  const sourceFile = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

  let exportedName: string | null = null;
  let exportedParamsCount: number | null = null;

  function visit(node: ts.Node) {
    if (ts.isFunctionDeclaration(node) && node.name && node.modifiers?.some((m) => m.kind === ts.SyntaxKind.DefaultKeyword)) {
      exportedParamsCount = node.parameters.length;
    }
    if (ts.isExportAssignment(node) && ts.isIdentifier(node.expression)) {
      exportedName = node.expression.text;
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);

  if (exportedParamsCount === null && exportedName) {
    const target = exportedName;
    function find(node: ts.Node) {
      if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === target && node.initializer && (ts.isArrowFunction(node.initializer) || ts.isFunctionExpression(node.initializer))) {
        exportedParamsCount = node.initializer.parameters.length;
      }
      if (ts.isFunctionDeclaration(node) && node.name?.text === target) {
        exportedParamsCount = node.parameters.length;
      }
      ts.forEachChild(node, find);
    }
    find(sourceFile);
  }

  console.log(baseName, "| exportedName:", exportedName, "| paramsCount:", exportedParamsCount);
}
