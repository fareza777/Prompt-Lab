/**
 * Scan worker — runs jscanify + @techstark/opencv-js off the main thread.
 * The ~9 MB opencv-js wasm init and the contour math block hard enough to
 * freeze a weak machine's UI for minutes; in a worker the page stays
 * responsive while the "Memindai…" state spins.
 *
 * jscanify needs DOM canvas — OffscreenCanvas supplies it here via the
 * self.document shim installed before the module loads. The wasm is inlined
 * as a data URI inside opencv.js, so no asset path resolution is needed.
 */

const MAX_SCAN_DIM = 1280;
const MAX_RESULT_DIM = 1500;

let scannerPromise = null;

async function loadScanner() {
  if (!scannerPromise) {
    scannerPromise = (async () => {
      const cvModule = await import("@techstark/opencv-js");
      let cv = cvModule.default ?? cvModule;
      // opencv.js exports a thenable that resolves once the wasm is ready;
      // the UMD build can also land on the worker global instead of the
      // module namespace.
      if (cv && typeof cv.then === "function") cv = await cv;
      if (!cv?.imread) cv = self.cv;
      if (!cv?.imread) throw new Error("OpenCV did not initialize");
      self.cv = cv; // jscanify reads the global at call time
      self.document = {
        createElement: (tag) => (tag === "canvas" ? new OffscreenCanvas(1, 1) : null),
        createElementNS: (_ns, tag) => (tag === "canvas" ? new OffscreenCanvas(1, 1) : null),
      };
      const jscanifyModule = await import("jscanify/client");
      const JScanify = jscanifyModule.default ?? self.jscanify;
      return new JScanify();
    })().catch((error) => {
      scannerPromise = null;
      throw error;
    });
  }
  return scannerPromise;
}

function fileToCanvas(bitmap, maxDim) {
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
  const canvas = new OffscreenCanvas(
    Math.round(bitmap.width * scale),
    Math.round(bitmap.height * scale)
  );
  canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas;
}

function distance(p1, p2) {
  return Math.hypot(p1.x - p2.x, p1.y - p2.y);
}

self.onmessage = async (event) => {
  const { photo } = event.data || {};
  try {
    const scanner = await loadScanner();
    const bitmap = await createImageBitmap(photo);
    const image = fileToCanvas(bitmap, MAX_SCAN_DIM);
    bitmap.close();
    const contour = scanner.findPaperContour(image);
    if (!contour) {
      self.postMessage({ corrected: false });
      return;
    }
    const corners = scanner.getCornerPoints(contour, image);
    const { topLeftCorner, topRightCorner, bottomLeftCorner, bottomRightCorner } = corners;
    // Estimate the paper's aspect from the contour so the warp doesn't
    // squash landscape documents into portrait frames.
    const width = (distance(topLeftCorner, topRightCorner) + distance(bottomLeftCorner, bottomRightCorner)) / 2;
    const height = (distance(topLeftCorner, bottomLeftCorner) + distance(topRightCorner, bottomRightCorner)) / 2;
    const scale = Math.min(1, MAX_RESULT_DIM / Math.max(width, height));
    const canvas = scanner.extractPaper(
      image,
      Math.max(1, Math.round(width * scale)),
      Math.max(1, Math.round(height * scale)),
      corners
    );
    if (!canvas) {
      self.postMessage({ corrected: false });
      return;
    }
    const blob = await canvas.convertToBlob({ type: "image/jpeg", quality: 0.92 });
    self.postMessage({ corrected: true, blob });
  } catch (error) {
    self.postMessage({ error: error?.message || String(error) });
  }
};
