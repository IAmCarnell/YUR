import React, { useState, useRef, useEffect, KeyboardEvent } from 'react'

interface App {
  id: string
  label: string
  icon: string
  color: string
  description: string
  category: string
  installed: boolean
}

interface AppDockProps {
  onAppSelect: (appId: string) => void
  selectedApp: string | null
  apps?: App[]
  isLoading?: boolean
}

export const AppDock: React.FC<AppDockProps> = ({ 
  onAppSelect, 
  selectedApp, 
  apps: externalApps,
  isLoading = false 
}) => {
  const [focusedAppIndex, setFocusedAppIndex] = useState<number>(-1)
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null)
  const dockRef = useRef<HTMLDivElement>(null)

  const defaultApps: App[] = [
    { 
      id: 'docs', 
      label: 'Docs', 
      icon: '📝', 
      color: '#4caf50',
      description: 'Collaborative document editor with real-time sync',
      category: 'productivity',
      installed: true
    },
    { 
      id: 'connect', 
      label: 'Connect', 
      icon: '🌐', 
      color: '#2196f3',
      description: 'Social networks in spatial proximity',
      category: 'social',
      installed: true
    },
    { 
      id: 'pay', 
      label: 'Pay', 
      icon: '💎', 
      color: '#ff9800',
      description: 'DeFi wallet and payments interface',
      category: 'finance',
      installed: true
    },
    { 
      id: 'mind', 
      label: 'Mind', 
      icon: '🧠', 
      color: '#9c27b0',
      description: 'Thoughts mapped in cognitive space',
      category: 'productivity',
      installed: true
    },
    { 
      id: 'marketplace', 
      label: 'Market', 
      icon: '🏪', 
      color: '#e91e63',
      description: 'App marketplace and plugin store',
      category: 'utility',
      installed: true
    },
    { 
      id: 'rewards', 
      label: 'Quests', 
      icon: '⭐', 
      color: '#ffc107',
      description: 'Achievement system and quest management',
      category: 'gamification',
      installed: true
    },
  ]

  const apps = externalApps || defaultApps

  // Keyboard navigation
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    switch (event.key) {
      case 'ArrowLeft':
        event.preventDefault()
        setFocusedAppIndex(prev => prev > 0 ? prev - 1 : apps.length - 1)
        break
      case 'ArrowRight':
        event.preventDefault()
        setFocusedAppIndex(prev => prev < apps.length - 1 ? prev + 1 : 0)
        break
      case 'Enter':
      case ' ':
        event.preventDefault()
        if (focusedAppIndex >= 0) {
          onAppSelect(apps[focusedAppIndex].id)
        }
        break
      case 'Escape':
        setFocusedAppIndex(-1)
        break
    }
  }

  // Touch gesture handling
  const handleTouchStart = (event: React.TouchEvent) => {
    const touch = event.touches[0]
    setTouchStart({ x: touch.clientX, y: touch.clientY })
  }

  const handleTouchEnd = (event: React.TouchEvent, appId: string) => {
    if (!touchStart) return
    
    const touch = event.changedTouches[0]
    const deltaX = Math.abs(touch.clientX - touchStart.x)
    const deltaY = Math.abs(touch.clientY - touchStart.y)
    
    // Only register as tap if minimal movement
    if (deltaX < 10 && deltaY < 10) {
      onAppSelect(appId)
    }
    
    setTouchStart(null)
  }

  // Focus management
  useEffect(() => {
    if (focusedAppIndex >= 0 && dockRef.current) {
      const focusedButton = dockRef.current.children[focusedAppIndex] as HTMLElement
      focusedButton?.focus()
    }
  }, [focusedAppIndex])

  return (
    <div 
      ref={dockRef}
      role="toolbar"
      aria-label="Application dock with spatial apps"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      style={{
        display: 'flex',
        gap: 'min(12px, 2vw)',
        padding: 'min(16px, 3vw)',
        background: 'rgba(26, 26, 46, 0.9)',
        backdropFilter: 'blur(10px)',
        borderRadius: 'min(24px, 4vw)',
        border: '1px solid rgba(0, 188, 212, 0.3)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
        maxWidth: '90vw',
        overflow: 'auto',
        scrollBehavior: 'smooth',
        outline: 'none'
      }}
    >
      {isLoading ? (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          color: 'rgba(255, 255, 255, 0.6)',
          fontSize: '14px'
        }}>
          <div style={{
            width: '20px',
            height: '20px',
            border: '2px solid rgba(0, 188, 212, 0.3)',
            borderTop: '2px solid #00bcd4',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }} />
          Loading apps...
        </div>
      ) : (
        apps.map((app, index) => (
          <button
            key={app.id}
            onClick={() => onAppSelect(app.id)}
            onTouchStart={handleTouchStart}
            onTouchEnd={(e) => handleTouchEnd(e, app.id)}
            onFocus={() => setFocusedAppIndex(index)}
            aria-label={`${app.label}: ${app.description}`}
            aria-describedby={`app-${app.id}-tooltip`}
            title={app.description}
            style={{
              width: 'min(60px, 12vw)',
              height: 'min(60px, 12vw)',
              minWidth: '50px',
              minHeight: '50px',
              borderRadius: 'min(16px, 3vw)',
              border: selectedApp === app.id || focusedAppIndex === index
                ? '2px solid #00bcd4' 
                : '2px solid transparent',
              background: selectedApp === app.id 
                ? 'rgba(0, 188, 212, 0.2)' 
                : focusedAppIndex === index
                ? 'rgba(0, 188, 212, 0.1)'
                : 'rgba(255, 255, 255, 0.1)',
              color: 'white',
              cursor: 'pointer',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 'min(20px, 4vw)',
              transform: selectedApp === app.id ? 'scale(1.1)' : 'scale(1)',
              boxShadow: selectedApp === app.id 
                ? `0 4px 20px ${app.color}40` 
                : focusedAppIndex === index
                ? `0 2px 12px ${app.color}20`
                : 'none',
              opacity: app.installed ? 1 : 0.6,
              filter: app.installed ? 'none' : 'grayscale(0.5)',
              position: 'relative'
            }}
            onMouseEnter={(e) => {
              if (selectedApp !== app.id) {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'
                e.currentTarget.style.transform = 'scale(1.05)'
              }
            }}
            onMouseLeave={(e) => {
              if (selectedApp !== app.id) {
                e.currentTarget.style.background = focusedAppIndex === index 
                  ? 'rgba(0, 188, 212, 0.1)' 
                  : 'rgba(255, 255, 255, 0.1)'
                e.currentTarget.style.transform = 'scale(1)'
              }
            }}
          >
            <span style={{ 
              fontSize: 'min(24px, 5vw)', 
              marginBottom: '2px',
              filter: app.installed ? 'none' : 'grayscale(1)'
            }}>
              {app.icon}
            </span>
            <span style={{ 
              fontSize: 'min(10px, 2.5vw)', 
              fontWeight: '500',
              opacity: 0.8,
              textAlign: 'center',
              lineHeight: 1.2
            }}>
              {app.label}
            </span>
            
            {/* Category indicator */}
            <div style={{
              position: 'absolute',
              top: '4px',
              right: '4px',
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: app.color,
              opacity: 0.7
            }} />
            
            {/* Installation status */}
            {!app.installed && (
              <div style={{
                position: 'absolute',
                bottom: '2px',
                right: '2px',
                fontSize: '8px',
                opacity: 0.5
              }}>
                ⏬
              </div>
            )}
          </button>
        ))
      )}
      
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          
          /* Responsive scrollbar */
          div[role="toolbar"]::-webkit-scrollbar {
            height: 4px;
          }
          
          div[role="toolbar"]::-webkit-scrollbar-track {
            background: rgba(255, 255, 255, 0.1);
            border-radius: 2px;
          }
          
          div[role="toolbar"]::-webkit-scrollbar-thumb {
            background: rgba(0, 188, 212, 0.5);
            border-radius: 2px;
          }
          
          div[role="toolbar"]::-webkit-scrollbar-thumb:hover {
            background: rgba(0, 188, 212, 0.7);
          }
        `}
      </style>
    </div>
  )
}