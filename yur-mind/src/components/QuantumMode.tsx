'use client';
import { useState } from 'react';
import { Sphere } from '@react-three/drei';

interface QuantumCloudProps {
  position: [number, number, number];
  uncertainty: number;
  collapsed?: boolean;
  onCollapse?: () => void;
}

export function QuantumCloud({ position, uncertainty, collapsed = false, onCollapse }: QuantumCloudProps) {
  const [isCollapsing, setIsCollapsing] = useState(false);
  
  // Calculate visualization parameters based on uncertainty
  const cloudRadius = 0.5 + (uncertainty * 2); // Base radius plus uncertainty expansion
  const opacity = 0.3 + (uncertainty * 0.5); // Higher uncertainty = more visible
  const particleCount = Math.floor(10 + (uncertainty * 20)); // More particles for higher uncertainty
  
  // Color based on uncertainty level
  const getUncertaintyColor = (uncertainty: number): string => {
    if (uncertainty < 0.2) return '#4CAF50'; // Green - certain
    if (uncertainty < 0.5) return '#FF9800'; // Orange - moderate uncertainty
    if (uncertainty < 0.8) return '#F44336'; // Red - high uncertainty
    return '#9C27B0'; // Purple - very uncertain
  };

  const handleClick = () => {
    if (!collapsed && onCollapse) {
      setIsCollapsing(true);
      onCollapse();
      
      // Reset collapsing state after animation
      setTimeout(() => setIsCollapsing(false), 1000);
    }
  };

  const finalRadius = collapsed || isCollapsing ? cloudRadius * 0.2 : cloudRadius;
  const finalOpacity = collapsed ? opacity * 0.3 : opacity;

  return (
    <group position={position} onClick={handleClick}>
      {/* Main probability cloud */}
      <Sphere args={[finalRadius, 16, 16]}>
        <meshStandardMaterial
          color={getUncertaintyColor(uncertainty)}
          transparent
          opacity={finalOpacity}
          wireframe={!collapsed}
        />
      </Sphere>
      
      {/* Particle cloud effect for high uncertainty */}
      {uncertainty > 0.3 && !collapsed && (
        <>
          {Array.from({ length: Math.min(particleCount, 20) }).map((_, i) => {
            const theta = (i / particleCount) * Math.PI * 2;
            const phi = Math.acos(1 - 2 * Math.random());
            const r = cloudRadius * (0.5 + Math.random() * 0.5);
            
            const x = r * Math.sin(phi) * Math.cos(theta);
            const y = r * Math.sin(phi) * Math.sin(theta);
            const z = r * Math.cos(phi);
            
            return (
              <Sphere key={i} position={[x, y, z]} args={[0.05, 8, 8]}>
                <meshBasicMaterial
                  color={getUncertaintyColor(uncertainty)}
                  transparent
                  opacity={opacity * 0.6}
                />
              </Sphere>
            );
          })}
        </>
      )}
      
      {/* Collapsed state indicator */}
      {collapsed && (
        <Sphere args={[0.1, 8, 8]}>
          <meshStandardMaterial
            color="#FFD700"
            emissive="#FFD700"
            emissiveIntensity={0.2}
          />
        </Sphere>
      )}
    </group>
  );
}

interface QuantumModeToggleProps {
  isQuantumMode: boolean;
  onToggle: (mode: boolean) => void;
}

export function QuantumModeToggle({ isQuantumMode, onToggle }: QuantumModeToggleProps) {
  return (
    <div style={{
      position: 'absolute',
      top: 130,
      left: 10,
      color: 'white',
      zIndex: 1,
      fontFamily: 'sans-serif',
      background: 'rgba(0,0,0,0.7)',
      padding: '10px',
      borderRadius: '5px',
      border: '1px solid #333'
    }}>
      <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
        <input
          type="checkbox"
          checked={isQuantumMode}
          onChange={(e) => onToggle(e.target.checked)}
          style={{ marginRight: '8px' }}
        />
        <span style={{ fontSize: '14px' }}>
          {isQuantumMode ? 'Quantum Mode' : 'Classical Mode'}
        </span>
      </label>
      
      {isQuantumMode && (
        <div style={{ marginTop: '8px', fontSize: '12px', color: '#ccc' }}>
          <div>🟢 Low uncertainty (certain)</div>
          <div>🟠 Medium uncertainty</div>
          <div>🔴 High uncertainty</div>
          <div>🟣 Very uncertain</div>
          <div style={{ marginTop: '4px' }}>Click clouds to collapse!</div>
        </div>
      )}
    </div>
  );
}

interface QuantumVisualizationProps {
  isQuantumMode: boolean;
  nodes?: Array<{
    id: string;
    position: [number, number, number];
    uncertainty: number;
    collapsed?: boolean;
  }>;
  onNodeCollapse?: (nodeId: string) => void;
}

export function QuantumVisualization({ 
  isQuantumMode, 
  nodes = [], 
  onNodeCollapse 
}: QuantumVisualizationProps) {
  if (!isQuantumMode) return null;

  return (
    <>
      {nodes.map((node) => (
        <QuantumCloud
          key={node.id}
          position={node.position}
          uncertainty={node.uncertainty}
          collapsed={node.collapsed}
          onCollapse={() => onNodeCollapse?.(node.id)}
        />
      ))}
    </>
  );
}