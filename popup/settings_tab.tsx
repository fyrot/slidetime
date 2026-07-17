import type { ToggleSetting } from "./components/toggle_setting_card"
import ToggleSettingCard from "./components/toggle_setting_card"
import { useTheme } from "./theme_context"
import FadeIn from "./animated/fade_in"
import { useSettingsStorage } from "./hooks/useSettingsStorage"
import { Fragment } from "react"
import SpinnerSelector, { type SpinnerSetting } from "./components/spinner_selector"
import { ALARM_STORAGE_KEY, alarmSoundSettings } from "./settings/alarmSounds"


/* write toggleable (boolean - on/off) settings here
      key: internal setting id key used by chrome local storage
      name: setting title rendered in card pill by ui
      description: additional explanation of setting rendered below title
*/
const booleanSettings: ToggleSetting[] = [
  {
    key: "24hr",
    name: "Military Time",
    description: "Displays time in a 24 hour format"
  },
  {
    key: "countdownAdvance",
    name: "Advance on Zero",
    description: "Clicks forward when a countdown reaches 0:00"
  },
  {
    key: "countdownSound",
    name: "Timer Alarm",
    description: "Plays a sound when a countdown timer reaches 0:00"
  },
 {
    key: "pausePlayTimers",
    name: "Pause/Play Timers",
    description: "Pauses/plays timers on a slide by pressing 'y'"
  } 
]


function SettingsTab() {
  const { theme } = useTheme()

  const showAlarmSelector = useSettingsStorage<boolean>("countdownSound", false);

  return (
    <div style={{ color: theme.text.secondary }} className="space-y-2.5">
      {/* <p className="text-sm">Settings</p> */}

      { /* boolean settings use toggle setting card for rendering*/ }
      {booleanSettings.map((settingData) => {
        if (settingData.key == "countdownSound") {
          return (<div key={settingData.key}>
            <ToggleSettingCard setting={settingData} />
            <FadeIn className="mt-2.5" expanded={showAlarmSelector} duration={300}>
              <SpinnerSelector settingKey={ALARM_STORAGE_KEY} name="Countdown Sound" options={alarmSoundSettings}/>
            </FadeIn>
          </div>)
        }
        return <ToggleSettingCard setting={settingData} /> 
      
      }) }
    </div>
  )
}

export default SettingsTab
