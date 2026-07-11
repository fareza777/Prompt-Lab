export function getTabTargetIndex(key, currentIndex, count, vertical = false) {
  if (count < 1) return null;
  if (key === "Home") return 0;
  if (key === "End") return count - 1;
  if (key === "ArrowRight" || (vertical && key === "ArrowDown")) return (currentIndex + 1) % count;
  if (key === "ArrowLeft" || (vertical && key === "ArrowUp")) return (currentIndex - 1 + count) % count;
  return null;
}

export function handleTabListKeyDown(event, { tabs, currentIndex, onActivate, vertical = false }) {
  const targetIndex = getTabTargetIndex(event.key, currentIndex, tabs.length, vertical);
  if (targetIndex === null) return false;
  event.preventDefault();
  onActivate(targetIndex);
  tabs[targetIndex]?.focus();
  return true;
}

export function captureFocusReturn(documentLike = document) {
  const opener = documentLike.activeElement;
  return () => opener?.focus?.();
}

export function createPaletteFocusLifecycle(restoreFocus) {
  let open = false;
  return {
    open() {
      open = true;
    },
    close() {
      if (!open) return;
      open = false;
      restoreFocus();
    },
  };
}
