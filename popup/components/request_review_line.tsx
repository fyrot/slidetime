import { LucideMoveUpRight } from "lucide-react";
import { useTheme } from "~popup/theme_context";
import { useEffect, useState } from "react";

const GENERAL_MESSAGE = "Enjoying Slidetime?"
const REVIEW_MESSAGE = "Share your thoughts here"

type BrowserName = "chrome" | "edge" | "brave" | "opera" | "firefox" | "safari"

// fallbacks to chrome/chromium
function detectBrowser(): BrowserName {
  const userAgent = navigator.userAgent
  if ((navigator as any).brave) {return "brave"; }
  if (userAgent.includes("Edg/")) { return "edge"; }
  if (userAgent.includes("OPR/")) { return "opera"; }
  if (userAgent.includes("Firefox/")) { return "firefox"; }
  if (userAgent.includes("Safari/") && !userAgent.includes("Chrome/") && !userAgent.includes("Chromium/")) { return "safari"; }
  // order matters in these checks because the chromium based browsers all include chrome in their user agents

  return "chrome";
}

const REVIEW_PAGE_URLS: Partial<Record<BrowserName, string>> = {
  chrome: "https://chromewebstore.google.com/detail/slidetime/ogmlodhmcglfnaphcgojbobkadlbomji/reviews",
}

const FALLBACK_REVIEW_URL = REVIEW_PAGE_URLS.chrome as string

function RequestReviewLine() {
  const theme = useTheme();
  const reviewPageUrl = REVIEW_PAGE_URLS[detectBrowser()] ?? FALLBACK_REVIEW_URL
  const [versionString, updateVersionString] = useState<string>("");

  useEffect(() => {
    updateVersionString(chrome.runtime.getManifest().version);
  }, [])
  return (
    <div 
      className="flex flex-row items-start text-[0.55rem] pointer-events-none"
      style={{color: theme.theme.text.primary}}
    >
      <div className="flex flex-col opacity-50">
        <p>
          {GENERAL_MESSAGE}
        </p>
        <p>
          {versionString}
        </p>
        
      </div>
      <div className="grow" />
      <div className="flex flex-col">
        { /* review redirect */ }
        <div className=" opacity-50 hover:opacity-100 gap-1 items-center pointer-events-auto cursor-pointer">
          <a href={reviewPageUrl} target="_blank" rel="noreferrer noopener" className="flex flex-row gap-1">

          
            <p>
              {REVIEW_MESSAGE}
              
              
            </p>
            <LucideMoveUpRight size="1em" />
          </a>
        </div>
        { /* end of review redirect */ }
      </div>
      
    </div>
  )
}

export default RequestReviewLine;
