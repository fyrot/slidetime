// this is used to detect theme on startup in order to set the appropriate icon, other session changes are handled by themes

// v2: we're going to make icon type disjoint from the selected theme
//     there are way too many possible chrome theme combinations that user control seems like the best option here 

import allThemes from "~themes"

const STORAGE_KEY = "selectedThemeId"

function setIconFromStorage() {
  chrome.storage.local.get([STORAGE_KEY], (result) => {
    const savedId = result[STORAGE_KEY];

    const theme = allThemes.find((t) => t.id === savedId) ?? allThemes[0];

    if (theme?.iconPath) {
      chrome.action.setIcon({ path: theme.iconPath });
    }

  })
}

// in case this gets refreshed in any way whatsoever
chrome.runtime.onStartup.addListener(setIconFromStorage)
chrome.runtime.onInstalled.addListener(setIconFromStorage)
