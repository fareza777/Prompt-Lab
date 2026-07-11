import test from "node:test";
import assert from "node:assert/strict";
import { access } from "node:fs/promises";

const helperUrl = new URL("../src/accessibilityInteractions.js", import.meta.url);

async function loadHelpers() {
  try {
    await access(helperUrl);
  } catch {
    assert.fail("accessibility interaction helpers must exist");
  }
  return import(helperUrl);
}

test("tab navigation wraps, supports vertical arrows, and jumps to endpoints", async () => {
  const { getTabTargetIndex, handleTabListKeyDown } = await loadHelpers();

  assert.equal(getTabTargetIndex("ArrowRight", 2, 3), 0);
  assert.equal(getTabTargetIndex("ArrowLeft", 0, 3), 2);
  assert.equal(getTabTargetIndex("ArrowDown", 1, 3, true), 2);
  assert.equal(getTabTargetIndex("ArrowUp", 0, 3, true), 2);
  assert.equal(getTabTargetIndex("Home", 2, 3), 0);
  assert.equal(getTabTargetIndex("End", 0, 3), 2);
  assert.equal(getTabTargetIndex("ArrowDown", 1, 3, false), null);

  let activated = -1;
  let focused = -1;
  let prevented = false;
  const tabs = [0, 1, 2].map((index) => ({ focus: () => { focused = index; } }));
  const handled = handleTabListKeyDown(
    { key: "ArrowLeft", preventDefault: () => { prevented = true; } },
    { tabs, currentIndex: 0, onActivate: (index) => { activated = index; } },
  );
  assert.equal(handled, true);
  assert.equal(prevented, true);
  assert.equal(activated, 2);
  assert.equal(focused, 2);
});

test("focus restoration returns focus to the opener captured before the dialog opens", async () => {
  const { captureFocusReturn } = await loadHelpers();
  let focused = false;
  const opener = { focus: () => { focused = true; } };
  const documentLike = { activeElement: opener };

  const restore = captureFocusReturn(documentLike);
  documentLike.activeElement = { focus() {} };
  restore();

  assert.equal(focused, true);
});
