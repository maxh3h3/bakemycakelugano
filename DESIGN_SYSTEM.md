# 🎨 Design System - Bake My Cake

Quick reference for all design tokens and component specs.

---

## 🎨 **Color Palette**

### **Primary Colors**
```css
--cream-50:  #FDFCFB  /* Main background */
--cream-100: #F9F6F1  /* Card backgrounds */
--cream-200: #F5E6D3  /* Subtle accents */

--brown-500: #8B6B47  /* Primary brand color */
--brown-600: #6F5438  /* Hover states */
--brown-700: #533D29  /* Dark accents */

--rose-200:  #FFD4D4  /* Playful accents */
--rose-300:  #FFB5B5  /* Hover states */

--charcoal-900: #2C2C2C  /* Text color */
```

### **Semantic Colors**
```css
--success: #10B981  /* Available, in stock */
--warning: #F59E0B  /* Low stock */
--error:   #EF4444  /* Out of stock */
```

---

## 📏 **Spacing Scale**

```css
--space-1:  4px
--space-2:  8px
--space-3:  12px
--space-4:  16px   /* Base unit */
--space-6:  24px
--space-8:  32px   /* Section padding */
--space-12: 48px
--space-16: 64px   /* Large gaps */
```

---

## ✏️ **Typography**

### **Font Families**
```css
--font-heading: 'Playfair Display', serif;
--font-body:    'Inter', sans-serif;
```

### **Font Sizes**
```css
--text-xs:   0.75rem  /* 12px - Small labels */
--text-sm:   0.875rem /* 14px - Body small */
--text-base: 1rem     /* 16px - Body */
--text-lg:   1.125rem /* 18px - Large body */
--text-xl:   1.25rem  /* 20px - Small heading */
--text-2xl:  1.5rem   /* 24px - H3 */
--text-3xl:  1.875rem /* 30px - H2 */
--text-4xl:  2.25rem  /* 36px - H1 */
--text-5xl:  3rem     /* 48px - Hero */
```

### **Font Weights**
```css
--weight-normal: 400
--weight-medium: 500
--weight-semibold: 600
--weight-bold: 700
```

---

## 🔲 **Border Radius**

```css
--radius-sm:  4px   /* Small elements */
--radius-md:  8px   /* Buttons, inputs */
--radius-lg:  16px  /* Cards */
--radius-xl:  24px  /* Pill buttons */
--radius-full: 9999px /* Circular */
```

---

## 🌑 **Shadows**

```css
/* Subtle card shadow */
--shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);

/* Default card shadow */
--shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);

/* Hover state */
--shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);

/* Modal overlay */
--shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
```

---

## 🎬 **Animations**

### **Duration**
```css
--duration-fast: 150ms
--duration-normal: 200ms
--duration-slow: 300ms
```

### **Easing**
```css
--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1)
--ease-out: cubic-bezier(0.0, 0, 0.2, 1)
--ease-spring: cubic-bezier(0.68, -0.55, 0.265, 1.55)
```

---

## 🖼️ **Image Specs**

### **Product Images**
- **Aspect Ratio**: 1:1 (square)
- **Upload Size**: 800x800px
- **Display Size**: 400x400px (desktop), 300x300px (mobile)
- **Format**: JPEG/PNG → WebP (Sanity auto-converts)
- **Quality**: 85%

### **Category Images**
- **Aspect Ratio**: 1:1
- **Upload Size**: 600x600px
- **Display Size**: 300x300px (desktop), 200x200px (mobile)

### **Hero Banners**
- **Desktop**: 1920x800px (2.4:1)
- **Mobile**: 768x600px (responsive crop)
- **Quality**: 90%

---

## 🔘 **Buttons**

### **Primary Button**
```css
Background: brown-500
Text: cream-50
Height: 48px
Padding: 16px 32px
Radius: 24px (pill)
Hover: brown-600 + shadow-lg
```

### **Secondary Button**
```css
Background: transparent
Border: 2px solid brown-500
Text: brown-500
Height: 48px
Hover: brown-50 background
```

### **Text Button**
```css
Background: transparent
Text: brown-500
Underline on hover
```

---

## 📱 **Breakpoints**

```css
--mobile:  < 640px
--tablet:  640px - 1023px
--desktop: 1024px - 1279px
--wide:    1280px+
```

### **Grid Columns**
```css
Mobile:  2 columns
Tablet:  3 columns
Desktop: 4 columns
```

---

## 🎴 **Component Specs**

### **Product Card**
```
Width: Fluid (grid)
Aspect Ratio: 1:1 (image)
Padding: 16px
Background: white
Radius: 16px
Shadow: shadow-sm
Hover: translateY(-4px) + shadow-lg
```

### **Navigation Bar**
```
Height: 80px
Background: white (transparent → white on scroll)
Shadow: shadow-sm (when scrolled)
Padding: 0 32px
Position: sticky
```

### **Hero Section**
```
Height: 600px (desktop), 400px (mobile)
Background: Full-width image
Overlay: Linear gradient (bottom)
```

---

## ✨ **Micro-interactions**

### **Add to Cart**
1. Button: "Aggiungi" → "✓ Aggiunto"
2. Cart badge: Shake animation
3. Duration: 200ms
4. Reset after: 2 seconds

### **Card Hover**
1. Lift: translateY(-4px)
2. Shadow: shadow-md → shadow-lg
3. Image: scale(1.05)
4. Duration: 200ms
5. Easing: ease-out

### **Page Transition**
1. Fade out current: 150ms
2. Fade in new: 150ms
3. Total: 300ms

---

## 🎯 **Accessibility**

### **Touch Targets**
- Minimum: 44x44px
- Buttons: 48px height
- Spacing between: 8px minimum

### **Contrast Ratios**
- Normal text: 4.5:1 minimum
- Large text: 3:1 minimum
- Interactive elements: 3:1 minimum

### **Focus States**
```css
outline: 2px solid brown-500
outline-offset: 2px
```

---

## 📐 **Layout Containers**

### **Max Widths**
```css
--container-sm: 640px   /* Forms */
--container-md: 768px   /* Content */
--container-lg: 1024px  /* Main content */
--container-xl: 1280px  /* Full layout */
```

### **Grid Gap**
```css
Mobile:  16px
Tablet:  24px
Desktop: 32px
```

---

## 🎨 **Quick Reference: Common Patterns**

### **Card with Image**
```tsx
<div className="bg-white rounded-lg shadow-sm overflow-hidden">
  <img className="w-full aspect-square object-cover" />
  <div className="p-4">
    <h3 className="font-heading text-xl">Product Name</h3>
    <p className="font-bold text-brown-600">€45.00</p>
  </div>
</div>
```

### **Pill Button**
```tsx
<button className="bg-brown-500 text-cream-50 px-8 py-3 rounded-full hover:bg-brown-600 transition-all duration-200">
  Scopri di Più
</button>
```

### **Category Pill**
```tsx
<button className="bg-cream-200 text-charcoal-900 px-6 py-2 rounded-full hover:bg-rose-100 transition-colors duration-150">
  Torte
</button>
```

---

**This is our single source of truth for all design decisions!** 🎨

