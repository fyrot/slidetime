import { useState, useRef, useCallback, useEffect, type ReactElement, type CSSProperties } from "react"
import ReferenceTab from "./reference_tab"
import SettingsTab from "./settings_tab"
import PersonalizeTab from "./personalize_tab"
import { useTheme } from "./theme_context"

import { LucideBookText, LucideCog, LucideSwatchBook } from "lucide-react"

type TabId = "reference" | "settings" | "personalize"

const tabs: { id: TabId; label: string, icon: ReactElement }[] = [
  { id: "reference", label: "R", icon: <LucideBookText size={20} /> },
  { id: "settings", label: "S", icon: <LucideCog size={20} /> },
  { id: "personalize", label: "P", icon: <LucideSwatchBook size={20} /> },
]

// helper to convert hex to r,g,b for rgba usage
function hexToRgb(hex: string): string {
  const h = hex.replace("#", "")
  const r = parseInt(h.substring(0, 2), 16)
  const g = parseInt(h.substring(2, 4), 16)
  const b = parseInt(h.substring(4, 6), 16)
  return `${r}, ${g}, ${b}`
}

function TestPopup() {
  const { theme } = useTheme()
  const [activeTab, setActiveTab] = useState<TabId>("reference")
  const [hoveredTab, setHoveredTab] = useState<TabId | null>(null)
  const [showTopFade, setShowTopFade] = useState(false)
  const [showBottomFade, setShowBottomFade] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  const updateFades = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    setShowTopFade(el.scrollTop > 0)
    setShowBottomFade(el.scrollTop + el.clientHeight < el.scrollHeight - 1)
  }, [])

  useEffect(() => {
    requestAnimationFrame(updateFades)
  }, [activeTab, updateFades])

  const overlayBg = `rgba(${hexToRgb(theme.surface.overlay)}, ${theme.effects.overlay.opacity})`
  const backdropFilter = theme.effects.overlay.blur
    ? `blur(${theme.effects.overlay.blur})`
    : undefined

  function buildTabStyle(tabStyle: typeof theme.tabSelector.idle): CSSProperties {
    const style: CSSProperties = { color: tabStyle.color }
    if (tabStyle.background) {
      const rgb = hexToRgb(tabStyle.background)
      style.background = `rgba(${rgb}, ${tabStyle.opacity ?? 1})`
    }
    if (tabStyle.blur) {
      style.backdropFilter = `blur(${tabStyle.blur})`
      style.WebkitBackdropFilter = `blur(${tabStyle.blur})`
    }
    return style
  }

  return (
    <div
      className="w-[325px] h-[425px] relative font-sans overflow-hidden flex flex-col"
      style={{ background: theme.surface.base, color: theme.text.primary }}
    >
      {/* actual tab content is rendered here */}
      <div
        ref={scrollRef}
        onScroll={updateFades}
        className="flex-1 overflow-y-auto px-4 pt-14 pb-4 scrollbar-hide"
      >
        {activeTab === "reference" && <ReferenceTab />}
        {activeTab === "settings" && <SettingsTab />}
        {activeTab === "personalize" && <PersonalizeTab />}
      </div>

      {/* top scroll content fade */}
      <div
        className={`absolute top-0 left-0 right-0 h-14 pointer-events-none transition-opacity duration-75 ${
          showTopFade ? "opacity-100" : "opacity-0"
        }`}
        style={{ background: `linear-gradient(to bottom, ${theme.effects.fade}, transparent)` }}
      />

      {/* footer content */}
      <div className="px-4 py-2 text-center" style={{ color: theme.text.muted }}>
        <p className="text-[10px]">slidetime / {activeTab}</p> {/* "navigation" display */}
      </div>

      {/* bottom scroll content fade */}
      <div
        className={`absolute bottom-6 left-0 right-0 h-12 pointer-events-none transition-opacity duration-75 ${
          showBottomFade ? "opacity-100" : "opacity-0"
        }`}
        style={{ background: `linear-gradient(to top, ${theme.effects.fade}, transparent)` }}
      />

      {/* floating tab selector */}
      <div className="absolute top-3 left-3 right-3 flex justify-center pointer-events-none">
        <div
          className="flex w-full rounded-full shadow-lg pointer-events-auto"
          style={{
            background: overlayBg,
            backdropFilter,
            WebkitBackdropFilter: backdropFilter,
            borderWidth: 1,
            borderStyle: "solid",
            borderColor: theme.border.default,
          }}
        >
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id
            const isHovered = hoveredTab === tab.id && !isActive
            const tabStyle = isActive
              ? theme.tabSelector.active
              : isHovered
                ? theme.tabSelector.hover
                : theme.tabSelector.idle

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                onMouseEnter={() => setHoveredTab(tab.id)}
                onMouseLeave={() => setHoveredTab(null)}
                className="flex-1 h-8 flex items-center justify-center rounded-full text-xs font-medium transition-all duration-200"
                style={buildTabStyle(tabStyle)}
              >
                {tab.icon}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default TestPopup
