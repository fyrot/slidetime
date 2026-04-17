import type { ToggleSetting } from "./components/toggle_setting_card"
import ToggleSettingCard from "./components/toggle_setting_card"
import { useTheme } from "./theme_context"

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
 /* {
    key: "pausePlayTimers",
    name: "Pause/Play Timers",
    description: "Be able to pause/play presented timers by pressing 'p'"
  } */ // omit this for now since it hasn't been implemented yet 
]

function SettingsTab() {
  const { theme } = useTheme()

  return (
    <div style={{ color: theme.text.secondary }} className="space-y-2.5">
      {/* <p className="text-sm">Settings</p> */}

      { /* boolean settings use toggle setting card for rendering*/ }
      {booleanSettings.map((settingData) => {
        return <ToggleSettingCard setting={settingData} /> 
      }) }
    </div>
  )
}

export default SettingsTab
