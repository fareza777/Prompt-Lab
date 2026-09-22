/**
 * Sync Android launcher / adaptive-icon / splash / notification icons
 * for the Capacitor project in android/ from
 * playstore/assets/app-icon-512.png (AI Work Studio brand).
 */
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import sharp from "sharp";

const root = process.cwd();
const source = join(root, "playstore", "assets", "app-icon-512.png");
const res = join(root, "android", "app", "src", "main", "res");

const launcher = {
  mdpi: 48,
  hdpi: 72,
  xhdpi: 96,
  xxhdpi: 144,
  xxxhdpi: 192,
};

// Adaptive-icon foreground layer is a 108dp canvas; the inner ~66dp is the
// safe zone, so the brand mark is centered at ~62% of the canvas.
const foreground = {
  mdpi: 108,
  hdpi: 162,
  xhdpi: 216,
  xxhdpi: 324,
  xxxhdpi: 432,
};

const splash = {
  mdpi: 300,
  hdpi: 450,
  xhdpi: 600,
  xxhdpi: 900,
  xxxhdpi: 1200,
};

const notification = {
  mdpi: 24,
  hdpi: 36,
  xhdpi: 48,
  xxhdpi: 72,
  xxxhdpi: 96,
};

const brandBg = "#f7f3eb";

async function writePng(path, pipeline) {
  mkdirSync(dirname(path), { recursive: true });
  await pipeline.png({ compressionLevel: 9 }).toFile(path);
  console.log("wrote", path.replace(root + "\\", "").replace(root + "/", ""));
}

const icon = sharp(source);

for (const [density, size] of Object.entries(launcher)) {
  await writePng(
    join(res, `mipmap-${density}`, "ic_launcher.png"),
    icon.clone().resize(size, size),
  );
  await writePng(
    join(res, `mipmap-${density}`, "ic_launcher_round.png"),
    icon.clone().resize(size, size),
  );
}

for (const [density, size] of Object.entries(foreground)) {
  const mark = Math.round(size * 0.62);
  const markBuf = await icon.clone().resize(mark, mark).png().toBuffer();
  await writePng(
    join(res, `mipmap-${density}`, "ic_launcher_foreground.png"),
    sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    }).composite([{ input: markBuf, gravity: "centre" }]),
  );
}

for (const [density, size] of Object.entries(splash)) {
  // Centered brand mark on splash background for both orientations.
  const mark = Math.round(size * 0.42);
  const markBuf = await icon.clone().resize(mark, mark).png().toBuffer();
  const splashImage = sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: brandBg,
    },
  }).composite([{ input: markBuf, gravity: "centre" }]);

  for (const bucket of [`drawable-port-${density}`, `drawable-land-${density}`]) {
    await writePng(join(res, bucket, "splash.png"), splashImage.clone());
  }
  if (density === "xxhdpi") {
    await writePng(join(res, "drawable", "splash.png"), splashImage.clone());
  }
}

// Status-bar notification icons: white alpha silhouette (Android convention).
const notifSvg = Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>
<svg width="96" height="96" viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg">
  <rect x="24" y="14" width="48" height="58" rx="6" fill="#fff"/>
  <path d="M70 62 L72 68 L78 70 L72 72 L70 78 L68 72 L62 70 L68 68 Z" fill="#fff"/>
</svg>`);

for (const [density, size] of Object.entries(notification)) {
  await writePng(
    join(res, `drawable-${density}`, "ic_notification_icon.png"),
    sharp(notifSvg).resize(size, size),
  );
}

console.log("Android icons synced from playstore/assets/app-icon-512.png");
