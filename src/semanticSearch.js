// Transformers.js supplies local embeddings (all-MiniLM-L6-v2, ~23 MB one-time
// download cached by the browser) to re-rank Orama's lexical hits semantically.
// Everything degrades silently to plain Orama when the model can't load — the
// app never blocks a search on a model download.

const MODEL_ID = "Xenova/all-MiniLM-L6-v2";
const MAX_DOCS = 60;
const DOC_CHARS = 1200;

let embedderPromise = null;

export function ensureEmbedder() {
  if (!embedderPromise) {
    embedderPromise = (async () => {
      const { pipeline } = await import("@huggingface/transformers");
      return pipeline("feature-extraction", MODEL_ID, { dtype: "q8" });
    })().catch((error) => {
      embedderPromise = null;
      throw error;
    });
  }
  return embedderPromise;
}

function meanPool(tensor) {
  // feature-extraction returns [1, seq, dims]; average over tokens.
  const data = tensor.data;
  const [batch, seq, dims] = tensor.dims;
  const out = new Float32Array(dims);
  for (let s = 0; s < seq; s++) {
    for (let d = 0; d < dims; d++) out[d] += data[s * dims + d];
  }
  const norm = Math.hypot(...out) || 1;
  for (let d = 0; d < dims; d++) out[d] /= seq * norm;
  void batch;
  return out;
}

export async function embedText(embedder, text) {
  const output = await embedder(String(text).slice(0, DOC_CHARS), {
    pooling: "mean",
    normalize: true,
  });
  return output.data ? output.data : meanPool(output);
}

export function cosineRank(queryVector, docVectors, hits) {
  return hits
    .map((hit, index) => {
      const v = docVectors[index];
      let score = 0;
      for (let i = 0; i < v.length; i++) score += v[i] * queryVector[i];
      return { id: hit.id, score };
    })
    .sort((a, b) => b.score - a.score);
}

/**
 * Re-rank Orama hits by embedding similarity. Returns null when the model or
 * embeddings are unavailable — callers keep the lexical order unchanged.
 */
export async function rankSemantically(query, hits, items) {
  if (!hits.length) return null;
  const embedder = await ensureEmbedder();
  const subset = hits.slice(0, MAX_DOCS);
  const byId = new Map(items.map((item) => [String(item.id), item]));
  const queryVector = await embedText(embedder, query);
  const docVectors = await Promise.all(
    subset.map((hit) => {
      const item = byId.get(String(hit.id)) || {};
      return embedText(embedder, `${item.title || ""}\n${item.content || ""}`);
    })
  );
  return cosineRank(queryVector, docVectors, subset);
}
