import { useState, useEffect } from "react"
import { LucideChevronLeft, LucideChevronRight } from "lucide-react"
import { useTheme } from "~popup/theme_context"

// one selectable option in the spinner. `value` is what gets written to
// local storage; `displayName` is what the user sees in the display row.
export interface SpinnerSetting {
  value: string
  displayName: string
}

interface SpinnerSelectorProps {
  settingKey: string
  name: string
  options: SpinnerSetting[]
  description?: string
}

function SpinnerSelector({ settingKey, name, options, description }: SpinnerSelectorProps) {
  const { theme } = useTheme();
  const [index, setIndex] = useState(0);

  useEffect(() => {

    chrome.storage.local.get([settingKey], (result) => {
      const stored = result[settingKey];
      const foundVal = options.findIndex((o) => o.value === stored)
      
      // fall back to the first option when nothing valid is stored yet
      if (foundVal !== -1) {
        setIndex(foundVal);
      }

    })

  }, [settingKey, options])

  function commit(nextIndex: number) {
    setIndex(nextIndex);
    chrome.storage.local.set({ [settingKey]: options[nextIndex]?.value });
  }

  function step(delta: number) {
    if (options.length === 0) { return; }
    // wrap around at either end
    const next = (index + delta + options.length) % options.length;
    commit(next);
  }

  const current = options[index]

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
      {/* row 1 — setting name pill, on its own row */}
      <div className="flex items-center">
        <span
          className="text-[0.7rem] font-bold py-2 px-4 rounded-2xl"
          style={{
            color: theme.text.code,
            background: theme.surface.code,
            borderWidth: 1,
            borderStyle: "solid",
            borderColor: theme.border.subtle,
          }}
        >
          {name}
        </span>
      </div>

      {/* row 2 — full-width spinner: chevrons hug the lateral edges,
          selected option sits centered with pill-style padding + background */}
      <div className="flex flex-row items-center gap-2 mt-2">

        <button
          onClick={() => step(-1)}
          aria-label={`Previous ${name} option`}
          disabled={options.length === 0}
          className="flex items-center justify-center text-[0.85rem] p-1 shrink-0 rounded-full cursor-pointer transition-colors duration-200"
          style={{ background: theme.surface.code }}
        >
          {/* width/height in em make the glyph track the button's text-[] size (rem) */}
          <LucideChevronLeft width="1em" height="1em" color={theme.text.code} />
        </button>

        {/* flex-1 container claims the row's middle space and centers the
            option; the span itself only hugs its content */}
        <div className="flex-1 flex justify-center">
          <span
            className="text-[0.65rem] font-bold text-center select-none py-1.5 px-4 rounded-md"
            style={{
              color: theme.text.code,
              background: theme.surface.code,
            }}
          >
            {current?.displayName ?? ""}
          </span>
        </div>

        <button
          onClick={() => step(1)}
          aria-label={`Next ${name} option`}
          disabled={options.length === 0}
          className="flex items-center justify-center text-[0.85rem] p-1 shrink-0 rounded-full cursor-pointer transition-colors duration-200"
          style={{ background: theme.surface.code }}
        >
          <LucideChevronRight width="1em" height="1em" color={theme.text.code} />
        </button>

      </div>

      { /* OPTIONAL description,
          ideally we're not using this, the name itself should be explanatory enough
      */}
      {description && (
        <p className="text-xs mt-1.5 leading-relaxed" style={{ color: theme.text.secondary }}>
          {description}
        </p>
      )}

      
    </div>
  )
}

export default SpinnerSelector
