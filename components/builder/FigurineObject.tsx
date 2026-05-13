'use client';

import { useRef, useState, useCallback, useMemo, Suspense } from 'react';
import * as THREE from 'three';
import { useThree, type ThreeEvent } from '@react-three/fiber';
import { useGLTF, Clone } from '@react-three/drei';
import type { FigurineDecoration } from './store';
import { FIGURINE_PRESETS } from './constants';

const DEFAULT_TARGET_HEIGHT = 0.19;

// ── GLB loader ────────────────────────────────────────────────────────────────

function GLBModel({
  modelPath,
  targetHeight = DEFAULT_TARGET_HEIGHT,
}: {
  modelPath: string;
  targetHeight?: number;
}) {
  const { scene } = useGLTF(modelPath);

  const { scale, yOffset } = useMemo(() => {
    const box = new THREE.Box3().setFromObject(scene);
    const size = box.getSize(new THREE.Vector3());
    const s = size.y > 0.001 ? targetHeight / size.y : 1;
    return { scale: s, yOffset: -box.min.y * s };
  }, [scene, targetHeight]);

  return (
    <group scale={scale} position-y={yOffset}>
      <Clone object={scene} castShadow receiveShadow />
    </group>
  );
}

function LoadingFallback() {
  return (
    <mesh position={[0, 0.06, 0]} castShadow>
      <sphereGeometry args={[0.05, 10, 10]} />
      <meshStandardMaterial color="#D4B896" roughness={0.6} />
    </mesh>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface FigurineObjectProps {
  decoration: FigurineDecoration;
  /**
   * LOCAL y of this tier's top surface inside the CakeTier group.
   * Equal to tierWorldHeight / 2.
   */
  tierTopY_local: number;
  tierRadius: number;
  /** Inner exclusion radius — 0 when this is the top tier (no tier above). */
  ringInnerR: number;
  /** Outer placement limit, already accounting for whether a ring is active. */
  ringOuterR: number;
  isDragTarget: boolean;
  onDragStart: (uid: string) => void;
  onDragEnd: () => void;
  onMove: (uid: string, position: [number, number]) => void;
  onRemove: (uid: string) => void;
}

export default function FigurineObject({
  decoration,
  tierTopY_local,
  tierRadius,
  ringInnerR,
  ringOuterR,
  isDragTarget,
  onDragStart,
  onDragEnd,
  onMove,
  onRemove,
}: FigurineObjectProps) {
  const { gl } = useThree();
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);

  const clampToTop = useCallback(
    (x: number, z: number): [number, number] => {
      const dist = Math.sqrt(x * x + z * z);
      if (dist > ringOuterR) {
        const s = ringOuterR / dist;
        return [x * s, z * s];
      }
      if (ringInnerR > 0 && dist < ringInnerR) {
        if (dist < 0.0001) return [ringInnerR, 0];
        const s = ringInnerR / dist;
        return [x * s, z * s];
      }
      return [x, z];
    },
    [ringInnerR, ringOuterR],
  );

  const handlePointerDown = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      onDragStart(decoration.uid);
      gl.domElement.style.cursor = 'grabbing';
    },
    [decoration.uid, onDragStart, gl],
  );

  const handlePointerUp = useCallback(() => {
    onDragEnd();
    gl.domElement.style.cursor = hovered ? 'grab' : 'auto';
  }, [onDragEnd, gl, hovered]);

  const handlePointerEnter = useCallback(() => {
    setHovered(true);
    if (!isDragTarget) gl.domElement.style.cursor = 'grab';
  }, [isDragTarget, gl]);

  const handlePointerLeave = useCallback(() => {
    setHovered(false);
    if (!isDragTarget) gl.domElement.style.cursor = 'auto';
  }, [isDragTarget, gl]);

  const handleDoubleClick = useCallback(
    (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation();
      onRemove(decoration.uid);
    },
    [decoration.uid, onRemove],
  );

  const [px, pz] = decoration.position;
  const [cx, cz] = clampToTop(px, pz);

  const userScale = decoration.scale ?? 1;
  const interactionScale = isDragTarget ? 1.15 : hovered ? 1.08 : 1;

  return (
    <group
      ref={groupRef}
      position={[cx, tierTopY_local, cz]}
      scale={userScale * interactionScale}
      rotation-y={decoration.rotation ?? 0}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      onDoubleClick={handleDoubleClick}
    >
      <Suspense fallback={<LoadingFallback />}>
        <GLBModel
          modelPath={decoration.preset.modelPath}
          targetHeight={decoration.preset.targetHeight ?? DEFAULT_TARGET_HEIGHT}
        />
      </Suspense>

      {(hovered || isDragTarget) && (
        <mesh position={[0, 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.05, 0.085, 40]} />
          <meshBasicMaterial color="#8B6B47" transparent opacity={0.4} />
        </mesh>
      )}
    </group>
  );
}

// Preload all models when the builder page opens
FIGURINE_PRESETS.forEach((p) => useGLTF.preload(p.modelPath));
