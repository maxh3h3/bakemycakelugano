# Size Options - Implementation Guide

## 📊 Data Structure

### **Sanity Schema**
```typescript
sizes: [
  {
    label: "1 kg for 5-8 persons",      // What customer sees
    value: "1kg",                       // Internal identifier
    priceModifier: 0                    // CHF to add to base price
  },
  {
    label: "1.5 kg for 8-12 persons",
    value: "1.5kg",
    priceModifier: 25                   // +25 CHF
  },
  {
    label: "2 kg for 12-16 persons",
    value: "2kg",
    priceModifier: 50                   // +50 CHF
  }
]
```

---

## ✨ Features

### **1. Flexible per Product**
- Each product can have its own size options
- Optional field - leave empty for products without sizes
- Perfect for cakes, tarts, or any variable-sized items

### **2. Custom Labels**
- Owner writes exactly what customers see
- Can include serving suggestions: "1 kg for 5-8 persons"
- Multilingual support (owner can translate in Sanity later)

### **3. Price Modifiers**
- **Base size**: `priceModifier: 0`
- **Larger sizes**: `priceModifier: 25` (adds 25 CHF)
- Flexible pricing without changing base price

---

## 🎨 Owner Experience (Sanity Studio)

### **Adding Sizes to a Product:**

1. Go to Product in Studio
2. Scroll to "Size Options"
3. Click "+ Add Item"
4. Fill in:
   - **Size Label**: "1 kg for 5-8 persons"
   - **Size Value**: "1kg"
   - **Price Adjustment**: 0 (for base size)
5. Add more sizes as needed
6. Publish!

### **Studio Preview:**
```
✓ 1 kg for 5-8 persons
  Base price

✓ 1.5 kg for 8-12 persons
  +25 CHF

✓ 2 kg for 12-16 persons
  +50 CHF
```

---

## 💻 Frontend Implementation (Next Steps)

### **Product Card (if sizes exist):**
```tsx
{product.sizes && product.sizes.length > 0 && (
  <select>
    <option disabled>--- Please Select ---</option>
    {product.sizes.map(size => (
      <option value={size.value}>
        {size.label} 
        {size.priceModifier > 0 && ` (+${size.priceModifier} CHF)`}
      </option>
    ))}
  </select>
)}
```

### **Price Calculation:**
```tsx
const selectedSize = product.sizes?.find(s => s.value === selectedValue);
const finalPrice = product.price + (selectedSize?.priceModifier || 0);
```

---

## 📋 Example Use Cases

### **Cake with Sizes:**
```json
{
  "name": "Chocolate Cake",
  "price": 45.00,
  "sizes": [
    {
      "label": "1 kg for 5-8 persons",
      "value": "1kg",
      "priceModifier": 0
    },
    {
      "label": "1.5 kg for 8-12 persons",
      "value": "1.5kg",
      "priceModifier": 25
    },
    {
      "label": "2 kg for 12-16 persons",
      "value": "2kg",
      "priceModifier": 50
    }
  ]
}
```

**Customer sees:**
- Base: CHF 45.00 (1 kg)
- Medium: CHF 70.00 (1.5 kg)
- Large: CHF 95.00 (2 kg)

### **Cookie without Sizes:**
```json
{
  "name": "Chocolate Chip Cookies",
  "price": 12.00,
  "sizes": []  // or undefined
}
```

**Customer sees:** Just CHF 12.00, no dropdown

---

## 🔄 Cart Integration

### **Add to Cart:**
```typescript
addToCart({
  product: product,
  selectedSize: "1.5kg",  // Store selected size
  quantity: 1
})
```

### **Cart Display:**
```
Chocolate Cake (1.5 kg for 8-12 persons)
CHF 70.00
```

---

## ✅ Validation Rules

### **In Sanity:**
- `label`: Required, string
- `value`: Required, string (unique per product)
- `priceModifier`: Required, number ≥ 0

### **In Frontend:**
- If sizes exist → force selection before "Add to Cart"
- Default to first size or show "Please Select"
- Validate selection exists before adding to cart

---

## 🚀 Benefits of This Structure

1. **Flexible** - Works for any product type
2. **Optional** - Only use when needed
3. **Owner-friendly** - Easy to add/edit in Studio
4. **Customer-clear** - Shows exact options and pricing
5. **Scalable** - Can add unlimited sizes
6. **Precise** - Custom labels for each product
7. **Multilingual-ready** - Labels can be localized later

---

## 📝 Database Fields

### **Product Type:**
```typescript
interface ProductSize {
  label: string;           // "1 kg for 5-8 persons"
  value: string;           // "1kg"
  priceModifier: number;   // 0, 25, 50, etc.
}

interface Product {
  // ... other fields
  sizes?: ProductSize[];   // Optional array
}
```

---

## 🎯 Next Steps

1. ✅ Schema created
2. ✅ Types updated
3. ✅ Queries updated
4. ⏭️ Create size selector component
5. ⏭️ Update "Add to Cart" to handle sizes
6. ⏭️ Update cart to display selected size
7. ⏭️ Update checkout to include size info

---

**Status**: Schema complete, ready for UI implementation! 🎉

