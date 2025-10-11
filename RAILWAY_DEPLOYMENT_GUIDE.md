# 🚂 Railway Production Deployment Guide

## 🚨 Current Issues & Solutions

Based on your setup, here are the issues preventing Studio and Checkout from working:

---

## 1. 🔴 Missing Environment Variables in Railway

Railway needs ALL environment variables from your `.env.local`. You must add these in Railway Dashboard.

### **How to Add Environment Variables:**

1. Go to your Railway project dashboard
2. Click on your service
3. Go to **"Variables"** tab
4. Add each variable below:

### **Required Environment Variables:**

```bash
# ============================================
# SANITY CMS (CRITICAL for Studio)
# ============================================
NEXT_PUBLIC_SANITY_PROJECT_ID=your_sanity_project_id
NEXT_PUBLIC_SANITY_DATASET=production
SANITY_API_VERSION=2024-01-01
SANITY_API_TOKEN=your_sanity_write_token

# ============================================
# STRIPE (CRITICAL for Checkout)
# ============================================
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxxxx  # Your LIVE key, NOT test key!
STRIPE_SECRET_KEY=sk_live_xxxxx  # Your LIVE secret key
STRIPE_WEBHOOK_SECRET=whsec_xxxxx  # From Stripe Dashboard → Webhooks

# ============================================
# APP CONFIGURATION (CRITICAL)
# ============================================
NEXT_PUBLIC_APP_URL=https://your-app.railway.app  # Your actual Railway URL!

# ============================================
# RESEND (Email Notifications)
# ============================================
RESEND_API_KEY=re_xxxxx
RESEND_FROM_EMAIL=orders@bakemycake.com
BAKERY_OWNER_EMAIL=your-email@example.com

# ============================================
# SUPABASE (Database)
# ============================================
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxxxx
SUPABASE_SERVICE_ROLE_KEY=xxxxx

# ============================================
# NODE ENVIRONMENT
# ============================================
NODE_ENV=production
```

---

## 2. 🔴 Sanity Studio Configuration

### **Problem:**
Sanity Studio can't connect because the production domain isn't allowlisted.

### **Solution:**

1. **Go to Sanity.io Dashboard:** https://sanity.io/manage
2. **Select your project**
3. **Go to "API" tab**
4. **Add CORS Origins:**
   - Click "Add CORS origin"
   - Add: `https://your-app.railway.app` (replace with YOUR Railway URL)
   - Allow credentials: ✅ YES
   - Click "Save"

5. **Add your Railway domain to allowed origins:**
   ```
   https://your-app.railway.app
   https://your-app.railway.app/studio
   ```

### **Check Studio Auth Token:**

Your Sanity token needs **WRITE** permissions for the Studio to work:

1. Go to: https://sanity.io/manage
2. Navigate to: **API → Tokens**
3. Check your token has:
   - ✅ **Editor** or **Administrator** role
   - If not, create a new token with proper permissions
4. Update `SANITY_API_TOKEN` in Railway with this token

---

## 3. 🔴 Stripe Configuration for Production

### **Problem:**
Checkout is using test keys or webhook secret is missing.

### **Solution:**

#### **A. Get Production Stripe Keys:**

1. **Go to Stripe Dashboard:** https://dashboard.stripe.com
2. **Toggle to LIVE mode** (top right, turn OFF "Test mode")
3. **Get Publishable Key:**
   - Go to: Developers → API keys
   - Copy "Publishable key" (starts with `pk_live_`)
   - Add to Railway: `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxxxx`

4. **Get Secret Key:**
   - Copy "Secret key" (starts with `sk_live_`)
   - Add to Railway: `STRIPE_SECRET_KEY=sk_live_xxxxx`

#### **B. Configure Webhook Endpoint:**

1. **In Stripe Dashboard:** https://dashboard.stripe.com/webhooks
2. **Click "Add endpoint"**
3. **Endpoint URL:**
   ```
   https://your-app.railway.app/api/webhooks/stripe
   ```
   (Replace with YOUR actual Railway URL!)

4. **Select events to listen to:**
   - `checkout.session.completed` ✅
   - `payment_intent.succeeded` ✅
   - `payment_intent.payment_failed` ✅

5. **Click "Add endpoint"**

6. **Get Signing Secret:**
   - After creating endpoint, click on it
   - Click "Reveal" under "Signing secret"
   - Copy the secret (starts with `whsec_`)
   - Add to Railway: `STRIPE_WEBHOOK_SECRET=whsec_xxxxx`

---

## 4. 🔴 App URL Configuration

### **Problem:**
The app doesn't know its own URL for redirects and webhooks.

### **Solution:**

1. **Find your Railway URL:**
   - In Railway dashboard, go to your service
   - Look for "Domains" section
   - Copy the URL (e.g., `https://your-app.railway.app`)

2. **Add to Railway environment variables:**
   ```bash
   NEXT_PUBLIC_APP_URL=https://your-app.railway.app
   ```

3. **If you have a custom domain:**
   ```bash
   NEXT_PUBLIC_APP_URL=https://bakemycake.com
   ```

---

## 5. 📧 Resend Email Configuration

### **For Production Emails to Work:**

1. **Verify Your Domain in Resend:**
   - Go to: https://resend.com/domains
   - Add your domain: `bakemycake.com`
   - Add DNS records as instructed
   - Wait for verification

2. **Update Environment Variables:**
   ```bash
   RESEND_FROM_EMAIL=orders@bakemycake.com  # Use verified domain
   BAKERY_OWNER_EMAIL=your-actual-email@example.com
   ```

---

## 6. 🗄️ Supabase Configuration

### **Check Database Connection:**

1. **Go to Supabase Dashboard:** https://supabase.com/dashboard
2. **Select your project**
3. **Go to Settings → API**
4. **Copy these values to Railway:**
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=xxxxx (anon public key)
   SUPABASE_SERVICE_ROLE_KEY=xxxxx (service_role secret key)
   ```

### **Enable Required Tables:**

Make sure these tables exist in Supabase:
- `orders`
- `order_items`

Run the SQL schema if you haven't already (check your Supabase migrations).

---

## 🚀 Deployment Checklist

### **Before Deploying:**

- [ ] All environment variables added to Railway
- [ ] Sanity CORS origins configured
- [ ] Stripe webhook endpoint created (LIVE mode)
- [ ] Stripe live keys added to Railway
- [ ] App URL environment variable set
- [ ] Resend domain verified (for production emails)
- [ ] Supabase configuration verified

### **After Deploying:**

- [ ] Test Studio access: `https://your-app.railway.app/studio`
- [ ] Test product pages load correctly
- [ ] Test adding items to cart
- [ ] **Test checkout flow:**
  - [ ] Can reach checkout page
  - [ ] Stripe Checkout opens
  - [ ] Test payment with card: `4242 4242 4242 4242`
  - [ ] Success page redirects correctly
  - [ ] Email confirmation received
  - [ ] Order saved in Supabase
- [ ] Check Railway logs for errors

---

## 🐛 Troubleshooting

### **Studio Shows "Configuration Error"**

**Check:**
1. ✅ `NEXT_PUBLIC_SANITY_PROJECT_ID` is set in Railway
2. ✅ `NEXT_PUBLIC_SANITY_DATASET` is set to `production`
3. ✅ `SANITY_API_TOKEN` has write permissions
4. ✅ Railway domain is in Sanity CORS allowed origins

**Fix:**
- Redeploy Railway after adding variables
- Clear browser cache
- Try incognito/private window

---

### **Checkout Button Doesn't Work**

**Check Railway Logs:**
```bash
# In Railway, go to Deployments → View Logs
```

**Common Errors:**

**Error: "Missing NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"**
- ❌ Stripe publishable key not set in Railway
- ✅ Add it to environment variables and redeploy

**Error: "Missing STRIPE_SECRET_KEY"**
- ❌ Stripe secret key not set in Railway
- ✅ Add it and redeploy

**Error: "Failed to create checkout session"**
- ❌ Using test keys instead of live keys
- ✅ Switch to live mode in Stripe dashboard and copy live keys

**Error: "Invalid redirect URL"**
- ❌ `NEXT_PUBLIC_APP_URL` not set or incorrect
- ✅ Set it to your Railway URL: `https://your-app.railway.app`

---

### **Webhooks Not Working (Orders Not Saved)**

**Check:**
1. ✅ Webhook endpoint created in Stripe (LIVE mode)
2. ✅ Webhook URL is correct: `https://your-app.railway.app/api/webhooks/stripe`
3. ✅ `STRIPE_WEBHOOK_SECRET` is set in Railway
4. ✅ Events are selected: `checkout.session.completed`, `payment_intent.succeeded`

**Test Webhook:**
- In Stripe Dashboard → Webhooks
- Click your endpoint
- Click "Send test webhook"
- Check Railway logs for errors

---

### **Emails Not Sending**

**Check:**
1. ✅ `RESEND_API_KEY` is set in Railway (and NOT the old revoked one!)
2. ✅ Domain is verified in Resend
3. ✅ `RESEND_FROM_EMAIL` uses verified domain
4. ✅ `BAKERY_OWNER_EMAIL` is correct

**For Development Testing:**
- Resend allows unverified domains
- But emails might go to spam

**For Production:**
- MUST verify domain for deliverability

---

## 📊 How to Check Environment Variables in Railway

1. **Go to Railway Dashboard**
2. **Select your project**
3. **Click on your service**
4. **Go to "Variables" tab**
5. **Verify ALL variables are present**

### **Quick Check Command:**

In Railway's deployment logs, you should see:
```
✓ Compiled successfully in XXs
✓ Linting and checking validity of types
```

If you see errors about missing environment variables, they're not set correctly.

---

## 🔑 Where to Find Each Value

| Variable | Where to Find It |
|----------|------------------|
| `NEXT_PUBLIC_SANITY_PROJECT_ID` | Sanity.io → Project Settings → Project ID |
| `SANITY_API_TOKEN` | Sanity.io → API → Tokens (create with Editor role) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe Dashboard → Developers → API keys (LIVE mode) |
| `STRIPE_SECRET_KEY` | Stripe Dashboard → Developers → API keys (LIVE mode) |
| `STRIPE_WEBHOOK_SECRET` | Stripe Dashboard → Webhooks → Click endpoint → Signing secret |
| `NEXT_PUBLIC_APP_URL` | Railway Dashboard → Your service → Domains |
| `RESEND_API_KEY` | Resend Dashboard → API Keys |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API |

---

## 🎯 Quick Start Commands

### **After Setting Environment Variables:**

Railway will auto-deploy when you push to git.

**Manual Redeploy:**
1. Go to Railway Dashboard
2. Click your service
3. Click "Deploy" → "Redeploy"

**View Logs:**
1. Railway Dashboard → Deployments
2. Click latest deployment
3. Click "View Logs"

---

## ✅ Final Verification

Once everything is configured, verify:

```bash
# 1. Can you access the homepage?
https://your-app.railway.app

# 2. Can you access Sanity Studio?
https://your-app.railway.app/studio

# 3. Can you browse products?
https://your-app.railway.app/en/products

# 4. Can you add to cart and checkout?
# - Add product to cart
# - Go to checkout
# - Fill form
# - Click "Proceed to Payment"
# - Stripe Checkout should open

# 5. Test payment (use test card even in live mode for testing):
# Card: 4242 4242 4242 4242
# Expiry: Any future date
# CVC: Any 3 digits

# 6. Check success page
https://your-app.railway.app/en/checkout/success

# 7. Check Supabase for order
# Go to Supabase → Table Editor → orders

# 8. Check email inbox for confirmation
```

---

## 📞 Need Help?

If something still doesn't work:

1. **Check Railway logs** for specific error messages
2. **Check Stripe webhook logs** for webhook failures
3. **Check Sanity API logs** for authentication errors
4. **Check browser console** (F12) for client-side errors

---

**Generated:** October 11, 2025  
**Status:** Ready for Production Deployment 🚀

