# Delivery Page Rebuild — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild `/admin/delivery` with top-level Pickup/Delivery tabs, phone-optimized delivery cards (time-prominent, contact, address), and an expandable Google Maps route panel for today/tomorrow deliveries.

**Architecture:** `DeliveryPageTabs` (new client component) replaces `DeliveryViewTabs` as the root, splitting orders by `delivery_type` before passing to `PickupTab` and `DeliveryTab`. `DeliveryTab` owns sub-tabs, sorts orders by time, extracts addresses for the map, and renders `DeliveryOrderCard` + `DeliveryRouteMap`. A new server-side API route wraps the Google Directions API for route + waypoint optimization.

**Tech Stack:** Next.js 14 App Router, `@react-google-maps/api` v2.x (`useJsApiLoader`, `GoogleMap`, `Marker`, `Polyline`, `InfoWindow`), `@googlemaps/polyline-codec` (polyline decoding), Google Directions API (server-side), Tailwind CSS, Lucide icons.

---

## Chunk 1 — Tasks 1–2: Dependencies + API Route

### Task 1: Install npm dependencies + add env var

**Files:**
- Run `npm install @react-google-maps/api @googlemaps/polyline-codec`
- `.env.local` — verify `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` already exists (it does, confirmed)
- Run `npm run type-check`

- [ ] **Step 1: Install packages**

```bash
cd /Users/xon/Desktop/BMK/bakemycake_website
npm install @react-google-maps/api @googlemaps/polyline-codec
```

Expected: both packages install without peer dependency errors. `@react-google-maps/api` requires React 16.x+ (project uses React 18, fine). `@googlemaps/polyline-codec` has no peer deps.

- [ ] **Step 2: Verify `.env.local` already has NEXT_PUBLIC_GOOGLE_MAPS_API_KEY**

The key is already present (confirmed during planning). No change needed. Skip if already set.

If for some reason it's missing, add:
```
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=<same value as GOOGLE_MAPS_API_KEY>
```

- [ ] **Step 3: Type-check**

```bash
npm run type-check
```

Expected: passes with zero errors (no new code yet).

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add @react-google-maps/api and @googlemaps/polyline-codec"
```

---

### Task 2: Create `app/api/admin/delivery-route/route.ts`

Server-side Directions API wrapper. Returns time-ordered + optimized routes, decoded polyline, stop locations, and savings in seconds.

**File to create:** `app/api/admin/delivery-route/route.ts`

- [ ] **Step 1: Create the directory and file**

```bash
mkdir -p /Users/xon/Desktop/BMK/bakemycake_website/app/api/admin/delivery-route
```

- [ ] **Step 2: Write the route**

```typescript
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
      // waypointOrder for single stop = [] (no intermediate waypoints)
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
```

- [ ] **Step 3: Type-check**

```bash
npm run type-check
```

Expected: passes with zero errors.

- [ ] **Step 4: Commit**

```bash
git add app/api/admin/delivery-route/route.ts
git commit -m "feat: add delivery-route API — server-side Directions API wrapper"
```

---

## Chunk 2 — Tasks 3–4: Card Components + Map

### Task 3: Extract PaymentToggle + Create DeliveryOrderCard

Two sub-steps:
1. Extract `PaymentToggle` from `DeliveryViewTabs.tsx` into its own file and update `DeliveryViewTabs.tsx` to import it.
2. Create `DeliveryOrderCard.tsx`.

**Files to create/modify:**
- Create: `components/admin/PaymentToggle.tsx`
- Modify: `components/admin/DeliveryViewTabs.tsx` (replace inline function with import)
- Create: `components/admin/DeliveryOrderCard.tsx`

---

#### Sub-step 3A: Create `components/admin/PaymentToggle.tsx`

- [ ] **Step 1: Create the file**

Extract lines 447–481 from `DeliveryViewTabs.tsx` (the `PaymentToggle` function) verbatim, add `'use client';` header and make it a named export:

```typescript
// components/admin/PaymentToggle.tsx
'use client';

import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';

interface PaymentToggleProps {
  paid: boolean;
  loading: boolean;
  onToggle: () => void;
}

export default function PaymentToggle({ paid, loading, onToggle }: PaymentToggleProps) {
  return (
    <button
      onClick={onToggle}
      disabled={loading}
      className={`
        inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold
        border-2 transition-all duration-200 whitespace-nowrap
        ${loading ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:scale-105 active:scale-95'}
        ${paid
          ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
          : 'bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100'
        }
      `}
      title={paid ? 'Нажмите, чтобы отметить неоплаченным' : 'Нажмите, чтобы отметить оплаченным'}
    >
      {loading ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : paid ? (
        <CheckCircle2 className="w-3.5 h-3.5" />
      ) : (
        <XCircle className="w-3.5 h-3.5" />
      )}
      {paid ? 'Оплачен' : 'Не оплачен'}
    </button>
  );
}
```

#### Sub-step 3B: Update `DeliveryViewTabs.tsx`

- [ ] **Step 2: Replace the inline `PaymentToggle` function in `DeliveryViewTabs.tsx`**

At the top of `DeliveryViewTabs.tsx`, add:
```typescript
import PaymentToggle from '@/components/admin/PaymentToggle';
```

Delete lines 447–481 (the inline `function PaymentToggle` definition). All existing usages of `<PaymentToggle ... />` in the file remain unchanged and now resolve from the import.

- [ ] **Step 3: Type-check to confirm DeliveryViewTabs still works**

```bash
npm run type-check
```

Expected: zero errors. `DeliveryViewTabs` still renders correctly.

---

#### Sub-step 3C: Create `components/admin/DeliveryOrderCard.tsx`

- [ ] **Step 4: Create the file**

```typescript
// components/admin/DeliveryOrderCard.tsx
'use client';

import { formatDeliveryAddress, type DeliveryAddress } from '@/lib/schemas/delivery';
import { extractTimeForSorting } from '@/lib/utils';
import PaymentToggle from '@/components/admin/PaymentToggle';
import type { OrderWithItems } from '@/app/admin/delivery/page';

interface DeliveryOrderCardProps {
  order: OrderWithItems;
  isLoading: boolean;
  onTogglePaid: () => void;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('de-CH', { style: 'currency', currency: 'CHF' }).format(amount);
}

function getTimeColor(deliveryTime: string | null): { className: string; label: string } | null {
  if (!deliveryTime) return null;
  const parsed = extractTimeForSorting(deliveryTime);
  if (parsed === null) return null;

  const now = new Date();
  const nowDecimal = now.getHours() + now.getMinutes() / 60;
  const diffHours = parsed - nowDecimal;

  if (diffHours <= 1) return { className: 'text-red-600', label: deliveryTime };
  if (diffHours <= 2) return { className: 'text-orange-500', label: deliveryTime };
  return { className: 'text-charcoal-900', label: deliveryTime };
}

export default function DeliveryOrderCard({ order, isLoading, onTogglePaid }: DeliveryOrderCardProps) {
  const timeInfo = getTimeColor(order.delivery_time);
  const address = formatDeliveryAddress(order.delivery_address as DeliveryAddress | null);

  const itemsSummary = order.order_items
    .map((i) => `${i.product_name}${i.quantity > 1 ? ` ×${i.quantity}` : ''}`)
    .join(', ');

  const client = order.client;
  const phone = client?.phone ?? null;
  const whatsapp = client?.whatsapp ?? null;
  const email = client?.email ?? null;

  return (
    <div
      className={`bg-white rounded-2xl border-2 shadow-sm transition-all duration-200 ${
        order.paid ? 'border-emerald-200' : 'border-amber-200'
      }`}
    >
      {/* Colored top bar */}
      <div className={`h-1.5 rounded-t-2xl ${order.paid ? 'bg-emerald-400' : 'bg-amber-400'}`} />

      <div className="p-4 space-y-3">
        {/* 1. Time row — dominant element */}
        <div>
          {timeInfo ? (
            <p className={`text-2xl font-bold ${timeInfo.className}`}>{timeInfo.label}</p>
          ) : (
            <p className="text-base text-charcoal-400 italic">Время не указано</p>
          )}
        </div>

        {/* 2. Client name */}
        <p className="text-lg font-bold text-charcoal-900">{client?.name ?? '—'}</p>

        {/* 3. Contact row */}
        <div className="flex flex-wrap gap-3">
          {phone ? (
            <>
              <a
                href={`tel:${phone}`}
                className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
              >
                📞 {phone}
              </a>
              <a
                href={`https://wa.me/${phone.replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-green-600 hover:underline"
              >
                💬 WhatsApp
              </a>
            </>
          ) : whatsapp ? (
            <a
              href={`https://wa.me/${whatsapp.replace(/\D/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-green-600 hover:underline"
            >
              💬 {whatsapp}
            </a>
          ) : email ? (
            <a
              href={`mailto:${email}`}
              className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
            >
              ✉️ {email}
            </a>
          ) : (
            <span className="text-sm text-charcoal-400 italic">Нет контакта</span>
          )}
        </div>

        {/* 4. Address */}
        {address ? (
          <p className="text-sm text-charcoal-600 bg-cream-50 rounded-lg px-3 py-2">{address}</p>
        ) : (
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border-2 border-amber-300 bg-amber-50 text-amber-700 text-sm font-medium">
            ⚠️ Адрес не указан
          </div>
        )}

        {/* 5. Items */}
        {itemsSummary && (
          <p className="text-xs text-charcoal-500 truncate">{itemsSummary}</p>
        )}

        {/* 6. Footer: total + payment toggle */}
        <div className="flex items-center justify-between pt-1 border-t border-cream-200">
          <p className="font-bold text-charcoal-900">{formatCurrency(Number(order.total_amount))}</p>
          <PaymentToggle
            paid={order.paid ?? false}
            loading={isLoading}
            onToggle={onTogglePaid}
          />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Type-check**

```bash
npm run type-check
```

Expected: zero errors.

- [ ] **Step 6: Commit**

```bash
git add components/admin/PaymentToggle.tsx components/admin/DeliveryViewTabs.tsx components/admin/DeliveryOrderCard.tsx
git commit -m "feat: extract PaymentToggle + add DeliveryOrderCard"
```

---

### Task 4: Create `components/admin/DeliveryRouteMap.tsx`

Expandable map panel. Loads Google Maps JS API via `useJsApiLoader`, fetches route from `/api/admin/delivery-route` on first expand, renders polyline + numbered markers + InfoWindows.

**File to create:** `components/admin/DeliveryRouteMap.tsx`

- [ ] **Step 1: Create the file**

```typescript
// components/admin/DeliveryRouteMap.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { useJsApiLoader, GoogleMap, Marker, Polyline, InfoWindow } from '@react-google-maps/api';
import { decode } from '@googlemaps/polyline-codec';
import { Loader2 } from 'lucide-react';

interface DeliveryRouteMapProps {
  addresses: string[];
  orderInfos: {
    clientName: string;
    deliveryTime: string | null;
  }[];
}

interface RouteResult {
  polyline: string;
  totalDurationSeconds: number;
  totalDistanceMeters: number;
  waypointOrder: number[];
  stopLocations: { lat: number; lng: number }[];
}

interface RouteData {
  timeOrdered: RouteResult;
  optimized: RouteResult;
  savingsSeconds: number;
}

type RouteMode = 'time' | 'optimized';

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `~${h}h ${m}m` : `~${m}m`;
}

function buildGoogleMapsUrl(addresses: string[], waypointOrder?: number[]): string {
  const base = 'https://www.google.com/maps/dir/?api=1';
  const origin = encodeURIComponent('Via Selva 4, Massagno 6900, Switzerland');

  if (addresses.length === 0) return `${base}&origin=${origin}&travelmode=driving`;

  if (addresses.length === 1) {
    return `${base}&origin=${origin}&destination=${encodeURIComponent(addresses[0])}&travelmode=driving`;
  }

  // Multiple addresses: last is destination, rest are waypoints
  const destination = encodeURIComponent(addresses[addresses.length - 1]);
  const intermediates = addresses.slice(0, -1);

  // If waypointOrder provided (optimized mode), reorder intermediate waypoints
  let orderedIntermediates = intermediates;
  if (waypointOrder && waypointOrder.length > 0) {
    orderedIntermediates = waypointOrder.map((i) => intermediates[i]);
  }

  const waypointsParam = orderedIntermediates.map(encodeURIComponent).join('|');
  return `${base}&origin=${origin}&destination=${destination}&waypoints=${waypointsParam}&travelmode=driving`;
}

export default function DeliveryRouteMap({ addresses, orderInfos }: DeliveryRouteMapProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [routeMode, setRouteMode] = useState<RouteMode>('time');
  const [routeData, setRouteData] = useState<RouteData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [selectedMarkerIdx, setSelectedMarkerIdx] = useState<number | null>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const hasFetched = useRef(false);

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '',
  });

  // Return null if no addresses to display
  if (addresses.length === 0) return null;

  const n = addresses.length;
  const singular = n === 1;

  // Fetch route on first expand
  useEffect(() => {
    if (!isExpanded || hasFetched.current) return;
    hasFetched.current = true;

    const fetchRoute = async () => {
      setLoading(true);
      setError(false);
      try {
        const response = await fetch('/api/admin/delivery-route', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ addresses }),
        });
        if (!response.ok) {
          setError(true);
          return;
        }
        const data: RouteData = await response.json();
        setRouteData(data);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchRoute();
  }, [isExpanded, addresses]);

  // fitBounds when map and routeData are ready
  useEffect(() => {
    if (!map || !routeData || !isLoaded) return;

    const activeRoute = routeMode === 'optimized' ? routeData.optimized : routeData.timeOrdered;
    const decoded = decode(activeRoute.polyline).map(([lat, lng]) => ({ lat, lng }));

    if (decoded.length === 0) return;

    const bounds = new window.google.maps.LatLngBounds();
    decoded.forEach((point) => bounds.extend(point));
    map.fitBounds(bounds);
  }, [map, routeData, routeMode, isLoaded]);

  const activeRoute = routeData
    ? routeMode === 'optimized'
      ? routeData.optimized
      : routeData.timeOrdered
    : null;

  const decodedPolyline = activeRoute
    ? decode(activeRoute.polyline).map(([lat, lng]) => ({ lat, lng }))
    : [];

  // Build marker display order for optimized mode
  // waypointOrder reorders intermediate stops; last address (destination) is always at position n-1
  function getMarkerDisplayIndex(stopIdx: number): number {
    if (!routeData || routeMode !== 'optimized' || addresses.length <= 1) {
      return stopIdx + 1; // 1-based, time order
    }
    const wo = routeData.optimized.waypointOrder;
    // stopIdx < n-1 are intermediate stops reordered by waypointOrder
    // stopIdx === n-1 is the destination (always last)
    if (stopIdx === addresses.length - 1) return addresses.length; // always last
    // Find position of this intermediate stop in the optimized order
    const posInOrder = wo.indexOf(stopIdx);
    return posInOrder === -1 ? stopIdx + 1 : posInOrder + 1;
  }

  const googleMapsUrl = buildGoogleMapsUrl(
    addresses,
    routeMode === 'optimized' && routeData ? routeData.optimized.waypointOrder : undefined
  );

  const savingsMinutes =
    routeData && routeData.savingsSeconds >= 900
      ? Math.round(routeData.savingsSeconds / 60)
      : null;

  // ── Collapsed state ──────────────────────────────────────────────────────
  if (!isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl border-2 border-cream-300 bg-white text-charcoal-700 hover:bg-cream-50 transition-colors font-medium text-sm shadow-sm"
      >
        🗺️ Показать маршрут ({n} {singular ? 'точка' : 'точек'})
      </button>
    );
  }

  // ── Expanded state ───────────────────────────────────────────────────────
  return (
    <div className="rounded-2xl border-2 border-cream-300 bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-cream-200 bg-cream-50">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-charcoal-900 text-sm">
            Маршрут · {n} {singular ? 'точка' : 'точек'}
            {activeRoute && !loading && (
              <span className="text-charcoal-500 font-normal ml-1">
                · {formatDuration(activeRoute.totalDurationSeconds)}
              </span>
            )}
          </span>
          {loading && <Loader2 className="w-4 h-4 animate-spin text-charcoal-400" />}
        </div>
        <button
          onClick={() => setIsExpanded(false)}
          className="text-charcoal-400 hover:text-charcoal-700 transition-colors text-lg leading-none"
          aria-label="Закрыть карту"
        >
          ✕
        </button>
      </div>

      {/* Optimization banner */}
      {savingsMinutes && routeMode === 'time' && (
        <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-amber-50 border-b border-amber-200">
          <p className="text-sm text-amber-800">
            ⚡ Перестановка остановок экономит ~{savingsMinutes} мин
          </p>
          <button
            onClick={() => setRouteMode('optimized')}
            className="text-xs font-semibold text-amber-700 underline underline-offset-2 hover:text-amber-900 whitespace-nowrap"
          >
            Показать оптимальный маршрут
          </button>
        </div>
      )}

      {/* "Back to time order" banner */}
      {routeMode === 'optimized' && (
        <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-blue-50 border-b border-blue-200">
          <p className="text-sm text-blue-800">Показан оптимальный маршрут</p>
          <button
            onClick={() => setRouteMode('time')}
            className="text-xs font-semibold text-blue-700 underline underline-offset-2 hover:text-blue-900 whitespace-nowrap"
          >
            Вернуть исходный порядок
          </button>
        </div>
      )}

      {/* Map container */}
      <div style={{ height: '55vh', width: '100%' }}>
        {error ? (
          /* Error state */
          <div className="h-full flex flex-col items-center justify-center gap-4 p-6 text-center">
            <p className="text-charcoal-600 font-medium">Маршрут недоступен — откройте в Google Maps</p>
            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brown-500 text-white font-semibold text-sm hover:bg-brown-600 transition-colors"
            >
              📍 Открыть маршрут
            </a>
          </div>
        ) : !isLoaded || loading ? (
          /* Loading state */
          <div className="h-full flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-charcoal-300" />
          </div>
        ) : (
          /* Map */
          <GoogleMap
            mapContainerStyle={{ width: '100%', height: '100%' }}
            zoom={12}
            center={{ lat: 46.01, lng: 8.96 }}
            onLoad={(m) => setMap(m)}
          >
            {activeRoute && (
              <>
                <Polyline
                  path={decodedPolyline}
                  options={{
                    strokeColor: '#7c5c3e',
                    strokeWeight: 4,
                    strokeOpacity: 0.8,
                  }}
                />
                {activeRoute.stopLocations.map((location, idx) => (
                  <Marker
                    key={idx}
                    position={location}
                    label={{
                      text: String(getMarkerDisplayIndex(idx)),
                      color: 'white',
                      fontWeight: 'bold',
                    }}
                    onClick={() => setSelectedMarkerIdx(idx)}
                  />
                ))}
                {selectedMarkerIdx !== null && activeRoute.stopLocations[selectedMarkerIdx] && (
                  <InfoWindow
                    position={activeRoute.stopLocations[selectedMarkerIdx]}
                    onCloseClick={() => setSelectedMarkerIdx(null)}
                  >
                    <div className="text-sm">
                      <p className="font-bold">{orderInfos[selectedMarkerIdx]?.clientName ?? '—'}</p>
                      {orderInfos[selectedMarkerIdx]?.deliveryTime && (
                        <p className="text-charcoal-600">{orderInfos[selectedMarkerIdx].deliveryTime}</p>
                      )}
                    </div>
                  </InfoWindow>
                )}
              </>
            )}
          </GoogleMap>
        )}
      </div>

      {/* Footer: Open in Google Maps */}
      <div className="px-4 py-3 border-t border-cream-200 bg-cream-50">
        <a
          href={googleMapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-sm font-medium text-brown-600 hover:text-brown-800 transition-colors"
        >
          📍 Открыть в Google Maps
        </a>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
npm run type-check
```

Expected: zero errors. Note: `google.maps.Map` type is provided by `@types/google.maps` which `@react-google-maps/api` installs as a peer/bundled dep.

- [ ] **Step 3: Commit**

```bash
git add components/admin/DeliveryRouteMap.tsx
git commit -m "feat: add DeliveryRouteMap — expandable Google Maps panel"
```

---

## Chunk 3 — Tasks 5–8: Tab Components + Page Wire-up

### Task 5: Create `components/admin/DeliveryTab.tsx`

Handles delivery sub-tabs (Today/Tomorrow/Week), sorts orders by time, extracts addresses for the map, renders `DeliveryRouteMap` + `DeliveryOrderCard`.

**File to create:** `components/admin/DeliveryTab.tsx`

- [ ] **Step 1: Create the file**

```typescript
// components/admin/DeliveryTab.tsx
'use client';

import { useState } from 'react';
import { Clock } from 'lucide-react';
import { parseDateFromDB, formatDateForDB, extractTimeForSorting } from '@/lib/utils';
import { type DeliveryAddress } from '@/lib/schemas/delivery';
import DeliveryOrderCard from '@/components/admin/DeliveryOrderCard';
import DeliveryRouteMap from '@/components/admin/DeliveryRouteMap';
import type { OrderWithItems } from '@/app/admin/delivery/page';

interface DeliveryTabProps {
  orders: OrderWithItems[];
}

type TimeTab = 'today' | 'tomorrow' | 'week';

function formatAddressForMap(addr: DeliveryAddress): string {
  const parts = [addr.street];
  const cityPart = [addr.postalCode, addr.city].filter(Boolean).join(' ');
  if (cityPart) parts.push(cityPart);
  parts.push(addr.country ?? 'Switzerland');
  return parts.join(', ');
}

export default function DeliveryTab({ orders: initialOrders }: DeliveryTabProps) {
  const [orders, setOrders] = useState<OrderWithItems[]>(initialOrders);
  const [activeTab, setActiveTab] = useState<TimeTab>('today');
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());

  const today = new Date();
  const todayStr = formatDateForDB(today);
  const tomorrowDate = new Date(today);
  tomorrowDate.setDate(today.getDate() + 1);
  const tomorrowStr = formatDateForDB(tomorrowDate);

  const getWeekRange = () => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - daysFromMonday);
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);
    return { weekStart, weekEnd };
  };

  const getFilteredOrders = (tab: TimeTab): OrderWithItems[] => {
    const filtered = orders.filter((o) => {
      if (!o.delivery_date) return false;
      if (tab === 'today') return o.delivery_date === todayStr;
      if (tab === 'tomorrow') return o.delivery_date === tomorrowStr;
      const { weekStart, weekEnd } = getWeekRange();
      const d = parseDateFromDB(o.delivery_date);
      return d >= weekStart && d <= weekEnd;
    });

    return filtered.sort((a, b) => {
      const aTime = extractTimeForSorting(a.delivery_time);
      const bTime = extractTimeForSorting(b.delivery_time);
      if (aTime !== null && bTime !== null) return aTime - bTime;
      if (aTime !== null) return -1;
      if (bTime !== null) return 1;
      return 0;
    });
  };

  const handleTogglePaid = async (order: OrderWithItems) => {
    const { id, paid: isPaid } = order;
    setLoadingIds((prev) => { const next = new Set(prev); next.add(id); return next; });
    const endpoint = isPaid ? `/api/admin/orders/${id}/mark-unpaid` : `/api/admin/orders/${id}/mark-paid`;
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (!response.ok) throw new Error('Failed');
      setOrders((prev) =>
        prev.map((o) =>
          o.id === id ? { ...o, paid: !isPaid, payment_method: isPaid ? o.payment_method : 'cash' } : o
        )
      );
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Ошибка');
    } finally {
      setLoadingIds((prev) => { const next = new Set(prev); next.delete(id); return next; });
    }
  };

  const todayCount = getFilteredOrders('today').length;
  const tomorrowCount = getFilteredOrders('tomorrow').length;
  const filteredOrders = getFilteredOrders(activeTab);

  // Extract addresses for map (only today/tomorrow, only orders with address)
  const ordersWithAddress = filteredOrders.filter(
    (o) => o.delivery_address !== null && activeTab !== 'week'
  );
  const addresses = ordersWithAddress.map((o) =>
    formatAddressForMap(o.delivery_address as DeliveryAddress)
  );
  const orderInfos = ordersWithAddress.map((o) => ({
    clientName: o.client?.name ?? '—',
    deliveryTime: o.delivery_time,
  }));

  const tabs: { id: TimeTab; label: string }[] = [
    { id: 'today', label: `Сегодня (${todayCount})` },
    { id: 'tomorrow', label: `Завтра (${tomorrowCount})` },
    { id: 'week', label: 'Эта неделя' },
  ];

  return (
    <div className="space-y-4">
      {/* Sub-tab pills */}
      <div className="bg-white rounded-2xl shadow-sm border-2 border-cream-200 p-2">
        <div className="grid grid-cols-3 gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 rounded-xl font-semibold text-sm transition-all duration-200 ${
                activeTab === tab.id
                  ? 'bg-brown-500 text-white shadow-md scale-[1.02]'
                  : 'bg-cream-50 text-charcoal-700 hover:bg-cream-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Route map (today/tomorrow only) */}
      {activeTab !== 'week' && (
        <DeliveryRouteMap addresses={addresses} orderInfos={orderInfos} />
      )}

      {/* Order list */}
      {filteredOrders.length === 0 ? (
        <div className="bg-white rounded-2xl border-2 border-cream-200 p-12 text-center shadow-sm">
          <Clock className="w-12 h-12 mx-auto text-charcoal-300 mb-3" />
          <h3 className="text-lg font-heading font-bold text-charcoal-700 mb-1">Нет заказов</h3>
          <p className="text-sm text-charcoal-500">На выбранный день заказов на доставку нет</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredOrders.map((order) => (
            <DeliveryOrderCard
              key={order.id}
              order={order}
              isLoading={loadingIds.has(order.id)}
              onTogglePaid={() => handleTogglePaid(order)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
npm run type-check
```

Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add components/admin/DeliveryTab.tsx
git commit -m "feat: add DeliveryTab — delivery sub-tabs with map integration"
```

---

### Task 6: Create `components/admin/PickupTab.tsx`

Same structure as DeliveryTab but uses existing card layout from DeliveryViewTabs (desktop grid + mobile stack), no map.

**File to create:** `components/admin/PickupTab.tsx`

- [ ] **Step 1: Create the file**

```typescript
// components/admin/PickupTab.tsx
'use client';

import { useState } from 'react';
import { Clock, ShoppingBag } from 'lucide-react';
import { parseDateFromDB, formatDateForDB, extractTimeForSorting } from '@/lib/utils';
import PaymentToggle from '@/components/admin/PaymentToggle';
import type { OrderWithItems } from '@/app/admin/delivery/page';

interface PickupTabProps {
  orders: OrderWithItems[];
}

type TimeTab = 'today' | 'tomorrow' | 'week';

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('de-CH', { style: 'currency', currency: 'CHF' }).format(amount);
}

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

export default function PickupTab({ orders: initialOrders }: PickupTabProps) {
  const [orders, setOrders] = useState<OrderWithItems[]>(initialOrders);
  const [activeTab, setActiveTab] = useState<TimeTab>('today');
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());

  const today = new Date();
  const todayStr = formatDateForDB(today);
  const tomorrowDate = new Date(today);
  tomorrowDate.setDate(today.getDate() + 1);
  const tomorrowStr = formatDateForDB(tomorrowDate);

  const getWeekRange = () => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - daysFromMonday);
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);
    return { weekStart, weekEnd };
  };

  const getFilteredOrders = (tab: TimeTab): OrderWithItems[] => {
    const filtered = orders.filter((o) => {
      if (!o.delivery_date) return false;
      if (tab === 'today') return o.delivery_date === todayStr;
      if (tab === 'tomorrow') return o.delivery_date === tomorrowStr;
      const { weekStart, weekEnd } = getWeekRange();
      const d = parseDateFromDB(o.delivery_date);
      return d >= weekStart && d <= weekEnd;
    });

    return filtered.sort((a, b) => {
      const aTime = extractTimeForSorting(a.delivery_time);
      const bTime = extractTimeForSorting(b.delivery_time);
      if (aTime !== null && bTime !== null) return aTime - bTime;
      if (aTime !== null) return -1;
      if (bTime !== null) return 1;
      return 0;
    });
  };

  const handleTogglePaid = async (order: OrderWithItems) => {
    const { id, paid: isPaid } = order;
    setLoadingIds((prev) => { const next = new Set(prev); next.add(id); return next; });
    const endpoint = isPaid ? `/api/admin/orders/${id}/mark-unpaid` : `/api/admin/orders/${id}/mark-paid`;
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (!response.ok) throw new Error('Failed');
      setOrders((prev) =>
        prev.map((o) =>
          o.id === id ? { ...o, paid: !isPaid, payment_method: isPaid ? o.payment_method : 'cash' } : o
        )
      );
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Ошибка');
    } finally {
      setLoadingIds((prev) => { const next = new Set(prev); next.delete(id); return next; });
    }
  };

  const todayCount = getFilteredOrders('today').length;
  const tomorrowCount = getFilteredOrders('tomorrow').length;
  const filteredOrders = getFilteredOrders(activeTab);

  const tabs: { id: TimeTab; label: string }[] = [
    { id: 'today', label: `Сегодня (${todayCount})` },
    { id: 'tomorrow', label: `Завтра (${tomorrowCount})` },
    { id: 'week', label: 'Эта неделя' },
  ];

  return (
    <div className="space-y-4">
      {/* Sub-tab pills */}
      <div className="bg-white rounded-2xl shadow-sm border-2 border-cream-200 p-2">
        <div className="grid grid-cols-3 gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 rounded-xl font-semibold text-sm transition-all duration-200 ${
                activeTab === tab.id
                  ? 'bg-brown-500 text-white shadow-md scale-[1.02]'
                  : 'bg-cream-50 text-charcoal-700 hover:bg-cream-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Order list */}
      {filteredOrders.length === 0 ? (
        <div className="bg-white rounded-2xl border-2 border-cream-200 p-12 text-center shadow-sm">
          <Clock className="w-12 h-12 mx-auto text-charcoal-300 mb-3" />
          <h3 className="text-lg font-heading font-bold text-charcoal-700 mb-1">Нет заказов</h3>
          <p className="text-sm text-charcoal-500">На выбранный день заказов на самовывоз нет</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredOrders.map((order) => {
            const isLoading = loadingIds.has(order.id);
            const itemsSummary = order.order_items
              .map((i) => `${i.product_name}${i.quantity > 1 ? ` ×${i.quantity}` : ''}`)
              .join(', ');

            return (
              <div
                key={order.id}
                className={`bg-white rounded-2xl border-2 shadow-sm transition-all duration-200 ${
                  order.paid ? 'border-emerald-200' : 'border-amber-200'
                }`}
              >
                {/* Colored top bar */}
                <div
                  className={`h-1 rounded-t-2xl ${order.paid ? 'bg-emerald-400' : 'bg-amber-400'}`}
                />

                <div className="p-4 sm:p-5">
                  {/* Desktop: 7-column grid */}
                  <div className="hidden md:grid md:grid-cols-[auto_1fr_auto_1fr_auto_auto] md:items-center md:gap-4">
                    {/* Order number */}
                    <div className="min-w-[5rem]">
                      <p className="text-xs font-semibold text-charcoal-400 uppercase tracking-wide mb-0.5">
                        Заказ
                      </p>
                      <p className="font-mono text-sm font-bold text-brown-500">
                        {order.order_number ?? order.id.slice(0, 8)}
                      </p>
                    </div>

                    {/* Client + date */}
                    <div>
                      <p className="font-semibold text-charcoal-900 truncate">
                        {order.client?.name ?? '—'}
                      </p>
                      <p className="text-xs text-charcoal-500">
                        {order.delivery_date ? formatDate(order.delivery_date) : '—'}
                        {order.delivery_time ? ` · ${order.delivery_time}` : ''}
                      </p>
                    </div>

                    {/* Type badge */}
                    <div>
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                        <ShoppingBag className="w-3 h-3" />
                        Самовывоз
                      </span>
                    </div>

                    {/* Items */}
                    <div className="min-w-0">
                      <p className="text-xs text-charcoal-600 truncate" title={itemsSummary}>
                        {itemsSummary || '—'}
                      </p>
                    </div>

                    {/* Total */}
                    <div className="text-right min-w-[5rem]">
                      <p className="font-bold text-charcoal-900">
                        {formatCurrency(Number(order.total_amount))}
                      </p>
                    </div>

                    {/* Payment toggle */}
                    <div className="flex justify-end">
                      <PaymentToggle
                        paid={order.paid ?? false}
                        loading={isLoading}
                        onToggle={() => handleTogglePaid(order)}
                      />
                    </div>
                  </div>

                  {/* Mobile: stacked layout */}
                  <div className="md:hidden space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-bold text-brown-500">
                          #{order.order_number ?? order.id.slice(0, 8)}
                        </span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                          <ShoppingBag className="w-3 h-3" />
                          Самовывоз
                        </span>
                      </div>
                      <PaymentToggle
                        paid={order.paid ?? false}
                        loading={isLoading}
                        onToggle={() => handleTogglePaid(order)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-charcoal-900">
                          {order.client?.name ?? '—'}
                        </p>
                        {order.delivery_time && (
                          <p className="text-xs text-charcoal-500 flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3" />
                            {order.delivery_time}
                            {order.delivery_date ? ` · ${formatDate(order.delivery_date)}` : ''}
                          </p>
                        )}
                      </div>
                      <p className="font-bold text-charcoal-900">
                        {formatCurrency(Number(order.total_amount))}
                      </p>
                    </div>

                    {itemsSummary && (
                      <p className="text-xs text-charcoal-500 truncate">{itemsSummary}</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
npm run type-check
```

Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add components/admin/PickupTab.tsx
git commit -m "feat: add PickupTab — pickup sub-tabs with existing card layout"
```

---

### Task 7: Create `components/admin/DeliveryPageTabs.tsx`

Top-level client component that splits orders by `delivery_type` and renders the correct tab.

**File to create:** `components/admin/DeliveryPageTabs.tsx`

- [ ] **Step 1: Create the file**

```typescript
// components/admin/DeliveryPageTabs.tsx
'use client';

import { useState } from 'react';
import DeliveryTab from '@/components/admin/DeliveryTab';
import PickupTab from '@/components/admin/PickupTab';
import type { OrderWithItems } from '@/app/admin/delivery/page';

interface DeliveryPageTabsProps {
  orders: OrderWithItems[];
}

type MainTab = 'delivery' | 'pickup';

export default function DeliveryPageTabs({ orders }: DeliveryPageTabsProps) {
  const [activeMainTab, setActiveMainTab] = useState<MainTab>('delivery');

  // Split orders — immediate orders are already excluded by the page query
  const deliveryOrders = orders.filter((o) => o.delivery_type === 'delivery');
  const pickupOrders = orders.filter((o) => o.delivery_type === 'pickup');

  const tabs: { id: MainTab; label: string; count: number }[] = [
    { id: 'delivery', label: '🚗 Доставка', count: deliveryOrders.length },
    { id: 'pickup', label: '🏪 Самовывоз', count: pickupOrders.length },
  ];

  return (
    <div className="space-y-4">
      {/* Top-level tab bar */}
      <div className="flex gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveMainTab(tab.id)}
            className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-semibold text-sm transition-all duration-200 ${
              activeMainTab === tab.id
                ? 'bg-brown-500 text-white shadow-md'
                : 'bg-white text-charcoal-700 border-2 border-cream-200 hover:bg-cream-50'
            }`}
          >
            {tab.label}
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                activeMainTab === tab.id
                  ? 'bg-white/20 text-white'
                  : 'bg-cream-100 text-charcoal-600'
              }`}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeMainTab === 'delivery' ? (
        <DeliveryTab orders={deliveryOrders} />
      ) : (
        <PickupTab orders={pickupOrders} />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
npm run type-check
```

Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add components/admin/DeliveryPageTabs.tsx
git commit -m "feat: add DeliveryPageTabs — top-level Pickup/Delivery tab switcher"
```

---

### Task 8: Update `app/admin/delivery/page.tsx`

Replace `DeliveryViewTabs` with `DeliveryPageTabs` in the server page component. This is the final wire-up step. Run type-check AND build.

**File to modify:** `app/admin/delivery/page.tsx`

- [ ] **Step 1: Update the import**

Replace:
```typescript
import DeliveryViewTabs from '@/components/admin/DeliveryViewTabs';
```
With:
```typescript
import DeliveryPageTabs from '@/components/admin/DeliveryPageTabs';
```

- [ ] **Step 2: Update the JSX**

Replace:
```tsx
<DeliveryViewTabs orders={orders} />
```
With:
```tsx
<DeliveryPageTabs orders={orders} />
```

The full updated file looks like this:

```typescript
// app/admin/delivery/page.tsx  (full file after change)
import { redirect } from 'next/navigation';
import { validateSession, getUserRole } from '@/lib/auth/session';
import { supabaseAdmin } from '@/lib/supabase/server';
import AdminHeader from '@/components/admin/AdminHeader';
import DeliveryPageTabs from '@/components/admin/DeliveryPageTabs';
import type { Database } from '@/lib/supabase/types';

type Order = Database['public']['Tables']['orders']['Row'];
type OrderItem = Database['public']['Tables']['order_items']['Row'];
type Client = Database['public']['Tables']['clients']['Row'];

export interface OrderWithItems extends Order {
  order_items: OrderItem[];
  client: Client | null;
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function AdminDeliveryPage() {
  const isAuthenticated = await validateSession();
  if (!isAuthenticated) {
    redirect('/admin/login');
  }

  const role = await getUserRole();
  if (role !== 'cook' && role !== 'owner') {
    redirect('/admin/login');
  }

  // Fetch orders for the next 2 weeks (plus yesterday for late stragglers)
  const now = new Date();
  const from = new Date(now);
  from.setDate(from.getDate() - 1);

  const to = new Date(now);
  to.setDate(to.getDate() + 14);

  const fromStr = from.toISOString().split('T')[0];
  const toStr = to.toISOString().split('T')[0];

  const { data, error } = await supabaseAdmin
    .from('orders')
    .select(`
      *,
      order_items(*),
      client:clients(*)
    `)
    .gte('delivery_date', fromStr)
    .lte('delivery_date', toStr)
    .order('delivery_date', { ascending: true })
    .order('created_at', { ascending: true });

  if (error || !data) {
    console.error('Error fetching delivery orders:', error);
    return (
      <div className="min-h-screen bg-cream-50">
        <AdminHeader role={role} />
        <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="max-w-5xl mx-auto">
            <div className="bg-white rounded-2xl shadow-md border-2 border-rose-300 p-12 text-center">
              <p className="text-rose-500 font-semibold">Ошибка загрузки заказов</p>
              {error && <p className="text-sm text-charcoal-500 mt-2">{error.message}</p>}
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Exclude immediate (walk-in shelf) sales — they have no delivery/pickup
  const orders = (data as OrderWithItems[]).filter(
    (o) => o.delivery_type !== 'immediate'
  );

  return (
    <div className="min-h-screen bg-cream-50">
      <AdminHeader role={role} />
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-5xl mx-auto">
          <div className="mb-6 md:mb-8">
            <h1 className="text-2xl sm:text-3xl font-heading font-bold text-brown-500 mb-1">
              Доставки и самовывоз
            </h1>
            <p className="text-sm text-charcoal-500">
              Статус оплаты и информация о доставке / самовывозе
            </p>
          </div>

          <DeliveryPageTabs orders={orders} />
        </div>
      </main>
    </div>
  );
}
```

- [ ] **Step 3: Type-check**

```bash
npm run type-check
```

Expected: zero errors.

- [ ] **Step 4: Build**

```bash
npm run build
```

Expected: successful build, no TypeScript or module resolution errors. If there are dynamic import issues with `@react-google-maps/api` in SSR, add `ssr: false` via `next/dynamic`:

```typescript
// In DeliveryTab.tsx, replace the static import of DeliveryRouteMap with:
import dynamic from 'next/dynamic';
const DeliveryRouteMap = dynamic(() => import('@/components/admin/DeliveryRouteMap'), { ssr: false });
```

This prevents the Google Maps JS API from attempting to run in Node.js during SSR/build.

- [ ] **Step 5: Commit**

```bash
git add app/admin/delivery/page.tsx
git commit -m "feat: wire delivery page to new DeliveryPageTabs — completes delivery page rebuild"
```

---

## Verification Checklist

Run after completing all 8 tasks. Open the page on an iPhone or iPhone simulator (Safari):

- [ ] Delivery tab shows only delivery orders; Pickup tab shows only pickup orders
- [ ] `immediate` orders excluded from both tabs
- [ ] Orders sorted by delivery_time ascending; null/unparseable times at bottom
- [ ] Time color coding: red <1h, orange 1–2h, default charcoal otherwise
- [ ] "Время не указано" shown in muted grey for null/unparseable times
- [ ] Contact row: phone shown first as tel: link + WhatsApp link
- [ ] Contact falls back to WhatsApp-only, then email, then "Нет контакта"
- [ ] "⚠️ Адрес не указан" badge on delivery cards with no address
- [ ] Orders without addresses appear in card list but NOT in map addresses
- [ ] Map button hidden when no delivery orders have an address
- [ ] Map expands on button tap; collapses on X tap
- [ ] Route fetch fires on first expand, not on mount
- [ ] Loading spinner shown while fetching
- [ ] Markers numbered correctly in time order (1, 2, 3…)
- [ ] Polyline draws correctly between all stops
- [ ] fitBounds auto-zooms to all markers
- [ ] InfoWindow shows client name + time on marker tap
- [ ] Optimization banner shown only when savings ≥ 15 min (900 seconds)
- [ ] Toggling to optimized route: polyline redraws, markers renumber
- [ ] "Open in Google Maps" URL is correct for both time-ordered and optimized modes
- [ ] API failure → error state with fallback "Открыть маршрут" link
- [ ] Single-address: map shows, no optimization banner
- [ ] PickupTab renders correct card layout (desktop grid + mobile stacked)
- [ ] Payment toggle works in both tabs (optimistic update)
- [ ] All touch interactions work on iPhone Safari

---

## Notes for Implementer

**SSR safety:** `@react-google-maps/api` uses browser globals (`window`, `google`). If the build fails with `ReferenceError: google is not defined`, use `next/dynamic` with `{ ssr: false }` to load `DeliveryRouteMap`. The dynamic import goes in `DeliveryTab.tsx` as shown in Task 8 Step 4.

**waypointOrder semantics:** The Google Directions API returns `waypoint_order` as an array of indices referring to the intermediate waypoints array (i.e., `addresses.slice(0, -1)`). The destination (`addresses[addresses.length - 1]`) is never reordered. This is handled in `getMarkerDisplayIndex` in `DeliveryRouteMap`.

**NEXT_PUBLIC_GOOGLE_MAPS_API_KEY:** Already present in `.env.local` as of 2026-03-13. Task 1 Step 2 is a verification step only.

**`DeliveryViewTabs.tsx` is preserved:** It continues to exist as the legacy component. Only Task 8 removes it from active use by the page. It can be deleted in a future cleanup commit once the new page is confirmed stable.
