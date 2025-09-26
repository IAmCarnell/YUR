import React, { useRef, useMemo, useState, useCallback, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Mesh, Vector3, Color, ShaderMaterial, Raycaster, Vector2 } from 'three'
import { Text } from '@react-three/drei'

interface MandalaSceneProps {
  zoomLevel: number
  selectedApp: string | null
  onAppClick?: (appId: string) => void
  isMobile?: boolean
  touchPosition?: { x: number; y: number } | null
  gestureState?: {
    isPinching: boolean
    isRotating: boolean
    isPanning: boolean
    scale: number
    rotation: number
  }
}

interface AppNode {
  id: string
  label: string
  position: Vector3
  angle: number
  radius: number
  color: Color
  fractalDepth: number
  touchRadius?: number // Enhanced touch target for mobile
}

interface TouchInteraction {
  startTime: number
  position: Vector2
  type: 'tap' | 'long-press' | 'swipe'
  target?: AppNode
}

// Enhanced mandelbrot shader with mobile optimizations
const mandelbrotFragmentShader = `
  #ifdef GL_ES
  precision mediump float;
  #endif
  
  uniform float u_time;
  uniform float u_zoom;
  uniform vec2 u_center;
  uniform vec3 u_color;
  uniform float u_complexity; // Reduced complexity for mobile
  
  varying vec2 vUv;
  
  vec2 complexMul(vec2 a, vec2 b) {
    return vec2(a.x * b.x - a.y * b.y, a.x * b.y + a.y * b.x);
  }
  
  float mandelbrot(vec2 c) {
    vec2 z = vec2(0.0);
    float iterations = 0.0;
    float maxIterations = u_complexity;
    
    for(float i = 0.0; i < 100.0; i++) {
      if(i >= maxIterations) break;
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
    
    // Optimized color mixing for mobile
    vec3 color1 = u_color;
    vec3 color2 = vec3(0.0, 0.7, 0.8);
    vec3 color3 = vec3(1.0, 0.4, 0.8);
    
    vec3 finalColor = mix(
      mix(color1, color2, m),
      color3,
      sin(m * 5.0 + u_time * 0.5) * 0.1 + 0.1
    );
    
    gl_FragColor = vec4(finalColor, 1.0 - m * 0.2);
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
  onAppClick,
  isMobile = false,
  touchPosition = null,
  gestureState = {
    isPinching: false,
    isRotating: false,
    isPanning: false,
    scale: 1,
    rotation: 0,
  }
}) => {
  const mandalaRef = useRef<Mesh>(null)
  const fractalRef = useRef<Mesh>(null)
  const [fractalCenter, setFractalCenter] = useState(new Vector3(0, 0, 0))
  const [hoveredApp, setHoveredApp] = useState<string | null>(null)
  const [touchInteraction, setTouchInteraction] = useState<TouchInteraction | null>(null)
  const [mobileOptimizations, setMobileOptimizations] = useState({
    reducedParticles: isMobile,
    simplifiedShaders: isMobile,
    enhancedTouchTargets: isMobile,
  })
  
  const { camera, mouse, raycaster, scene } = useThree()
  
  // Mobile performance monitoring
  const performanceMonitor = useRef({
    frameCount: 0,
    lastFpsCheck: Date.now(),
    currentFps: 60,
    adaptiveQuality: 1.0,
  })

  // Detect mobile device capabilities
  useEffect(() => {
    const checkDeviceCapabilities = () => {
      const canvas = document.createElement('canvas')
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
      
      if (gl) {
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info')
        const renderer = debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : 'unknown'
        
        // Adjust optimizations based on device capabilities
        const isLowEndDevice = renderer.toLowerCase().includes('adreno') || 
                              renderer.toLowerCase().includes('mali') ||
                              renderer.toLowerCase().includes('powervr')
        
        setMobileOptimizations(prev => ({
          ...prev,
          reducedParticles: isMobile || isLowEndDevice,
          simplifiedShaders: isMobile || isLowEndDevice,
          enhancedTouchTargets: isMobile,
        }))
      }
    }

    checkDeviceCapabilities()
  }, [isMobile])

  // Enhanced app nodes with mobile touch targets
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
    
    // Adjust positioning for mobile - larger spacing for touch
    const goldenRatio = 1.618
    const primaryRadius = (isMobile ? 3.0 : 2.5) * goldenRatio
    const touchRadiusMultiplier = isMobile ? 1.5 : 1.0
    
    apps.forEach(({ id, label, color }, index) => {
      const angle = (index / apps.length) * Math.PI * 2
      const radius = primaryRadius + Math.sin(angle * 3) * 0.3
      
      const fibonacciAngle = angle * goldenRatio
      const spiralRadius = radius * Math.pow(goldenRatio, -index * 0.1)
      
      const x = Math.cos(fibonacciAngle) * spiralRadius
      const y = Math.sin(fibonacciAngle) * spiralRadius
      const z = Math.sin(angle * 2) * 0.5
      
      nodes.push({
        id,
        label,
        position: new Vector3(x, y, z),
        angle: fibonacciAngle,
        radius: spiralRadius,
        color,
        fractalDepth: index,
        touchRadius: 0.5 * touchRadiusMultiplier, // Larger touch targets on mobile
      })
    })
    
    // Secondary ring with mobile-friendly spacing
    const secondaryRadius = primaryRadius * (isMobile ? 0.7 : 0.6)
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
        fractalDepth: apps.length + index,
        touchRadius: 0.4 * touchRadiusMultiplier,
      })
    })
    
    return nodes
  }, [isMobile])

  // Mobile-optimized fractal shader material
  const fractalMaterial = useMemo(() => {
    const complexity = mobileOptimizations.simplifiedShaders ? 50 : 100
    
    return new ShaderMaterial({
      vertexShader: mandelbrotVertexShader,
      fragmentShader: mandelbrotFragmentShader,
      uniforms: {
        u_time: { value: 0 },
        u_zoom: { value: 1 },
        u_center: { value: [0, 0] },
        u_color: { value: [0, 0.7, 0.8] },
        u_complexity: { value: complexity },
      },
      transparent: true
    })
  }, [mobileOptimizations.simplifiedShaders])

  // Enhanced touch/mouse interaction with gesture support
  const handlePointerInteraction = useCallback((event: any, interactionType: 'move' | 'down' | 'up') => {
    const point = event.point || new Vector3()
    
    if (interactionType === 'move') {
      setFractalCenter(point)
      
      // Find nearest app node with enhanced touch radius for mobile
      let nearestApp: AppNode | null = null
      let minDistance = Infinity
      
      appNodes.forEach(node => {
        const distance = point.distanceTo(node.position)
        const touchThreshold = node.touchRadius || (isMobile ? 0.8 : 0.5)
        
        if (distance < minDistance && distance < touchThreshold) {
          minDistance = distance
          nearestApp = node
        }
      })
      
      setHoveredApp(nearestApp?.id || null)
      
      // Mobile haptic feedback simulation (would be implemented via native bridge)
      if (isMobile && nearestApp && hoveredApp !== nearestApp.id) {
        // Trigger haptic feedback
        console.log('Haptic feedback:', nearestApp.id)
      }
    }
    
    if (interactionType === 'down') {
      // Start touch interaction tracking
      setTouchInteraction({
        startTime: Date.now(),
        position: new Vector2(event.clientX || 0, event.clientY || 0),
        type: 'tap',
        target: appNodes.find(node => 
          point.distanceTo(node.position) < (node.touchRadius || 0.5)
        ),
      })
    }
    
    if (interactionType === 'up' && touchInteraction) {
      const duration = Date.now() - touchInteraction.startTime
      const isLongPress = duration > 500 // 500ms threshold for long press
      
      // Handle different touch gestures
      if (isLongPress && touchInteraction.target) {
        // Long press - could show context menu or additional options
        console.log('Long press detected:', touchInteraction.target.id)
        // onLongPress?.(touchInteraction.target.id)
      } else if (touchInteraction.target && onAppClick) {
        // Regular tap
        onAppClick(touchInteraction.target.id)
      }
      
      setTouchInteraction(null)
    }
  }, [appNodes, onAppClick, isMobile, hoveredApp, touchInteraction])

  // Handle gesture state changes (from mobile gesture handlers)
  useEffect(() => {
    if (gestureState.isPinching || gestureState.isRotating || gestureState.isPanning) {
      // Update scene based on gesture state
      if (mandalaRef.current) {
        if (gestureState.isPinching) {
          // Handle pinch-to-zoom
          const baseScale = zoomLevel * gestureState.scale
          mandalaRef.current.scale.setScalar(baseScale)
        }
        
        if (gestureState.isRotating) {
          // Handle rotation gesture
          mandalaRef.current.rotation.z += gestureState.rotation * 0.01
        }
      }
    }
  }, [gestureState, zoomLevel])

  // Performance monitoring and adaptive quality
  useFrame((state) => {
    // FPS monitoring for mobile optimization
    performanceMonitor.current.frameCount++
    const now = Date.now()
    
    if (now - performanceMonitor.current.lastFpsCheck > 1000) {
      const fps = performanceMonitor.current.frameCount
      performanceMonitor.current.currentFps = fps
      performanceMonitor.current.frameCount = 0
      performanceMonitor.current.lastFpsCheck = now
      
      // Adaptive quality based on performance
      if (isMobile && fps < 30) {
        performanceMonitor.current.adaptiveQuality = Math.max(0.5, performanceMonitor.current.adaptiveQuality - 0.1)
      } else if (fps > 55) {
        performanceMonitor.current.adaptiveQuality = Math.min(1.0, performanceMonitor.current.adaptiveQuality + 0.05)
      }
    }
    
    // Mandala rotation with mobile-optimized animation
    if (mandalaRef.current) {
      const phi = 1.618
      const rotationSpeed = isMobile ? 0.05 : 0.1 // Slower on mobile to save battery
      mandalaRef.current.rotation.z = state.clock.elapsedTime * rotationSpeed * phi
      mandalaRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.05) * 0.1
    }
    
    // Fractal shader updates
    if (fractalRef.current && fractalMaterial) {
      fractalMaterial.uniforms.u_time.value = state.clock.elapsedTime * (isMobile ? 0.5 : 1.0)
      fractalMaterial.uniforms.u_zoom.value = zoomLevel * 0.5 * performanceMonitor.current.adaptiveQuality
      fractalMaterial.uniforms.u_center.value = [
        fractalCenter.x * 0.001,
        fractalCenter.y * 0.001
      ]
    }
  })

  return (
    <group scale={zoomLevel * (gestureState.isPinching ? gestureState.scale : 1)}>
      {/* Mobile-optimized fractal background */}
      <mesh 
        ref={fractalRef}
        position={[0, 0, -5]}
        onPointerMove={(e) => handlePointerInteraction(e, 'move')}
        onPointerDown={(e) => handlePointerInteraction(e, 'down')}
        onPointerUp={(e) => handlePointerInteraction(e, 'up')}
        onClick={(e) => handlePointerInteraction(e, 'up')}
      >
        <planeGeometry args={[20, 20, isMobile ? 64 : 128, isMobile ? 64 : 128]} />
        <primitive object={fractalMaterial} />
      </mesh>

      {/* Central mandala core with mobile optimizations */}
      <group ref={mandalaRef}>
        {/* Core torus - simplified on mobile */}
        <mesh position={[0, 0, 0]}>
          <torusGeometry args={[0.5, 0.1, isMobile ? 12 : 16, isMobile ? 24 : 32]} />
          <meshStandardMaterial 
            color="#00bcd4" 
            emissive="#004d5a" 
            emissiveIntensity={0.3}
            roughness={0.3}
            metalness={0.7}
          />
        </mesh>
        
        {/* Geometric patterns - reduced complexity on mobile */}
        {[0, 1, isMobile ? null : 2].filter(Boolean).map(ring => (
          <group key={ring} rotation={[0, 0, ring! * Math.PI / 3]}>
            {Array.from({ length: isMobile ? 4 : 6 }, (_, i) => {
              const angle = (i / (isMobile ? 4 : 6)) * Math.PI * 2
              const radius = 1 + ring! * 0.5
              const x = Math.cos(angle) * radius
              const y = Math.sin(angle) * radius
              
              return (
                <mesh key={i} position={[x, y, 0]}>
                  <sphereGeometry args={[0.05, 6, 6]} />
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

      {/* App nodes with enhanced mobile touch targets */}
      {appNodes.map((node) => {
        const isSelected = selectedApp === node.id
        const isHovered = hoveredApp === node.id
        const scale = isSelected ? (isMobile ? 1.4 : 1.3) : isHovered ? (isMobile ? 1.2 : 1.1) : 1
        const sphereRadius = isMobile ? 0.35 : 0.3 // Larger on mobile
        
        return (
          <group key={node.id} position={node.position}>
            {/* Enhanced app sphere for mobile */}
            <mesh scale={scale}>
              <sphereGeometry args={[sphereRadius, isMobile ? 16 : 32, isMobile ? 16 : 32]} />
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
            
            {/* Mobile-friendly touch indicator */}
            {isMobile && isHovered && (
              <mesh>
                <ringGeometry args={[node.touchRadius! - 0.1, node.touchRadius!, 16]} />
                <meshBasicMaterial 
                  color={node.color}
                  transparent={true}
                  opacity={0.3}
                  side={2} // DoubleSide
                />
              </mesh>
            )}
            
            {/* Orbital ring - simplified on mobile */}
            <mesh rotation={[Math.PI / 2, 0, node.angle]}>
              <torusGeometry args={[0.4, 0.02, isMobile ? 6 : 8, isMobile ? 12 : 16]} />
              <meshStandardMaterial 
                color={node.color}
                transparent={true}
                opacity={isSelected ? 0.8 : 0.3}
              />
            </mesh>
            
            {/* App label with mobile-optimized sizing */}
            <Text
              position={[0, isMobile ? -0.9 : -0.8, 0]}
              fontSize={isMobile ? 0.3 : 0.25}
              color={isSelected ? node.color : "white"}
              anchorX="center"
              anchorY="middle"
              font="/fonts/Inter-Bold.woff"
              maxWidth={isMobile ? 2.0 : 1.5}
            >
              {node.label}
            </Text>
            
            {/* Fractal connections - reduced on mobile */}
            {isSelected && !isMobile && (
              <group>
                {appNodes.filter(n => n.id !== node.id).slice(0, 3).map(otherNode => (
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
      
      {/* Ambient particles - reduced count on mobile */}
      {Array.from({ length: mobileOptimizations.reducedParticles ? 20 : 50 }, (_, i) => {
        const radius = 8 + Math.random() * 4
        const angle = (i / (mobileOptimizations.reducedParticles ? 20 : 50)) * Math.PI * 2 * 3
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
      
      {/* Mobile-specific gesture indicators */}
      {isMobile && touchInteraction && (
        <mesh position={[touchInteraction.position.x * 0.01, touchInteraction.position.y * 0.01, 1]}>
          <ringGeometry args={[0.1, 0.15, 16]} />
          <meshBasicMaterial 
            color="#ffffff"
            transparent={true}
            opacity={0.8}
          />
        </mesh>
      )}
      
      {/* Performance indicator for mobile debugging */}
      {isMobile && process.env.NODE_ENV === 'development' && (
        <Text
          position={[-8, 5, 0]}
          fontSize={0.2}
          color="white"
          anchorX="left"
          anchorY="top"
        >
          {`FPS: ${performanceMonitor.current.currentFps} | Quality: ${(performanceMonitor.current.adaptiveQuality * 100).toFixed(0)}%`}
        </Text>
      )}
    </group>
  )
}