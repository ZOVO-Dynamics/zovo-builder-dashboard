import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import { fixMalformedPrismaSchema, stripHallucinatedGeneratorWrapper } from "./Validator";

const TEST_DIR = path.join("/tmp", "zovo-test-prisma-schema-fix");
const SCHEMA_PATH = path.join(TEST_DIR, "prisma", "schema.prisma");

function writeSchema(content: string) {
  fs.mkdirSync(path.dirname(SCHEMA_PATH), { recursive: true });
  fs.writeFileSync(SCHEMA_PATH, content, "utf-8");
}

describe("stripHallucinatedGeneratorWrapper", () => {
  it("retire le wrapper avec schema en template literal (variante backtick)", () => {
    const wrapped = [
      "",
      "generator({",
      "  schema: `",
      'generator client {',
      '  provider = "prisma-client-js"',
      "}",
      "",
      "model User {",
      "  id String @id",
      "}",
      "`",
      "})",
      "",
    ].join("\n");

    const result = stripHallucinatedGeneratorWrapper(wrapped);

    expect(result).not.toBeNull();
    expect(result).toContain('provider = "prisma-client-js"');
    expect(result).toContain("model User");
    expect(result).not.toContain("generator({");
    expect(result).not.toContain("schema:");
  });

  it("retire le wrapper avec schema en objet (variante rencontrée en test réel, 9 août)", () => {
    const wrapped = [
      "",
      "generator({",
      "  schema: {",
      'generator client {',
      '  provider = "prisma-client-js"',
      "}",
      "",
      "model User {",
      "  id String @id",
      "}",
      "}",
      "})",
    ].join("\n");

    const result = stripHallucinatedGeneratorWrapper(wrapped);

    expect(result).not.toBeNull();
    expect(result).toContain("model User");
    expect(result).not.toContain("generator({");
  });

  it("ne touche pas à un schema.prisma valide et normal", () => {
    const valid = [
      'generator client {',
      '  provider = "prisma-client-js"',
      "}",
      "",
      "model User {",
      "  id String @id",
      "}",
    ].join("\n");

    expect(stripHallucinatedGeneratorWrapper(valid)).toBeNull();
  });

  it("ne touche pas à un fichier qui commence par generator( sans structure reconnue (garde-fou)", () => {
    const weird = ["generator({", "just some random text with no closing structure"].join("\n");

    expect(stripHallucinatedGeneratorWrapper(weird)).toBeNull();
  });

  it("refuse de renvoyer un contenu qui ne ressemble pas à un vrai schema.prisma (garde-fou anti-troncature)", () => {
    const suspicious = ["generator({", "schema: {", "ceci n'est pas du prisma du tout", "}", "})"].join("\n");

    expect(stripHallucinatedGeneratorWrapper(suspicious)).toBeNull();
  });
});

describe("fixMalformedPrismaSchema (intégration disque)", () => {
  beforeEach(() => {
    if (fs.existsSync(TEST_DIR)) fs.rmSync(TEST_DIR, { recursive: true, force: true });
  });

  afterEach(() => {
    if (fs.existsSync(TEST_DIR)) fs.rmSync(TEST_DIR, { recursive: true, force: true });
  });

  it("corrige sur disque le wrapper generator({ schema: {...} }) et rend le schéma valide", () => {
    writeSchema(
      [
        "generator({",
        "  schema: {",
        'generator client {',
        '  provider = "prisma-client-js"',
        "}",
        "",
        "model User {",
        "  id String @id",
        "}",
        "}",
        "})",
      ].join("\n")
    );

    const fixedFiles = fixMalformedPrismaSchema(TEST_DIR);

    expect(fixedFiles).toEqual(["prisma/schema.prisma"]);
    const finalContent = fs.readFileSync(SCHEMA_PATH, "utf-8");
    expect(finalContent).toContain("model User");
    expect(finalContent.trim().startsWith("generator({")).toBe(false);
  });

  it("continue de corriger le cas historique de la ligne generator \"xxx\" orpheline", () => {
    writeSchema(
      [
        'generator "prisma-client-js"',
        "",
        'generator client {',
        '  provider = "prisma-client-js"',
        "}",
        "",
        "model User {",
        "  id String @id",
        "}",
      ].join("\n")
    );

    const fixedFiles = fixMalformedPrismaSchema(TEST_DIR);

    expect(fixedFiles).toEqual(["prisma/schema.prisma"]);
    const finalContent = fs.readFileSync(SCHEMA_PATH, "utf-8");
    expect(finalContent).not.toContain('generator "prisma-client-js"');
    expect(finalContent).toContain("model User");
  });

  it("ne modifie rien pour un schema.prisma déjà valide", () => {
    const valid = [
      'generator client {',
      '  provider = "prisma-client-js"',
      "}",
      "",
      "model User {",
      "  id String @id",
      "}",
    ].join("\n");
    writeSchema(valid);

    const fixedFiles = fixMalformedPrismaSchema(TEST_DIR);

    expect(fixedFiles).toEqual([]);
    expect(fs.readFileSync(SCHEMA_PATH, "utf-8")).toBe(valid);
  });

  it("renvoie un tableau vide si prisma/schema.prisma n'existe pas", () => {
    expect(fixMalformedPrismaSchema(TEST_DIR)).toEqual([]);
  });
});
