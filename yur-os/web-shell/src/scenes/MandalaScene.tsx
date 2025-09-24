import React, { useRef, useMemo, useState, useCallback } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Mesh, Vector3, Color, ShaderMaterial } from 'three'
import { Text } from '@react-three/drei'

interface MandalaSceneProps {
  zoomLevel: number
  selectedApp: string | null
  onAppClick?: (appId: string) => void
}

interface AppNode {
  id: string
  label: string
  position: Vector3
  angle: number
  radius: number
  color: Color
  fractalDepth: number
}

// Mandelbrot shader for true fractal rendering
const mandelbrotFragmentShader = `
  uniform float u_time;
  uniform float u_zoom;
  uniform vec2 u_center;
  uniform vec3 u_color;
  
  varying vec2 vUv;
  
  vec2 complexMul(vec2 a, vec2 b) {
    return vec2(a.x * b.x - a.y * b.y, a.x * b.y + a.y * b.x);
  }
  
  float mandelbrot(vec2 c) {
    vec2 z = vec2(0.0);
    float iterations = 0.0;
    const float maxIterations = 100.0;
    
    for(float i = 0.0; i < maxIterations; i++) {
      if(dot(z, z) > 4.0) break;
      z = complexMul(z, z) + c;
      iterations++;
    }
    
    return iterations / maxIterations;
  }
  
  void main() {
    vec2 uv = (vUv - 0.5) * 2.0;
    vec2 c = uv / u_zoom + u_center;
    
    float m = mandelbrot(c);
    
    // Color based on iteration count with time animation
    vec3 color1 = u_color;
    vec3 color2 = vec3(0.0, 0.7, 0.8);
    vec3 color3 = vec3(1.0, 0.4, 0.8);
    
    vec3 finalColor = mix(
      mix(color1, color2, m),
      color3,
      sin(m * 10.0 + u_time) * 0.2 + 0.2
    );
    
    gl_FragColor = vec4(finalColor, 1.0 - m * 0.3);
  }
`

const mandelbrotVertexShader = `
  varying vec2 vUv;
  
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

export const MandalaScene: React.FC<MandalaSceneProps> = ({ 
  zoomLevel, 
  selectedApp,
  onAppClick 
}) => {
  const mandalaRef = useRef<Mesh>(null)
  const fractalRef = useRef<Mesh>(null)
  const [fractalCenter, setFractalCenter] = useState(new Vector3(0, 0, 0))
  const [hoveredApp, setHoveredApp] = useState<string | null>(null)
  const { camera, mouse } = useThree()
  
  // Generate mandala app nodes using sacred geometry
  const appNodes = useMemo((): AppNode[] => {
    const nodes: AppNode[] = []
    const apps = [
      { id: 'docs', label: 'Docs', color: new Color('#4caf50') },
      { id: 'connect', label: 'Connect', color: new Color('#2196f3') },
      { id: 'pay', label: 'Pay', color: new Color('#ff9800') },
      { id: 'mind', label: 'Mind', color: new Color('#9c27b0') },
      { id: 'marketplace', label: 'Market', color: new Color('#e91e63') },
      { id: 'rewards', label: 'Rewards', color: new Color('#ffc107') },
    ]
    
    // Primary ring - Golden ratio based positioning
    const goldenRatio = 1.618
    const primaryRadius = 2.5 * goldenRatio
    
    apps.forEach(({ id, label, color }, index) => {
      const angle = (index / apps.length) * Math.PI * 2
      const radius = primaryRadius + Math.sin(angle * 3) * 0.3 // Sacred geometry variation
      
      // Fibonacci spiral positioning for fractal depth
      const fibonacciAngle = angle * goldenRatio
      const spiralRadius = radius * Math.pow(goldenRatio, -index * 0.1)
      
      const x = Math.cos(fibonacciAngle) * spiralRadius
      const y = Math.sin(fibonacciAngle) * spiralRadius
      const z = Math.sin(angle * 2) * 0.5 // Depth variation
      
      nodes.push({
        id,
        label,
        position: new Vector3(x, y, z),
        angle: fibonacciAngle,
        radius: spiralRadius,
        color,
        fractalDepth: index
      })
    })
    
    // Secondary ring - smaller fractal apps
    const secondaryRadius = primaryRadius * 0.6
    const secondaryApps = ['maps', 'settings', 'help', 'games']
    
    secondaryApps.forEach((id, index) => {
      const angle = (index / secondaryApps.length) * Math.PI * 2 + Math.PI / 4
      const x = Math.cos(angle) * secondaryRadius
      const y = Math.sin(angle) * secondaryRadius
      const z = -0.3
      
      nodes.push({
        id,
        label: id.charAt(0).toUpperCase() + id.slice(1),
        position: new Vector3(x, y, z),
        angle,
        radius: secondaryRadius,
        color: new Color().setHSL((index * 0.25) % 1, 0.7, 0.6),
        fractalDepth: apps.length + index
      })
    })
    
    return nodes
  }, [])

  // Fractal shader material
  const fractalMaterial = useMemo(() => {
    return new ShaderMaterial({
      vertexShader: mandelbrotVertexShader,
      fragmentShader: mandelbrotFragmentShader,
      uniforms: {
        u_time: { value: 0 },
        u_zoom: { value: 1 },
        u_center: { value: [0, 0] },
        u_color: { value: [0, 0.7, 0.8] }
      },
      transparent: true
    })
  }, [])

  // Mouse interaction handler
  const handlePointerMove = useCallback((event: any) => {
    const point = event.point
    setFractalCenter(point)
    
    // Find nearest app node
    let nearestApp: AppNode | null = null
    let minDistance = Infinity
    
    appNodes.forEach(node => {
      const distance = point.distanceTo(node.position)
      if (distance < minDistance && distance < 0.8) {
        minDistance = distance
        nearestApp = node
      }
    })
    
    setHoveredApp(nearestApp?.id || null)
  }, [appNodes])

  const handleClick = useCallback((event: any) => {
    const point = event.point
    
    // Find clicked app
    appNodes.forEach(node => {
      const distance = point.distanceTo(node.position)
      if (distance < 0.5 && onAppClick) {
        onAppClick(node.id)
      }
    })
  }, [appNodes, onAppClick])

  // Animation loop
  useFrame((state) => {
    if (mandalaRef.current) {
      // Sacred geometry rotation - based on phi (golden ratio)
      const phi = 1.618
      mandalaRef.current.rotation.z = state.clock.elapsedTime * 0.1 * phi
      mandalaRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.05) * 0.1
    }
    
    if (fractalRef.current && fractalMaterial) {
      // Update fractal shader uniforms
      fractalMaterial.uniforms.u_time.value = state.clock.elapsedTime
      fractalMaterial.uniforms.u_zoom.value = zoomLevel * 0.5
      fractalMaterial.uniforms.u_center.value = [
        fractalCenter.x * 0.001,
        fractalCenter.y * 0.001
      ]
    }
  })

  return (
    <group scale={zoomLevel}>
      {/* Fractal background */}
      <mesh 
        ref={fractalRef}
        position={[0, 0, -5]}
        onPointerMove={handlePointerMove}
        onClick={handleClick}
      >
        <planeGeometry args={[20, 20, 128, 128]} />
        <primitive object={fractalMaterial} />
      </mesh>

      {/* Central mandala core */}
      <group ref={mandalaRef}>
        {/* Core torus */}
        <mesh position={[0, 0, 0]}>
          <torusGeometry args={[0.5, 0.1, 16, 32]} />
          <meshStandardMaterial 
            color="#00bcd4" 
            emissive="#004d5a" 
            emissiveIntensity={0.3}
            roughness={0.3}
            metalness={0.7}
          />
        </mesh>
        
        {/* Geometric patterns */}
        {[0, 1, 2].map(ring => (
          <group key={ring} rotation={[0, 0, ring * Math.PI / 3]}>
            {Array.from({ length: 6 }, (_, i) => {
              const angle = (i / 6) * Math.PI * 2
              const radius = 1 + ring * 0.5
              const x = Math.cos(angle) * radius
              const y = Math.sin(angle) * radius
              
              return (
                <mesh key={i} position={[x, y, 0]}>
                  <sphereGeometry args={[0.05, 8, 8]} />
                  <meshStandardMaterial 
                    color="#00bcd4"
                    emissive="#00bcd4"
                    emissiveIntensity={0.2}
                  />
                </mesh>
              )
            })}
          </group>
        ))}
      </group>

      {/* App nodes */}
      {appNodes.map((node) => {
        const isSelected = selectedApp === node.id
        const isHovered = hoveredApp === node.id
        const scale = isSelected ? 1.3 : isHovered ? 1.1 : 1
        
        return (
          <group key={node.id} position={node.position}>
            {/* App sphere with fractal surface */}
            <mesh scale={scale}>
              <sphereGeometry args={[0.3, 32, 32]} />
              <meshStandardMaterial 
                color={node.color}
                emissive={node.color}
                emissiveIntensity={isSelected ? 0.6 : isHovered ? 0.4 : 0.2}
                roughness={0.2}
                metalness={0.8}
                transparent={true}
                opacity={0.9}
              />
            </mesh>
            
            {/* Orbital ring */}
            <mesh rotation={[Math.PI / 2, 0, node.angle]}>
              <torusGeometry args={[0.4, 0.02, 8, 16]} />
              <meshStandardMaterial 
                color={node.color}
                transparent={true}
                opacity={isSelected ? 0.8 : 0.3}
              />
            </mesh>
            
            {/* App label */}
            <Text
              position={[0, -0.8, 0]}
              fontSize={0.25}
              color={isSelected ? node.color : "white"}
              anchorX="center"
              anchorY="middle"
              font="/fonts/Inter-Bold.woff"
            >
              {node.label}
            </Text>
            
            {/* Fractal connections */}
            {isSelected && (
              <group>
                {appNodes.filter(n => n.id !== node.id).map(otherNode => (
                  <line key={`${node.id}-${otherNode.id}`}>
                    <bufferGeometry>
                      <bufferAttribute
                        attach="attributes-position"
                        count={2}
                        array={new Float32Array([
                          0, 0, 0,
                          otherNode.position.x - node.position.x,
                          otherNode.position.y - node.position.y,
                          otherNode.position.z - node.position.z
                        ])}
                        itemSize={3}
                      />
                    </bufferGeometry>
                    <lineBasicMaterial 
                      color={node.color} 
                      transparent={true} 
                      opacity={0.3}
                    />
                  </line>
                ))}
              </group>
            )}
          </group>
        )
      })}
      
      {/* Ambient particles */}
      {Array.from({ length: 50 }, (_, i) => {
        const radius = 8 + Math.random() * 4
        const angle = (i / 50) * Math.PI * 2 * 3 // Multiple orbits
        const height = (Math.random() - 0.5) * 6
        
        return (
          <mesh 
            key={i} 
            position={[
              Math.cos(angle) * radius,
              Math.sin(angle) * radius,
              height
            ]}
          >
            <sphereGeometry args={[0.02, 4, 4]} />
            <meshBasicMaterial 
              color="#00bcd4"
              transparent={true}
              opacity={0.6}
            />
          </mesh>
        )
      })}
    </group>
  )
}