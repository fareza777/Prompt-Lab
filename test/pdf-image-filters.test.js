import assert from "node:assert/strict";
import test from "node:test";
import { deflateSync } from "node:zlib";
import sharp from "sharp";
import { extractPdfImages } from "../server/pdfText.js";

async function jpeg() {
  return sharp({
    create: { width: 900, height: 600, channels: 3, background: "#336699" },
  })
    .jpeg()
    .toBuffer();
}

function ascii85(buffer) {
  const input = Buffer.from(buffer);
  let output = "";
  for (let index = 0; index < input.length; index += 4) {
    const remaining = Math.min(4, input.length - index);
    let value = 0;
    for (let offset = 0; offset < 4; offset += 1) {
      value = value * 256 + (offset < remaining ? input[index + offset] : 0);
    }
    if (remaining === 4 && value === 0) {
      output += "z";
      continue;
    }
    const digits = Array(5).fill(0);
    for (let digit = 4; digit >= 0; digit -= 1) {
      digits[digit] = (value % 85) + 33;
      value = Math.floor(value / 85);
    }
    output += String.fromCharCode(...digits.slice(0, remaining + 1));
  }
  return Buffer.from(`${output}~>`, "ascii");
}

function imageObject(filter, stream, width = 900, height = 600) {
  const header = Buffer.from(
    `4 0 obj << /Width ${width} /Height ${height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Subtype /Image /Type /XObject /Filter ${filter} /Length ${stream.length} >>\nstream\n`,
    "latin1"
  );
  const footer = Buffer.from("\nendstream\nendobj\n", "latin1");
  return Buffer.concat([header, stream, footer]);
}

test("PDF image filters are decoded before pages enter the vision path", async () => {
  const source = await jpeg();
  const cases = [
    ["[ /ASCII85Decode /DCTDecode ]", ascii85(source)],
    ["[ /FlateDecode /DCTDecode ]", deflateSync(source)],
  ];

  for (const [filter, stream] of cases) {
    const [image] = await extractPdfImages(imageObject(filter, stream), 1);
    assert.ok(image, `expected an image for ${filter}`);
    const metadata = await sharp(image.buffer).metadata();
    assert.equal(metadata.format, "jpeg", `decoded ${filter} should be JPEG`);
  }
});
