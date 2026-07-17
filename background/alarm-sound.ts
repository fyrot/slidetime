
import { ALARM_STORAGE_KEY, alarmSoundSettings } from "~popup/settings/alarmSounds"

function seedAlarmSoundLocation() {
  chrome.storage.local.get([ALARM_STORAGE_KEY], (result) => {
    const savedSoundLocation = result[ALARM_STORAGE_KEY];
    // check if the key is assigned a value that exists in the available sound settings, otherwise reset to "default"
    const isValid = alarmSoundSettings.some((s) => s.value === savedSoundLocation);

    if (!isValid && alarmSoundSettings[0]) {
      chrome.storage.local.set({ [ALARM_STORAGE_KEY]: alarmSoundSettings[0].value });
    }

  })
}

chrome.runtime.onStartup.addListener(seedAlarmSoundLocation)
chrome.runtime.onInstalled.addListener(seedAlarmSoundLocation)
