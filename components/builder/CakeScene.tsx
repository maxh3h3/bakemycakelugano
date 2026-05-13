'use client';

import { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import CakeTier from './CakeTier';
import { useBuilderStore } from './store';
import { TIER_SCALE } from './constants';

// ── Rotating platform ─────────────────────────────────────────────────────────

function CakePlatform() {
  const meshRef = useRef<THREE.Mesh>(null);
  useFrame((_, delta) => {
    if (meshRef.current) meshRef.current.rotation.y += delta * 0.08;
  });
  return (
    <mesh ref={meshRef} position={[0, -0.014, 0]} receiveShadow>
      <cylinderGeometry args={[0.72, 0.72, 0.028, 64]} />
      <meshStandardMaterial color="#D4B896" roughness={0.5} metalness={0.1} />
    </mesh>
  );
}

// ── Scene ─────────────────────────────────────────────────────────────────────

function Scene() {
  const { tiers, activeTierId, setActiveTier, isDragging } = useBuilderStore();

  const { tierPositions, topY } = useMemo(() => {
    let y = 0;
    const positions = tiers.map((tier) => {
      const h = tier.height * TIER_SCALE.heightMultiplier;
      const center = y + h / 2;
      y += h;
      return { tier, yCenter: center };
    });
    return { tierPositions: positions, topY: y };
  }, [tiers]);

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.55} />
      <directionalLight
        position={[3.5, 6, 3]}
        intensity={1.4}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-near={0.5}
        shadow-camera-far={20}
        shadow-camera-left={-3}
        shadow-camera-right={3}
        shadow-camera-top={3}
        shadow-camera-bottom={-3}
      />
      <pointLight position={[-3, 4, -2]} intensity={0.7} color="#FFF5E0" />
      <pointLight position={[2, 1, 3]} intensity={0.4} color="#FFE8D0" />
      <hemisphereLight args={['#FFF5E8', '#D4B896', 0.5]} />

      {/* Camera controls — disabled during any decoration drag */}
      <OrbitControls
        target={[0, topY * 0.45, 0]}
        minPolarAngle={0.25}
        maxPolarAngle={1.45}
        enablePan={false}
        minDistance={2}
        maxDistance={7}
        enableDamping
        dampingFactor={0.08}
        enabled={!isDragging}
      />

      {/* Shadow ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.001, 0]} receiveShadow>
        <planeGeometry args={[20, 20]} />
        <shadowMaterial transparent opacity={0.18} />
      </mesh>

      <CakePlatform />

      {/* Tiers — each owns its own decorations, writings, and figurine drag */}
      {tierPositions.map(({ tier, yCenter }, index) => (
        <CakeTier
          key={tier.id}
          tier={tier}
          yCenter={yCenter}
          isActive={activeTierId === tier.id}
          onClick={() => setActiveTier(tier.id)}
          upperTierRadius={
            index < tierPositions.length - 1
              ? tierPositions[index + 1].tier.diameter * TIER_SCALE.radiusMultiplier
              : 0
          }
        />
      ))}
    </>
  );
}

export default function CakeScene() {
  return (
    <Canvas
      shadows
      camera={{ position: [0, 2.6, 4.2], fov: 42 }}
      gl={{ antialias: true, alpha: false }}
      style={{ background: 'transparent' }}
    >
      <Scene />
    </Canvas>
  );
}
