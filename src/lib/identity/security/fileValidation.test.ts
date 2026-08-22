import { describe, it, expect } from "vitest";
import { validateUploadedFile, MAX_DOCUMENT_SIZE_BYTES } from "./fileValidation";

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

  it("accepte un vrai PNG valide", () => {
    const file = makeFile("photo.png", "image/png");
    const buffer = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(1000)]);

    expect(validateUploadedFile({ file, buffer })).toBeNull();
  });

  it("accepte un vrai WEBP valide (conteneur RIFF + marqueur WEBP)", () => {
    const file = makeFile("photo.webp", "image/webp");
    const buffer = Buffer.concat([
      Buffer.from("RIFF", "ascii"),
      Buffer.from([0, 0, 0, 0]),
      Buffer.from("WEBP", "ascii"),
      Buffer.alloc(100),
    ]);

    expect(validateUploadedFile({ file, buffer })).toBeNull();
  });

  it("rejette un fichier RIFF qui n'est pas un WEBP (ex: WAV deguise en .webp)", () => {
    const file = makeFile("audio.webp", "image/webp");
    const buffer = Buffer.concat([
      Buffer.from("RIFF", "ascii"),
      Buffer.from([0, 0, 0, 0]),
      Buffer.from("WAVE", "ascii"),
    ]);

    expect(validateUploadedFile({ file, buffer })).toMatch(/contenu du fichier ne correspond pas/i);
  });

  it("accepte un fichier exactement a la limite de taille (8 Mo)", () => {
    const file = makeFile("photo.jpg", "image/jpeg");
    const magic = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
    const buffer = Buffer.concat([magic, Buffer.alloc(MAX_DOCUMENT_SIZE_BYTES - magic.length)]);

    expect(validateUploadedFile({ file, buffer })).toBeNull();
  });

  it("rejette un buffer trop court pour verifier les magic bytes (< 4 octets)", () => {
    const file = makeFile("photo.jpg", "image/jpeg");
    expect(validateUploadedFile({ file, buffer: Buffer.from([0xff, 0xd8]) })).toMatch(/contenu du fichier ne correspond pas/i);
  });

  it("tolere une extension en majuscules (.JPG)", () => {
    const file = makeFile("PHOTO.JPG", "image/jpeg");
    const buffer = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(100)]);

    expect(validateUploadedFile({ file, buffer })).toBeNull();
  });

  it("nom de fichier avec double extension (doc.pdf.jpg) -> se base sur la derniere extension", () => {
    const file = makeFile("doc.pdf.jpg", "image/jpeg");
    const buffer = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(100)]);

    expect(validateUploadedFile({ file, buffer })).toBeNull();
  });

  it("fichier sans extension -> ignore la verification d'extension mais valide toujours les magic bytes", () => {
    const file = makeFile("document", "image/jpeg");
    const buffer = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(100)]);

    expect(validateUploadedFile({ file, buffer })).toBeNull();
  });
});
