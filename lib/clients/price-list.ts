// A business client's agreed positions (clients.price_list, migration 048).
// Edited on the client card, picked from the quick sale modal.

export interface PriceListItem {
  name: string;
  price: number; // CHF per unit
}

const MAX_ITEMS = 50;

/**
 * Clean a price list coming from the browser.
 * Drops blank rows, trims names, rounds prices to cents.
 * Returns an error string when a row is half filled or a price is invalid.
 */
export function parsePriceList(
  input: unknown
): { items: PriceListItem[] } | { error: string } {
  if (!Array.isArray(input)) return { error: 'price_list must be an array' };

  const items: PriceListItem[] = [];
  for (const row of input) {
    const name = typeof row?.name === 'string' ? row.name.trim() : '';
    const raw = row?.price;
    const blankPrice = raw === '' || raw == null;
    if (!name && blankPrice) continue; // empty row the user never filled

    const price = Number(raw);
    if (!name) return { error: 'Position without a name' };
    if (blankPrice || !Number.isFinite(price) || price <= 0) {
      return { error: `Invalid price for "${name}"` };
    }
    items.push({ name, price: Math.round(price * 100) / 100 });
  }

  if (items.length > MAX_ITEMS) return { error: `At most ${MAX_ITEMS} positions` };
  return { items };
}
