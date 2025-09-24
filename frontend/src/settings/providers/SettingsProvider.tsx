import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react'
import { AppSettings, DEFAULT_SETTINGS, SettingsCategory } from '../types'
import { loadSettings, saveSettings } from '../utils/storage'

interface SettingsContextType {
  settings: AppSettings
  updateSetting: <T extends SettingsCategory>(
    category: T,
    key: keyof AppSettings[T],
    value: AppSettings[T][keyof AppSettings[T]]
  ) => void
  updateCategory: <T extends SettingsCategory>(category: T, values: Partial<AppSettings[T]>) => void
  resetSettings: () => void
  exportSettings: () => string
  importSettings: (settingsJson: string) => boolean
}

interface SettingsAction {
  type: 'SET_SETTING' | 'SET_CATEGORY' | 'RESET' | 'LOAD'
  payload?: any
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined)

function settingsReducer(state: AppSettings, action: SettingsAction): AppSettings {
  switch (action.type) {
    case 'SET_SETTING': {
      const { category, key, value } = action.payload
      return {
        ...state,
        [category]: {
          ...state[category],
          [key]: value,
        },
      }
    }
    case 'SET_CATEGORY': {
      const { category, values } = action.payload
      return {
        ...state,
        [category]: {
          ...state[category],
          ...values,
        },
      }
    }
    case 'RESET':
      return DEFAULT_SETTINGS
    case 'LOAD':
      return action.payload || DEFAULT_SETTINGS
    default:
      return state
  }
}

interface SettingsProviderProps {
  children: ReactNode
}

export const SettingsProvider: React.FC<SettingsProviderProps> = ({ children }) => {
  const [settings, dispatch] = useReducer(settingsReducer, DEFAULT_SETTINGS)

  // Load settings from localStorage on mount
  useEffect(() => {
    const loadedSettings = loadSettings()
    if (loadedSettings) {
      dispatch({ type: 'LOAD', payload: loadedSettings })
    }
  }, [])

  // Save settings to localStorage whenever they change
  useEffect(() => {
    saveSettings(settings)
  }, [settings])

  const updateSetting = <T extends SettingsCategory>(
    category: T,
    key: keyof AppSettings[T],
    value: AppSettings[T][keyof AppSettings[T]]
  ) => {
    dispatch({
      type: 'SET_SETTING',
      payload: { category, key, value },
    })
  }

  const updateCategory = <T extends SettingsCategory>(
    category: T,
    values: Partial<AppSettings[T]>
  ) => {
    dispatch({
      type: 'SET_CATEGORY',
      payload: { category, values },
    })
  }

  const resetSettings = () => {
    dispatch({ type: 'RESET' })
  }

  const exportSettings = (): string => {
    return JSON.stringify(settings, null, 2)
  }

  const importSettings = (settingsJson: string): boolean => {
    try {
      const parsedSettings = JSON.parse(settingsJson)
      // Validate the settings structure
      if (typeof parsedSettings === 'object' && parsedSettings !== null) {
        dispatch({ type: 'LOAD', payload: parsedSettings })
        return true
      }
      return false
    } catch (error) {
      console.error('Failed to import settings:', error)
      return false
    }
  }

  const contextValue: SettingsContextType = {
    settings,
    updateSetting,
    updateCategory,
    resetSettings,
    exportSettings,
    importSettings,
  }

  return (
    <SettingsContext.Provider value={contextValue}>
      {children}
    </SettingsContext.Provider>
  )
}

export const useSettings = (): SettingsContextType => {
  const context = useContext(SettingsContext)
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider')
  }
  return context
}