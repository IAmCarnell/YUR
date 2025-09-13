# YUR: Void-Full Framework

A "World Computer" prototype that unifies quantum gravity and cosmology through the **Void-Full Framework (VFF)**, powered by \( T = \infty \times 0 \). YUR simulates entropic gravity, quantum entanglement, dark energy emergence, sterile neutrinos, and 11D matrix-refined 3D time in an interactive, scalable platform. It’s a bold step toward a decentralized, immersive UI (think tesseract desktop) and a "smart world" vision tied to ThingForge.

## 🌌 Why YUR?
- **Unifies Physics**: Models void entropy, cosmological constant \( \Lambda \), entanglement phase shifts, sterile neutrinos (~1 eV), and 11D matrix 3D time via \( T = \infty \times 0 \).
- **Matches Data**: Predicts \( \Lambda \approx 1.63 \times 10^{-35} \, \text{s}^{-2} \) (DESI 2026), entanglement phases (~0.006 rad, MIT oscillators), and sterile neutrino mixing (DUNE 2025).
- **Open & Extensible**: Built for community forks—add 3D time, neutrino masses, or M-theory extensions.
- **Spatial UI**: WebXR frontend visualizes void-to-cosmos with active (~0.058 eV, blue sphere), sterile neutrinos (~1 eV, green sphere), and 11D 3D time (red torus).

## ✨ NEW: Enhancement Features (Issues #2-#5)

YUR now includes cutting-edge AI/ML enhancement features that extend the core physics simulation:

### 🔗 Embedding Integration (Issue #2)
- **Auto-suggested concept linkages** using semantic embeddings
- OpenAI API integration with local fallback
- Cosine similarity for relationship detection
- Interactive suggestions panel with accept/reject workflow

### 🔀 Ontology Merging (Issue #3) 
- **Isomorphic subtree detection** using canonical hashing
- Structural similarity analysis across agent skill trees
- Merge candidate identification with confidence scoring
- Visual approval interface for ontology consolidation

### ⚛️ Quantum-Inspired UI (Issue #4)
- **Probability cloud visualization** mode toggle
- Interactive 3D uncertainty rendering with particle effects
- Node collapse mechanics with quantum decoherence
- Color-coded uncertainty levels (green→orange→red→purple)

### 💰 Knowledge Staking (Issue #5)
- **Relevance claim staking** with reputation system
- Consensus mechanisms with weighted voting
- Slashing for false claims with automatic penalties
- Risk assessment and stake recommendations

![YUR Enhancement Features](https://github.com/user-attachments/assets/a53bca7f-fbff-4fb2-90bb-8ce6d67f2dfa)

## 🚀 Quick Start

### Backend: Agent Evolution + AI Services (TypeScript/Node.js)
Runs the agent evolution system plus new AI enhancement services.

1. Install dependencies:
   ```bash
   cd server && npm install
   ```

2. Set environment variables (optional):
   ```bash
   export OPENAI_API_KEY=your_key_here  # For real embeddings (optional)
   export MONGODB_URI=mongodb://localhost:27017  # Database
   ```

3. Run development server:
   ```bash
   npm run dev
   ```
   Server runs on http://localhost:3001

### Frontend: 3D Visualization + Enhancement UI (Next.js/React)
Interactive physics visualization with enhancement feature panels.

1. Install dependencies:
   ```bash
   cd yur-mind && npm install
   ```

2. Run development server:
   ```bash
   npm run dev
   ```
   Frontend runs on http://localhost:3000

### Using Enhancement Features

1. **Quantum Mode**: Toggle the checkbox to enable probability cloud visualization
2. **Suggestions**: Click "🔗 Suggestions" to view semantic linkage recommendations  
3. **Staking**: Click "💰 Staking" to stake on node relevance claims
4. **Isomorphic**: Click "🔀 Isomorphic" to detect similar structures
5. **Node Selection**: Click quantum clouds or use panels to select nodes for detailed analysis

### Physics Simulation (Python)
Computes VFF predictions: void entropy, \( \Lambda \), entanglement phases, active/sterile neutrinos, and 11D matrix 3D time.

1. Install dependencies (run globally, no virtual env):
   ```bash
   pip install numpy sympy matplotlib