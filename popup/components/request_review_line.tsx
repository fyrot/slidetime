import { LucideMoveUpRight } from "lucide-react";
import { useTheme } from "~popup/theme_context";


const GENERAL_MESSAGE = "Enjoying Slidetime?"
const REVIEW_MESSAGE = "Share your thoughts here"

function RequestReviewLine() {
  const theme = useTheme();

  const openReviewPage = () => {
    // conditionally check for which browser the user is running and open a window that links to the extension's reviews page
  }

  return (
    <div 
      className="flex flex-row items-start text-[0.5rem] opacity-50 hover:opacity-100 duration-300 transition-all"
      style={{color: theme.theme.text.primary}}
    >
      <p>
        {GENERAL_MESSAGE}
      </p>
      <div className="grow" />
      <div className="flex flex-col">
        { /* review redirect */ }
        <div className="flex flex-row">
          <p>
            {REVIEW_MESSAGE}
          </p>
          <LucideMoveUpRight />
        </div>
        { /* end of review redirect */ }
      </div>
      
    </div>
  )
}

export default RequestReviewLine;
