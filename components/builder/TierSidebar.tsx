'use client';

import { useState, useRef, type ChangeEvent } from 'react';
import { useBuilderStore } from './store';
import type {
  Tier,
  WritingDecoration,
  FigurineDecoration,
  TopImageDecoration,
  Decoration,
} from './store';
import {
  FROSTING_COLORS,
  WRITING_COLORS,
  WRITING_BG_COLORS,
  WRITING_FONTS,
  FLAVORS,
  FIGURINE_PRESETS,
  PRICING,
  TIER_SCALE,
  FIGURINE_RING,
} from './constants';

// ── Type helpers ──────────────────────────────────────────────────────────────

function isWriting(d: Decoration): d is WritingDecoration {
  return d.kind === 'writing';
}

function isFigurine(d: Decoration): d is FigurineDecoration {
  return d.kind === 'figurine';
}

function isTopImage(d: Decoration): d is TopImageDecoration {
  return d.kind === 'topImage';
}

// ── Shared primitives ─────────────────────────────────────────────────────────

function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block">
      <span className="text-[11px] font-medium text-charcoal-600 block mb-1">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none bg-cream-200 accent-brown-500 cursor-pointer"
      />
    </label>
  );
}

function ColorDots({
  options,
  selected,
  onSelect,
}: {
  options: { hex: string; label: string }[];
  selected: string;
  onSelect: (hex: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((c) => (
        <button
          key={c.hex}
          title={c.label}
          onClick={() => onSelect(c.hex)}
          className={`w-5 h-5 rounded-full border-2 transition-transform hover:scale-110 flex-shrink-0 ${
            selected === c.hex ? 'border-brown-600 scale-110 shadow-md' : 'border-transparent'
          }`}
          style={{ backgroundColor: c.hex }}
        />
      ))}
    </div>
  );
}

// ── Decoration editing panels ─────────────────────────────────────────────────

function WritingPanel({
  tierId,
  decoration,
  onClose,
}: {
  tierId: string;
  decoration: WritingDecoration;
  onClose: () => void;
}) {
  const { updateDecoration, removeDecoration } = useBuilderStore();

  const upd = (updates: Partial<WritingDecoration>) =>
    updateDecoration(tierId, decoration.uid, updates);

  const rotDeg = Math.round(((decoration.rotation ?? 0) * 180) / Math.PI) % 360;

  const switchSurface = (surface: 'top' | 'side') => {
    if (surface === decoration.surface) return;
    upd(
      surface === 'side'
        ? { surface: 'side', sideAngle: 0, sideY: 0.5 }
        : { surface: 'top', offsetX: 0, offsetZ: 0 },
    );
  };

  return (
    <div className="mt-2 p-3 bg-cream-50 border border-cream-200 rounded-xl space-y-3">
      {/* Surface toggle */}
      <div>
        <span className="text-[11px] font-medium text-charcoal-600 block mb-1.5">Superficie</span>
        <div className="flex gap-1.5">
          {(['top', 'side'] as const).map((s) => (
            <button
              key={s}
              onClick={() => switchSurface(s)}
              className={`flex-1 py-1 rounded-lg text-xs font-semibold transition-all ${
                decoration.surface === s
                  ? 'bg-brown-500 text-white shadow-sm'
                  : 'bg-white border border-cream-300 text-charcoal-600 hover:border-brown-300'
              }`}
            >
              {s === 'top' ? 'In cima' : 'Sul lato'}
            </button>
          ))}
        </div>
      </div>

      {/* Text input */}
      <div>
        <span className="text-[11px] font-medium text-charcoal-600 block mb-1">Testo</span>
        <input
          type="text"
          value={decoration.text}
          onChange={(e) => upd({ text: e.target.value.slice(0, 30) })}
          placeholder="Es. Buon Compleanno!"
          maxLength={30}
          className="w-full px-2.5 py-1.5 rounded-lg border border-cream-300 focus:border-brown-500 focus:outline-none text-xs text-charcoal-900 placeholder:text-charcoal-400 bg-white"
        />
        <div className="flex justify-end mt-0.5">
          <span className="text-[10px] text-charcoal-400">{decoration.text.length}/30</span>
        </div>
      </div>

      {/* Color */}
      <div>
        <span className="text-[11px] font-medium text-charcoal-600 block mb-1.5">Colore</span>
        <ColorDots
          options={WRITING_COLORS}
          selected={decoration.color}
          onSelect={(hex) => upd({ color: hex })}
        />
      </div>

      {/* Font */}
      <div>
        <span className="text-[11px] font-medium text-charcoal-600 block mb-1.5">Carattere</span>
        <div className="grid grid-cols-2 gap-1">
          {WRITING_FONTS.map((f) => (
            <button
              key={f.id}
              onClick={() => upd({ fontFamily: f.id })}
              style={{ fontFamily: f.family, fontWeight: f.weight, fontStyle: f.style }}
              className={`px-2 py-1.5 rounded-lg text-sm transition-all truncate ${
                (decoration.fontFamily ?? 'playfair') === f.id
                  ? 'bg-brown-500 text-white shadow-sm'
                  : 'bg-white border border-cream-300 text-charcoal-800 hover:border-brown-300'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Text background */}
      <div>
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <span className="text-[11px] font-medium text-charcoal-600">Sfondo dietro la scritta</span>
          <button
            type="button"
            onClick={() =>
              upd({
                textBgEnabled: !(decoration.textBgEnabled ?? false),
                textBgColor: decoration.textBgColor ?? WRITING_BG_COLORS[0].hex,
              })
            }
            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full transition-all ${
              (decoration.textBgEnabled ?? false)
                ? 'bg-brown-500 text-white'
                : 'bg-cream-200 text-charcoal-600'
            }`}
          >
            {(decoration.textBgEnabled ?? false) ? 'On' : 'Off'}
          </button>
        </div>
        {(decoration.textBgEnabled ?? false) && (
          <ColorDots
            options={WRITING_BG_COLORS}
            selected={decoration.textBgColor ?? WRITING_BG_COLORS[0].hex}
            onSelect={(hex) => upd({ textBgColor: hex })}
          />
        )}
      </div>

      {/* Size */}
      <Slider
        label={`Dimensione · ${decoration.fontSize.toFixed(1)}×`}
        value={decoration.fontSize}
        min={0.5}
        max={1.8}
        step={0.05}
        onChange={(v) => upd({ fontSize: v })}
      />

      {/* Rotation */}
      <Slider
        label={`Rotazione · ${rotDeg}°`}
        value={rotDeg}
        min={0}
        max={359}
        step={1}
        onChange={(v) => upd({ rotation: (v * Math.PI) / 180 })}
      />

      {/* Centre button (top only) */}
      {decoration.surface === 'top' && (
        <button
          onClick={() => upd({ offsetX: 0, offsetZ: 0 })}
          className="w-full py-1 rounded-lg text-xs text-brown-600 hover:bg-brown-50 transition-colors border border-brown-200"
        >
          Centra sul piano
        </button>
      )}

      {/* Drag hint */}
      {decoration.text.trim() && (
        <p className="text-[10px] text-charcoal-500 bg-amber-50 border border-amber-100 rounded-lg px-2 py-1.5 leading-snug">
          ✋ Trascina la scritta sulla torta per spostarla
        </p>
      )}

      {/* Remove */}
      <button
        onClick={() => { removeDecoration(tierId, decoration.uid); onClose(); }}
        className="w-full py-1.5 rounded-lg text-xs font-medium text-rose-600 hover:bg-rose-50 transition-colors border border-rose-200"
      >
        Rimuovi scritta
      </button>
    </div>
  );
}

function FigurinePanel({
  tierId,
  decoration,
  onClose,
}: {
  tierId: string;
  decoration: FigurineDecoration;
  onClose: () => void;
}) {
  const { updateDecoration, removeDecoration } = useBuilderStore();

  const upd = (updates: Partial<FigurineDecoration>) =>
    updateDecoration(tierId, decoration.uid, updates);

  const rotDeg = Math.round(((decoration.rotation ?? 0) * 180) / Math.PI) % 360;

  return (
    <div className="mt-2 p-3 bg-cream-50 border border-cream-200 rounded-xl space-y-3">
      <div className="flex items-center gap-2.5 mb-1">
        <span className="text-3xl leading-none">{decoration.preset.emoji}</span>
        <div>
          <p className="text-xs font-semibold text-charcoal-900">{decoration.preset.label}</p>
          <p className="text-[11px] text-brown-500">+€{decoration.preset.price}</p>
        </div>
      </div>

      <Slider
        label={`Dimensione · ${(decoration.scale ?? 1).toFixed(2)}×`}
        value={decoration.scale ?? 1}
        min={0.4}
        max={2.5}
        step={0.05}
        onChange={(v) => upd({ scale: v })}
      />

      <Slider
        label={`Rotazione · ${rotDeg}°`}
        value={rotDeg}
        min={0}
        max={359}
        step={1}
        onChange={(v) => upd({ rotation: (v * Math.PI) / 180 })}
      />

      <p className="text-[10px] text-charcoal-500 bg-amber-50 border border-amber-100 rounded-lg px-2 py-1.5 leading-snug">
        ✋ Trascina sul livello per posizionare · doppio click per rimuovere
      </p>

      <button
        onClick={() => { removeDecoration(tierId, decoration.uid); onClose(); }}
        className="w-full py-1.5 rounded-lg text-xs font-medium text-rose-600 hover:bg-rose-50 transition-colors border border-rose-200"
      >
        Rimuovi figurina
      </button>
    </div>
  );
}

function TopImagePanel({
  tierId,
  decoration,
  onClose,
}: {
  tierId: string;
  decoration: TopImageDecoration;
  onClose: () => void;
}) {
  const { updateDecoration, removeDecoration } = useBuilderStore();

  const upd = (updates: Partial<TopImageDecoration>) =>
    updateDecoration(tierId, decoration.uid, updates);

  const rotDeg = Math.round(((decoration.rotation ?? 0) * 180) / Math.PI) % 360;

  return (
    <div className="mt-2 p-3 bg-cream-50 border border-cream-200 rounded-xl space-y-3">
      <p className="text-[11px] font-semibold text-charcoal-800">Immagine sul piano superiore</p>
      <div className="flex justify-center rounded-lg border border-cream-200 bg-white overflow-hidden max-h-32">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={decoration.imageUrl} alt="" className="max-h-32 w-full object-contain" />
      </div>
      {decoration.storagePath && (
        <p className="text-[9px] text-charcoal-400 break-all leading-tight">{decoration.storagePath}</p>
      )}
      <Slider
        label={`Larghezza · ${(decoration.scale ?? 0.38).toFixed(2)}`}
        value={decoration.scale ?? 0.38}
        min={0.12}
        max={0.85}
        step={0.02}
        onChange={(v) => upd({ scale: v })}
      />
      <Slider
        label={`Rotazione · ${rotDeg}°`}
        value={rotDeg}
        min={0}
        max={359}
        step={1}
        onChange={(v) => upd({ rotation: (v * Math.PI) / 180 })}
      />
      <p className="text-[10px] text-charcoal-500 bg-amber-50 border border-amber-100 rounded-lg px-2 py-1.5 leading-snug">
        ✋ Trascina sulla torta · doppio click per rimuovere
      </p>
      <button
        onClick={() => { removeDecoration(tierId, decoration.uid); onClose(); }}
        className="w-full py-1.5 rounded-lg text-xs font-medium text-rose-600 hover:bg-rose-50 transition-colors border border-rose-200"
      >
        Rimuovi immagine
      </button>
    </div>
  );
}

// ── Figurine picker panel ─────────────────────────────────────────────────────

function FigurinePicker({
  tierId,
  onClose,
  ringInnerR,
  ringOuterR,
}: {
  tierId: string;
  onClose: () => void;
  ringInnerR: number;
  ringOuterR: number;
}) {
  const { addDecoration } = useBuilderStore();

  return (
    <div className="mt-2 p-3 bg-cream-50 border border-cream-200 rounded-xl">
      <p className="text-[11px] font-semibold text-charcoal-700 mb-2">Scegli una figurina</p>
      <div className="grid grid-cols-2 gap-1.5">
        {FIGURINE_PRESETS.map((preset) => (
          <button
            key={preset.id}
            onClick={() => {
              // Spawn in the ring when there's an upper tier, otherwise near centre.
              let spawnX = (Math.random() - 0.5) * 0.2;
              let spawnZ = (Math.random() - 0.5) * 0.2;
              if (ringInnerR > 0) {
                const spawnR = ringInnerR + (ringOuterR - ringInnerR) * 0.5;
                const angle = Math.random() * 2 * Math.PI;
                spawnX = Math.cos(angle) * spawnR;
                spawnZ = Math.sin(angle) * spawnR;
              }
              addDecoration(tierId, {
                kind: 'figurine' as const,
                preset,
                position: [spawnX, spawnZ],
                scale: 1.0,
                rotation: 0,
              });
              onClose();
            }}
            className="flex items-center gap-2 p-2 rounded-lg border border-cream-300 bg-white hover:border-brown-300 hover:bg-cream-50 transition-all text-left"
          >
            <span className="text-xl leading-none">{preset.emoji}</span>
            <div className="min-w-0">
              <div className="text-[11px] font-semibold text-charcoal-900 truncate">{preset.label}</div>
              <div className="text-[10px] text-brown-500">+€{preset.price}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Tier card ─────────────────────────────────────────────────────────────────

type ActivePanel =
  | { kind: 'writing'; uid: string }
  | { kind: 'figurine'; uid: string }
  | { kind: 'figurinePicker' }
  | { kind: 'topImage'; uid: string }
  | null;

function TierCard({
  tier,
  index,
  isActive,
  onActivate,
  uploadToken,
  flavours,
}: {
  tier: Tier;
  index: number;
  isActive: boolean;
  onActivate: () => void;
  uploadToken: string;
  flavours?: { id: string; label: string }[];
}) {
  const { tiers, removeTier, updateTier, addDecoration } = useBuilderStore();
  const [activePanel, setActivePanel] = useState<ActivePanel>(null);
  const [isExpanded, setIsExpanded] = useState(true);
  const [glbNotice, setGlbNotice] = useState<string | null>(null);
  const topImageFileRef = useRef<HTMLInputElement>(null);
  const glbFileRef = useRef<HTMLInputElement>(null);

  const label = index === 0 ? 'Base' : `L${index + 1}`;
  const isTopTier = index === tiers.length - 1;

  // Ring bounds — determines whether figurines can be placed on this tier
  // and where they spawn when the tier has another tier sitting on top of it.
  const upperTierDiameter = !isTopTier ? tiers[index + 1].diameter : 0;
  const upperTierRadius = upperTierDiameter * TIER_SCALE.radiusMultiplier;
  const tierRadius = tier.diameter * TIER_SCALE.radiusMultiplier;
  const ringOuterR = upperTierRadius > 0
    ? tierRadius * FIGURINE_RING.OUTER_FACTOR_RING
    : tierRadius * FIGURINE_RING.OUTER_FACTOR_FREE;
  const ringInnerR = upperTierRadius > 0 ? upperTierRadius + FIGURINE_RING.INNER_CLEARANCE : 0;
  const canPlaceFigurines = upperTierRadius === 0 || (ringOuterR - ringInnerR) >= FIGURINE_RING.MIN_WIDTH;

  const writings = tier.decorations.filter(isWriting);
  const figurines = tier.decorations.filter(isFigurine);
  const topImages = tier.decorations.filter(isTopImage);
  const hasWriting = writings.length > 0;
  const topImageCount = topImages.length;

  function togglePanel(next: ActivePanel) {
    setActivePanel((prev) => {
      if (!prev || !next) return next;
      const same =
        (prev.kind === 'writing' && next.kind === 'writing' && prev.uid === next.uid) ||
        (prev.kind === 'figurine' && next.kind === 'figurine' && prev.uid === next.uid) ||
        (prev.kind === 'topImage' && next.kind === 'topImage' && prev.uid === next.uid) ||
        (prev.kind === 'figurinePicker' && next.kind === 'figurinePicker');
      return same ? null : next;
    });
  }

  function addWriting() {
    // Default to 'side'; user switches surface in the WritingPanel.
    addDecoration(tier.id, {
      kind: 'writing' as const,
      surface: 'side',
      text: '',
      color: WRITING_COLORS[0].hex,
      fontSize: 1.0,
      fontFamily: 'playfair',
      rotation: 0,
      textBgEnabled: false,
      textBgColor: 'rgba(255,254,249,0.94)',
      offsetX: 0,
      offsetZ: 0,
      sideAngle: 0,
      sideY: 0.5,
    });
    // Zustand set() is synchronous — read back the new uid immediately.
    const updatedTier = useBuilderStore.getState().tiers.find((t) => t.id === tier.id);
    const newDeco = updatedTier?.decorations.find(
      (d): d is WritingDecoration => d.kind === 'writing',
    );
    if (newDeco) setActivePanel({ kind: 'writing', uid: newDeco.uid });
  }

  async function handleTopImageSelected(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || topImageCount >= 3) return;
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/builder/upload-top-image', {
        method: 'POST',
        headers: { 'x-builder-token': uploadToken },
        body: fd,
      });
      const data = await res.json();
      if (!data.success) {
        window.alert(data.error || 'Caricamento fallito');
        return;
      }
      addDecoration(tier.id, {
        kind: 'topImage' as const,
        imageUrl: data.url,
        storagePath: data.path,
        position: [0, 0],
        scale: 0.38,
        rotation: 0,
      });
      const updated = useBuilderStore.getState().tiers.find((t) => t.id === tier.id);
      const last = updated?.decorations.filter(isTopImage).at(-1);
      if (last) setActivePanel({ kind: 'topImage', uid: last.uid });
    } catch {
      window.alert('Errore di rete');
    }
  }

  async function handleGlbSelected(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !isTopTier) return;
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/builder/upload-finished-glb', {
        method: 'POST',
        headers: { 'x-builder-token': uploadToken },
        body: fd,
      });
      const data = await res.json();
      if (!data.success) {
        window.alert(data.error || 'Caricamento fallito');
        return;
      }
      setGlbNotice(data.url);
    } catch {
      window.alert('Errore di rete');
    }
  }

  return (
    <div
      className={`rounded-2xl border transition-all ${
        isActive
          ? 'border-brown-400 shadow-md bg-white'
          : 'border-cream-200 bg-white/90 hover:border-cream-300'
      }`}
    >
      {/* ── Header ── */}
      <div
        className="flex items-center gap-2 px-3.5 py-2.5 cursor-pointer select-none"
        onClick={() => { onActivate(); setIsExpanded((v) => !v); }}
      >
        <span
          className="w-3 h-3 rounded-full flex-shrink-0 ring-1 ring-black/10"
          style={{ backgroundColor: tier.color }}
        />
        <span className="text-sm font-bold text-charcoal-900 flex-1">{label}</span>
        {tier.isDecorative && (
          <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full leading-none">
            Scenico
          </span>
        )}
        {/* Remove button (not for base) */}
        {index > 0 && (
          <button
            onClick={(e) => { e.stopPropagation(); removeTier(tier.id); }}
            className="p-0.5 text-charcoal-300 hover:text-rose-500 transition-colors"
            title="Rimuovi livello"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
        {/* Collapse chevron */}
        <svg
          className={`w-3.5 h-3.5 text-charcoal-400 transition-transform duration-200 flex-shrink-0 ${isExpanded ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {isExpanded && <div className="px-3.5 pb-3.5 space-y-3">

        {/* ── Decoration chips row ── */}
        <div>
          <p className="text-[10px] font-semibold text-charcoal-400 uppercase tracking-wide mb-1.5">
            Decorazioni
          </p>
          <div className="flex flex-wrap gap-1.5">

            {/* Existing writing chips */}
            {writings.map((w) => {
              const isOpen = activePanel?.kind === 'writing' && activePanel.uid === w.uid;
              const label = w.surface === 'top' ? '✍️ Cima' : '✍️ Lato';
              const preview = w.text.trim() ? ` · ${w.text.slice(0, 10)}${w.text.length > 10 ? '…' : ''}` : '';
              return (
                <button
                  key={w.uid}
                  onClick={() => togglePanel({ kind: 'writing', uid: w.uid })}
                  className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-all ${
                    isOpen
                      ? 'bg-brown-500 text-white shadow-sm'
                      : 'bg-cream-100 text-charcoal-700 hover:bg-cream-200'
                  }`}
                >
                  {label}{preview}
                </button>
              );
            })}

            {/* Single add-writing button — surface chosen inside the panel */}
            {!hasWriting && (
              <button
                onClick={addWriting}
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium bg-cream-100 text-charcoal-500 hover:bg-cream-200 hover:text-charcoal-700 border border-dashed border-cream-300 transition-all"
                title="Aggiungi scritta"
              >
                + ✍️ Scritta
              </button>
            )}

            {/* Existing figurine chips */}
            {figurines.map((fig) => {
              const isOpen = activePanel?.kind === 'figurine' && activePanel.uid === fig.uid;
              return (
                <button
                  key={fig.uid}
                  onClick={() => togglePanel({ kind: 'figurine', uid: fig.uid })}
                  title={fig.preset.label}
                  className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-all ${
                    isOpen
                      ? 'bg-brown-500 text-white shadow-sm'
                      : 'bg-cream-100 text-charcoal-700 hover:bg-cream-200'
                  }`}
                >
                  {fig.preset.emoji} {fig.preset.label}
                </button>
              );
            })}

            <input
              ref={topImageFileRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              className="hidden"
              onChange={handleTopImageSelected}
            />
            <input
              ref={glbFileRef}
              type="file"
              accept=".glb,model/gltf-binary,application/octet-stream"
              className="hidden"
              onChange={handleGlbSelected}
            />

            {topImages.map((img) => {
              const isOpen = activePanel?.kind === 'topImage' && activePanel.uid === img.uid;
              return (
                <button
                  key={img.uid}
                  type="button"
                  onClick={() => togglePanel({ kind: 'topImage', uid: img.uid })}
                  className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-all ${
                    isOpen
                      ? 'bg-brown-500 text-white shadow-sm'
                      : 'bg-cream-100 text-charcoal-700 hover:bg-cream-200'
                  }`}
                >
                  🖼️ Immagine
                </button>
              );
            })}

            {topImageCount < 3 && (
              <button
                type="button"
                onClick={() => topImageFileRef.current?.click()}
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium bg-cream-100 text-charcoal-500 hover:bg-cream-200 hover:text-charcoal-700 border border-dashed border-cream-300 transition-all"
                title="Carica immagine sul piano superiore (max 3)"
              >
                + 🖼️ Immagine
              </button>
            )}

            {/* Add figurine button — hidden when the ring is too narrow for placement */}
            {canPlaceFigurines ? (
              <button
                onClick={() => togglePanel({ kind: 'figurinePicker' })}
                className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium border border-dashed transition-all ${
                  activePanel?.kind === 'figurinePicker'
                    ? 'border-brown-400 bg-brown-50 text-brown-600'
                    : 'border-cream-300 bg-cream-100 text-charcoal-500 hover:bg-cream-200 hover:text-charcoal-700'
                }`}
                title="Aggiungi figurina"
              >
                + 🎀 Figura
              </button>
            ) : (
              <span
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium border border-dashed border-cream-200 bg-cream-50 text-charcoal-300 cursor-not-allowed"
                title="Differenza di diametro insufficiente per posizionare figurine su questo livello"
              >
                🎀 Figura
              </span>
            )}
          </div>
        </div>

        {/* ── Active decoration panel ── */}
        {activePanel?.kind === 'writing' && (() => {
          const deco = writings.find((w) => w.uid === (activePanel as { kind: 'writing'; uid: string }).uid);
          return deco ? (
            <WritingPanel
              tierId={tier.id}
              decoration={deco}
              onClose={() => setActivePanel(null)}
            />
          ) : null;
        })()}

        {activePanel?.kind === 'figurine' && (() => {
          const deco = figurines.find((f) => f.uid === (activePanel as { kind: 'figurine'; uid: string }).uid);
          return deco ? (
            <FigurinePanel
              tierId={tier.id}
              decoration={deco}
              onClose={() => setActivePanel(null)}
            />
          ) : null;
        })()}

        {activePanel?.kind === 'figurinePicker' && (
          <FigurinePicker
            tierId={tier.id}
            onClose={() => setActivePanel(null)}
            ringInnerR={ringInnerR}
            ringOuterR={ringOuterR}
          />
        )}

        {activePanel?.kind === 'topImage' && (() => {
          const uid = (activePanel as { kind: 'topImage'; uid: string }).uid;
          const deco = topImages.find((i) => i.uid === uid);
          return deco ? (
            <TopImagePanel tierId={tier.id} decoration={deco} onClose={() => setActivePanel(null)} />
          ) : null;
        })()}

        {/* ── Tier controls ── */}
        <div className="space-y-2.5 pt-1 border-t border-cream-100">

          {/* ── Tipo di livello ── */}
          {(() => {
            const isTop = index === tiers.length - 1;
            return (
              <div>
                <span className="text-[11px] font-medium text-charcoal-600 block mb-1.5">Tipo di livello</span>
                <div className="flex gap-1.5">
                  {[
                    { value: false, label: '🎂 Vera torta' },
                    { value: true,  label: '✨ Piano scenico' },
                  ].map(({ value, label: btnLabel }) => {
                    const isDisabled = isTop && value === true;
                    return (
                      <button
                        key={String(value)}
                        disabled={isDisabled}
                        onClick={() => updateTier(tier.id, { isDecorative: value })}
                        title={isDisabled ? 'Il livello più alto deve essere vera torta' : undefined}
                        className={`flex-1 py-1 rounded-lg text-xs font-semibold transition-all ${
                          tier.isDecorative === value
                            ? 'bg-brown-500 text-white shadow-sm'
                            : isDisabled
                            ? 'bg-cream-50 border border-cream-200 text-charcoal-300 cursor-not-allowed'
                            : 'bg-white border border-cream-300 text-charcoal-600 hover:border-brown-300'
                        }`}
                      >
                        {btnLabel}
                      </button>
                    );
                  })}
                </div>
                {isTop && (
                  <p className="mt-1.5 text-[10px] text-charcoal-400 leading-snug">
                    Il livello più alto deve sempre essere vera torta.
                  </p>
                )}
                {!isTop && tier.isDecorative && (
                  <p className="mt-1.5 text-[10px] text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-2 py-1.5 leading-snug">
                    Piano in polistirolo decorato — stessa estetica, senza farcitura. Prezzo fisso.
                  </p>
                )}
              </div>
            );
          })()}

          <Slider
            label={`Diametro · ${tier.diameter.toFixed(2)}`}
            value={tier.diameter}
            min={0.6}
            // For any tier above the base, max = tier-below's diameter − one step,
            // so each tier is always visibly smaller than the one beneath it.
            max={index === 0 ? 1.4 : Math.max(0.6, tiers[index - 1].diameter - 0.1)}
            step={0.05}
            onChange={(v) => updateTier(tier.id, { diameter: v })}
          />
          <Slider
            label={`Altezza · ${tier.height.toFixed(2)}`}
            value={tier.height}
            min={0.6}
            max={1.4}
            step={0.05}
            onChange={(v) => updateTier(tier.id, { height: v })}
          />

          <div>
            <span className="text-[11px] font-medium text-charcoal-600 block mb-1.5">Glassa</span>
            <ColorDots
              options={FROSTING_COLORS}
              selected={tier.color}
              onSelect={(hex) => updateTier(tier.id, { color: hex })}
            />
          </div>

          {/* Gusto only relevant for real tiers */}
          {!tier.isDecorative && (
            <div>
              <span className="text-[11px] font-medium text-charcoal-600 block mb-1.5">Gusto</span>
              <div className="flex flex-wrap gap-1">
                {(flavours ?? FLAVORS).map((f) => (
                  <button
                    key={f.id}
                    onClick={() => updateTier(tier.id, { flavor: f.id })}
                    className={`px-2 py-0.5 rounded-full text-[11px] font-medium transition-all ${
                      tier.flavor === f.id
                        ? 'bg-brown-500 text-white shadow-sm'
                        : 'bg-cream-100 text-charcoal-700 hover:bg-cream-200'
                    }`}
                  >
                    {'emoji' in f ? `${(f as typeof FLAVORS[0]).emoji} ` : ''}{f.label}
                  </button>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>}
    </div>
  );
}

// ── Order summary ─────────────────────────────────────────────────────────────

function OrderSummary() {
  const { tiers } = useBuilderStore();
  const [open, setOpen] = useState(false);

  const realTiers = tiers.filter((t) => !t.isDecorative);
  const decorativeTiers = tiers.filter((t) => t.isDecorative);
  const allFigurines = tiers.flatMap((t) => t.decorations.filter(isFigurine));
  const allWritings = tiers.flatMap((t) => t.decorations.filter(isWriting).filter((w) => w.text.trim()));
  const allTopImages = tiers.flatMap((t) => t.decorations.filter(isTopImage));

  // Real tiers: base + extra-tier fee + large-size surcharge
  const extraRealTierCost = Math.max(0, realTiers.length - 1) * PRICING.extraTierPrice;
  const largeTierExtra = realTiers.reduce(
    (sum, t) => sum + (t.diameter > 1.15 ? PRICING.largeTierExtra : 0),
    0,
  );
  // Decorative ("piano scenico") tiers: flat rate each, independent of size
  const decorativeCost = decorativeTiers.length * PRICING.decorativeTier;

  const figurineCost = allFigurines.reduce((sum, f) => sum + f.preset.price, 0);

  const total = PRICING.baseCake + extraRealTierCost + largeTierExtra + decorativeCost + figurineCost;

  const tierSummary = tiers
    .map((t, i) => `${i === 0 ? 'Base' : `L${i + 1}`}${t.isDecorative ? ' (scenico)' : ''}`)
    .join(', ');

  const whatsappText = encodeURIComponent(
    `Ciao! Ho configurato la mia torta su BakeMyCarke:\n` +
      `• ${tiers.length} ${tiers.length === 1 ? 'livello' : 'livelli'}: ${tierSummary}\n` +
      (allFigurines.length > 0
        ? `• Figurine: ${allFigurines.map((f) => f.preset.label).join(', ')}\n`
        : '') +
      (allWritings.length > 0
        ? `• Scritte: ${allWritings.map((w) => `"${w.text}"`).join(', ')}\n`
        : '') +
      (allTopImages.length > 0
        ? `• Immagini personalizzate (piano superiore): ${allTopImages.length}\n`
        : '') +
      `Totale stimato: €${total}\n\n` +
      `Vorrei richiedere un preventivo!`,
  );

  return (
    <div className="border-t border-cream-200 pt-3 mt-1">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-1 text-sm font-bold text-charcoal-900 mb-2"
      >
        <span>Totale stimato</span>
        <span className="text-brown-600 text-base">€{total}</span>
      </button>

      {open && (
        <div className="space-y-1 text-xs text-charcoal-600 mb-3">
          <div className="flex justify-between">
            <span>Torta base</span>
            <span>€{PRICING.baseCake}</span>
          </div>
          {extraRealTierCost > 0 && (
            <div className="flex justify-between">
              <span>Livelli reali extra ×{realTiers.length - 1}</span>
              <span>+€{extraRealTierCost}</span>
            </div>
          )}
          {largeTierExtra > 0 && (
            <div className="flex justify-between">
              <span>Formato grande</span>
              <span>+€{largeTierExtra}</span>
            </div>
          )}
          {decorativeTiers.map((t, i) => (
            <div key={t.id} className="flex justify-between">
              <span>✨ Piano scenico {decorativeTiers.length > 1 ? i + 1 : ''}</span>
              <span>+€{PRICING.decorativeTier}</span>
            </div>
          ))}
          {allFigurines.map((f) => (
            <div key={f.uid} className="flex justify-between">
              <span>{f.preset.emoji} {f.preset.label}</span>
              <span>+€{f.preset.price}</span>
            </div>
          ))}
          <p className="text-[10px] text-charcoal-400 mt-1 leading-snug">
            * Preventivo indicativo. Il totale definitivo viene confermato dalla pasticceria.
          </p>
        </div>
      )}

      <div className="space-y-2">
        <a
          href={`https://wa.me/39XXXXXXXXXX?text=${whatsappText}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-brown-500 hover:bg-brown-600 text-white text-sm font-semibold transition-all shadow-sm"
        >
          Richiedi preventivo su WhatsApp →
        </a>
        <a
          href="/it/contact"
          className="flex items-center justify-center w-full py-2 rounded-xl border-2 border-brown-300 text-brown-600 text-sm font-semibold hover:bg-brown-50 transition-all"
        >
          Contattaci
        </a>
      </div>
    </div>
  );
}

// ── Main sidebar ──────────────────────────────────────────────────────────────

export default function TierSidebar({ uploadToken, flavours }: { uploadToken: string; flavours?: { id: string; label: string }[] }) {
  const { tiers, activeTierId, addTier, setActiveTier } = useBuilderStore();

  return (
    <div className="absolute right-0 top-0 h-full w-72 flex flex-col z-20 pointer-events-none">
      <div className="flex-1 overflow-y-auto pointer-events-auto">
        <div className="p-3 space-y-2.5">

          {/* Hint */}
          <div className="bg-white/80 backdrop-blur-sm rounded-xl px-3 py-2 text-xs text-charcoal-600 border border-cream-200 shadow-sm">
            <p className="font-semibold text-charcoal-800 mb-0.5">Costruttore torta</p>
            <p className="leading-relaxed text-charcoal-500">Trascina per ruotare · Scroll per zoom</p>
          </div>

          {/* Tier cards */}
          {tiers.map((tier, index) => (
            <TierCard
              key={tier.id}
              tier={tier}
              index={index}
              isActive={activeTierId === tier.id}
              onActivate={() => setActiveTier(tier.id)}
              uploadToken={uploadToken}
              flavours={flavours}
            />
          ))}

          {/* Add tier */}
          {tiers.length < 4 && (
            <button
              onClick={() => addTier()}
              className="w-full py-2 rounded-xl border-2 border-dashed border-brown-300 text-brown-500 text-xs font-semibold hover:border-brown-400 hover:bg-brown-50 transition-all"
            >
              + Aggiungi livello
            </button>
          )}

          {/* Order summary */}
          <div className="bg-white rounded-2xl border border-cream-200 px-3.5 py-3 shadow-sm">
            <OrderSummary />
          </div>

          {/* Bottom padding so last card isn't flush against viewport edge */}
          <div className="h-4" />
        </div>
      </div>
    </div>
  );
}
