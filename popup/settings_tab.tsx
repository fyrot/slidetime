import type { ToggleSetting } from "./components/toggle_setting_card"
import ToggleSettingCard from "./components/toggle_setting_card"
import { useTheme } from "./theme_context"
import FadeIn from "./animated/fade_in"
import { useSettingsStorage } from "./hooks/useSettingsStorage"
import { Fragment } from "react"
/* write toggleable (boolean - on/off) settings here
      key: internal setting id key used by chrome local storage
      name: setting title rendered in card pill by ui
      description: additional explanation of setting rendered below title
*/
const booleanSettings: ToggleSetting[] = [
  {
    key: "24hr",
    name: "Military Time",
    description: "Display time in a 24 hour format"
  },
  {
    key: "countdownAdvance",
    name: "Advanced Countdown",
    description: "Move forward one slide when a countdown reaches 0:00"
  },
  {
    key: "countdownSound",
    name: "Timer Alarm",
    description: "Plays a sound when a countdown timer reaches 0:00"
  },
 {
    key: "pausePlayTimers",
    name: "Pause/Play Timers",
    description: "Pause/play timers on a slide by pressing 'y'"
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
            <FadeIn expanded={showAlarmSelector} duration={300}>
              <p> Wow, it worked! </p>
            </FadeIn>
          </div>)
        }
        return <ToggleSettingCard setting={settingData} /> 
      
      }) }
    </div>
  )
}

export default SettingsTab
