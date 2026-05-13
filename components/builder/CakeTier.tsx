'use client';

import { useRef, useEffect, useMemo, useState, useCallback } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import CakeWriting from './CakeWriting';
import FigurineObject from './FigurineObject';
import TopImageObject from './TopImageObject';
import { useBuilderStore } from './store';
import type { Tier, WritingDecoration, FigurineDecoration, TopImageDecoration } from './store';
import { TIER_SCALE, WRITING_FONTS, FIGURINE_RING } from './constants';

const SEGMENTS = 64;

// ── Canvas texture builders ───────────────────────────────────────────────────

/**
 * Normalised distance from disc centre above which text bends to follow
 * the concentric arc at its radial position. Range 0–1 (1 = disc edge).
 */
const ARC_THRESHOLD = 0.55;

function setTextStyle(
  ctx: CanvasRenderingContext2D,
  text: string,
  color: string,
  fontSize: number,
  fontFamilyId: string,
  fzOut?: { fz: number },
) {
  const baseFz = Math.max(24, Math.min(72, Math.floor(320 / Math.max(text.length, 4))));
  const fz = Math.round(baseFz * fontSize);
  if (fzOut) fzOut.fz = fz;
  const font = WRITING_FONTS.find((f) => f.id === fontFamilyId) ?? WRITING_FONTS[0];
  // Omit 'normal' tokens — "normal normal 24px Pacifico" confuses canvas parsers
  ctx.font = [
    font.style  !== 'normal' ? font.style  : null,
    font.weight !== 'normal' ? font.weight : null,
    `${fz}px`,
    font.family,
  ].filter(Boolean).join(' ');
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.strokeStyle = 'rgba(0,0,0,0.2)';
  ctx.lineWidth = fz * 0.1;
  ctx.lineJoin = 'round';
  ctx.fillStyle = color;
  ctx.shadowColor = 'rgba(0,0,0,0.28)';
  ctx.shadowBlur = 5;
  ctx.shadowOffsetY = 2;
}

function fillRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  const cr = (ctx as CanvasRenderingContext2D & {
    roundRect?: (x: number, y: number, w: number, h: number, radii: number) => void;
  }).roundRect;
  if (typeof cr === 'function') {
    cr.call(ctx, x, y, w, h, rr);
  } else {
    ctx.moveTo(x + rr, y);
    ctx.lineTo(x + w - rr, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
    ctx.lineTo(x + w, y + h - rr);
    ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
    ctx.lineTo(x + rr, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
    ctx.lineTo(x, y + rr);
    ctx.quadraticCurveTo(x, y, x + rr, y);
  }
  ctx.fill();
}

/** Straight single-line label at current origin (after optional ctx.translate / rotate). */
function drawStraightWritingAtOrigin(
  ctx: CanvasRenderingContext2D,
  writing: WritingDecoration,
  maxWidth: number,
) {
  const text = writing.text;
  const fontId = writing.fontFamily ?? 'playfair';
  const fzRef = { fz: 0 };
  setTextStyle(ctx, text, writing.color, writing.fontSize, fontId, fzRef);
  const { fz } = fzRef;

  const mw = Math.min(ctx.measureText(text).width, maxWidth);
  const textH = fz * 1.2;
  const pad = fz * 0.32;
  const wBox = mw + pad * 2;
  const hBox = textH + pad * 2;
  const cornerR = Math.min(fz * 0.35, 14);

  if (writing.textBgEnabled ?? false) {
    ctx.save();
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    ctx.shadowColor = 'transparent';
    ctx.fillStyle = writing.textBgColor ?? 'rgba(255,254,249,0.94)';
    fillRoundRect(ctx, -wBox / 2, -hBox / 2, wBox, hBox, cornerR);
    ctx.restore();
    ctx.fillStyle = writing.color;
  }

  ctx.strokeText(text, 0, 0, maxWidth);
  ctx.fillText(text, 0, 0, maxWidth);
}

interface ArcLayout {
  centreX: number;
  centreY: number;
  arcRadius: number;
  arcAngle: number;
  fontSize: number;
  fontFamilyId: string;
  rotation: number;
  chars: string[];
  widths: number[];
  dir: number;
  rotOffset: number;
  fz: number;
  currentAngle0: number;
}

function buildArcLayout(
  ctx: CanvasRenderingContext2D,
  writing: WritingDecoration,
  centreX: number,
  centreY: number,
  arcRadius: number,
  arcAngle: number,
): ArcLayout {
  const text = writing.text;
  const fontId = writing.fontFamily ?? 'playfair';
  const fzRef = { fz: 0 };
  setTextStyle(ctx, text, writing.color, writing.fontSize, fontId, fzRef);
  const { fz } = fzRef;

  const isLowerHalf = Math.sin(arcAngle) > 0;
  const chars = [...text];
  const KERN = fz * 0.04;
  const widths = chars.map((c) => ctx.measureText(c).width + KERN);
  const totalArcLen = widths.reduce((a, b) => a + b, 0) - KERN;
  const halfSpan = totalArcLen / 2 / arcRadius;
  const dir = isLowerHalf ? -1 : 1;
  const rotOffset = isLowerHalf ? -Math.PI / 2 : Math.PI / 2;
  const currentAngle0 = arcAngle - dir * halfSpan;

  return {
    centreX,
    centreY,
    arcRadius,
    arcAngle,
    fontSize: writing.fontSize,
    fontFamilyId: fontId,
    rotation: writing.rotation ?? 0,
    chars,
    widths,
    dir,
    rotOffset,
    fz,
    currentAngle0,
  };
}

function drawArcBackgroundFromLayout(ctx: CanvasRenderingContext2D, layout: ArcLayout, bgColor: string) {
  const {
    centreX, centreY, arcRadius, chars, widths, dir, rotOffset, fz, currentAngle0,
  } = layout;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  const pad = fz * 0.55;
  let currentAngle = currentAngle0;
  for (let i = 0; i < chars.length; i++) {
    const charAngle = currentAngle + dir * widths[i] / 2 / arcRadius;
    const px = centreX + arcRadius * Math.cos(charAngle);
    const py = centreY + arcRadius * Math.sin(charAngle);
    minX = Math.min(minX, px - pad);
    minY = Math.min(minY, py - pad);
    maxX = Math.max(maxX, px + pad);
    maxY = Math.max(maxY, py + pad);
    currentAngle += dir * widths[i] / arcRadius;
  }
  if (!Number.isFinite(minX)) return;
  ctx.save();
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  ctx.shadowColor = 'transparent';
  ctx.fillStyle = bgColor;
  const bw = maxX - minX + fz * 0.2;
  const bh = maxY - minY + fz * 0.2;
  fillRoundRect(ctx, minX - fz * 0.1, minY - fz * 0.1, bw, bh, Math.min(fz * 0.4, 18));
  ctx.restore();
}

function drawArcCharactersFromLayout(ctx: CanvasRenderingContext2D, layout: ArcLayout, writing: WritingDecoration) {
  const {
    centreX, centreY, arcRadius, chars, widths, dir, rotOffset, fz, currentAngle0, rotation, fontFamilyId, fontSize,
  } = layout;
  const text = writing.text;
  setTextStyle(ctx, text, writing.color, fontSize, fontFamilyId);
  let currentAngle = currentAngle0;
  for (let i = 0; i < chars.length; i++) {
    const charAngle = currentAngle + dir * widths[i] / 2 / arcRadius;
    ctx.save();
    ctx.translate(
      centreX + arcRadius * Math.cos(charAngle),
      centreY + arcRadius * Math.sin(charAngle),
    );
    ctx.rotate(charAngle + rotOffset + rotation);
    ctx.strokeText(chars[i], 0, 0);
    ctx.fillText(chars[i], 0, 0);
    ctx.restore();
    currentAngle += dir * widths[i] / arcRadius;
  }
}

function drawArcWriting(
  ctx: CanvasRenderingContext2D,
  writing: WritingDecoration,
  centreX: number,
  centreY: number,
  arcRadius: number,
  arcAngle: number,
) {
  const layout = buildArcLayout(ctx, writing, centreX, centreY, arcRadius, arcAngle);
  if (writing.textBgEnabled ?? false) {
    drawArcBackgroundFromLayout(ctx, layout, writing.textBgColor ?? 'rgba(255,254,249,0.94)');
  }
  drawArcCharactersFromLayout(ctx, layout, writing);
}

/**
 * Top surface texture (512×512).
 *
 * When the text centre is within ARC_THRESHOLD of the disc centre it is
 * drawn straight (standard behaviour).  Beyond that the characters bend to
 * follow the concentric arc at their radial distance, snapping naturally to
 * the curvature of the cake edge.
 *
 * UV mapping for CircleGeometry rotated [-π/2,0,0]:
 *   cx = (0.5 + offsetX·0.5)·S
 *   cy = (0.5 + offsetZ·0.5)·S
 */
function buildTopTexture(writing: WritingDecoration): THREE.CanvasTexture {
  const S = 512;
  const canvas = document.createElement('canvas');
  canvas.width = S;
  canvas.height = S;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, S, S);

  const cx = (0.5 + writing.offsetX * 0.5) * S;
  const cy = (0.5 + writing.offsetZ * 0.5) * S;
  const dist = Math.sqrt(writing.offsetX ** 2 + writing.offsetZ ** 2);

  if (dist >= ARC_THRESHOLD) {
    const arcRadius = dist * S * 0.5;
    const arcAngle = Math.atan2(cy - S / 2, cx - S / 2);
    drawArcWriting(ctx, writing, S / 2, S / 2, arcRadius, arcAngle);
  } else {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(writing.rotation ?? 0);
    drawStraightWritingAtOrigin(ctx, writing, S * 0.88);
    ctx.restore();
  }

  return new THREE.CanvasTexture(canvas);
}

/**
 * Side surface texture (2048×512).
 * sideY is already 0-1 relative to tier bottom, so it maps directly to UV v.
 * Three.js CylinderGeometry UV: u = theta/(2π) where x=r·sin(θ), z=r·cos(θ)
 * → sideAngle = atan2(x, z) so u = sideAngle/(2π) (normalised to [0,1)).
 */
function buildSideTexture(writing: WritingDecoration): THREE.CanvasTexture {
  const W = 2048;
  const H = 512;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, W, H);

  const thetaNorm = ((writing.sideAngle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  const u = thetaNorm / (2 * Math.PI);
  const v = Math.max(0.02, Math.min(0.98, writing.sideY)); // already 0-1
  const cx = u * W;
  const cy = (1 - v) * H; // flipY: v=1 (top) → cy=0; v=0 (bottom) → cy=H

  const rot = writing.rotation ?? 0;
  for (const xOff of [0, W, -W]) {
    ctx.save();
    ctx.translate(cx + xOff, cy);
    ctx.rotate(rot);
    drawStraightWritingAtOrigin(ctx, writing, W * 0.38);
    ctx.restore();
  }

  return new THREE.CanvasTexture(canvas);
}

// ── Drag helper ───────────────────────────────────────────────────────────────

/**
 * Clamps (x, z) to an annulus defined by innerR and outerR.
 * When innerR = 0 this is a plain disc clamp, identical to the old clampToCircle.
 * The degenerate dist ≈ 0 case is pushed radially to (innerR, 0) to avoid
 * dividing by zero when normalising the zero vector.
 */
function clampToRing(
  x: number,
  z: number,
  innerR: number,
  outerR: number,
): [number, number] {
  const dist = Math.sqrt(x * x + z * z);
  if (dist > outerR) {
    const s = outerR / dist;
    return [x * s, z * s];
  }
  if (innerR > 0 && dist < innerR) {
    if (dist < 0.0001) return [innerR, 0];
    const s = innerR / dist;
    return [x * s, z * s];
  }
  return [x, z];
}

// ── CakeTier ──────────────────────────────────────────────────────────────────

interface CakeTierProps {
  tier: Tier;
  yCenter: number;
  isActive: boolean;
  onClick: () => void;
  /** World radius of the tier directly above this one. 0 when this is the top tier. */
  upperTierRadius: number;
}

export default function CakeTier({ tier, yCenter, isActive, onClick, upperTierRadius }: CakeTierProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const { gl } = useThree();

  // Preload all writing fonts once so canvas can render them without timing issues.
  // document.fonts.load() is a no-op for already-loaded fonts, so this is cheap.
  const [fontsLoaded, setFontsLoaded] = useState(false);
  useEffect(() => {
    Promise.all(
      WRITING_FONTS.map((f) => {
        const spec = [
          f.style  !== 'normal' ? f.style  : null,
          f.weight !== 'normal' ? f.weight : null,
          '16px',
          f.family,
        ].filter(Boolean).join(' ');
        return document.fonts.load(spec);
      }),
    ).then(() => setFontsLoaded(true));
  }, []);

  const updateDecoration = useBuilderStore((s) => s.updateDecoration);
  const removeDecoration = useBuilderStore((s) => s.removeDecoration);
  const setDragging = useBuilderStore((s) => s.setDragging);

  const radius = tier.diameter * TIER_SCALE.radiusMultiplier;
  const height = tier.height * TIER_SCALE.heightMultiplier;
  const tierTopY_local = height / 2;

  // Ring clamp bounds used by both the drag capture plane and FigurineObject.
  const ringOuterR = upperTierRadius > 0
    ? radius * FIGURINE_RING.OUTER_FACTOR_RING
    : radius * FIGURINE_RING.OUTER_FACTOR_FREE;
  const ringInnerR = upperTierRadius > 0
    ? upperTierRadius + FIGURINE_RING.INNER_CLEARANCE
    : 0;

  // Split decorations by kind and surface
  const writings = tier.decorations.filter((d): d is WritingDecoration => d.kind === 'writing');
  const figurines = tier.decorations.filter((d): d is FigurineDecoration => d.kind === 'figurine');
  const topImages = tier.decorations.filter((d): d is TopImageDecoration => d.kind === 'topImage');
  const topWriting = writings.find((w) => w.surface === 'top') ?? null;
  const sideWriting = writings.find((w) => w.surface === 'side') ?? null;

  // ── Frosting colours ────────────────────────────────────────────────────────
  const frostingColor = new THREE.Color(tier.color);
  const sideColor = frostingColor.clone().multiplyScalar(0.88);
  const rimColorRaw = frostingColor.clone().multiplyScalar(1.08);
  const rimColor = new THREE.Color(
    Math.min(1, rimColorRaw.r),
    Math.min(1, rimColorRaw.g),
    Math.min(1, rimColorRaw.b),
  );

  // ── Writing textures ─────────────────────────────────────────────────────────
  // useMemo is the right primitive here: textures are pure derived values from
  // the writing props. Synchronous derivation avoids all RAF closure / Strict-Mode
  // double-invocation race conditions that plagued the previous async approach.

  const topTex = useMemo<THREE.CanvasTexture | null>(() => {
    if (!fontsLoaded || !topWriting?.text.trim()) return null;
    return buildTopTexture(topWriting);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fontsLoaded, topWriting?.text, topWriting?.color, topWriting?.offsetX, topWriting?.offsetZ, topWriting?.fontSize, topWriting?.fontFamily, topWriting?.rotation, topWriting?.textBgEnabled, topWriting?.textBgColor]);

  const sideTex = useMemo<THREE.CanvasTexture | null>(() => {
    if (!fontsLoaded || !sideWriting?.text.trim()) return null;
    return buildSideTexture(sideWriting);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fontsLoaded, sideWriting?.text, sideWriting?.color, sideWriting?.sideAngle, sideWriting?.sideY, sideWriting?.fontSize, sideWriting?.fontFamily, sideWriting?.rotation, sideWriting?.textBgEnabled, sideWriting?.textBgColor]);

  // Dispose old GPU texture whenever a new one is computed or the tier unmounts.
  useEffect(() => () => { topTex?.dispose(); }, [topTex]);
  useEffect(() => () => { sideTex?.dispose(); }, [sideTex]);

  // ── Figurine drag ───────────────────────────────────────────────────────────

  const [draggingMoveUid, setDraggingMoveUid] = useState<string | null>(null);

  const startMoveDrag = useCallback(
    (uid: string) => {
      setDraggingMoveUid(uid);
      setDragging(true);
    },
    [setDragging],
  );

  const endMoveDrag = useCallback(() => {
    setDraggingMoveUid(null);
    setDragging(false);
    gl.domElement.style.cursor = 'auto';
  }, [setDragging, gl]);

  // Global safety-net: end drag if pointer released outside canvas
  useEffect(() => {
    if (!draggingMoveUid) return;
    const onUp = () => endMoveDrag();
    window.addEventListener('pointerup', onUp);
    return () => window.removeEventListener('pointerup', onUp);
  }, [draggingMoveUid, endMoveDrag]);

  return (
    <group position={[0, yCenter, 0]} onClick={(e) => { e.stopPropagation(); onClick(); }}>

      {/* ── Tier geometry ──────────────────────────────────────────────────── */}

      <mesh ref={meshRef} castShadow receiveShadow>
        <cylinderGeometry args={[radius, radius, height, SEGMENTS]} />
        <meshStandardMaterial color={sideColor} roughness={0.65} metalness={0.0} />
      </mesh>

      {/* Top frosting disc */}
      <mesh position={[0, tierTopY_local, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[radius, SEGMENTS]} />
        <meshStandardMaterial color={frostingColor} roughness={0.5} metalness={0.0} />
      </mesh>

      {/* Piped frosting border torus */}
      <mesh position={[0, tierTopY_local, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[radius - 0.006, 0.009, 12, SEGMENTS]} />
        <meshStandardMaterial color={rimColor} roughness={0.45} metalness={0.05} />
      </mesh>

      {/* Bottom base ring */}
      <mesh position={[0, -tierTopY_local, 0]}>
        <cylinderGeometry args={[radius + 0.015, radius + 0.015, 0.012, SEGMENTS]} />
        <meshStandardMaterial color={rimColor} roughness={0.6} />
      </mesh>

      {/* Active selection ring */}
      {isActive && (
        <mesh position={[0, -tierTopY_local - 0.008, 0]}>
          <cylinderGeometry args={[radius + 0.018, radius + 0.018, 0.012, SEGMENTS]} />
          <meshStandardMaterial
            color="#8B6B47"
            emissive="#8B6B47"
            emissiveIntensity={0.6}
            roughness={0.3}
          />
        </mesh>
      )}

      {/* ── Writing texture overlays ────────────────────────────────────────── */}

      {topWriting && topTex && (
        <mesh position={[0, tierTopY_local + 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[radius * 0.97, SEGMENTS]} />
          <meshBasicMaterial map={topTex} transparent alphaTest={0.01} depthWrite={false} />
        </mesh>
      )}

      {sideWriting && sideTex && (
        <mesh>
          <cylinderGeometry args={[radius * 1.002, radius * 1.002, height, SEGMENTS, 1, true]} />
          <meshBasicMaterial
            map={sideTex}
            transparent
            alphaTest={0.01}
            depthWrite={false}
            side={THREE.FrontSide}
          />
        </mesh>
      )}

      {/* ── Writing interaction surfaces ────────────────────────────────────── */}

      {writings.map((w) => (
        <CakeWriting
          key={w.uid}
          decoration={w}
          yCenter={yCenter}
          height={height}
          radius={radius}
          upperTierRadius={upperTierRadius}
          onUpdate={(updates) => updateDecoration(tier.id, w.uid, updates)}
          onDragStateChange={setDragging}
        />
      ))}

      {/* ── Figurines ────────────────────────────────────────────────────────── */}

      {figurines.map((fig) => (
        <FigurineObject
          key={fig.uid}
          decoration={fig}
          tierTopY_local={tierTopY_local}
          tierRadius={radius}
          ringInnerR={ringInnerR}
          ringOuterR={ringOuterR}
          isDragTarget={draggingMoveUid === fig.uid}
          onDragStart={startMoveDrag}
          onDragEnd={endMoveDrag}
          onMove={(uid, position) => updateDecoration(tier.id, uid, { position })}
          onRemove={(uid) => removeDecoration(tier.id, uid)}
        />
      ))}

      {topImages.map((img) => (
        <TopImageObject
          key={img.uid}
          decoration={img}
          tierTopY_local={tierTopY_local}
          tierRadius={radius}
          isDragTarget={draggingMoveUid === img.uid}
          onDragStart={startMoveDrag}
          onDragEnd={endMoveDrag}
          onRemove={(uid) => removeDecoration(tier.id, uid)}
        />
      ))}

      {/* Figurine drag capture plane at this tier's top surface */}
      {draggingMoveUid && (
        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, tierTopY_local, 0]}
          onPointerMove={(e) => {
            e.stopPropagation();
            const deco = tier.decorations.find((d) => d.uid === draggingMoveUid);
            if (!deco || (deco.kind !== 'figurine' && deco.kind !== 'topImage')) return;
            const [cx, cz] = clampToRing(e.point.x, e.point.z, ringInnerR, ringOuterR);
            updateDecoration(tier.id, draggingMoveUid, { position: [cx, cz] });
          }}
          onPointerUp={(e) => {
            e.stopPropagation();
            endMoveDrag();
          }}
        >
          <planeGeometry args={[100, 100]} />
          <meshBasicMaterial visible={false} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
}
