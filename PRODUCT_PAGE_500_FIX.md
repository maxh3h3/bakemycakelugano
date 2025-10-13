# Product Page 500 Error - Fix Summary

## 🐛 **The Problem**

Product pages were returning **500 Internal Server Error** in production on Railway:
- ❌ `https://bakemycakelugano.ch/en/products/torta-di-carota` → 500 error
- ✅ `https://bakemycakelugano.ch/en/products` → Works fine
- ✅ Localhost with production Sanity database → Works fine

## 🔍 **Root Cause**

The issue was in `app/[locale]/products/[slug]/page.tsx`:

### **Incorrect generateStaticParams()**
```typescript
// ❌ WRONG - Only returned slug
export async function generateStaticParams() {
  const products = await getProducts();
  return products.map((product: Product) => ({
    slug: product.slug.current,  // Missing locale!
  }));
}
```

### **Why This Failed in Production:**

The route path is `/[locale]/products/[slug]/page.tsx` which has **TWO dynamic segments**:
1. `[locale]` - from parent route
2. `[slug]` - from this route

In Next.js 15, when using `generateStaticParams()` in a nested dynamic route, you **MUST return ALL dynamic segments** in the path, not just the current one.

Since we only returned `slug`, Next.js couldn't properly generate the static pages during build, causing it to fail when accessed in production.

## ✅ **The Fix**

### **1. Fixed generateStaticParams() to include both locale and slug:**

```typescript
// ✅ CORRECT - Returns both locale and slug
export async function generateStaticParams() {
  try {
    const products = await getProducts();
    
    // Generate all combinations of locale + slug
    const params = locales.flatMap((locale) =>
      products.map((product: Product) => ({
        locale,  // Added locale!
        slug: product.slug.current,
      }))
    );
    
    console.log(`✅ Generated ${params.length} static product pages`);
    return params;
  } catch (error) {
    console.error('❌ Error generating static params:', error);
    return [];
  }
}
```

### **2. Added dynamicParams export:**

```typescript
// Enable dynamic rendering for slugs not in static params
export const dynamicParams = true;
```

This allows new products to be rendered dynamically even if they weren't in the build.

### **3. Added setRequestLocale for next-intl:**

```typescript
export default async function ProductPage({ params }: ProductPageProps) {
  const { locale, slug } = await params;
  
  // Enable static rendering for next-intl
  setRequestLocale(locale);
  
  // ... rest of code
}
```

### **4. Improved Sanity Client Configuration:**

Disabled CDN in `lib/sanity/client.ts` and `sanity/lib/client.ts`:

```typescript
// More reliable for production
useCdn: false,
```

Added validation and error handling:

```typescript
if (!projectId) {
  console.error('❌ Missing NEXT_PUBLIC_SANITY_PROJECT_ID');
  throw new Error('Missing required Sanity configuration');
}
```

### **5. Added Error Handling in Queries:**

```typescript
export async function getProductBySlug(slug: string) {
  try {
    const result = await client.fetch(query, { slug });
    if (!result) {
      console.warn(`⚠️ Product not found for slug: ${slug}`);
    }
    return result;
  } catch (error) {
    console.error('❌ Error fetching product by slug:', error);
    throw error;
  }
}
```

## 📊 **Build Output (After Fix)**

```bash
✅ Generated 4 static product pages (2 products × 2 locales)

Route (app)                                     Size
├ ● /[locale]/products/[slug]                5.98 kB
├   ├ /it/products/torta-di-carota            ✅
├   ├ /it/products/cheesecake-san-sebastian   ✅
├   ├ /en/products/torta-di-carota            ✅
├   └ /en/products/cheesecake-san-sebastian   ✅
```

## 🚀 **Deployment Steps**

1. **Commit and push the changes:**
   ```bash
   git add .
   git commit -m "fix: Product page 500 error - include locale in generateStaticParams"
   git push origin main
   ```

2. **Railway will automatically redeploy**

3. **Verify the fix:**
   - ✅ Visit: `https://bakemycakelugano.ch/en/products/torta-di-carota`
   - ✅ Visit: `https://bakemycakelugano.ch/it/products/torta-di-carota`
   - Should now load correctly!

## 🔑 **Key Takeaways**

1. **Nested Dynamic Routes:** When you have `/[param1]/something/[param2]`, `generateStaticParams()` must return BOTH `param1` and `param2`

2. **Next.js 15 Behavior:** More strict about static generation requirements

3. **Environment Variables:** Not the issue here, but good to validate them anyway

4. **CDN:** Disabling Sanity CDN can provide more reliable production performance

## 📝 **Files Modified**

- ✅ `app/[locale]/products/[slug]/page.tsx` - Fixed generateStaticParams
- ✅ `lib/sanity/client.ts` - Disabled CDN, added validation
- ✅ `sanity/lib/client.ts` - Disabled CDN, added validation  
- ✅ `lib/sanity/queries.ts` - Added error handling

---

**Date Fixed:** October 13, 2025  
**Status:** Ready for Deployment 🚀

