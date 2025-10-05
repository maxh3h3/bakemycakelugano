# 🎨 Sanity Studio Setup Guide

Complete guide for setting up and configuring Sanity CMS.

---

## ⚠️ **Critical: CORS Configuration Required**

Before accessing `/studio`, you **MUST** configure CORS origins in Sanity's dashboard.

### **Why This Is Needed:**
Sanity Studio runs in the browser and makes API calls to Sanity's cloud. For security, Sanity blocks requests from origins that aren't explicitly whitelisted.

---

## 🔧 **Step 1: Configure CORS Origins**

### **Access Sanity Management Console:**
```
https://manage.sanity.io/projects/3rjqr4bg
```

### **Navigate to CORS Settings:**
1. Click on your project: "Bake My Cake"
2. Go to **Settings** (left sidebar)
3. Click **API** tab
4. Scroll to **CORS Origins** section

### **Add Development Origin:**
Click "Add CORS origin" and enter:

```
http://localhost:3000
```

**Settings:**
- ✅ **Allow credentials**: Checked
- Origin: `http://localhost:3000`

Click **Save**

### **Add Production Origin (Later):**
When deploying, add your Railway domain:

```
https://your-app.up.railway.app
```

Or your custom domain:

```
https://yourbakery.com
```

---

## ✅ **Step 2: Verify Configuration**

### **Check Environment Variables:**

Your `.env.local` should have:
```env
NEXT_PUBLIC_SANITY_PROJECT_ID=3rjqr4bg
NEXT_PUBLIC_SANITY_DATASET=production
SANITY_API_VERSION=2024-01-01
```

### **Verify Project ID:**
```bash
# Run this to confirm
grep SANITY_PROJECT_ID .env.local
```

Should output: `NEXT_PUBLIC_SANITY_PROJECT_ID=3rjqr4bg`

---

## 🚀 **Step 3: Access Studio**

### **Development:**
```
http://localhost:3000/studio
```

### **What Should Happen:**

1. **First Time:**
   - Sanity login screen appears
   - Login with Google, GitHub, or email
   - Use the same account you used for `npx sanity login`

2. **After Login:**
   - Clean, professional CMS interface
   - Left sidebar shows:
     - **Product** document type
     - **Category** document type
   - Ready to create content

---

## 📝 **Step 4: Create Your First Documents**

### **Create a Category:**

1. Click **Category** in left sidebar
2. Click **"Create new Category"** button
3. Fill in fields:
   ```
   Name: Torte
   Slug: torte (click Generate)
   Description: Le nostre deliziose torte artigianali
   Order: 1
   ```
4. Optionally upload a category image
5. Click **Publish** (green button at bottom)

### **Create a Product:**

1. Click **Product** in left sidebar
2. Click **"Create new Product"** button
3. Fill in fields:
   ```
   Name: Torta al Cioccolato
   Slug: torta-al-cioccolato (click Generate)
   Description: Ricca torta al cioccolato con ganache
   Price: 45.00
   Category: Select "Torte"
   Available: ✓ (checked)
   Featured: ✓ (if you want it on homepage)
   ```
4. Upload a product image (drag & drop)
5. Optionally add ingredients and allergens
6. Click **Publish**

---

## 🎨 **Studio Features**

### **Document Editor:**
- **Auto-save**: Changes save automatically as drafts
- **Publish**: Makes content live on the website
- **Version History**: Click clock icon to see changes
- **Rich Text**: Description field supports formatting

### **Image Handling:**
- **Drag & drop**: Upload images easily
- **Hotspot**: Click and drag to set focal point
- **Auto-optimization**: Sanity's CDN handles optimization

### **References:**
- **Categories**: Link products to categories
- **Validation**: Required fields are enforced
- **Search**: Find documents quickly

### **Vision Tool:**
- Test GROQ queries
- Access from left sidebar
- Useful for debugging data fetching

---

## 🔐 **User Management**

### **Add Team Members:**

1. Go to: https://manage.sanity.io/projects/3rjqr4bg
2. Navigate to **Members** tab
3. Click **Invite members**
4. Enter email address
5. Select role:
   - **Administrator**: Full access
   - **Editor**: Can edit content
   - **Viewer**: Read-only

For the bakery owner, use **Editor** role.

---

## 🐛 **Troubleshooting**

### **Issue: CORS Error / "CorsOriginError"**

**Problem:** Studio can't connect to Sanity API

**Solution:**
1. Go to https://manage.sanity.io/projects/3rjqr4bg
2. Settings → API → CORS Origins
3. Add `http://localhost:3000`
4. Check "Allow credentials"
5. Save and refresh browser

### **Issue: "Workspace: missing context value"**

**Problem:** Studio isn't initializing properly

**Solution:**
1. Check that CORS is configured (see above)
2. Verify `.env.local` has correct `NEXT_PUBLIC_SANITY_PROJECT_ID`
3. Clear browser cache and hard refresh (Cmd+Shift+R)
4. Restart dev server: `npm run dev`

### **Issue: "Invalid project ID"**

**Problem:** Environment variables not loaded

**Solution:**
```bash
# Verify env vars
grep SANITY .env.local

# Should see:
# NEXT_PUBLIC_SANITY_PROJECT_ID=3rjqr4bg
# NEXT_PUBLIC_SANITY_DATASET=production

# Restart dev server
npm run dev
```

### **Issue: Login doesn't work**

**Problem:** Haven't authenticated with Sanity CLI

**Solution:**
```bash
npx sanity login
# Follow prompts to login
# Use same credentials in Studio
```

### **Issue: Can't publish documents**

**Problem:** Permissions issue

**Solution:**
1. Check you're logged into the correct account
2. Verify your account has Editor or Admin role
3. Check https://manage.sanity.io/projects/3rjqr4bg/members

---

## 📊 **Data Structure**

### **Product Schema:**
```typescript
{
  name: string;           // Product name
  slug: slug;            // URL-friendly identifier
  description: text;     // Product description
  price: number;         // Price in currency
  image: image;          // Product photo
  category: reference;   // Link to Category
  available: boolean;    // Is product available?
  featured: boolean;     // Show on homepage?
  ingredients: string[]; // Optional list
  allergens: string[];   // Optional list
}
```

### **Category Schema:**
```typescript
{
  name: string;          // Category name
  slug: slug;           // URL-friendly identifier
  description: text;    // Category description
  image: image;         // Category photo (optional)
  order: number;        // Sort order
}
```

---

## 🔗 **Integration with Next.js**

### **How Data Flows:**

```
Owner → Studio → Sanity Cloud → Next.js App → Customer
```

1. **Owner edits** product in Studio at `/studio`
2. **Sanity saves** to cloud (instant)
3. **Next.js fetches** data via `lib/sanity/queries.ts`
4. **ISR updates** pages within seconds
5. **Customer sees** updated content

### **Query Products:**
```typescript
// In any Server Component
import { getProducts } from '@/lib/sanity/queries';

const products = await getProducts();
```

### **Query by Category:**
```typescript
import { getProductsByCategory } from '@/lib/sanity/queries';

const cakes = await getProductsByCategory('torte');
```

---

## 🌐 **Production Deployment**

### **Before Deploying:**

1. **Add Production CORS Origin:**
   ```
   https://your-railway-domain.up.railway.app
   ```

2. **Set Environment Variables on Railway:**
   ```bash
   NEXT_PUBLIC_SANITY_PROJECT_ID=3rjqr4bg
   NEXT_PUBLIC_SANITY_DATASET=production
   SANITY_API_VERSION=2024-01-01
   ```

3. **Test Studio Access:**
   ```
   https://your-domain.com/studio
   ```

### **Optional: Separate Studio Deployment:**

If you want Studio on a separate domain:

```bash
cd sanity
npx sanity deploy
```

This deploys Studio to: `https://bakemycake.sanity.studio`

---

## 📈 **Usage Limits (Free Tier)**

- **API Requests**: 500,000/month
- **Bandwidth**: 10GB/month
- **Users**: 3 users
- **Documents**: Unlimited
- **Storage**: 10GB assets

**Current Usage:**
Check at: https://manage.sanity.io/projects/3rjqr4bg/usage

---

## 🔒 **Security Best Practices**

1. ✅ **Never commit** `.env.local` to git
2. ✅ **Use Editor role** for bakery owner (not Admin)
3. ✅ **Only whitelist** necessary CORS origins
4. ✅ **Enable 2FA** for your Sanity account
5. ✅ **Review API usage** regularly

---

## 📚 **Resources**

- **Sanity Docs**: https://www.sanity.io/docs
- **GROQ Cheat Sheet**: https://www.sanity.io/docs/query-cheat-sheet
- **Studio Docs**: https://www.sanity.io/docs/studio
- **Project Dashboard**: https://manage.sanity.io/projects/3rjqr4bg

---

## ✅ **Quick Checklist**

Before using Studio, ensure:

- [ ] CORS origin added for `http://localhost:3000`
- [ ] Environment variables in `.env.local`
- [ ] Dev server running (`npm run dev`)
- [ ] Logged in with `npx sanity login`
- [ ] Project ID is `3rjqr4bg`
- [ ] Browser cache cleared

**Then access:** http://localhost:3000/studio

---

**Need help?** Check the troubleshooting section or Sanity's excellent documentation.

