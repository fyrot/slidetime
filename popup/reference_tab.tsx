import { useTheme } from "./theme_context"
import CommandCard from "./components/command_card"


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
    description: "Displays the current time with millisecond precision (hh:mm:ss.SSS)",
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

function ReferenceTab() {
  return (
    <div className="space-y-2.5">
      {referenceCards.map((cardData) => {
        return <CommandCard key={cardData.command} command={cardData.command} description={cardData.description} />
      })}
    </div>
  )
}

export default ReferenceTab
