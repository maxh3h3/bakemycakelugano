'use client';

import { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useThree, type ThreeEvent } from '@react-three/fiber';
import type { TopImageDecoration } from './store';

// ── Circular-clip shader ──────────────────────────────────────────────────────
// Fragments whose world XZ lies outside the tier disc are discarded.
// Since all tiers are translated only in Y, world XZ == tier-local XZ.

const CLIP_VERT = /* glsl */ `
varying vec2 vWorldXZ;
varying vec2 vUv;
void main() {
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vWorldXZ = worldPos.xz;
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const CLIP_FRAG = /* glsl */ `
uniform sampler2D uMap;
uniform float uClipRadius;
varying vec2 vWorldXZ;
varying vec2 vUv;
void main() {
  if (length(vWorldXZ) > uClipRadius) discard;
  vec4 c = texture2D(uMap, vUv);
  if (c.a < 0.02) discard;
  gl_FragColor = c;
}
`;

// ── Component ─────────────────────────────────────────────────────────────────

interface TopImageObjectProps {
  decoration: TopImageDecoration;
  tierTopY_local: number;
  tierRadius: number;
  isDragTarget: boolean;
  onDragStart: (uid: string) => void;
  onDragEnd: () => void;
  onRemove: (uid: string) => void;
}

export default function TopImageObject({
  decoration,
  tierTopY_local,
  tierRadius,
  isDragTarget,
  onDragStart,
  onDragEnd,
  onRemove,
}: TopImageObjectProps) {
  const { gl } = useThree();
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  const [map, setMap] = useState<THREE.Texture | null>(null);

  const clampToTop = useCallback(
    (x: number, z: number): [number, number] => {
      const maxR = tierRadius * 0.82;
      const dist = Math.sqrt(x * x + z * z);
      if (dist > maxR) {
        const s = maxR / dist;
        return [x * s, z * s];
      }
      return [x, z];
    },
    [tierRadius],
  );

  // ── Texture loading ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (!decoration.imageUrl) {
      setMap((prev) => { prev?.dispose(); return null; });
      return;
    }
    const loader = new THREE.TextureLoader();
    let cancelled = false;
    loader.load(
      decoration.imageUrl,
      (tex) => {
        if (cancelled) { tex.dispose(); return; }
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.wrapS = THREE.ClampToEdgeWrapping;
        tex.wrapT = THREE.ClampToEdgeWrapping;
        tex.anisotropy = 4;
        setMap(tex);
      },
      undefined,
      () => { if (!cancelled) setMap(null); },
    );
    return () => {
      cancelled = true;
      setMap((prev) => { prev?.dispose(); return null; });
    };
  }, [decoration.imageUrl]);

  // ── Clip shader material (created once, uniforms updated reactively) ──────────

  const clipMat = useMemo(() => new THREE.ShaderMaterial({
    uniforms: {
      uMap: { value: null },
      uClipRadius: { value: 1.0 },
    },
    vertexShader: CLIP_VERT,
    fragmentShader: CLIP_FRAG,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  }), []);

  useEffect(() => { clipMat.uniforms.uMap.value = map; }, [clipMat, map]);
  useEffect(() => { clipMat.uniforms.uClipRadius.value = tierRadius; }, [clipMat, tierRadius]);
  useEffect(() => () => { clipMat.dispose(); }, [clipMat]);

  // ── Plane dimensions ─────────────────────────────────────────────────────────

  const { planeW, planeH } = useMemo(() => {
    const baseScale = decoration.scale ?? 0.38;
    const w = tierRadius * 2 * baseScale;
    if (!map?.image) return { planeW: w, planeH: w * 0.75 };
    const img = map.image as HTMLImageElement;
    const ar = img.height / Math.max(1, img.width);
    return { planeW: w, planeH: w * ar };
  }, [map, tierRadius, decoration.scale]);

  // ── Pointer handlers ─────────────────────────────────────────────────────────

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
  const interactionScale = isDragTarget ? 1.06 : hovered ? 1.03 : 1;

  if (!map) return null;

  return (
    <group
      ref={groupRef}
      position={[cx, tierTopY_local + 0.004, cz]}
      scale={interactionScale}
      rotation-y={decoration.rotation ?? 0}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      onDoubleClick={handleDoubleClick}
    >
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[planeW, planeH]} />
        <primitive object={clipMat} attach="material" />
      </mesh>
      {(hovered || isDragTarget) && (
        <mesh position={[0, 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[Math.max(planeW, planeH) * 0.12, Math.max(planeW, planeH) * 0.16, 40]} />
          <meshBasicMaterial color="#8B6B47" transparent opacity={0.35} />
        </mesh>
      )}
    </group>
  );
}
