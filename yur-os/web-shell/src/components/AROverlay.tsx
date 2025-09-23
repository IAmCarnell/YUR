/**
 * AR Overlay Component - Augmented reality interface overlay
 */

import React, { useState, useEffect } from 'react'

interface AROverlayProps {
  isARMode: boolean
  selectedApp: string | null
  onAppSelect: (appId: string) => void
  userStats?: {
    level: number
    xp: number
    tokens: number
  }
}

export const AROverlay: React.FC<AROverlayProps> = ({ 
  isARMode, 
  selectedApp, 
  onAppSelect,
  userStats
}) => {
  const [handPosition, setHandPosition] = useState({ x: 0, y: 0 })
  const [isGestureMode, setIsGestureMode] = useState(false)

  // Simulate hand tracking (in real implementation, this would connect to MediaPipe or similar)
  useEffect(() => {
    if (isARMode) {
      const interval = setInterval(() => {
        // Simulate hand movement for demo
        setHandPosition({
          x: 50 + Math.sin(Date.now() * 0.001) * 20,
          y: 50 + Math.cos(Date.now() * 0.002) * 15
        })
      }, 100)

      return () => clearInterval(interval)
    }
  }, [isARMode])

  if (!isARMode) return null

  const arApps = [
    { id: 'docs', label: 'Docs', icon: '📝', position: { x: 10, y: 20 } },
    { id: 'connect', label: 'Connect', icon: '🌐', position: { x: 90, y: 20 } },
    { id: 'pay', label: 'Pay', icon: '💎', position: { x: 10, y: 80 } },
    { id: 'marketplace', label: 'Market', icon: '🏪', position: { x: 90, y: 80 } },
    { id: 'quests', label: 'Quests', icon: '⚡', position: { x: 50, y: 50 } }
  ]

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      pointerEvents: 'none',
      zIndex: 1000
    }}>
      {/* AR Frame Indicator */}
      <div style={{
        position: 'absolute',
        top: '10px',
        left: '10px',
        right: '10px',
        bottom: '10px',
        border: '2px solid rgba(0, 188, 212, 0.3)',
        borderRadius: '20px',
        pointerEvents: 'none'
      }}>
        {/* Corner markers */}
        {[
          { top: '-5px', left: '-5px' },
          { top: '-5px', right: '-5px' },
          { bottom: '-5px', left: '-5px' },
          { bottom: '-5px', right: '-5px' }
        ].map((position, index) => (
          <div
            key={index}
            style={{
              position: 'absolute',
              width: '20px',
              height: '20px',
              border: '3px solid #00bcd4',
              borderRadius: '50%',
              background: 'rgba(0, 188, 212, 0.2)',
              ...position
            }}
          />
        ))}
      </div>

      {/* AR Status Bar */}
      <div style={{
        position: 'absolute',
        top: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(10px)',
        borderRadius: '20px',
        padding: '8px 16px',
        color: 'white',
        fontSize: '12px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        pointerEvents: 'auto'
      }}>
        <div style={{ 
          width: '8px', 
          height: '8px', 
          borderRadius: '50%', 
          background: '#4caf50',
          animation: 'pulse 2s infinite' 
        }} />
        <span>AR Mode Active</span>
        <span style={{ opacity: 0.7 }}>|</span>
        <span style={{ fontSize: '10px', opacity: 0.8 }}>
          Hand Tracking: {isGestureMode ? 'ON' : 'OFF'}
        </span>
      </div>

      {/* User Stats HUD */}
      {userStats && (
        <div style={{
          position: 'absolute',
          top: '20px',
          right: '20px',
          background: 'rgba(0, 0, 0, 0.6)',
          backdropFilter: 'blur(10px)',
          borderRadius: '12px',
          padding: '12px',
          color: 'white',
          fontSize: '11px',
          minWidth: '120px'
        }}>
          <div style={{ marginBottom: '8px', fontWeight: '600', color: '#00bcd4' }}>
            Level {userStats.level}
          </div>
          <div style={{ marginBottom: '4px' }}>
            XP: {userStats.xp}
          </div>
          <div>
            Tokens: {userStats.tokens} 💎
          </div>
        </div>
      )}

      {/* AR App Icons */}
      {arApps.map((app) => {
        const isSelected = selectedApp === app.id
        const distance = Math.sqrt(
          Math.pow(handPosition.x - app.position.x, 2) + 
          Math.pow(handPosition.y - app.position.y, 2)
        )
        const isNearHand = distance < 15

        return (
          <div
            key={app.id}
            onClick={() => onAppSelect(app.id)}
            style={{
              position: 'absolute',
              left: `${app.position.x}%`,
              top: `${app.position.y}%`,
              width: '60px',
              height: '60px',
              borderRadius: '16px',
              background: isSelected 
                ? 'rgba(0, 188, 212, 0.4)' 
                : isNearHand 
                  ? 'rgba(255, 255, 255, 0.3)'
                  : 'rgba(0, 0, 0, 0.6)',
              backdropFilter: 'blur(10px)',
              border: isSelected 
                ? '2px solid #00bcd4' 
                : isNearHand
                  ? '2px solid #ffffff'
                  : '2px solid rgba(255, 255, 255, 0.2)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              cursor: 'pointer',
              pointerEvents: 'auto',
              transition: 'all 0.3s ease',
              transform: `translate(-50%, -50%) scale(${isSelected ? 1.2 : isNearHand ? 1.1 : 1})`,
              boxShadow: isSelected 
                ? '0 0 20px rgba(0, 188, 212, 0.5)'
                : isNearHand
                  ? '0 0 15px rgba(255, 255, 255, 0.3)'
                  : '0 4px 15px rgba(0, 0, 0, 0.3)'
            }}
          >
            <div style={{ fontSize: '24px', marginBottom: '2px' }}>
              {app.icon}
            </div>
            <div style={{ 
              fontSize: '9px', 
              fontWeight: '500',
              textAlign: 'center',
              opacity: 0.9
            }}>
              {app.label}
            </div>

            {/* Selection ring */}
            {isSelected && (
              <div style={{
                position: 'absolute',
                top: '-5px',
                left: '-5px',
                right: '-5px',
                bottom: '-5px',
                borderRadius: '20px',
                border: '2px solid #00bcd4',
                animation: 'pulse 2s infinite'
              }} />
            )}
          </div>
        )
      })}

      {/* Hand Tracking Cursor */}
      {isGestureMode && (
        <div style={{
          position: 'absolute',
          left: `${handPosition.x}%`,
          top: `${handPosition.y}%`,
          transform: 'translate(-50%, -50%)',
          width: '20px',
          height: '20px',
          borderRadius: '50%',
          background: 'rgba(0, 188, 212, 0.8)',
          border: '2px solid #ffffff',
          boxShadow: '0 0 15px rgba(0, 188, 212, 0.6)',
          pointerEvents: 'none',
          transition: 'all 0.1s ease'
        }}>
          {/* Hand trail effect */}
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '30px',
            height: '30px',
            borderRadius: '50%',
            border: '1px solid rgba(0, 188, 212, 0.4)',
            animation: 'ping 1s cubic-bezier(0, 0, 0.2, 1) infinite'
          }} />
        </div>
      )}

      {/* AR Gesture Controls */}
      <div style={{
        position: 'absolute',
        bottom: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        gap: '10px',
        pointerEvents: 'auto'
      }}>
        <button
          onClick={() => setIsGestureMode(!isGestureMode)}
          style={{
            padding: '12px 20px',
            borderRadius: '25px',
            border: 'none',
            background: isGestureMode 
              ? 'rgba(0, 188, 212, 0.8)' 
              : 'rgba(0, 0, 0, 0.6)',
            color: 'white',
            cursor: 'pointer',
            backdropFilter: 'blur(10px)',
            fontSize: '12px',
            fontWeight: '600',
            transition: 'all 0.3s ease'
          }}
        >
          {isGestureMode ? '✋ Gesture Mode' : '👆 Touch Mode'}
        </button>

        <button
          style={{
            padding: '12px 20px',
            borderRadius: '25px',
            border: 'none',
            background: 'rgba(0, 0, 0, 0.6)',
            color: 'white',
            cursor: 'pointer',
            backdropFilter: 'blur(10px)',
            fontSize: '12px',
            fontWeight: '600'
          }}
        >
          🎯 Calibrate
        </button>
      </div>

      {/* AR Instructions */}
      <div style={{
        position: 'absolute',
        bottom: '80px',
        left: '20px',
        background: 'rgba(0, 0, 0, 0.6)',
        backdropFilter: 'blur(10px)',
        borderRadius: '12px',
        padding: '12px',
        color: 'white',
        fontSize: '11px',
        maxWidth: '200px',
        opacity: 0.8
      }}>
        <div style={{ fontWeight: '600', marginBottom: '8px', color: '#00bcd4' }}>
          AR Instructions:
        </div>
        <div style={{ lineHeight: '1.4' }}>
          • Point at apps to highlight<br />
          • Tap to select<br />
          • Use gestures for navigation<br />
          • Move closer for interaction
        </div>
      </div>

      {/* Add CSS animations */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        
        @keyframes ping {
          75%, 100% {
            transform: translate(-50%, -50%) scale(2);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  )
}