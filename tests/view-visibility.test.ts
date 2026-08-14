import { describe, expect, it } from "vitest";

import { computeVisibleTimerIds } from "~content/view-visibility";

function view(): { display: SVGTextElement, blanks: SVGTextElement[] } {
  return {
    display: document.createElementNS("http://www.w3.org/2000/svg", "text"),
    blanks: []
  };
}

describe("computeVisibleTimerIds", () => {
  it("includes an id when any of its rendered views is visible", () => {
    const hiddenAlex = view();
    const visibleAlex = view();
    const hiddenBob = view();
    const visibleNodes = new Set([visibleAlex.display]);

    expect(computeVisibleTimerIds({
      alex: [hiddenAlex, visibleAlex],
      bob: [hiddenBob]
    }, (node) => visibleNodes.has(node))).toEqual(["alex"]);
  });

  it("returns an empty list for an empty record", () => {
    expect(computeVisibleTimerIds({}, () => true)).toEqual([]);
  });

  it("returns timer ids sorted and deduped across multiple visible views", () => {
    const alexOne = view();
    const alexTwo = view();
    const zara = view();

    expect(computeVisibleTimerIds({
      zara: [zara],
      alex: [alexOne, alexTwo]
    }, () => true)).toEqual(["alex", "zara"]);
  });
});
