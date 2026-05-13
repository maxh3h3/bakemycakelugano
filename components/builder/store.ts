import { create } from 'zustand';
import { FROSTING_COLORS, FLAVORS } from './constants';
import type { FigurinePreset } from './constants';

// ── Decoration types ──────────────────────────────────────────────────────────

export interface WritingDecoration {
  uid: string;
  kind: 'writing';
  surface: 'top' | 'side';
  text: string;
  color: string;
  fontSize: number;
  fontFamily: string; // id from WRITING_FONTS — default 'playfair'
  rotation: number;
  /** Rounded rectangle behind text for contrast */
  textBgEnabled: boolean;
  textBgColor: string; // CSS color (supports rgba / hex)
  // top surface position (normalised by tier radius, -1 to 1)
  offsetX: number;
  offsetZ: number;
  // side surface position
  sideAngle: number; // radians around Y axis; atan2(x, z) convention
  sideY: number;     // 0–1 relative to tier bottom (not absolute world Y)
}

export interface FigurineDecoration {
  uid: string;
  kind: 'figurine';
  preset: FigurinePreset;
  position: [number, number]; // world x, z offset on this tier's top surface
  scale: number;
  rotation: number;
}

/** Flat image on the top tier only — uploaded to Supabase, draped on the cake top */
export interface TopImageDecoration {
  uid: string;
  kind: 'topImage';
  imageUrl: string;
  /** Path inside the storage bucket (for admin / fulfilment) */
  storagePath?: string;
  position: [number, number];
  scale: number;
  rotation: number;
}

export type Decoration = WritingDecoration | FigurineDecoration | TopImageDecoration;

/** Input for `addDecoration` — explicit union so TypeScript discriminates correctly */
export type NewDecoration =
  | Omit<WritingDecoration, 'uid'>
  | Omit<FigurineDecoration, 'uid'>
  | Omit<TopImageDecoration, 'uid'>;

// Convenience update types for the two decoration kinds
export type WritingUpdate = Partial<Omit<WritingDecoration, 'uid' | 'kind'>>;
export type FigurineUpdate = Partial<Omit<FigurineDecoration, 'uid' | 'kind' | 'preset'>>;
export type TopImageUpdate = Partial<Omit<TopImageDecoration, 'uid' | 'kind'>>;

// ── Tier ──────────────────────────────────────────────────────────────────────

export interface Tier {
  id: string;
  diameter: number; // 0.6–1.4 normalised (1.0 = medium)
  height: number;   // 0.6–1.4 normalised (1.0 = medium)
  color: string;    // hex frosting color
  flavor: string;   // flavor id
  decorations: Decoration[];
  /**
   * When true the tier is a decorative polystyrene ("piano scenico") insert —
   * same visual appearance, no filling. Priced as a flat rate.
   */
  isDecorative: boolean;
}

// ── Store interface ───────────────────────────────────────────────────────────

interface BuilderStore {
  tiers: Tier[];
  activeTierId: string | null;
  /** True while any 3D decoration drag is in progress — disables OrbitControls */
  isDragging: boolean;

  addTier: () => void;
  removeTier: (id: string) => void;
  updateTier: (id: string, updates: Partial<Omit<Tier, 'id' | 'decorations'>>) => void;
  setActiveTier: (id: string | null) => void;

  /**
   * Add a decoration to a tier.
   * Enforces max 1 writing per tier (surface is chosen in the panel).
   * Silently ignores if a writing already exists.
   */
  addDecoration: (tierId: string, decoration: NewDecoration) => void;
  removeDecoration: (tierId: string, uid: string) => void;
  updateDecoration: (tierId: string, uid: string, updates: WritingUpdate | FigurineUpdate | TopImageUpdate) => void;

  setDragging: (v: boolean) => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function uid(): string {
  return Math.random().toString(36).slice(2, 9);
}

function defaultTier(diameter = 1.0): Tier {
  return {
    id: uid(),
    diameter,
    height: 1.0,
    color: FROSTING_COLORS[0].hex,
    flavor: FLAVORS[0].id,
    decorations: [],
    isDecorative: false,
  };
}

// ── Store ─────────────────────────────────────────────────────────────────────

export const useBuilderStore = create<BuilderStore>((set) => ({
  tiers: [{ ...defaultTier(1.0), id: 'base' }],
  activeTierId: 'base',
  isDragging: false,

  addTier: () =>
    set((state) => {
      if (state.tiers.length >= 4) return state;
      const baseDiameter = state.tiers[0].diameter;
      const newDiameter = baseDiameter * (0.78 - state.tiers.length * 0.04);
      const newTier = defaultTier(Math.max(0.6, newDiameter));
      return { tiers: [...state.tiers, newTier] };
    }),

  removeTier: (id) =>
    set((state) => {
      if (state.tiers.length <= 1) return state;
      let remaining = state.tiers.filter((t) => t.id !== id);
      // Ensure the new top tier is always real after the removal.
      const top = remaining[remaining.length - 1];
      if (top?.isDecorative) {
        remaining = remaining.map((t, i) =>
          i === remaining.length - 1 ? { ...t, isDecorative: false } : t,
        );
      }
      return {
        tiers: remaining,
        activeTierId: state.activeTierId === id ? (remaining[0]?.id ?? null) : state.activeTierId,
      };
    }),

  updateTier: (id, updates) =>
    set((state) => {
      const idx = state.tiers.findIndex((t) => t.id === id);
      if (idx === -1) return state;

      // The topmost tier must always be a real cake tier.
      const isTopTier = idx === state.tiers.length - 1;
      const sanitisedUpdates =
        isTopTier && 'isDecorative' in updates
          ? { ...updates, isDecorative: false }
          : updates;

      let newTiers = state.tiers.map((t) => (t.id === id ? { ...t, ...sanitisedUpdates } : t));

      // When diameter changes, enforce: each tier must be strictly smaller
      // than the tier below it (tiers[0] = base/bottom, tiers[n-1] = top).
      if ('diameter' in updates) {
        // 1. Clamp the updated tier so it cannot exceed the tier below it
        if (idx > 0) {
          const maxAllowed = newTiers[idx - 1].diameter - 0.1;
          if (newTiers[idx].diameter > maxAllowed) {
            newTiers = newTiers.map((t, i) =>
              i === idx ? { ...t, diameter: Math.max(0.6, maxAllowed) } : t,
            );
          }
        }
        // 2. Cascade upward: tiers above the changed one must also stay smaller
        for (let i = idx + 1; i < newTiers.length; i++) {
          const maxAllowed = newTiers[i - 1].diameter - 0.1;
          if (newTiers[i].diameter > maxAllowed) {
            newTiers = newTiers.map((t, j) =>
              j === i ? { ...t, diameter: Math.max(0.6, maxAllowed) } : t,
            );
          }
        }
      }

      return { tiers: newTiers };
    }),

  setActiveTier: (id) => set({ activeTierId: id }),

  addDecoration: (tierId, decoration) =>
    set((state) => {
      const tierIdx = state.tiers.findIndex((t) => t.id === tierId);
      if (tierIdx === -1) return state;
      const tier = state.tiers[tierIdx];

      // Enforce at most one writing per tier — surface is chosen in the edit panel
      if (decoration.kind === 'writing') {
        const exists = tier.decorations.some((d) => d.kind === 'writing');
        if (exists) return state;
      }

      // At most 3 images per tier
      if (decoration.kind === 'topImage') {
        const count = tier.decorations.filter((d) => d.kind === 'topImage').length;
        if (count >= 3) return state;
      }

      const newDeco = { ...decoration, uid: uid() } as Decoration;
      return {
        tiers: state.tiers.map((t) =>
          t.id === tierId ? { ...t, decorations: [...t.decorations, newDeco] } : t,
        ),
      };
    }),

  removeDecoration: (tierId, decorationUid) =>
    set((state) => ({
      tiers: state.tiers.map((t) =>
        t.id === tierId
          ? { ...t, decorations: t.decorations.filter((d) => d.uid !== decorationUid) }
          : t,
      ),
    })),

  updateDecoration: (tierId, decorationUid, updates) =>
    set((state) => ({
      tiers: state.tiers.map((t) =>
        t.id === tierId
          ? {
              ...t,
              decorations: t.decorations.map((d) =>
                d.uid === decorationUid ? ({ ...d, ...updates } as Decoration) : d,
              ),
            }
          : t,
      ),
    })),

  setDragging: (v) => set({ isDragging: v }),
}));
