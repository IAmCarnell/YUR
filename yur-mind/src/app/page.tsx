'use client';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars, Torus } from '@react-three/drei';
import { useState } from 'react';
import { QuantumModeToggle, QuantumVisualization } from '../components/QuantumMode';
import { SuggestedLinkages, SuggestionsToggle } from '../components/SuggestedLinkages';
import { StakingPanel, StakingToggle } from '../components/StakingPanel';
import { IsomorphicCandidates, IsomorphicToggle } from '../components/IsomorphicCandidates';

export default function YURMind() {
  const [T, setT] = useState(1); // T = infinity * 0 resolves to 1
  const activeScale = T > 0 ? Math.log(T + 1) : 0.1; // Active neutrino sphere
  const sterileScale = T > 0 ? T : 0.1; // Sterile neutrino sphere (~1 eV)
  const time3DScale = T > 0 ? Math.sqrt(T * 1.732) : 0.1; // 11D matrix time (~1.732)

  // Enhancement features state
  const [isQuantumMode, setIsQuantumMode] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showStaking, setShowStaking] = useState(false);
  const [showIsomorphic, setShowIsomorphic] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | undefined>();
  const [currentUserId] = useState('demo-user-123'); // Demo user ID

  // Mock quantum nodes for demonstration
  const [quantumNodes, setQuantumNodes] = useState([
    {
      id: 'node1',
      position: [-1, 1, 0] as [number, number, number],
      uncertainty: 0.7,
      collapsed: false
    },
    {
      id: 'node2', 
      position: [1, -1, 0] as [number, number, number],
      uncertainty: 0.3,
      collapsed: false
    },
    {
      id: 'node3',
      position: [0, 0, 1] as [number, number, number],
      uncertainty: 0.9,
      collapsed: false
    }
  ]);

  const handleQuantumCollapse = (nodeId: string) => {
    setQuantumNodes(prev => prev.map(node => 
      node.id === nodeId 
        ? { ...node, collapsed: true, uncertainty: node.uncertainty * 0.1 }
        : node
    ));
    
    // Auto-select the collapsed node
    setSelectedNodeId(nodeId);
  };

  const handleNodeSelect = (nodeId: string) => {
    setSelectedNodeId(nodeId);
  };

  return (
    <main style={{ height: '100vh', background: 'black' }}>
      <h1 style={{ position: 'absolute', top: 10, left: 10, color: 'white', zIndex: 1, fontFamily: 'sans-serif' }}>
        YUR: Void-Full Framework
      </h1>
      
      {/* Original physics controls */}
      <label style={{ position: 'absolute', top: 50, left: 10, color: 'white', zIndex: 1 }}>
        T (Void Resolution):
        <input
          type="range"
          min="0"
          max="2"
          step="0.1"
          value={T}
          onChange={(e) => setT(Number(e.target.value))}
          style={{ marginLeft: 10 }}
        />
        {T.toFixed(1)}
      </label>
      
      <div style={{ position: 'absolute', top: 90, left: 10, color: 'white', zIndex: 1, fontFamily: 'sans-serif' }}>
        <p>Active Neutrino (~0.058 eV): Blue Sphere</p>
        <p>Sterile Neutrino (~1 eV, DUNE): Green Sphere</p>
        <p>3D Time (11D Matrix): Red Torus</p>
      </div>

      {/* Enhancement Feature Toggles */}
      <QuantumModeToggle isQuantumMode={isQuantumMode} onToggle={setIsQuantumMode} />
      <SuggestionsToggle onClick={() => setShowSuggestions(!showSuggestions)} isVisible={showSuggestions} />
      <StakingToggle onClick={() => setShowStaking(!showStaking)} isVisible={showStaking} />
      <IsomorphicToggle onClick={() => setShowIsomorphic(!showIsomorphic)} isVisible={showIsomorphic} />

      {/* Enhancement Feature Panels */}
      <SuggestedLinkages 
        isVisible={showSuggestions} 
        onToggle={() => setShowSuggestions(false)}
        selectedNodeId={selectedNodeId}
      />
      
      <StakingPanel 
        isVisible={showStaking}
        onToggle={() => setShowStaking(false)}
        selectedNodeId={selectedNodeId}
        currentUserId={currentUserId}
      />
      
      <IsomorphicCandidates 
        isVisible={showIsomorphic}
        onToggle={() => setShowIsomorphic(false)}
        onNodeSelect={handleNodeSelect}
      />

      {/* Selected Node Info */}
      {selectedNodeId && (
        <div style={{
          position: 'absolute',
          bottom: 10,
          left: 10,
          background: 'rgba(0,0,0,0.8)',
          color: 'white',
          padding: '10px',
          borderRadius: '6px',
          fontFamily: 'sans-serif',
          fontSize: '12px',
          zIndex: 1000
        }}>
          <strong>Selected Node:</strong> {selectedNodeId}
          <br />
          <button
            onClick={() => setSelectedNodeId(undefined)}
            style={{
              marginTop: '4px',
              padding: '2px 6px',
              background: '#444',
              border: '1px solid #666',
              color: 'white',
              borderRadius: '3px',
              cursor: 'pointer',
              fontSize: '11px'
            }}
          >
            Clear Selection
          </button>
        </div>
      )}

      {/* 3D Canvas */}
      <Canvas style={{ position: 'absolute', top: 0, left: 0 }}>
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} />
        
        {/* Original physics visualization */}
        {/* Active Neutrino Sphere */}
        <mesh scale={activeScale} position={[-2, 0, 0]}>
          <sphereGeometry args={[1, 32, 32]} />
          <meshStandardMaterial color="blue" />
        </mesh>
        
        {/* Sterile Neutrino Sphere */}
        <mesh scale={sterileScale} position={[2, 0, 0]}>
          <sphereGeometry args={[1, 32, 32]} />
          <meshStandardMaterial color="green" />
        </mesh>
        
        {/* 3D Time Torus (11D Matrix) */}
        <Torus scale={time3DScale} position={[0, 0, -2]} args={[1, 0.3, 16, 100]}>
          <meshStandardMaterial color="red" />
        </Torus>

        {/* Quantum visualization overlay */}
        <QuantumVisualization
          isQuantumMode={isQuantumMode}
          nodes={quantumNodes}
          onNodeCollapse={handleQuantumCollapse}
        />
        
        <Stars radius={100} depth={50} count={5000} factor={4} />
        <OrbitControls />
      </Canvas>
    </main>
  );
}