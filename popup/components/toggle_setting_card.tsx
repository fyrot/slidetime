import { useState, useEffect } from "react"
import { useTheme } from "~popup/theme_context"


// should we leave the interface here since it's specific to this component? good to hear your thoughts - hd
export interface ToggleSetting {
  key: string
  name: string
  description: string
}

function ToggleSettingCard({ setting }: { setting: ToggleSetting }) {
  const { theme } = useTheme()
  const [enabled, setEnabled] = useState(false)

  useEffect(() => {
    chrome.storage.local.get(["timerOptionStates"], (result) => {
      const opts = result.timerOptionStates ?? {}
      // fix for matching options states
      if (opts[setting.key] !== undefined) {
        setEnabled(opts[setting.key])
      }
    })
  }, [setting.key])

  function handleToggle() {
    const next = !enabled
    setEnabled(next)
    chrome.storage.local.get(["timerOptionStates"], (result) => {
      const opts = result.timerOptionStates ?? {}
      opts[setting.key] = next
      chrome.storage.local.set({ timerOptionStates: opts })
    })
  }

  return (
    /* card surface */
    <div
      className="p-3 rounded-lg flex flex-col"
      style={{
        background: theme.surface.elevated,
        borderWidth: 1,
        borderStyle: "solid",
        borderColor: theme.border.default,
      }}
    >
      {/* row 1 */}
      <div className="flex items-center justify-between">
        
        {/* setting name pill */ }
        <span
          className="text-xs font-bold py-2 px-4 rounded-full"
          style={{
            color: theme.text.accent,
            background: theme.surface.code,
            borderWidth: 1,
            borderStyle: "solid",
            borderColor: theme.border.subtle,
          }}
        >
          {setting.name}
        </span>
      {/* setting toggle knob */ }
        <button
          onClick={handleToggle}
          role="switch"
          aria-checked={enabled}
          className="grid h-5 w-9 shrink-0 cursor-pointer items-center rounded-full p-[3px] transition-colors duration-200"
          style={{
            background: enabled ? theme.text.accent : theme.border.default,
            gridTemplateColumns: enabled ? "1fr auto 0fr" : "0fr auto 1fr",
            transition: "grid-template-columns 200ms ease, background-color 200ms ease",
          }}
        >


          <span className="sr-only">Toggle {setting.name}</span>
          <span />
          <span
            aria-hidden="true"
            className="pointer-events-none block h-3.5 w-3.5 rounded-full shadow-sm"
            style={{
              background: enabled ? theme.surface.base : theme.text.muted,
            }}
          />

          <span />
        
        </button>
      
      </div>
      
      {/* row 2 - brief setting description */}
      <p className="text-xs mt-1.5 leading-relaxed" style={{ color: theme.text.secondary }}>
        {setting.description}
      </p>
    </div>
  )
}

export default ToggleSettingCard
