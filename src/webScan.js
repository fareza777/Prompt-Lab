/**
 * Web document scanner — the browser counterpart of the native ML Kit scan
 * button. jscanify finds the paper contour and perspective-corrects it with
 * OpenCV (@techstark/opencv-js). Both are heavy (~9 MB wasm), so everything
 * here stays behind dynamic imports and never enters the initial bundle.
 */

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

async function fileToImageElement(file) {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  canvas.getContext("2d").drawImage(bitmap, 0, 0);
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

/**
 * @param {File} photo camera/gallery capture
 * @returns {Promise<{file: File, corrected: boolean}>} corrected JPEG, or the
 *   original photo when no paper contour is found (caller decides whether to
 *   warn — returning it keeps the capture usable).
 */
export async function scanPhotoToFile(photo) {
  const scanner = await loadScanner();
  const image = await fileToImageElement(photo);
  // Ask for the photo's own proportions; jscanify returns null when the
  // contour isn't paper-shaped (glare, clutter, too close).
  const canvas = scanner.extractPaper(image, image.width, image.height);
  if (!canvas) return { file: photo, corrected: false };
  const base = (photo.name || "scan").replace(/\.[^.]+$/, "");
  return { file: await canvasToJpegFile(canvas, `${base}-scan.jpg`), corrected: true };
}
