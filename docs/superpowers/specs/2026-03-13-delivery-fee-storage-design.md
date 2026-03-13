# Delivery Fee Storage — Design Spec

**Date:** 2026-03-13
**Status:** Approved

---

## Problem

The `orders` table has no `delivery_fee` column. Delivery fees are:

- Calculated correctly in the public checkout flow (Google Maps API / zip-code lookup)
- Stored in `checkout_attempts.delivery_fee` as a snapshot
- Added to `total_amount` before writing to `orders`
- **But never stored separately in `orders`** — you cannot audit what was charged for delivery on any individual order

The admin `CreateOrderModal` makes this worse: it has no delivery fee input at all, so admins cannot set a delivery surcharge when creating manual orders.

---

## Goals

1. Store `delivery_fee` as a separate, auditable field on every order
2. Keep `total_amount = subtotal + delivery_fee` as the authoritative total
3. Give admins a hybrid delivery fee field (auto-calculated, manually overridable)
4. Update the Drizzle schema so the type system reflects reality

---

## Non-Goals

- Backfilling existing orders (they default to `delivery_fee = 0`, acceptable)
- Changing how Stripe charges work
- Modifying `checkout_attempts`

---

## Architecture

### 1. Database — Migration 038

```sql
ALTER TABLE orders
  ADD COLUMN delivery_fee DECIMAL(10,2) NOT NULL DEFAULT 0;
```

File: `supabase/migrations/038_add_delivery_fee_to_orders.sql`

### 2. Drizzle Schema — `lib/db/schema.ts`

Add to the `orders` table definition (after `totalAmount`):

```ts
deliveryFee: numeric('delivery_fee', { precision: 10, scale: 2 }).notNull().default('0'),
```

### 3. Stripe Webhook — `app/api/webhooks/stripe/route.ts`

`deliveryFee` is already parsed from Stripe metadata at line 133. The order insert block (lines 189–208) simply needs one new field:

```ts
delivery_fee: deliveryFee,
```

No other changes needed to this file.

### 4. Admin Order Creation API — `app/api/admin/orders/create/route.ts`

- Accept new optional body param: `delivery_fee: number` (defaults to `0`)
- Server-side: validate `delivery_fee >= 0`, reject with 400 if negative
- Round to 2 decimal places before writing (`Math.round(deliveryFee * 100) / 100`) to avoid float drift against the `DECIMAL(10,2)` column
- Store it in the new column
- Compute `total_amount = items_subtotal + delivery_fee` server-side (do not trust the client-passed total blindly)

### 5. CreateOrderModal — `components/admin/CreateOrderModal.tsx`

**Behavior:**
- Delivery type = `pickup` → fee field hidden, fee = `0`
- Delivery type = `delivery` → fee field appears
  - On address entry/change: debounce 500ms, then call `/api/delivery-estimate` (already exists) with the address; populate field with returned fee. Cancel in-flight requests on new input to prevent out-of-order results.
  - Admin can edit the field value at any time (override)
- `calculateTotal()` adds `deliveryFee` state to item subtotal
- `deliveryFee` is submitted in the API request body

**UI:**
- Field label: "Delivery Fee (CHF)"
- Input type: `number`, step `0.01`, min `0`
- Show a small loading indicator while the estimate is being fetched
- Show "Calculated automatically — you can override" hint text below the field

---

## Data Flow

### Public Checkout (after this change)

```
CheckoutForm → /api/checkout → Stripe (with deliveryFee in metadata)
  → Stripe Webhook → orders.insert({ delivery_fee, total_amount })
```

### Admin Manual Order (after this change)

```
CreateOrderModal → /api/admin/orders/create (with delivery_fee)
  → orders.insert({ delivery_fee, total_amount = subtotal + delivery_fee })
```

---

### 6. Admin Order Edit API — `app/api/admin/orders/[id]/route.ts`

The PATCH route has an explicit `allowedFields` whitelist (line 19). Add `'delivery_fee'` to it so admins can correct a fee after creation. Note: `total_amount` is not recalculated on edit (it isn't today either) — this is intentional; total is only recomputed at creation time.

---

## Files Changed

| File | Change |
|------|--------|
| `supabase/migrations/038_add_delivery_fee_to_orders.sql` | New migration |
| `lib/db/schema.ts` | Add `deliveryFee` field to `orders` table |
| `app/api/webhooks/stripe/route.ts` | Add `delivery_fee` to order insert |
| `app/api/admin/orders/create/route.ts` | Accept + store `delivery_fee`, recalculate total |
| `app/api/admin/orders/[id]/route.ts` | Add `delivery_fee` to `allowedFields` whitelist |
| `components/admin/CreateOrderModal.tsx` | Add hybrid delivery fee field |

---

## Testing Checklist

- [ ] Public checkout: place a delivery order → verify `orders.delivery_fee` is populated
- [ ] Public checkout: place a pickup order → verify `orders.delivery_fee = 0`
- [ ] Admin modal: select pickup → fee field hidden
- [ ] Admin modal: select delivery + enter address → fee auto-populated from estimate API
- [ ] Admin modal: override the calculated fee → custom value submitted
- [ ] Admin modal: submit → verify `orders.delivery_fee` and `orders.total_amount` are correct
- [ ] Existing orders unaffected (`delivery_fee = 0` by default)
