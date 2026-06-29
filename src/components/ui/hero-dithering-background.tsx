import { useState, Suspense, lazy, useEffect } from "react"

const Dithering = lazy(() =>
  import("@paper-design/shaders-react").then((mod) => ({ 
    default: mod.Dithering 
  }))
)

export function HeroDitheringBackground({ children }: { children: React.ReactNode }) {
  const [isHovered, setIsHovered] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.matchMedia('(max-width: 768px)').matches)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  if (isMobile) {
    return <div className="relative w-full">{children}</div>
  }

  return (
    <div
      className="relative overflow-hidden w-screen"
      style={{ marginLeft: "calc(-50vw + 50%)" }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Dithering shader — background only */}
      <Suspense fallback={<div className="absolute inset-0 bg-white" />}>
        <div 
          className="absolute inset-0 z-0 pointer-events-none opacity-20 mix-blend-multiply w-full h-full"
          style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }}
        >
          <Dithering
            colorBack="#ffffff"
            colorFront="#1D4ED8"
            shape="warp"
            type="4x4"
            speed={isHovered ? 0.5 : 0.15}
            className="w-full h-full"
            style={{ position: "absolute", inset: 0 }}
            minPixelRatio={1}
          />
        </div>
      </Suspense>

      {/* Existing hero content sits on top */}
      <div className="relative z-10 w-full max-w-[1280px] mx-auto px-12">
        {children}
      </div>
    </div>
  )
}
