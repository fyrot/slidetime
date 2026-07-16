import IconSelector from "./components/icon_selector"
import ThemeSelector from "./components/theme_selector"
import ToggleSettingCard from "./components/toggle_setting_card"

// reminder to self: migrate settings to their own file so they're not strewn about like they are rn
// double reminder: create a fade-in component using grid-rows and opacity, will be helpful for conditionally displaying certain options (like alarm sounds)
function PersonalizeTab() {
  return (
    <div className="space-y-2.5">
      <ThemeSelector />
      <IconSelector />
      { /* <ToggleSettingCard  /> */ }
    </div>
  )
}

export default PersonalizeTab
