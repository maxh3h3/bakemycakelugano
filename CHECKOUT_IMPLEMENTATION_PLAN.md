# 🛒 Checkout & Payment - Implementation Plan

## 📋 Overview

This document outlines the complete checkout and payment implementation using Stripe.

---

## 🗄️ Database Setup

### **Step 1: Update Supabase Tables**

You've created the tables, but we need to add fields for our cart features:

#### **Required Updates:**
```sql
-- Add to order_items table:
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS selected_size TEXT;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS size_label TEXT;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS delivery_date DATE;
```

#### **Why These Fields?**
- **`selected_size`**: Stores "1kg", "1.5kg", etc. (the value from ProductSize)
- **`size_label`**: Stores "1 kg for 5-8 persons" (human-readable)
- **`delivery_date`**: Each item can have its own delivery date

### **Do We Need a Separate Transactions Table?**

**Answer: No** ❌

The `orders` table already has:
- `stripe_session_id` (unique identifier)
- `stripe_payment_intent_id` (payment confirmation)
- `stripe_payment_status` (payment state)

This is sufficient for most bakery orders. A separate transactions table is only needed for:
- Multiple payments per order
- Complex refund tracking
- Multi-currency transactions
- Payment plan systems

**For your bakery: The orders table is enough!** ✅

---

## 💳 Stripe Setup

### **Step 1: Create Stripe Account**

1. Go to https://stripe.com
2. Sign up for an account
3. Complete business verification (optional for testing)
4. Get your API keys

### **Step 2: Get API Keys**

Navigate to: **Dashboard → Developers → API keys**

You'll get:
```
Test Mode:
- Publishable key: pk_test_...
- Secret key: sk_test_...

Live Mode (later):
- Publishable key: pk_live_...
- Secret key: sk_live_...
```

### **Step 3: Add to `.env.local`**

```bash
# ============================================
# STRIPE
# ============================================
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_51...
STRIPE_SECRET_KEY=sk_test_51...
STRIPE_WEBHOOK_SECRET=whsec_...  # We'll get this later
```

### **Step 4: Install Stripe SDK**

```bash
npm install stripe @stripe/stripe-js
```

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────┐
│  1. CUSTOMER FILLS CHECKOUT FORM                │
│     - Name, email, phone                        │
│     - Delivery address (or pickup)              │
│     - Special instructions                      │
│     - Reviews cart items                        │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│  2. CLICK "PAY NOW"                             │
│     → POST to /api/checkout                     │
│     → Create Stripe Checkout Session            │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│  3. REDIRECT TO STRIPE CHECKOUT                 │
│     → Customer enters card details              │
│     → Stripe processes payment                  │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│  4. STRIPE WEBHOOK FIRES                        │
│     → POST to /api/webhooks/stripe              │
│     → Event: checkout.session.completed         │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│  5. CREATE ORDER IN SUPABASE                    │
│     → Save order details                        │
│     → Save order items with sizes & dates       │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│  6. SEND NOTIFICATIONS                          │
│     → Email to customer (Resend)                │
│     → Email to owner (Resend)                   │
│     → Telegram to owner                         │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│  7. REDIRECT TO SUCCESS PAGE                    │
│     → Show order confirmation                   │
│     → Display order number                      │
│     → Clear cart                                │
└─────────────────────────────────────────────────┘
```

---

## 📄 Pages & Components to Build

### **1. Checkout Page** (`/checkout`)
- Customer info form
- Delivery address (optional)
- Order review (cart items)
- Special instructions
- Total display
- "Proceed to Payment" button

### **2. Success Page** (`/checkout/success`)
- Order confirmation
- Order details
- Thank you message
- Order number
- Email confirmation notice

### **3. Cancel Page** (`/checkout/cancel`)
- Payment cancelled message
- Return to cart button

---

## 🛠️ API Routes to Build

### **1. `/api/checkout` (POST)**
**Purpose**: Create Stripe Checkout Session

**Input**:
```typescript
{
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  deliveryType: 'pickup' | 'delivery';
  deliveryAddress?: {
    street: string;
    city: string;
    postalCode: string;
    country: string;
  };
  specialInstructions?: string;
  cartItems: CartItem[];
}
```

**Output**:
```typescript
{
  sessionId: string;  // Stripe Checkout Session ID
  url: string;        // Redirect URL to Stripe
}
```

**Flow**:
1. Validate cart items
2. Calculate total with size modifiers
3. Create line items for Stripe
4. Create Stripe Checkout Session
5. Return session URL

---

### **2. `/api/webhooks/stripe` (POST)**
**Purpose**: Handle Stripe webhook events

**Events to Handle**:
- `checkout.session.completed` - Payment successful
- `payment_intent.succeeded` - Payment confirmed
- `payment_intent.payment_failed` - Payment failed

**Flow** (for `checkout.session.completed`):
1. Verify webhook signature
2. Extract session data
3. Retrieve cart items from session metadata
4. Create order in Supabase:
   - Insert into `orders` table
   - Insert items into `order_items` table (with sizes & dates)
5. Send notifications:
   - Email to customer
   - Email to owner
   - Telegram to owner
6. Return 200 OK

---

## 🔒 Security Considerations

### **1. Webhook Signature Verification**
```typescript
const sig = req.headers['stripe-signature'];
const event = stripe.webhooks.constructEvent(
  rawBody,
  sig,
  process.env.STRIPE_WEBHOOK_SECRET
);
```

### **2. Server-Side Price Calculation**
- ❌ Never trust prices from client
- ✅ Fetch product from Sanity on server
- ✅ Calculate total server-side
- ✅ Validate against cart

### **3. Idempotency**
- Check if order with `stripe_session_id` already exists
- Prevent duplicate orders from webhook retries

---

## 💰 Stripe Checkout Session Configuration

```typescript
const session = await stripe.checkout.sessions.create({
  payment_method_types: ['card'],
  mode: 'payment',
  currency: 'chf',
  
  // Line items (products)
  line_items: [
    {
      price_data: {
        currency: 'chf',
        product_data: {
          name: 'Chocolate Cake (1.5 kg)',
          description: 'Delivery: October 15, 2024',
          images: ['https://...'],
        },
        unit_amount: 7000, // CHF 70.00 in cents
      },
      quantity: 2,
    },
  ],
  
  // Customer info
  customer_email: 'customer@example.com',
  
  // Metadata (store order details)
  metadata: {
    customerName: 'John Doe',
    customerPhone: '+41 79 123 4567',
    deliveryType: 'delivery',
    deliveryAddress: JSON.stringify({...}),
    specialInstructions: 'Please ring twice',
    cartItems: JSON.stringify([...]), // Full cart for webhook
  },
  
  // Success/Cancel URLs
  success_url: 'https://yourdomain.com/checkout/success?session_id={CHECKOUT_SESSION_ID}',
  cancel_url: 'https://yourdomain.com/checkout/cancel',
});
```

---

## 🎨 Checkout Form Design

### **Form Fields**:

**Customer Information** (Required):
- Full Name
- Email Address
- Phone Number

**Delivery Options** (Required):
- [ ] Pickup (from bakery)
- [ ] Delivery (to address)

**Delivery Address** (If delivery selected):
- Street Address
- City
- Postal Code
- Country (default: Switzerland)

**Additional**:
- Special Instructions (textarea, optional)

**Order Review**:
- List of cart items
- Sizes, quantities, dates
- Subtotal
- Total

---

## 📧 Email Notifications

### **Customer Confirmation Email**:
```
Subject: Order Confirmation - Bake My Cake

Hi [Name],

Thank you for your order!

Order #: [ORDER_ID]
Total: CHF [TOTAL]

Items:
- Chocolate Cake (1.5 kg) x2 - CHF 140.00
  Delivery: October 15, 2024

Delivery: [Pickup/Delivery]
[Address if delivery]

We'll send you an update when your order is ready!

Best regards,
Bake My Cake Team
```

### **Owner Notification Email**:
```
Subject: New Order #[ORDER_ID]

New order received!

Customer: [Name]
Email: [Email]
Phone: [Phone]

Items:
- Chocolate Cake (1.5 kg) x2 - CHF 140.00
  Delivery: October 15, 2024

Total: CHF 140.00

Delivery: [Type]
[Address if delivery]

Special instructions: [Instructions]

View in dashboard: [Link]
```

---

## 🤖 Telegram Notification

```
🎂 New Order!

Order #[ID]
💰 CHF [TOTAL]

👤 [Customer Name]
📱 [Phone]

📦 Items:
• Chocolate Cake (1.5 kg) x2
  📅 Oct 15, 2024

🚚 [Pickup/Delivery]
[Address]

📝 [Special instructions]
```

---

## 🧪 Testing Stripe

### **Test Card Numbers**:
```
Success: 4242 4242 4242 4242
Decline: 4000 0000 0000 0002
Requires 3D Secure: 4000 0025 0000 3155

Expiry: Any future date (e.g., 12/34)
CVC: Any 3 digits (e.g., 123)
ZIP: Any 5 digits (e.g., 12345)
```

### **Webhook Testing**:
```bash
# Install Stripe CLI
brew install stripe/stripe-brew/stripe

# Login
stripe login

# Forward webhooks to local
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# Get webhook signing secret from output
# Add to .env.local as STRIPE_WEBHOOK_SECRET
```

---

## 📋 Implementation Checklist

### **Phase 1: Database** ✅ (You're here)
- [x] Create orders table
- [x] Create order_items table
- [ ] Run migration to add size & date fields
- [ ] Test database connections

### **Phase 2: Stripe Setup**
- [ ] Create Stripe account
- [ ] Get API keys
- [ ] Add keys to .env.local
- [ ] Install Stripe npm packages

### **Phase 3: Checkout Page**
- [ ] Create checkout form component
- [ ] Add form validation
- [ ] Create order review component
- [ ] Add delivery type selection
- [ ] Implement "Proceed to Payment" button

### **Phase 4: API Routes**
- [ ] Create /api/checkout endpoint
- [ ] Implement Stripe session creation
- [ ] Create /api/webhooks/stripe endpoint
- [ ] Implement webhook signature verification
- [ ] Implement order creation logic

### **Phase 5: Success/Cancel Pages**
- [ ] Create success page
- [ ] Create cancel page
- [ ] Add order confirmation display

### **Phase 6: Notifications**
- [ ] Set up Resend account
- [ ] Create email templates
- [ ] Implement customer email
- [ ] Implement owner email
- [ ] Set up Telegram bot (optional)

### **Phase 7: Testing**
- [ ] Test full checkout flow
- [ ] Test with Stripe test cards
- [ ] Test webhook handling
- [ ] Test email sending
- [ ] Test edge cases

---

## 🚀 Next Steps

1. **Update Supabase schema** (add missing fields)
2. **Set up Stripe account** and get API keys
3. **Install Stripe packages**
4. **Build checkout form** (customer info + delivery)
5. **Create API routes** (checkout + webhook)
6. **Test end-to-end** with Stripe test cards

---

**Ready to start?** Let me know and I'll begin implementing! 🛒💳

