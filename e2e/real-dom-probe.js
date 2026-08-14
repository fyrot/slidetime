// Slidetime DOM probe — paste this whole file into the DevTools console of the
// Google Slides TAB (top frame) while PRESENTING, then copy the JSON it prints.
// It captures the structure the extension depends on so the e2e mock and the
// visibility logic can be validated against Google's real DOM.
// Read-only: it does not modify the page.
(() => {
  const rect = (el) => {
    const r = el.getBoundingClientRect();
    return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) };
  };
  const vis = (el) => (typeof el.checkVisibility === "function" ? el.checkVisibility() : "n/a");

  const out = {
    url: location.href,
    topSelectors: {
      punchFullScreenElement: !!document.querySelector(".punch-full-screen-element"),
      punchViewerContent: !!document.querySelector(".punch-viewer-content"),
      sketchyViewerContainerTop: !!document.querySelector(".sketchyViewerContainer")
    },
    iframes: [...document.querySelectorAll("iframe")].map((f, i) => {
      let info = { index: i, rect: rect(f), checkVisibility: vis(f), sameOrigin: false };
      try {
        const doc = f.contentDocument;
        if (doc) {
          info.sameOrigin = true;
          info.hasSketchyViewerContainer = !!doc.querySelector(".sketchyViewerContainer");
          info.textboxGroups = doc.querySelectorAll("g.sketchy-text-content-text").length;
          info.directTextNodes = doc.querySelectorAll("g.sketchy-text-content-text > text").length;
          info.anyTextNodes = doc.querySelectorAll("g.sketchy-text-content-text text").length;
          info.win = { innerWidth: doc.defaultView?.innerWidth, innerHeight: doc.defaultView?.innerHeight };
          info.textNodes = [...doc.querySelectorAll("g.sketchy-text-content-text text")].slice(0, 40).map((t) => ({
            text: (t.textContent ?? "").slice(0, 60),
            rect: rect(t),
            checkVisibility: vis(t),
            owned: t.hasAttribute("data-slidetime-owned"),
            timerId: t.getAttribute("data-slidetime-timer-id"),
            ancestors: (() => {
              const chain = [];
              let n = t.parentElement;
              while (n && chain.length < 8) {
                chain.push(n.tagName.toLowerCase() + (n.getAttribute("class") ? "." + n.getAttribute("class").split(" ").slice(0, 2).join(".") : "") + (n.id ? "#" + n.id : ""));
                n = n.parentElement;
              }
              return chain;
            })()
          }));
        }
      } catch (e) { info.error = String(e); }
      return info;
    })
  };

  const json = JSON.stringify(out, null, 2);
  console.log(json);
  if (typeof copy === "function") { copy(json); console.log("^ also copied to clipboard"); }
  return "probe done";
})();
