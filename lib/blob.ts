import { put } from "@vercel/blob";

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
  const buffer = Buffer.from(base64, "base64");

  const blob = await put(pathname, buffer, {
    access: "public",
    contentType,
    addRandomSuffix: true,
  });
  return blob.url;
}
