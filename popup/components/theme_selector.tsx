import { useTheme } from "~popup/theme_context"
import allThemes from "~themes"
import SwatchSelector from "./swatch_selector"

// now a wrapper for selecting themes via the swatch selector component
function ThemeSelector() {
  const { theme, setTheme } = useTheme()

  const items = allThemes.map((t) => ({
    id: t.id,
    displayName: t.displayName,
    displayColor: t.themeDisplayColor,
  }))

  function handleSelect(id: string) {
    const picked = allThemes.find((t) => t.id === id)
    if (picked) setTheme(picked)
  }

  return (
    <SwatchSelector
      title="Theme"
      items={items}
      selectedId={theme.id}
      onSelect={handleSelect}
    />
  )
}

export default ThemeSelector
