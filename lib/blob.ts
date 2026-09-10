import { put } from "@vercel/blob";

// N'accepte que des images (jamais du HTML/JS/SVG arbitraire) : cette valeur devient le
// Content-Type public du fichier servi par le CDN Blob, un contenu non filtré ici serait
// hébergé tel quel avec le type MIME de son choix. Pas de SVG (peut embarquer du script).
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/heic"]);
// Généreux pour une photo de smartphone, mais borné : sans plafond, chaque appel décode
// l'intégralité du base64 en mémoire avant l'upload, un vecteur d'abus (coût de stockage,
// mémoire) facile à répéter par script.
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

/**
 * Convertit une data URL (image capturée/recadrée côté client via canvas.toDataURL) en
 * vrai fichier stocké sur Vercel Blob, et renvoie son URL publique. Évite de stocker le
 * base64 (souvent plusieurs centaines de Ko de texte) directement dans Postgres : la
 * colonne ne garde plus qu'une URL courte, l'image elle-même est servie par le CDN.
 */
export async function uploadDataUrlToBlob(dataUrl: string, pathname: string): Promise<string> {
  const match = dataUrl.match(/^data:(.+);base64,(.+)$/);
  if (!match) throw new Error("Format d'image invalide.");
  const [, contentType, base64] = match;
  if (!ALLOWED_IMAGE_TYPES.has(contentType)) {
    throw new Error("Format d'image non supporté (JPEG, PNG, WebP ou HEIC uniquement).");
  }

  const buffer = Buffer.from(base64, "base64");
  if (buffer.byteLength > MAX_IMAGE_BYTES) {
    throw new Error("Image trop volumineuse (10 Mo maximum).");
  }

  const blob = await put(pathname, buffer, {
    access: "public",
    contentType,
    addRandomSuffix: true,
  });
  return blob.url;
}
