import { useEffect, useState } from "react"
import { allIcons, ICON_STORAGE_KEY } from "~icons"
import SwatchSelector from "./swatch_selector"

const STORAGE_KEY = ICON_STORAGE_KEY

// wrapper for selecting icons taht uses swatch selector
function IconSelector() {
  const [selectedId, setSelectedId] = useState<string>(allIcons[0]?.id ?? "")

  useEffect(() => {
    chrome.storage.local.get([STORAGE_KEY], (result) => {
      const savedId = result[STORAGE_KEY];
      const found = allIcons.find((i) => i.id === savedId);

      if (found) {
        setSelectedId(found.id);
      } else {
        const fallback = allIcons[0];
        if (fallback) {
          setSelectedId(fallback.id);
          chrome.storage.local.set({ [STORAGE_KEY]: fallback.id });
          chrome.action.setIcon({ path: fallback.assetPath });
        }
      }

    })
  }, [])

  const items = allIcons.map((i) => ({
    id: i.id,
    displayName: i.displayName,
    displayColor: i.displayColor,
  }))

  function handleSelect(id: string) {
    const picked = allIcons.find((i) => i.id === id);
    if (!picked) { return; }

    setSelectedId(picked.id);
    chrome.storage.local.set({ [STORAGE_KEY]: picked.id });
    chrome.action.setIcon({ path: picked.assetPath });
  
  }

  return (
    <SwatchSelector
      title="Icon"
      items={items}
      selectedId={selectedId}
      onSelect={handleSelect}
    />
  )
}

export default IconSelector
