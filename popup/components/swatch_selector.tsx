import { useTheme } from "~popup/theme_context"

export interface SwatchItem {
  id: string
  displayName: string
  displayColor: string
}

interface SwatchSelectorProps {
  title: string
  items: SwatchItem[]
  selectedId: string
  onSelect: (id: string) => void
}

function SwatchSelector({ title, items, selectedId, onSelect }: SwatchSelectorProps) {
  const { theme } = useTheme()
  const renderItems = items.length > 0 ? items : []
  const selected = renderItems.find((i) => i.id === selectedId)

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
          {title}
        </p>
        <div className="flex-grow" />
        <p className="text-xs font-medium mb-3" style={{ color: theme.text.muted }}>
          {selected?.displayName ?? ""}
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        {/* swatch icons */}
        {renderItems.map((item) => {
          const isSelected = item.id === selectedId
          return (
            <button
              key={item.id}
              onClick={() => onSelect(item.id)}
              title={item.displayName}
              className="rounded-full transition-all duration-200"
              style={{
                width: 28,
                height: 28,
                background: item.displayColor,
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

export default SwatchSelector
