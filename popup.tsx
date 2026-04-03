import "./styles.css"
import { useState } from "react"

function IndexPopup() {
  const [data, setData] = useState("")

  return (
    <div className="w-[325px] h-[425px] flex items-center justify-center">
      <h1>Hi!</h1>
    </div>
  )
}

export default IndexPopup
