/*interface AlarmSoundSetting {
  id: string
  display: string
  assetLoc: string 
}*/

import type { SpinnerSetting } from "~popup/components/spinner_selector";
import { getCached } from "~utils/cached-storage";

const ALARM_STORAGE_KEY = "alarmSoundLocation";

/*const alarmData: AlarmSoundSetting[] = [
  {
    id: "digital_long",
    display: "Digital",
    assetLoc: "assets/sound/digital.ogg"
  },
  {
    id: "xylophone_short",
    display: "Xylophone",
    assetLoc: "assets/sound/xylophone.ogg"
  }
]*/

const alarmSoundSettings: SpinnerSetting[] = [
  {
    value: "assets/sound/digital.ogg",
    displayName: "Digital"
  },
  {
    value: "assets/sound/xylophone.ogg",
    displayName: "Xylophone"
  }
]


function getAlarmSoundLocation(): string {
  const fallback = alarmSoundSettings[0].value;
  const stored = getCached<string>(ALARM_STORAGE_KEY, fallback);

  // kind of unnecessary if we're good about updating the value locations,
  // this is just insurance to verify we're using a somewhat valid value
  const isValid = alarmSoundSettings.some((s) => s.value === stored);
  return isValid ? stored : fallback;
}


export { ALARM_STORAGE_KEY, alarmSoundSettings, getAlarmSoundLocation }