import { NextRequest, NextResponse } from 'next/server';
import { resolveDeliveryFee } from '@/lib/delivery';

const BAKERY_ORIGIN = 'Via Selva 4, Massagno 6900, Switzerland';

export async function POST(request: NextRequest) {
  try {
    const { address, city, postalCode, country, fullAddress } = await request.json();

    // Support either a pre-composed fullAddress string (from admin modal with single text field)
    // or individual fields (from the public checkout form)
    let destination: string;
    // Value the Lugano flat-fee rule is matched against — the free-text address
    // from the admin modals, or the postal code from checkout / the bot.
    let zipSource: string;
    if (fullAddress?.trim()) {
      destination = fullAddress.trim();
      zipSource = destination;
    } else {
      if (!address?.trim() || !city?.trim() || !postalCode?.trim()) {
        return NextResponse.json({ error: 'Missing address fields' }, { status: 400 });
      }
      destination = `${address.trim()}, ${postalCode.trim()} ${city.trim()}, ${country || 'Switzerland'}`;
      zipSource = postalCode.trim();
    }

    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Maps API not configured' }, { status: 500 });
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
      return NextResponse.json({ error: 'Could not calculate distance for this address' }, { status: 422 });
    }

    if (!data.rows?.[0]?.elements?.[0] || data.rows[0].elements[0].status !== 'OK') {
      console.error('Google Maps element error:', data.rows?.[0]?.elements?.[0]?.status);
      return NextResponse.json({ error: 'Could not calculate distance for this address' }, { status: 422 });
    }

    const element = data.rows[0].elements[0];
    const distanceKm = Math.round((element.distance.value / 1000) * 10) / 10;
    const durationMinutes = Math.round(element.duration.value / 60);

    const { fee, requiresContact } = resolveDeliveryFee(distanceKm, zipSource);

    return NextResponse.json({
      fee,
      distanceKm,
      durationMinutes,
      requiresContact,
    });
  } catch (error) {
    console.error('Delivery estimate error:', error);
    return NextResponse.json({ error: 'Failed to calculate delivery fee' }, { status: 500 });
  }
}
