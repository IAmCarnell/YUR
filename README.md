# YUR Framework

An interactive fullstack application for exploring the Infinite-Dimensional Thing Framework.

## Overview

The YUR Framework provides a comprehensive platform for simulating and visualizing infinite-dimensional operators through an interactive web interface. Built with modern React frontend and Python backend, it offers real-time simulation controls, advanced visualizations, and extensive documentation.

## Features

- **Interactive Visualization**: Explore eigenvalues/eigenvectors, node links, and simulation results
- **Modular Simulation Controls**: Desktop and supercomputing modes with adjustable parameters
- **Real-time Results**: Live display for DESI/Bell/AI/Tree simulations
- **Documentation System**: Comprehensive theoretical foundations and mathematical formalism
- **Export Capabilities**: PDF, images, and data export functionality
- **BCI Integration**: Brain-computer interface stubs with MNE/Python
- **Responsive Design**: Accessible across all devices

## Quick Start

```bash
# Install dependencies
npm install

# Start development servers
npm run dev

# Or using Docker
docker-compose up
```

## Architecture

- **Frontend**: React 18+ with TypeScript, Vite, and modern UI libraries
- **Backend**: Python FastAPI with NumPy, SciPy, TensorFlow, Matplotlib
- **Visualization**: D3.js, Three.js for interactive graphics
- **Documentation**: Markdown rendering with mathematical notation support

## License

BSD 3-Clause License - see [LICENSE](LICENSE) for details.