import { beforeEach, describe, expect, it, vi } from "vitest";

const putMock = vi.fn();
vi.mock("@vercel/blob", () => ({ put: putMock }));

const { ALLOWED_IMAGE_TYPES, MAX_IMAGE_BYTES, uploadDataUrlToBlob } = await import("./blob");

beforeEach(() => {
  putMock.mockReset();
  putMock.mockResolvedValue({ url: "https://blob.example/dispos/store-1-abc123.jpg" });
});

// 1x1 px JPEG minimal, valide en base64 (peu importe son contenu réel pour ces tests :
// uploadDataUrlToBlob ne décode jamais l'image, seulement sa taille en octets).
const TINY_JPEG_BASE64 =
  "/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAMCAgICAgMCAgIDAwMDBAYEBAQEBAgGBgUGCQgKCgkICQkKDA8MCgsOCwkJDRENDg8QEBEQCgwSExIQEw8QEBD/2wBDAQMDAwQDBAgEBAgQCwkLEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBD/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAj/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=";

describe("uploadDataUrlToBlob", () => {
  it("rejette une chaîne qui n'est pas une data URL", async () => {
    await expect(uploadDataUrlToBlob("https://example.com/photo.jpg", "x.jpg")).rejects.toThrow();
    expect(putMock).not.toHaveBeenCalled();
  });

  it("rejette un type MIME non autorisé (ex. SVG, qui peut embarquer du script)", async () => {
    await expect(
      uploadDataUrlToBlob(`data:image/svg+xml;base64,${TINY_JPEG_BASE64}`, "x.svg")
    ).rejects.toThrow();
    expect(putMock).not.toHaveBeenCalled();
  });

  it.each([...ALLOWED_IMAGE_TYPES])("accepte le type MIME autorisé %s", async (type) => {
    const url = await uploadDataUrlToBlob(`data:${type};base64,${TINY_JPEG_BASE64}`, "x");
    expect(url).toBe("https://blob.example/dispos/store-1-abc123.jpg");
    expect(putMock).toHaveBeenCalledWith(
      "x",
      expect.any(Buffer),
      expect.objectContaining({ access: "public", contentType: type })
    );
  });

  it("rejette une image dépassant la taille maximale", async () => {
    // Base64 valide (alphabet correct) dont le décodage dépasse MAX_IMAGE_BYTES : la
    // longueur décodée est ~3/4 de la longueur de la chaîne base64.
    const oversizedBase64 = "A".repeat(Math.ceil((MAX_IMAGE_BYTES * 4) / 3) + 100);
    await expect(
      uploadDataUrlToBlob(`data:image/jpeg;base64,${oversizedBase64}`, "x.jpg")
    ).rejects.toThrow();
    expect(putMock).not.toHaveBeenCalled();
  });
});
