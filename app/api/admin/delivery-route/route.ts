// app/api/admin/delivery-route/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRole } from '@/lib/auth/require-admin-role';

const BAKERY_ORIGIN = 'Via Selva 4, Massagno 6900, Switzerland';

interface DirectionsLeg {
  duration: { value: number };
  distance: { value: number };
  end_location: { lat: number; lng: number };
}

interface RouteResult {
  polyline: string;
  totalDurationSeconds: number;
  totalDistanceMeters: number;
  waypointOrder: number[];
  stopLocations: { lat: number; lng: number }[];
}

async function callDirections(
  origin: string,
  destination: string,
  waypoints: string[],
  optimize: boolean,
  apiKey: string
): Promise<RouteResult | null> {
  const url = new URL('https://maps.googleapis.com/maps/api/directions/json');
  url.searchParams.set('origin', origin);
  url.searchParams.set('destination', destination);
  url.searchParams.set('mode', 'driving');
  url.searchParams.set('key', apiKey);

  if (waypoints.length > 0) {
    const prefix = optimize ? 'optimize:true|' : '';
    url.searchParams.set('waypoints', prefix + waypoints.join('|'));
  }

  const response = await fetch(url.toString());
  const data = await response.json();

  if (data.status !== 'OK' || !data.routes?.[0]) {
    console.error('Directions API error:', data.status, data.error_message ?? '');
    return null;
  }

  const route = data.routes[0];
  const legs: DirectionsLeg[] = route.legs;

  const totalDurationSeconds = legs.reduce((sum: number, leg: DirectionsLeg) => sum + leg.duration.value, 0);
  const totalDistanceMeters = legs.reduce((sum: number, leg: DirectionsLeg) => sum + leg.distance.value, 0);
  const stopLocations = legs.map((leg: DirectionsLeg) => ({
    lat: leg.end_location.lat,
    lng: leg.end_location.lng,
  }));
  const waypointOrder: number[] = route.waypoint_order ?? [];

  return {
    polyline: route.overview_polyline.points,
    totalDurationSeconds,
    totalDistanceMeters,
    waypointOrder,
    stopLocations,
  };
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdminRole(['owner', 'cook']);
    if (auth instanceof NextResponse) return auth;

    const body = await request.json();
    const { addresses } = body;

    if (!Array.isArray(addresses) || addresses.length === 0) {
      return NextResponse.json({ error: 'addresses must be a non-empty array' }, { status: 400 });
    }

    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Maps API not configured' }, { status: 500 });
    }

    if (addresses.length === 1) {
      // Single stop: one call, no waypoints, no optimization possible
      const result = await callDirections(BAKERY_ORIGIN, addresses[0], [], false, apiKey);
      if (!result) {
        return NextResponse.json({ error: 'route_unavailable' }, { status: 422 });
      }
      result.waypointOrder = [];
      return NextResponse.json({
        timeOrdered: result,
        optimized: result,
        savingsSeconds: 0,
      });
    }

    // Multiple stops: origin = bakery, destination = last address, waypoints = all but last
    const destination = addresses[addresses.length - 1];
    const waypoints = addresses.slice(0, -1);

    const [timeOrdered, optimized] = await Promise.all([
      callDirections(BAKERY_ORIGIN, destination, waypoints, false, apiKey),
      callDirections(BAKERY_ORIGIN, destination, waypoints, true, apiKey),
    ]);

    if (!timeOrdered || !optimized) {
      return NextResponse.json({ error: 'route_unavailable' }, { status: 422 });
    }

    // For time-ordered: waypointOrder is always [0, 1, 2, ...] (original order)
    timeOrdered.waypointOrder = waypoints.map((_, i) => i);

    const savingsSeconds = timeOrdered.totalDurationSeconds - optimized.totalDurationSeconds;

    return NextResponse.json({ timeOrdered, optimized, savingsSeconds });
  } catch (error) {
    console.error('delivery-route error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
