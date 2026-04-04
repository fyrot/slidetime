import "./styles.css"
import { useState, useEffect } from "react"

// Timer option
type TimerOption = {
  id: string
  label: string
  description: string
  enabled: boolean
}

// Component for each timer option
function TimerOptionCard(props: { option: TimerOption; onToggle: (id: string) => void }) {
  const { option, onToggle } = props

  function handleClick() {
    onToggle(option.id)
  }

  return (
    <div className="bg-[#3c001c]/80 backdrop-blur-sm p-3.5 rounded-xl flex items-center justify-between border border-[#732f2f]/60 shadow-sm hover:shadow-md hover:border-[#732f2f] transition-all duration-200">
      <div className="pr-4 flex-1">
        <h2 className="text-sm font-bold text-[#f6f6f6] tracking-tight">{option.label}</h2>
        <p className="text-[11px] text-[#d1d1d1] mt-1 leading-relaxed opacity-90">{option.description}</p>
      </div>
      
      {/* Toggle Switch */}
      <button
        onClick={handleClick}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-300 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-[#f6f6f6] focus-visible:ring-opacity-75 focus-visible:ring-offset-2 focus-visible:ring-offset-[#3c001c] ${
          option.enabled ? 'bg-[#f6f6f6]' : 'bg-[#707070]'
        }`}
        role="switch"
        aria-checked={option.enabled}
      >
        <span className="sr-only">Toggle {option.label}</span>
        <span
          aria-hidden="true"
          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full shadow-md transition duration-300 ease-in-out ${
            option.enabled ? 'translate-x-[22px] bg-[#500000]' : 'translate-x-1 bg-[#eaeaea]'
          }`}
        />
      </button>
    </div>
  )
}

// Component for command reference items
function CommandReferenceCard(props: { command: string; children: React.ReactNode }) {
  const { command, children } = props
  
  return (
    <div className="bg-[#3c001c]/60 p-2.5 rounded-lg border border-[#732f2f]/40 flex flex-col items-start shadow-sm">
      <code className="text-[#f6f6f6] font-mono text-[11px] font-bold bg-[#500000] px-2 py-0.5 rounded border border-[#732f2f]/60 shadow-inner">
        {command}
      </code>
      <p className="text-[11px] text-[#d1d1d1] mt-1.5 leading-snug">
        {children}
      </p>
    </div>
  )
}

// Main popup component
function IndexPopup() {
  const [isLoading, setIsLoading] = useState(true)
  const [options, setOptions] = useState<TimerOption[]>([
    {
      id: "24hr",
      label: "24 Hour Time Format",
      description: "Display time in 24-hour format",
      enabled: false
    },
  ])

  // Load options from Chrome Storage when pop up opens
  useEffect(() => {
    chrome.storage.local.get(["timerOptionStates"], function (result) {
      if (result.timerOptionStates) {
        setOptions(prevOptions => prevOptions.map(opt => ({
          ...opt,
          enabled: result.timerOptionStates[opt.id] ?? opt.enabled
        })))
      }
      setIsLoading(false)
    })
  }, [])

  // Toggling and saving option state
  function toggleOption(id: string) {
    const updatedOptions = options.map(function (opt) {
      if (opt.id === id) {
        return { ...opt, enabled: !opt.enabled }
      }
        return opt
    })
    
    setOptions(updatedOptions)
    
    // Save to Chrome Storage as an object mapping
    const statesToSave = updatedOptions.reduce((acc, opt) => {
      acc[opt.id] = opt.enabled
      return acc
    }, {} as Record<string, boolean>)

    chrome.storage.local.set({ timerOptionStates: statesToSave })
  }

  // Render option card
  function renderOption(option: TimerOption) {
    return (
      <TimerOptionCard
        key={option.id} 
        option={option} 
        onToggle={toggleOption} 
      />
    )
  }

  return (
    <div className="w-[325px] h-[425px] flex flex-col bg-gradient-to-br from-[#500000] to-[#3c001c] text-[#f6f6f6] font-sans p-5 shadow-2xl">
      {/* Header */}
      <div className="border-b border-[#732f2f]/50 pb-4 mb-5">
        <h1 className="text-2xl font-black text-center tracking-wider drop-shadow-md">
          <span className="text-[#a7a7a7] opacity-80">G</span>F<span className="text-[#a7a7a7] opacity-80">N</span> Timer
        </h1>
        <p className="text-xs text-center text-[#d1d1d1] mt-1.5 font-medium tracking-wide opacity-80">
          Manage your session preferences
        </p>
      </div>

      {/* Options List and Commands Reference */}
      <div className="flex-1 overflow-y-auto space-y-5 pr-1 pb-2 custom-scrollbar">
        {/* Options */}
        <div className="space-y-3.5">
          {isLoading ? (
            <div className="flex bg-[#3c001c]/80 backdrop-blur-sm p-3.5 rounded-xl items-center justify-center border border-[#732f2f]/60 h-24 opacity-50">
              <span className="text-sm font-bold text-[#d1d1d1] animate-pulse">Loading settings...</span>
            </div>
          ) : (
            options.map((renderOption))
          )}
        </div>

        {/* Commands Reference */}
        <div>
          <h3 className="text-[10px] font-bold uppercase tracking-wider text-[#a7a7a7] mb-2.5 px-1 flex items-center">
            <span className="flex-1 border-b border-[#732f2f]/50 mr-2"></span>
            Command Reference
            <span className="flex-1 border-b border-[#732f2f]/50 ml-2"></span>
          </h3>
          <div className="space-y-2">
            <CommandReferenceCard command="<<countdown:mm:ss>>">
              Command to start a countdown timer from <span className="font-semibold text-white">mm:ss</span>
            </CommandReferenceCard>
            
            <CommandReferenceCard command="<<time>>">
              Command to display the current time in <span className="font-semibold text-white">hh:mm:ss</span> format
            </CommandReferenceCard>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-2 pt-4 border-t border-[#732f2f]/50 text-center">
        <span className="text-[10px] uppercase tracking-widest font-bold text-[#a7a7a7] opacity-70">
          Settings save automatically
        </span>
      </div>
    </div>
  )
}

export default IndexPopup
