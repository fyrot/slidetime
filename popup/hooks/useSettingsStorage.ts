import { useState, useEffect } from "react"

export function useSettingsStorage<T>(key: string, defaultValue: T): T {
  const [settingValue, setSettingValue] = useState<T>(defaultValue);

  useEffect(() => {
    chrome.storage.local.get(["timerOptionStates"], (received) => {
      const options = received.timerOptionStates ?? {}
      if (options[key] !== undefined) { setSettingValue(options[key]); }
    });


  const handleChange = (
    changesArr: { [key: string]: chrome.storage.StorageChange }, area: string,
  ) => {
    if (area === "local" && changesArr.timerOptionStates) {
      const newOptions = changesArr.timerOptionStates.newValue ?? {}
      setSettingValue(newOptions[key] ?? defaultValue);
    }
  }

  chrome.storage.onChanged.addListener(handleChange);



  return () => {
    chrome.storage.onChanged.removeListener(handleChange);
  };

  }, [key, defaultValue]);

  return settingValue;
}
