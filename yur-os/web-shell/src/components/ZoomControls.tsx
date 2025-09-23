import React from 'react'

interface ZoomControlsProps {
  zoomLevel: number
  onZoom: (delta: number) => void
}

export const ZoomControls: React.FC<ZoomControlsProps> = ({ zoomLevel, onZoom }) => {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      padding: '12px',
      background: 'rgba(26, 26, 46, 0.9)',
      backdropFilter: 'blur(10px)',
      borderRadius: '16px',
      border: '1px solid rgba(0, 188, 212, 0.3)',
      boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)',
    }}>
      {/* Zoom In */}
      <button
        onClick={() => onZoom(1.2)}
        style={{
          width: '40px',
          height: '40px',
          borderRadius: '8px',
          border: 'none',
          background: 'rgba(0, 188, 212, 0.2)',
          color: '#00bcd4',
          cursor: 'pointer',
          fontSize: '20px',
          fontWeight: 'bold',
          transition: 'all 0.2s ease',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(0, 188, 212, 0.4)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'rgba(0, 188, 212, 0.2)'
        }}
      >
        +
      </button>

      {/* Zoom Level Indicator */}
      <div style={{
        width: '40px',
        height: '20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '12px',
        color: 'rgba(255, 255, 255, 0.7)',
        fontWeight: '500',
      }}>
        {Math.round(zoomLevel * 100)}%
      </div>

      {/* Zoom Out */}
      <button
        onClick={() => onZoom(1 / 1.2)}
        style={{
          width: '40px',
          height: '40px',
          borderRadius: '8px',
          border: 'none',
          background: 'rgba(0, 188, 212, 0.2)',
          color: '#00bcd4',
          cursor: 'pointer',
          fontSize: '20px',
          fontWeight: 'bold',
          transition: 'all 0.2s ease',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(0, 188, 212, 0.4)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'rgba(0, 188, 212, 0.2)'
        }}
      >
        −
      </button>

      {/* Reset Zoom */}
      <button
        onClick={() => onZoom(1 / zoomLevel)}
        style={{
          width: '40px',
          height: '20px',
          borderRadius: '6px',
          border: 'none',
          background: 'rgba(255, 255, 255, 0.1)',
          color: 'rgba(255, 255, 255, 0.7)',
          cursor: 'pointer',
          fontSize: '10px',
          fontWeight: '500',
          transition: 'all 0.2s ease',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'
        }}
      >
        Reset
      </button>
    </div>
  )
}