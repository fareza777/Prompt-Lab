// Yjs + y-indexeddb give the workbench local-first autosave: the draft survives
// reloads and Android process death, and every output snapshot is kept as a
// bounded version list the user can restore. Attachment File bodies can't live
// inside Y types, so they go to a plain IndexedDB store alongside the doc.

import * as Y from "yjs";

export const DRAFT_DB_NAME = "promptlab-workbench";
export const MAX_VERSIONS = 10;
export const VERSION_SNAPSHOT_MIN_CHARS = 40;

let session = null; // { doc, provider, draft, versions }

export function draftStorageSupported() {
  return typeof indexedDB !== "undefined";
}

export async function initDraftStore() {
  if (!draftStorageSupported()) return null;
  if (!session) {
    const { IndexeddbPersistence } = await import("y-indexeddb");
    const doc = new Y.Doc();
    const provider = new IndexeddbPersistence(DRAFT_DB_NAME, doc);
    await provider.whenSynced;
    session = {
      doc,
      provider,
      draft: doc.getMap("draft"),
      versions: doc.getArray("versions"),
    };
  }
  return session;
}

// --- pure helpers (unit-tested without IndexedDB) ---

export function snapshotToDraft(snapshot) {
  if (!snapshot || typeof snapshot !== "object") return null;
  return {
    narrative: String(snapshot.narrative || ""),
    category: String(snapshot.category || ""),
    tone: String(snapshot.tone || ""),
    model: String(snapshot.model || ""),
    outputType: String(snapshot.outputType || ""),
    runOutput: String(snapshot.runOutput || ""),
    attachments: Array.isArray(snapshot.attachments) ? snapshot.attachments : [],
    savedAt: Number(snapshot.savedAt || 0),
  };
}

export function pushVersionToArray(yarray, markdown, max = MAX_VERSIONS) {
  const text = String(markdown || "").trim();
  if (text.length < VERSION_SNAPSHOT_MIN_CHARS) return false;
  // Dedupe against every stored entry, not just the last: restoring an older
  // version pushes its markdown through here again and would otherwise clone it.
  for (let index = 0; index < yarray.length; index += 1) {
    if (yarray.get(index)?.markdown === text) return false;
  }
  yarray.push([{ savedAt: Date.now(), markdown: text }]);
  while (yarray.length > max) yarray.delete(0, 1);
  return true;
}

// --- persisted API ---

export function readDraft() {
  if (!session) return null;
  const raw = session.draft.get("snapshot");
  return snapshotToDraft(raw);
}

export function writeDraft(snapshot) {
  if (!session) return;
  session.doc.transact(() => {
    session.draft.set("snapshot", { ...snapshotToDraft(snapshot), savedAt: Date.now() });
  });
}

export function listVersions() {
  if (!session) return [];
  return session.versions
    .toArray()
    .map((entry, index) => ({ index, savedAt: entry.savedAt, markdown: entry.markdown }));
}

export function recordVersion(markdown) {
  if (!session) return false;
  let added = false;
  session.doc.transact(() => {
    added = pushVersionToArray(session.versions, markdown);
  });
  return added;
}

// --- attachment file bodies (plain IDB, parallel to the Yjs doc) ---

const FILES_DB = "promptlab-workbench-files";
const FILES_STORE = "files";

function openFilesDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(FILES_DB, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(FILES_STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveAttachmentFiles(attachments) {
  const db = await openFilesDb();
  try {
    const tx = db.transaction(FILES_STORE, "readwrite");
    const store = tx.objectStore(FILES_STORE);
    // Bodies for attachments the user removed would linger forever otherwise.
    const liveIds = new Set(attachments.map((item) => item?.id).filter(Boolean));
    const staleKeys = await new Promise((resolve, reject) => {
      const req = store.getAllKeys();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    for (const key of staleKeys) {
      if (!liveIds.has(String(key))) store.delete(key);
    }
    for (const item of attachments) {
      if (item?.id && item.file instanceof File) {
        store.put(item.file, item.id);
      }
    }
    await new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

export async function loadAttachmentFiles() {
  const db = await openFilesDb();
  try {
    const tx = db.transaction(FILES_STORE, "readonly");
    const store = tx.objectStore(FILES_STORE);
    const [keys, values] = await Promise.all([
      new Promise((resolve, reject) => {
        const req = store.getAllKeys();
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      }),
      new Promise((resolve, reject) => {
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      }),
    ]);
    const map = new Map();
    keys.forEach((key, index) => map.set(String(key), values[index]));
    return map;
  } finally {
    db.close();
  }
}

export async function clearAttachmentFiles() {
  const db = await openFilesDb();
  try {
    const tx = db.transaction(FILES_STORE, "readwrite");
    tx.objectStore(FILES_STORE).clear();
    await new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

/**
 * Rebuild attachment entries from persisted metadata + stored File bodies.
 * Blob preview URLs never survive a reload, so they are recreated here.
 */
export async function materializeAttachments(metas) {
  const files = await loadAttachmentFiles().catch(() => new Map());
  return (metas || [])
    .map((meta) => {
      const file = files.get(String(meta.id));
      return {
        id: meta.id,
        name: meta.name,
        type: meta.type,
        kind: meta.kind,
        sizeLabel: meta.sizeLabel,
        excerpt: meta.excerpt || "",
        slot: meta.slot,
        file,
        preview:
          file && String(meta.type || "").startsWith("image/")
            ? URL.createObjectURL(file)
            : "",
      };
    })
    .filter((item) => item.file || item.excerpt);
}
