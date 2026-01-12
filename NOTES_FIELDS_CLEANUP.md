# Notes & Instructions Fields - Cleanup Summary

## ✅ Changes Completed

### 1. **Removed Allergy Fields** (Admin Side Only)
- Removed `allergy_notes` from orders table
- Removed `reference_photo_url` from orders table  
- Removed all allergy warnings from admin UI components:
  - OrdersTable
  - OrderItemsModal
  - ProductionView
  - OrdersViewTabs (quick filters)
  - CreateOrderModal

**Why**: Allergy handling should be on the customer-facing e-commerce side, not admin side.

### 2. **Renamed Fields for Clarity**

**Orders Table:**
- `special_instructions` → `customer_notes`
  - Purpose: Customer delivery/pickup requests
  - Example: "Call when arrived", "Leave at door"

**Order Items Table:**
- `decoration_notes` → `internal_decoration_notes`
  - Purpose: Internal staff notes about decoration
  - Who adds: Kitchen staff
  
- `production_notes` → `staff_notes`
  - Purpose: General internal notes during production
  - Who adds: Kitchen staff

- **NEW**: `writing_on_cake`
  - Purpose: Text customer wants written on cake
  - Who adds: **Customer** (on product page)
  - Example: "Happy Birthday John"

### 3. **Updated All Components**

✅ Drizzle schema (`lib/db/schema.ts`)  
✅ Supabase types (`lib/supabase/types.ts`)  
✅ Stripe webhook (`app/api/webhooks/stripe/route.ts`)  
✅ Create Order Modal (`components/admin/CreateOrderModal.tsx`)  
✅ Order Items Modal (`components/admin/OrderItemsModal.tsx`)  
✅ Orders Table (`components/admin/OrdersTable.tsx`)  
✅ Production View (`components/admin/ProductionView.tsx`)  
✅ Orders View Tabs (`components/admin/OrdersViewTabs.tsx`)  
✅ Create Order API (`app/api/admin/orders/create/route.ts`)  

---

## 🚧 Still TODO: Customer-Facing Product Page

### Task: Add "Writing on Cake" Input

**Where**: Product detail page (customer-facing e-commerce)

**What to add**:
1. Text input field on product page
2. Label: "What would you like written on the cake?" (optional)
3. Placeholder: e.g., "Happy Birthday John"
4. Save to cart item metadata
5. Pass through Stripe checkout metadata
6. Save to `order_items.writing_on_cake` in webhook

**Files to update**:
1. **Product page component** - Add input field
2. **Cart context/state** - Store `writingOnCake` per item
3. **Checkout API** - Pass `writingOnCake` in Stripe metadata
4. **Webhook** - Save `writing_on_cake` when creating order_items

---

## 📋 Final Field Structure

### ORDERS Table (Order-Level):
```sql
customer_notes TEXT  -- Delivery/pickup instructions from customer
```

### ORDER_ITEMS Table (Item-Level):
```sql
writing_on_cake TEXT               -- Customer input: text to write on cake
internal_decoration_notes TEXT     -- Staff notes about decoration
staff_notes TEXT                   -- General staff notes during production
```

---

## 🗄️ Migration Required

**Run this migration in Supabase SQL Editor**:
```sql
-- File: supabase/migrations/008_simplify_notes_fields.sql
```

This migration:
1. Drops `allergy_notes` and `reference_photo_url` from orders
2. Renames `special_instructions` → `customer_notes`
3. Adds `writing_on_cake` to order_items
4. Renames `decoration_notes` → `internal_decoration_notes`
5. Renames `production_notes` → `staff_notes`

---

## ✨ Benefits

### Before (Confusing):
```
special_instructions  ← What's "special"?
allergy_notes        ← Just "notes"? Critical safety info buried
decoration_notes     ← Customer input or internal?
production_notes     ← When to use vs decoration?
```

### After (Clear):
```
customer_notes             ← Customer's delivery requests
writing_on_cake            ← Customer wants this text on cake
internal_decoration_notes  ← Staff decoration notes
staff_notes                ← General staff production notes
```

**Result**: Clear separation between:
- Customer inputs (`customer_notes`, `writing_on_cake`)
- Internal staff notes (`internal_decoration_notes`, `staff_notes`)

---

## 🔍 Next Steps

1. **Run migration 008** in Supabase SQL Editor
2. **Add `writing_on_cake` input** to product detail page (customer-facing)
3. **Update cart logic** to store writing per item
4. **Update checkout** to pass writing in Stripe metadata
5. **Test end-to-end** flow: customer order → webhook → admin display

---

## 💡 Example Flow

**Customer Journey**:
1. Browses product (e.g., "Vanilla Birthday Cake")
2. Selects size, flavour
3. **NEW**: Enters "Happy Birthday Sarah!" in "Writing on Cake" field
4. Adds to cart
5. Checks out via Stripe
6. Webhook saves order with `writing_on_cake: "Happy Birthday Sarah!"`

**Kitchen Staff**:
1. Opens Production page
2. Clicks order → sees item
3. Sees **Writing on Cake**: "Happy Birthday Sarah!" (prominent, large text)
4. Can add **Internal Decoration Notes**: "Used purple frosting, added stars"
5. Can add **Staff Notes**: "Customer called, wants extra sprinkles"

Clean, clear, and no confusion! 🎉

