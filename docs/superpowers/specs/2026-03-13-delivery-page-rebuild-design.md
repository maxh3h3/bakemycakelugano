# Delivery Page Rebuild — Design Spec

**Date:** 2026-03-13
**Status:** Approved

---

## Problem

The current `/admin/delivery` page has Pickup/Delivery as a **filter** inside tabs, making both team roles share the same view. There is no map, no route intelligence, and delivery time — the most operationally critical field — is not visually prominent. The page is not optimized for phone use.

---

## Goals

1. Split Pickup and Delivery into **top-level tabs** so each team member sees only what's relevant
2. Make delivery time the **dominant visual element** on each card
3. Show client contact (phone/WhatsApp first, then email) on every delivery card
4. For Today and Tomorrow: show an expandable map with **time-ordered route + geographic optimization banner**
5. Optimize the entire UI for **phone use**

---

## Non-Goals

- Modifying the pickup tab beyond tab restructure (keeps existing card layout)
- Real-time tracking or push notifications
- Modifying how orders are fetched (reuse existing page-level query)
- Route optimization for This Week (too many stops, no value)

---

## Key Utilities (existing — do not reimplement)

### `extractTimeForSorting(timeString: string | null): number | null`
Located in `lib/utils.ts`. Parses imperfect time strings into a sortable decimal number:
- `"12:30"` or `"12.30"` → `12.5`
- `"12"` → `12`
- `"после обеда"`, `"вечером"`, unparseable text → `null`

**Sort rule:** orders with a parseable time sort ascending by that number. Orders returning `null` (no time or unparseable) sort to the **bottom** of the list.

### `requireAdminRole(roles)`
Located in `lib/auth/require-admin-role.ts`. Used in every admin API route. Returns `NextResponse` (401/403) if auth fails, or the session if valid. Existing pattern — use as-is.

---

## Architecture

### Page restructure — `app/admin/delivery/page.tsx`

The page server component continues to fetch orders (same query, same date range). It passes the full order list to a new client component `DeliveryPageTabs` which manages the top-level Pickup/Delivery tab state.

### New component tree

```
DeliveryPageTabs (client — top-level Pickup/Delivery tab state)
├── PickupTab (client — Today/Tomorrow/This Week sub-tabs, order list only)
│   └── reuses existing order card from DeliveryViewTabs
└── DeliveryTab (client — Today/Tomorrow/This Week sub-tabs)
    ├── DeliveryOrderCard (new — time-prominent, contact info, address)
    └── DeliveryRouteMap (client — expandable map panel, owns expanded/route-mode state)
```

### State ownership

- **Top-level tab** (Pickup vs Delivery): owned by `DeliveryPageTabs`
- **Sub-tab** (Today/Tomorrow/This Week): owned by each tab component (`PickupTab`, `DeliveryTab`)
- **Map expanded/collapsed**: owned by `DeliveryRouteMap`
- **Route mode** (time-ordered vs optimized): owned by `DeliveryRouteMap`

`DeliveryTab` passes a pre-formatted `addresses: string[]` (derived from today's/tomorrow's delivery orders that have a `delivery_address`) to `DeliveryRouteMap`. Address formatting: `"${street}, ${postalCode} ${city}, ${country}"` — same pattern as `delivery-estimate` API.

---

## Component Details

### `DeliveryPageTabs`

- Top-level tabs: **🚗 Доставка** | **🏪 Самовывоз**
- Filters `orders` by `delivery_type` before passing to each tab
- `immediate` orders excluded from both (existing behavior)

---

### `DeliveryTab`

Sub-tabs: **Сегодня (N) · Завтра (N) · Эта неделя**

Orders within each sub-tab sorted by `extractTimeForSorting(delivery_time)` ascending. Orders with null/unparseable time float to the bottom.

For **Today** and **Tomorrow**:
- Passes `addresses` (only orders with a non-null `delivery_address`, in sorted time order) to `DeliveryRouteMap`
- Renders `DeliveryRouteMap` above the order list (collapsed by default)
- Renders the full card list below (including orders without addresses — they appear in the list with a warning badge, but are not passed to the map)

For **This Week**: list only, no map.

---

### `DeliveryOrderCard` (phone-optimized)

Layout (top to bottom):

1. **Time row** — large font, color-coded based on time remaining (computed at render using `extractTimeForSorting` result vs. current time):
   - 🔴 Red: delivery within next 60 minutes
   - 🟠 Orange: 60–120 minutes from now
   - ⚫ Default: >120 minutes away
   - If `delivery_time` is null or unparseable: shows "Время не указано" in muted grey — no color coding
   - Shows raw `delivery_time` string as entered — never reformatted

2. **Client name** — bold, large

3. **Contact row** — priority order:
   - If `client.phone`: show 📞 phone as `tel:` link + 💬 WhatsApp (`https://wa.me/<phone>`)
   - Else if `client.whatsapp`: show 💬 WhatsApp link only
   - Else if `client.email`: show ✉️ email as `mailto:` link
   - If none: show "Нет контакта" in muted style

4. **Address** — single line. If `delivery_address` is null: show "⚠️ Адрес не указан" warning badge

5. **Items** — compact list: `Торт шоколадный ×1, Макарон ×12`

6. **Footer row** — total amount + paid badge + payment toggle button

---

### `DeliveryRouteMap`

**Props:** `addresses: string[]` (pre-formatted, time-ordered, only orders that have an address)

**Collapsed state** — shows a single button:
> 🗺️ Показать маршрут (N точек)

If `addresses.length === 0`: button is hidden entirely (nothing to map).

**Expanded state** (~55vh fixed height panel):

**Header bar:**
- "Маршрут · N точек · ~Xh Ym" (duration from API response)
- Loading spinner while route is being fetched (API call fires on first expand, not on mount)

**Optimization banner** (shown only if `savingsSeconds ≥ 900`, i.e. ≥15 min):
> ⚡ Перестановка остановок экономит ~22 мин → [Показать оптимальный маршрут]

Tapping switches `routeMode` state from `'time'` to `'optimized'`, redraws polyline, renumbers markers. A second tap or a "back" control returns to `'time'` mode.

**Map** — `@react-google-maps/api` v2.x, loaded via `APIProvider` (not `LoadScript`):
- `GoogleMap` with `Marker` components numbered 1, 2, 3… according to current `routeMode` order
- `Polyline` drawn from decoded polyline (use `@googlemaps/polyline-codec` or manual decode)
- `fitBounds` called after markers render to auto-zoom
- `InfoWindow` on marker tap: client name + delivery time

**Error state** (API returns `route_unavailable`):
> "Маршрут недоступен — откройте в Google Maps"
> [📍 Открыть маршрут] button

**Footer button** (always shown when expanded):
> 📍 Открыть в Google Maps

URL: `https://www.google.com/maps/dir/?api=1&origin=Via+Selva+4,+Massagno+6900,+Switzerland&waypoints=addr1|addr2|addr3&travelmode=driving`
- In `'optimized'` mode: waypoints are reordered according to `waypointOrder` from API response

---

### `app/api/admin/delivery-route/route.ts`

**Authentication:** `requireAdminRole(['owner', 'cook'])` — same pattern as all other admin routes. Returns 401 (unauthenticated) or 403 (wrong role) as `NextResponse`, matching existing API conventions.

**Request:**
```ts
POST /api/admin/delivery-route
{ addresses: string[] }  // pre-formatted, in time order
```

**Logic:**
1. Auth check via `requireAdminRole`
2. Validate: `addresses` must be an array. Reject 400 if missing or empty.
3. **Single address** (length === 1): call Directions API with `origin = bakery`, `destination = addresses[0]`, no waypoints. Return with `savingsSeconds: 0`, identical `timeOrdered` and `optimized` objects.
4. **Multiple addresses**: `origin = bakery`, `destination = addresses[addresses.length - 1]`, `waypoints = addresses.slice(0, -1)`:
   - Call 1: `optimizeWaypoints: false` → time-ordered route
   - Call 2: `optimizeWaypoints: true` → optimized route
   - Compare total leg durations → `savingsSeconds = timeOrdered.totalDurationSeconds - optimized.totalDurationSeconds`
5. Return response.

**Bakery origin:** `"Via Selva 4, Massagno 6900, Switzerland"` (same constant used in `delivery-estimate` route)

**Response:**
```ts
{
  timeOrdered: {
    polyline: string           // overview_polyline.points from Directions API
    totalDurationSeconds: number
    totalDistanceMeters: number
    waypointOrder: number[]    // [0, 1, 2, ...] — always original order
  }
  optimized: {
    polyline: string
    totalDurationSeconds: number
    totalDistanceMeters: number
    waypointOrder: number[]    // e.g. [0, 2, 1] — reordered by Google
  }
  savingsSeconds: number       // positive = optimized is faster
}
```

**Error handling:**
- Google Maps API non-OK status or unresolvable address → HTTP 422 `{ error: 'route_unavailable' }`
- Client shows error state with "Open in Google Maps" fallback

**Caching:** None. Called once per map expand; frequency is negligible.

---

## Environment Variables

- `GOOGLE_MAPS_API_KEY` — server-side only (Directions API, Distance Matrix API)
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` — **same key value**, exposed to client for Maps JavaScript API rendering

> **Required before deploying:** In Google Cloud Console, restrict the key:
> - HTTP referrers: your production domain + `http://localhost:3000/*`
> - API restrictions: **Maps JavaScript API only**
>
> Until this restriction is applied, do not commit `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` to a public repo.

---

## Map rendering — library details

- Package: `@react-google-maps/api` v2.x (latest stable)
- Load strategy: `APIProvider` component wraps the map — handles async script loading, no manual `LoadScript` needed
- Polyline decoding: use the `@googlemaps/polyline-codec` package (lightweight, no key needed) to decode the encoded polyline into `{ lat, lng }[]` for the `Polyline` component path

---

## New npm dependencies

- `@react-google-maps/api` — React wrapper for Google Maps JavaScript API
- `@googlemaps/polyline-codec` — decode encoded polylines from Directions API response

---

## Files Created / Modified

| File | Change |
|------|--------|
| `app/admin/delivery/page.tsx` | Pass orders to `DeliveryPageTabs` instead of `DeliveryViewTabs` |
| `components/admin/DeliveryPageTabs.tsx` | New — top-level Pickup/Delivery tab switcher |
| `components/admin/DeliveryTab.tsx` | New — delivery sub-tabs + address extraction + DeliveryRouteMap |
| `components/admin/PickupTab.tsx` | New — pickup sub-tabs, reuses existing order card |
| `components/admin/DeliveryOrderCard.tsx` | New — phone-optimized card: time, contact, address, items |
| `components/admin/DeliveryRouteMap.tsx` | New — expandable map panel, route fetch, optimization banner |
| `app/api/admin/delivery-route/route.ts` | New — server-side Directions API wrapper |
| `.env.local` | Add `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` (same value as `GOOGLE_MAPS_API_KEY`) |

---

## Testing Checklist

- [ ] Delivery tab shows only delivery orders; Pickup tab shows only pickup orders
- [ ] `immediate` orders excluded from both tabs
- [ ] Orders sorted by delivery_time ascending; null/unparseable times at bottom
- [ ] Time color coding: red <1h, orange 1–2h, default otherwise
- [ ] "Время не указано" shown in muted grey for null times
- [ ] Contact row: phone shown first as tel: link + WhatsApp link
- [ ] Contact falls back to WhatsApp-only, then email, then "Нет контакта"
- [ ] "⚠️ Адрес не указан" badge on cards with no address
- [ ] Orders without addresses appear in card list but NOT passed to map
- [ ] Map button hidden when no delivery addresses exist
- [ ] Map expands on button tap; collapses on second tap
- [ ] Route fetch fires on first expand, not on mount
- [ ] Loading spinner shown while fetching
- [ ] Markers numbered correctly in time order
- [ ] Polyline draws correctly between all stops
- [ ] fitBounds auto-zooms to all markers
- [ ] InfoWindow shows on marker tap
- [ ] Optimization banner shown only when savings ≥15 min (900 seconds)
- [ ] Toggling to optimized route: polyline redraws, markers renumber
- [ ] "Open in Google Maps" URL correct for both time-ordered and optimized modes
- [ ] API failure → error state with fallback link
- [ ] Single-address: map shows, no optimization banner
- [ ] All interactions work on iPhone Safari
