// Lugano area zip codes - standard delivery fee applies
export const LUGANO_ZIP_CODES = [
  '6876', '6900', '6901', '6902', '6903', '6904', '6905', '6906', '6907',
  '6910', '6912', '6913', '6915', '6917', '6918', '6925', '6932', '6962',
  '6963', '6964', '6966', '6974', '6976', '6977', '6978', '6979', '6926', '6927'
];

export const DELIVERY_FEE = 20; // CHF

export interface DeliveryInfo {
  isLuganoArea: boolean;
  deliveryFee: number;
  requiresContact: boolean;
}

/**
 * Check if a zip code is in the Lugano delivery area
 * and calculate delivery fee
 */
export function getDeliveryInfo(postalCode: string, deliveryType: 'pickup' | 'delivery'): DeliveryInfo {
  // No delivery fee for pickup
  if (deliveryType === 'pickup') {
    return {
      isLuganoArea: true,
      deliveryFee: 0,
      requiresContact: false,
    };
  }

  // Check if zip code is in Lugano area
  const cleanedPostalCode = postalCode.trim();
  const isLuganoArea = LUGANO_ZIP_CODES.includes(cleanedPostalCode);

  return {
    isLuganoArea,
    deliveryFee: isLuganoArea ? DELIVERY_FEE : 0,
    requiresContact: !isLuganoArea,
  };
}

/**
 * Format delivery info message for customer
 */
export function getDeliveryMessage(deliveryInfo: DeliveryInfo, locale: string): string {
  if (deliveryInfo.requiresContact) {
    return locale === 'it' 
      ? 'Il tuo indirizzo è fuori dall\'area di consegna standard di Lugano. Ti contatteremo per confermare la disponibilità e i costi di consegna.'
      : 'Your address is outside the standard Lugano delivery area. We will contact you to confirm delivery availability and costs.';
  }
  
  if (deliveryInfo.deliveryFee > 0) {
    return locale === 'it'
      ? `Costo di consegna nell'area di Lugano: CHF ${deliveryInfo.deliveryFee}`
      : `Delivery fee for Lugano area: CHF ${deliveryInfo.deliveryFee}`;
  }
  
  return '';
}

