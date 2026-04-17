import { useTheme } from "./theme_context"

interface CommandReference {
  command: string
  description: string
}

// we should link this to being rendered from the current time maybe
const referenceCards: CommandReference[] = [
  {
    command: "<<time>>",
    description: "Displays the current time (hh:mm:ss pm/am)",
  },
  {
    command: "<<date>>",
    description: "Displays a shortened version of the date (mm/dd/yy)",
  },
  {
    command: "<<mm:ss->>",
    description: "Displays a countdown that goes from mm:ss to 0:00",
  },
  {
    command: "<<mm:ss+>>",
    description: "Displays a stopwatch that starts at mm:ss",
  },
  {
    command: "<<~hh:mm>>",
    description: "Displays a countdown that reaches 0:00 at hh:mm",
  },
  {
    command: "<<shorttime>>",
    description: "Displays the current time (hh:mm pm/am)",
  },
  {
    command: "<<longtime>>",
    description: "Displays the current time with millisecond precision",
  },
  {
    command: "<<shortdate>>",
    description: "Displays the current date (ex: Mon, Apr 14)",
  },
  {
    command: "<<longdate>>",
    description: "Displays the current date (ex: Monday, April 14, 2026)",
  },
  
]

// this should really be its own file imo
function CommandCard(props: { command: string; description: string }) {
  const { theme } = useTheme()
  const { command, description } = props

  return (
    <div
      className="p-3 rounded-lg"
      style={{ background: theme.surface.elevated, borderWidth: 1, borderStyle: "solid", borderColor: theme.border.default }}
    >
      <code
        className="font-mono text-xs font-bold px-2 py-0.5 rounded"
        style={{ color: theme.text.code, background: theme.surface.code, borderWidth: 1, borderStyle: "solid", borderColor: theme.border.subtle }}
      >
        {command}
      </code>
      <p className="text-xs mt-2 leading-relaxed" style={{ color: theme.text.secondary }}>
        {description}
      </p>
    </div>
  )
}

function ReferenceTab() {
  return (
    <div className="space-y-2.5">
      {referenceCards.map((cardData) => {
        return <CommandCard command={cardData.command} description={cardData.description} />
      })}
      {/*<CommandCard command="<<mm:ss->>" description="Countdown timer starting from mm:ss, counts down to 0:00." />
      <CommandCard command="<<mm:ss+>>" description="Stopwatch counting up from mm:ss." />
      <CommandCard command="<<time>>" description="Displays the current time in hh:mm:ss format." />
      <CommandCard command="<<date>>" description="Displays the current date (MM/DD/YYYY)." />
      <CommandCard command="<<shortdate>>" description="Short date format (e.g. Sat, Apr 4, 2026)." />
      <CommandCard command="<<longdate>>" description="Long date format (e.g. Saturday, April 4, 2026)." />
      <CommandCard command="<<timetoHH:MM>>" description="Countdown to the next occurrence of the specified time (e.g. <<timeto2:00>>)." />*/}
    </div>
  )
}

export default ReferenceTab
