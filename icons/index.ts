export interface IconOption {
  id: string
  displayName: string
  displayColor: string
  assetPath: string
}

const ICON_STORAGE_KEY = "selectedIconId";

// Add your icons here!! pretty please
const allIcons: IconOption[] = [

  {
    id: "light-alt",
    displayName: "Mercury",  // slate
    displayColor: "#474747",
    assetPath: "/assets/128/light-alt.png" // inlines are okay here because of how assets/ are bundled
  },
  { 
    id: "dark-alt", 
    displayName: "Magnesium", // air  // the name being opposite to the icon color is because the icons were originally named after the mode they're supposed to be used in 
    displayColor: "#c7c7c7",  // e.g. dark-alt is for dark mode, so the icon itself is lighter
    assetPath: "/assets/128/dark-alt.png"
  }

]

export { allIcons, ICON_STORAGE_KEY }
