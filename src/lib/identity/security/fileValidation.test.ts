import { describe, it, expect } from "vitest";
import { validateUploadedFile } from "./fileValidation";

function makeFile(name: string, type: string): File {
  return new File([Buffer.alloc(10)], name, { type });
}

describe("validateUploadedFile - protection contre les uploads malveillants", () => {
  it("rejette un executable renomme en .jpg avec un Content-Type falsifie (magic bytes incorrects)", () => {
    const file = makeFile("photo.jpg", "image/jpeg");
    // En-tete ELF (executable Linux), pas un JPEG.
    const buffer = Buffer.from([0x7f, 0x45, 0x4c, 0x46, 0x02, 0x01, 0x01, 0x00]);

    const error = validateUploadedFile({ file, buffer });
    expect(error).toMatch(/contenu du fichier ne correspond pas/i);
  });

  it("rejette un type MIME non autorise (ex: application/x-executable)", () => {
    const file = makeFile("malware.exe", "application/x-executable");
    const buffer = Buffer.from([0x4d, 0x5a]); // en-tete PE

    const error = validateUploadedFile({ file, buffer });
    expect(error).toMatch(/format non support/i);
  });

  it("rejette une extension qui ne correspond pas au type MIME declare", () => {
    const file = makeFile("document.pdf", "image/jpeg");
    const buffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0]); // vrai JPEG, mais extension .pdf

    const error = validateUploadedFile({ file, buffer });
    expect(error).toMatch(/extension/i);
  });

  it("rejette un fichier trop volumineux", () => {
    const file = makeFile("photo.jpg", "image/jpeg");
    const buffer = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(9 * 1024 * 1024)]);

    const error = validateUploadedFile({ file, buffer });
    expect(error).toMatch(/volumineux/i);
  });

  it("rejette un fichier vide", () => {
    const file = makeFile("photo.jpg", "image/jpeg");
    const error = validateUploadedFile({ file, buffer: Buffer.alloc(0) });
    expect(error).toMatch(/manquant/i);
  });

  it("accepte un vrai JPEG valide, taille et extension coherentes", () => {
    const file = makeFile("photo.jpg", "image/jpeg");
    const buffer = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(1000)]);

    const error = validateUploadedFile({ file, buffer });
    expect(error).toBeNull();
  });

  it("accepte un vrai PDF valide", () => {
    const file = makeFile("document.pdf", "application/pdf");
    const buffer = Buffer.concat([Buffer.from("%PDF-1.4"), Buffer.alloc(1000)]);

    const error = validateUploadedFile({ file, buffer });
    expect(error).toBeNull();
  });
});
