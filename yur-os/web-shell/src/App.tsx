import React, { useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { MandalaScene } from './scenes/MandalaScene'
import { AppDock } from './components/AppDock'
import { ZoomControls } from './components/ZoomControls'
import { WelcomeOverlay } from './components/WelcomeOverlay'
import { ImmersiveXRScene, XRControls, XRSession } from './components/ImmersiveXRScene'
import { AROverlay } from './components/AROverlay'
import { Marketplace } from './components/Marketplace'
import { Quests } from './components/Quests'
import { DocsApp } from './components/apps/Docs'
import { PayApp } from './components/apps/Pay'
import { rewardsSystem } from './lib/rewards'

function App() {
  const [zoomLevel, setZoomLevel] = useState(1)
  const [selectedApp, setSelectedApp] = useState<string | null>(null)
  const [showWelcome, setShowWelcome] = useState(true)
  const [xrMode, setXrMode] = useState<'normal' | 'vr' | 'ar'>('normal')
  const [openApps, setOpenApps] = useState<Set<string>>(new Set())
  const [userStats] = useState(rewardsSystem.getUserStats())

  const handleZoom = (delta: number) => {
    setZoomLevel(prev => Math.max(0.1, Math.min(10, prev * delta)))
  }

  const handleAppSelect = (appId: string) => {
    setSelectedApp(appId)
    setOpenApps(prev => new Set(prev).add(appId))
    console.log('Launching app:', appId)
  }

  const handleAppClose = (appId: string) => {
    setOpenApps(prev => {
      const newSet = new Set(prev)
      newSet.delete(appId)
      return newSet
    })
    if (selectedApp === appId) {
      setSelectedApp(null)
    }
  }

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      {/* Three.js Canvas with XR support */}
      <Canvas
        camera={{ position: [0, 0, 5], fov: 60 }}
        style={{ position: 'absolute', top: 0, left: 0 }}
      >
        <XRSession mode={xrMode}>
          <ambientLight intensity={0.5} />
          <pointLight position={[10, 10, 10]} />
          <OrbitControls enablePan={true} enableZoom={true} enableRotate={true} />
          
          {xrMode !== 'normal' ? (
            <ImmersiveXRScene 
              mode={xrMode} 
              selectedApp={selectedApp} 
              onAppSelect={handleAppSelect}
            />
          ) : (
            <MandalaScene zoomLevel={zoomLevel} selectedApp={selectedApp} />
          )}
        </XRSession>
      </Canvas>

      {/* AR Overlay */}
      <AROverlay 
        isARMode={xrMode === 'ar'} 
        selectedApp={selectedApp}
        onAppSelect={handleAppSelect}
        userStats={userStats}
      />

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
        {/* XR Controls */}
        <XRControls mode={xrMode} onModeChange={setXrMode} />

        {/* App Dock */}
        {xrMode === 'normal' && (
          <div style={{ 
            position: 'absolute',
            bottom: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            pointerEvents: 'auto'
          }}>
            <AppDock onAppSelect={handleAppSelect} selectedApp={selectedApp} />
          </div>
        )}

        {/* Zoom Controls */}
        {xrMode === 'normal' && (
          <div style={{ 
            position: 'absolute',
            top: '20px',
            right: '20px',
            pointerEvents: 'auto'
          }}>
            <ZoomControls zoomLevel={zoomLevel} onZoom={handleZoom} />
          </div>
        )}

        {/* Welcome Overlay */}
        {showWelcome && (
          <WelcomeOverlay onDismiss={() => setShowWelcome(false)} />
        )}
      </div>

      {/* App Windows */}
      <DocsApp 
        isVisible={openApps.has('docs')} 
        onClose={() => handleAppClose('docs')} 
      />
      <PayApp 
        isVisible={openApps.has('pay')} 
        onClose={() => handleAppClose('pay')} 
      />
      <Marketplace 
        isVisible={openApps.has('marketplace') || openApps.has('maps')} 
        onClose={() => {
          handleAppClose('marketplace')
          handleAppClose('maps')
        }} 
      />
      <Quests 
        isVisible={openApps.has('rewards') || openApps.has('quests')} 
        onClose={() => {
          handleAppClose('rewards')
          handleAppClose('quests')
        }} 
      />
    </div>
  )
}

export default App