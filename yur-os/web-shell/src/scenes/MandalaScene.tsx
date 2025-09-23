import React, { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Mesh, Vector3 } from 'three'
import { Text } from '@react-three/drei'

interface MandalaSceneProps {
  zoomLevel: number
  selectedApp: string | null
}

export const MandalaScene: React.FC<MandalaSceneProps> = ({ zoomLevel, selectedApp }) => {
  const mandalaRef = useRef<Mesh>(null)
  
  // Generate mandala points in sacred geometry pattern
  const mandalaPoints = useMemo(() => {
    const points: Array<{ position: Vector3; app: string; label: string }> = []
    const apps = [
      { id: 'docs', label: 'Docs', angle: 0 },
      { id: 'connect', label: 'Connect', angle: Math.PI / 3 },
      { id: 'pay', label: 'Pay', angle: (2 * Math.PI) / 3 },
      { id: 'mind', label: 'Mind', angle: Math.PI },
      { id: 'maps', label: 'Maps', angle: (4 * Math.PI) / 3 },
      { id: 'rewards', label: 'Rewards', angle: (5 * Math.PI) / 3 },
    ]
    
    apps.forEach(({ id, label, angle }) => {
      const radius = 2.5
      const x = Math.cos(angle) * radius
      const y = Math.sin(angle) * radius
      points.push({
        position: new Vector3(x, y, 0),
        app: id,
        label
      })
    })
    
    return points
  }, [])

  useFrame((state) => {
    if (mandalaRef.current) {
      mandalaRef.current.rotation.z = state.clock.elapsedTime * 0.1
    }
  })

  return (
    <group ref={mandalaRef} scale={zoomLevel}>
      {/* Central mandala core */}
      <mesh position={[0, 0, 0]}>
        <torusGeometry args={[0.5, 0.1, 8, 16]} />
        <meshStandardMaterial 
          color="#00bcd4" 
          emissive="#004d5a" 
          emissiveIntensity={0.3}
        />
      </mesh>

      {/* App nodes */}
      {mandalaPoints.map(({ position, app, label }) => (
        <group key={app} position={position}>
          {/* App sphere */}
          <mesh>
            <sphereGeometry args={[0.3, 16, 16]} />
            <meshStandardMaterial 
              color={selectedApp === app ? "#ff5722" : "#00bcd4"}
              emissive={selectedApp === app ? "#ff2722" : "#004d5a"}
              emissiveIntensity={0.5}
            />
          </mesh>
          
          {/* App label */}
          <Text
            position={[0, -0.8, 0]}
            fontSize={0.3}
            color="white"
            anchorX="center"
            anchorY="middle"
            font="/fonts/inter-medium.woff"
          >
            {label}
          </Text>

          {/* Connection lines to center */}
          <mesh>
            <cylinderGeometry args={[0.02, 0.02, position.length(), 8]} />
            <meshStandardMaterial color="#00bcd4" opacity={0.3} transparent />
          </mesh>
        </group>
      ))}

      {/* Fractal background rings */}
      {[1, 2, 3].map((ring) => (
        <mesh key={ring} rotation={[0, 0, ring * Math.PI / 6]}>
          <torusGeometry args={[1.5 * ring, 0.02, 4, 32]} />
          <meshStandardMaterial 
            color="#00bcd4" 
            opacity={0.1 / ring} 
            transparent 
          />
        </mesh>
      ))}
    </group>
  )
}