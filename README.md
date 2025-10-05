# 🍰 Bake My Cake - Bakery Website

> An elegant, minimalistic bakery website with an intuitive content management system for a non-tech savvy owner.

---

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Data Models](#data-models)
- [Setup Instructions](#setup-instructions)
- [Development Workflow](#development-workflow)
- [Deployment](#deployment)
- [Third-Party Services](#third-party-services)
- [Environment Variables](#environment-variables)
- [Design System](#design-system)

---

## 🎯 Overview

A modern, full-stack bakery website built for a local bakery owner who needs an easy way to manage products without technical knowledge. The site handles product showcase, online ordering, payment processing, and automated order notifications.

### **Core Goals**

- **Owner-friendly**: Intuitive dashboard for managing products (no coding required)
- **Customer-focused**: Beautiful, responsive shopping experience
- **Reliable**: Stable infrastructure with proper order management
- **Automated**: Email and Telegram notifications for new orders
- **Elegant**: Minimalistic design with slight playfulness

---

## ✨ Features

### **Customer-Facing**
- [ ] **Multi-language support** (Italian, English, German)
- [ ] Product catalog with filtering by category
- [ ] Individual product pages with detailed information
- [ ] Shopping cart with persistent state
- [ ] Secure checkout with Stripe integration
- [ ] Order confirmation emails
- [ ] Contact page with embedded map
- [ ] About page with bakery story
- [ ] Mobile-responsive design
- [ ] SEO optimized
- [ ] Fast loading times (ISR + CDN)

### **Owner Dashboard**
- [ ] Product management (add/edit/delete)
- [ ] Image upload with automatic optimization
- [ ] Category management
- [ ] Product availability toggle
- [ ] Order history and status tracking
- [ ] Simple, intuitive interface (Sanity Studio)
- [ ] Mobile-friendly admin panel
- [ ] No technical knowledge required

### **Backend/Admin**
- [ ] Order processing and storage
- [ ] Payment handling (Stripe webhooks)
- [ ] Email notifications to owner (new orders)
- [ ] Telegram notifications to owner
- [ ] Email confirmations to customers
- [ ] Order status management

---

## 🛠️ Tech Stack

### **Frontend**
- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Internationalization**: next-intl (Italian, English, German)
- **Styling**: Tailwind CSS
- **Components**: shadcn/ui + Radix UI
- **Animations**: Framer Motion
- **State Management**: React Context + Zustand (cart)
- **Forms**: React Hook Form + Zod

### **Content Management**
- **CMS**: Sanity.io
- **Content Type**: Products, Categories, Pages
- **Studio**: Embedded at `/studio` route
- **Authentication**: Handled by Sanity (built-in)
- **Image CDN**: Sanity's native CDN with optimization

### **Database & Backend**
- **Orders/Transactions**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth (owner login)
- **Real-time**: Supabase subscriptions
- **Storage**: Sanity (content images) + Supabase (order attachments if needed)

### **Third-Party Services**
- **Payments**: Stripe Checkout
- **Email**: Resend
- **Notifications**: Telegram Bot API
- **Maps**: Google Maps Embed API
- **Analytics**: Plausible (GDPR-friendly)

### **Hosting & Infrastructure**
- **Platform**: Railway
- **Environment**: Node.js runtime
- **CDN**: Sanity CDN + Railway CDN
- **CI/CD**: GitHub Actions → Railway auto-deploy

---

## 🏗️ Architecture

### **Hybrid Content + Transaction Architecture**

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                             │
│                    (Mobile & Desktop Browsers)                   │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                               │ HTTPS
                               │
┌──────────────────────────────▼──────────────────────────────────┐
│                      NEXT.JS APPLICATION                         │
│                        (Hosted on Railway)                       │
│                                                                  │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────────┐    │
│  │   Pages     │  │  API Routes  │  │  Server Components │    │
│  │  (SSR/ISR)  │  │              │  │                    │    │
│  │             │  │  /api/       │  │  - Product fetch   │    │
│  │ - Home      │  │  - checkout  │  │  - Category fetch  │    │
│  │ - Products  │  │  - orders    │  │  - Page rendering  │    │
│  │ - Cart      │  │  - webhooks  │  │                    │    │
│  │ - Checkout  │  │  - notify    │  │                    │    │
│  └─────────────┘  └──────────────┘  └────────────────────┘    │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              SANITY STUDIO (/studio)                      │  │
│  │         Owner's product management dashboard              │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────┬─────────────────┬─────────────────┬──────────────────┘
         │                 │                 │
         │                 │                 │
    ┌────▼─────┐     ┌─────▼──────┐    ┌────▼────────┐
    │          │     │            │    │             │
    │  SANITY  │     │  SUPABASE  │    │   STRIPE    │
    │ CONTENT  │     │ PostgreSQL │    │  Payments   │
    │   LAKE   │     │            │    │             │
    │          │     │  Tables:   │    │ - Checkout  │
    │ Schemas: │     │  - orders  │    │ - Webhooks  │
    │ -Products│     │  - items   │    │ - Sessions  │
    │ -Category│     │  - customer│    │             │
    │ - Pages  │     │            │    │             │
    └──────────┘     └─────┬──────┘    └─────────────┘
                           │
                     ┌─────▼──────┐
                     │  SUPABASE  │
                     │    AUTH    │
                     │ (Owner-only)│
                     └────────────┘

    ┌────────────────────────────────────────────────┐
    │         NOTIFICATION LAYER                     │
    │                                                │
    │  ┌────────────┐         ┌──────────────┐     │
    │  │   RESEND   │         │   TELEGRAM   │     │
    │  │   Email    │         │     Bot      │     │
    │  │            │         │              │     │
    │  │ - Owner    │         │ - Instant    │     │
    │  │ - Customer │         │   alerts     │     │
    │  └────────────┘         └──────────────┘     │
    └────────────────────────────────────────────────┘
```

### **Data Flow**

#### **Content Management Flow:**
1. Owner logs into `/studio` (Sanity handles auth)
2. Adds/edits products in Sanity Studio
3. Clicks "Publish"
4. Content saved to Sanity Content Lake
5. Next.js ISR revalidates pages
6. Customers see updated content

#### **Order Processing Flow:**
1. Customer adds products to cart
2. Proceeds to checkout
3. Next.js API creates Stripe Checkout Session
4. Customer completes payment on Stripe
5. Stripe sends webhook to `/api/webhooks/stripe`
6. Order saved to Supabase
7. Notifications sent:
   - Email to owner (Resend)
   - Telegram message to owner
   - Confirmation email to customer
8. Owner sees order in dashboard

---

## 📁 Project Structure

```
bakemycake_website/
├── app/                          # Next.js App Router
│   ├── (customer)/               # Customer-facing routes
│   │   ├── page.tsx              # Homepage
│   │   ├── products/
│   │   │   ├── page.tsx          # Products listing
│   │   │   └── [slug]/
│   │   │       └── page.tsx      # Individual product page
│   │   ├── cart/
│   │   │   └── page.tsx          # Shopping cart
│   │   ├── checkout/
│   │   │   └── page.tsx          # Checkout page
│   │   ├── contact/
│   │   │   └── page.tsx          # Contact page with map
│   │   └── about/
│   │       └── page.tsx          # About page
│   │
│   ├── api/                      # API Routes
│   │   ├── checkout/
│   │   │   └── route.ts          # Create Stripe session
│   │   ├── orders/
│   │   │   ├── route.ts          # Get orders (owner)
│   │   │   └── [id]/
│   │   │       └── route.ts      # Update order status
│   │   ├── webhooks/
│   │   │   └── stripe/
│   │   │       └── route.ts      # Handle Stripe events
│   │   └── notify/
│   │       ├── email/
│   │       │   └── route.ts      # Send emails
│   │       └── telegram/
│   │           └── route.ts      # Send Telegram messages
│   │
│   ├── studio/                   # Sanity Studio
│   │   └── [[...index]]/
│   │       └── page.tsx          # Studio route
│   │
│   ├── dashboard/                # Owner dashboard (order management)
│   │   ├── layout.tsx            # Protected layout
│   │   ├── page.tsx              # Orders overview
│   │   └── orders/
│   │       └── [id]/
│   │           └── page.tsx      # Order details
│   │
│   ├── layout.tsx                # Root layout
│   └── globals.css               # Global styles
│
├── components/                   # React components
│   ├── ui/                       # shadcn/ui components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── input.tsx
│   │   └── ...
│   ├── product-card.tsx          # Product display card
│   ├── cart-item.tsx             # Cart item component
│   ├── header.tsx                # Site header
│   ├── footer.tsx                # Site footer
│   └── map-embed.tsx             # Google Maps component
│
├── lib/                          # Utility functions
│   ├── sanity/
│   │   ├── client.ts             # Sanity client config
│   │   ├── queries.ts            # GROQ queries
│   │   └── image-url.ts          # Image URL builder
│   ├── supabase/
│   │   ├── client.ts             # Supabase client
│   │   ├── server.ts             # Server-side client
│   │   └── types.ts              # Generated types
│   ├── stripe/
│   │   └── client.ts             # Stripe client
│   ├── email/
│   │   ├── templates/            # Email templates
│   │   │   ├── order-owner.tsx
│   │   │   └── order-customer.tsx
│   │   └── send.ts               # Email sender
│   ├── telegram/
│   │   └── bot.ts                # Telegram bot client
│   └── utils.ts                  # General utilities
│
├── sanity/                       # Sanity configuration
│   ├── schemas/                  # Content schemas
│   │   ├── product.ts            # Product schema
│   │   ├── category.ts           # Category schema
│   │   ├── page.ts               # Page content schema
│   │   └── index.ts              # Schema exports
│   ├── lib/
│   │   └── client.ts             # Studio client
│   ├── sanity.config.ts          # Studio configuration
│   └── sanity.cli.ts             # CLI configuration
│
├── supabase/                     # Supabase migrations
│   └── migrations/
│       ├── 001_create_orders.sql
│       └── 002_create_order_items.sql
│
├── store/                        # State management
│   └── cart-store.ts             # Zustand cart store
│
├── types/                        # TypeScript types
│   ├── sanity.ts                 # Sanity types
│   ├── order.ts                  # Order types
│   └── product.ts                # Product types
│
├── public/                       # Static assets
│   ├── images/
│   └── icons/
│
├── .env.local                    # Environment variables
├── .env.example                  # Environment template
├── next.config.js                # Next.js configuration
├── tailwind.config.ts            # Tailwind configuration
├── tsconfig.json                 # TypeScript configuration
├── package.json                  # Dependencies
└── README.md                     # This file
```

---

## 📊 Data Models

### **Sanity Schemas (Content)**

#### **Product**
```typescript
{
  _id: string;
  _type: 'product';
  name: string;
  slug: { current: string };
  description: string;
  price: number;
  image: Image;
  category: Reference<Category>;
  available: boolean;
  featured: boolean;
  ingredients?: string[];
  allergens?: string[];
  _createdAt: string;
  _updatedAt: string;
}
```

#### **Category**
```typescript
{
  _id: string;
  _type: 'category';
  name: string;
  slug: { current: string };
  description?: string;
  image?: Image;
  order: number;
}
```

### **Supabase Tables (Transactions)**

#### **orders**
```sql
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_session_id TEXT UNIQUE NOT NULL,
  stripe_payment_intent_id TEXT,
  customer_email TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  total_amount DECIMAL(10, 2) NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled')),
  delivery_type TEXT CHECK (delivery_type IN ('pickup', 'delivery')),
  delivery_address TEXT,
  special_instructions TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### **order_items**
```sql
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL, -- Sanity product ID
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(10, 2) NOT NULL,
  subtotal DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 🚀 Setup Instructions

### **Prerequisites**
- Node.js 18+ and npm
- Git
- Railway account
- Sanity account
- Supabase account
- Stripe account
- Resend account
- Telegram Bot Token

### **1. Clone Repository**
```bash
git clone <repository-url>
cd bakemycake_website
npm install
```

### **2. Sanity Setup**
```bash
# Install Sanity CLI
npm install -g @sanity/cli

# Initialize Sanity project
npx sanity init

# Follow prompts:
# - Create new project: "Bake My Cake"
# - Use default dataset: "production"
# - Output path: ./sanity

# Deploy Sanity Studio (for cloud access)
cd sanity
npx sanity deploy
```

### **3. Supabase Setup**
1. Create project at supabase.com
2. Run migrations:
```bash
# Install Supabase CLI
npm install -g supabase

# Link to project
supabase link --project-ref <your-project-ref>

# Push migrations
supabase db push
```

### **4. Stripe Setup**
1. Create account at stripe.com
2. Get API keys (Dashboard → Developers → API keys)
3. Set up webhook endpoint:
   - URL: `https://yourdomain.com/api/webhooks/stripe`
   - Events: `checkout.session.completed`, `payment_intent.succeeded`
4. Note webhook signing secret

### **5. Resend Setup**
1. Create account at resend.com
2. Add domain or use resend.dev for testing
3. Get API key

### **6. Telegram Setup**
```bash
# Create bot via @BotFather on Telegram
# Send /newbot and follow instructions
# Save bot token

# Get your chat ID:
# 1. Send message to your bot
# 2. Visit: https://api.telegram.org/bot<TOKEN>/getUpdates
# 3. Find "chat":{"id":123456789}
```

### **7. Environment Variables**
```bash
cp .env.example .env.local
```

Edit `.env.local` with your credentials (see [Environment Variables](#environment-variables) section)

### **8. Run Development Server**
```bash
npm run dev

# Application: http://localhost:3000
# Sanity Studio: http://localhost:3000/studio
```

---

## 🔧 Development Workflow

### **Adding Products (Owner)**
1. Navigate to `/studio`
2. Login with Sanity credentials
3. Click "Products" → "Create New"
4. Fill in product details
5. Upload image
6. Publish

### **Testing Checkout**
```bash
# Use Stripe test cards
# Success: 4242 4242 4242 4242
# Decline: 4000 0000 0000 0002

# View webhooks in Stripe Dashboard
# Check order in Supabase
```

### **Database Migrations**
```bash
# Create new migration
supabase migration new migration_name

# Apply migrations
supabase db push

# Generate TypeScript types
npm run generate:types
```

### **Sanity Schema Changes**
```bash
# Edit schemas in /sanity/schemas/
# Restart dev server
# Changes reflect immediately in Studio
```

---

## 🚢 Deployment

### **Railway Deployment**

#### **1. Initial Setup**
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Initialize project
railway init

# Link to GitHub repo (recommended)
# Enables automatic deployments on push
```

#### **2. Configure Environment**
```bash
# Add environment variables in Railway dashboard
# Or via CLI:
railway variables set NEXT_PUBLIC_SANITY_PROJECT_ID=abc123
railway variables set SUPABASE_URL=https://...
# ... add all variables from .env.local
```

#### **3. Deploy**
```bash
# Manual deploy
railway up

# Or push to GitHub (auto-deploys)
git push origin main
```

#### **4. Custom Domain**
```bash
# In Railway dashboard:
# Settings → Domains → Add Custom Domain
# Configure DNS records as instructed
```

### **Sanity Studio Deployment**
```bash
# Studio is embedded in Next.js app
# Accessible at: https://yourdomain.com/studio

# Or deploy separately:
cd sanity
npx sanity deploy
# Accessible at: https://yourproject.sanity.studio
```

---

## 🔌 Third-Party Services

### **Sanity**
- **Purpose**: Content management (products, categories, pages)
- **Pricing**: Free tier (3 users, 500k API requests/month)
- **Dashboard**: https://manage.sanity.io

### **Supabase**
- **Purpose**: Order database, authentication
- **Pricing**: Free tier (500MB database, 2GB bandwidth)
- **Dashboard**: https://supabase.com/dashboard

### **Stripe**
- **Purpose**: Payment processing
- **Pricing**: 2.9% + $0.30 per transaction
- **Dashboard**: https://dashboard.stripe.com

### **Resend**
- **Purpose**: Email notifications
- **Pricing**: Free tier (3,000 emails/month)
- **Dashboard**: https://resend.com/emails

### **Telegram**
- **Purpose**: Instant order notifications
- **Pricing**: Free
- **Bot Management**: @BotFather

### **Railway**
- **Purpose**: Application hosting
- **Pricing**: Pay-as-you-go (starts free)
- **Dashboard**: https://railway.app/dashboard

---

## 🔐 Environment Variables

Create `.env.local` with the following:

```bash
# ============================================
# NEXT.JS
# ============================================
NEXT_PUBLIC_APP_URL=http://localhost:3000

# ============================================
# SANITY
# ============================================
NEXT_PUBLIC_SANITY_PROJECT_ID=your_project_id
NEXT_PUBLIC_SANITY_DATASET=production
SANITY_API_TOKEN=your_write_token
SANITY_API_VERSION=2024-01-01

# ============================================
# SUPABASE
# ============================================
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# ============================================
# STRIPE
# ============================================
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# ============================================
# RESEND
# ============================================
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=orders@yourbakery.com

# ============================================
# TELEGRAM
# ============================================
TELEGRAM_BOT_TOKEN=123456:ABC-DEF...
TELEGRAM_CHAT_ID=123456789

# ============================================
# GOOGLE MAPS
# ============================================
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIza...

# ============================================
# BAKERY INFO
# ============================================
BAKERY_NAME="Bake My Cake"
BAKERY_EMAIL=info@bakemycake.com
BAKERY_PHONE="+1 (555) 123-4567"
BAKERY_ADDRESS="123 Baker Street, Sweet City, SC 12345"
```

---

## 🎨 Design System

### **Color Palette**
```css
/* Tailwind config */
colors: {
  cream: {
    50: '#FDFCFB',
    100: '#F9F6F1',
    200: '#F5E6D3',  /* Primary */
    300: '#EDD7B8',
    400: '#E5C89D',
  },
  rose: {
    50: '#FFF5F5',
    100: '#FFE8E8',
    200: '#FFD4D4',  /* Secondary */
    300: '#FFB5B5',
    400: '#FF9696',
  },
  brown: {
    400: '#A68A6B',
    500: '#8B6B47',  /* Accent */
    600: '#6F5438',
    700: '#533D29',
  },
  charcoal: {
    900: '#2C2C2C',  /* Text */
  }
}
```

### **Typography**
```css
/* Font families */
--font-heading: 'Playfair Display', serif;
--font-body: 'Inter', sans-serif;

/* Sizes */
.h1 { @apply text-5xl md:text-6xl font-heading }
.h2 { @apply text-4xl md:text-5xl font-heading }
.h3 { @apply text-3xl md:text-4xl font-heading }
.body { @apply text-base font-body }
```

### **Components**
- Built with **shadcn/ui** for consistency
- Customized with bakery color palette
- Accessible (WCAG AA compliant)
- Smooth animations with Framer Motion

---

## 🌍 Internationalization (i18n)

### **Supported Languages**
- **Italian (it)** - Default language
- **English (en)**
- **German (de)**

### **Implementation**
- **Library**: next-intl
- **Routing**: URL-based (`/it/products`, `/en/products`, `/de/products`)
- **Default Locale**: Italian (it)
- **Browser Detection**: Automatic language detection from browser preferences
- **Persistence**: Language choice saved in cookies

### **Language Switcher**
- **Location**: Header (top right)
- **Style**: Beautiful dropdown menu with language names
- **Behavior**: Maintains current page when switching languages

### **Translation Scope**
**Phase 1 (Current)** - UI Elements Only:
- Navigation menus
- Buttons and CTAs
- Form labels and placeholders
- Error messages
- Cart and checkout flow
- Footer content

**Phase 2 (Future)** - Content Translation:
- Product names and descriptions (via Sanity localization)
- Category names
- Page content

### **Translation Files**
```
messages/
├── it.json    # Italian (default)
├── en.json    # English
└── de.json    # German
```

### **URL Structure**
```
/it           → Homepage (Italian)
/en           → Homepage (English)
/de           → Homepage (German)
/             → Redirects to /it (default)
/studio       → Not localized (always accessible)
```

---

## 📝 Development Checklist

### **Phase 1: Foundation** (Week 1)
- [x] README documentation
- [ ] Next.js project setup
- [ ] Tailwind + shadcn/ui configuration
- [ ] Sanity schema definitions
- [ ] Supabase table creation
- [ ] Environment configuration

### **Phase 2: Content Management** (Week 1-2)
- [ ] Sanity Studio customization
- [ ] Product schema finalization
- [ ] Category system
- [ ] Image optimization setup
- [ ] Owner authentication

### **Phase 3: Customer Frontend** (Week 2-3)
- [ ] Homepage design
- [ ] Product listing page
- [ ] Product detail page
- [ ] Shopping cart functionality
- [ ] Contact page with map
- [ ] About page
- [ ] Mobile responsiveness

### **Phase 4: Checkout & Payments** (Week 3-4)
- [ ] Stripe integration
- [ ] Checkout flow
- [ ] Order processing
- [ ] Webhook handling
- [ ] Error handling

### **Phase 5: Notifications** (Week 4)
- [ ] Email templates
- [ ] Resend integration
- [ ] Telegram bot setup
- [ ] Order confirmation emails
- [ ] Owner notification system

### **Phase 6: Owner Dashboard** (Week 5)
- [ ] Order management UI
- [ ] Order status updates
- [ ] Protected routes
- [ ] Order history

### **Phase 7: Testing & Launch** (Week 5-6)
- [ ] End-to-end testing
- [ ] Payment testing (test mode)
- [ ] Mobile testing
- [ ] Performance optimization
- [ ] SEO optimization
- [ ] Railway deployment
- [ ] Domain configuration
- [ ] Production environment
- [ ] Owner training/documentation

---

## 📚 Resources

- **Next.js**: https://nextjs.org/docs
- **Sanity**: https://www.sanity.io/docs
- **Supabase**: https://supabase.com/docs
- **Stripe**: https://stripe.com/docs
- **Tailwind**: https://tailwindcss.com/docs
- **shadcn/ui**: https://ui.shadcn.com
- **Railway**: https://docs.railway.app

---

## 👥 Team

- **Developer**: [Your Name]
- **Client**: Bakery Owner
- **Target Launch**: [Date]

---

## 📄 License

Private project - All rights reserved

---

## 🆘 Support

For questions or issues:
- Email: dev@youremail.com
- Documentation: This README
- Sanity Support: https://www.sanity.io/help
- Supabase Support: https://supabase.com/support

---

**Built with ❤️ and 🍰**

