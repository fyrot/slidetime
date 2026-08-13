import { parseTimerToken } from "~parse-timers";

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
    // with the preceding display node.
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

    const freshNodes = textNodes.filter((node) => !node.hasAttribute(OWNED_ATTRIBUTE));
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
      const tokenText = match[0].replace(/\s+/g, "");
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

    orderedViews.sort((a, b) => a.nodeIndex - b.nodeIndex);
    discovered.push(...orderedViews.map(({ view }) => view));
  }

  return discovered;
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
