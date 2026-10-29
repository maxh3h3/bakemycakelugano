// Admins pick a size from lists (by weight or by pieces); the website, checkout
// and kitchen get one readable value built from those picks: "1.5 kg", "12 pcs",
// "5 kg (2 tiers)". Built in GROQ so every query returns the same string.

export const WEIGHTS_KG = [0.4, 0.45, 0.5, 0.55, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6, 7, 8, 10];
export const PIECES = [4, 6, 8, 10, 12, 16, 20, 24, 30, 36];
export const TIERS = [1, 2, 3];

export interface SizeChoice {
  unit?: 'kg' | 'pcs';
  weight?: number;
  pieces?: number;
  tiers?: number;
}

// Same output as SIZE_VALUE_GROQ, for validation in the Studio
export function sizeValue({ unit, weight, pieces, tiers }: SizeChoice): string | null {
  if (unit === 'pcs' && pieces != null) return `${pieces} pcs`;
  if (unit === 'kg' && weight != null) return `${weight} kg${tiers && tiers > 1 ? ` (${tiers} tiers)` : ''}`;
  return null;
}

// Falls back to the old typed value for sizes not yet moved to unit + amount
export const SIZE_VALUE_GROQ = `"value": coalesce(select(
  unit == "pcs" && defined(pieces) => string(pieces) + " pcs",
  unit == "kg" && defined(weight) => string(weight) + " kg" + select(tiers > 1 => " (" + string(tiers) + " tiers)", "")
), value)`;
