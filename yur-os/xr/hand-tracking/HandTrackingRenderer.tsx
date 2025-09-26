/**
 * Hand Tracking Renderer for YUR OS XR
 * Real-time hand tracking visualization and gesture recognition
 */

import React, { useRef, useEffect, useMemo, useState, useCallback } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { 
  Mesh, 
  Vector3, 
  Quaternion, 
  Group, 
  SphereGeometry, 
  MeshBasicMaterial,
  CylinderGeometry,
  Color,
  BufferGeometry,
  LineBasicMaterial,
  Line,
  BufferAttribute
} from 'three';

interface HandJoint {
  position: Vector3;
  orientation: Quaternion;
  radius: number;
  confidence: number;
}

interface HandTrackingData {
  left?: {
    joints: { [jointName: string]: HandJoint };
    handedness: 'left';
    confidence: number;
    gesture?: string;
  };
  right?: {
    joints: { [jointName: string]: HandJoint };
    handedness: 'right';
    confidence: number;
    gesture?: string;
  };
}

interface HandTrackingRendererProps {
  handTrackingData: HandTrackingData;
  showJoints?: boolean;
  showBones?: boolean;
  showGestures?: boolean;
  onGestureDetected?: (hand: 'left' | 'right', gesture: string, confidence: number) => void;
  jointMaterial?: MeshBasicMaterial;
  boneMaterial?: LineBasicMaterial;
  confidenceThreshold?: number;
}

interface GestureState {
  name: string;
  confidence: number;
  timestamp: number;
  hand: 'left' | 'right';
}

// Hand joint hierarchy for skeletal rendering
const HAND_JOINT_HIERARCHY: { [parent: string]: string[] } = {
  'wrist': ['thumb-metacarpal', 'index-finger-metacarpal', 'middle-finger-metacarpal', 'ring-finger-metacarpal', 'pinky-finger-metacarpal'],
  'thumb-metacarpal': ['thumb-phalanx-proximal'],
  'thumb-phalanx-proximal': ['thumb-phalanx-distal'],
  'thumb-phalanx-distal': ['thumb-tip'],
  'index-finger-metacarpal': ['index-finger-phalanx-proximal'],
  'index-finger-phalanx-proximal': ['index-finger-phalanx-intermediate'],
  'index-finger-phalanx-intermediate': ['index-finger-phalanx-distal'],
  'index-finger-phalanx-distal': ['index-finger-tip'],
  'middle-finger-metacarpal': ['middle-finger-phalanx-proximal'],
  'middle-finger-phalanx-proximal': ['middle-finger-phalanx-intermediate'],
  'middle-finger-phalanx-intermediate': ['middle-finger-phalanx-distal'],
  'middle-finger-phalanx-distal': ['middle-finger-tip'],
  'ring-finger-metacarpal': ['ring-finger-phalanx-proximal'],
  'ring-finger-phalanx-proximal': ['ring-finger-phalanx-intermediate'],
  'ring-finger-phalanx-intermediate': ['ring-finger-phalanx-distal'],
  'ring-finger-phalanx-distal': ['ring-finger-tip'],
  'pinky-finger-metacarpal': ['pinky-finger-phalanx-proximal'],
  'pinky-finger-phalanx-proximal': ['pinky-finger-phalanx-intermediate'],
  'pinky-finger-phalanx-intermediate': ['pinky-finger-phalanx-distal'],
  'pinky-finger-phalanx-distal': ['pinky-finger-tip'],
};

// Gesture recognition patterns
const GESTURE_PATTERNS = {
  // Pointing gesture - index finger extended, others curled
  pointing: {
    requiredJoints: ['index-finger-tip', 'index-finger-phalanx-distal', 'middle-finger-tip', 'wrist'],
    checkFunction: (joints: { [name: string]: HandJoint }) => {
      const indexTip = joints['index-finger-tip'];
      const indexDistal = joints['index-finger-phalanx-distal'];
      const middleTip = joints['middle-finger-tip'];
      const wrist = joints['wrist'];
      
      if (!indexTip || !indexDistal || !middleTip || !wrist) return 0;
      
      // Index finger should be extended
      const indexLength = indexTip.position.distanceTo(wrist.position);
      const middleLength = middleTip.position.distanceTo(wrist.position);
      
      // Index finger is significantly more extended than middle finger
      const extensionRatio = indexLength / middleLength;
      return Math.min(Math.max((extensionRatio - 1.1) / 0.3, 0), 1);
    },
  },
  
  // Fist gesture - all fingers curled
  fist: {
    requiredJoints: ['index-finger-tip', 'middle-finger-tip', 'ring-finger-tip', 'pinky-finger-tip', 'wrist'],
    checkFunction: (joints: { [name: string]: HandJoint }) => {
      const fingerTips = ['index-finger-tip', 'middle-finger-tip', 'ring-finger-tip', 'pinky-finger-tip'];
      const wrist = joints['wrist'];
      
      if (!wrist) return 0;
      
      let totalDistance = 0;
      let validFingers = 0;
      
      for (const tipName of fingerTips) {
        const tip = joints[tipName];
        if (tip) {
          totalDistance += tip.position.distanceTo(wrist.position);
          validFingers++;
        }
      }
      
      if (validFingers === 0) return 0;
      
      const avgDistance = totalDistance / validFingers;
      // Fist when average finger distance is small
      return Math.min(Math.max((0.12 - avgDistance) / 0.05, 0), 1);
    },
  },
  
  // Open palm - all fingers extended
  palm: {
    requiredJoints: ['index-finger-tip', 'middle-finger-tip', 'ring-finger-tip', 'pinky-finger-tip', 'thumb-tip', 'wrist'],
    checkFunction: (joints: { [name: string]: HandJoint }) => {
      const fingerTips = ['index-finger-tip', 'middle-finger-tip', 'ring-finger-tip', 'pinky-finger-tip', 'thumb-tip'];
      const wrist = joints['wrist'];
      
      if (!wrist) return 0;
      
      let totalDistance = 0;
      let validFingers = 0;
      
      for (const tipName of fingerTips) {
        const tip = joints[tipName];
        if (tip) {
          totalDistance += tip.position.distanceTo(wrist.position);
          validFingers++;
        }
      }
      
      if (validFingers === 0) return 0;
      
      const avgDistance = totalDistance / validFingers;
      // Open palm when average finger distance is large
      return Math.min(Math.max((avgDistance - 0.15) / 0.08, 0), 1);
    },
  },
  
  // Peace sign - index and middle fingers extended
  peace: {
    requiredJoints: ['index-finger-tip', 'middle-finger-tip', 'ring-finger-tip', 'pinky-finger-tip', 'wrist'],
    checkFunction: (joints: { [name: string]: HandJoint }) => {
      const indexTip = joints['index-finger-tip'];
      const middleTip = joints['middle-finger-tip'];
      const ringTip = joints['ring-finger-tip'];
      const pinkyTip = joints['pinky-finger-tip'];
      const wrist = joints['wrist'];
      
      if (!indexTip || !middleTip || !ringTip || !pinkyTip || !wrist) return 0;
      
      const indexDist = indexTip.position.distanceTo(wrist.position);
      const middleDist = middleTip.position.distanceTo(wrist.position);
      const ringDist = ringTip.position.distanceTo(wrist.position);
      const pinkyDist = pinkyTip.position.distanceTo(wrist.position);
      
      // Index and middle should be extended, ring and pinky curled
      const extendedFingers = (indexDist > 0.15 ? 1 : 0) + (middleDist > 0.15 ? 1 : 0);
      const curledFingers = (ringDist < 0.12 ? 1 : 0) + (pinkyDist < 0.12 ? 1 : 0);
      
      return (extendedFingers === 2 && curledFingers === 2) ? 1.0 : 0.0;
    },
  },
  
  // Pinch gesture - thumb and index finger close together
  pinch: {
    requiredJoints: ['thumb-tip', 'index-finger-tip'],
    checkFunction: (joints: { [name: string]: HandJoint }) => {
      const thumbTip = joints['thumb-tip'];
      const indexTip = joints['index-finger-tip'];
      
      if (!thumbTip || !indexTip) return 0;
      
      const distance = thumbTip.position.distanceTo(indexTip.position);
      // Pinch when thumb and index are very close
      return Math.min(Math.max((0.03 - distance) / 0.02, 0), 1);
    },
  },
};

export const HandTrackingRenderer: React.FC<HandTrackingRendererProps> = ({
  handTrackingData,
  showJoints = true,
  showBones = true,
  showGestures = true,
  onGestureDetected,
  jointMaterial,
  boneMaterial,
  confidenceThreshold = 0.5,
}) => {
  const leftHandRef = useRef<Group>(null);
  const rightHandRef = useRef<Group>(null);
  const [detectedGestures, setDetectedGestures] = useState<GestureState[]>([]);
  
  // Materials for hand rendering
  const defaultJointMaterial = useMemo(() => 
    jointMaterial || new MeshBasicMaterial({ 
      color: new Color('#00bcd4'),
      transparent: true,
      opacity: 0.8 
    }), [jointMaterial]);
    
  const defaultBoneMaterial = useMemo(() => 
    boneMaterial || new LineBasicMaterial({ 
      color: new Color('#ffffff'),
      transparent: true,
      opacity: 0.6 
    }), [boneMaterial]);

  // Gesture detection
  const detectGestures = useCallback((hand: 'left' | 'right', joints: { [name: string]: HandJoint }) => {
    const gestures: GestureState[] = [];
    
    for (const [gestureName, pattern] of Object.entries(GESTURE_PATTERNS)) {
      // Check if all required joints are available
      const hasRequiredJoints = pattern.requiredJoints.every(jointName => 
        joints[jointName] && joints[jointName].confidence > confidenceThreshold
      );
      
      if (hasRequiredJoints) {
        const confidence = pattern.checkFunction(joints);
        
        if (confidence > 0.7) { // High confidence threshold for gesture detection
          gestures.push({
            name: gestureName,
            confidence,
            timestamp: Date.now(),
            hand,
          });
        }
      }
    }
    
    return gestures;
  }, [confidenceThreshold]);

  // Update gesture detection
  useEffect(() => {
    const newGestures: GestureState[] = [];
    
    if (handTrackingData.left && handTrackingData.left.confidence > confidenceThreshold) {
      const leftGestures = detectGestures('left', handTrackingData.left.joints);
      newGestures.push(...leftGestures);
    }
    
    if (handTrackingData.right && handTrackingData.right.confidence > confidenceThreshold) {
      const rightGestures = detectGestures('right', handTrackingData.right.joints);
      newGestures.push(...rightGestures);
    }
    
    // Update detected gestures
    setDetectedGestures(prev => {
      const now = Date.now();
      const recentGestures = prev.filter(g => now - g.timestamp < 1000); // Keep gestures for 1 second
      
      // Merge new gestures, avoiding duplicates
      const merged = [...recentGestures];
      for (const newGesture of newGestures) {
        const existing = merged.find(g => 
          g.name === newGesture.name && 
          g.hand === newGesture.hand &&
          now - g.timestamp < 500 // Don't duplicate within 500ms
        );
        
        if (!existing) {
          merged.push(newGesture);
          
          // Emit gesture detection event
          if (onGestureDetected) {
            onGestureDetected(newGesture.hand, newGesture.name, newGesture.confidence);
          }
        }
      }
      
      return merged;
    });
  }, [handTrackingData, detectGestures, onGestureDetected, confidenceThreshold]);

  // Render hand joints
  const renderHandJoints = (joints: { [name: string]: HandJoint }, handedness: 'left' | 'right') => {
    const jointElements: JSX.Element[] = [];
    
    Object.entries(joints).forEach(([jointName, joint]) => {
      if (joint.confidence < confidenceThreshold) return;
      
      const jointKey = `${handedness}-${jointName}`;
      const radius = Math.max(joint.radius || 0.005, 0.003); // Minimum visible size
      
      jointElements.push(
        <mesh
          key={jointKey}
          position={[joint.position.x, joint.position.y, joint.position.z]}
          quaternion={[joint.orientation.x, joint.orientation.y, joint.orientation.z, joint.orientation.w]}
        >
          <sphereGeometry args={[radius, 8, 8]} />
          <primitive object={defaultJointMaterial} />
        </mesh>
      );
    });
    
    return jointElements;
  };

  // Render hand bones (connections between joints)
  const renderHandBones = (joints: { [name: string]: HandJoint }, handedness: 'left' | 'right') => {
    const boneElements: JSX.Element[] = [];
    
    Object.entries(HAND_JOINT_HIERARCHY).forEach(([parentJoint, children]) => {
      const parent = joints[parentJoint];
      if (!parent || parent.confidence < confidenceThreshold) return;
      
      children.forEach(childJointName => {
        const child = joints[childJointName];
        if (!child || child.confidence < confidenceThreshold) return;
        
        const boneKey = `${handedness}-bone-${parentJoint}-${childJointName}`;
        
        // Create line geometry for bone
        const points = [parent.position, child.position];
        const geometry = new BufferGeometry().setFromPoints(points);
        
        boneElements.push(
          <line key={boneKey} geometry={geometry}>
            <primitive object={defaultBoneMaterial} />
          </line>
        );
      });
    });
    
    return boneElements;
  };

  // Animation frame update
  useFrame(() => {
    // Update hand group positions if needed
    // This could be used for additional hand animations or effects
  });

  return (
    <group>
      {/* Left Hand */}
      {handTrackingData.left && handTrackingData.left.confidence > confidenceThreshold && (
        <group ref={leftHandRef}>
          {showJoints && renderHandJoints(handTrackingData.left.joints, 'left')}
          {showBones && renderHandBones(handTrackingData.left.joints, 'left')}
        </group>
      )}
      
      {/* Right Hand */}
      {handTrackingData.right && handTrackingData.right.confidence > confidenceThreshold && (
        <group ref={rightHandRef}>
          {showJoints && renderHandJoints(handTrackingData.right.joints, 'right')}
          {showBones && renderHandBones(handTrackingData.right.joints, 'right')}
        </group>
      )}
      
      {/* Gesture Indicators */}
      {showGestures && detectedGestures.map((gesture, index) => {
        const handData = gesture.hand === 'left' ? handTrackingData.left : handTrackingData.right;
        const wristJoint = handData?.joints['wrist'];
        
        if (!wristJoint) return null;
        
        const indicatorPosition = new Vector3(
          wristJoint.position.x,
          wristJoint.position.y + 0.05,
          wristJoint.position.z
        );
        
        return (
          <group key={`gesture-${index}`} position={indicatorPosition}>
            {/* Gesture name display */}
            <mesh>
              <planeGeometry args={[0.06, 0.02]} />
              <meshBasicMaterial 
                color="#ffffff" 
                transparent 
                opacity={gesture.confidence * 0.8}
              />
            </mesh>
            
            {/* Confidence indicator */}
            <mesh position={[0, -0.015, 0.001]}>
              <planeGeometry args={[0.06 * gesture.confidence, 0.005]} />
              <meshBasicMaterial 
                color={gesture.confidence > 0.8 ? "#4caf50" : "#ff9800"} 
                transparent 
                opacity={0.8}
              />
            </mesh>
          </group>
        );
      })}
    </group>
  );
};

export default HandTrackingRenderer;