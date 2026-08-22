import sharp from "sharp";

/**
 * Hashs perceptuels pour la detection de doublons entre documents.
 *
 * dHash (difference hash) : rapide, robuste au recadrage leger et aux
 * variations de luminosite - bon signal principal.
 *
 * pHash (perceptual hash via DCT) : plus couteux mais robuste aux
 * changements d'echelle/compression - utilise en corroboration.
 *
 * Les deux sont normalises (niveaux de gris + redimensionnement) avant
 * comparaison, comme recommande : deux photos differentes de la meme
 * carte doivent produire des hashs proches, pas identiques au pixel pres.
 */

async function toGrayscalePixels(buffer: Buffer, size: number): Promise<Float64Array> {
  const { data } = await sharp(buffer)
    .rotate() // corrige l'orientation EXIF avant tout traitement
    .resize(size, size, { fit: "fill" })
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const pixels = new Float64Array(size * size);
  for (let i = 0; i < pixels.length; i++) pixels[i] = data[i];
  return pixels;
}

/** dHash 64 bits : compare chaque pixel a son voisin de droite sur une grille 9x8. */
export async function computeDHash(buffer: Buffer): Promise<string> {
  const width = 9;
  const height = 8;
  const { data } = await sharp(buffer)
    .rotate()
    .resize(width, height, { fit: "fill" })
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  let hash = BigInt(0);
  const ONE = BigInt(1);
  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width - 1; col++) {
      const left = data[row * width + col];
      const right = data[row * width + col + 1];
      hash = (hash << ONE) | (left > right ? ONE : BigInt(0));
    }
  }
  return hash.toString(16).padStart(16, "0");
}

function dct1D(vector: Float64Array): Float64Array {
  const N = vector.length;
  const out = new Float64Array(N);
  for (let k = 0; k < N; k++) {
    let sum = 0;
    for (let n = 0; n < N; n++) {
      sum += vector[n] * Math.cos((Math.PI / N) * (n + 0.5) * k);
    }
    out[k] = sum * (k === 0 ? Math.sqrt(1 / N) : Math.sqrt(2 / N));
  }
  return out;
}

/** pHash 64 bits : DCT 2D sur une grille 32x32, on garde les 8x8 basses frequences (hors DC). */
export async function computePHash(buffer: Buffer): Promise<string> {
  const SIZE = 32;
  const pixels = await toGrayscalePixels(buffer, SIZE);

  // DCT 2D separable : d'abord sur les lignes, puis sur les colonnes.
  const rows: Float64Array[] = [];
  for (let y = 0; y < SIZE; y++) {
    rows.push(dct1D(pixels.slice(y * SIZE, (y + 1) * SIZE)));
  }
  const dct = new Float64Array(SIZE * SIZE);
  for (let x = 0; x < SIZE; x++) {
    const column = new Float64Array(SIZE);
    for (let y = 0; y < SIZE; y++) column[y] = rows[y][x];
    const transformed = dct1D(column);
    for (let y = 0; y < SIZE; y++) dct[y * SIZE + x] = transformed[y];
  }

  const LOW = 8;
  const coeffs: number[] = [];
  for (let y = 0; y < LOW; y++) {
    for (let x = 0; x < LOW; x++) {
      if (x === 0 && y === 0) continue; // terme DC exclu (moyenne globale, non discriminant)
      coeffs.push(dct[y * SIZE + x]);
    }
  }

  const sorted = [...coeffs].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];

  let hash = BigInt(0);
  const ONE = BigInt(1);
  for (const c of coeffs) {
    hash = (hash << ONE) | (c > median ? ONE : BigInt(0));
  }
  return hash.toString(16).padStart(16, "0");
}

/** Distance de Hamming entre deux hashs hexadecimaux de meme longueur. */
export function hammingDistance(hexA: string, hexB: string): number {
  const a = BigInt(`0x${hexA}`);
  const b = BigInt(`0x${hexB}`);
  const ONE = BigInt(1);
  let xor = a ^ b;
  let distance = 0;
  while (xor > BigInt(0)) {
    distance += Number(xor & ONE);
    xor >>= ONE;
  }
  return distance;
}
