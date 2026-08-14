import { buildTimerData, parseTimerToken } from "~parse-timers";
import { TimerFlagType, type TimerData } from "~timer-types";

const TEXTBOX_QUERY = "g.sketchy-text-content-text";
const TOKEN_ATTRIBUTE = "data-slidetime-token";
const TIMER_ID_ATTRIBUTE = "data-slidetime-timer-id";
const OWNED_ATTRIBUTE = "data-slidetime-owned";
const TOKEN_CANDIDATE_REGEX = /<<[^<>]*>>/g;

export interface DiscoveredView {
  tokenText: string
  displayNode: SVGTextElement
  blankNodes: SVGTextElement[]
}

interface OrderedView {
  nodeIndex: number
  view: DiscoveredView
}

export function discoverTimerViews(root: ParentNode): DiscoveredView[] {
  const discovered: DiscoveredView[] = [];

  for (const textbox of root.querySelectorAll<SVGGElement>(TEXTBOX_QUERY)) {
    const textNodes = Array.from(textbox.querySelectorAll<SVGTextElement>("text"));
    const orderedViews: OrderedView[] = [];

    // Claimed views have already had their visible text replaced. Recover their
    // original token from attributes and keep their blank formatting runs paired
    // with the preceding display node. Accepted risk: if Google ever repurposes
    // a claimed <text> node for unrelated content instead of replacing it, the
    // stale attributes would resurrect the old timer view there; no such node
    // pooling has been observed.
    for (let nodeIndex = 0; nodeIndex < textNodes.length; nodeIndex++) {
      const displayNode = textNodes[nodeIndex];
      const tokenText = displayNode.getAttribute(TOKEN_ATTRIBUTE);
      if (tokenText == null) { continue; }

      const blankNodes: SVGTextElement[] = [];
      for (let blankIndex = nodeIndex + 1; blankIndex < textNodes.length; blankIndex++) {
        const candidate = textNodes[blankIndex];
        if (candidate.hasAttribute(TOKEN_ATTRIBUTE) || !candidate.hasAttribute(OWNED_ATTRIBUTE)) {
          break;
        }
        blankNodes.push(candidate);
      }

      orderedViews.push({
        nodeIndex,
        view: { tokenText, displayNode, blankNodes }
      });
    }

    // Owned nodes act as hard barriers: fresh nodes on either side of one are
    // never joined, otherwise text runs separated by an already-claimed view
    // could concatenate into a phantom token.
    const freshRuns: SVGTextElement[][] = [];
    let currentRun: SVGTextElement[] = [];
    for (const node of textNodes) {
      if (node.hasAttribute(OWNED_ATTRIBUTE)) {
        if (currentRun.length > 0) { freshRuns.push(currentRun); currentRun = []; }
      } else {
        currentRun.push(node);
      }
    }
    if (currentRun.length > 0) { freshRuns.push(currentRun); }

    for (const freshNodes of freshRuns) {
      let logicalText = "";
      const characterNodeIndexes: number[] = [];
      const nodeStarts: number[] = [];

      for (let nodeIndex = 0; nodeIndex < freshNodes.length; nodeIndex++) {
        const text = freshNodes[nodeIndex].textContent ?? "";
        nodeStarts[nodeIndex] = logicalText.length;
        logicalText += text;
        for (let charIndex = 0; charIndex < text.length; charIndex++) {
          characterNodeIndexes.push(nodeIndex);
        }
      }

      for (const match of logicalText.matchAll(TOKEN_CANDIDATE_REGEX)) {
        const matchStart = match.index;
        const matchEnd = matchStart + match[0].length;
        // Keep the raw token: wrapping never inserts characters, and the parser
        // already trims where upstream tolerated whitespace. Stripping here would
        // silently merge ids like "alex smith" and "alexsmith".
        const tokenText = match[0];
        if (parseTimerToken(tokenText) == null) { continue; }

        const overlappingIndexes = Array.from(new Set(
          characterNodeIndexes.slice(matchStart, matchEnd)
        ));
        if (overlappingIndexes.length === 0) { continue; }

        const fullyConsumesOverlappingNodes = overlappingIndexes.every((nodeIndex) => {
          const text = freshNodes[nodeIndex].textContent ?? "";
          const nodeStart = nodeStarts[nodeIndex];

          for (let charIndex = 0; charIndex < text.length; charIndex++) {
            if (/\s/.test(text[charIndex])) { continue; }
            const logicalIndex = nodeStart + charIndex;
            if (logicalIndex < matchStart || logicalIndex >= matchEnd) { return false; }
          }
          return true;
        });
        if (!fullyConsumesOverlappingNodes) { continue; }

        const overlappingNodes = overlappingIndexes.map((nodeIndex) => freshNodes[nodeIndex]);
        const displayNode = overlappingNodes[0];
        orderedViews.push({
          nodeIndex: textNodes.indexOf(displayNode),
          view: {
            tokenText,
            displayNode,
            blankNodes: overlappingNodes.slice(1)
          }
        });
      }
    }

    orderedViews.sort((a, b) => a.nodeIndex - b.nodeIndex);
    discovered.push(...orderedViews.map(({ view }) => view));
  }

  return discovered;
}

export interface TimerAssignment {
  view: DiscoveredView
  timerData: TimerData
}

// Turn discovered views into timer specs with stable ids. Timers with an id=
// flag always get their deterministic shared id. Positional (non-id-flag)
// timers get a content-based id — slide + token + ordinal among identical
// tokens — so a partially rendered slide can never bind one timer's view to a
// different timer's state (a purely ordinal id would shift with scan order).
// Views claimed on a previous scan always reuse the id stored on their display
// node, pinning identity to the rendered view at first discovery.
export function resolveTimerAssignments(
  views: DiscoveredView[],
  slideId: string,
  recordedIds: Iterable<string>
): TimerAssignment[] {
  const usedIds = new Set(recordedIds);
  for (const view of views) {
    const claimedId = view.displayNode.getAttribute(TIMER_ID_ATTRIBUTE);
    if (claimedId != null) { usedIds.add(claimedId); }
  }

  const assignments: TimerAssignment[] = [];
  let tokenInd = 0;

  for (const view of views) {
    const parsed = parseTimerToken(view.tokenText);
    if (parsed == null) { continue; }

    const hasIdFlag = parsed.flags?.some((flag) => flag.type === TimerFlagType.ID);
    const claimedId = view.displayNode.getAttribute(TIMER_ID_ATTRIBUTE);

    let id: string;
    if (hasIdFlag) {
      // deterministic shared id — recomputing beats trusting a stale attribute
      id = buildTimerData(parsed, tokenInd, slideId).id;
    } else if (claimedId != null) {
      id = claimedId;
    } else {
      for (let ordinal = 0; ; ordinal++) {
        id = `${slideId}-${view.tokenText}-${ordinal}`;
        if (!usedIds.has(id)) { break; }
      }
    }

    usedIds.add(id);
    assignments.push({
      view,
      timerData: { ...buildTimerData(parsed, tokenInd, slideId), id }
    });
    tokenInd++;
  }

  return assignments;
}

export function claimView(view: DiscoveredView, timerId: string): void {
  view.displayNode.setAttribute(TOKEN_ATTRIBUTE, view.tokenText);
  view.displayNode.setAttribute(TIMER_ID_ATTRIBUTE, timerId);

  for (const node of [view.displayNode, ...view.blankNodes]) {
    node.setAttribute(OWNED_ATTRIBUTE, "1");
  }
  for (const node of view.blankNodes) {
    node.textContent = "";
  }
}
