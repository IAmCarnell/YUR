/**
 * Advanced WebXR Manager for YUR Framework
 * Supports VR, AR, hand tracking, and spatial navigation
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';
import { ARButton } from 'three/examples/jsm/webxr/ARButton.js';
import { XRControllerModelFactory } from 'three/examples/jsm/webxr/XRControllerModelFactory.js';
import { XRHandModelFactory } from 'three/examples/jsm/webxr/XRHandModelFactory.js';

interface XRDevice {
  type: 'vr' | 'ar';
  supported: boolean;
  available: boolean;
}

interface XRManagerProps {
  scene: THREE.Scene;
  camera: THREE.Camera;
  renderer: THREE.WebGLRenderer;
  onXRSessionStart?: () => void;
  onXRSessionEnd?: () => void;
  onHandTracking?: (hands: XRHand[]) => void;
  enableHandTracking?: boolean;
  enableSpatialNavigation?: boolean;
}

export const WebXRManager: React.FC<XRManagerProps> = ({
  scene,
  camera,
  renderer,
  onXRSessionStart,
  onXRSessionEnd,
  onHandTracking,
  enableHandTracking = true,
  enableSpatialNavigation = true
}) => {
  const [xrDevices, setXRDevices] = useState<XRDevice[]>([]);
  const [isXRActive, setIsXRActive] = useState(false);
  const [currentSession, setCurrentSession] = useState<XRSession | null>(null);
  const [handTrackingSupported, setHandTrackingSupported] = useState(false);
  
  const controllerGroupRef = useRef<THREE.Group>();
  const handGroupRef = useRef<THREE.Group>();
  const spatialNavigationRef = useRef<SpatialNavigationController>();

  // Initialize XR capabilities
  useEffect(() => {
    checkXRSupport();
    setupRenderer();
    initializeControllers();
    
    if (enableHandTracking) {
      initializeHandTracking();
    }
    
    if (enableSpatialNavigation) {
      initializeSpatialNavigation();
    }
  }, []);

  const checkXRSupport = async () => {
    if (!navigator.xr) {
      console.warn('WebXR not supported');
      return;
    }

    const devices: XRDevice[] = [];

    try {
      const vrSupported = await navigator.xr.isSessionSupported('immersive-vr');
      devices.push({
        type: 'vr',
        supported: vrSupported,
        available: vrSupported
      });
    } catch (error) {
      devices.push({ type: 'vr', supported: false, available: false });
    }

    try {
      const arSupported = await navigator.xr.isSessionSupported('immersive-ar');
      devices.push({
        type: 'ar',
        supported: arSupported,
        available: arSupported
      });
    } catch (error) {
      devices.push({ type: 'ar', supported: false, available: false });
    }

    // Check hand tracking support
    try {
      const session = await navigator.xr.requestSession('immersive-vr', {
        optionalFeatures: ['hand-tracking']
      });
      setHandTrackingSupported(true);
      session.end();
    } catch (error) {
      setHandTrackingSupported(false);
    }

    setXRDevices(devices);
  };

  const setupRenderer = () => {
    renderer.xr.enabled = true;
    renderer.xr.setReferenceSpaceType('local');
    
    // XR session callbacks
    renderer.xr.addEventListener('sessionstart', () => {
      setIsXRActive(true);
      setCurrentSession(renderer.xr.getSession());
      onXRSessionStart?.();
    });

    renderer.xr.addEventListener('sessionend', () => {
      setIsXRActive(false);
      setCurrentSession(null);
      onXRSessionEnd?.();
    });
  };

  const initializeControllers = () => {
    const controllerModelFactory = new XRControllerModelFactory();
    const controllerGroup = new THREE.Group();
    
    // Controller 0 (right hand)
    const controller1 = renderer.xr.getController(0);
    controller1.addEventListener('selectstart', onSelectStart);
    controller1.addEventListener('selectend', onSelectEnd);
    controller1.addEventListener('squeezestart', onSqueezeStart);
    controller1.addEventListener('squeezeend', onSqueezeEnd);
    controllerGroup.add(controller1);

    const controllerGrip1 = renderer.xr.getControllerGrip(0);
    controllerGrip1.add(controllerModelFactory.createControllerModel(controllerGrip1));
    controllerGroup.add(controllerGrip1);

    // Controller 1 (left hand)
    const controller2 = renderer.xr.getController(1);
    controller2.addEventListener('selectstart', onSelectStart);
    controller2.addEventListener('selectend', onSelectEnd);
    controller2.addEventListener('squeezestart', onSqueezeStart);
    controller2.addEventListener('squeezeend', onSqueezeEnd);
    controllerGroup.add(controller2);

    const controllerGrip2 = renderer.xr.getControllerGrip(1);
    controllerGrip2.add(controllerModelFactory.createControllerModel(controllerGrip2));
    controllerGroup.add(controllerGrip2);

    scene.add(controllerGroup);
    controllerGroupRef.current = controllerGroup;
  };

  const initializeHandTracking = () => {
    if (!handTrackingSupported) return;

    const handModelFactory = new XRHandModelFactory();
    const handGroup = new THREE.Group();

    // Right hand
    const hand1 = renderer.xr.getHand(0);
    hand1.addEventListener('pinchstart', onPinchStart);
    hand1.addEventListener('pinchend', onPinchEnd);
    hand1.add(handModelFactory.createHandModel(hand1, 'mesh'));
    handGroup.add(hand1);

    // Left hand
    const hand2 = renderer.xr.getHand(1);
    hand2.addEventListener('pinchstart', onPinchStart);
    hand2.addEventListener('pinchend', onPinchEnd);
    hand2.add(handModelFactory.createHandModel(hand2, 'mesh'));
    handGroup.add(hand2);

    scene.add(handGroup);
    handGroupRef.current = handGroup;
  };

  const initializeSpatialNavigation = () => {
    spatialNavigationRef.current = new SpatialNavigationController(scene, camera);
  };

  // Controller event handlers
  const onSelectStart = useCallback((event: any) => {
    const controller = event.target;
    const intersections = getIntersections(controller);
    
    if (intersections.length > 0) {
      const intersection = intersections[0];
      const object = intersection.object;
      
      // Handle object selection
      controller.attach(object);
      controller.userData.selected = object;
    }
  }, []);

  const onSelectEnd = useCallback((event: any) => {
    const controller = event.target;
    
    if (controller.userData.selected !== undefined) {
      const object = controller.userData.selected;
      scene.attach(object);
      controller.userData.selected = undefined;
    }
  }, []);

  const onSqueezeStart = useCallback((event: any) => {
    // Handle squeeze gestures for spatial navigation
    if (spatialNavigationRef.current) {
      spatialNavigationRef.current.startTeleportation(event.target);
    }
  }, []);

  const onSqueezeEnd = useCallback((event: any) => {
    if (spatialNavigationRef.current) {
      spatialNavigationRef.current.endTeleportation();
    }
  }, []);

  // Hand tracking event handlers
  const onPinchStart = useCallback((event: any) => {
    const hand = event.target;
    const pinchStrength = hand.userData.pinchStrength || 0;
    
    if (pinchStrength > 0.8) {
      // Strong pinch detected - trigger selection
      const intersections = getHandIntersections(hand);
      if (intersections.length > 0) {
        handleHandSelection(intersections[0].object);
      }
    }
  }, []);

  const onPinchEnd = useCallback((event: any) => {
    // Handle pinch release
  }, []);

  // Utility functions
  const getIntersections = (controller: THREE.Object3D): THREE.Intersection[] => {
    const tempMatrix = new THREE.Matrix4();
    const raycaster = new THREE.Raycaster();

    tempMatrix.identity().extractRotation(controller.matrixWorld);
    raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
    raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);

    return raycaster.intersectObjects(scene.children, true);
  };

  const getHandIntersections = (hand: THREE.Object3D): THREE.Intersection[] => {
    // Implement hand ray casting for interaction
    const raycaster = new THREE.Raycaster();
    const handPosition = new THREE.Vector3();
    const handDirection = new THREE.Vector3();

    hand.getWorldPosition(handPosition);
    hand.getWorldDirection(handDirection);

    raycaster.set(handPosition, handDirection.normalize());
    return raycaster.intersectObjects(scene.children, true);
  };

  const handleHandSelection = (object: THREE.Object3D) => {
    // Implement hand-based object interaction
    if (object.userData.interactive) {
      object.userData.onHandSelect?.(object);
    }
  };

  // Session management
  const startVRSession = async () => {
    try {
      const session = await navigator.xr.requestSession('immersive-vr', {
        optionalFeatures: enableHandTracking ? ['hand-tracking'] : []
      });
      renderer.xr.setSession(session);
    } catch (error) {
      console.error('Failed to start VR session:', error);
    }
  };

  const startARSession = async () => {
    try {
      const session = await navigator.xr.requestSession('immersive-ar', {
        requiredFeatures: ['local'],
        optionalFeatures: ['dom-overlay', 'hit-test']
      });
      renderer.xr.setSession(session);
    } catch (error) {
      console.error('Failed to start AR session:', error);
    }
  };

  const endSession = () => {
    if (currentSession) {
      currentSession.end();
    }
  };

  return (
    <div className="webxr-manager">
      <div className="xr-controls">
        {xrDevices.map(device => (
          <button
            key={device.type}
            disabled={!device.supported}
            onClick={device.type === 'vr' ? startVRSession : startARSession}
            className={`xr-button xr-${device.type}`}
            aria-label={`Enter ${device.type.toUpperCase()} mode`}
          >
            {device.supported 
              ? `Enter ${device.type.toUpperCase()}` 
              : `${device.type.toUpperCase()} Not Supported`
            }
          </button>
        ))}
        
        {isXRActive && (
          <button
            onClick={endSession}
            className="xr-button xr-exit"
            aria-label="Exit XR mode"
          >
            Exit XR
          </button>
        )}
      </div>

      <div className="xr-features">
        <label>
          <input
            type="checkbox"
            checked={enableHandTracking && handTrackingSupported}
            disabled={!handTrackingSupported}
            onChange={(e) => {
              // Toggle hand tracking - would need prop update
            }}
          />
          Hand Tracking {!handTrackingSupported && '(Not Supported)'}
        </label>

        <label>
          <input
            type="checkbox"
            checked={enableSpatialNavigation}
            onChange={(e) => {
              // Toggle spatial navigation - would need prop update
            }}
          />
          Spatial Navigation
        </label>
      </div>

      {isXRActive && (
        <div className="xr-status" aria-live="polite">
          XR session active - {currentSession?.mode} mode
          {handTrackingSupported && enableHandTracking && ' with hand tracking'}
        </div>
      )}

      <style jsx>{`
        .webxr-manager {
          position: fixed;
          top: 20px;
          right: 20px;
          background: rgba(0, 0, 0, 0.8);
          color: white;
          padding: 20px;
          border-radius: 10px;
          font-family: Arial, sans-serif;
          z-index: 1000;
        }

        .xr-controls {
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-bottom: 15px;
        }

        .xr-button {
          padding: 12px 20px;
          border: none;
          border-radius: 6px;
          color: white;
          font-weight: bold;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .xr-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .xr-vr {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }

        .xr-ar {
          background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
        }

        .xr-exit {
          background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%);
        }

        .xr-button:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        }

        .xr-features {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-bottom: 15px;
        }

        .xr-features label {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
        }

        .xr-status {
          background: rgba(255, 255, 255, 0.1);
          padding: 8px 12px;
          border-radius: 4px;
          font-size: 12px;
          text-align: center;
        }

        @media (max-width: 768px) {
          .webxr-manager {
            position: relative;
            top: auto;
            right: auto;
            margin: 20px;
          }
        }
      `}</style>
    </div>
  );
};

// Spatial Navigation Controller
class SpatialNavigationController {
  private scene: THREE.Scene;
  private camera: THREE.Camera;
  private teleportMarker: THREE.Object3D;
  private isActive: boolean = false;

  constructor(scene: THREE.Scene, camera: THREE.Camera) {
    this.scene = scene;
    this.camera = camera;
    this.createTeleportMarker();
  }

  private createTeleportMarker() {
    const geometry = new THREE.RingGeometry(0.15, 0.2, 32).rotateX(-Math.PI / 2);
    const material = new THREE.MeshBasicMaterial({ 
      color: 0xffffff,
      transparent: true,
      opacity: 0.8
    });
    
    this.teleportMarker = new THREE.Mesh(geometry, material);
    this.teleportMarker.visible = false;
    this.scene.add(this.teleportMarker);
  }

  startTeleportation(controller: THREE.Object3D) {
    this.isActive = true;
    this.teleportMarker.visible = true;
    
    // Update marker position based on controller raycast
    this.updateTeleportMarker(controller);
  }

  endTeleportation() {
    if (this.isActive && this.teleportMarker.visible) {
      // Teleport camera to marker position
      const newPosition = this.teleportMarker.position.clone();
      newPosition.y += 1.6; // Eye height
      
      this.camera.position.copy(newPosition);
    }
    
    this.isActive = false;
    this.teleportMarker.visible = false;
  }

  private updateTeleportMarker(controller: THREE.Object3D) {
    const tempMatrix = new THREE.Matrix4();
    const raycaster = new THREE.Raycaster();

    tempMatrix.identity().extractRotation(controller.matrixWorld);
    raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
    raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);

    const intersects = raycaster.intersectObjects(this.scene.children, true);
    
    if (intersects.length > 0) {
      const intersection = intersects[0];
      this.teleportMarker.position.copy(intersection.point);
      this.teleportMarker.position.y += 0.01; // Slightly above surface
    }
  }
}