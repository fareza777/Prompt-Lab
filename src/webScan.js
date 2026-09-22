/**
 * Web document scanner — the browser counterpart of the native ML Kit scan
 * button. jscanify finds the paper contour and perspective-corrects it with
 * OpenCV (@techstark/opencv-js). Both are heavy (~9 MB wasm), so everything
 * here stays behind dynamic imports and never enters the initial bundle.
 */

// Contour detection on multi-megapixel photos wedges the main thread for
// minutes on weak hardware — OpenCV always works on this downscaled copy.
const MAX_SCAN_DIM = 1280;
const MAX_RESULT_DIM = 1500;

let scannerPromise = null;

async function loadScanner() {
  if (!scannerPromise) {
    scannerPromise = (async () => {
      const cvModule = await import("@techstark/opencv-js");
      let cv = cvModule.default ?? cvModule;
      // opencv.js exports a thenable that resolves once the wasm is ready.
      if (cv && typeof cv.then === "function") cv = await cv;
      if (!cv?.imread) throw new Error("OpenCV did not initialize");
      window.cv = cv; // jscanify reads the global at call time
      const jscanifyModule = await import("jscanify/client");
      const JScanify = jscanifyModule.default ?? jscanifyModule ?? window.jscanify;
      return new JScanify();
    })().catch((error) => {
      scannerPromise = null;
      throw error;
    });
  }
  return scannerPromise;
}

async function fileToCanvas(file, maxDim) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas;
}

function canvasToJpegFile(canvas, name) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(new File([blob], name, { type: "image/jpeg" })) : reject(new Error("export failed"))),
      "image/jpeg",
      0.92
    );
  });
}

function distance(p1, p2) {
  return Math.hypot(p1.x - p2.x, p1.y - p2.y);
}

/**
 * @param {File} photo camera/gallery capture
 * @returns {Promise<{file: File, corrected: boolean}>} corrected JPEG, or the
 *   original photo when no paper contour is found (caller decides whether to
 *   warn — returning it keeps the capture usable).
 */
export async function scanPhotoToFile(photo) {
  const scanner = await loadScanner();
  const image = await fileToCanvas(photo, MAX_SCAN_DIM);
  const contour = scanner.findPaperContour(image);
  if (!contour) return { file: photo, corrected: false };
  const corners = scanner.getCornerPoints(contour, image);
  const { topLeftCorner, topRightCorner, bottomLeftCorner, bottomRightCorner } = corners;
  // Estimate the paper's aspect from the contour so the warp doesn't squash
  // landscape documents into portrait frames.
  const width = (distance(topLeftCorner, topRightCorner) + distance(bottomLeftCorner, bottomRightCorner)) / 2;
  const height = (distance(topLeftCorner, bottomLeftCorner) + distance(topRightCorner, bottomRightCorner)) / 2;
  const scale = Math.min(1, MAX_RESULT_DIM / Math.max(width, height));
  const canvas = scanner.extractPaper(image, Math.max(1, Math.round(width * scale)), Math.max(1, Math.round(height * scale)), corners);
  if (!canvas) return { file: photo, corrected: false };
  const base = (photo.name || "scan").replace(/\.[^.]+$/, "");
  return { file: await canvasToJpegFile(canvas, `${base}-scan.jpg`), corrected: true };
}
