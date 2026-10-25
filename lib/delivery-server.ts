// Server-only: calls Google Maps with the secret API key.
// Shared by /api/delivery-estimate (shows the fee) and /api/checkout (charges it),
// so the fee a customer sees is the fee the server computes.
import { resolveDeliveryFee, matchesLuganoZip, LUGANO_DELIVERY_FEE } from './delivery';

const BAKERY_ORIGIN = 'Via Selva 4, Massagno 6900, Switzerland';

// On Sundays the minimum delivery fee is CHF 30
const SUNDAY_MIN_DELIVERY_FEE = 30;

export interface DrivingDistance {
  distanceKm: number;
  durationMinutes: number;
}

/**
 * Driving distance from the bakery. Returns null when Google Maps cannot route
 * the address; throws when the Maps key is missing.
 */
export async function getDrivingDistance(destination: string): Promise<DrivingDistance | null> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    throw new Error('Maps API not configured');
  }

  const url = new URL('https://maps.googleapis.com/maps/api/distancematrix/json');
  url.searchParams.set('origins', BAKERY_ORIGIN);
  url.searchParams.set('destinations', destination);
  url.searchParams.set('mode', 'driving');
  url.searchParams.set('units', 'metric');
  url.searchParams.set('key', apiKey);

  const mapsResponse = await fetch(url.toString());
  const data = await mapsResponse.json();

  if (data.status !== 'OK') {
    console.error('Google Maps API top-level error:', data.status, data.error_message ?? '(no message)');
    return null;
  }

  const element = data.rows?.[0]?.elements?.[0];
  if (!element || element.status !== 'OK') {
    console.error('Google Maps element error:', element?.status);
    return null;
  }

  return {
    distanceKm: Math.round((element.distance.value / 1000) * 10) / 10,
    durationMinutes: Math.round(element.duration.value / 60),
  };
}

/**
 * The delivery fee checkout charges. Mirrors the checkout form: pickup is free,
 * Lugano zip codes are flat, everything else goes by distance, Sundays have a
 * minimum. An address Maps cannot route falls back to "we will contact you".
 */
export async function resolveCheckoutDeliveryFee(deliveryInfo: {
  type?: string;
  date?: string | null;
  address?: string | null;
  city?: string | null;
  postalCode?: string | null;
  country?: string | null;
}): Promise<{ fee: number; requiresContact: boolean }> {
  if (deliveryInfo.type !== 'delivery') {
    return { fee: 0, requiresContact: false };
  }

  const address = deliveryInfo.address?.trim();
  const city = deliveryInfo.city?.trim();
  const postalCode = deliveryInfo.postalCode?.trim();

  let result: { fee: number; requiresContact: boolean };
  if (matchesLuganoZip(postalCode)) {
    result = { fee: LUGANO_DELIVERY_FEE, requiresContact: false };
  } else {
    const distance = address && city && postalCode
      ? await getDrivingDistance(`${address}, ${postalCode} ${city}, ${deliveryInfo.country || 'Switzerland'}`)
      : null;
    result = distance
      ? resolveDeliveryFee(distance.distanceKm, postalCode)
      : { fee: 0, requiresContact: true };
  }

  const isSunday = deliveryInfo.date
    ? new Date(`${deliveryInfo.date}T12:00:00`).getDay() === 0
    : false;
  if (isSunday && result.fee > 0) {
    result.fee = Math.max(result.fee, SUNDAY_MIN_DELIVERY_FEE);
  }

  return result;
}
