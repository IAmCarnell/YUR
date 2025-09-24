import { AppSettings, DEFAULT_SETTINGS } from '../types'

const SETTINGS_STORAGE_KEY = 'yur-framework-settings'

/**
 * Load settings from localStorage
 */
export const loadSettings = (): AppSettings | null => {
  try {
    const storedSettings = localStorage.getItem(SETTINGS_STORAGE_KEY)
    if (storedSettings) {
      const parsedSettings = JSON.parse(storedSettings)
      // Merge with default settings to handle missing keys in stored settings
      return mergeWithDefaults(parsedSettings)
    }
  } catch (error) {
    console.error('Failed to load settings from localStorage:', error)
  }
  return null
}

/**
 * Save settings to localStorage
 */
export const saveSettings = (settings: AppSettings): void => {
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings))
  } catch (error) {
    console.error('Failed to save settings to localStorage:', error)
  }
}

/**
 * Clear settings from localStorage
 */
export const clearSettings = (): void => {
  try {
    localStorage.removeItem(SETTINGS_STORAGE_KEY)
  } catch (error) {
    console.error('Failed to clear settings from localStorage:', error)
  }
}

/**
 * Merge loaded settings with default settings to handle missing keys
 */
const mergeWithDefaults = (loadedSettings: any): AppSettings => {
  const merged = { ...DEFAULT_SETTINGS }
  
  for (const category in DEFAULT_SETTINGS) {
    if (loadedSettings[category] && typeof loadedSettings[category] === 'object') {
      merged[category as keyof AppSettings] = {
        ...DEFAULT_SETTINGS[category as keyof AppSettings],
        ...loadedSettings[category],
      }
    }
  }
  
  return merged
}

/**
 * Validate settings structure
 */
export const validateSettings = (settings: any): boolean => {
  if (!settings || typeof settings !== 'object') {
    return false
  }

  const requiredCategories = ['imageQuality', 'conversation', 'notifications', 'display', 'performance', 'advanced']
  
  for (const category of requiredCategories) {
    if (!settings[category] || typeof settings[category] !== 'object') {
      return false
    }
  }

  return true
}