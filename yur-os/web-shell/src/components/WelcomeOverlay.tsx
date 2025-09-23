import React from 'react'

interface WelcomeOverlayProps {
  onDismiss: () => void
}

export const WelcomeOverlay: React.FC<WelcomeOverlayProps> = ({ onDismiss }) => {
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      background: 'rgba(10, 10, 10, 0.95)',
      backdropFilter: 'blur(20px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      pointerEvents: 'auto',
    }}>
      <div style={{
        maxWidth: '600px',
        padding: '40px',
        background: 'rgba(26, 26, 46, 0.9)',
        borderRadius: '24px',
        border: '1px solid rgba(0, 188, 212, 0.3)',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
        textAlign: 'center',
        color: 'white',
      }}>
        {/* Welcome Header */}
        <div style={{
          fontSize: '48px',
          marginBottom: '16px',
          background: 'linear-gradient(45deg, #00bcd4, #ff5722)',
          backgroundClip: 'text',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}>
          🌌
        </div>
        
        <h1 style={{
          fontSize: '32px',
          fontWeight: '300',
          marginBottom: '16px',
          background: 'linear-gradient(45deg, #00bcd4, #ff5722)',
          backgroundClip: 'text',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}>
          Welcome to YUR OS
        </h1>

        <p style={{
          fontSize: '18px',
          lineHeight: '1.6',
          opacity: 0.8,
          marginBottom: '32px',
        }}>
          Experience the future of computing with infinite-dimensional interfaces.
          Navigate your digital world through sacred geometry and spatial relationships.
        </p>

        {/* Features List */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '16px',
          marginBottom: '32px',
          textAlign: 'left',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '24px' }}>🌸</span>
            <span style={{ fontSize: '14px', opacity: 0.8 }}>Mandala Dock</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '24px' }}>🌊</span>
            <span style={{ fontSize: '14px', opacity: 0.8 }}>Fractal Zoom</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '24px' }}>📝</span>
            <span style={{ fontSize: '14px', opacity: 0.8 }}>Spatial Apps</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '24px' }}>🥽</span>
            <span style={{ fontSize: '14px', opacity: 0.8 }}>XR Ready</span>
          </div>
        </div>

        {/* Instructions */}
        <div style={{
          background: 'rgba(0, 188, 212, 0.1)',
          padding: '16px',
          borderRadius: '12px',
          marginBottom: '24px',
          fontSize: '14px',
          lineHeight: '1.5',
        }}>
          <strong>Getting Started:</strong><br />
          • Use mouse to orbit and zoom the mandala<br />
          • Click apps in the dock to select them<br />
          • Use zoom controls to explore fractally<br />
          • Each app opens in spatial context
        </div>

        {/* Enter Button */}
        <button
          onClick={onDismiss}
          style={{
            background: 'linear-gradient(45deg, #00bcd4, #ff5722)',
            border: 'none',
            borderRadius: '12px',
            padding: '16px 32px',
            color: 'white',
            fontSize: '16px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            boxShadow: '0 4px 20px rgba(0, 188, 212, 0.3)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.05)'
            e.currentTarget.style.boxShadow = '0 6px 30px rgba(0, 188, 212, 0.5)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)'
            e.currentTarget.style.boxShadow = '0 4px 20px rgba(0, 188, 212, 0.3)'
          }}
        >
          Enter the YUR OS ✨
        </button>
      </div>
    </div>
  )
}