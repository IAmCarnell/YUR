import React from 'react'

interface AppDockProps {
  onAppSelect: (appId: string) => void
  selectedApp: string | null
}

export const AppDock: React.FC<AppDockProps> = ({ onAppSelect, selectedApp }) => {
  const apps = [
    { id: 'docs', label: 'Docs', icon: '📝', color: '#4caf50' },
    { id: 'connect', label: 'Connect', icon: '🌐', color: '#2196f3' },
    { id: 'pay', label: 'Pay', icon: '💎', color: '#ff9800' },
    { id: 'mind', label: 'Mind', icon: '🧠', color: '#9c27b0' },
    { id: 'marketplace', label: 'Market', icon: '🏪', color: '#e91e63' },
    { id: 'rewards', label: 'Quests', icon: '⭐', color: '#ffc107' },
  ]

  return (
    <div style={{
      display: 'flex',
      gap: '12px',
      padding: '16px',
      background: 'rgba(26, 26, 46, 0.9)',
      backdropFilter: 'blur(10px)',
      borderRadius: '24px',
      border: '1px solid rgba(0, 188, 212, 0.3)',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
    }}>
      {apps.map((app) => (
        <button
          key={app.id}
          onClick={() => onAppSelect(app.id)}
          style={{
            width: '60px',
            height: '60px',
            borderRadius: '16px',
            border: selectedApp === app.id 
              ? '2px solid #00bcd4' 
              : '2px solid transparent',
            background: selectedApp === app.id 
              ? 'rgba(0, 188, 212, 0.2)' 
              : 'rgba(255, 255, 255, 0.1)',
            color: 'white',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '20px',
            transform: selectedApp === app.id ? 'scale(1.1)' : 'scale(1)',
            boxShadow: selectedApp === app.id 
              ? `0 4px 20px ${app.color}40` 
              : 'none',
          }}
          onMouseEnter={(e) => {
            if (selectedApp !== app.id) {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'
              e.currentTarget.style.transform = 'scale(1.05)'
            }
          }}
          onMouseLeave={(e) => {
            if (selectedApp !== app.id) {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'
              e.currentTarget.style.transform = 'scale(1)'
            }
          }}
        >
          <span style={{ fontSize: '24px', marginBottom: '2px' }}>
            {app.icon}
          </span>
          <span style={{ 
            fontSize: '10px', 
            fontWeight: '500',
            opacity: 0.8 
          }}>
            {app.label}
          </span>
        </button>
      ))}
    </div>
  )
}