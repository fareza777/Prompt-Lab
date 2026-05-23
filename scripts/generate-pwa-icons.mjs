import { mkdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import sharp from "sharp";

const root = process.cwd();
const svgPath = join(root, "public", "promptlab-icon.svg");
const outDir = join(root, "public", "icons");

const sizes = [
  { name: "icon-192.png", size: 192, padding: 0.12 },
  { name: "icon-512.png", size: 512, padding: 0.12 },
  { name: "maskable-512.png", size: 512, padding: 0.22 },
];

const svg = await readFile(svgPath);
await mkdir(outDir, { recursive: true });

for (const { name, size, padding } of sizes) {
  const inset = Math.round(size * padding);
  const inner = size - inset * 2;
  const png = await sharp(svg).resize(inner, inner).png().toBuffer();
  const canvas = sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 6, g: 16, b: 17, alpha: 1 },
    },
  });
  await canvas
    .composite([{ input: png, left: inset, top: inset }])
    .png()
    .toFile(join(outDir, name));
  console.log("wrote", name);
}

console.log("PWA icons generated in public/icons/");
