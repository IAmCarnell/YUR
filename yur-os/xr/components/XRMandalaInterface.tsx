/**
 * XR-Enhanced Mandala Interface for YUR OS
 * 3D spatial interface optimized for VR/AR interactions
 */

import React, { useRef, useEffect, useMemo, useState, useCallback } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { 
  Group, 
  Vector3, 
  Quaternion, 
  Raycaster, 
  Mesh,
  SphereGeometry,
  MeshStandardMaterial,
  Color,
  BufferGeometry,
  LineBasicMaterial,
  Line,
  BufferAttribute
} from 'three';
import { Text } from '@react-three/drei';
import { HandTrackingRenderer } from '../hand-tracking/HandTrackingRenderer';

interface XRMandalaInterfaceProps {
  isXRActive: boolean;
  xrMode: 'vr' | 'ar' | null;
  handTrackingData?: any;
  controllerData?: any[];
  onAppSelect?: (appId: string, interaction: 'gaze' | 'controller' | 'hand') => void;
  onGestureAction?: (gesture: string, hand: 'left' | 'right') => void;
  spatialApps?: SpatialApp[];
}

interface SpatialApp {
  id: string;
  name: string;
  position: Vector3;
  icon: string;
  color: Color;
  isActive: boolean;
  is3D: boolean;
  boundingBox?: { width: number; height: number; depth: number };
}

interface XRInteractionState {
  gazeTarget: string | null;
  controllerTarget: { [controllerId: string]: string | null };
  handGestures: { [hand: string]: string | null };
  activeInteraction: {
    type: 'gaze' | 'controller' | 'hand';
    target: string;
    startTime: number;
  } | null;
}

interface SpatialUIElement {
  id: string;
  type: 'panel' | 'button' | 'app' | 'menu';
  position: Vector3;
  rotation: Quaternion;
  scale: Vector3;
  content: any;
  interactive: boolean;
  visible: boolean;
}

export const XRMandalaInterface: React.FC<XRMandalaInterfaceProps> = ({
  isXRActive,
  xrMode,
  handTrackingData,
  controllerData = [],
  onAppSelect,
  onGestureAction,
  spatialApps = [],
}) => {
  const groupRef = useRef<Group>(null);
  const mandalaRef = useRef<Group>(null);
  const [interactionState, setInteractionState] = useState<XRInteractionState>({
    gazeTarget: null,
    controllerTarget: {},
    handGestures: {},
    activeInteraction: null,
  });

  const [spatialUI, setSpatialUI] = useState<SpatialUIElement[]>([]);
  const [gazeDwellTime, setGazeDwellTime] = useState<{ [appId: string]: number }>({});
  
  const { camera, raycaster, scene } = useThree();

  // Generate spatial app layout in 3D space
  const spatialAppLayout = useMemo(() => {
    const apps: SpatialApp[] = [];
    const baseApps = [
      { id: 'docs', name: 'Documents', icon: '📄', color: new Color('#4caf50') },
      { id: 'connect', name: 'Connect', icon: '🌐', color: new Color('#2196f3') },
      { id: 'pay', name: 'Payments', icon: '💳', color: new Color('#ff9800') },
      { id: 'mind', name: 'Mind Map', icon: '🧠', color: new Color('#9c27b0') },
      { id: 'marketplace', name: 'Market', icon: '🛒', color: new Color('#e91e63') },
      { id: 'rewards', name: 'Rewards', icon: '🏆', color: new Color('#ffc107') },
    ];

    if (isXRActive && xrMode === 'vr') {
      // VR layout - full 360° spherical arrangement
      const radius = 2.5;
      const levels = 3;
      
      baseApps.forEach((app, index) => {
        const level = Math.floor(index / 2);
        const angleOffset = (index % 2) * Math.PI;
        const phi = (level / levels) * Math.PI; // Vertical angle
        const theta = (index / baseApps.length) * 2 * Math.PI + angleOffset; // Horizontal angle
        
        const x = radius * Math.sin(phi) * Math.cos(theta);
        const y = radius * Math.cos(phi) - 1; // Offset down from eye level
        const z = radius * Math.sin(phi) * Math.sin(theta);
        
        apps.push({
          ...app,
          position: new Vector3(x, y, z),
          isActive: false,
          is3D: true,
          boundingBox: { width: 0.5, height: 0.5, depth: 0.2 },
        });
      });
    } else if (isXRActive && xrMode === 'ar') {
      // AR layout - planar arrangement in front of user
      const gridSize = Math.ceil(Math.sqrt(baseApps.length));
      const spacing = 0.8;
      const startX = -(gridSize - 1) * spacing / 2;
      const startY = 0.5;
      const depth = -2; // 2m in front of user
      
      baseApps.forEach((app, index) => {
        const row = Math.floor(index / gridSize);
        const col = index % gridSize;
        
        const x = startX + col * spacing;
        const y = startY - row * spacing;
        const z = depth;
        
        apps.push({
          ...app,
          position: new Vector3(x, y, z),
          isActive: false,
          is3D: false,
          boundingBox: { width: 0.4, height: 0.4, depth: 0.1 },
        });
      });
    } else {
      // Fallback 2D-style layout for non-XR or inline mode
      const radius = 2;
      baseApps.forEach((app, index) => {
        const angle = (index / baseApps.length) * 2 * Math.PI;
        const x = Math.cos(angle) * radius;
        const y = 0;
        const z = Math.sin(angle) * radius;
        
        apps.push({
          ...app,
          position: new Vector3(x, y, z),
          isActive: false,
          is3D: false,
          boundingBox: { width: 0.3, height: 0.3, depth: 0.1 },
        });
      });
    }

    return apps;
  }, [isXRActive, xrMode]);

  // Gaze-based interaction handling
  const handleGazeInteraction = useCallback(() => {
    if (!isXRActive) return;

    // Cast ray from camera forward
    raycaster.setFromCamera({ x: 0, y: 0 }, camera);
    
    let closestApp: SpatialApp | null = null;
    let minDistance = Infinity;

    // Check intersection with apps
    spatialAppLayout.forEach(app => {
      const distance = camera.position.distanceTo(app.position);
      const angle = raycaster.ray.direction.angleTo(
        app.position.clone().sub(camera.position).normalize()
      );
      
      // If within gaze cone (10 degrees)
      if (angle < 0.175 && distance < minDistance) {
        minDistance = distance;
        closestApp = app;
      }
    });

    const targetId = closestApp?.id || null;
    
    // Update gaze dwell time
    setGazeDwellTime(prev => {
      const updated = { ...prev };
      
      // Reset all other dwell times
      Object.keys(updated).forEach(id => {
        if (id !== targetId) {
          updated[id] = 0;
        }
      });
      
      // Increment target dwell time
      if (targetId) {
        updated[targetId] = (updated[targetId] || 0) + 16; // Assume 60fps
        
        // Trigger selection after 1 second dwell
        if (updated[targetId] >= 1000 && onAppSelect) {
          onAppSelect(targetId, 'gaze');
          updated[targetId] = 0;
        }
      }
      
      return updated;
    });

    setInteractionState(prev => ({
      ...prev,
      gazeTarget: targetId,
    }));
  }, [isXRActive, camera, raycaster, spatialAppLayout, onAppSelect]);

  // Controller interaction handling
  const handleControllerInteraction = useCallback(() => {
    if (!isXRActive || !controllerData) return;

    const newControllerTargets: { [controllerId: string]: string | null } = {};

    controllerData.forEach(controller => {
      if (!controller.position) return;

      // Create raycaster from controller position and orientation
      const controllerRaycaster = new Raycaster();
      const origin = new Vector3(
        controller.position.x,
        controller.position.y,
        controller.position.z
      );
      const direction = new Vector3(0, 0, -1); // Forward direction
      
      if (controller.orientation) {
        direction.applyQuaternion(new Quaternion(
          controller.orientation.x,
          controller.orientation.y,
          controller.orientation.z,
          controller.orientation.w
        ));
      }

      controllerRaycaster.set(origin, direction);

      // Find intersected apps
      let closestApp: SpatialApp | null = null;
      let minDistance = Infinity;

      spatialAppLayout.forEach(app => {
        const distance = origin.distanceTo(app.position);
        const angle = direction.angleTo(
          app.position.clone().sub(origin).normalize()
        );
        
        // If within controller ray cone (5 degrees)
        if (angle < 0.087 && distance < minDistance && distance < 5) {
          minDistance = distance;
          closestApp = app;
        }
      });

      newControllerTargets[controller.id] = closestApp?.id || null;

      // Handle controller button press
      if (controller.buttons && controller.buttons[0]?.pressed && closestApp && onAppSelect) {
        onAppSelect(closestApp.id, 'controller');
      }
    });

    setInteractionState(prev => ({
      ...prev,
      controllerTarget: newControllerTargets,
    }));
  }, [isXRActive, controllerData, spatialAppLayout, onAppSelect]);

  // Hand gesture interaction handling
  const handleHandGestureInteraction = useCallback((hand: 'left' | 'right', gesture: string, confidence: number) => {
    if (!isXRActive || confidence < 0.8) return;

    setInteractionState(prev => ({
      ...prev,
      handGestures: {
        ...prev.handGestures,
        [hand]: gesture,
      },
    }));

    // Handle specific gestures
    switch (gesture) {
      case 'pointing':
        // Find app in pointing direction
        const handData = hand === 'left' ? handTrackingData?.left : handTrackingData?.right;
        if (handData && handData.joints['index-finger-tip']) {
          const fingerTip = handData.joints['index-finger-tip'];
          const wrist = handData.joints['wrist'];
          
          if (fingerTip && wrist) {
            const pointingDirection = new Vector3()
              .subVectors(fingerTip.position, wrist.position)
              .normalize();
            
            // Find app in pointing direction
            let pointedApp: SpatialApp | null = null;
            let minAngle = Infinity;
            
            spatialAppLayout.forEach(app => {
              const toApp = app.position.clone().sub(wrist.position).normalize();
              const angle = pointingDirection.angleTo(toApp);
              
              if (angle < 0.3 && angle < minAngle) { // 17 degrees
                minAngle = angle;
                pointedApp = app;
              }
            });
            
            if (pointedApp && onAppSelect) {
              onAppSelect(pointedApp.id, 'hand');
            }
          }
        }
        break;
        
      case 'pinch':
        // Handle pinch gesture for selection
        if (onGestureAction) {
          onGestureAction('select', hand);
        }
        break;
        
      case 'palm':
        // Handle palm gesture for menu
        if (onGestureAction) {
          onGestureAction('menu', hand);
        }
        break;
    }
  }, [isXRActive, handTrackingData, spatialAppLayout, onAppSelect, onGestureAction]);

  // Animation frame update
  useFrame((state, delta) => {
    if (!isXRActive) return;

    // Update gaze interaction
    handleGazeInteraction();
    
    // Update controller interaction
    handleControllerInteraction();
    
    // Animate mandala rotation in XR
    if (mandalaRef.current) {
      if (xrMode === 'vr') {
        // Slower rotation in VR to prevent motion sickness
        mandalaRef.current.rotation.y += delta * 0.1;
      } else if (xrMode === 'ar') {
        // Subtle animation in AR
        mandalaRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.2) * 0.1;
      }
    }
  });

  // Render spatial app
  const renderSpatialApp = (app: SpatialApp, index: number) => {
    const isGazeTarget = interactionState.gazeTarget === app.id;
    const isControllerTarget = Object.values(interactionState.controllerTarget).includes(app.id);
    const dwellProgress = (gazeDwellTime[app.id] || 0) / 1000; // Progress from 0 to 1
    
    const scale = isGazeTarget || isControllerTarget ? 1.2 : 1.0;
    const emissiveIntensity = isGazeTarget ? 0.3 + dwellProgress * 0.3 : 0.1;

    return (
      <group key={app.id} position={app.position}>
        {/* App sphere */}
        <mesh scale={scale}>
          <sphereGeometry args={[0.2, 32, 32]} />
          <meshStandardMaterial
            color={app.color}
            emissive={app.color}
            emissiveIntensity={emissiveIntensity}
            roughness={0.3}
            metalness={0.7}
          />
        </mesh>
        
        {/* App icon/label */}
        <Text
          position={[0, -0.4, 0]}
          fontSize={0.15}
          color="white"
          anchorX="center"
          anchorY="middle"
          // Ensure text faces camera in VR
          rotation={xrMode === 'vr' ? undefined : [0, 0, 0]}
        >
          {app.name}
        </Text>
        
        {/* Gaze dwell progress indicator */}
        {isGazeTarget && dwellProgress > 0 && (
          <mesh position={[0, 0, 0.25]}>
            <ringGeometry args={[0.25, 0.3, 32, 1, 0, dwellProgress * Math.PI * 2]} />
            <meshBasicMaterial
              color="#00ff00"
              transparent
              opacity={0.8}
              side={2} // DoubleSide
            />
          </mesh>
        )}
        
        {/* Controller ray indicator */}
        {isControllerTarget && (
          <mesh position={[0, 0, 0.3]}>
            <sphereGeometry args={[0.05, 8, 8]} />
            <meshBasicMaterial
              color="#ff0000"
              emissive="#ff0000"
              emissiveIntensity={0.5}
            />
          </mesh>
        )}
        
        {/* Bounding box for AR debugging */}
        {xrMode === 'ar' && process.env.NODE_ENV === 'development' && app.boundingBox && (
          <mesh>
            <boxGeometry args={[app.boundingBox.width, app.boundingBox.height, app.boundingBox.depth]} />
            <meshBasicMaterial
              color="#00ff00"
              wireframe
              transparent
              opacity={0.3}
            />
          </mesh>
        )}
      </group>
    );
  };

  return (
    <group ref={groupRef}>
      {/* Main mandala interface */}
      <group ref={mandalaRef}>
        {/* Central hub */}
        <mesh position={[0, 0, 0]}>
          <sphereGeometry args={[0.1, 16, 16]} />
          <meshStandardMaterial
            color="#00bcd4"
            emissive="#00bcd4"
            emissiveIntensity={0.2}
            metalness={0.8}
            roughness={0.2}
          />
        </mesh>
        
        {/* Spatial apps */}
        {spatialAppLayout.map((app, index) => renderSpatialApp(app, index))}
        
        {/* Connection lines in VR mode */}
        {xrMode === 'vr' && spatialAppLayout.map(app => (
          <line key={`connection-${app.id}`}>
            <bufferGeometry>
              <bufferAttribute
                attach="attributes-position"
                count={2}
                array={new Float32Array([
                  0, 0, 0,
                  app.position.x * 0.3, app.position.y * 0.3, app.position.z * 0.3
                ])}
                itemSize={3}
              />
            </bufferGeometry>
            <lineBasicMaterial
              color="#00bcd4"
              transparent
              opacity={0.3}
            />
          </line>
        ))}
      </group>
      
      {/* Hand tracking visualization */}
      {handTrackingData && (
        <HandTrackingRenderer
          handTrackingData={handTrackingData}
          showJoints={true}
          showBones={true}
          showGestures={true}
          onGestureDetected={handleHandGestureInteraction}
        />
      )}
      
      {/* Controller visualization */}
      {controllerData.map(controller => (
        <group key={`controller-${controller.id}`}>
          {controller.position && (
            <mesh position={[controller.position.x, controller.position.y, controller.position.z]}>
              <boxGeometry args={[0.05, 0.05, 0.15]} />
              <meshStandardMaterial color="#888888" />
            </mesh>
          )}
          
          {/* Controller ray */}
          {controller.position && controller.orientation && interactionState.controllerTarget[controller.id] && (
            <line>
              <bufferGeometry>
                <bufferAttribute
                  attach="attributes-position"
                  count={2}
                  array={new Float32Array([
                    controller.position.x, controller.position.y, controller.position.z,
                    controller.position.x, controller.position.y, controller.position.z - 2
                  ])}
                  itemSize={3}
                />
              </bufferGeometry>
              <lineBasicMaterial color="#ff0000" transparent opacity={0.7} />
            </line>
          )}
        </group>
      ))}
      
      {/* XR-specific UI elements */}
      {isXRActive && xrMode === 'ar' && (
        <group position={[0, -1.5, -1]}>
          {/* Ground plane indicator */}
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[4, 4]} />
            <meshBasicMaterial
              color="#00bcd4"
              transparent
              opacity={0.1}
              wireframe
            />
          </mesh>
        </group>
      )}
      
      {/* Spatial UI panels for settings/controls */}
      {spatialUI.map(element => (
        <group
          key={element.id}
          position={element.position}
          rotation={[element.rotation.x, element.rotation.y, element.rotation.z]}
          scale={element.scale}
          visible={element.visible}
        >
          {/* Render UI element based on type */}
          {element.type === 'panel' && (
            <mesh>
              <planeGeometry args={[0.5, 0.3]} />
              <meshStandardMaterial
                color="#ffffff"
                transparent
                opacity={0.9}
              />
            </mesh>
          )}
        </group>
      ))}
    </group>
  );
};

export default XRMandalaInterface;