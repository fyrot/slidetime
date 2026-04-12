// Theme type definition — JSON-parseable, no Tailwind classes
// Semantic naming: describes purpose, not appearance

// we will help 

interface TabButtonStyle {
  color: string              // text/icon color
  background?: string        // background color, omit for transparent
  opacity?: number           // background opacity (0-1), defaults to 1
  blur?: string              // CSS blur value (e.g. "8px"), omit for none
}

export interface PopupTheme {
  id: string
  displayName: string
  themeDisplayColor: string  // color to be used when rendering theme selectors
  
  surface: {
    base: string             // main popup background
    elevated: string         // cards, raised containers
    overlay: string          // elements floating over content (tab selector)
    code: string             // code/mono blocks
  }
  text: {
    primary: string          // main readable text
    secondary: string        // supporting/descriptive text
    muted: string            // de-emphasized text (footer, hints)
    accent: string           // highlighted/active text
  }
  border: {
    default: string          // standard borders
    active: string           // active/focused element borders
    subtle: string           // code blocks, dividers
  }
  effects: {
    overlay: {               // applied to floating overlay surfaces
      opacity: number        // 0-1, background opacity
      blur: string           // CSS blur value (e.g. "12px"), empty string for none
    }
    fade: string             // color used for scroll fade gradients (should match surface.base)
  }
  tabSelector: {
    idle: TabButtonStyle     // unselected, not interacted with
    hover: TabButtonStyle    // unselected, hovered
    active: TabButtonStyle   // currently selected
  }
}


// now useless export, keeping it here for later reference in case needed
/*// Default dark theme
const darkTheme: PopupTheme = {
  id: "dark",
  displayName: "Slate",
  themeDisplayColor: "#1a1a1a",
  surface: {
    base: "#1a1a1a",
    elevated: "#252525",
    overlay: "#252525",
    code: "#2a2a2a",
  },
  text: {
    primary: "#e8e8e8",
    secondary: "#999999",
    muted: "#666666",
    accent: "#ffffff",
  },
  border: {
    default: "#333333",
    active: "#555555",
    subtle: "#3a3a3a",
  },
  effects: {
    overlay: {
      opacity: 0.4,
      blur: "12px",
    },
    fade: "#1a1a1a",
  },
  tabSelector: {
    idle: {
      color: "#999999",
    },
    hover: {
      color: "#dddddd",
      background: "#ffffff",
      opacity: 0.0,
    },
    active: {
      color: "#000000",
      background: "#ffffff"
    },
  },
}

export default darkTheme
*/