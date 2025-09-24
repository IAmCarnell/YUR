import React, { useState, useRef, useEffect, KeyboardEvent } from 'react'

interface ZoomControlsProps {
  zoomLevel: number
  onZoom: (delta: number) => void
  minZoom?: number
  maxZoom?: number
  step?: number
}

export const ZoomControls: React.FC<ZoomControlsProps> = ({ 
  zoomLevel, 
  onZoom, 
  minZoom = 0.1, 
  maxZoom = 10,
  step = 1.2 
}) => {
  const [isAnimating, setIsAnimating] = useState(false)
  const [focusedButtonIndex, setFocusedButtonIndex] = useState(-1)
  const containerRef = useRef<HTMLDivElement>(null)

  const handleZoomIn = () => {
    if (zoomLevel >= maxZoom) return
    setIsAnimating(true)
    onZoom(step)
    setTimeout(() => setIsAnimating(false), 200)
  }

  const handleZoomOut = () => {
    if (zoomLevel <= minZoom) return
    setIsAnimating(true)
    onZoom(1 / step)
    setTimeout(() => setIsAnimating(false), 200)
  }

  const handleReset = () => {
    setIsAnimating(true)
    onZoom(1 / zoomLevel)
    setTimeout(() => setIsAnimating(false), 300)
  }

  // Keyboard navigation
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    switch (event.key) {
      case 'ArrowUp':
        event.preventDefault()
        setFocusedButtonIndex(prev => prev > 0 ? prev - 1 : 2)
        break
      case 'ArrowDown':
        event.preventDefault()
        setFocusedButtonIndex(prev => prev < 2 ? prev + 1 : 0)
        break
      case 'Enter':
      case ' ':
        event.preventDefault()
        if (focusedButtonIndex === 0) handleZoomIn()
        else if (focusedButtonIndex === 1) handleZoomOut()
        else if (focusedButtonIndex === 2) handleReset()
        break
      case 'Escape':
        setFocusedButtonIndex(-1)
        break
      case '+':
      case '=':
        event.preventDefault()
        handleZoomIn()
        break
      case '-':
      case '_':
        event.preventDefault()
        handleZoomOut()
        break
      case '0':
        event.preventDefault()
        handleReset()
        break
    }
  }

  // Focus management
  useEffect(() => {
    if (focusedButtonIndex >= 0 && containerRef.current) {
      const buttons = containerRef.current.querySelectorAll('button')
      const targetButton = buttons[focusedButtonIndex] as HTMLElement
      targetButton?.focus()
    }
  }, [focusedButtonIndex])

  const canZoomIn = zoomLevel < maxZoom
  const canZoomOut = zoomLevel > minZoom
  const isAtDefaultZoom = Math.abs(zoomLevel - 1) < 0.01

  return (
    <div 
      ref={containerRef}
      role="group" 
      aria-label="Fractal zoom controls"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        padding: '12px',
        background: 'rgba(26, 26, 46, 0.9)',
        backdropFilter: 'blur(10px)',
        borderRadius: '16px',
        border: '1px solid rgba(0, 188, 212, 0.3)',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)',
        outline: 'none',
        transition: 'all 0.3s ease',
        transform: isAnimating ? 'scale(1.05)' : 'scale(1)'
      }}
    >
      {/* Zoom In */}
      <button
        onClick={handleZoomIn}
        onFocus={() => setFocusedButtonIndex(0)}
        disabled={!canZoomIn}
        aria-label={`Zoom in (${Math.round(zoomLevel * step * 100)}%)`}
        title="Zoom in (+ key)"
        style={{
          width: '40px',
          height: '40px',
          borderRadius: '8px',
          border: 'none',
          background: canZoomIn 
            ? (focusedButtonIndex === 0 ? 'rgba(0, 188, 212, 0.4)' : 'rgba(0, 188, 212, 0.2)')
            : 'rgba(255, 255, 255, 0.1)',
          color: canZoomIn ? '#00bcd4' : 'rgba(255, 255, 255, 0.3)',
          cursor: canZoomIn ? 'pointer' : 'not-allowed',
          fontSize: '20px',
          fontWeight: 'bold',
          transition: 'all 0.2s ease',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: canZoomIn ? 1 : 0.5,
          transform: focusedButtonIndex === 0 ? 'scale(1.1)' : 'scale(1)'
        }}
        onMouseEnter={(e) => {
          if (canZoomIn) {
            e.currentTarget.style.background = 'rgba(0, 188, 212, 0.4)'
            e.currentTarget.style.transform = 'scale(1.1)'
          }
        }}
        onMouseLeave={(e) => {
          if (canZoomIn) {
            e.currentTarget.style.background = focusedButtonIndex === 0 
              ? 'rgba(0, 188, 212, 0.4)' 
              : 'rgba(0, 188, 212, 0.2)'
            e.currentTarget.style.transform = focusedButtonIndex === 0 ? 'scale(1.1)' : 'scale(1)'
          }
        }}
      >
        +
      </button>

      {/* Zoom Level Indicator */}
      <div 
        role="status"
        aria-live="polite"
        aria-label={`Current zoom level: ${Math.round(zoomLevel * 100)}%`}
        style={{
          width: '40px',
          height: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '12px',
          color: 'rgba(255, 255, 255, 0.9)',
          fontWeight: '600',
          background: 'rgba(0, 188, 212, 0.1)',
          borderRadius: '4px',
          border: '1px solid rgba(0, 188, 212, 0.2)',
          transition: 'all 0.3s ease',
          transform: isAnimating ? 'scale(1.1)' : 'scale(1)'
        }}
      >
        {Math.round(zoomLevel * 100)}%
      </div>

      {/* Zoom Out */}
      <button
        onClick={handleZoomOut}
        onFocus={() => setFocusedButtonIndex(1)}
        disabled={!canZoomOut}
        aria-label={`Zoom out (${Math.round(zoomLevel / step * 100)}%)`}
        title="Zoom out (- key)"
        style={{
          width: '40px',
          height: '40px',
          borderRadius: '8px',
          border: 'none',
          background: canZoomOut 
            ? (focusedButtonIndex === 1 ? 'rgba(0, 188, 212, 0.4)' : 'rgba(0, 188, 212, 0.2)')
            : 'rgba(255, 255, 255, 0.1)',
          color: canZoomOut ? '#00bcd4' : 'rgba(255, 255, 255, 0.3)',
          cursor: canZoomOut ? 'pointer' : 'not-allowed',
          fontSize: '20px',
          fontWeight: 'bold',
          transition: 'all 0.2s ease',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: canZoomOut ? 1 : 0.5,
          transform: focusedButtonIndex === 1 ? 'scale(1.1)' : 'scale(1)'
        }}
        onMouseEnter={(e) => {
          if (canZoomOut) {
            e.currentTarget.style.background = 'rgba(0, 188, 212, 0.4)'
            e.currentTarget.style.transform = 'scale(1.1)'
          }
        }}
        onMouseLeave={(e) => {
          if (canZoomOut) {
            e.currentTarget.style.background = focusedButtonIndex === 1 
              ? 'rgba(0, 188, 212, 0.4)' 
              : 'rgba(0, 188, 212, 0.2)'
            e.currentTarget.style.transform = focusedButtonIndex === 1 ? 'scale(1.1)' : 'scale(1)'
          }
        }}
      >
        −
      </button>

      {/* Reset Zoom */}
      <button
        onClick={handleReset}
        onFocus={() => setFocusedButtonIndex(2)}
        disabled={isAtDefaultZoom}
        aria-label="Reset zoom to 100%"
        title="Reset zoom (0 key)"
        style={{
          width: '40px',
          height: '20px',
          borderRadius: '6px',
          border: 'none',
          background: !isAtDefaultZoom 
            ? (focusedButtonIndex === 2 ? 'rgba(255, 255, 255, 0.3)' : 'rgba(255, 255, 255, 0.1)')
            : 'rgba(255, 255, 255, 0.05)',
          color: !isAtDefaultZoom ? 'rgba(255, 255, 255, 0.9)' : 'rgba(255, 255, 255, 0.3)',
          cursor: !isAtDefaultZoom ? 'pointer' : 'not-allowed',
          fontSize: '10px',
          fontWeight: '500',
          transition: 'all 0.2s ease',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: !isAtDefaultZoom ? 1 : 0.5,
          transform: focusedButtonIndex === 2 ? 'scale(1.05)' : 'scale(1)'
        }}
        onMouseEnter={(e) => {
          if (!isAtDefaultZoom) {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)'
            e.currentTarget.style.transform = 'scale(1.05)'
          }
        }}
        onMouseLeave={(e) => {
          if (!isAtDefaultZoom) {
            e.currentTarget.style.background = focusedButtonIndex === 2 
              ? 'rgba(255, 255, 255, 0.3)' 
              : 'rgba(255, 255, 255, 0.1)'
            e.currentTarget.style.transform = focusedButtonIndex === 2 ? 'scale(1.05)' : 'scale(1)'
          }
        }}
      >
        Reset
      </button>

      {/* Zoom range indicator */}
      <div style={{
        width: '40px',
        height: '2px',
        background: 'rgba(0, 188, 212, 0.3)',
        borderRadius: '1px',
        position: 'relative',
        marginTop: '4px'
      }}>
        <div style={{
          position: 'absolute',
          left: `${Math.min(Math.max((zoomLevel - minZoom) / (maxZoom - minZoom) * 100, 0), 100)}%`,
          top: '-2px',
          width: '6px',
          height: '6px',
          background: '#00bcd4',
          borderRadius: '50%',
          transform: 'translateX(-50%)',
          transition: 'left 0.3s ease'
        }} />
      </div>
    </div>
  )
}