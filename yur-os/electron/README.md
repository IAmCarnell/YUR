# YUR OS Electron Desktop

Desktop wrapper for YUR OS using Electron, providing native OS integration and enhanced spatial computing capabilities.

## Features

- **Native Integration** - System tray, notifications, file system access
- **Enhanced Performance** - Hardware acceleration, memory optimization
- **Desktop Spatial Mode** - Multi-monitor mandala layouts
- **Offline Capabilities** - Local file storage and processing
- **System Integration** - Native menus, shortcuts, protocols

## Setup

```bash
npm install
npm run electron
```

## Architecture

```
/electron
  main.js           # Main Electron process
  preload.js        # Renderer preload script
  /src
    /main           # Main process modules
    /renderer       # Renderer process enhancements
  /build            # Build configuration
  package.json      # Electron app manifest
```

## Build Targets

- Windows (NSIS installer)
- macOS (DMG + App Store)
- Linux (AppImage, deb, rpm)

## Spatial Enhancements

- Multi-monitor mandala spanning
- Hardware-accelerated 3D rendering  
- Native VR/AR device integration
- Gesture recognition support
- Eye tracking compatibility

## Coming Soon

- Auto-updater integration
- Plugin system for spatial extensions
- Native AR/VR device support
- Advanced gesture controls