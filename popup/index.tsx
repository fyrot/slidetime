import "../styles.css"
import { ThemeProvider } from "./theme_context"
import TestPopup from "./test_popup"

function IndexPopup() {
  return (
    <ThemeProvider>
      <TestPopup />
    </ThemeProvider>
  )
}

export default IndexPopup
