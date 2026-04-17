import IconSelector from "./components/icon_selector"
import ThemeSelector from "./components/theme_selector"

function PersonalizeTab() {
  return (
    <div className="space-y-2.5">
      <ThemeSelector />
      <IconSelector />
    </div>
  )
}

export default PersonalizeTab
