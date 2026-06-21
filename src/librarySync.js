const SYNC_KEY = "promptlab-library-synced-at";

function itemTimestamp(item) {
  return Number(item?.updatedAt || item?.createdAt || 0);
}

export function mergeLibraryPayload(local = {}, remote = {}) {
  const localLibrary = Array.isArray(local.library) ? local.library : [];
  const localTemplates = Array.isArray(local.customTemplates) ? local.customTemplates : [];
  const remoteLibrary = Array.isArray(remote.library) ? remote.library : [];
  const remoteTemplates = Array.isArray(remote.customTemplates) ? remote.customTemplates : [];

  const mergeById = (a = [], b = []) => {
    const map = new Map();
    for (const item of a) if (item?.id) map.set(item.id, item);
    for (const item of b) {
      if (!item?.id) continue;
      const prev = map.get(item.id);
      if (!prev || itemTimestamp(item) >= itemTimestamp(prev)) map.set(item.id, item);
    }
    return [...map.values()].sort((x, y) => itemTimestamp(y) - itemTimestamp(x));
  };

  return {
    library: mergeById(localLibrary, remoteLibrary),
    customTemplates: mergeById(localTemplates, remoteTemplates),
  };
}

export async function pullUserLibrary(supabase, userId) {
  if (!supabase || !userId) return null;
  const { data, error } = await supabase
    .from("user_library")
    .select("payload, updated_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!data?.payload) return null;
  return {
    library: data.payload.library || [],
    customTemplates: data.payload.customTemplates || [],
    updatedAt: data.updated_at,
  };
}

export async function pushUserLibrary(supabase, userId, payload) {
  if (!supabase || !userId) return;
  const { error } = await supabase.from("user_library").upsert(
    {
      user_id: userId,
      payload: {
        library: payload.library || [],
        customTemplates: payload.customTemplates || [],
        syncedAt: Date.now(),
      },
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );
  if (error) throw error;
  try {
    localStorage.setItem(SYNC_KEY, String(Date.now()));
  } catch {
    /* ignore */
  }
}

export function readLocalSyncMarker() {
  try {
    return Number(localStorage.getItem(SYNC_KEY) || 0);
  } catch {
    return 0;
  }
}
