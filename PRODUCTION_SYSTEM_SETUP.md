# 🍰 Production Tracking System - Setup Guide

## Overview

This document describes the production tracking system added to the Bake My Cake website to support kitchen workflow management for Owner, Cook, and Delivery staff.

---

## 📋 What's Been Done

### ✅ Database Migration (005_add_production_tracking.sql)

**Key Changes:**
1. **Denormalized `delivery_date`** - Added back to `order_items` table for fast queries
   - `orders.delivery_date` = Owner's planning view
   - `order_items.delivery_date` = Cook's production view (no joins!)

2. **Production Status Tracking** - Added to `order_items`:
   - `production_status`: new → prepared → baked → creamed → decorated → packaged → delivered
   - `decoration_notes`: Customer instructions ("Happy Birthday John")
   - `production_notes`: Internal staff notes
   - `started_at`, `completed_at`: Timing tracking
   - `weight_kg`, `diameter_cm`: Product specifications
   - `product_category`: For filtering (CAKES, PASTRIES, etc.)

3. **Enhanced Orders** - Added to `orders`:
   - `order_number`: Human-readable format (DD-MM-NN, e.g., "15-01-03")
   - `paid`: Simple boolean payment status
   - `payment_method`: cash, stripe, twint
   - `allergy_notes`: IMPORTANT dietary restrictions
   - `customer_ig_handle`: Instagram handle
   - `reference_photo_url`: For custom orders
   - `channel`: website, whatsapp, phone, walk_in, instagram, email

4. **Performance Indexes**:
   - Fast queries by delivery_date + production_status
   - Optimized for kitchen workflow

### ✅ Authentication System Updated

**Three Roles:**
- **Owner** - Full access (orders, analytics, settings)
- **Cook** - Production view only (kitchen workflow)
- **Delivery** - Delivery view only (addresses, routes)

**Implementation:**
- Extended `iron-session` (simple, no user database needed)
- Three environment variables for passwords
- Role-based session management
- Backward compatible with existing admin login

---

## 🔧 Setup Instructions

### Step 1: Run Database Migration

1. Go to **Supabase Dashboard** → **SQL Editor**
2. Click **New Query**
3. Copy entire contents of `supabase/migrations/005_add_production_tracking.sql`
4. Click **Run**
5. Verify success (should show "Success. No rows returned")

### Step 2: Add Environment Variables

Add to `.env.local`:

```env
# Three role-based passwords (choose your own)
OWNER_PASSWORD=your_owner_password_here
COOK_PASSWORD=your_cook_password_here
DELIVERY_PASSWORD=your_delivery_password_here

# Legacy support (optional, maps to OWNER_PASSWORD)
ADMIN_PASSWORD=your_owner_password_here
```

**Important:** Keep these passwords secure and different from each other!

### Step 3: Test the Migration

Run these queries in Supabase SQL Editor to verify:

```sql
-- Check order_items columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'order_items' 
  AND column_name IN ('delivery_date', 'production_status', 'decoration_notes');

-- Check orders columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'orders' 
  AND column_name IN ('order_number', 'paid', 'allergy_notes');

-- Check order numbers were generated
SELECT order_number, delivery_date, customer_name 
FROM orders 
WHERE order_number IS NOT NULL 
LIMIT 5;
```

---

## 📱 What's Next - Production Page

### Phase 2: Create `/admin/production` Page

**For Kitchen Staff (Cook Role):**

**Features:**
```
┌─────────────────────────────────────────────┐
│  🍰 Production Board - Today (Jan 15)       │
│  ┌─────────┬─────────┬─────────┬─────────┐ │
│  │   NEW   │ PREPARED│  BAKED  │ CREAMED │ │
│  ├─────────┼─────────┼─────────┼─────────┤ │
│  │ 🎂 2x   │ 🧁 1x   │ 🍰 1x   │ 🎨 1x   │ │
│  │ Choc    │ Vanilla │ Red     │ Birthday│ │
│  │ Cake    │ Cupcake │ Velvet  │ Cake    │ │
│  │ ⚠️ NO   │ #15-01-2│ #15-01-1│ "Happy  │ │
│  │  NUTS!  │         │         │  John"  │ │
│  │ #15-01-3│         │         │ #15-01-4│ │
│  └─────────┴─────────┴─────────┴─────────┘ │
└─────────────────────────────────────────────┘
```

**Key UI Elements:**
- **Kanban columns** for each status
- **Item cards** (not order cards!)
- **Drag & drop** or click to change status
- **Allergy warnings** prominent in red
- **Decoration notes** visible
- **No prices** shown (cook doesn't need to see money)
- **Filter by category**: All / Cakes / Pastries / Bread
- **Filter by date**: Today / Tomorrow / This Week
- **Mobile-friendly** for tablets in kitchen

**Query** (super fast, no joins):
```sql
SELECT * FROM order_items 
WHERE delivery_date = '2026-01-15'
  AND production_status != 'delivered'
  AND production_status != 'cancelled'
ORDER BY delivery_date, created_at;
```

### Phase 3: Navigation & Role-Based Access

**Update AdminHeader.tsx:**
```typescript
// Show different nav based on role
const role = getUserRole(); // from session

{role === 'owner' && (
  <>
    <Link href="/admin/orders">Orders</Link>
    <Link href="/admin/production">Production</Link>
    <Link href="/admin/deliveries">Deliveries</Link>
    <Link href="/admin/analytics">Analytics</Link>
  </>
)}

{role === 'cook' && (
  <Link href="/admin/production">Production</Link>
)}

{role === 'delivery' && (
  <Link href="/admin/deliveries">Deliveries</Link>
)}
```

---

## 🎯 Architecture Overview

### Data Flow

```
┌─────────────────┐
│  E-Commerce     │
│  Checkout       │
│  (Stripe)       │
└────────┬────────┘
         │ Creates
         ▼
┌─────────────────┐
│     ORDERS      │  ← Owner views (financial)
│  delivery_date  │
│  paid: true     │
│  total_amount   │
└────────┬────────┘
         │ Has many
         ▼
┌─────────────────┐
│  ORDER_ITEMS    │  ← Cook views (production)
│  delivery_date  │  ← Denormalized!
│  production_    │
│    status: new  │
│  decoration_    │
│    notes        │
└─────────────────┘
```

### Why Denormalize delivery_date?

**Before (with joins - slow):**
```sql
-- Cook wants to see today's items
SELECT oi.* 
FROM order_items oi
JOIN orders o ON o.id = oi.order_id
WHERE o.delivery_date = TODAY;
-- ❌ Slow: requires join
-- ❌ Complex: two tables
```

**After (no joins - fast):**
```sql
-- Cook wants to see today's items  
SELECT * FROM order_items
WHERE delivery_date = TODAY;
-- ✅ Fast: single table
-- ✅ Simple: direct query
```

---

## 🔐 Authentication Flow

### Login Process

```typescript
// User selects role from dropdown
<select value={role}>
  <option value="owner">Owner</option>
  <option value="cook">Cook</option>
  <option value="delivery">Delivery</option>
</select>

// Enter password
<input type="password" value={password} />

// POST /api/admin/login
{
  role: "cook",
  password: "cook_password",
  rememberMe: true
}

// Creates iron-session with role
session = {
  isLoggedIn: true,
  role: "cook",
  expiresAt: ...
}

// Redirect based on role
if (role === 'cook') redirect('/admin/production')
if (role === 'owner') redirect('/admin/orders')
```

---

## 📊 Database Schema Reference

### Order Items (Production View)

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `order_id` | UUID | Foreign key to orders |
| `product_name` | TEXT | Product name |
| `quantity` | INT | Quantity ordered |
| `delivery_date` | DATE | **Denormalized** delivery date |
| `production_status` | TEXT | new, prepared, baked, creamed, decorated, packaged, delivered, cancelled |
| `decoration_notes` | TEXT | Customer instructions |
| `production_notes` | TEXT | Internal staff notes |
| `weight_kg` | DECIMAL | Weight in kg (optional) |
| `diameter_cm` | DECIMAL | Diameter in cm (optional) |
| `product_category` | TEXT | CAKES, PASTRIES, BREAD, etc. |
| `started_at` | TIMESTAMP | When production started |
| `completed_at` | TIMESTAMP | When production finished |

### Orders (Financial View)

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `order_number` | TEXT | DD-MM-NN format |
| `customer_name` | TEXT | Customer name |
| `customer_phone` | TEXT | Phone number |
| `customer_ig_handle` | TEXT | Instagram handle |
| `delivery_date` | DATE | Delivery/pickup date |
| `total_amount` | DECIMAL | Order total |
| `paid` | BOOLEAN | Payment status |
| `payment_method` | TEXT | cash, stripe, twint |
| `allergy_notes` | TEXT | **IMPORTANT** dietary restrictions |
| `special_instructions` | TEXT | General notes |
| `reference_photo_url` | TEXT | Custom order photo |
| `channel` | TEXT | website, whatsapp, phone, etc. |

---

## 🚀 Next Steps

### Immediate (Phase 2)
- [ ] Create `/admin/production/page.tsx` - Kanban board
- [ ] Create `/admin/production/api` - Update item status endpoint
- [ ] Update `AdminHeader.tsx` - Role-based navigation
- [ ] Test with cook account

### Future (Phase 3)
- [ ] Create `/admin/deliveries/page.tsx` - Delivery driver view
- [ ] Add drag-and-drop status updates
- [ ] Add real-time updates (Supabase Realtime)
- [ ] Mobile optimization for kitchen tablets
- [ ] WhatsApp order intake (screenshot → AI extraction)

---

## 🐛 Troubleshooting

### Migration fails with "column already exists"
- ✅ Safe! The migration uses `IF NOT EXISTS`
- Just means the column was already added
- Migration will skip and continue

### Can't login with new roles
- Check `.env.local` has all three passwords
- Restart dev server (`npm run dev`)
- Clear cookies and try again

### Order numbers not generated
- Check delivery_date is set on orders
- Run the order number generation function manually:
```sql
SELECT generate_order_number(delivery_date) 
FROM orders 
WHERE order_number IS NULL;
```

---

## 📝 Files Modified

### Migration
- `supabase/migrations/005_add_production_tracking.sql` ← **Run this first!**

### Authentication
- `lib/auth/session.ts` ← Role-based sessions
- `app/api/admin/login/route.ts` ← Role-based login

### Documentation
- `PRODUCTION_SYSTEM_SETUP.md` ← This file!

### Next to Create
- `app/[locale]/admin/production/page.tsx` ← Kanban board
- `app/api/admin/production/status/route.ts` ← Update status API

---

## 🎉 Benefits

### For Owner
- ✅ Full financial overview
- ✅ Order management
- ✅ Analytics & reporting
- ✅ Customer data access

### For Cook
- ✅ Clean production board
- ✅ No financial distractions
- ✅ Fast queries (no joins!)
- ✅ Allergy warnings prominent
- ✅ Clear workflow status

### For Delivery
- ✅ Addresses & routes only
- ✅ Delivery status tracking
- ✅ Customer contact info

---

**Ready to build the production page? Let me know when you're ready for Phase 2!** 🚀

