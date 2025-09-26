/**
 * Mobile Accessibility Hook
 * Provides comprehensive accessibility features for mobile UI components
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { 
  AccessibilityInfo, 
  Dimensions, 
  Platform,
  Settings,
} from 'react-native';
import { Haptics, HapticFeedbackStyle } from 'expo-haptics';

interface AccessibilityState {
  isScreenReaderEnabled: boolean;
  isReduceMotionEnabled: boolean;
  isReduceTransparencyEnabled: boolean;
  isInvertColorsEnabled: boolean;
  isHighContrastEnabled: boolean;
  preferredContentSizeCategory: string;
  touchExplorationEnabled: boolean;
}

interface AccessibilityAnnouncement {
  message: string;
  priority: 'low' | 'medium' | 'high';
  delay?: number;
}

interface AccessibilityFocus {
  elementId: string;
  announcement?: string;
  hapticFeedback?: boolean;
}

export const useAccessibility = () => {
  const [accessibilityState, setAccessibilityState] = useState<AccessibilityState>({
    isScreenReaderEnabled: false,
    isReduceMotionEnabled: false,
    isReduceTransparencyEnabled: false,
    isInvertColorsEnabled: false,
    isHighContrastEnabled: false,
    preferredContentSizeCategory: 'medium',
    touchExplorationEnabled: false,
  });

  const [isVoiceOverRunning, setIsVoiceOverRunning] = useState(false);
  const [isTalkBackRunning, setIsTalkBackRunning] = useState(false);
  const [screenReaderChanged, setScreenReaderChanged] = useState(false);

  // Announcement queue to prevent overwhelming screen readers
  const announcementQueue = useRef<AccessibilityAnnouncement[]>([]);
  const isProcessingAnnouncements = useRef(false);

  // Initialize accessibility state
  useEffect(() => {
    const initAccessibility = async () => {
      try {
        // Check screen reader status
        const screenReaderEnabled = await AccessibilityInfo.isScreenReaderEnabled();
        setAccessibilityState(prev => ({ 
          ...prev, 
          isScreenReaderEnabled: screenReaderEnabled 
        }));

        // Platform-specific checks
        if (Platform.OS === 'ios') {
          const voiceOverEnabled = await AccessibilityInfo.isScreenReaderEnabled();
          setIsVoiceOverRunning(voiceOverEnabled);
        } else if (Platform.OS === 'android') {
          const talkBackEnabled = await AccessibilityInfo.isScreenReaderEnabled();
          setIsTalkBackRunning(talkBackEnabled);
          
          // Check for TalkBack-specific features
          const touchExplorationEnabled = await AccessibilityInfo.isTouchExplorationEnabled?.() || false;
          setAccessibilityState(prev => ({ 
            ...prev, 
            touchExplorationEnabled 
          }));
        }

        // Check reduce motion preference
        if (Platform.OS === 'ios') {
          const reduceMotionEnabled = await AccessibilityInfo.isReduceMotionEnabled?.() || false;
          setAccessibilityState(prev => ({ 
            ...prev, 
            isReduceMotionEnabled: reduceMotionEnabled 
          }));
        }

        // Check other accessibility preferences (iOS specific)
        if (Platform.OS === 'ios') {
          try {
            const reduceTransparencyEnabled = await AccessibilityInfo.isReduceTransparencyEnabled?.() || false;
            const invertColorsEnabled = await AccessibilityInfo.isInvertColorsEnabled?.() || false;
            
            setAccessibilityState(prev => ({
              ...prev,
              isReduceTransparencyEnabled: reduceTransparencyEnabled,
              isInvertColorsEnabled: invertColorsEnabled,
            }));
          } catch (error) {
            console.warn('Some accessibility features not available:', error);
          }
        }

      } catch (error) {
        console.error('Error initializing accessibility:', error);
      }
    };

    initAccessibility();
  }, []);

  // Listen for accessibility changes
  useEffect(() => {
    const screenReaderChangedSubscription = AccessibilityInfo.addEventListener(
      'screenReaderChanged',
      (enabled: boolean) => {
        setAccessibilityState(prev => ({ 
          ...prev, 
          isScreenReaderEnabled: enabled 
        }));
        setScreenReaderChanged(true);
        
        if (Platform.OS === 'ios') {
          setIsVoiceOverRunning(enabled);
        } else if (Platform.OS === 'android') {
          setIsTalkBackRunning(enabled);
        }
        
        // Announce when screen reader state changes
        if (enabled) {
          setTimeout(() => {
            announceForAccessibility('Screen reader enabled');
          }, 1000);
        }
      }
    );

    const reduceMotionChangedSubscription = Platform.OS === 'ios' 
      ? AccessibilityInfo.addEventListener('reduceMotionChanged', (enabled: boolean) => {
          setAccessibilityState(prev => ({ 
            ...prev, 
            isReduceMotionEnabled: enabled 
          }));
        })
      : null;

    const announceForAccessibilityCompletedSubscription = AccessibilityInfo.addEventListener(
      'announcementFinished',
      ({ announcement, success }) => {
        console.log(`Accessibility announcement ${success ? 'completed' : 'failed'}: ${announcement}`);
      }
    );

    return () => {
      screenReaderChangedSubscription?.remove();
      reduceMotionChangedSubscription?.remove();
      announceForAccessibilityCompletedSubscription?.remove();
    };
  }, []);

  // Process announcement queue
  useEffect(() => {
    if (!isProcessingAnnouncements.current && announcementQueue.current.length > 0) {
      processAnnouncementQueue();
    }
  }, [announcementQueue.current.length]);

  const processAnnouncementQueue = useCallback(async () => {
    if (isProcessingAnnouncements.current || announcementQueue.current.length === 0) {
      return;
    }

    isProcessingAnnouncements.current = true;

    while (announcementQueue.current.length > 0) {
      const announcement = announcementQueue.current.shift();
      if (announcement) {
        try {
          AccessibilityInfo.announceForAccessibility(announcement.message);
          
          // Wait before next announcement to prevent overlap
          const delay = announcement.delay || 
            (announcement.priority === 'high' ? 100 : 
             announcement.priority === 'medium' ? 500 : 1000);
          
          await new Promise(resolve => setTimeout(resolve, delay));
        } catch (error) {
          console.error('Error making accessibility announcement:', error);
        }
      }
    }

    isProcessingAnnouncements.current = false;
  }, []);

  // Make accessibility announcement
  const announceForAccessibility = useCallback((
    message: string, 
    priority: 'low' | 'medium' | 'high' = 'medium',
    delay?: number
  ) => {
    if (!accessibilityState.isScreenReaderEnabled) {
      return;
    }

    // Add to queue for controlled announcement
    announcementQueue.current.push({
      message,
      priority,
      delay,
    });

    // Trigger queue processing
    if (!isProcessingAnnouncements.current) {
      processAnnouncementQueue();
    }
  }, [accessibilityState.isScreenReaderEnabled, processAnnouncementQueue]);

  // Set accessibility focus
  const setAccessibilityFocus = useCallback((
    elementRef: any,
    options: { announcement?: string; hapticFeedback?: boolean } = {}
  ) => {
    if (!accessibilityState.isScreenReaderEnabled || !elementRef) {
      return;
    }

    try {
      AccessibilityInfo.setAccessibilityFocus(elementRef);
      
      if (options.announcement) {
        announceForAccessibility(options.announcement);
      }
      
      if (options.hapticFeedback) {
        Haptics.impactAsync(HapticFeedbackStyle.Light);
      }
    } catch (error) {
      console.error('Error setting accessibility focus:', error);
    }
  }, [accessibilityState.isScreenReaderEnabled, announceForAccessibility]);

  // Get accessible text size multiplier
  const getTextSizeMultiplier = useCallback(() => {
    // This would integrate with system text size settings
    // For now, return a simple mapping
    const sizeMapping: { [key: string]: number } = {
      'extra-small': 0.8,
      'small': 0.9,
      'medium': 1.0,
      'large': 1.2,
      'extra-large': 1.4,
      'huge': 1.6,
    };
    
    return sizeMapping[accessibilityState.preferredContentSizeCategory] || 1.0;
  }, [accessibilityState.preferredContentSizeCategory]);

  // Get accessible touch target size
  const getAccessibleTouchTargetSize = useCallback((baseSize: number = 44) => {
    // Ensure minimum 44pt touch target for accessibility
    const minSize = 44;
    const multiplier = getTextSizeMultiplier();
    
    return Math.max(minSize, baseSize * multiplier);
  }, [getTextSizeMultiplier]);

  // Check if animations should be reduced
  const shouldReduceMotion = useCallback(() => {
    return accessibilityState.isReduceMotionEnabled || 
           accessibilityState.isScreenReaderEnabled; // Conservative approach
  }, [accessibilityState.isReduceMotionEnabled, accessibilityState.isScreenReaderEnabled]);

  // Get animation duration based on accessibility preferences
  const getAccessibleAnimationDuration = useCallback((defaultDuration: number) => {
    if (shouldReduceMotion()) {
      return Math.min(defaultDuration * 0.5, 200); // Reduce by half, max 200ms
    }
    return defaultDuration;
  }, [shouldReduceMotion]);

  // Generate accessibility props for common UI elements
  const getAccessibilityProps = useCallback((
    label: string,
    options: {
      role?: string;
      hint?: string;
      state?: object;
      value?: string;
      actions?: Array<{ name: string; label: string }>;
    } = {}
  ) => {
    const props: any = {
      accessible: true,
      accessibilityLabel: label,
    };

    if (options.role) {
      props.accessibilityRole = options.role;
    }

    if (options.hint) {
      props.accessibilityHint = options.hint;
    }

    if (options.state) {
      props.accessibilityState = options.state;
    }

    if (options.value) {
      props.accessibilityValue = { text: options.value };
    }

    if (options.actions && options.actions.length > 0) {
      props.accessibilityActions = options.actions.map(action => ({
        name: action.name,
        label: action.label,
      }));
    }

    return props;
  }, []);

  // Create accessible gesture handler
  const createAccessibleGestureHandler = useCallback((
    onPress: () => void,
    options: {
      longPressEnabled?: boolean;
      onLongPress?: () => void;
      gestureDescription?: string;
    } = {}
  ) => {
    return {
      onPress: () => {
        if (accessibilityState.isScreenReaderEnabled && options.gestureDescription) {
          announceForAccessibility(options.gestureDescription);
        }
        onPress();
      },
      onLongPress: options.longPressEnabled && options.onLongPress ? () => {
        if (accessibilityState.isScreenReaderEnabled) {
          announceForAccessibility('Long press activated');
          Haptics.impactAsync(HapticFeedbackStyle.Heavy);
        }
        options.onLongPress!();
      } : undefined,
    };
  }, [accessibilityState.isScreenReaderEnabled, announceForAccessibility]);

  // Check if high contrast is needed
  const needsHighContrast = useCallback(() => {
    return accessibilityState.isHighContrastEnabled || 
           accessibilityState.isInvertColorsEnabled;
  }, [accessibilityState.isHighContrastEnabled, accessibilityState.isInvertColorsEnabled]);

  // Get color with accessibility adjustments
  const getAccessibleColor = useCallback((
    normalColor: string,
    highContrastColor?: string
  ) => {
    if (needsHighContrast() && highContrastColor) {
      return highContrastColor;
    }
    return normalColor;
  }, [needsHighContrast]);

  return {
    // State
    ...accessibilityState,
    isVoiceOverRunning,
    isTalkBackRunning,
    screenReaderChanged,

    // Functions
    announceForAccessibility,
    setAccessibilityFocus,
    getTextSizeMultiplier,
    getAccessibleTouchTargetSize,
    shouldReduceMotion,
    getAccessibleAnimationDuration,
    getAccessibilityProps,
    createAccessibleGestureHandler,
    needsHighContrast,
    getAccessibleColor,

    // Platform info
    platform: Platform.OS,
    screenDimensions: Dimensions.get('window'),
  };
};

export default useAccessibility;