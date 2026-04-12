import { useTheme } from "~popup/theme_context"
import allThemes from "~themes"

function ThemeSelector() {
  const { theme, setTheme } = useTheme()
  const themes = allThemes.length > 0 ? allThemes : [theme]

  return (

    <div
      className="p-3 rounded-lg"
      style={{
        background: theme.surface.elevated,
        borderWidth: 1,
        borderStyle: "solid",
        borderColor: theme.border.default,
      }}
    >
      <div className="flex flex-row">
        <p className="text-sm font-medium mb-3" style={{ color: theme.text.primary }}>
          Theme
        </p>
        <div className="flex-grow" />
        <p className="text-xs font-medium mb-3" style={{ color: theme.text.muted }}>
          {theme.displayName}
        </p>
        
      </div>
      
      <div className="flex flex-wrap gap-3">
        {themes.map((t) => {
          const isSelected = t.id === theme.id
          return (
            <button
              key={t.id}
              onClick={() => setTheme(t)}
              title={t.displayName}
              className="rounded-full transition-all duration-200"
              style={{
                width: 28,
                height: 28,
                background: t.themeDisplayColor,
                borderWidth: isSelected ? 2 : 1,
                borderStyle: "solid",
                borderColor: isSelected ? theme.text.accent : theme.border.default,
                padding: 2,
              }}
            />
          )
        })}
      </div>
      
    </div>
  )
}

export default ThemeSelector
