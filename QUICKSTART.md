# ⚡ Quick Start Guide

## 🎯 What's Been Set Up

✅ **Next.js 15** with TypeScript and App Router  
✅ **Tailwind CSS** with custom bakery design tokens  
✅ **Sanity CMS** schemas (Product & Category)  
✅ **Sanity Studio** accessible at `/studio`  
✅ **Project structure** and folder organization  
✅ **TypeScript types** for type-safe development  

---

## 🚀 Next Steps to Get Running

### **1. Create Sanity Project**

You need to initialize a Sanity project to get your Project ID:

```bash
# Install Sanity CLI globally (if not already installed)
npm install -g @sanity/cli

# Login to Sanity
npx sanity login

# Initialize Sanity project
npx sanity init --env

# Follow the prompts:
# - Create new project: "Bake My Cake"
# - Use default dataset: "production"
# - Project output path: Leave as is (will use existing /sanity folder)
```

This will give you a **Project ID** (e.g., `abc123xyz`)

---

### **2. Create Environment Variables**

Create a `.env.local` file in the project root:

```bash
# Create the file
touch .env.local
```

Add these minimum variables to start:

```env
# Required for Sanity to work
NEXT_PUBLIC_SANITY_PROJECT_ID=your_project_id_here
NEXT_PUBLIC_SANITY_DATASET=production
SANITY_API_VERSION=2024-01-01

# Optional for now (add later)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Replace `your_project_id_here` with the actual Project ID from step 1.

---

### **3. Run Development Server**

```bash
npm run dev
```

The app will be available at:
- **Customer Site**: http://localhost:3000
- **Sanity Studio**: http://localhost:3000/studio

---

### **4. Access Sanity Studio**

1. Navigate to http://localhost:3000/studio
2. You'll be prompted to log in with Sanity
3. Use the same credentials from `npx sanity login`
4. Once logged in, you can start adding products!

---

## 📝 What You Can Do Now

### **Add Your First Category**
1. Go to `/studio`
2. Click "Category" in the sidebar
3. Click "Create new"
4. Fill in:
   - Name: "Cakes"
   - Generate slug
   - Description: "Our signature cakes"
   - Upload an image (optional)
5. Click "Publish"

### **Add Your First Product**
1. Go to `/studio`
2. Click "Product" in the sidebar
3. Click "Create new"
4. Fill in:
   - Name: "Chocolate Cake"
   - Generate slug
   - Description: "Rich and moist chocolate cake"
   - Price: 45.00
   - Upload image
   - Select category
   - Available: ✓
5. Click "Publish"

---

## 🎨 Customization

### **Colors (Tailwind Config)**
Edit `tailwind.config.ts` to adjust the color palette:
- `cream` - Primary background color
- `rose` - Secondary accent
- `brown` - Primary accent
- `charcoal` - Text color

### **Fonts**
Currently using:
- **Headings**: Playfair Display (serif, elegant)
- **Body**: Inter (sans-serif, clean)

To change fonts, edit `app/layout.tsx`

---

## 📂 Project Structure

```
├── app/                    # Next.js pages
│   ├── studio/            # Sanity Studio (owner dashboard)
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Homepage
├── sanity/                # Sanity configuration
│   ├── schemas/           # Content schemas
│   │   ├── product.ts
│   │   └── category.ts
│   ├── sanity.config.ts
│   └── sanity.cli.ts
├── lib/                   # Utilities
│   └── sanity/           # Sanity helpers
│       ├── client.ts
│       ├── queries.ts
│       └── image-url.ts
└── types/                 # TypeScript types
    └── sanity.ts
```

---

## 🔧 Troubleshooting

### **"Project ID not found" error**
- Make sure you've added `NEXT_PUBLIC_SANITY_PROJECT_ID` to `.env.local`
- Restart the dev server after adding environment variables

### **Studio not loading**
- Clear the `.next` folder: `rm -rf .next`
- Restart: `npm run dev`

### **TypeScript errors**
- Run type check: `npm run type-check`
- Most errors will resolve once Sanity is properly configured

---

## 📚 Next Development Steps

Once Sanity is working, you can:

1. **Build the homepage** - Display featured products
2. **Create product pages** - Show individual product details
3. **Add shopping cart** - Use Zustand for state management
4. **Integrate Stripe** - Set up payments
5. **Configure Supabase** - Store orders
6. **Set up notifications** - Email and Telegram

Refer to the main **README.md** for the full development roadmap.

---

## 🆘 Need Help?

- **Sanity Docs**: https://www.sanity.io/docs
- **Next.js Docs**: https://nextjs.org/docs
- **Full Setup Guide**: See `SETUP_GUIDE.md`
- **Tech Stack Details**: See `TECH_STACK.md`

---

**Happy building! 🍰**

