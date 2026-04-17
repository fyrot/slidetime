import type { PopupTheme } from "~popup/theme"
import dark from "./dark.json"
import aggie from "./aggie.json"
import light from "./light.json"
import green from "./green.json"

// Add your themes here!!
const allThemes: PopupTheme[] = [
  light as PopupTheme,
  dark as PopupTheme,
  aggie as PopupTheme,
  green as PopupTheme,
]

export default allThemes
