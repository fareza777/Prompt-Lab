/**
 * Prompt version history for library items.
 */

const MAX_VERSIONS = 20;

function newVersionId() {
  return globalThis.crypto?.randomUUID?.() || `v-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function appendPromptVersion(item, content, meta = {}) {
  const text = String(content || "").trim();
  if (!text) return item;

  const versions = Array.isArray(item?.versions) ? [...item.versions] : [];
  const version = {
    id: newVersionId(),
    content: text,
    createdAt: Date.now(),
    source: meta.source || "manual",
    score: meta.score ?? null,
    mode: meta.mode || null,
    note: meta.note || "",
  };

  return {
    ...item,
    content: text,
    updatedAt: Date.now(),
    versions: [version, ...versions].slice(0, MAX_VERSIONS),
  };
}

export function createLibraryItem({ title, content, folder, tag, meta = {} }) {
  const item = {
    id: newVersionId(),
    title: String(title || "Prompt").trim() || "Prompt",
    content: String(content || ""),
    folder: folder || "General",
    tag: tag || "General",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    versions: [],
  };
  return appendPromptVersion(item, content, meta);
}

export function getPromptVersions(item) {
  return Array.isArray(item?.versions) ? item.versions : [];
}

export function mergeLibraryItemVersions(localItem, remoteItem) {
  if (!localItem?.id || !remoteItem?.id || localItem.id !== remoteItem.id) {
    return null;
  }
  const allVersions = [
    ...(Array.isArray(localItem.versions) ? localItem.versions : []),
    ...(Array.isArray(remoteItem.versions) ? remoteItem.versions : []),
  ];
  const byId = new Map();
  for (const v of allVersions) {
    if (!v?.id) continue;
    const prev = byId.get(v.id);
    if (!prev || (v.createdAt || 0) >= (prev.createdAt || 0)) byId.set(v.id, v);
  }
  const versions = [...byId.values()].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)).slice(0, MAX_VERSIONS);
  const newer = (localItem.updatedAt || 0) >= (remoteItem.updatedAt || 0) ? localItem : remoteItem;
  return {
    ...newer,
    versions,
    content: newer.content || localItem.content || remoteItem.content,
    updatedAt: Math.max(localItem.updatedAt || 0, remoteItem.updatedAt || 0),
  };
}
