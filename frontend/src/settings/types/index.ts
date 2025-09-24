// Settings Types and Interfaces for YUR Framework

export interface ImageQualitySettings {
  resolution: 'low' | 'medium' | 'high' | 'ultra'
  compression: number // 0-100
  format: 'png' | 'jpg' | 'webp'
  antiAliasing: boolean
}

export interface ConversationSettings {
  maxMessages: number
  responseTimeout: number // milliseconds
  autoSave: boolean
  historyRetention: number // days
}

export interface NotificationSettings {
  enabled: boolean
  soundEnabled: boolean
  desktopNotifications: boolean
  emailNotifications: boolean
  simulationComplete: boolean
  errorAlerts: boolean
  systemUpdates: boolean
}

export interface DisplaySettings {
  theme: 'dark' | 'light' | 'auto'
  fontSize: 'small' | 'medium' | 'large'
  reducedMotion: boolean
  highContrast: boolean
  compactMode: boolean
}

export interface PerformanceSettings {
  computeMode: 'desktop' | 'gpu' | 'distributed' | 'quantum'
  maxDimensions: number
  backend: 'numpy' | 'tensorflow' | 'pytorch' | 'jax'
  enableParallelProcessing: boolean
  memoryLimit: number // MB
  timeoutDuration: number // seconds
}

export interface AdvancedSettings {
  enableExperimentalFeatures: boolean
  debugMode: boolean
  apiEndpoint: string
  logLevel: 'error' | 'warn' | 'info' | 'debug'
  autoUpdate: boolean
  telemetryEnabled: boolean
}

export interface AppSettings {
  imageQuality: ImageQualitySettings
  conversation: ConversationSettings
  notifications: NotificationSettings
  display: DisplaySettings
  performance: PerformanceSettings
  advanced: AdvancedSettings
}

export const DEFAULT_SETTINGS: AppSettings = {
  imageQuality: {
    resolution: 'high',
    compression: 85,
    format: 'png',
    antiAliasing: true,
  },
  conversation: {
    maxMessages: 100,
    responseTimeout: 30000,
    autoSave: true,
    historyRetention: 30,
  },
  notifications: {
    enabled: true,
    soundEnabled: true,
    desktopNotifications: true,
    emailNotifications: false,
    simulationComplete: true,
    errorAlerts: true,
    systemUpdates: true,
  },
  display: {
    theme: 'dark',
    fontSize: 'medium',
    reducedMotion: false,
    highContrast: false,
    compactMode: false,
  },
  performance: {
    computeMode: 'desktop',
    maxDimensions: 1000,
    backend: 'numpy',
    enableParallelProcessing: true,
    memoryLimit: 2048,
    timeoutDuration: 300,
  },
  advanced: {
    enableExperimentalFeatures: false,
    debugMode: false,
    apiEndpoint: 'http://localhost:8000',
    logLevel: 'info',
    autoUpdate: true,
    telemetryEnabled: true,
  },
}

export type SettingsCategory = keyof AppSettings
export type SettingsKey<T extends SettingsCategory> = keyof AppSettings[T]