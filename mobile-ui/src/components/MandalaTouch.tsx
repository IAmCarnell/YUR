/**
 * Touch-optimized Mandala Dock for mobile devices
 * Supports gestures, haptic feedback, and responsive design
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useSpring, animated } from '@react-spring/web';
import { useGesture } from '@use-gesture/react';

interface MandalaNode {
  id: string;
  label: string;
  icon: string;
  position: { angle: number; radius: number };
  color: string;
  category: 'spatial' | 'scientific' | 'agents' | 'plugins' | 'analytics';
}

interface MandalaProps {
  nodes: MandalaNode[];
  onNodeSelect: (nodeId: string) => void;
  centerRadius?: number;
  maxRadius?: number;
  hapticEnabled?: boolean;
}

export const MandalaTouch: React.FC<MandalaProps> = ({
  nodes,
  onNodeSelect,
  centerRadius = 60,
  maxRadius = 200,
  hapticEnabled = true
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeNode, setActiveNode] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [containerSize, setContainerSize] = useState({ width: 350, height: 350 });

  // Spring animation for rotation and scaling
  const [{ rotation, scale, x, y }, api] = useSpring(() => ({
    rotation: 0,
    scale: 1,
    x: 0,
    y: 0,
    config: { tension: 300, friction: 30 }
  }));

  // Responsive sizing
  useEffect(() => {
    const updateSize = () => {
      const width = Math.min(window.innerWidth * 0.9, 400);
      const height = Math.min(window.innerHeight * 0.5, 400);
      setContainerSize({ width, height });
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Haptic feedback
  const triggerHaptic = useCallback((type: 'light' | 'medium' | 'heavy' = 'light') => {
    if (hapticEnabled && 'vibrate' in navigator) {
      const patterns = {
        light: [10],
        medium: [20],
        heavy: [30]
      };
      navigator.vibrate(patterns[type]);
    }
  }, [hapticEnabled]);

  // Gesture handling
  const bind = useGesture({
    onDrag: ({ active, movement: [mx, my], velocity: [vx, vy], direction: [dx, dy] }) => {
      setIsDragging(active);
      
      if (active) {
        api.start({ x: mx, y: my });
      } else {
        // Snap back with momentum
        const momentum = Math.sqrt(vx * vx + vy * vy);
        if (momentum > 0.5) {
          api.start({ 
            x: mx + dx * momentum * 50, 
            y: my + dy * momentum * 50,
            config: { tension: 200, friction: 25 }
          });
          setTimeout(() => {
            api.start({ x: 0, y: 0 });
          }, 200);
        } else {
          api.start({ x: 0, y: 0 });
        }
      }
    },
    
    onPinch: ({ offset: [scale], active }) => {
      api.start({ 
        scale: active ? Math.max(0.5, Math.min(2, scale)) : 1 
      });
    },
    
    onWheel: ({ delta: [, dy] }) => {
      api.start({
        rotation: rotation.get() + dy * 0.1,
        config: { tension: 400, friction: 40 }
      });
    },

    onTap: ({ event }) => {
      const target = event.target as HTMLElement;
      const nodeId = target.closest('[data-node-id]')?.getAttribute('data-node-id');
      
      if (nodeId) {
        triggerHaptic('medium');
        setActiveNode(nodeId);
        onNodeSelect(nodeId);
      }
    }
  }, {
    drag: { from: () => [x.get(), y.get()] },
    pinch: { scaleBounds: { min: 0.5, max: 2 } }
  });

  // Calculate node positions
  const getNodePosition = (node: MandalaNode, index: number) => {
    const angle = node.position.angle + (rotation.get() * Math.PI / 180);
    const radius = centerRadius + (node.position.radius * (maxRadius - centerRadius));
    
    return {
      x: Math.cos(angle) * radius + containerSize.width / 2,
      y: Math.sin(angle) * radius + containerSize.height / 2
    };
  };

  // Handle keyboard navigation
  const handleKeyDown = (event: React.KeyboardEvent, nodeId: string) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      triggerHaptic('medium');
      onNodeSelect(nodeId);
    }
  };

  return (
    <div className="mandala-touch-container">
      <animated.div
        ref={containerRef}
        className="mandala-dock"
        style={{
          width: containerSize.width,
          height: containerSize.height,
          transform: rotation.to(r => `rotate(${r}deg)`),
          scale,
          x,
          y
        }}
        {...bind()}
        role="application"
        aria-label="Touch-optimized spatial navigation dock"
        data-testid="mobile-mandala"
      >
        {/* Center hub */}
        <div 
          className="mandala-center"
          style={{
            width: centerRadius * 2,
            height: centerRadius * 2,
            left: containerSize.width / 2 - centerRadius,
            top: containerSize.height / 2 - centerRadius
          }}
        >
          <div className="center-icon">🌌</div>
          <div className="center-label">YUR OS</div>
        </div>

        {/* Navigation nodes */}
        {nodes.map((node, index) => {
          const position = getNodePosition(node, index);
          const isActive = activeNode === node.id;
          
          return (
            <animated.button
              key={node.id}
              className={`mandala-node ${isActive ? 'active' : ''} category-${node.category}`}
              data-node-id={node.id}
              data-testid={`mandala-node-${node.id}`}
              style={{
                left: position.x - 30, // Half of touch target size
                top: position.y - 30,
                backgroundColor: node.color,
                transform: scale.to(s => `scale(${isActive ? s * 1.2 : s})`)
              }}
              onKeyDown={(e) => handleKeyDown(e, node.id)}
              onFocus={() => {
                setActiveNode(node.id);
                triggerHaptic('light');
              }}
              onBlur={() => setActiveNode(null)}
              aria-label={`${node.label} - ${node.category} application`}
              role="menuitem"
            >
              <span className="node-icon" aria-hidden="true">
                {node.icon}
              </span>
              <span className="node-label">{node.label}</span>
              
              {/* Ripple effect for touch feedback */}
              <div className="touch-ripple" />
            </animated.button>
          );
        })}
      </animated.div>

      {/* Touch instructions */}
      <div className="touch-instructions" aria-live="polite">
        {isDragging ? (
          "Dragging dock - release to snap back"
        ) : activeNode ? (
          `${nodes.find(n => n.id === activeNode)?.label} selected`
        ) : (
          "Tap nodes to navigate, pinch to zoom, drag to move"
        )}
      </div>
    </div>
  );
};