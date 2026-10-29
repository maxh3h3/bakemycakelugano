// Size values are how the website, checkout and kitchen tell sizes apart,
// so they follow one format: "1.5 kg", "450 g", "12 pcs", "5 kg (2 tiers)".
export const SIZE_VALUE_PATTERN = /^\d+(\.\d+)? (kg|g|pcs)( \(\d+ tiers\))?$/;

const UNITS: Record<string, string> = {
  kg: 'kg', kilo: 'kg', kgs: 'kg',
  g: 'g', gr: 'g', gram: 'g', grams: 'g',
  pcs: 'pcs', pc: 'pcs', pz: 'pcs', pezzi: 'pcs', piece: 'pcs', pieces: 'pcs', pic: 'pcs',
};

const TIER_WORDS: Record<string, number> = { two: 2, three: 3, four: 4 };

/**
 * Turns whatever was typed ("1,5kg ", " 6 pz", "Two-tier cake, 5 kg") into the
 * standard format. Returns the trimmed input unchanged when it has no number + unit.
 */
export function normalizeSizeValue(raw: string): string {
  const text = raw.toLowerCase().replace(/,/g, '.').replace(/\s+/g, ' ').trim();
  const size = text.match(/(\d+(?:\.\d+)?)\s*(kgs|kg|kilo|grams|gram|gr|g|pcs|pc|pz|pezzi|pieces|piece|pic)\b/);
  if (!size) return text;

  const tiers = text.match(/\b(\d+|two|three|four)[ -]?tiers?\b/);
  const tierCount = tiers ? TIER_WORDS[tiers[1]] ?? Number(tiers[1]) : 0;

  return `${Number(size[1])} ${UNITS[size[2]]}${tierCount > 1 ? ` (${tierCount} tiers)` : ''}`;
}
