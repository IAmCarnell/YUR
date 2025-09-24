# Settings Module Documentation

The YUR Framework Settings Module provides a comprehensive settings management system for configuring various aspects of the application, from image quality and performance settings to notifications and advanced developer options.

## Overview

The settings system is built using React Context for state management and localStorage for persistence. It provides a centralized way to manage user preferences across the entire application.

## Architecture

### Core Components

- **SettingsProvider**: React Context provider that manages global settings state
- **SettingsPage**: Main UI for configuring all settings
- **Individual Setting Components**: Specialized components for different setting categories
- **Storage Utilities**: Functions for persisting settings to localStorage

### Directory Structure

```
frontend/src/settings/
├── types/
│   └── index.ts              # TypeScript interfaces and types
├── providers/
│   └── SettingsProvider.tsx  # React Context provider
├── components/
│   ├── SettingsPage.tsx      # Main settings UI
│   ├── ImageQualitySettings.tsx
│   ├── ConversationSettings.tsx
│   ├── NotificationSettings.tsx
│   ├── DisplaySettings.tsx
│   ├── PerformanceSettings.tsx
│   ├── AdvancedSettings.tsx
│   └── index.ts              # Component exports
├── utils/
│   └── storage.ts            # localStorage utilities
└── index.ts                  # Main module exports
```

## Settings Categories

### 1. Image Quality Settings

Controls how images are processed and displayed in visualizations:

- **Resolution**: Low, Medium, High, Ultra
- **Compression**: 10-100% quality level
- **Format**: PNG, JPEG, WebP
- **Anti-Aliasing**: Boolean toggle

### 2. Conversation Settings

Manages conversation limits and data handling:

- **Max Messages**: Number of messages to keep in memory
- **Response Timeout**: API request timeout duration
- **Auto Save**: Automatic conversation persistence
- **History Retention**: How long to keep conversation history

### 3. Notification Settings

Controls when and how notifications are displayed:

- **General**: Enable/disable all notifications
- **Sound**: Audio notifications
- **Desktop**: Browser notifications
- **Email**: Email notifications (requires configuration)
- **Event-specific**: Simulation complete, errors, system updates

### 4. Display Settings

Appearance and accessibility options:

- **Theme**: Dark, Light, Auto (system)
- **Font Size**: Small, Medium, Large
- **Reduced Motion**: Minimize animations
- **High Contrast**: Accessibility mode
- **Compact Mode**: Reduced spacing

### 5. Performance Settings

Computational resources and optimization:

- **Compute Mode**: Desktop, GPU, Distributed, Quantum
- **Backend**: NumPy, TensorFlow, PyTorch, JAX
- **Max Dimensions**: Simulation size limits
- **Memory Limit**: Memory usage cap
- **Timeout Duration**: Maximum computation time
- **Parallel Processing**: Enable/disable parallelization

### 6. Advanced Settings

Developer and system-level configuration:

- **Experimental Features**: Beta functionality
- **Debug Mode**: Enhanced logging
- **API Endpoint**: Backend server URL
- **Log Level**: Error, Warning, Info, Debug
- **Auto Update**: Framework updates
- **Telemetry**: Anonymous usage data

## Usage

### Basic Integration

```tsx
import { SettingsProvider, useSettings } from './settings'

// Wrap your app with the provider
function App() {
  return (
    <SettingsProvider>
      <YourApp />
    </SettingsProvider>
  )
}

// Use settings in components
function MyComponent() {
  const { settings, updateSetting } = useSettings()
  
  return (
    <button onClick={() => updateSetting('display', 'theme', 'light')}>
      Switch to Light Theme
    </button>
  )
}
```

### Settings Context API

The `useSettings` hook provides:

- `settings`: Current settings object
- `updateSetting(category, key, value)`: Update individual setting
- `updateCategory(category, values)`: Update multiple settings in a category
- `resetSettings()`: Reset all settings to defaults
- `exportSettings()`: Export settings as JSON string
- `importSettings(json)`: Import settings from JSON string

### Type Safety

All settings are fully typed with TypeScript:

```tsx
import { AppSettings, SettingsCategory } from './settings'

// Type-safe setting updates
updateSetting('performance', 'computeMode', 'gpu') // ✓ Valid
updateSetting('performance', 'invalidKey', 'value') // ✗ Type error
```

## Persistence

Settings are automatically saved to localStorage whenever they change. The storage key is `yur-framework-settings`.

### Storage Functions

- `loadSettings()`: Load settings from localStorage
- `saveSettings(settings)`: Save settings to localStorage
- `clearSettings()`: Remove settings from localStorage
- `validateSettings(settings)`: Validate settings structure

## Import/Export

Users can export their settings as JSON and import them later or share with others:

```json
{
  "imageQuality": {
    "resolution": "high",
    "compression": 85,
    "format": "png",
    "antiAliasing": true
  },
  "conversation": {
    "maxMessages": 100,
    "responseTimeout": 30000,
    "autoSave": true,
    "historyRetention": 30
  }
  // ... other categories
}
```

## Default Settings

All settings have sensible defaults optimized for most use cases:

- Image quality: High resolution, PNG format
- Performance: Desktop mode with NumPy backend
- Display: Dark theme, medium font size
- Notifications: Enabled with sound and desktop alerts

## Extending Settings

To add new settings:

1. Update the TypeScript interfaces in `types/index.ts`
2. Add default values to `DEFAULT_SETTINGS`
3. Create or update the relevant settings component
4. Add the setting to the appropriate settings category UI

## Testing

The settings system includes:

- Type safety through TypeScript
- Default value validation
- localStorage error handling
- Settings structure validation for imports

## Best Practices

1. **Use the settings context**: Don't access localStorage directly
2. **Update settings properly**: Use the provided update functions
3. **Validate imports**: Always validate settings when importing
4. **Handle errors gracefully**: Settings operations may fail
5. **Test with different values**: Ensure your code works with all setting combinations

## Future Enhancements

Potential improvements for the settings system:

- Cloud synchronization
- User profiles and presets
- Advanced validation rules
- Settings migration system
- Real-time settings sync across tabs
- Settings history and rollback