// icon selection is now disjoint from user theme selection, so we refer to its new independent storage key now

// this, uniquely, has to run on startup/install because the toolbar should be set without needing to open the popup

import { allIcons } from "~icons"

const STORAGE_KEY = "selectedIconId"

function setIconFromStorage() {
  chrome.storage.local.get([STORAGE_KEY], (result) => {
    const savedId = result[STORAGE_KEY]
    const icon = allIcons.find((i) => i.id === savedId) ?? allIcons[0]
    if (icon?.assetPath) {
      chrome.action.setIcon({ path: icon.assetPath })
    }
  })
}

chrome.runtime.onStartup.addListener(setIconFromStorage)
chrome.runtime.onInstalled.addListener(setIconFromStorage)
