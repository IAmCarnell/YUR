/**
 * Immersive XR Scene - VR/AR integration using @react-three/xr
 */

import React, { useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { XR, DefaultXRController } from '@react-three/xr'
import { Text, Box, Sphere } from '@react-three/drei'
import { Mesh, Vector3 } from 'three'

interface ImmersiveXRSceneProps {
  mode: 'vr' | 'ar' | 'normal'
  selectedApp: string | null
  onAppSelect: (appId: string) => void
}

export const ImmersiveXRScene: React.FC<ImmersiveXRSceneProps> = ({ 
  mode, 
  selectedApp, 
  onAppSelect 
}) => {
  const mandalaRef = useRef<Mesh>(null)
  const [hoveredApp, setHoveredApp] = useState<string | null>(null)

  // XR app positions in 3D space
  const xrApps = [
    { id: 'docs', label: 'Docs', position: [2, 1, -1], color: '#4caf50' },
    { id: 'connect', label: 'Connect', position: [-2, 1, -1], color: '#2196f3' },
    { id: 'pay', label: 'Pay', position: [0, 2, -2], color: '#ff9800' },
    { id: 'mind', label: 'Mind', position: [1.5, -1, -1.5], color: '#9c27b0' },
    { id: 'maps', label: 'Maps', position: [-1.5, -1, -1.5], color: '#795548' },
    { id: 'rewards', label: 'Rewards', position: [0, 0, -3], color: '#ffc107' },
    { id: 'marketplace', label: 'Marketplace', position: [0, -2, -2], color: '#e91e63' },
    { id: 'quests', label: 'Quests', position: [2.5, 0, -2], color: '#3f51b5' }
  ]

  useFrame((state) => {
    if (mandalaRef.current) {
      mandalaRef.current.rotation.y = state.clock.elapsedTime * 0.1
    }
  })

  const handleAppClick = (appId: string) => {
    onAppSelect(appId)
    // Haptic feedback for XR controllers
    if (mode !== 'normal') {
      // This would trigger haptic feedback on XR controllers
      console.log(`XR app selected: ${appId}`)
    }
  }

  return (
    <>
      {/* Central mandala structure */}
      <group ref={mandalaRef}>
        {/* Core mandala ring */}
        <mesh position={[0, 0, -2]}>
          <torusGeometry args={[1, 0.1, 16, 100]} />
          <meshStandardMaterial 
            color="#00bcd4" 
            emissive="#004d5a" 
            emissiveIntensity={mode !== 'normal' ? 0.5 : 0.3}
          />
        </mesh>

        {/* Outer rings for depth */}
        {[1.5, 2.5, 3.5].map((radius, index) => (
          <mesh key={index} position={[0, 0, -2]} rotation={[0, 0, index * Math.PI / 6]}>
            <torusGeometry args={[radius, 0.02, 8, 64]} />
            <meshStandardMaterial 
              color="#00bcd4" 
              opacity={0.3 - index * 0.1} 
              transparent 
              emissiveIntensity={mode !== 'normal' ? 0.3 : 0.1}
            />
          </mesh>
        ))}
      </group>

      {/* XR App Nodes */}
      {xrApps.map((app) => {
        const isSelected = selectedApp === app.id
        const isHovered = hoveredApp === app.id
        const scale = isSelected ? 1.3 : isHovered ? 1.1 : 1

        return (
          <group key={app.id} position={app.position as [number, number, number]}>
            {/* App sphere */}
            <Sphere
              args={[0.2, 16, 16]}
              scale={scale}
              onClick={() => handleAppClick(app.id)}
              onPointerEnter={() => setHoveredApp(app.id)}
              onPointerLeave={() => setHoveredApp(null)}
            >
              <meshStandardMaterial 
                color={isSelected ? '#ffffff' : app.color}
                emissive={app.color}
                emissiveIntensity={isSelected ? 0.8 : isHovered ? 0.5 : 0.2}
                roughness={0.2}
                metalness={0.8}
              />
            </Sphere>

            {/* App label */}
            <Text
              position={[0, -0.5, 0]}
              fontSize={mode !== 'normal' ? 0.15 : 0.2}
              color={isSelected ? '#ffffff' : '#cccccc'}
              anchorX="center"
              anchorY="middle"
              maxWidth={2}
            >
              {app.label}
            </Text>

            {/* Selection indicator */}
            {isSelected && (
              <mesh position={[0, 0, 0]}>
                <ringGeometry args={[0.3, 0.35, 32]} />
                <meshBasicMaterial 
                  color="#ffffff" 
                  transparent 
                  opacity={0.8}
                />
              </mesh>
            )}

            {/* Hover indicator */}
            {isHovered && !isSelected && (
              <mesh position={[0, 0, 0]}>
                <ringGeometry args={[0.25, 0.28, 16]} />
                <meshBasicMaterial 
                  color={app.color} 
                  transparent 
                  opacity={0.6}
                />
              </mesh>
            )}

            {/* Connection line to center */}
            <mesh>
              <cylinderGeometry 
                args={[0.01, 0.01, new Vector3(...app.position).length(), 8]} 
                rotation={[0, 0, Math.atan2(app.position[1], app.position[0]) + Math.PI/2]}
              />
              <meshStandardMaterial 
                color="#00bcd4" 
                opacity={0.3} 
                transparent
                emissiveIntensity={mode !== 'normal' ? 0.2 : 0.1}
              />
            </mesh>
          </group>
        )
      })}

      {/* Environmental elements for immersion */}
      {mode !== 'normal' && (
        <>
          {/* Particle field background */}
          {Array.from({ length: 50 }, (_, i) => (
            <Sphere
              key={i}
              args={[0.005, 4, 4]}
              position={[
                (Math.random() - 0.5) * 20,
                (Math.random() - 0.5) * 20,
                (Math.random() - 0.5) * 20
              ]}
            >
              <meshBasicMaterial 
                color="#00bcd4" 
                transparent 
                opacity={0.6}
              />
            </Sphere>
          ))}

          {/* Ambient geometric shapes */}
          <Box args={[0.1, 0.1, 0.1]} position={[5, 3, -5]}>
            <meshStandardMaterial color="#4caf50" transparent opacity={0.4} />
          </Box>
          <Box args={[0.15, 0.15, 0.15]} position={[-4, -2, -6]}>
            <meshStandardMaterial color="#ff9800" transparent opacity={0.4} />
          </Box>
          <Box args={[0.08, 0.08, 0.08]} position={[3, -3, -4]}>
            <meshStandardMaterial color="#9c27b0" transparent opacity={0.4} />
          </Box>
        </>
      )}

      {/* XR-specific lighting */}
      {mode !== 'normal' && (
        <>
          <ambientLight intensity={0.4} />
          <pointLight position={[0, 5, 2]} intensity={0.8} color="#00bcd4" />
          <pointLight position={[-5, -3, 1]} intensity={0.6} color="#ff9800" />
          <pointLight position={[5, 2, -3]} intensity={0.5} color="#4caf50" />
        </>
      )}
    </>
  )
}

// XR Control Buttons Component (simplified for demo)
export const XRControls: React.FC<{ mode: string; onModeChange: (mode: 'vr' | 'ar' | 'normal') => void }> = ({ 
  mode, 
  onModeChange 
}) => {
  return (
    <div style={{
      position: 'absolute',
      top: '20px',
      left: '20px',
      display: 'flex',
      gap: '10px',
      zIndex: 1000,
      pointerEvents: 'auto'
    }}>
      {/* Normal mode button */}
      <button
        onClick={() => onModeChange('normal')}
        style={{
          padding: '10px 15px',
          borderRadius: '8px',
          border: mode === 'normal' ? '2px solid #00bcd4' : '2px solid transparent',
          background: mode === 'normal' ? 'rgba(0, 188, 212, 0.2)' : 'rgba(26, 26, 46, 0.8)',
          color: 'white',
          cursor: 'pointer',
          backdropFilter: 'blur(10px)',
          fontSize: '12px',
          fontWeight: '600'
        }}
      >
        🖥️ Normal
      </button>

      {/* VR Mode Button */}
      <button
        onClick={() => onModeChange('vr')}
        style={{
          padding: '10px 15px',
          borderRadius: '8px',
          border: mode === 'vr' ? '2px solid #00bcd4' : '2px solid transparent',
          background: mode === 'vr' ? 'rgba(0, 188, 212, 0.2)' : 'rgba(26, 26, 46, 0.8)',
          color: 'white',
          cursor: 'pointer',
          backdropFilter: 'blur(10px)',
          fontSize: '12px',
          fontWeight: '600'
        }}
      >
        🥽 VR Mode
      </button>

      {/* AR Mode Button */}
      <button
        onClick={() => onModeChange('ar')}
        style={{
          padding: '10px 15px',
          borderRadius: '8px',
          border: mode === 'ar' ? '2px solid #00bcd4' : '2px solid transparent',
          background: mode === 'ar' ? 'rgba(0, 188, 212, 0.2)' : 'rgba(26, 26, 46, 0.8)',
          color: 'white',
          cursor: 'pointer',
          backdropFilter: 'blur(10px)',
          fontSize: '12px',
          fontWeight: '600'
        }}
      >
        👓 AR Mode
      </button>
    </div>
  )
}

// XR Session Wrapper (simplified for demo)
export const XRSession: React.FC<{ children: React.ReactNode; mode: string }> = ({ 
  children, 
  mode 
}) => {
  // For demo purposes, just render children without XR wrapper for now
  return <>{children}</>
}