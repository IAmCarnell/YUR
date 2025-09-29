# YUR Framework Frontend with Electron

This directory contains the React TypeScript frontend application with Electron desktop app integration.

## 🚀 Quick Start

### Web Development
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

### Desktop App (Electron)

#### Development Mode
```bash
# Start Electron app with hot reload
npm run electron:dev
```

This will:
1. Build the Electron TypeScript files
2. Start the Vite dev server 
3. Launch Electron pointing to the dev server

#### Production Build

##### Windows .exe
```bash
# Build Windows 64-bit executable
npm run build:win
```

This creates a Windows installer in `dist-electron-packaged/`

##### All Platforms
```bash
# Build for all supported platforms
npm run dist
```

## 📁 Project Structure

```
frontend/
├── src/
│   ├── main.ts          # Electron main process
│   ├── preload.ts       # Electron preload script
│   ├── App.tsx          # React app entry point
│   └── ...              # React components and utilities
├── dist/                # Built React app (production)
├── dist-electron/       # Built Electron files
├── assets/              # App icons and resources
├── package.json         # Dependencies and scripts
├── vite.config.ts       # Vite configuration
└── tsconfig.electron.json # TypeScript config for Electron
```

## 🛠 Available Scripts

### Development
- `npm run dev` - Start Vite dev server
- `npm run electron:dev` - Start Electron app in development mode

### Building
- `npm run build` - Build React app for production
- `npm run build:electron` - Compile Electron TypeScript files
- `npm run build:win` - Build Windows .exe installer
- `npm run dist` - Build for all platforms

### Testing & Quality
- `npm run test` - Run unit tests
- `npm run test:e2e` - Run end-to-end tests
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues

## 🔧 Electron Configuration

The Electron app is configured via the `build` section in `package.json`:

- **App ID**: `com.yuros.app`
- **Product Name**: YUR OS
- **Windows Target**: NSIS installer (64-bit)
- **Output Directory**: `dist-electron-packaged/`

### Icons
Place your app icons in the `assets/` directory:
- `icon.png` - Linux (1024x1024)
- `icon.ico` - Windows
- `icon.icns` - macOS

## 🎯 Build Output

After running `npm run build:win`, you'll find:
- `dist-electron-packaged/YUR OS Setup.exe` - Windows installer
- Unpacked app files for development/testing

## 🚧 Troubleshooting

### Linux Development Issues
If you encounter sandbox issues on Linux, the app automatically uses `--no-sandbox` flag.

### Module Issues
The Electron files are compiled to CommonJS (`.cjs`) to avoid ES module conflicts with the React app's ES module setup.

### Build Requirements
- Node.js 18+
- For Windows builds on non-Windows: Wine (optional, for better compatibility testing)

## 📚 Tech Stack

- **Frontend**: React 19 + TypeScript + Vite
- **Desktop**: Electron with TypeScript
- **Bundler**: electron-builder
- **Styling**: Material-UI + Emotion
- **3D Graphics**: Three.js + React Three Fiber
- **Testing**: Vitest + Playwright