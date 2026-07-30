import test from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import sharp from "sharp";
import { prepareExportImage } from "../server/exportImages.js";

async function noisyPhoto(width = 2400, height = 1800) {
  const pixels = randomBytes(width * height * 3);
  const jpeg = await sharp(pixels, { raw: { width, height, channels: 3 } })
    .jpeg({ quality: 94 })
    .toBuffer();
  return {
    dataUrl: `data:image/jpeg;base64,${jpeg.toString("base64")}`,
    original: jpeg,
  };
}

test("field photographs are bounded, rotated, and encoded as compact JPEG", async () => {
  const { dataUrl } = await noisyPhoto();
  const prepared = await prepareExportImage({ dataUrl });

  assert.ok(prepared);
  assert.equal(prepared.type, "jpg");
  assert.ok(Math.max(prepared.width, prepared.height) <= 1600);

  const metadata = await sharp(prepared.buffer).metadata();
  assert.equal(metadata.format, "jpeg");
  assert.ok(Math.max(metadata.width, metadata.height) <= 1600);
});

test("prepared field photographs are materially smaller than PNG", async () => {
  const { dataUrl } = await noisyPhoto(1800, 1200);
  const prepared = await prepareExportImage({ dataUrl });
  const png = await sharp(prepared.buffer).png().toBuffer();

  assert.ok(
    prepared.buffer.length < png.length * 0.45,
    `expected JPEG ${prepared.buffer.length} to be less than 45% of PNG ${png.length}`
  );
});

test("small photographs are never enlarged", async () => {
  const input = await sharp({
    create: { width: 480, height: 320, channels: 3, background: "#557799" },
  })
    .jpeg()
    .toBuffer();
  const prepared = await prepareExportImage({
    dataUrl: `data:image/jpeg;base64,${input.toString("base64")}`,
  });

  assert.equal(prepared.width, 480);
  assert.equal(prepared.height, 320);
});

test("an unreadable photograph is skipped", async () => {
  assert.equal(
    await prepareExportImage({ dataUrl: "data:image/jpeg;base64,bm90LWFuLWltYWdl" }),
    null
  );
});
