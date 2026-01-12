# Drizzle ORM Setup & Payment Tracking Update

## Overview
This document explains the recent updates to the database schema and the integration of Drizzle ORM for type-safe database interactions.

## Changes Made

### 1. Removed `stripe_payment_status` Column
**Why**: Simplified payment tracking by using a boolean `paid` field instead of tracking Stripe-specific statuses.

**Migration**: `supabase/migrations/007_drop_stripe_payment_status.sql`
```sql
-- Ensures all successful stripe payments are marked as paid before dropping the column
UPDATE orders SET paid = true WHERE stripe_payment_status = 'succeeded';
ALTER TABLE orders DROP COLUMN stripe_payment_status;
```

**What changed**:
- ❌ Old: `stripe_payment_status` (string: 'pending', 'succeeded', 'failed')
- ✅ New: `paid` (boolean: true/false) + `payment_method` (string: 'cash', 'stripe', 'twint')

### 2. Made `stripe_session_id` Nullable
**Why**: Manual orders (phone, WhatsApp, walk-in) don't have a Stripe session.

**Updated**:
- `stripe_session_id` column is now nullable in the database
- TypeScript types updated to reflect this (`string | null`)

### 3. Integrated Drizzle ORM
**Why**: Type-safe database interactions and better schema visibility without running migrations through Drizzle.

**Files Added**:
- `drizzle.config.ts` - Drizzle configuration
- `lib/db/schema.ts` - TypeScript schema definition (matches database structure)

**How to use**:

```bash
# View database schema in Drizzle Studio (visual database browser)
npm run db:studio

# Pull latest schema from database
npm run db:introspect
```

**Important**: We do NOT run migrations through Drizzle. Migrations are handled manually via Supabase SQL Editor.

### 4. Updated Stripe Webhook
**File**: `app/api/webhooks/stripe/route.ts`

**Changes**:
```typescript
// OLD
stripe_payment_status: 'succeeded'

// NEW
paid: true,
payment_method: 'stripe',
channel: 'website'
```

**What this means**:
- All Stripe payments are automatically marked as `paid: true`
- Payment method is set to `'stripe'`
- Order channel is set to `'website'`

### 5. Updated Admin Orders Display
**File**: `components/admin/OrdersTable.tsx`

**Changes**:
- Removed display of `stripe_payment_status`
- Now shows: "✓ Paid (stripe)" or "Unpaid"
- Displays payment method when available

## Database Schema (Drizzle)

The Drizzle schema (`lib/db/schema.ts`) provides a TypeScript representation of your database:

```typescript
import { orders, orderItems, checkoutAttempts } from '@/lib/db/schema';
import type { Order, NewOrder, OrderItem } from '@/lib/db/schema';
```

### Key Tables:

**orders**:
- Customer info (name, email, phone, Instagram)
- Delivery details (date, type, address)
- Payment tracking (`paid`, `payment_method`)
- Order tracking (`order_number`, `channel`, `status`)
- Production fields (`allergy_notes`, `special_instructions`)

**order_items**:
- Product details (name, price, quantity, flavour, size)
- Production tracking (`production_status`, `decoration_notes`)
- Physical specs (`weight_kg`, `diameter_cm`)
- Timestamps (`started_at`, `completed_at`)

**checkout_attempts**:
- Analytics for abandoned carts
- Conversion tracking

## Supabase Types

The Supabase types file (`lib/supabase/types.ts`) has been updated to match the new schema:
- ✅ `stripe_session_id` is now nullable
- ✅ `stripe_payment_status` removed
- ✅ Added `paid`, `payment_method`, `channel`
- ✅ Added `order_number`, `allergy_notes`
- ✅ Added production tracking fields

## Migration Checklist

To apply these changes to your database:

1. **Run migration 006** (if not already run):
   ```sql
   -- In Supabase SQL Editor
   -- Run: supabase/migrations/006_fix_production_status_constraint.sql
   ```

2. **Run migration 007**:
   ```sql
   -- In Supabase SQL Editor
   -- Run: supabase/migrations/007_drop_stripe_payment_status.sql
   ```

3. **Verify**:
   - Orders table no longer has `stripe_payment_status`
   - All paid Stripe orders have `paid = true`
   - `stripe_session_id` is nullable

## Using Drizzle Studio

Drizzle Studio provides a visual interface to browse your database:

```bash
# Start Drizzle Studio
npm run db:studio
```

This opens a web interface where you can:
- View all tables and relationships
- Browse data
- See column types and constraints
- Understand the database structure

**Note**: You can't edit data through Drizzle Studio in this setup (read-only introspection).

## Environment Variables

Make sure you have `DATABASE_URL` in your `.env.local`:

```env
DATABASE_URL=postgresql://postgres:[password]@[host]:[port]/postgres
```

This is used by Drizzle for introspection (not for running migrations).

## Best Practices

1. **Schema Management**:
   - Write migrations manually in `supabase/migrations/`
   - Run them through Supabase SQL Editor
   - Update Drizzle schema (`lib/db/schema.ts`) to match
   - Run `npm run db:introspect` to verify

2. **Type Safety**:
   - Use Drizzle types for new code: `import type { Order } from '@/lib/db/schema'`
   - Keep Supabase types for existing code: `import type { Database } from '@/lib/supabase/types'`
   - Both are kept in sync manually

3. **Payment Tracking**:
   - Always set `paid: true` when payment is received
   - Set `payment_method` to 'cash', 'stripe', or 'twint'
   - Use `channel` to track order source

## Summary

✅ Simplified payment tracking (boolean `paid` instead of Stripe status)  
✅ Made Stripe fields optional (supports manual orders)  
✅ Integrated Drizzle for better type safety  
✅ Updated webhook to use new payment fields  
✅ Updated admin UI to display payment correctly  

Your database is now more flexible and easier to work with! 🎉

