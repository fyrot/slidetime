import { useTheme } from "./theme_context"

function SettingsTab() {
  const { theme } = useTheme()

  return (
    <div style={{ color: theme.text.secondary }}>
      <p className="text-sm">Settings</p>
    </div>
  )
}

export default SettingsTab
