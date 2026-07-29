import { useState, useEffect } from "react"
import { useTheme } from "~popup/theme_context";
import { debugLog } from "~utils/debug-options";

const COPIED_EVENT = "comamnd-copied";
const COPIED_MESSAGE = "copied!";
const COPIED_DEBOUNCE = 1250; // ms


function CommandCard(props: { command: string; description: string }) {
  const { theme } = useTheme()
  const { command, description } = props
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const handleOtherCopy = (e: Event) => {
      if ((e as CustomEvent).detail !== command) {
        setCopied(false)
      }
    }

    window.addEventListener(COPIED_EVENT, handleOtherCopy)
    return () => window.removeEventListener(COPIED_EVENT, handleOtherCopy)
  
  }, [])

  const handleCopy = () => {
    try {
        navigator.clipboard.writeText(command).then(() => {
            window.dispatchEvent(new CustomEvent(COPIED_EVENT, { detail: command }))
            setCopied(true)
            setTimeout(() => setCopied(false), COPIED_DEBOUNCE)
        });
    } catch (err) {
        debugLog(`Error copying command "${command}": ${err}`);
    }
  }

  return (

    <div
        className="p-3 rounded-lg"
        style={{ background: theme.surface.elevated, borderWidth: 1, borderStyle: "solid", borderColor: theme.border.default }}
      >
        <code
          className="font-mono text-xs font-bold px-2 py-0.5 rounded cursor-pointer select-none relative overflow-hidden inline-block"
          style={{ color: theme.text.code, background: theme.surface.code, borderWidth: 1, borderStyle: "solid", borderColor: theme.border.subtle }}
          onClick={handleCopy}
          title="Click to copy"
        >
          {/* this container is to ensure the pill container's dimensions stay relatively consistent; reserving space */}
          <span className="invisible whitespace-nowrap">{command}</span>
          
          <span
            className="absolute inset-0 flex items-center px-2 transition-transform duration-200 ease-in-out"
            style={{ transform: copied ? "translateY(-100%)" : "translateY(0)" }}
          >
            {command}
          </span>
          
          <span
            className="absolute inset-0 flex items-center justify-center transition-transform duration-200 ease-in-out"
            style={{ transform: copied ? "translateY(0)" : "translateY(100%)" }}
          >
            {COPIED_MESSAGE}
          </span>
        
        </code>
        <p className="text-xs leading-relaxed" style={{ color: theme.text.secondary }}>
          {description}
        </p>
      </div>

  )
}

export default CommandCard