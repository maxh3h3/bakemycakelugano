// Lugano area zip codes — flat CHF 20 delivery, no API call needed
export const LUGANO_ZIP_CODES = [
  '6876', '6900', '6901', '6902', '6903', '6904', '6905', '6906', '6907',
  '6910', '6911', '6912', '6913', '6915', '6917', '6918', '6925', '6932', '6962',
  '6963', '6964', '6966', '6974', '6976', '6977', '6978', '6979', '6926', '6927',
  '22061'
];

// Delivery fee tiers for addresses outside the Lugano zip code list (via Google Maps distance):
// 0–15 km  → CHF 20
// 15–30 km → CHF 30
// 30–50 km → CHF 45
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
  if (distanceKm <= 15) return { fee: 20, requiresContact: false };
  if (distanceKm <= 30) return { fee: 30, requiresContact: false };
  if (distanceKm <= 50) return { fee: 45, requiresContact: false };
  return { fee: 0, requiresContact: true };
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
