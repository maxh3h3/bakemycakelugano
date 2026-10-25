import { NextRequest, NextResponse } from 'next/server';
import { resolveDeliveryFee } from '@/lib/delivery';
import { getDrivingDistance } from '@/lib/delivery-server';

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

    if (!process.env.GOOGLE_MAPS_API_KEY) {
      return NextResponse.json({ error: 'Maps API not configured' }, { status: 500 });
    }

    const distance = await getDrivingDistance(destination);
    if (!distance) {
      return NextResponse.json({ error: 'Could not calculate distance for this address' }, { status: 422 });
    }

    const { distanceKm, durationMinutes } = distance;
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
