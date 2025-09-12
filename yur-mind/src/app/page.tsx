'use client';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import { useState } from 'react';

export default function YURMind() {
  const [T, setT] = useState(1); // T = infinity * 0 resolves to 1
  const scale = T > 0 ? Math.log(T + 1) : 0.1; // Void-to-cosmos scaling

  return (
    <main style={{ height: '100vh', background: 'black' }}>
      <h1 style={{ position: 'absolute', top: 10, left: 10, color: 'white', zIndex: 1, fontFamily: 'sans-serif' }}>
        YUR: Void-Full Framework
      </h1>
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
      <Canvas style={{ position: 'absolute', top: 0, left: 0 }}>
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} />
        <mesh scale={scale}>
          <sphereGeometry args={[1, 32, 32]} />
          <meshStandardMaterial color={T > 0 ? 'blue' : 'black'} />
        </mesh>
        <Stars radius={100} depth={50} count={5000} factor={4} />
        <OrbitControls />
      </Canvas>
    </main>
  );
}