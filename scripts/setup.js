const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

console.log('🚀 Setting up YUR Framework...\n')

// Check Node.js version
const nodeVersion = process.version
const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0])
if (majorVersion < 18) {
  console.error('❌ Node.js 18 or higher is required')
  process.exit(1)
}
console.log('✅ Node.js version check passed')

// Check Python version
try {
  const pythonVersion = execSync('python --version', { encoding: 'utf8' })
  console.log('✅ Python detected:', pythonVersion.trim())
} catch (error) {
  try {
    const python3Version = execSync('python3 --version', { encoding: 'utf8' })
    console.log('✅ Python3 detected:', python3Version.trim())
  } catch (error) {
    console.error('❌ Python 3.8+ is required')
    process.exit(1)
  }
}

// Create necessary directories
const directories = [
  'data',
  'logs',
  'exports',
  'uploads',
  'backend/logs',
  'frontend/dist'
]

directories.forEach(dir => {
  const fullPath = path.join(__dirname, '..', dir)
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true })
    console.log('📁 Created directory:', dir)
  }
})

// Create environment files if they don't exist
const envFiles = [
  {
    path: 'frontend/.env',
    content: `VITE_API_URL=http://localhost:8000
VITE_APP_TITLE=YUR Framework
VITE_APP_VERSION=1.0.0`
  },
  {
    path: 'backend/.env',
    content: `DEBUG=true
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
LOG_LEVEL=INFO
MAX_DIMENSIONS=10000
ENABLE_BCI=false`
  }
]

envFiles.forEach(({ path: filePath, content }) => {
  const fullPath = path.join(__dirname, '..', filePath)
  if (!fs.existsSync(fullPath)) {
    fs.writeFileSync(fullPath, content)
    console.log('🔧 Created environment file:', filePath)
  }
})

// Create .gitignore if it doesn't exist
const gitignorePath = path.join(__dirname, '..', '.gitignore')
if (!fs.existsSync(gitignorePath)) {
  const gitignoreContent = `# Dependencies
node_modules/
__pycache__/
*.pyc
*.pyo
*.pyd
.Python
env/
venv/
ENV/

# Build outputs
dist/
build/
*.egg-info/

# IDE
.vscode/
.idea/
*.swp
*.swo

# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Logs
*.log
logs/

# Data files
data/
exports/
uploads/

# OS
.DS_Store
Thumbs.db

# Temporary files
*.tmp
*.temp
.cache/

# Coverage reports
coverage/
.coverage
.nyc_output/

# Jupyter notebooks
.ipynb_checkpoints/`

  fs.writeFileSync(gitignorePath, gitignoreContent)
  console.log('🔧 Created .gitignore')
}

// Install dependencies
console.log('\n📦 Installing dependencies...')

try {
  console.log('Installing root dependencies...')
  execSync('npm install', { stdio: 'inherit' })
  
  console.log('Installing frontend dependencies...')
  execSync('cd frontend && npm install', { stdio: 'inherit' })
  
  console.log('Installing backend dependencies...')
  try {
    execSync('cd backend && pip install -r requirements.txt', { stdio: 'inherit' })
  } catch (error) {
    console.log('Trying with pip3...')
    execSync('cd backend && pip3 install -r requirements.txt', { stdio: 'inherit' })
  }
  
  console.log('\n✅ Setup completed successfully!')
  console.log('\n🎉 YUR Framework is ready!')
  console.log('\nQuick start:')
  console.log('  npm run dev          # Start development servers')
  console.log('  npm run build        # Build for production')
  console.log('  npm run docker:up    # Start with Docker')
  console.log('\nDocumentation: http://localhost:5173/documentation')
  
} catch (error) {
  console.error('\n❌ Setup failed:', error.message)
  console.log('\nTroubleshooting:')
  console.log('1. Ensure Python 3.8+ is installed')
  console.log('2. Consider using a virtual environment for Python dependencies')
  console.log('3. Check internet connection for downloading packages')
  process.exit(1)
}