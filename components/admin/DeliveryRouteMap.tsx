// components/admin/DeliveryRouteMap.tsx
'use client';

/// <reference types="@types/google.maps" />

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

  const destination = encodeURIComponent(addresses[addresses.length - 1]);
  const intermediates = addresses.slice(0, -1);

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

  // waypointOrder reorders intermediate stops; last address (destination) is always at position n-1
  function getMarkerDisplayIndex(stopIdx: number): number {
    if (!routeData || routeMode !== 'optimized' || addresses.length <= 1) {
      return stopIdx + 1;
    }
    const wo = routeData.optimized.waypointOrder;
    if (stopIdx === addresses.length - 1) return addresses.length;
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
          <div className="h-full flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-charcoal-300" />
          </div>
        ) : (
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
