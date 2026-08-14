import { describe, expect, it } from "vitest";

import { claimView, discoverTimerViews, resolveTimerAssignments } from "~content/extract-timers";
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

  it("never joins fresh text across an already-claimed node into a phantom token", () => {
    // An owned display node sits between two fresh fragments; joining around it
    // would fabricate "<<5:00->>" out of text that never formed a token.
    const root = setFixture(textbox(
      `<text>&lt;&lt;5:</text>` +
      `<text data-slidetime-token="&lt;&lt;time&gt;&gt;" data-slidetime-timer-id="time-x" data-slidetime-owned="1">4:59</text>` +
      `<text>00-&gt;&gt;</text>`
    ));

    const views = discoverTimerViews(root);
    expect(views).toHaveLength(1);
    expect(views[0].tokenText).toBe("<<time>>"); // only the claimed view survives
  });

  it("keeps whitespace in the raw token so ids with spaces stay distinct", () => {
    const root = setFixture(textbox("<text>&lt;&lt;5:00-|id=alex smith&gt;&gt;</text>"));
    const views = discoverTimerViews(root);
    expect(views).toHaveLength(1);
    expect(views[0].tokenText).toBe("<<5:00-|id=alex smith>>");
  });
});

describe("resolveTimerAssignments", () => {
  it("reuses the id stored on a claimed display node", () => {
    const root = setFixture(textbox(
      `<text data-slidetime-token="&lt;&lt;0:00+&gt;&gt;" data-slidetime-timer-id="slide-A-0" data-slidetime-owned="1">0:07</text>`
    ));

    const assignments = resolveTimerAssignments(discoverTimerViews(root), "slide-A", []);
    expect(assignments).toHaveLength(1);
    expect(assignments[0].timerData.id).toBe("slide-A-0");
  });

  it("keeps positional ids stable when a timer renders later than its neighbor", () => {
    // Scan 1 saw only the stopwatch (claimed as slide-A-0). Scan 2 also sees a
    // countdown EARLIER in document order; it must not steal slide-A-0.
    const root = setFixture(textbox(
      `<text>&lt;&lt;5:00-&gt;&gt;</text>` +
      `<text data-slidetime-token="&lt;&lt;0:00+&gt;&gt;" data-slidetime-timer-id="slide-A-0" data-slidetime-owned="1">0:07</text>`
    ));

    const assignments = resolveTimerAssignments(discoverTimerViews(root), "slide-A", []);
    const countdown = assignments.find(({ timerData }) => timerData.timerType === "countdown");
    const stopwatch = assignments.find(({ timerData }) => timerData.timerType === "stopwatch");
    expect(stopwatch?.timerData.id).toBe("slide-A-0"); // claimed id kept
    expect(countdown?.timerData.id).toBe("slide-A-<<5:00->>-0"); // content-based, no theft
  });

  it("binds each timer to its own state after a full document replacement", () => {
    // After Google recreates the DOM no claimed marks survive. Even if only the
    // countdown has rendered yet, its content-based id cannot alias the
    // stopwatch's state persisted in the background under its own token id.
    const partial = setFixture(textbox("<text>&lt;&lt;5:00-&gt;&gt;</text>"));
    const [countdown] = resolveTimerAssignments(discoverTimerViews(partial), "slide-A", []);
    expect(countdown.timerData.id).toBe("slide-A-<<5:00->>-0");

    const full = setFixture(textbox(
      "<text>&lt;&lt;0:00+&gt;&gt;</text><text>&lt;&lt;5:00-&gt;&gt;</text>"
    ));
    const assignments = resolveTimerAssignments(discoverTimerViews(full), "slide-A", []);
    expect(assignments.map(({ timerData }) => timerData.id)).toEqual([
      "slide-A-<<0:00+>>-0",
      "slide-A-<<5:00->>-0" // same id as in the partial scan
    ]);
  });

  it("reuses a claimed positional id regardless of which slide minted it", () => {
    const root = setFixture(textbox(
      `<text data-slidetime-token="&lt;&lt;5:00-&gt;&gt;" data-slidetime-timer-id="slide-A-&lt;&lt;5:00-&gt;&gt;-0" data-slidetime-owned="1">4:59</text>`
    ));

    const assignments = resolveTimerAssignments(discoverTimerViews(root), "slide-B", []);
    expect(assignments).toHaveLength(1);
    expect(assignments[0].timerData.id).toBe("slide-A-<<5:00->>-0");
  });

  it("still shares one id across views carrying the same id flag", () => {
    const root = setFixture(
      textbox("<text>&lt;&lt;5:00-|id=alex&gt;&gt;</text>") +
      textbox("<text>&lt;&lt;5:00-|id=alex&gt;&gt;</text>")
    );

    const assignments = resolveTimerAssignments(discoverTimerViews(root), "slide-A", []);
    expect(assignments).toHaveLength(2);
    expect(assignments[0].timerData.id).toBe("countdown-alex");
    expect(assignments[1].timerData.id).toBe("countdown-alex");
  });
});
