# Multilingual Database Migration Guide

## Overview

This guide explains the migration from single-language Sanity schemas to multilingual schemas with separate fields for English and Italian content.

## What Changed

### Schema Updates

All content types now have separate fields for English and Italian:

#### Category Schema
- `name` → `name_en` and `name_it`
- `description` → `description_en` and `description_it`

#### Product Schema
- `name` → `name_en` and `name_it`
- `description` → `description_en` and `description_it`
- Size labels: `label` → `label_en` and `label_it`
- Ingredient names: `name` → `name_en` and `name_it`

#### Flavour Schema
- `name` → `name_en` and `name_it`
- `description` → `description_en` and `description_it`
- Ingredient names: `name` → `name_en` and `name_it`

### Query Updates

All Sanity queries now accept a `locale` parameter (`'en'` or `'it'`):

```typescript
// Before
const products = await getProducts();
const product = await getProductBySlug(slug);

// After
const products = await getProducts(locale);
const product = await getProductBySlug(slug, locale);
```

The queries use GROQ projections to automatically:
1. Return both language-specific fields (`name_en`, `name_it`)
2. Create convenience fields (`name`, `description`) that map to the requested locale

### TypeScript Types

Types now include both localized convenience fields AND language-specific fields:

```typescript
interface Product {
  name: string;        // Automatically localized based on query
  name_en: string;     // Raw English value
  name_it: string;     // Raw Italian value
  description: string; // Automatically localized
  description_en: string;
  description_it: string;
  // ... other fields
}
```

## Migration Steps

### Step 1: Deploy Schema Changes to Sanity Studio

1. Navigate to your Sanity Studio directory:
   ```bash
   cd sanity
   ```

2. Deploy the new schemas:
   ```bash
   npm run deploy
   ```

3. Access your Sanity Studio (usually at `http://localhost:3333` or your deployed URL)

### Step 2: Migrate Existing Data

You have two options for migrating existing data:

#### Option A: Manual Migration (Recommended for Small Datasets)

1. Open each document in Sanity Studio
2. Copy the existing `name` value into both `name_en` and `name_it` fields
3. Copy the existing `description` value into both `description_en` and `description_it` fields
4. Translate the Italian fields manually
5. Save the document

**Note:** Until you populate both language fields, documents may not appear correctly in the frontend.

#### Option B: Automated Migration Script (For Large Datasets)

Create a migration script in your project root:

```javascript
// migrate-to-multilingual.js
import { client } from './sanity/lib/client.js';

async function migrateCategories() {
  const categories = await client.fetch('*[_type == "category" && !defined(name_en)]');
  
  for (const category of categories) {
    await client
      .patch(category._id)
      .set({
        name_en: category.name || '',
        name_it: category.name || '', // Copy as placeholder, translate manually later
        description_en: category.description || '',
        description_it: category.description || '',
      })
      .commit();
    
    console.log(`✅ Migrated category: ${category.name}`);
  }
}

async function migrateProducts() {
  const products = await client.fetch('*[_type == "product" && !defined(name_en)]');
  
  for (const product of products) {
    // Migrate product fields
    const updates = {
      name_en: product.name || '',
      name_it: product.name || '',
      description_en: product.description || '',
      description_it: product.description || '',
    };
    
    // Migrate sizes if present
    if (product.sizes && product.sizes.length > 0) {
      updates.sizes = product.sizes.map(size => ({
        ...size,
        label_en: size.label || '',
        label_it: size.label || '',
      }));
    }
    
    // Migrate ingredients if present
    if (product.ingredients && product.ingredients.length > 0) {
      updates.ingredients = product.ingredients.map(ing => ({
        ...ing,
        name_en: ing.name || '',
        name_it: ing.name || '',
      }));
    }
    
    await client
      .patch(product._id)
      .set(updates)
      .commit();
    
    console.log(`✅ Migrated product: ${product.name}`);
  }
}

async function migrateFlavours() {
  const flavours = await client.fetch('*[_type == "flavour" && !defined(name_en)]');
  
  for (const flavour of flavours) {
    const updates = {
      name_en: flavour.name || '',
      name_it: flavour.name || '',
      description_en: flavour.description || '',
      description_it: flavour.description || '',
    };
    
    // Migrate ingredients if present
    if (flavour.ingredients && flavour.ingredients.length > 0) {
      updates.ingredients = flavour.ingredients.map(ing => ({
        ...ing,
        name_en: ing.name || '',
        name_it: ing.name || '',
      }));
    }
    
    await client
      .patch(flavour._id)
      .set(updates)
      .commit();
    
    console.log(`✅ Migrated flavour: ${flavour.name}`);
  }
}

async function runMigration() {
  console.log('🚀 Starting multilingual migration...\n');
  
  try {
    console.log('📁 Migrating categories...');
    await migrateCategories();
    
    console.log('\n📦 Migrating products...');
    await migrateProducts();
    
    console.log('\n🍰 Migrating flavours...');
    await migrateFlavours();
    
    console.log('\n✅ Migration completed successfully!');
    console.log('⚠️  Remember to manually translate Italian fields');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
```

Run the migration:
```bash
node migrate-to-multilingual.js
```

### Step 3: Translate Italian Content

After the initial migration:

1. Go through each document in Sanity Studio
2. Translate the `*_it` fields from English to Italian
3. Review and save

**Translation Priority:**
1. Categories (smallest dataset)
2. Flavours
3. Products
4. Product sizes and ingredients

### Step 4: Verify Frontend

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Test both language versions:
   - English: `http://localhost:3000/en`
   - Italian: `http://localhost:3000/it`

3. Verify that:
   - Product names appear correctly in both languages
   - Descriptions are translated
   - Category names switch languages
   - Size options show correct labels
   - Flavour names and descriptions are translated

### Step 5: Clean Up Old Fields (Optional)

After verifying that everything works, you can optionally remove the old single-language fields from your data:

```javascript
// cleanup-old-fields.js
import { client } from './sanity/lib/client.js';

async function cleanupOldFields() {
  // Clean up categories
  await client
    .patch({ query: '*[_type == "category"]' })
    .unset(['name', 'description'])
    .commit();
  
  // Clean up products
  await client
    .patch({ query: '*[_type == "product"]' })
    .unset(['name', 'description'])
    .commit();
  
  // Clean up flavours
  await client
    .patch({ query: '*[_type == "flavour"]' })
    .unset(['name', 'description'])
    .commit();
  
  console.log('✅ Cleanup completed');
}

cleanupOldFields();
```

**⚠️ Warning:** Only run this after thoroughly testing that the new multilingual fields work correctly!

## Frontend Integration

### How Queries Work

The new query system uses GROQ projections to automatically select the correct language:

```groq
// Example for products
*[_type == "product"] {
  _id,
  "name": name_en,          // For English locale
  "name": name_it,          // For Italian locale
  name_en,                   // Always available
  name_it,                   // Always available
  // ... other fields
}
```

### Using in Components

Components should pass the locale parameter to queries:

```typescript
// In a Next.js page component
export default async function ProductsPage({ params }: Props) {
  const { locale } = await params;
  
  // Pass locale to query
  const products = await getProducts(locale as 'en' | 'it');
  
  // Use products normally - the 'name' field will be in the correct language
  return (
    <div>
      {products.map(product => (
        <div key={product._id}>
          <h2>{product.name}</h2> {/* Automatically localized */}
          <p>{product.description}</p>
        </div>
      ))}
    </div>
  );
}
```

### Accessing Raw Language Values

If you need to access both language versions:

```typescript
const product = await getProductBySlug(slug, 'en');

console.log(product.name);     // English (from query locale)
console.log(product.name_en);  // English (raw)
console.log(product.name_it);  // Italian (raw)
```

## Rollback Plan

If you need to rollback to the single-language schema:

1. Revert the schema files:
   ```bash
   git checkout HEAD~1 sanity/schemas/
   ```

2. Redeploy schemas:
   ```bash
   cd sanity && npm run deploy
   ```

3. Revert code changes:
   ```bash
   git checkout HEAD~1 lib/sanity/queries.ts types/sanity.ts
   ```

4. Revert component changes:
   ```bash
   git checkout HEAD~1 app/ components/
   ```

**Note:** Your data will retain the new multilingual fields, but the old fields should still exist if you haven't run the cleanup script.

## Testing Checklist

- [ ] All categories display in both languages
- [ ] All products display in both languages
- [ ] Product descriptions are translated
- [ ] Size options show correct language labels
- [ ] Flavours display in both languages
- [ ] Ingredient lists show correct language
- [ ] Category filter works in both languages
- [ ] Product detail pages work in both languages
- [ ] Breadcrumbs show localized names
- [ ] Search functionality (if implemented) works with both languages
- [ ] Cart items display correct language names
- [ ] Checkout order summary shows correct language
- [ ] Email notifications use correct language

## Troubleshooting

### Products not showing after schema update

**Cause:** Products haven't been migrated to include both language fields.

**Solution:** Run the migration script or manually populate `name_en`, `name_it`, `description_en`, and `description_it` fields.

### TypeScript errors after update

**Cause:** Type definitions might be cached.

**Solution:**
```bash
rm -rf .next
rm -rf node_modules/.cache
npm run build
```

### Sanity Studio shows validation errors

**Cause:** Required fields are not populated.

**Solution:** Ensure all required fields (`name_en`, `name_it`, etc.) are filled for each document.

### Wrong language displays

**Cause:** Locale parameter not being passed to queries.

**Solution:** Check that all query calls include the locale parameter:
```typescript
await getProducts(locale as 'en' | 'it')
```

## Best Practices

1. **Always populate both languages:** Even if your content is primarily in one language, populate both fields to avoid errors.

2. **Use professional translation:** For customer-facing content, use professional translation services rather than automated translation.

3. **Test thoroughly:** Always test both language versions after making changes.

4. **Keep slugs language-neutral:** Slugs should remain in English (or be language-neutral) to avoid URL complexity.

5. **Document your translations:** Keep a translation glossary for consistent terminology across your site.

## Support

If you encounter issues during migration:

1. Check the Sanity Studio console for validation errors
2. Verify that all required fields are populated
3. Test queries in Sanity Vision to debug GROQ queries
4. Check browser console for frontend errors
5. Review the git history to compare before/after changes

## Summary

The multilingual migration provides:

✅ **Clean separation** of English and Italian content
✅ **Type-safe** queries with automatic locale handling
✅ **Flexible access** to both raw and localized values
✅ **Backward compatibility** through convenience fields
✅ **Minimal frontend changes** due to smart query projections

The new system is more maintainable and scalable for future language additions.


