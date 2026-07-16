interface FadeInProps {
  expanded: boolean
  children: React.ReactNode
  duration: number // fade in duration in milliseconds
}

const FadeIn = ( { expanded, children, duration = 300} : FadeInProps) => {
  return (
    <div className={`
      grid
      transition-all  
      min-h-0
      ${expanded ? "opacity-100" : "opacity-0"}
      ${expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}
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