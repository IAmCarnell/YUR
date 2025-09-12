'use client';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars, Torus } from '@react-three/drei';
import { useState } from 'react';

export default function YURMind() {
  const [T, setT] = useState(1); // T = infinity * 0 resolves to 1
  const activeScale = T > 0 ? Math.log(T + 1) : 0.1; // Active neutrino sphere
  const sterileScale = T > 0 ? T : 0.1; // Sterile neutrino sphere (~1 eV)
  const time3DScale = T > 0 ? Math.sqrt(T * 1.732) : 0.1; // 11D matrix time (~1.732)

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
      <div style={{ position: 'absolute', top: 90, left: 10, color: 'white', zIndex: 1, fontFamily: 'sans-serif' }}>
        <p>Active Neutrino (~0.058 eV): Blue Sphere</p>
        <p>Sterile Neutrino (~1 eV, DUNE): Green Sphere</p>
        <p>3D Time (11D Matrix): Red Torus</p>
      </div>
      <Canvas style={{ position: 'absolute', top: 0, left: 0 }}>
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} />
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
        <Stars radius={100} depth={50} count={5000} factor={4} />
        <OrbitControls />
      </Canvas>
    </main>
  );
}