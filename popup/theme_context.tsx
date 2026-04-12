import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import type { PopupTheme } from "./theme"
import allThemes from "~themes"



const STORAGE_KEY = "selectedThemeId"

interface ThemeContextValue {
  theme: PopupTheme
  setTheme: (theme: PopupTheme) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

function getDefaultTheme(): PopupTheme {
  return allThemes[0] ?? require("~themes/dark.json") as PopupTheme
}

function persistThemeId(id: string) {
  chrome.storage.local.set({ [STORAGE_KEY]: id })
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<PopupTheme>(getDefaultTheme())

  useEffect(() => {
    chrome.storage.local.get([STORAGE_KEY], (result) => {
      const savedId = result[STORAGE_KEY]
      if (savedId) {
        const found = allThemes.find((t) => t.id === savedId)
        if (found) {
          setThemeState(found)
        } else {
          const fallback = getDefaultTheme()
          setThemeState(fallback)
          persistThemeId(fallback.id)
        }
      }
    })
  }, [])

  function setTheme(newTheme: PopupTheme) {
    setThemeState(newTheme)
    persistThemeId(newTheme.id)
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error("useTheme must be used within a ThemeProvider")
  return ctx
}
