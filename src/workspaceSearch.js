// Orama powers workspace search: a real full-text index over the saved library
// instead of a substring `includes`. The engine loads lazily on first search
// and the index is rebuilt only when the library array actually changes.

const SCHEMA = {
  id: "string",
  title: "string",
  content: "string",
  folder: "string",
  tag: "string",
  contentType: "string",
};

let cache = null; // { items: Array, db: Promise<OramaDb> }

async function buildIndex(items) {
  const { create, insertMultiple } = await import("@orama/orama");
  const db = await create({ schema: SCHEMA });
  await insertMultiple(
    db,
    items.map((item) => ({
      id: String(item.id),
      title: item.title || "",
      content: String(item.content || "").slice(0, 20000),
      folder: item.folder || "",
      tag: item.tag || "",
      contentType: item.contentType || "",
    }))
  );
  return db;
}

function indexFor(items) {
  if (!cache || cache.items !== items) {
    cache = { items, db: buildIndex(items) };
  }
  return cache.db;
}

/**
 * Full-text search over library items. Returns [{ id, score }] ordered by
 * Orama relevance — callers map ids back to items so ordering is preserved.
 */
export async function searchWorkspace(items, query, { limit = 60 } = {}) {
  const db = await indexFor(items);
  const { search } = await import("@orama/orama");
  const result = await search(db, {
    term: query,
    limit,
    tolerance: 1,
    boost: { title: 2, tag: 1.5 },
  });
  return result.hits.map((hit) => ({ id: hit.document.id, score: hit.score }));
}

// Reciprocal rank fusion — standard way to merge lexical + semantic rankings
// without trusting either score scale.
export function mergeRankedLists(lexical, semantic, { k = 60 } = {}) {
  const fused = new Map();
  lexical.forEach((hit, index) => {
    const entry = fused.get(hit.id) || { id: hit.id, score: 0 };
    entry.score += 1 / (k + index + 1);
    fused.set(hit.id, entry);
  });
  semantic.forEach((hit, index) => {
    const entry = fused.get(hit.id) || { id: hit.id, score: 0 };
    entry.score += 1 / (k + index + 1);
    fused.set(hit.id, entry);
  });
  return [...fused.values()].sort((a, b) => b.score - a.score);
}
