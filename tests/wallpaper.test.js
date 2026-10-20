import test from "node:test";
import assert from "node:assert/strict";
import { imagePlan, importWallpaper, MAX_IMAGE_BYTES } from "../wallpaper.js";
test("large wallpaper dimensions preserve aspect ratio without upscaling", () => {
  assert.deepEqual(imagePlan(6000, 4000), { width: 2560, height: 1707 });
  assert.deepEqual(imagePlan(800, 600), { width: 800, height: 600 });
  assert.throws(() => imagePlan(10000, 10000));
  assert.throws(() => imagePlan(0, 100));
});
test("wallpaper backups accept raster payloads and reject remote or executable sources", () => {
  assert.equal(importWallpaper(null), null);
  const file = importWallpaper({
    name: "photo.webp",
    data: "data:image/webp;base64,UklGRg==",
  });
  assert.equal(file.type, "image/webp");
  assert.equal(file.size, 4);
  for (const data of [
    "https://example.com/image.png",
    "data:image/svg+xml;base64,PHN2Zy8+",
    "javascript:alert(1)",
    "data:image/webp;base64,%%%%",
  ])
    assert.throws(() => importWallpaper({ name: "image", data }));
  assert.throws(() =>
    importWallpaper({
      name: "image",
      data: "data:image/webp;base64," + "A".repeat(MAX_IMAGE_BYTES * 2),
    }),
  );
});
