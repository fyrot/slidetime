import { describe, expect, it } from "vitest";

import { claimView, discoverTimerViews } from "~content/extract-timers";
import { parseTimerToken } from "~parse-timers";

function setFixture(groups: string): SVGSVGElement {
  document.body.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg">${groups}</svg>`;
  return document.querySelector("svg") as unknown as SVGSVGElement;
}

function textbox(textNodes: string): string {
  return `<g class="sketchy-text-content-text">${textNodes}</g>`;
}

describe("discoverTimerViews", () => {
  it("discovers a token in one text node", () => {
    const root = setFixture(textbox("<text>&lt;&lt;5:00-|id=alex&gt;&gt;</text>"));

    const views = discoverTimerViews(root);
    expect(views).toHaveLength(1);
    expect(views[0].tokenText).toBe("<<5:00-|id=alex>>");
    expect(views[0].blankNodes).toEqual([]);
  });

  it("discovers a token wrapped across two text nodes", () => {
    const root = setFixture(textbox(
      "<text>&lt;&lt;5:00-|</text><text>id=alex&gt;&gt;</text>"
    ));

    // This is the old per-node failure mode: neither run parses on its own.
    expect(parseTimerToken("<<5:00-|")).toBeNull();
    expect(parseTimerToken("id=alex>>")).toBeNull();

    const views = discoverTimerViews(root);
    expect(views).toHaveLength(1);
    expect(views[0].tokenText).toBe("<<5:00-|id=alex>>");
    expect(views[0].blankNodes).toHaveLength(1);
  });

  it("discovers the same token across three formatting runs", () => {
    const root = setFixture(textbox(
      "<text>&lt;&lt;5:00-</text><text>|id=</text><text>alex&gt;&gt;</text>"
    ));

    const views = discoverTimerViews(root);
    expect(views).toHaveLength(1);
    expect(views[0].tokenText).toBe("<<5:00-|id=alex>>");
    expect(views[0].blankNodes).toHaveLength(2);
  });

  it("ignores a token surrounded by prose in the same node", () => {
    const root = setFixture(textbox("<text>Starts at &lt;&lt;5:00-&gt;&gt; now</text>"));
    expect(discoverTimerViews(root)).toEqual([]);
  });

  it("discovers two independent token nodes in one textbox", () => {
    const root = setFixture(textbox(
      "<text>&lt;&lt;5:00-&gt;&gt;</text><text>&lt;&lt;0:00+&gt;&gt;</text>"
    ));

    expect(discoverTimerViews(root).map(({ tokenText }) => tokenText)).toEqual([
      "<<5:00->>",
      "<<0:00+>>"
    ]);
  });

  it("re-emits one claimed view after its rendered text is overwritten", () => {
    const root = setFixture(textbox(
      "<text>&lt;&lt;5:00-|</text><text>id=alex&gt;&gt;</text>"
    ));
    const [view] = discoverTimerViews(root);

    claimView(view, "countdown-alex");
    view.displayNode.textContent = "4:59";

    const rescanned = discoverTimerViews(root);
    expect(rescanned).toHaveLength(1);
    expect(rescanned[0].tokenText).toBe("<<5:00-|id=alex>>");
    expect(rescanned[0].displayNode).toBe(view.displayNode);
    expect(rescanned[0].blankNodes).toEqual(view.blankNodes);
    expect(view.blankNodes[0].textContent).toBe("");
  });

  it("ignores plain non-token text", () => {
    const root = setFixture(textbox("<text>Quarterly review</text>"));
    expect(discoverTimerViews(root)).toEqual([]);
  });
});
