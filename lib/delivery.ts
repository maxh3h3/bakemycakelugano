// Lugano city zip code — flat CHF 20 delivery, no API call needed
export const LUGANO_ZIP_CODES = ['6900'];

// Delivery fee tiers for addresses outside the Lugano zip code list (via Google Maps distance):
// 0–15 km  → CHF 30
// 15–30 km → CHF 40
// 30–50 km → CHF 55
// > 50 km  → requires contact

export const LUGANO_DELIVERY_FEE = 20; // CHF — flat fee for known Lugano zip codes

export interface DeliveryInfo {
  isLuganoArea: boolean;
  deliveryFee: number;
  requiresContact: boolean;
  distanceKm?: number;
  durationMinutes?: number;
}

/**
 * Calculate delivery fee based on driving distance from bakery.
 * Used by /api/delivery-estimate for addresses outside the Lugano zip code list.
 */
export function calculateDeliveryFeeFromDistance(distanceKm: number): { fee: number; requiresContact: boolean } {
  if (distanceKm <= 15) return { fee: 30, requiresContact: false };
  if (distanceKm <= 30) return { fee: 40, requiresContact: false };
  if (distanceKm <= 50) return { fee: 55, requiresContact: false };
  return { fee: 0, requiresContact: true };
}

/**
 * True if a Lugano zip code appears in the given value. Accepts either a bare
 * postal code ("6900") or a free-text address ("Via Nassa 12, 6900 Lugano"),
 * since the admin modals submit a single address field.
 */
export function matchesLuganoZip(postalCodeOrAddress?: string | null): boolean {
  if (!postalCodeOrAddress) return false;
  return LUGANO_ZIP_CODES.some((zip) => new RegExp(`\\b${zip}\\b`).test(postalCodeOrAddress));
}

/**
 * Resolve the delivery fee for a destination. The Lugano flat fee wins over the
 * distance tiers, so every caller (checkout, bot, admin) prices the same address
 * the same way.
 */
export function resolveDeliveryFee(
  distanceKm: number,
  postalCodeOrAddress?: string | null
): { fee: number; requiresContact: boolean } {
  if (matchesLuganoZip(postalCodeOrAddress)) {
    return { fee: LUGANO_DELIVERY_FEE, requiresContact: false };
  }
  return calculateDeliveryFeeFromDistance(distanceKm);
}

/**
 * Format delivery info message for customer (used in emails / notifications)
 */
export function getDeliveryMessage(deliveryInfo: DeliveryInfo, locale: string): string {
  if (deliveryInfo.requiresContact) {
    return locale === 'it'
      ? 'Il tuo indirizzo è fuori dall\'area di consegna. Ti contatteremo per confermare la disponibilità e i costi di consegna.'
      : 'Your address is outside our delivery range. We will contact you to confirm delivery availability and costs.';
  }

  if (deliveryInfo.deliveryFee > 0) {
    const distanceInfo = deliveryInfo.distanceKm ? ` (${deliveryInfo.distanceKm} km)` : '';
    return locale === 'it'
      ? `Costo di consegna: CHF ${deliveryInfo.deliveryFee}${distanceInfo}`
      : `Delivery fee: CHF ${deliveryInfo.deliveryFee}${distanceInfo}`;
  }

  return '';
}
