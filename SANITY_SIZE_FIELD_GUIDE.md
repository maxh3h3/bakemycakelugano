# 🎂 How to See and Use the Size Options Field in Sanity Studio

## ✅ The Field IS Properly Configured

The `sizes` field exists in the product schema at lines 45-91 in `sanity/schemas/product.ts`.

---

## 🔍 Why You Might Not See It

### **Reason 1: Studio Needs Refresh**
The Sanity Studio is cached in your browser. After schema changes, you need to hard refresh.

**Solution:**
1. Go to `/studio` in your browser
2. **Hard refresh the page**:
   - **Mac**: `Cmd + Shift + R`
   - **Windows/Linux**: `Ctrl + Shift + R`
3. Or clear browser cache and reload

---

### **Reason 2: Dev Server Needs Restart**
If you're running `npm run dev`, the Studio might not have picked up the schema changes.

**Solution:**
```bash
# Stop the dev server (Ctrl + C)
# Then restart:
npm run dev
```

---

### **Reason 3: Looking at Old Products**
If you're viewing a product created before the size field was added, it might not show up prominently.

**Solution:**
1. Create a **NEW** product
2. OR edit an existing product
3. Scroll down to find **"Size Options"**

---

## 📍 Where to Find the Size Options Field

When editing a product in Sanity Studio, scroll down. The field order is:

1. ✅ Product Name
2. ✅ Slug
3. ✅ Description
4. ✅ Price (base price in CHF)
5. ✅ Minimum Order Quantity (MOQ)
6. **✨ Size Options** ← HERE!
7. ✅ Product Images
8. ✅ Category
9. ✅ Available for Purchase
10. ✅ Featured Product
11. ✅ Ingredients
12. ✅ Allergens

---

## 🎨 How to Add Size Options

### **Step 1: Open Product**
Go to `/studio` → Products → Click any product (or create new)

### **Step 2: Find "Size Options" Field**
Scroll down until you see:
```
┌─────────────────────────────────┐
│ Size Options                     │
│                                  │
│ Available sizes for this product │
│ (e.g., for cakes). Leave empty  │
│ if product has no size           │
│ variations.                      │
│                                  │
│ [+ Add item]                     │
└─────────────────────────────────┘
```

### **Step 3: Click "+ Add item"**

### **Step 4: Fill in the Size Details**

You'll see three fields:

```
┌─────────────────────────────────┐
│ Size Label                       │
│ ┌─────────────────────────────┐ │
│ │ 1 kg for 5-8 persons        │ │
│ └─────────────────────────────┘ │
│ What customer sees               │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│ Size Value                       │
│ ┌─────────────────────────────┐ │
│ │ 1kg                         │ │
│ └─────────────────────────────┘ │
│ Internal identifier              │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│ Price Adjustment (CHF)           │
│ ┌─────────────────────────────┐ │
│ │ 0                           │ │
│ └─────────────────────────────┘ │
│ Amount to add to base price      │
└─────────────────────────────────┘
```

### **Step 5: Add Multiple Sizes**

Example for a wedding cake:

**Size 1 (Base):**
- Label: `1 kg for 5-8 persons`
- Value: `1kg`
- Price Adjustment: `0`

**Size 2:**
- Label: `1.5 kg for 8-12 persons`
- Value: `1.5kg`
- Price Adjustment: `25`

**Size 3:**
- Label: `2 kg for 12-16 persons`
- Value: `2kg`
- Price Adjustment: `50`

**Size 4:**
- Label: `3 kg for 20-25 persons`
- Value: `3kg`
- Price Adjustment: `100`

### **Step 6: Save**
Click **"Publish"** at the bottom

---

## 👁️ Preview in Studio

After adding sizes, you'll see a nice preview in the array:

```
┌────────────────────────────────────┐
│ Size Options                        │
├────────────────────────────────────┤
│ ☰ 1 kg for 5-8 persons             │
│   Base price                        │
├────────────────────────────────────┤
│ ☰ 1.5 kg for 8-12 persons          │
│   +25 CHF                           │
├────────────────────────────────────┤
│ ☰ 2 kg for 12-16 persons           │
│   +50 CHF                           │
└────────────────────────────────────┘
```

---

## 🧪 Quick Test

### **Step 1: Create Test Product**
1. Go to `/studio`
2. Click **"Products"** in sidebar
3. Click **"+ Create" → "Product"**
4. Fill in basic info (name, description, price, image, category)
5. Scroll to **"Size Options"**
6. Click **"+ Add item"**
7. Add one size with any values
8. Publish

### **Step 2: Check Frontend**
1. Go to `/products` on your website
2. Click the product you just created
3. You should see a **"Size"** dropdown!

---

## 🚨 Still Not Seeing It?

### **Option A: Verify Schema is Deployed**

1. Stop dev server: `Ctrl + C`
2. Clear Next.js cache:
   ```bash
   rm -rf .next
   ```
3. Restart:
   ```bash
   npm run dev
   ```
4. Hard refresh browser: `Cmd + Shift + R` (Mac) or `Ctrl + Shift + R` (Windows)
5. Go to `/studio`

### **Option B: Check Browser Console**

1. Open `/studio` in browser
2. Open Developer Tools (F12 or Right-click → Inspect)
3. Check **Console** tab for any errors
4. If you see schema errors, share them with me!

### **Option C: Verify in Code**

Run this to confirm the schema is correct:
```bash
npm run type-check
```

Should show no errors ✅

---

## 📸 What It Looks Like on Frontend

When a customer views a product with sizes:

```
┌─────────────────────────────────────┐
│ Chocolate Wedding Cake              │
│                                     │
│ CHF 45.00  (1 kg for 5-8 persons)  │
│                                     │
│ ┌─────────────────────────────────┐│
│ │ Size *                          ││
│ │ ┌─────────────────────────────┐││
│ │ │ Select Size ▼               │││
│ │ └─────────────────────────────┘││
│ └─────────────────────────────────┘│
│                                     │
│ Options:                            │
│ • 1 kg for 5-8 persons — CHF 45.00 │
│ • 1.5 kg — CHF 70.00 (+CHF 25.00)  │
│ • 2 kg — CHF 95.00 (+CHF 50.00)    │
└─────────────────────────────────────┘
```

---

## 🎯 When to Use Size Options

### **Use For:**
- ✅ Cakes (different weights/sizes)
- ✅ Tarts (different diameters)
- ✅ Tiered cakes (2-tier, 3-tier, etc.)
- ✅ Bread loaves (small, medium, large)

### **Leave Empty For:**
- ❌ Cookies (sold by quantity, use MOQ instead)
- ❌ Individual pastries
- ❌ Pre-packaged items
- ❌ Custom orders (handle sizes differently)

---

## ✅ Summary

**Yes, the owner/admin inputs sizes in Sanity Studio!**

The field is there, you just need to:
1. Hard refresh the Studio page (`Cmd/Ctrl + Shift + R`)
2. Or restart the dev server
3. Scroll down in the product editor to find "Size Options"
4. Click "+ Add item" to start adding sizes

**The field is OPTIONAL** - only add sizes for products that need them (like cakes). Leave it empty for products sold as single items!

---

**Need help?** Let me know if you still don't see it after refreshing! 🎂

