/**
 * Mobile Gestures Hook
 * Provides comprehensive gesture handling for mobile UI components
 */

import { useRef, useCallback, useEffect } from 'react';
import { Animated, Dimensions, Platform } from 'react-native';
import { Haptics, HapticFeedbackStyle } from 'expo-haptics';

interface GestureConfig {
  enablePan: boolean;
  enablePinch: boolean;
  enableRotation: boolean;
  enableSwipe: boolean;
  minPinchScale: number;
  maxPinchScale: number;
  rotationSnapAngle: number;
  swipeThreshold: number;
  hapticFeedback: boolean;
}

interface GestureState {
  isGesturing: boolean;
  gestureType: 'none' | 'pan' | 'pinch' | 'rotation' | 'swipe';
  startTime: number;
  lastPosition: { x: number; y: number };
  totalTranslation: { x: number; y: number };
  velocity: { x: number; y: number };
  scale: number;
  rotation: number;
}

interface SwipeDirection {
  direction: 'up' | 'down' | 'left' | 'right';
  velocity: number;
  distance: number;
}

export const useMobileGestures = (config: Partial<GestureConfig> = {}) => {
  const defaultConfig: GestureConfig = {
    enablePan: true,
    enablePinch: true,
    enableRotation: true,
    enableSwipe: true,
    minPinchScale: 0.5,
    maxPinchScale: 3.0,
    rotationSnapAngle: 15, // degrees
    swipeThreshold: 50, // pixels
    hapticFeedback: true,
    ...config,
  };

  const gestureState = useRef<GestureState>({
    isGesturing: false,
    gestureType: 'none',
    startTime: 0,
    lastPosition: { x: 0, y: 0 },
    totalTranslation: { x: 0, y: 0 },
    velocity: { x: 0, y: 0 },
    scale: 1,
    rotation: 0,
  });

  const animationValues = useRef({
    translateX: new Animated.Value(0),
    translateY: new Animated.Value(0),
    scale: new Animated.Value(1),
    rotation: new Animated.Value(0),
  });

  const screenDimensions = useRef(Dimensions.get('window'));

  // Update screen dimensions on orientation change
  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      screenDimensions.current = window;
    });

    return () => subscription?.remove();
  }, []);

  // Pan gesture handler
  const handlePanGesture = useCallback((event: any) => {
    const { state, translationX, translationY, velocityX, velocityY } = event.nativeEvent;

    if (!defaultConfig.enablePan) return;

    switch (state) {
      case 1: // BEGAN
        gestureState.current = {
          ...gestureState.current,
          isGesturing: true,
          gestureType: 'pan',
          startTime: Date.now(),
          lastPosition: { x: translationX, y: translationY },
          totalTranslation: { x: 0, y: 0 },
        };

        if (defaultConfig.hapticFeedback) {
          Haptics.impactAsync(HapticFeedbackStyle.Light);
        }
        break;

      case 2: // ACTIVE
        const deltaX = translationX - gestureState.current.lastPosition.x;
        const deltaY = translationY - gestureState.current.lastPosition.y;

        gestureState.current.totalTranslation.x += deltaX;
        gestureState.current.totalTranslation.y += deltaY;
        gestureState.current.lastPosition = { x: translationX, y: translationY };
        gestureState.current.velocity = { x: velocityX, y: velocityY };

        // Update animation values
        animationValues.current.translateX.setValue(translationX);
        animationValues.current.translateY.setValue(translationY);
        break;

      case 3: // END
      case 4: // CANCELLED
        const duration = Date.now() - gestureState.current.startTime;
        const distance = Math.sqrt(
          Math.pow(gestureState.current.totalTranslation.x, 2) +
          Math.pow(gestureState.current.totalTranslation.y, 2)
        );

        // Check for swipe gesture
        if (
          defaultConfig.enableSwipe &&
          distance > defaultConfig.swipeThreshold &&
          duration < 300
        ) {
          const swipeDirection = detectSwipeDirection(
            gestureState.current.totalTranslation,
            gestureState.current.velocity
          );
          
          if (swipeDirection) {
            handleSwipeGesture(swipeDirection);
          }
        }

        // Reset gesture state
        gestureState.current = {
          ...gestureState.current,
          isGesturing: false,
          gestureType: 'none',
        };

        // Spring back animation
        Animated.parallel([
          Animated.spring(animationValues.current.translateX, {
            toValue: 0,
            useNativeDriver: true,
            tension: 100,
            friction: 8,
          }),
          Animated.spring(animationValues.current.translateY, {
            toValue: 0,
            useNativeDriver: true,
            tension: 100,
            friction: 8,
          }),
        ]).start();
        break;
    }
  }, [defaultConfig]);

  // Pinch gesture handler
  const handlePinchGesture = useCallback((event: any) => {
    const { state, scale, velocity } = event.nativeEvent;

    if (!defaultConfig.enablePinch) return;

    switch (state) {
      case 1: // BEGAN
        gestureState.current = {
          ...gestureState.current,
          isGesturing: true,
          gestureType: 'pinch',
          startTime: Date.now(),
          scale: 1,
        };

        if (defaultConfig.hapticFeedback) {
          Haptics.impactAsync(HapticFeedbackStyle.Light);
        }
        break;

      case 2: // ACTIVE
        // Clamp scale to configured limits
        const clampedScale = Math.max(
          defaultConfig.minPinchScale,
          Math.min(defaultConfig.maxPinchScale, scale)
        );

        gestureState.current.scale = clampedScale;
        animationValues.current.scale.setValue(clampedScale);

        // Provide haptic feedback at scale thresholds
        if (defaultConfig.hapticFeedback) {
          if (
            (clampedScale <= defaultConfig.minPinchScale && scale < clampedScale) ||
            (clampedScale >= defaultConfig.maxPinchScale && scale > clampedScale)
          ) {
            Haptics.impactAsync(HapticFeedbackStyle.Medium);
          }
        }
        break;

      case 3: // END
      case 4: // CANCELLED
        gestureState.current = {
          ...gestureState.current,
          isGesturing: false,
          gestureType: 'none',
        };

        // Spring back to original scale
        Animated.spring(animationValues.current.scale, {
          toValue: 1,
          useNativeDriver: true,
          tension: 100,
          friction: 8,
        }).start();
        break;
    }
  }, [defaultConfig]);

  // Rotation gesture handler
  const handleRotationGesture = useCallback((event: any) => {
    const { state, rotation, velocity } = event.nativeEvent;

    if (!defaultConfig.enableRotation) return;

    switch (state) {
      case 1: // BEGAN
        gestureState.current = {
          ...gestureState.current,
          isGesturing: true,
          gestureType: 'rotation',
          startTime: Date.now(),
          rotation: 0,
        };

        if (defaultConfig.hapticFeedback) {
          Haptics.impactAsync(HapticFeedbackStyle.Light);
        }
        break;

      case 2: // ACTIVE
        let adjustedRotation = rotation;

        // Snap to angles
        if (defaultConfig.rotationSnapAngle > 0) {
          const snapAngleRad = (defaultConfig.rotationSnapAngle * Math.PI) / 180;
          const snappedRotation = Math.round(rotation / snapAngleRad) * snapAngleRad;
          
          if (Math.abs(rotation - snappedRotation) < snapAngleRad * 0.2) {
            adjustedRotation = snappedRotation;
            
            if (defaultConfig.hapticFeedback) {
              Haptics.impactAsync(HapticFeedbackStyle.Light);
            }
          }
        }

        gestureState.current.rotation = adjustedRotation;
        animationValues.current.rotation.setValue(adjustedRotation);
        break;

      case 3: // END
      case 4: // CANCELLED
        gestureState.current = {
          ...gestureState.current,
          isGesturing: false,
          gestureType: 'none',
        };

        // Spring back to original rotation
        Animated.spring(animationValues.current.rotation, {
          toValue: 0,
          useNativeDriver: true,
          tension: 100,
          friction: 8,
        }).start();
        break;
    }
  }, [defaultConfig]);

  // Swipe detection helper
  const detectSwipeDirection = useCallback((
    translation: { x: number; y: number },
    velocity: { x: number; y: number }
  ): SwipeDirection | null => {
    const absX = Math.abs(translation.x);
    const absY = Math.abs(translation.y);
    const distance = Math.sqrt(absX * absX + absY * absY);
    const velocityMagnitude = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);

    if (distance < defaultConfig.swipeThreshold) return null;

    if (absX > absY) {
      // Horizontal swipe
      return {
        direction: translation.x > 0 ? 'right' : 'left',
        velocity: velocityMagnitude,
        distance,
      };
    } else {
      // Vertical swipe
      return {
        direction: translation.y > 0 ? 'down' : 'up',
        velocity: velocityMagnitude,
        distance,
      };
    }
  }, [defaultConfig.swipeThreshold]);

  // Swipe gesture handler
  const handleSwipeGesture = useCallback((swipeDirection: SwipeDirection) => {
    if (defaultConfig.hapticFeedback) {
      Haptics.impactAsync(HapticFeedbackStyle.Medium);
    }

    console.log(`Swipe detected: ${swipeDirection.direction} with velocity ${swipeDirection.velocity}`);
  }, [defaultConfig.hapticFeedback]);

  // Multi-touch gesture detection
  const handleMultiTouchGesture = useCallback((event: any) => {
    const { numberOfPointers } = event.nativeEvent;

    if (numberOfPointers >= 2) {
      gestureState.current = {
        ...gestureState.current,
        isGesturing: true,
        gestureType: 'pan', // or 'multi-touch'
      };
    }
  }, []);

  // Get current gesture information
  const getCurrentGestureState = useCallback(() => {
    return { ...gestureState.current };
  }, []);

  // Check if currently gesturing
  const isGesturing = useCallback(() => {
    return gestureState.current.isGesturing;
  }, []);

  // Reset all gestures
  const resetGestures = useCallback(() => {
    gestureState.current = {
      isGesturing: false,
      gestureType: 'none',
      startTime: 0,
      lastPosition: { x: 0, y: 0 },
      totalTranslation: { x: 0, y: 0 },
      velocity: { x: 0, y: 0 },
      scale: 1,
      rotation: 0,
    };

    // Reset animations
    Animated.parallel([
      Animated.spring(animationValues.current.translateX, { toValue: 0, useNativeDriver: true }),
      Animated.spring(animationValues.current.translateY, { toValue: 0, useNativeDriver: true }),
      Animated.spring(animationValues.current.scale, { toValue: 1, useNativeDriver: true }),
      Animated.spring(animationValues.current.rotation, { toValue: 0, useNativeDriver: true }),
    ]).start();
  }, []);

  // Create gesture responder config
  const createGestureResponder = useCallback(() => {
    return {
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (event: any) => {
        handleMultiTouchGesture(event);
      },
      onPanResponderMove: (event: any, gestureState: any) => {
        const mockEvent = {
          nativeEvent: {
            state: 2, // ACTIVE
            translationX: gestureState.dx,
            translationY: gestureState.dy,
            velocityX: gestureState.vx,
            velocityY: gestureState.vy,
          },
        };
        handlePanGesture(mockEvent);
      },
      onPanResponderRelease: (event: any, gestureState: any) => {
        const mockEvent = {
          nativeEvent: {
            state: 3, // END
            translationX: gestureState.dx,
            translationY: gestureState.dy,
            velocityX: gestureState.vx,
            velocityY: gestureState.vy,
          },
        };
        handlePanGesture(mockEvent);
      },
    };
  }, [handlePanGesture, handleMultiTouchGesture]);

  return {
    // Gesture handlers
    handlePanGesture,
    handlePinchGesture,
    handleRotationGesture,
    handleMultiTouchGesture,
    
    // Animation values
    animationValues: animationValues.current,
    
    // State queries
    getCurrentGestureState,
    isGesturing,
    
    // Utilities
    resetGestures,
    createGestureResponder,
    
    // Configuration
    gestureConfig: defaultConfig,
    
    // Screen info
    screenDimensions: screenDimensions.current,
  };
};

export default useMobileGestures;