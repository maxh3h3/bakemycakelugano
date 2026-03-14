# Delivery Fee Storage Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Store `delivery_fee` as an auditable field on every order, and give admins a hybrid delivery fee input in the CreateOrderModal.

**Architecture:** Add a `delivery_fee` column to `orders`, wire it through the Stripe webhook (already has the value parsed), the admin create/edit APIs, and the admin modal UI. The modal auto-fetches a fee estimate when an address is entered (debounced 500ms, cancellable), but lets the admin override it manually.

**Tech Stack:** Next.js 14, Supabase (Postgres), Drizzle ORM, React, TypeScript

---

## Chunk 1: Database & Schema

### Task 1: Create migration file

**Files:**
- Create: `supabase/migrations/038_add_delivery_fee_to_orders.sql`

> **Note:** Verify that `037_add_assembled_status.sql` is still the last migration before creating this file. If a new migration was merged, rename accordingly.

- [ ] **Step 1: Create the migration file**

```sql
-- supabase/migrations/038_add_delivery_fee_to_orders.sql
ALTER TABLE orders
  ADD COLUMN delivery_fee DECIMAL(10,2) NOT NULL DEFAULT 0;
```

- [ ] **Step 2: Apply the migration to your local/dev Supabase instance**

```bash
supabase db push
```

Expected: migration applies cleanly, no errors. Existing rows get `delivery_fee = 0`.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/038_add_delivery_fee_to_orders.sql
git commit -m "feat: add delivery_fee column to orders table"
```

---

### Task 2: Update Drizzle schema

**Files:**
- Modify: `lib/db/schema.ts:48-49` (after `totalAmount`)

- [ ] **Step 1: Add the field to the orders table definition**

In `lib/db/schema.ts`, after line 48 (`totalAmount`):

```ts
  totalAmount: numeric('total_amount', { precision: 10, scale: 2 }).notNull(),
  deliveryFee: numeric('delivery_fee', { precision: 10, scale: 2 }).notNull().default('0'),
  currency: text('currency').default('CHF').notNull(),
```

- [ ] **Step 2: Verify TypeScript compiles cleanly**

```bash
npx tsc --noEmit
```

Expected: no errors related to schema types.

- [ ] **Step 3: Commit**

```bash
git add lib/db/schema.ts
git commit -m "feat: add deliveryFee field to Drizzle orders schema"
```

---

## Chunk 2: Backend APIs

### Task 3: Fix Stripe webhook — write delivery_fee to orders

**Files:**
- Modify: `app/api/webhooks/stripe/route.ts:189-208`

The variable `deliveryFee` is already parsed at line 133. It just needs to be included in the insert.

- [ ] **Step 1: Add `delivery_fee` to the order insert**

In `app/api/webhooks/stripe/route.ts`, inside the `.insert({...})` block (around line 199), add:

```ts
        total_amount: totalAmount,
        delivery_fee: deliveryFee,   // ← add this line
        currency: 'chf',
```

- [ ] **Step 2: Verify TypeScript compiles cleanly**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add app/api/webhooks/stripe/route.ts
git commit -m "feat: persist delivery_fee to orders table via Stripe webhook"
```

---

### Task 4: Update delivery-estimate API to accept a full address string

**Files:**
- Modify: `app/api/delivery-estimate/route.ts`

The admin modal stores the address as a single free-text string (e.g. `"Bahnhofstrasse 10, Zürich 8001"`). The estimate API currently requires separate `address`, `city`, `postalCode`. Add support for an optional `fullAddress` parameter so the modal can call this endpoint without splitting its single field.

- [ ] **Step 1: Add `fullAddress` as an alternative input**

The current file starts with:
```ts
const { address, city, postalCode, country } = await request.json();

if (!address?.trim() || !city?.trim() || !postalCode?.trim()) {
  return NextResponse.json({ error: 'Missing address fields' }, { status: 400 });
}

const destination = `${address.trim()}, ${postalCode.trim()} ${city.trim()}, ${country || 'Switzerland'}`;
```

Replace those lines with:
```ts
const { address, city, postalCode, country, fullAddress } = await request.json();

// Support either a pre-composed fullAddress string (from admin modal with single text field)
// or individual fields (from the public checkout form)
let destination: string;
if (fullAddress?.trim()) {
  destination = fullAddress.trim();
} else {
  if (!address?.trim() || !city?.trim() || !postalCode?.trim()) {
    return NextResponse.json({ error: 'Missing address fields' }, { status: 400 });
  }
  destination = `${address.trim()}, ${postalCode.trim()} ${city.trim()}, ${country || 'Switzerland'}`;
}
```

The key point: the validation guard is inside the `else` branch, so it is bypassed when `fullAddress` is provided. The public checkout (which passes `address`/`city`/`postalCode`) continues to work unchanged.

- [ ] **Step 2: Verify TypeScript compiles cleanly**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add app/api/delivery-estimate/route.ts
git commit -m "feat: support fullAddress param in delivery-estimate API"
```

---

### Task 5: Update admin order creation API

**Files:**
- Modify: `app/api/admin/orders/create/route.ts:16-33` (destructuring) and `:125-143` (insert)

- [ ] **Step 1: Destructure `delivery_fee` from the request body**

In the `body` destructuring block (around line 16):

```ts
    const {
      client_id: providedClientId,
      customer_name,
      customer_email,
      customer_phone,
      customer_ig_handle,
      delivery_date,
      delivery_time,
      delivery_type,
      delivery_address,
      customer_notes,
      payment_method,
      paid,
      channel,
      order_items,
      delivery_fee,       // ← add this
      is_immediate,
    } = body;
```

Remove `total_amount` from the destructuring — the server will compute it.

- [ ] **Step 2: Add server-side delivery_fee validation and total computation**

After the `order_items` validation block (around line 59), add:

```ts
    // Validate and sanitize delivery_fee
    const rawFee = typeof delivery_fee === 'number' ? delivery_fee : 0;
    if (rawFee < 0) {
      return NextResponse.json(
        { success: false, error: 'delivery_fee cannot be negative' },
        { status: 400 }
      );
    }
    const sanitizedDeliveryFee = Math.round(rawFee * 100) / 100;

    // Compute total server-side from items + delivery fee
    const itemsSubtotal = (order_items as any[]).reduce(
      (sum: number, item: any) => sum + (item.unit_price * item.quantity),
      0
    );
    const computedTotal = Math.round((itemsSubtotal + sanitizedDeliveryFee) * 100) / 100;
```

- [ ] **Step 3: Use computed values in the order insert**

In the `.insert({...})` block (around line 126), replace:

```ts
        total_amount: total_amount || 0,
```

with:

```ts
        total_amount: computedTotal,
        delivery_fee: sanitizedDeliveryFee,
```

- [ ] **Step 4: Update the `createRevenueFromOrder` call to use `computedTotal`**

Around line 210, update:

```ts
          totalAmount: computedTotal.toString(),
```

- [ ] **Step 5: Verify TypeScript compiles cleanly**

```bash
npx tsc --noEmit
```

- [ ] **Step 6: Commit**

```bash
git add app/api/admin/orders/create/route.ts
git commit -m "feat: accept and store delivery_fee in admin order creation API"
```

---

### Task 6: Update admin order edit API

**Files:**
- Modify: `app/api/admin/orders/[id]/route.ts:19-27` (allowedFields) and `:58-62` (existing order fetch) and `:102-108` (update block)

When `delivery_fee` is PATCHed, `total_amount` must also be updated to stay consistent: `new_total = current_total - current_delivery_fee + new_delivery_fee`.

- [ ] **Step 1: Add `delivery_fee` to the allowedFields whitelist**

```ts
    const allowedFields = [
      'delivery_type',
      'delivery_date',
      'delivery_time',
      'delivery_address',
      'delivery_fee',      // ← add this
      'paid',
      'payment_method',
      'customer_notes',
    ];
```

- [ ] **Step 2: Extend the existing order fetch to include `total_amount` and `delivery_fee`**

Find the existing order select (around line 58):
```ts
    const { data: existingOrder, error: fetchError } = await supabaseAdmin
      .from('orders')
      .select('id, client_id, order_number')
      .eq('id', id)
      .single() as { data: { id: string; client_id: string | null; order_number: string | null } | null; error: any };
```

Change the `.select(...)` to include the financial fields and update the type cast:
```ts
    const { data: existingOrder, error: fetchError } = await supabaseAdmin
      .from('orders')
      .select('id, client_id, order_number, total_amount, delivery_fee')
      .eq('id', id)
      .single() as { data: { id: string; client_id: string | null; order_number: string | null; total_amount: string; delivery_fee: string } | null; error: any };
```

> Note: Supabase returns numeric columns as strings — parse them before arithmetic.

- [ ] **Step 3: Recalculate `total_amount` when `delivery_fee` is being updated**

After the `allowedFields` loop (around line 36), add:

```ts
    // If delivery_fee is changing, recalculate total_amount to keep it consistent
    if ('delivery_fee' in updateData && existingOrder) {
      const currentTotal = parseFloat(existingOrder.total_amount) || 0;
      const currentFee = parseFloat(existingOrder.delivery_fee) || 0;
      const newFee = Math.max(0, Math.round((parseFloat(updateData.delivery_fee) || 0) * 100) / 100);
      const newTotal = Math.round((currentTotal - currentFee + newFee) * 100) / 100;
      updateData.delivery_fee = newFee;
      updateData.total_amount = newTotal;
    }
```

> This block must come **after** `existingOrder` is fetched but **before** the DB update call.

- [ ] **Step 4: Verify TypeScript compiles cleanly**

```bash
npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add "app/api/admin/orders/[id]/route.ts"
git commit -m "feat: allow delivery_fee updates via PATCH, recalculate total_amount"
```

---

## Chunk 3: CreateOrderModal UI

### Task 7: Add delivery fee state and auto-fetch logic

**Files:**
- Modify: `components/admin/CreateOrderModal.tsx`

This task adds state and the auto-fetch effect. No UI changes yet.

- [ ] **Step 1: Add state variables**

After the existing `useState` declarations (around line 47), add:

```ts
  const [deliveryFee, setDeliveryFee] = useState<number>(0);
  const [isFetchingFee, setIsFetchingFee] = useState(false);
```

- [ ] **Step 2: Add the auto-fetch effect**

After the existing `useEffect` blocks, add:

```ts
  // Auto-fetch delivery fee estimate when address changes (delivery orders only)
  useEffect(() => {
    if (formData.delivery_type !== 'delivery' || !formData.delivery_address.trim()) {
      setDeliveryFee(0);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setIsFetchingFee(true);
      try {
        const res = await fetch('/api/delivery-estimate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fullAddress: formData.delivery_address }),
          signal: controller.signal,
        });
        if (res.ok) {
          const data = await res.json();
          if (typeof data.fee === 'number') {
            setDeliveryFee(data.fee);
          }
        }
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.error('Delivery estimate error:', err);
        }
      } finally {
        setIsFetchingFee(false);
      }
    }, 500);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [formData.delivery_address, formData.delivery_type]);
```

- [ ] **Step 3: Reset delivery fee when switching to pickup**

This is handled automatically by the effect above (`delivery_type !== 'delivery'` → `setDeliveryFee(0)`). No extra code needed.

> **Note on `getItemsSummary()`:** This function (line 252) calls `calculateTotal()` directly. Once `calculateTotal()` is updated in Step 4, the step breadcrumb in the modal header will also reflect the correct total including the fee. No separate fix needed.

> **Note on `validateDeliveryAddress`:** The `city` and `postalCode` fields in `lib/schemas/delivery.ts` are already marked optional in the Zod schema. The modal's free-text address (stored entirely in `street`) passes validation as-is. No change needed.

- [ ] **Step 4: Update `calculateTotal` to include the fee**

Find `calculateTotal` (around line 209):

```ts
  const calculateTotal = () => {
    return orderItems.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);
  };
```

Change to:

```ts
  const calculateTotal = () => {
    const subtotal = orderItems.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);
    return subtotal + deliveryFee;
  };
```

- [ ] **Step 5: Add `delivery_fee` to the submit payload**

In `handleSubmit`, inside the `payload` object (around line 363), add:

```ts
        delivery_fee: deliveryFee,
```

And remove `total_amount` from the payload — the server now computes it.

> **Note:** The server computes `total_amount = subtotal + delivery_fee`. Remove the `total_amount: totalAmount` line from the payload to avoid confusion. The server ignores it anyway now.

- [ ] **Step 6: Verify TypeScript compiles cleanly**

```bash
npx tsc --noEmit
```

- [ ] **Step 7: Commit**

```bash
git add components/admin/CreateOrderModal.tsx
git commit -m "feat: add delivery fee state and auto-fetch logic to CreateOrderModal"
```

---

### Task 8: Add delivery fee input field to Step 3 UI

**Files:**
- Modify: `components/admin/CreateOrderModal.tsx:1029-1046` (the delivery address conditional block in Step 3)

- [ ] **Step 1: Add the delivery fee input field below the address field**

After the closing `</div>` of the delivery address conditional block (after line 1045), still inside `{formData.delivery_type === 'delivery' && (`, add the fee field:

```tsx
                {formData.delivery_type === 'delivery' && (
                  <div className="md:col-span-2">
                    {/* ... existing address field ... */}
                  </div>
                )}

                {formData.delivery_type === 'delivery' && (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-charcoal-700 mb-2">
                      Стоимость доставки (CHF)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={deliveryFee}
                        onChange={(e) => setDeliveryFee(Math.max(0, parseFloat(e.target.value) || 0))}
                        className="w-full px-4 py-2 rounded-lg border-2 border-cream-300 focus:border-brown-500 focus:outline-none"
                      />
                      {isFetchingFee && (
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-charcoal-500 animate-pulse">
                          Рассчитывается...
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-charcoal-500 mt-1">
                      Рассчитывается автоматически — можно изменить вручную
                    </p>
                  </div>
                )}
```

- [ ] **Step 2: Update the footer total display to show fee breakdown**

Find the footer total display (around line 1133):

```tsx
            <p className="text-2xl font-bold text-brown-500">CHF {calculateTotal().toFixed(2)}</p>
```

Add a delivery fee line above it (only when fee > 0):

```tsx
            {deliveryFee > 0 && (
              <p className="text-xs text-charcoal-500">
                вкл. доставка CHF {deliveryFee.toFixed(2)}
              </p>
            )}
            <p className="text-2xl font-bold text-brown-500">CHF {calculateTotal().toFixed(2)}</p>
```

- [ ] **Step 3: Verify the dev server renders without errors**

```bash
npm run dev
```

Open the admin panel, create a new order:
- Set delivery type to pickup → fee field hidden, total = items only
- Set delivery type to delivery → fee field appears
- Enter an address → field populates after ~500ms (watch network tab for `/api/delivery-estimate`)
- Override the value manually → total updates immediately
- Check footer shows `вкл. доставка CHF X.XX` when fee > 0

- [ ] **Step 4: Commit**

```bash
git add components/admin/CreateOrderModal.tsx
git commit -m "feat: add hybrid delivery fee input to CreateOrderModal Step 3"
```

---

## Final Verification Checklist

- [ ] Apply migration to production Supabase (run in Supabase dashboard SQL editor or via `supabase db push --linked`)
- [ ] Public checkout: place a delivery order → check `orders.delivery_fee` in Supabase table editor
- [ ] Public checkout: place a pickup order → `orders.delivery_fee = 0`
- [ ] Admin modal: create a delivery order with auto-calculated fee → check DB
- [ ] Admin modal: create a delivery order with manual override fee → check DB
- [ ] Admin modal: create a pickup order → `delivery_fee = 0`
- [ ] Existing orders unaffected (all show `delivery_fee = 0`)
- [ ] PATCH an existing order with `delivery_fee` via the API → both `delivery_fee` and `total_amount` update correctly
- [ ] For a paid admin order, check `financial_transactions` table — the `amount` should match `computedTotal` (items + delivery fee)
