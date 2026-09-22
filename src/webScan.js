/**
 * Web document scanner — main-thread client for scanWorker.js.
 * jscanify + @techstark/opencv-js (~9 MB wasm) run inside a Web Worker so
 * the init and contour math can't freeze the page on weak hardware.
 */

let worker = null;

function getWorker() {
  if (!worker) {
    worker = new Worker(new URL("./scanWorker.js", import.meta.url), { type: "module" });
  }
  return worker;
}

/**
 * @param {File} photo camera/gallery capture
 * @returns {Promise<{file: File, corrected: boolean}>} corrected JPEG, or the
 *   original photo when no paper contour is found (caller decides whether to
 *   warn — returning it keeps the capture usable).
 */
export function scanPhotoToFile(photo) {
  const scan = getWorker();
  return new Promise((resolve, reject) => {
    scan.onmessage = (event) => {
      const { corrected, blob, error } = event.data || {};
      if (error) {
        reject(new Error(error));
        return;
      }
      if (corrected && blob) {
        const base = (photo.name || "scan").replace(/\.[^.]+$/, "");
        resolve({ file: new File([blob], `${base}-scan.jpg`, { type: "image/jpeg" }), corrected: true });
      } else {
        resolve({ file: photo, corrected: false });
      }
    };
    scan.onerror = (event) => reject(new Error(event?.message || "scan worker failed"));
    scan.postMessage({ photo });
  });
}
