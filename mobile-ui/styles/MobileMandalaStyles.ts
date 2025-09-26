/**
 * Mobile Mandala Styles
 * Comprehensive styling for mobile-optimized mandala components
 */

import { StyleSheet, Dimensions, Platform } from 'react-native';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const isIOS = Platform.OS === 'ios';
const isAndroid = Platform.OS === 'android';

// Design tokens
const colors = {
  // Primary colors
  primary: '#6366f1',
  primaryLight: '#818cf8',
  primaryDark: '#4f46e5',
  
  // Secondary colors
  secondary: '#f59e0b',
  secondaryLight: '#fbbf24',
  secondaryDark: '#d97706',
  
  // Neutral colors
  white: '#ffffff',
  black: '#000000',
  gray50: '#f9fafb',
  gray100: '#f3f4f6',
  gray200: '#e5e7eb',
  gray300: '#d1d5db',
  gray400: '#9ca3af',
  gray500: '#6b7280',
  gray600: '#4b5563',
  gray700: '#374151',
  gray800: '#1f2937',
  gray900: '#111827',
  
  // Status colors
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6',
  
  // Accessibility colors
  highContrast: '#000000',
  highContrastBg: '#ffffff',
  focusRing: '#3b82f6',
  
  // Transparency levels
  transparent: 'transparent',
  overlay: 'rgba(0, 0, 0, 0.5)',
  overlayLight: 'rgba(0, 0, 0, 0.3)',
  overlayHeavy: 'rgba(0, 0, 0, 0.7)',
};

const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
};

const typography = {
  fontSizes: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
    xxxl: 32,
  },
  fontWeights: {
    normal: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
  lineHeights: {
    tight: 1.2,
    normal: 1.4,
    relaxed: 1.6,
  },
};

const shadows = {
  sm: {
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  lg: {
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 15,
    elevation: 5,
  },
  xl: {
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.2,
    shadowRadius: 25,
    elevation: 8,
  },
};

const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 24,
  full: 9999,
};

export default StyleSheet.create({
  // Container styles
  gestureContainer: {
    flex: 1,
    position: 'relative',
  },

  // Mandala node styles
  mandalaNode: {
    position: 'absolute',
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.gray200,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    ...shadows.md,
  },

  activeNode: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
    ...shadows.lg,
    transform: [{ scale: 1.05 }],
  },

  pressedNode: {
    backgroundColor: colors.gray100,
    ...shadows.sm,
  },

  longPressedNode: {
    backgroundColor: colors.secondaryLight,
    borderColor: colors.secondary,
    ...shadows.xl,
  },

  // Pressable area (larger touch target)
  pressableArea: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    top: -10,
    left: -10,
  },

  // Node content layout
  nodeContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.sm,
    position: 'relative',
  },

  iconContainer: {
    marginBottom: spacing.xs,
    justifyContent: 'center',
    alignItems: 'center',
  },

  icon: {
    fontSize: typography.fontSizes.xl,
    color: colors.gray600,
  },

  titleContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: spacing.xs,
  },

  nodeTitle: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.medium,
    color: colors.gray700,
    textAlign: 'center',
    lineHeight: typography.lineHeights.tight,
  },

  activeTitleText: {
    color: colors.white,
    fontWeight: typography.fontWeights.semibold,
  },

  childrenContainer: {
    marginTop: spacing.xs,
    alignItems: 'center',
  },

  // Feedback overlay
  feedbackOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
    opacity: 0,
  },

  // Active indicator
  activeIndicator: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.success,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.sm,
  },

  activeIndicatorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.white,
  },

  // Mandala container styles
  mandalaContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.gray50,
    position: 'relative',
  },

  mandalaBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },

  mandalaCenter: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.lg,
  },

  mandalaCenterContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },

  mandalaCenterIcon: {
    fontSize: typography.fontSizes.xxl,
    color: colors.white,
  },

  mandalaCenterTitle: {
    fontSize: typography.fontSizes.xs,
    color: colors.white,
    fontWeight: typography.fontWeights.medium,
    marginTop: spacing.xs,
  },

  // Ring styles
  mandalaRing: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: colors.gray200,
    borderRadius: borderRadius.full,
    borderStyle: 'dashed',
  },

  // Navigation styles
  navigationContainer: {
    position: 'absolute',
    bottom: spacing.xl,
    left: spacing.md,
    right: spacing.md,
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    ...shadows.lg,
  },

  navigationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  navigationButton: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginHorizontal: spacing.xs,
    backgroundColor: colors.gray100,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 44, // Accessibility minimum
  },

  navigationButtonActive: {
    backgroundColor: colors.primary,
  },

  navigationButtonText: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.medium,
    color: colors.gray700,
  },

  navigationButtonTextActive: {
    color: colors.white,
  },

  // Screen styles
  screenContainer: {
    flex: 1,
    backgroundColor: colors.white,
  },

  screenHeader: {
    paddingTop: isIOS ? 44 : spacing.xl, // Status bar height
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    backgroundColor: colors.primary,
    ...shadows.sm,
  },

  screenTitle: {
    fontSize: typography.fontSizes.xxl,
    fontWeight: typography.fontWeights.bold,
    color: colors.white,
    textAlign: 'center',
  },

  screenContent: {
    flex: 1,
    padding: spacing.md,
  },

  // Accessibility styles
  accessibilityFocusRing: {
    borderWidth: 3,
    borderColor: colors.focusRing,
    borderRadius: borderRadius.md,
  },

  accessibilityHighContrast: {
    backgroundColor: colors.highContrastBg,
    borderColor: colors.highContrast,
    borderWidth: 2,
  },

  accessibilityHighContrastText: {
    color: colors.highContrast,
    fontWeight: typography.fontWeights.bold,
  },

  accessibilityLargeText: {
    fontSize: typography.fontSizes.lg,
    lineHeight: typography.lineHeights.relaxed,
  },

  // Gesture feedback styles
  gestureIndicator: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    pointerEvents: 'none',
  },

  gestureIndicatorIcon: {
    fontSize: typography.fontSizes.md,
    color: colors.white,
  },

  // Loading and state styles
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.gray50,
  },

  loadingSpinner: {
    marginBottom: spacing.md,
  },

  loadingText: {
    fontSize: typography.fontSizes.md,
    color: colors.gray600,
    textAlign: 'center',
  },

  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    backgroundColor: colors.gray50,
  },

  errorIcon: {
    fontSize: typography.fontSizes.xxxl,
    color: colors.error,
    marginBottom: spacing.md,
  },

  errorTitle: {
    fontSize: typography.fontSizes.xl,
    fontWeight: typography.fontWeights.bold,
    color: colors.gray900,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },

  errorMessage: {
    fontSize: typography.fontSizes.md,
    color: colors.gray600,
    textAlign: 'center',
    lineHeight: typography.lineHeights.relaxed,
    marginBottom: spacing.xl,
  },

  errorButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.lg,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },

  errorButtonText: {
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.semibold,
    color: colors.white,
  },

  // Responsive styles
  tablet: {
    // Styles for tablet screens
    mandalaNode: {
      minWidth: 100,
      minHeight: 100,
    },
    
    nodeTitle: {
      fontSize: typography.fontSizes.lg,
    },
    
    icon: {
      fontSize: typography.fontSizes.xxl,
    },
  },

  // Animation styles
  fadeIn: {
    opacity: 1,
  },

  fadeOut: {
    opacity: 0,
  },

  scaleIn: {
    transform: [{ scale: 1 }],
  },

  scaleOut: {
    transform: [{ scale: 0.8 }],
  },

  slideUp: {
    transform: [{ translateY: 0 }],
  },

  slideDown: {
    transform: [{ translateY: 20 }],
  },
});

// Export design tokens for use in other files
export const designTokens = {
  colors,
  spacing,
  typography,
  shadows,
  borderRadius,
  screenWidth,
  screenHeight,
  isIOS,
  isAndroid,
};