interface TimerView {
  display: SVGTextElement
  blanks: SVGTextElement[]
}

export function computeVisibleTimerIds(
  record: Record<string, TimerView[]>,
  isVisible: (node: SVGTextElement) => boolean
): string[] {
  return Object.entries(record)
    .filter(([, views]) => views.some(({ display }) => isVisible(display)))
    .map(([timerId]) => timerId)
    .sort();
}

// This relies on real browser layout and is intentionally not unit-tested in
// jsdom; computeVisibleTimerIds accepts an injected predicate for pure tests.
export function isViewVisible(node: SVGTextElement): boolean {
  if (!node.isConnected) { return false; }

  const win = node.ownerDocument.defaultView;
  if (!win) { return false; }

  const rect = node.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) { return false; }
  if (rect.right < 0 || rect.left > win.innerWidth) { return false; }
  if (rect.bottom < 0 || rect.top > win.innerHeight) { return false; }

  return node.checkVisibility?.({
    opacityProperty: true,
    visibilityProperty: true,
    contentVisibilityAuto: true
  }) !== false;
}
