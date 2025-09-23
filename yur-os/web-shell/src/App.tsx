import React, { useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { MandalaScene } from './scenes/MandalaScene'
import { AppDock } from './components/AppDock'
import { ZoomControls } from './components/ZoomControls'
import { WelcomeOverlay } from './components/WelcomeOverlay'

function App() {
  const [zoomLevel, setZoomLevel] = useState(1)
  const [selectedApp, setSelectedApp] = useState<string | null>(null)
  const [showWelcome, setShowWelcome] = useState(true)

  const handleZoom = (delta: number) => {
    setZoomLevel(prev => Math.max(0.1, Math.min(10, prev * delta)))
  }

  const handleAppSelect = (appId: string) => {
    setSelectedApp(appId)
    // TODO: Launch app in spatial context
    console.log('Launching app:', appId)
  }

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      {/* Three.js Canvas */}
      <Canvas
        camera={{ position: [0, 0, 5], fov: 60 }}
        style={{ position: 'absolute', top: 0, left: 0 }}
      >
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} />
        <OrbitControls enablePan={true} enableZoom={true} enableRotate={true} />
        <MandalaScene zoomLevel={zoomLevel} selectedApp={selectedApp} />
      </Canvas>

      {/* UI Overlay */}
      <div style={{ 
        position: 'absolute', 
        top: 0, 
        left: 0, 
        width: '100%', 
        height: '100%',
        pointerEvents: 'none',
        zIndex: 10
      }}>
        {/* App Dock */}
        <div style={{ 
          position: 'absolute',
          bottom: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          pointerEvents: 'auto'
        }}>
          <AppDock onAppSelect={handleAppSelect} selectedApp={selectedApp} />
        </div>

        {/* Zoom Controls */}
        <div style={{ 
          position: 'absolute',
          top: '20px',
          right: '20px',
          pointerEvents: 'auto'
        }}>
          <ZoomControls zoomLevel={zoomLevel} onZoom={handleZoom} />
        </div>

        {/* Welcome Overlay */}
        {showWelcome && (
          <WelcomeOverlay onDismiss={() => setShowWelcome(false)} />
        )}
      </div>
    </div>
  )
}

export default App