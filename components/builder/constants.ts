export interface ColorPreset {
  id: string;
  label: string;
  hex: string;
}

export interface FlavorOption {
  id: string;
  label: string;
  emoji: string;
}

export interface FigurinePreset {
  id: string;
  label: string;
  emoji: string;
  price: number;
  modelPath: string;
  /** Override the default auto-scale target height (world units). */
  targetHeight?: number;
}

export const FROSTING_COLORS: ColorPreset[] = [
  { id: 'white', label: 'Panna', hex: '#F8F4EE' },
  { id: 'vanilla', label: 'Vaniglia', hex: '#F0DDB0' },
  { id: 'blush', label: 'Rosa Cipria', hex: '#F5C6D8' },
  { id: 'coral', label: 'Corallo', hex: '#F5A895' },
  { id: 'mint', label: 'Menta', hex: '#A8D8C0' },
  { id: 'sky', label: 'Azzurro', hex: '#A8C8E8' },
  { id: 'lavender', label: 'Lavanda', hex: '#C5B4E3' },
  { id: 'chocolate', label: 'Cioccolato', hex: '#5C3320' },
  { id: 'gold', label: 'Oro', hex: '#C8A84B' },
  { id: 'charcoal', label: 'Carbone', hex: '#3A3A3A' },
];

export const WRITING_COLORS: ColorPreset[] = [
  { id: 'chocolate', label: 'Cioccolato', hex: '#4A2C1A' },
  { id: 'white', label: 'Bianco', hex: '#F8F4EE' },
  { id: 'gold', label: 'Oro', hex: '#C8A84B' },
  { id: 'rose', label: 'Rosa', hex: '#E8547A' },
  { id: 'mint', label: 'Menta', hex: '#3DAB6E' },
];

/** Semi-opaque backgrounds behind cake writing (canvas fillStyle) */
export const WRITING_BG_COLORS: { hex: string; label: string }[] = [
  { hex: 'rgba(255,254,249,0.94)', label: 'Panna' },
  { hex: 'rgba(255,255,255,0.92)', label: 'Bianco' },
  { hex: 'rgba(42,24,16,0.82)', label: 'Scuro' },
  { hex: 'rgba(245,230,208,0.92)', label: 'Crema' },
  { hex: 'rgba(232,244,232,0.90)', label: 'Menta chiara' },
];

export const FLAVORS: FlavorOption[] = [
  { id: 'vanilla', label: 'Vaniglia', emoji: '🍦' },
  { id: 'chocolate', label: 'Cioccolato', emoji: '🍫' },
  { id: 'strawberry', label: 'Fragola', emoji: '🍓' },
  { id: 'lemon', label: 'Limone', emoji: '🍋' },
  { id: 'pistachio', label: 'Pistacchio', emoji: '🌿' },
  { id: 'hazelnut', label: 'Nocciola', emoji: '🌰' },
];

export const FIGURINE_PRESETS: FigurinePreset[] = [
  {
    id: 'pink_heart',
    label: 'Cuore Rosa',
    emoji: '🩷',
    price: 8,
    modelPath: '/models/figurines/pink_heart.glb',
  },
  {
    id: 'heart_wings',
    label: 'Cuore con Ali',
    emoji: '💝',
    price: 10,
    modelPath: '/models/figurines/heart_wings.glb',
  },
  {
    id: 'heart_stylize',
    label: 'Cuore',
    emoji: '❤️',
    price: 8,
    modelPath: '/models/figurines/heart_stylize.glb',
  },
  {
    id: 'heart_fruit',
    label: 'Cuore Frutto',
    emoji: '🍓',
    price: 10,
    modelPath: '/models/figurines/heart_fruit.glb',
  },
  {
    id: 'teddy_bear',
    label: 'Orsetto',
    emoji: '🧸',
    price: 15,
    modelPath: '/models/figurines/teddy_bear.glb',
  },
  {
    id: 'teddy_colorful',
    label: 'Orsetto Colorato',
    emoji: '🎨',
    price: 15,
    modelPath: '/models/figurines/teddy_colorful.glb',
  },
  {
    id: 'smiling_figure',
    label: 'Figurina',
    emoji: '🎀',
    price: 12,
    modelPath: '/models/figurines/smiling_figure.glb',
  },
  {
    id: 'paw_patrol',
    label: 'Paw Patrol',
    emoji: '🐾',
    price: 18,
    modelPath: '/models/figurines/paw_patrol.glb',
  },
  {
    id: 'chess_bishop',
    label: 'Alfiere',
    emoji: '♟️',
    price: 8,
    modelPath: '/models/figurines/chess_bishop.glb',
  },
  {
    id: 'mario',
    label: 'Mario',
    emoji: '🎮',
    price: 20,
    modelPath: '/models/figurines/mario.glb',
  },
];

export const PRICING = {
  baseCake: 35,
  extraTierPrice: 20,
  largeTierExtra: 8,
  /** Flat rate for a decorative (polystyrene / "piano scenico") tier, any size */
  decorativeTier: 40,
};

export const TIER_SCALE = {
  radiusMultiplier: 0.5,
  heightMultiplier: 0.65,
};

/**
 * Ring-placement constants for figurines on a tier that has another tier above it.
 *
 * INNER_CLEARANCE  – world-unit gap kept between the figurine and the upper
 *                    tier's edge so the figurine never visually clips into it.
 * OUTER_FACTOR     – when a ring constraint is active we allow up to 98 % of
 *                    the tier radius (vs 82 % when the top surface is fully free)
 *                    because the ring is narrow and we need the extra margin.
 * MIN_WIDTH        – minimum usable ring width in world units.  Below this the
 *                    ring is too narrow for a figurine (~5 cm diameter difference
 *                    at typical cake scale).
 */
export const FIGURINE_RING = {
  INNER_CLEARANCE: 0.015,
  OUTER_FACTOR_FREE: 0.82,
  OUTER_FACTOR_RING: 0.98,
  MIN_WIDTH: 0.06,
} as const;

export interface WritingFont {
  id: string;
  label: string;
  /** Full CSS font-family value passed to ctx.font */
  family: string;
  /** CSS font-weight token for ctx.font */
  weight: string;
  /** CSS font-style token for ctx.font */
  style: string;
}

export const WRITING_FONTS: WritingFont[] = [
  { id: 'playfair',   label: 'Classic',      family: "'Playfair Display', Georgia, serif", weight: 'bold',   style: 'italic' },
  { id: 'greatvibes', label: 'Calligrafia',  family: "'Great Vibes', cursive",             weight: 'normal', style: 'normal' },
  { id: 'dancing',    label: 'Script',       family: "'Dancing Script', cursive",          weight: 'bold',   style: 'normal' },
  { id: 'pacifico',   label: 'Rotondo',      family: "'Pacifico', cursive",                weight: 'normal', style: 'normal' },
  { id: 'cinzel',     label: 'Classico',     family: "'Cinzel', Georgia, serif",           weight: 'bold',   style: 'normal' },
];
