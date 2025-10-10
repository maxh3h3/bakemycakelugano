# 📊 Bake My Cake - Data Architecture

## Overview

Your bakery website uses **Sanity CMS** as the content layer with **3 separate document collections** that relate to each other.

---

## 🗂️ **Document Collections (Schemas)**

### **1. Categories** (`category`)
Independent collection for organizing products.

```typescript
Category {
  name: string              // "Cakes", "Cookies", etc.
  slug: slug                // URL-friendly: "cakes"
  description: text         // Optional description
  image: image              // Category thumbnail
  order: number             // Display order (lower = first)
}
```

**Purpose**: Group products into browsable categories (e.g., Cakes, Cookies, Pastries)

---

### **2. Products** (`product`)
Main product catalog with references to Categories and Flavours.

```typescript
Product {
  name: string              // "Unicorn Cake"
  slug: slug                // "unicorn-cake"
  description: text         // Product description
  price: number             // Base price in CHF
  minimumOrderQuantity: number  // MOQ (default: 1)
  
  // Size options (optional)
  sizes: array[{
    label: string           // "1 kg for 5-8 persons"
    value: string           // "1kg"
    priceModifier: number   // +25.00 CHF
  }]
  
  // Media
  images: array[image]      // Multiple product images
  
  // Relationships
  category: reference       // → Points to ONE Category
  availableFlavours: array[reference]  // → Points to MULTIPLE Flavours (NEW!)
  
  // Status
  available: boolean
  featured: boolean
  
  // Details (optional - can be in Flavours instead)
  ingredients: array[string]
  allergens: array[string]
}
```

**Purpose**: The actual products customers can buy

---

### **3. Flavours** (`flavour`) ✨ NEW!
Reusable flavour profiles that products can reference.

```typescript
Flavour {
  name: string              // "Chocolate", "Vanilla", "Strawberry"
  slug: slug                // "chocolate"
  description: text         // "Rich dark chocolate with hints of coffee"
  image: image              // Flavour photo
  ingredients: array[string]    // Specific to this flavour
  allergens: array[string]      // Specific to this flavour
  available: boolean        // Currently available?
  order: number             // Display order
}
```

**Purpose**: Define reusable flavours that multiple products can share

---

## 🔗 **Relationships**

```
┌──────────────┐
│  Categories  │
└──────┬───────┘
       │ 1
       │ has many
       │
       ▼ many
┌──────────────┐      many to many     ┌──────────────┐
│   Products   │◄────────────────────►│   Flavours   │
└──────────────┘                       └──────────────┘
```

- **Category → Products**: One-to-Many (one category has many products)
- **Product → Category**: Many-to-One (many products belong to one category)
- **Product → Flavours**: Many-to-Many (products can have multiple flavours, flavours can be used in multiple products)

---

## 💡 **Use Cases**

### **Scenario 1: Simple Product (No Flavours)**
A product that doesn't have flavour options:

```
Product: "Corporate Cookies"
  ├─ Category: Cookies
  ├─ Price: 10 CHF
  ├─ Ingredients: [flour, sugar, butter, eggs]
  ├─ Allergens: [gluten, dairy, eggs]
  └─ Available Flavours: [] (empty - no flavour selection)
```

**Customer Experience**: Just select size/quantity, no flavour choice.

---

### **Scenario 2: Product with Flavour Options**
A cake that comes in multiple flavours:

```
Product: "Birthday Cake"
  ├─ Category: Cakes
  ├─ Price: 80 CHF (base price)
  ├─ Sizes: [1kg, 1.5kg, 2kg]
  ├─ Available Flavours: [
  │     → Chocolate Flavour
  │     → Vanilla Flavour
  │     → Strawberry Flavour
  │   ]
  └─ Ingredients/Allergens: (defined in each Flavour)

Flavour: "Chocolate"
  ├─ Ingredients: [chocolate, cocoa, flour, sugar, eggs]
  ├─ Allergens: [gluten, dairy, eggs, soy]
  └─ Image: chocolate-cake.jpg

Flavour: "Vanilla"
  ├─ Ingredients: [vanilla, flour, sugar, eggs, milk]
  ├─ Allergens: [gluten, dairy, eggs]
  └─ Image: vanilla-cake.jpg
```

**Customer Experience**: 
1. Select product: "Birthday Cake"
2. Choose size: "1.5kg"
3. Choose flavour: "Chocolate"
4. Select quantity: 1
5. Pick delivery date

---

## 🎯 **Design Benefits**

### **Why Separate Collections?**

**✅ Reusability**
```
Chocolate Flavour can be used in:
  - Birthday Cake
  - Wedding Cake
  - Cupcakes
  - Layer Cake
  
Instead of duplicating ingredients/allergens in each product!
```

**✅ Easy Updates**
```
If you update "Chocolate Flavour" ingredients:
  → All products using that flavour are automatically updated
```

**✅ Flexibility**
```
Some products need flavours: ✅ Birthday Cakes
Some products don't: ✅ Corporate Cookies
```

**✅ Better Organization**
```
Owner can manage:
  - Products (what you sell)
  - Flavours (what variations exist)
  - Categories (how to organize them)
  
All in separate, clean sections of Sanity Studio
```

---

## 📝 **How to Use in Sanity Studio**

### **Step 1: Create Flavours**
1. Go to **Sanity Studio** → **Flavours**
2. Click **"Create"**
3. Add:
   - Name: "Chocolate"
   - Description: "Rich dark chocolate"
   - Image: Upload chocolate cake photo
   - Ingredients: Add each ingredient
   - Allergens: Add allergens
4. **Publish**

Repeat for: Vanilla, Strawberry, Lemon, etc.

---

### **Step 2: Create/Update Products**

When creating a product:
1. Fill in basic info (name, price, description)
2. Upload images
3. Select **Category** (e.g., "Cakes")
4. **Optional**: Select **Available Flavours**
   - Search for "Chocolate" → Add
   - Search for "Vanilla" → Add
   - Search for "Strawberry" → Add
5. If product has NO flavour options:
   - Leave **Available Flavours** empty
   - Fill in **Ingredients** and **Allergens** directly on the product

---

## 🖥️ **Frontend Implementation**

### **Current State** ✅
- ✅ Categories: Displayed on `/products` page
- ✅ Products: Grid view with sizes
- ✅ Product Detail: Size selector, quantity, date picker

### **Next Steps** (When Ready)
- 🔲 Add Flavour Selector to Product Detail page
- 🔲 Update cart to include selected flavour
- 🔲 Display flavour in order confirmation
- 🔲 Show allergens based on selected flavour

---

## 📦 **Files Created**

```
sanity/schemas/
  ├── category.ts        (existing)
  ├── product.ts         (updated - added availableFlavours field)
  ├── flavour.ts         (NEW!)
  └── index.ts           (updated - registered flavour)
```

---

## ✅ **Status**

```
✅ Flavours Schema: Created
✅ Registered in Sanity: Yes
✅ Product Reference: Added
✅ TypeScript: Passing
✅ Ready to Use: YES
```

---

## 🚀 **Try It Now**

1. **Restart Sanity Studio** (if running):
   ```bash
   # Studio should auto-reload, but if not:
   npm run dev
   ```

2. Go to: `http://localhost:3000/studio`

3. You'll now see:
   - 📁 **Categories**
   - 🎂 **Products**
   - 🎨 **Flavours** ← NEW!

4. Create some test flavours!

---

## 💭 **Design Decision: Why This Way?**

**Alternative 1**: Store flavours as strings in products
```
❌ Problem: Duplication, hard to update, no images
```

**Alternative 2**: Make flavours fixed options in code
```
❌ Problem: Not flexible, owner can't manage them
```

**✅ Our Solution**: Flavours as separate documents
```
✅ Owner can add/edit/remove flavours anytime
✅ Reusable across products
✅ Rich data (images, ingredients, allergens)
✅ Easy to maintain
```

---

**Your data architecture is now complete and scalable! 🎉**

