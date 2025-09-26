/**
 * Mobile-optimized Mandala Node Component
 * Touch-optimized circular navigation with gesture support and haptic feedback
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  View, 
  Pressable, 
  Animated, 
  PanGestureHandler,
  PinchGestureHandler,
  RotationGestureHandler,
  TapGestureHandler,
  State,
  GestureHandlerRootView
} from 'react-native';
import { Haptics, HapticFeedbackStyle } from 'expo-haptics';
import { useAccessibility } from '../hooks/useAccessibility';
import { useMobileGestures } from '../hooks/useMobileGestures';
import styles from '../styles/MobileMandalaStyles';

interface MobileMandalaNodeProps {
  id: string;
  title: string;
  icon?: string;
  position: { x: number; y: number; angle: number };
  size: number;
  isActive: boolean;
  isAccessible?: boolean;
  onPress: (nodeId: string) => void;
  onLongPress?: (nodeId: string) => void;
  onGesture?: (nodeId: string, gesture: string, data: any) => void;
  children?: React.ReactNode;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  testID?: string;
}

interface GestureState {
  scale: Animated.Value;
  rotation: Animated.Value;
  translateX: Animated.Value;
  translateY: Animated.Value;
  opacity: Animated.Value;
}

export const MobileMandalaNode: React.FC<MobileMandalaNodeProps> = ({
  id,
  title,
  icon,
  position,
  size,
  isActive,
  isAccessible = true,
  onPress,
  onLongPress,
  onGesture,
  children,
  accessibilityLabel,
  accessibilityHint,
  testID,
}) => {
  const [gestureState] = useState<GestureState>(() => ({
    scale: new Animated.Value(1),
    rotation: new Animated.Value(0),
    translateX: new Animated.Value(0),
    translateY: new Animated.Value(0),
    opacity: new Animated.Value(1),
  }));

  const [isPressed, setIsPressed] = useState(false);
  const [isLongPressed, setIsLongPressed] = useState(false);

  // Gesture refs
  const panRef = useRef<PanGestureHandler>(null);
  const pinchRef = useRef<PinchGestureHandler>(null);
  const rotationRef = useRef<RotationGestureHandler>(null);
  const tapRef = useRef<TapGestureHandler>(null);

  const { announceForAccessibility, isScreenReaderEnabled } = useAccessibility();
  const { 
    handlePanGesture, 
    handlePinchGesture, 
    handleRotationGesture,
    gestureConfig 
  } = useMobileGestures();

  // Animation values
  const scaleAnimation = useRef(new Animated.Value(1)).current;
  const pressAnimation = useRef(new Animated.Value(0)).current;

  // Handle press feedback
  const handlePressIn = useCallback(() => {
    setIsPressed(true);
    
    // Haptic feedback
    Haptics.impactAsync(HapticFeedbackStyle.Light);
    
    // Visual feedback animation
    Animated.parallel([
      Animated.spring(scaleAnimation, {
        toValue: 0.95,
        useNativeDriver: true,
        tension: 300,
        friction: 10,
      }),
      Animated.timing(pressAnimation, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
  }, [scaleAnimation, pressAnimation]);

  const handlePressOut = useCallback(() => {
    setIsPressed(false);
    
    // Reset visual feedback
    Animated.parallel([
      Animated.spring(scaleAnimation, {
        toValue: 1,
        useNativeDriver: true,
        tension: 300,
        friction: 10,
      }),
      Animated.timing(pressAnimation, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
  }, [scaleAnimation, pressAnimation]);

  const handlePress = useCallback(() => {
    // Additional haptic feedback for selection
    Haptics.impactAsync(HapticFeedbackStyle.Medium);
    
    // Accessibility announcement
    if (isScreenReaderEnabled && accessibilityLabel) {
      announceForAccessibility(`${accessibilityLabel} selected`);
    }
    
    onPress(id);
  }, [id, onPress, isScreenReaderEnabled, accessibilityLabel, announceForAccessibility]);

  const handleLongPress = useCallback(() => {
    setIsLongPressed(true);
    
    // Strong haptic feedback for long press
    Haptics.impactAsync(HapticFeedbackStyle.Heavy);
    
    // Scale up animation for long press
    Animated.spring(scaleAnimation, {
      toValue: 1.1,
      useNativeDriver: true,
      tension: 200,
      friction: 8,
    }).start(() => {
      // Reset after animation
      Animated.spring(scaleAnimation, {
        toValue: 1,
        useNativeDriver: true,
      }).start();
      setIsLongPressed(false);
    });
    
    if (onLongPress) {
      onLongPress(id);
    }
  }, [id, onLongPress, scaleAnimation]);

  // Gesture handlers
  const onPanGestureEvent = useCallback((event: any) => {
    const { translationX, translationY, velocityX, velocityY } = event.nativeEvent;
    
    handlePanGesture(event);
    
    if (onGesture) {
      onGesture(id, 'pan', {
        translationX,
        translationY,
        velocityX,
        velocityY,
      });
    }
  }, [id, onGesture, handlePanGesture]);

  const onPinchGestureEvent = useCallback((event: any) => {
    const { scale, velocity } = event.nativeEvent;
    
    handlePinchGesture(event);
    
    if (onGesture) {
      onGesture(id, 'pinch', {
        scale,
        velocity,
      });
    }
  }, [id, onGesture, handlePinchGesture]);

  const onRotationGestureEvent = useCallback((event: any) => {
    const { rotation, velocity } = event.nativeEvent;
    
    handleRotationGesture(event);
    
    if (onGesture) {
      onGesture(id, 'rotation', {
        rotation,
        velocity,
      });
    }
  }, [id, onGesture, handleRotationGesture]);

  // Update position animation
  useEffect(() => {
    Animated.parallel([
      Animated.spring(gestureState.translateX, {
        toValue: position.x,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }),
      Animated.spring(gestureState.translateY, {
        toValue: position.y,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }),
    ]).start();
  }, [position.x, position.y, gestureState.translateX, gestureState.translateY]);

  // Active state animation
  useEffect(() => {
    Animated.timing(gestureState.opacity, {
      toValue: isActive ? 1 : 0.7,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [isActive, gestureState.opacity]);

  const nodeStyle = [
    styles.mandalaNode,
    {
      width: size,
      height: size,
      borderRadius: size / 2,
      transform: [
        { translateX: gestureState.translateX },
        { translateY: gestureState.translateY },
        { scale: scaleAnimation },
        { rotate: gestureState.rotation },
      ] as any,
      opacity: gestureState.opacity,
    },
    isActive && styles.activeNode,
    isPressed && styles.pressedNode,
    isLongPressed && styles.longPressedNode,
  ];

  const pressableStyle = [
    styles.pressableArea,
    {
      width: size + 20, // Larger touch target
      height: size + 20,
      borderRadius: (size + 20) / 2,
    },
  ];

  return (
    <GestureHandlerRootView style={styles.gestureContainer}>
      <PinchGestureHandler
        ref={pinchRef}
        onGestureEvent={onPinchGestureEvent}
        onHandlerStateChange={onPinchGestureEvent}
        simultaneousHandlers={[panRef, rotationRef]}
      >
        <Animated.View>
          <RotationGestureHandler
            ref={rotationRef}
            onGestureEvent={onRotationGestureEvent}
            onHandlerStateChange={onRotationGestureEvent}
            simultaneousHandlers={[panRef, pinchRef]}
          >
            <Animated.View>
              <PanGestureHandler
                ref={panRef}
                onGestureEvent={onPanGestureEvent}
                onHandlerStateChange={onPanGestureEvent}
                simultaneousHandlers={[pinchRef, rotationRef]}
                minPointers={1}
                maxPointers={1}
              >
                <Animated.View>
                  <TapGestureHandler
                    ref={tapRef}
                    onHandlerStateChange={({ nativeEvent }) => {
                      if (nativeEvent.state === State.ACTIVE) {
                        handlePress();
                      }
                    }}
                    numberOfTaps={1}
                  >
                    <Animated.View style={nodeStyle}>
                      <Pressable
                        style={pressableStyle}
                        onPressIn={handlePressIn}
                        onPressOut={handlePressOut}
                        onPress={handlePress}
                        onLongPress={handleLongPress}
                        accessible={isAccessible}
                        accessibilityLabel={accessibilityLabel || title}
                        accessibilityHint={accessibilityHint || `Double tap to activate ${title}`}
                        accessibilityRole="button"
                        accessibilityState={{
                          selected: isActive,
                          disabled: false,
                        }}
                        testID={testID || `mandala-node-${id}`}
                      >
                        <View style={styles.nodeContent}>
                          {icon && (
                            <View style={styles.iconContainer}>
                              <Text style={styles.icon}>{icon}</Text>
                            </View>
                          )}
                          
                          <View style={styles.titleContainer}>
                            <Text 
                              style={[
                                styles.nodeTitle,
                                isActive && styles.activeTitleText,
                              ]}
                              numberOfLines={2}
                              adjustsFontSizeToFit
                            >
                              {title}
                            </Text>
                          </View>
                          
                          {children && (
                            <View style={styles.childrenContainer}>
                              {children}
                            </View>
                          )}
                          
                          {/* Visual feedback overlay */}
                          <Animated.View
                            style={[
                              styles.feedbackOverlay,
                              {
                                opacity: pressAnimation,
                              },
                            ]}
                          />
                          
                          {/* Active indicator */}
                          {isActive && (
                            <View style={styles.activeIndicator}>
                              <View style={styles.activeIndicatorDot} />
                            </View>
                          )}
                        </View>
                      </Pressable>
                    </Animated.View>
                  </TapGestureHandler>
                </Animated.View>
              </PanGestureHandler>
            </Animated.View>
          </RotationGestureHandler>
        </Animated.View>
      </PinchGestureHandler>
    </GestureHandlerRootView>
  );
};

export default MobileMandalaNode;