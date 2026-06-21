import test from "node:test";
import assert from "node:assert/strict";
import { mergeLibraryPayload } from "../src/librarySync.js";

test("mergeLibraryPayload keeps newest item per id", () => {
  const local = {
    library: [{ id: "a", title: "Local", updatedAt: 100, content: "old" }],
    customTemplates: [],
  };
  const remote = {
    library: [{ id: "a", title: "Remote", updatedAt: 200, content: "new" }],
    customTemplates: [{ id: "t1", title: "Tpl", updatedAt: 50 }],
  };
  const merged = mergeLibraryPayload(local, remote);
  assert.equal(merged.library[0].content, "new");
  assert.equal(merged.customTemplates[0].id, "t1");
});

test("mergeLibraryPayload unions distinct ids", () => {
  const merged = mergeLibraryPayload(
    { library: [{ id: "1", updatedAt: 1 }], customTemplates: [] },
    { library: [{ id: "2", updatedAt: 2 }], customTemplates: [] }
  );
  assert.equal(merged.library.length, 2);
});
