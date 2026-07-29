interface FadeInProps {
  expanded: boolean
  children: React.ReactNode
  duration: number // fade in duration in milliseconds
  className?: string
}

const FadeIn = ( { expanded, children, duration = 500, className = ""} : FadeInProps) => {
  return (
    <div className={`
      grid
      transition-all  
      min-h-0
      ${expanded ? "opacity-100" : "opacity-0"}
      ${expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}
      ${expanded ? className : ""}
      `}
      style={{transitionDuration: `${duration}ms`}}
      >
        <div className="overflow-hidden">
          {children}
        </div>
        
    </div>
  )
}

export default FadeIn