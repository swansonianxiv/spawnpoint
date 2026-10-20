// Wallpaper bytes live in IndexedDB, separate from the small settings record.
// Re-encoding uploads bounds file size and removes image metadata.
export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;
export const MAX_IMAGE_BYTES = 1536 * 1024;
export const WALLPAPER_SIGNAL = "spawnpoint.wallpaper.changed";
const TYPES = ["image/jpeg", "image/png", "image/webp"];
export function imagePlan(width, height) {
  if (
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    width < 1 ||
    height < 1 ||
    width * height > 40_000_000
  )
    throw new Error("Choose an image smaller than 40 megapixels.");
  const ratio = Math.min(1, 2560 / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * ratio)),
    height: Math.max(1, Math.round(height * ratio)),
  };
}
function database() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("spawnpoint.assets", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("images");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(new Error("Image storage is unavailable in this browser."));
    request.onblocked = () =>
      reject(new Error("Close other Spawnpoint tabs and try again."));
  });
}
async function transact(mode, operation) {
  const db = await database();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction("images", mode);
      const request = operation(tx.objectStore("images"));
      tx.oncomplete = () => resolve(request.result);
      tx.onerror = tx.onabort = () =>
        reject(
          new Error(
            "The wallpaper could not be saved. Your previous image is unchanged.",
          ),
        );
    });
  } finally {
    db.close();
  }
}
export const readWallpaper = () =>
  transact("readonly", (store) => store.get("wallpaper"));
export const writeWallpaper = (value) =>
  transact("readwrite", (store) =>
    value ? store.put(value, "wallpaper") : store.delete("wallpaper"),
  );
function canvasBlob(canvas, type, quality) {
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) =>
        blob
          ? resolve(blob)
          : reject(new Error("This image could not be processed.")),
      type,
      quality,
    ),
  );
}
export async function prepareWallpaper(file) {
  if (!TYPES.includes(file.type))
    throw new Error("Choose a JPG, PNG, or WebP image.");
  if (file.size > MAX_UPLOAD_BYTES)
    throw new Error("Choose an image smaller than 20 MB.");
  const url = URL.createObjectURL(file);
  const image = new Image();
  try {
    image.src = url;
    try {
      await image.decode();
    } catch {
      throw new Error("This file could not be read as an image.");
    }
    const size = imagePlan(image.naturalWidth, image.naturalHeight);
    const canvas = document.createElement("canvas");
    canvas.width = size.width;
    canvas.height = size.height;
    const context = canvas.getContext("2d");
    if (!context)
      throw new Error("Image processing is unavailable in this browser.");
    context.fillStyle = "#141615";
    context.fillRect(0, 0, size.width, size.height);
    context.drawImage(image, 0, 0, size.width, size.height);
    let blob;
    for (const quality of [0.88, 0.76, 0.6, 0.45]) {
      blob = await canvasBlob(canvas, "image/webp", quality);
      if (blob.type !== "image/webp")
        blob = await canvasBlob(canvas, "image/jpeg", quality);
      if (blob.size <= MAX_IMAGE_BYTES) break;
    }
    if (blob.size > MAX_IMAGE_BYTES)
      throw new Error(
        "This image is too detailed to save. Try a smaller copy.",
      );
    return { blob, name: file.name.slice(0, 150) };
  } finally {
    URL.revokeObjectURL(url);
  }
}
export function exportWallpaper(asset) {
  if (!asset) return Promise.resolve(null);
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve({ name: asset.name, data: reader.result });
    reader.onerror = () =>
      reject(new Error("Could not include the wallpaper in your backup."));
    reader.readAsDataURL(asset.blob);
  });
}
export function importWallpaper(value) {
  if (value === null) return null;
  if (
    !value ||
    typeof value.name !== "string" ||
    value.name.length > 150 ||
    typeof value.data !== "string" ||
    value.data.length > 2.1 * 1024 * 1024
  )
    throw new Error("Invalid wallpaper in backup.");
  const match = value.data.match(
    /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/,
  );
  if (!match) throw new Error("Invalid wallpaper image in backup.");
  let bytes;
  try {
    bytes = Uint8Array.from(atob(match[2]), (c) => c.charCodeAt(0));
  } catch {
    throw new Error("Invalid wallpaper data in backup.");
  }
  if (bytes.length > MAX_IMAGE_BYTES)
    throw new Error("Wallpaper in backup is too large.");
  return new File([bytes], value.name, { type: match[1] });
}
