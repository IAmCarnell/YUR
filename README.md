# YUR: Void-Full Framework

![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-43853D?style=flat&logo=node.js&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=flat&logo=react&logoColor=61DAFB)
![Next.js](https://img.shields.io/badge/Next.js-000000?style=flat&logo=next.js&logoColor=white)
![Python](https://img.shields.io/badge/Python-3776AB?style=flat&logo=python&logoColor=white)
![WebXR](https://img.shields.io/badge/WebXR-FF6600?style=flat&logo=webxr&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-4EA94B?style=flat&logo=mongodb&logoColor=white)

A "World Computer" prototype that unifies quantum gravity and cosmology through the **Void-Full Framework (VFF)**, powered by \( T = \infty \times 0 \). YUR simulates entropic gravity, quantum entanglement, dark energy emergence, sterile neutrinos, and 11D matrix-refined 3D time in an interactive, scalable platform. It's a bold step toward a decentralized, immersive UI (think tesseract desktop) and a "smart world" vision tied to ThingForge.

## 🌌 Why YUR?

- **Unifies Physics**: Models void entropy, cosmological constant \( \Lambda \), entanglement phase shifts, sterile neutrinos (~1 eV), and 11D matrix 3D time via \( T = \infty \times 0 \).
- **Matches Data**: Predicts \( \Lambda \approx 1.63 \times 10^{-35} \, \text{s}^{-2} \) (DESI 2026), entanglement phases (~0.006 rad, MIT oscillators), and sterile neutrino mixing (DUNE 2025).
- **Open & Extensible**: Built for community forks—add 3D time, neutrino masses, or M-theory extensions.
- **Spatial UI**: WebXR frontend visualizes void-to-cosmos with active (~0.058 eV, blue sphere), sterile neutrinos (~1 eV, green sphere), and 11D 3D time (red torus).

## 🏗️ Architecture

YUR is organized as a monorepo with three primary components:

```
YUR/
├── server/              # TypeScript Agent Evolution + Enhancement Services
│   ├── Agent evolution algorithm (skill graphs, XP, leveling)
│   ├── AI/ML enhancement services (embeddings, ontology, quantum, staking)
│   ├── RESTful API (Express.js)
│   └── MongoDB integration
├── yur-mind/            # Next.js WebXR Frontend
│   ├── 3D physics visualization (Three.js)
│   ├── Enhancement feature panels
│   ├── Interactive WebXR interface
│   └── Real-time data integration
└── yur_physics.py       # Python Physics Simulation
    ├── Void-Full Framework calculations
    ├── Cosmological predictions (Λ, neutrinos)
    └── Quantum entanglement modeling
```

## 🚀 Quick Start

### Clone → Backend Setup → Frontend Setup → Physics Run

1. **Clone the repository**:
   ```bash
   git clone https://github.com/IAmCarnell/YUR.git
   cd YUR
   ```

2. **Backend: Agent Evolution + AI Services (TypeScript/Node.js)**
   ```bash
   cd server && npm install
   npm run dev
   ```
   Server runs on http://localhost:3001

3. **Frontend: 3D Visualization + Enhancement UI (Next.js/React)**
   ```bash
   cd yur-mind && npm install
   npm run dev
   ```
   Frontend runs on http://localhost:3000

4. **Physics Simulation (Python) - Optional**
   ```bash
   pip install numpy sympy matplotlib
   python yur_physics.py
   ```

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `OPENAI_API_KEY` | OpenAI API key for real embeddings | Mock fallback | No |
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017` | No |
| `DB_NAME` | Database name | `yur_evolution` | No |
| `PORT` | Server port | `3001` | No |
| `NODE_ENV` | Environment setting | `development` | No |

## 🔬 Detailed Feature Matrix

### Physics Layer
- **Void Entropy**: Quantum information metrics via \( T = \infty \times 0 \) convergence
- **Λ Prediction**: Cosmological constant \( \Lambda \approx 1.63 \times 10^{-35} \, \text{s}^{-2} \) (DESI-compatible)
- **Entanglement Phase Shifts**: ~0.006 rad phase calculations (MIT oscillator validation)
- **Active/Sterile Neutrino Modeling**: Active (~0.058 eV) and sterile (~1 eV) mass calculations
- **11D Matrix 3D Time Representation**: Higher-dimensional time refinement via matrix algebra

### Enhancement Layer (Issues #2–#5)

![YUR Enhancement Features](https://github.com/user-attachments/assets/a53bca7f-fbff-4fb2-90bb-8ce6d67f2dfa)

#### 🔗 Embedding Integration (Issue #2)
- **Auto-suggested concept linkages** using semantic embeddings
- OpenAI API integration with local fallback
- Cosine similarity for relationship detection
- Interactive suggestions panel with accept/reject workflow

#### 🔀 Ontology Merging (Issue #3)
- **Isomorphic subtree detection** using canonical hashing
- Structural similarity analysis across agent skill trees
- Merge candidate identification with confidence scoring
- Visual approval interface for ontology consolidation

#### ⚛️ Quantum-Inspired UI (Issue #4)
- **Probability cloud visualization** mode toggle
- Interactive 3D uncertainty rendering with particle effects
- Node collapse mechanics with quantum decoherence
- Color-coded uncertainty levels (green→orange→red→purple)

#### 💰 Knowledge Staking (Issue #5)
- **Relevance claim staking** with reputation system
- Consensus mechanisms with weighted voting
- Slashing for false claims with automatic penalties
- Risk assessment and stake recommendations

### Agent Evolution Layer
- **Skill Graph/Tree System**: Hierarchical skill dependencies with prerequisites and unlocks
- **Experience & Leveling**: Progressive XP-based skill advancement with configurable thresholds
- **Mutation/Emergent Skills**: Automatic skill evolution when mastery thresholds are exceeded
- **Digital Twin Aggregation**: Collective intelligence from all agent skills and experiences
- **Learning Triggers**: Collaboration, terminal usage, and feedback-driven skill acquisition
- **Quest System**: Structured learning objectives with rewards and criteria

## 🎮 Usage

### Enhancement Panel Workflow

1. **Select Nodes**: Click quantum clouds or skill graph nodes to select for analysis
2. **Review Suggestions**: Open "🔗 Suggestions" panel to view semantic linkage recommendations
3. **Stake Claims**: Use "💰 Staking" panel to stake on node relevance with reputation weighting
4. **Merge Ontologies**: Access "🔀 Isomorphic" panel to identify and approve structural merges
5. **Visualize Probability Clouds**: Toggle "⚛️ Quantum Mode" for uncertainty rendering with particle effects

### Enhancement Panel Details

- **Suggestions Panel**: Auto-suggested concept linkages using semantic embeddings with accept/reject workflow
- **Isomorphic Panel**: Detect similar subtree structures across agent skill trees with confidence scoring
- **Staking Panel**: Stake on node relevance claims with consensus mechanisms and risk assessment
- **Quantum Mode**: Probability cloud visualization with interactive 3D uncertainty rendering

### Typical Workflow
1. Load physics simulation or agent data
2. Select nodes of interest in 3D visualization
3. Review AI-generated suggestions for concept linkages
4. Stake claims on node relevance and importance
5. Identify and merge similar ontological structures
6. Visualize uncertainty through quantum probability clouds

## 🗺️ Roadmap

### Near-term (Next 3-6 months)
- **Decentralized/On-chain Knowledge Staking**: Blockchain integration for permanent reputation systems
- **Multi-agent Cooperative Evolution**: Collaborative skill development scenarios
- **Performance & Scalability**: Web workers, WASM optimization, GPU acceleration for similarity calculations

### Medium-term (6-12 months)
- **Advanced Neutrino Sector Refinements**: Enhanced cosmological parameter fitting (DUNE/T2K integration)
- **Plugin-based Skill Packs**: Modular skill marketplace with community contributions
- **Extended VR Interaction Gestures**: Hand tracking, spatial manipulation, haptic feedback

### Long-term (12+ months)
- **Ontology Marketplace**: Decentralized exchange for validated knowledge structures
- **Quantum Computing Integration**: Native quantum algorithm implementation
- **Augmented Reality Physics Overlay**: Real-world physics visualization and interaction

## 🛠️ Tech Stack

**Backend**: TypeScript, Node.js, Express.js, MongoDB
**Frontend**: Next.js, React, Three.js, WebXR
**Physics**: Python, NumPy, SymPy, Matplotlib
**AI/ML**: OpenAI Embeddings (optional), Custom similarity algorithms
**Visualization**: Three.js particle systems, quantum rendering effects
**Storage**: MongoDB with flexible pluggable backends

## 🤝 Contributing

We welcome contributions! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Implement changes with tests
4. Ensure all tests pass and linting is clean
5. Submit a pull request

### Development Guidelines
- Follow TypeScript best practices
- Maintain test coverage above 90%
- Document new features and APIs
- Use semantic versioning for releases

For detailed backend development information, see [server/README.md](server/README.md).

## 📄 License

MIT License - see LICENSE file for details.

## ⚠️ Disclaimer

### Scientific Model Status
The Void-Full Framework (VFF) represents an **exploratory and speculative** scientific model that has not undergone peer review. While YUR makes specific predictions about cosmological parameters (Λ, neutrino masses, entanglement phases), these should be considered theoretical explorations rather than established physics. The framework aims to inspire discussion and provide a computational testbed for novel quantum gravity approaches.

### AI Feature Ethical Considerations
YUR's AI enhancement features (embedding integration, ontology merging, knowledge staking) are designed with the following ethical principles:
- **Transparency**: All AI suggestions are clearly marked and user-controllable
- **User Agency**: Users retain full control over acceptance/rejection of AI recommendations
- **Privacy**: Local fallback options reduce dependency on external AI services
- **Bias Awareness**: Staking and reputation systems include mechanisms to prevent manipulation
- **Open Source**: All algorithms are open for community review and improvement

Users should exercise critical thinking when interacting with AI-generated suggestions and understand that these systems may reflect biases present in training data or algorithmic design.