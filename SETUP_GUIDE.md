# 🚀 Setup Guide - Bake My Cake

This guide will walk you through setting up the entire development environment from scratch.

---

## 📋 Prerequisites

Before starting, make sure you have:

- ✅ **Node.js 18+** installed ([download](https://nodejs.org/))
- ✅ **npm** or **yarn** package manager
- ✅ **Git** installed
- ✅ Code editor (VS Code recommended)

---

## 🔧 Step-by-Step Setup

### **Step 1: Clone and Install**

```bash
cd /Users/xon/Desktop/BMK/bakemycake_website
npm install
```

---

### **Step 2: Sanity Setup**

#### **2.1: Create Sanity Account**
1. Go to [sanity.io](https://www.sanity.io/)
2. Sign up with GitHub/Google
3. Create new project: "Bake My Cake"

#### **2.2: Initialize Sanity**
```bash
# Install Sanity CLI globally
npm install -g @sanity/cli

# Initialize Sanity in your project
npx sanity init --env

# When prompted:
# - Select "Create new project"
# - Project name: "Bake My Cake"
# - Use default dataset: "production"
# - Output path: ./sanity
```

#### **2.3: Get Sanity Credentials**
```bash
# Get Project ID
npx sanity manage
# Copy project ID from URL: manage.sanity.io/projects/[THIS-IS-YOUR-ID]

# Create API Token
# 1. Go to: https://manage.sanity.io
# 2. Select your project
# 3. API → Tokens → Add API Token
# 4. Name: "Next.js Production"
# 5. Permissions: "Editor"
# 6. Copy the token (shown once!)
```

**Save these:**
- Project ID: `abc123xyz`
- API Token: `sk...`

---

### **Step 3: Supabase Setup**

#### **3.1: Create Supabase Project**
1. Go to [supabase.com](https://supabase.com/)
2. Sign up with GitHub
3. Create new project:
   - Name: "bakemycake"
   - Database password: (save this!)
   - Region: Choose closest to your Railway deployment

#### **3.2: Get Supabase Credentials**
1. Go to Project Settings → API
2. Copy these values:
   - **Project URL**: `https://abc123xyz.supabase.co`
   - **Anon Public Key**: `eyJh...` (starts with eyJh)
   - **Service Role Key**: `eyJh...` (different, keep secret!)

#### **3.3: Create Database Tables**
```sql
-- Run this in Supabase SQL Editor
-- (Project → SQL Editor → New Query)

-- Orders table
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_session_id TEXT UNIQUE NOT NULL,
  stripe_payment_intent_id TEXT,
  customer_email TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  total_amount DECIMAL(10, 2) NOT NULL,
  status TEXT DEFAULT 'pending' 
    CHECK (status IN ('pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled')),
  delivery_type TEXT 
    CHECK (delivery_type IN ('pickup', 'delivery')),
  delivery_address TEXT,
  special_instructions TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Order items table
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL,
  product_name TEXT NOT NULL,
  product_image_url TEXT,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price DECIMAL(10, 2) NOT NULL,
  subtotal DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX idx_orders_customer_email ON orders(customer_email);
CREATE INDEX idx_order_items_order_id ON order_items(order_id);

-- Enable Row Level Security (RLS)
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Create policies (adjust as needed)
-- Allow service role full access
CREATE POLICY "Service role full access on orders" ON orders
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access on order_items" ON order_items
  FOR ALL USING (auth.role() = 'service_role');

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

---

### **Step 4: Stripe Setup**

#### **4.1: Create Stripe Account**
1. Go to [stripe.com](https://stripe.com/)
2. Sign up
3. Complete business verification (can skip for testing)

#### **4.2: Get Test API Keys**
1. Go to Developers → API Keys
2. Toggle "Test mode" ON
3. Copy:
   - **Publishable key**: `pk_test_...`
   - **Secret key**: `sk_test_...` (click "Reveal")

#### **4.3: Set Up Webhook (Later)**
> Note: Do this after deploying to Railway, as you need a public URL

1. Go to Developers → Webhooks
2. Click "+ Add endpoint"
3. Endpoint URL: `https://your-railway-url.up.railway.app/api/webhooks/stripe`
4. Select events:
   - `checkout.session.completed`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
5. Copy **Signing secret**: `whsec_...`

---

### **Step 5: Resend Setup**

#### **5.1: Create Resend Account**
1. Go to [resend.com](https://resend.com/)
2. Sign up with email
3. Verify email

#### **5.2: Get API Key**
1. Go to API Keys
2. Click "Create API Key"
3. Name: "Bakery Website"
4. Copy the key: `re_...`

#### **5.3: Configure Domain (Optional for Production)**
For development, you can use `onboarding@resend.dev` as sender.

For production:
1. Go to Domains → Add Domain
2. Enter: `yourbakery.com`
3. Add DNS records as instructed
4. Verify domain

**Sender Emails:**
- Development: `onboarding@resend.dev`
- Production: `orders@yourbakery.com`

---

### **Step 6: Telegram Bot Setup**

#### **6.1: Create Bot**
1. Open Telegram app
2. Search for `@BotFather`
3. Send `/newbot`
4. Follow prompts:
   - Bot name: "Bake My Cake Bot"
   - Username: "bakemycake_orders_bot" (must end with _bot)
5. Copy the **Bot Token**: `123456789:ABCdef...`

#### **6.2: Get Your Chat ID**
```bash
# 1. Send a message to your bot in Telegram
# 2. Visit this URL in browser (replace <TOKEN> with your bot token):
https://api.telegram.org/bot<TOKEN>/getUpdates

# 3. Look for this in the response:
{
  "chat": {
    "id": 123456789,  // <-- This is your CHAT_ID
    "first_name": "Your Name",
    ...
  }
}
```

**Save:**
- Bot Token: `123456789:ABCdef...`
- Chat ID: `123456789`

---

### **Step 7: Google Maps Setup**

#### **7.1: Create Google Cloud Project**
1. Go to [console.cloud.google.com](https://console.cloud.google.com/)
2. Create new project: "Bakery Website"

#### **7.2: Enable Maps API**
1. Go to APIs & Services → Library
2. Search "Maps Embed API"
3. Click "Enable"

#### **7.3: Get API Key**
1. Go to APIs & Services → Credentials
2. Click "Create Credentials" → API Key
3. Copy the key: `AIza...`
4. Click "Restrict Key":
   - API restrictions: Select "Maps Embed API"
   - Website restrictions: Add your domain

**Save:**
- API Key: `AIza...`

---

### **Step 8: Create Environment File**

Create `.env.local` in project root:

```bash
# Copy this template to .env.local and fill in your values

# ============================================
# NEXT.JS
# ============================================
NEXT_PUBLIC_APP_URL=http://localhost:3000

# ============================================
# SANITY CMS
# ============================================
NEXT_PUBLIC_SANITY_PROJECT_ID=abc123xyz
NEXT_PUBLIC_SANITY_DATASET=production
SANITY_API_TOKEN=sk...your_token_here
SANITY_API_VERSION=2024-01-01

# ============================================
# SUPABASE
# ============================================
NEXT_PUBLIC_SUPABASE_URL=https://abc123xyz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJh...your_anon_key
SUPABASE_SERVICE_ROLE_KEY=eyJh...your_service_role_key

# ============================================
# STRIPE PAYMENTS
# ============================================
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# ============================================
# RESEND EMAIL
# ============================================
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=onboarding@resend.dev

# ============================================
# TELEGRAM NOTIFICATIONS
# ============================================
TELEGRAM_BOT_TOKEN=123456789:ABCdef...
TELEGRAM_CHAT_ID=123456789

# ============================================
# GOOGLE MAPS
# ============================================
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIza...

# ============================================
# BAKERY INFORMATION
# ============================================
BAKERY_NAME="Bake My Cake"
BAKERY_EMAIL=info@bakemycakelugano.ch
BAKERY_PHONE="+1 (555) 123-4567"
BAKERY_ADDRESS="123 Baker Street, Sweet City, SC 12345"
BAKERY_COORDINATES_LAT=40.7128
BAKERY_COORDINATES_LNG=-74.0060
```

---

### **Step 9: Run Development Server**

```bash
npm run dev
```

Open in browser:
- **Customer site**: http://localhost:3000
- **Sanity Studio**: http://localhost:3000/studio

---

## 🚢 Railway Deployment Setup

### **Step 1: Create Railway Account**
1. Go to [railway.app](https://railway.app/)
2. Sign up with GitHub

### **Step 2: Install Railway CLI**
```bash
npm install -g @railway/cli
railway login
```

### **Step 3: Initialize Project**
```bash
# In your project directory
railway init

# Link to GitHub repo (recommended)
railway link
```

### **Step 4: Add Environment Variables**
```bash
# Option A: Via Railway Dashboard
# 1. Go to your project in Railway
# 2. Click "Variables"
# 3. Add all variables from .env.local

# Option B: Via CLI (bulk upload)
railway variables set NEXT_PUBLIC_SANITY_PROJECT_ID=abc123
railway variables set SUPABASE_URL=https://...
# ... repeat for all variables
```

### **Step 5: Configure Build Settings**

Create `railway.json` in project root:
```json
{
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "npm run build"
  },
  "deploy": {
    "startCommand": "npm start",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

### **Step 6: Deploy**
```bash
# Manual deploy
railway up

# Or push to GitHub (auto-deploys)
git add .
git commit -m "Initial deployment"
git push origin main
```

### **Step 7: Get Your URL**
```bash
railway domain
# Or check in Railway dashboard → Settings → Domains
```

### **Step 8: Update Stripe Webhook**
Now that you have a public URL:
1. Go to Stripe Dashboard → Webhooks
2. Add endpoint: `https://your-railway-url.up.railway.app/api/webhooks/stripe`
3. Update `STRIPE_WEBHOOK_SECRET` in Railway variables

---

## ✅ Verification Checklist

After setup, verify everything works:

### **Content Management:**
- [ ] Can access Studio at `/studio`
- [ ] Can login to Studio
- [ ] Can create a test product
- [ ] Product appears on frontend

### **Database:**
- [ ] Supabase tables created
- [ ] Can query orders table

### **Payments:**
- [ ] Stripe test mode enabled
- [ ] Can create checkout session
- [ ] Test payment completes

### **Notifications:**
- [ ] Email test works (Resend)
- [ ] Telegram bot responds
- [ ] Webhook delivers messages

### **Deployment:**
- [ ] Railway deployment succeeds
- [ ] Site accessible via Railway URL
- [ ] Environment variables configured
- [ ] Webhooks configured

---

## 🆘 Troubleshooting

### **Sanity Studio Not Loading**
```bash
# Clear cache
rm -rf .next
npm run dev
```

### **Supabase Connection Failed**
- Check URL and keys in `.env.local`
- Verify tables exist in Supabase dashboard
- Check RLS policies

### **Stripe Webhook Not Working**
- Verify webhook URL is correct
- Check endpoint in Stripe dashboard
- Test with Stripe CLI:
```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

### **Railway Build Failed**
- Check build logs in Railway dashboard
- Verify all environment variables are set
- Ensure `package.json` has build script

---

## 📚 Next Steps

1. ✅ Complete this setup
2. 📝 Start building (see README.md checklist)
3. 🎨 Customize design system
4. 🧪 Test all features
5. 🚀 Deploy to production

---

## 🔗 Quick Links

- **Sanity Dashboard**: https://manage.sanity.io
- **Supabase Dashboard**: https://supabase.com/dashboard
- **Stripe Dashboard**: https://dashboard.stripe.com
- **Resend Dashboard**: https://resend.com
- **Railway Dashboard**: https://railway.app/dashboard
- **Google Cloud Console**: https://console.cloud.google.com

---

**Questions?** Refer to the main README.md or check the official documentation for each service.

