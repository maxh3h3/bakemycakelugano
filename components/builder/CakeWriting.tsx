'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useThree, type ThreeEvent } from '@react-three/fiber';
import type { WritingDecoration } from './store';
import { useBuilderStore } from './store';
import { FIGURINE_RING } from './constants';

interface CakeWritingProps {
  decoration: WritingDecoration;
  yCenter: number;
  height: number;
  radius: number;
  /** World radius of the tier directly above. 0 when this is the top tier. */
  upperTierRadius: number;
  onUpdate: (updates: Partial<WritingDecoration>) => void;
  onDragStateChange: (dragging: boolean) => void;
}

function clampToTopCircle(ox: number, oz: number, maxNorm = 0.88, minNorm = 0): [number, number] {
  const dist = Math.sqrt(ox * ox + oz * oz);
  if (dist > maxNorm) {
    const s = maxNorm / dist;
    return [ox * s, oz * s];
  }
  if (minNorm > 0 && dist < minNorm) {
    if (dist < 0.0001) return [minNorm, 0];
    const s = minNorm / dist;
    return [ox * s, oz * s];
  }
  return [ox, oz];
}

/**
 * Estimates the writing hitbox size in world units from the same font-size
 * formula used by buildTopTexture / buildSideTexture in CakeTier.
 *
 * PAD is generous so the hitbox is easy to click even on a small font.
 */
function useTextHitSize(
  text: string,
  fontSize: number,
  surface: 'top' | 'side',
  radius: number,
  height: number,
): { w: number; h: number } {
  return useMemo(() => {
    const fz = Math.round(
      Math.max(24, Math.min(72, Math.floor(320 / Math.max(text.length, 4)))) * fontSize,
    );
    const PAD = 1.2; // just enough to be comfortably clickable without covering neighbours
    if (surface === 'top') {
      // Top texture is 512×512, disc diameter = 2*radius world units
      const worldPerPx = (2 * radius) / 512;
      const rawW = Math.min(text.length * fz * 0.6, 512 * 0.88) * worldPerPx * PAD;
      const rawH = fz * 1.4 * worldPerPx * PAD;
      return {
        w: Math.max(0.08, Math.min(rawW, radius * 1.2)),
        h: Math.max(0.06, Math.min(rawH, radius * 0.6)),
      };
    }
    // Side texture is 2048×512, mapped to circumference × height
    const worldPerPxH = (2 * Math.PI * radius) / 2048;
    const worldPerPxV = height / 512;
    const rawW = Math.min(text.length * fz * 0.6, 2048 * 0.38) * worldPerPxH * PAD;
    const rawH = fz * 1.4 * worldPerPxV * PAD;
    return {
      w: Math.max(0.08, Math.min(rawW, Math.PI * radius * 0.5)),
      h: Math.max(0.06, Math.min(rawH, height * 0.7)),
    };
  }, [text, fontSize, surface, radius, height]);
}

/**
 * Renders the hit-surface for one writing decoration.
 *
 * When idle: a small plane mesh positioned exactly at the text — same concept
 * as TopImageObject. Hovering anywhere else on the tier has no effect.
 *
 * When dragging: the small plane is replaced by a full-surface backdrop
 * (disc for top, open cylinder for side) to catch fast pointer moves.
 */
export default function CakeWriting({
  decoration,
  yCenter,
  height,
  radius,
  upperTierRadius,
  onUpdate,
  onDragStateChange,
}: CakeWritingProps) {
  const { gl } = useThree();
  const [dragMode, setDragMode] = useState<'top' | 'side' | null>(null);
  // Suppress the hitbox entirely when another decoration (figurine / topImage)
  // is being dragged — prevents the writing plane intercepting those events.
  const globalDragging = useBuilderStore((s) => s.isDragging);
  const hitboxActive = !globalDragging || dragMode !== null;

  const topY_local = height / 2;
  const tierBottom_world = yCenter - height / 2;
  const sideR = radius + 0.02;

  const { w: hitW, h: hitH } = useTextHitSize(
    decoration.text,
    decoration.fontSize,
    decoration.surface,
    radius,
    height,
  );

  // ── drag lifecycle ──────────────────────────────────────────────────────────

  const endDrag = useCallback(() => {
    setDragMode(null);
    onDragStateChange(false);
    gl.domElement.style.cursor = 'auto';
  }, [gl, onDragStateChange]);

  useEffect(() => {
    if (!dragMode) return;
    const onUp = () => endDrag();
    window.addEventListener('pointerup', onUp);
    return () => window.removeEventListener('pointerup', onUp);
  }, [dragMode, endDrag]);

  useEffect(() => {
    if (!decoration.text.trim() && dragMode) endDrag();
  }, [decoration.text, dragMode, endDrag]);

  // ── handlers ────────────────────────────────────────────────────────────────

  const startDragTop = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      setDragMode('top');
      onDragStateChange(true);
      gl.domElement.style.cursor = 'grabbing';
    },
    [gl, onDragStateChange],
  );

  const startDragSide = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      setDragMode('side');
      onDragStateChange(true);
      gl.domElement.style.cursor = 'grabbing';
    },
    [gl, onDragStateChange],
  );

  const moveTop = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      // Reuse the same ring clearance as figurines, converted to normalised coords.
      const innerNorm = upperTierRadius > 0
        ? (upperTierRadius + FIGURINE_RING.INNER_CLEARANCE) / radius
        : 0;
      const clampedInner = innerNorm < 0.88 ? innerNorm : 0;
      const [ox, oz] = clampToTopCircle(e.point.x / radius, e.point.z / radius, 0.88, clampedInner);
      onUpdate({ surface: 'top', offsetX: ox, offsetZ: oz });
    },
    [radius, upperTierRadius, onUpdate],
  );

  const moveSide = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      onUpdate({
        surface: 'side',
        sideAngle: Math.atan2(e.point.x, e.point.z),
        sideY: Math.max(0.15, Math.min(0.85, (e.point.y - tierBottom_world) / height)),
      });
    },
    [tierBottom_world, height, onUpdate],
  );

  const onHoverEnter = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      gl.domElement.style.cursor = 'grab';
    },
    [gl],
  );

  const onHoverLeave = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      gl.domElement.style.cursor = 'auto';
    },
    [gl],
  );

  const onPointerUp = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      endDrag();
    },
    [endDrag],
  );

  if (!decoration.text.trim()) return null;

  return (
    <>
      {/* ── TOP surface ───────────────────────────────────────────────────── */}

      {decoration.surface === 'top' && !dragMode && hitboxActive && (
        // Small plane at the text position. Rotation-z applies the text's own
        // rotation so the hitbox aligns with the rendered glyphs.
        <mesh
          position={[decoration.offsetX * radius, topY_local + 0.015, decoration.offsetZ * radius]}
          rotation={[-Math.PI / 2, 0, -(decoration.rotation ?? 0)]}
          onPointerDown={startDragTop}
          onPointerUp={onPointerUp}
          onPointerEnter={onHoverEnter}
          onPointerLeave={onHoverLeave}
        >
          <planeGeometry args={[hitW, hitH]} />
          <meshBasicMaterial transparent opacity={0} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
      )}

      {decoration.surface === 'top' && dragMode === 'top' && (
        // Full backdrop disc — catches fast pointer moves during drag.
        <mesh
          position={[0, topY_local + 0.015, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          onPointerMove={moveTop}
          onPointerUp={onPointerUp}
        >
          <planeGeometry args={[50, 50]} />
          <meshBasicMaterial visible={false} side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* ── SIDE surface ──────────────────────────────────────────────────── */}

      {decoration.surface === 'side' && !dragMode && hitboxActive && (
        // Small plane tangent to the cylinder at the text's angular position.
        // rotation-y = -sideAngle makes the plane face outward at that angle.
        // Local y: sideY is 0 (bottom) → -height/2, 1 (top) → +height/2.
        <mesh
          position={[
            Math.sin(decoration.sideAngle) * sideR,
            (decoration.sideY - 0.5) * height,
            Math.cos(decoration.sideAngle) * sideR,
          ]}
          rotation={[0, -decoration.sideAngle, 0]}
          onPointerDown={startDragSide}
          onPointerUp={onPointerUp}
          onPointerEnter={onHoverEnter}
          onPointerLeave={onHoverLeave}
        >
          <planeGeometry args={[hitW, hitH]} />
          <meshBasicMaterial transparent opacity={0} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
      )}

      {decoration.surface === 'side' && dragMode === 'side' && (
        // Full open cylinder backdrop during drag.
        <mesh
          onPointerMove={moveSide}
          onPointerUp={onPointerUp}
        >
          <cylinderGeometry args={[sideR, sideR, height + 0.1, 64, 1, true]} />
          <meshBasicMaterial visible={false} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
      )}
    </>
  );
}
