import sharp from "sharp";

/**
 * Score de qualite (0-100) base sur deux mesures simples :
 *  - nettete : variance locale des pixels (proxy leger du laplacien, sans
 *    dependance a une lib de vision lourde) - une image floue a une
 *    variance faible.
 *  - exposition : luminosite moyenne trop basse (sous-expose) ou trop
 *    haute (surexpose/glare) penalise le score.
 *
 * Ce n'est pas une detection de flou "state of the art", mais suffisant
 * pour rejeter les photos manifestement inutilisables avant de gaspiller
 * un appel OCR dessus.
 */
export async function analyzeImageQuality(buffer: Buffer): Promise<number> {
  const SIZE = 128;
  const { data } = await sharp(buffer)
    .rotate()
    .resize(SIZE, SIZE, { fit: "fill" })
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  let sum = 0;
  for (let i = 0; i < data.length; i++) sum += data[i];
  const mean = sum / data.length;

  let sharpnessSum = 0;
  for (let y = 1; y < SIZE - 1; y++) {
    for (let x = 1; x < SIZE - 1; x++) {
      const idx = y * SIZE + x;

      // approx laplacien : |4*p - haut - bas - gauche - droite|
      const laplacian =
        4 * data[idx] - data[idx - 1] - data[idx + 1] - data[idx - SIZE] - data[idx + SIZE];
      sharpnessSum += Math.abs(laplacian);
    }
  }

  const pixelCount = (SIZE - 2) * (SIZE - 2);
  const sharpness = sharpnessSum / pixelCount;

  // Seuils empiriques : a ajuster avec de vraies donnees de production.
  const sharpnessScore = Math.min(100, (sharpness / 25) * 100);

  const exposureDeviation = Math.abs(mean - 128) / 128; // 0 = expo ideale, 1 = tout noir/blanc
  const exposureScore = Math.max(0, 100 - exposureDeviation * 150);

  return Math.round(sharpnessScore * 0.7 + exposureScore * 0.3);
}
