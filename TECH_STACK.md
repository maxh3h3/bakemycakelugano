# 🛠️ Tech Stack - Bake My Cake

Comprehensive overview of technologies used and why they were chosen.

---

## 🎯 Architecture Pattern

**Hybrid Headless CMS + Traditional Backend**

- **Content (Products)** → Sanity (Headless CMS)
- **Transactions (Orders)** → Supabase (PostgreSQL)
- **Frontend** → Next.js (React Framework)
- **Hosting** → Railway (PaaS)

---

## 📦 Technology Decisions

### **Frontend Framework: Next.js 14**

**Why Next.js?**
- ✅ **Server-Side Rendering (SSR)** - Better SEO for local bakery discoverability
- ✅ **App Router** - Modern React architecture with Server Components
- ✅ **ISR (Incremental Static Regeneration)** - Fast pages that update automatically
- ✅ **API Routes** - Built-in backend for checkout/webhooks
- ✅ **Image Optimization** - Automatic WebP conversion, lazy loading
- ✅ **TypeScript Support** - Type safety out of the box
- ✅ **File-based Routing** - Intuitive page structure

**Alternatives Considered:**
- ❌ **Vanilla React (Vite)** - No SSR, worse SEO, need separate backend
- ❌ **Remix** - Good but steeper learning curve, less ecosystem
- ❌ **Gatsby** - Static site generator, slower builds, less flexible

**Version:** Next.js 14 (App Router)

---

### **Content Management: Sanity.io**

**Why Sanity?**
- ✅ **No Code Admin Panel** - Owner can manage products without developer
- ✅ **Real-time Updates** - Changes appear instantly
- ✅ **Structured Content** - Define schemas in code, UI auto-generates
- ✅ **Image CDN** - Automatic optimization, cropping, transformations
- ✅ **Built-in Auth** - No need to build authentication
- ✅ **GROQ Queries** - Powerful query language
- ✅ **Version History** - Undo accidental changes
- ✅ **Free Tier** - Generous limits for small business

**Alternatives Considered:**
- ❌ **WordPress** - Outdated tech, security issues, heavy, not headless
- ❌ **Strapi** - Good but requires self-hosting, more maintenance
- ❌ **Contentful** - Expensive ($299/month for features we need)
- ❌ **Custom Admin Panel** - Would take weeks to build properly

**Use Case:** Products, Categories, Page Content, Images

---

### **Database: Supabase (PostgreSQL)**

**Why Supabase?**
- ✅ **PostgreSQL** - Industry-standard relational database
- ✅ **Real-time Subscriptions** - Order updates in real-time
- ✅ **Auto-generated APIs** - REST and GraphQL endpoints
- ✅ **Built-in Auth** - For owner dashboard login
- ✅ **Row-Level Security** - Fine-grained access control
- ✅ **Free Tier** - 500MB database, generous for orders
- ✅ **Hosted** - No server maintenance

**Alternatives Considered:**
- ❌ **Firebase Firestore** - NoSQL, harder for relational order data
- ❌ **PlanetScale** - Good but more expensive
- ❌ **Self-hosted PostgreSQL** - More work, need to manage backups
- ❌ **MongoDB** - NoSQL not ideal for transactional data

**Use Case:** Orders, Order Items, Customer Data

**Why Not Store Orders in Sanity?**
- Sanity is for *content*, not *transactional data*
- Orders need ACID compliance
- Need complex queries (filter by date, status, customer)
- Relational structure (orders ↔ order items)

---

### **Styling: Tailwind CSS + shadcn/ui**

**Why Tailwind?**
- ✅ **Utility-First** - Fast development, no CSS files
- ✅ **Design System** - Consistent spacing, colors, typography
- ✅ **Responsive** - Mobile-first by default
- ✅ **Purges Unused CSS** - Small bundle size
- ✅ **Customizable** - Easy to define brand colors

**Why shadcn/ui?**
- ✅ **Copy-Paste Components** - Not a dependency, you own the code
- ✅ **Radix UI Based** - Accessible by default (WCAG compliant)
- ✅ **Customizable** - Full control over styles
- ✅ **Beautiful** - Modern, elegant components
- ✅ **TypeScript** - Type-safe props

**Alternatives Considered:**
- ❌ **Bootstrap** - Outdated look, heavy, harder to customize
- ❌ **Material-UI** - Google design language, not minimalistic enough
- ❌ **Chakra UI** - Good but heavier bundle size
- ❌ **CSS Modules** - More boilerplate, slower development

---

### **Payments: Stripe**

**Why Stripe?**
- ✅ **Industry Standard** - Trusted by millions
- ✅ **Stripe Checkout** - Pre-built payment UI
- ✅ **PCI Compliant** - Card data never touches our server
- ✅ **Webhooks** - Reliable order confirmation
- ✅ **Test Mode** - Easy development workflow
- ✅ **Multiple Payment Methods** - Cards, Apple Pay, Google Pay
- ✅ **Excellent Docs** - Best-in-class documentation

**Alternatives Considered:**
- ❌ **PayPal** - Worse UX, customer leaves site
- ❌ **Square** - Less flexible for custom integrations
- ❌ **Manual Bank Transfer** - No automation, poor UX

**Pricing:** 2.9% + $0.30 per transaction (standard)

---

### **Email: Resend**

**Why Resend?**
- ✅ **Modern API** - Best developer experience
- ✅ **React Email** - Build emails with React components
- ✅ **Reliable Delivery** - High inbox rate
- ✅ **Free Tier** - 3,000 emails/month (plenty for bakery)
- ✅ **Simple Pricing** - $20/month for 50k emails if needed
- ✅ **Great DX** - Easy to test and debug

**Alternatives Considered:**
- ❌ **SendGrid** - More complex API, older
- ❌ **AWS SES** - Cheaper but worse DX, needs AWS setup
- ❌ **Postmark** - Good but more expensive
- ❌ **Nodemailer + Gmail** - Unreliable, hits limits quickly

**Use Cases:**
- Order confirmation to customer
- New order notification to owner

---

### **Notifications: Telegram Bot**

**Why Telegram?**
- ✅ **Instant Delivery** - Push notifications to owner's phone
- ✅ **Free** - No cost for notifications
- ✅ **Simple API** - Easy webhook integration
- ✅ **Reliable** - Better than SMS
- ✅ **No App Required** - Uses existing Telegram app
- ✅ **Rich Formatting** - Can send formatted messages, images

**Alternatives Considered:**
- ❌ **SMS (Twilio)** - Costs money per message
- ❌ **Slack** - Owner likely doesn't use Slack
- ❌ **WhatsApp Business** - More complex API
- ❌ **Discord** - Less common for personal use

**Use Case:** Instant alert to owner's phone when new order placed

---

### **Hosting: Railway**

**Why Railway?**
- ✅ **Easy Deployment** - Git push to deploy
- ✅ **No Configuration** - Auto-detects Next.js
- ✅ **Fair Pricing** - Pay for what you use, ~$5-10/month
- ✅ **Great DX** - Beautiful dashboard, good logs
- ✅ **Built-in Database** - Can add PostgreSQL if needed
- ✅ **Automatic HTTPS** - SSL certificates included
- ✅ **Custom Domains** - Easy to configure

**Alternatives Considered:**
- ❌ **Vercel** - You wanted to try something new
- ❌ **Netlify** - Better for static sites, serverless limits
- ❌ **AWS EC2** - Too much DevOps work
- ❌ **DigitalOcean App Platform** - Similar but less polished
- ❌ **Heroku** - More expensive now

**Cost Estimate:**
- Development: Free (trial credits)
- Production: ~$5-20/month depending on traffic

---

### **Maps: Google Maps Embed API**

**Why Google Maps?**
- ✅ **Familiar UI** - Everyone knows Google Maps
- ✅ **Free Tier** - Embed API is free for basic use
- ✅ **Reliable** - Best map data
- ✅ **Easy Integration** - Simple iframe embed

**Alternatives Considered:**
- ❌ **Mapbox** - More expensive, overkill for simple embed
- ❌ **OpenStreetMap** - Less polished, worse for business listings

**Use Case:** Show bakery location on Contact page

---

## 🔄 Data Flow Overview

### **Content Flow (Products)**
```
Owner → Sanity Studio → Sanity Cloud → Next.js (ISR) → Customer
```

### **Order Flow**
```
Customer → Cart → Stripe Checkout → Webhook → 
  → Save to Supabase
  → Email via Resend
  → Telegram Notification
  → Confirmation to Customer
```

---

## 💰 Cost Breakdown

### **Development (Free)**
| Service | Plan | Cost |
|---------|------|------|
| Sanity | Free | $0 |
| Supabase | Free | $0 |
| Railway | Trial | $0 |
| Stripe | Test Mode | $0 |
| Resend | Free | $0 |
| Telegram | - | $0 |
| Google Maps | Embed | $0 |
| **Total** | | **$0/month** |

### **Production (Estimated)**
| Service | Plan | Cost |
|---------|------|------|
| Sanity | Free | $0 |
| Supabase | Free | $0 |
| Railway | Pay-as-you-go | $5-20 |
| Stripe | Per transaction | 2.9% + $0.30 |
| Resend | Free (3k emails) | $0 |
| Telegram | - | $0 |
| Google Maps | Embed | $0 |
| **Total** | | **~$5-20/month + tx fees** |

---

## 🔐 Security Considerations

### **Authentication**
- **Owner Login:** Supabase Auth (email + password)
- **Studio Access:** Sanity's built-in auth
- **No Customer Auth:** Checkout as guest

### **Data Security**
- ✅ All services use HTTPS
- ✅ Environment variables for secrets
- ✅ Stripe handles card data (PCI compliant)
- ✅ API routes rate-limited
- ✅ Supabase RLS policies
- ✅ CORS configured properly

### **Best Practices**
- Webhook signature verification
- Server-side validation
- SQL injection prevention (Supabase handles)
- XSS protection (React handles)
- CSRF tokens (Next.js handles)

---

## 📊 Performance Optimizations

### **Frontend**
- ✅ **ISR** - Pages cached, revalidated every X seconds
- ✅ **Image Optimization** - Next.js automatic optimization
- ✅ **Lazy Loading** - Images load as needed
- ✅ **Code Splitting** - Only load needed JavaScript
- ✅ **Prefetching** - Next.js prefetches linked pages

### **Backend**
- ✅ **Sanity CDN** - Global content delivery
- ✅ **Edge Functions** - Deploy API routes to edge (if needed)
- ✅ **Database Indexing** - Fast queries on Supabase
- ✅ **Connection Pooling** - Supabase handles

### **Expected Performance**
- **Time to First Byte (TTFB):** < 200ms
- **Largest Contentful Paint (LCP):** < 2.5s
- **First Input Delay (FID):** < 100ms
- **Cumulative Layout Shift (CLS):** < 0.1
- **Lighthouse Score:** 90+ on all metrics

---

## 🌍 Scalability

### **Can Handle:**
- ✅ 1,000+ concurrent users
- ✅ 10,000+ products (Sanity)
- ✅ 100,000+ orders (Supabase)
- ✅ High traffic spikes (Railway auto-scales)

### **Bottlenecks (Unlikely for Bakery):**
- Sanity API calls (500k/month free)
- Supabase database size (500MB free)
- Railway compute resources

### **Scaling Path:**
- Sanity: Upgrade to Growth ($99/month) for 5M requests
- Supabase: Upgrade to Pro ($25/month) for 8GB database
- Railway: Auto-scales with usage-based pricing

---

## 🧪 Testing Strategy

### **Manual Testing**
- Browser testing (Chrome, Safari, Firefox)
- Mobile testing (iOS, Android)
- Payment flow testing (Stripe test cards)

### **Automated Testing (Future)**
- Unit tests: Jest + React Testing Library
- E2E tests: Playwright
- API tests: Vitest

---

## 📱 Mobile Responsiveness

### **Approach**
- **Mobile-First Design** - Built for small screens first
- **Responsive Breakpoints:**
  - `sm`: 640px (tablet)
  - `md`: 768px (small desktop)
  - `lg`: 1024px (desktop)
  - `xl`: 1280px (large desktop)

### **Mobile Features**
- Touch-optimized buttons (44px min)
- Swipeable product galleries
- Mobile-friendly checkout
- Apple Pay / Google Pay support
- PWA capabilities (add to home screen)

---

## 🎨 Design Tokens

### **Colors**
```typescript
const colors = {
  cream: {
    50: '#FDFCFB',
    100: '#F9F6F1',
    200: '#F5E6D3',  // Primary
  },
  rose: {
    200: '#FFD4D4',  // Secondary
  },
  brown: {
    500: '#8B6B47',  // Accent
  },
  charcoal: {
    900: '#2C2C2C',  // Text
  }
}
```

### **Typography**
```typescript
const fonts = {
  heading: 'Playfair Display, serif',
  body: 'Inter, sans-serif',
}

const sizes = {
  xs: '0.75rem',   // 12px
  sm: '0.875rem',  // 14px
  base: '1rem',    // 16px
  lg: '1.125rem',  // 18px
  xl: '1.25rem',   // 20px
  '2xl': '1.5rem', // 24px
  '3xl': '1.875rem', // 30px
  '4xl': '2.25rem',  // 36px
  '5xl': '3rem',     // 48px
}
```

### **Spacing**
Tailwind's default scale (0.25rem base unit)

---

## 🚀 Deployment Workflow

### **Development → Production**

1. **Local Development**
   ```bash
   npm run dev
   # Test at localhost:3000
   ```

2. **Git Commit**
   ```bash
   git add .
   git commit -m "Feature: ..."
   git push origin main
   ```

3. **Automatic Deploy**
   - Railway detects push
   - Runs build: `npm run build`
   - Runs tests (if configured)
   - Deploys to production
   - Zero downtime

4. **Post-Deploy**
   - Check Railway logs
   - Test live site
   - Monitor errors (Railway dashboard)

---

## 📚 Learning Resources

### **Next.js**
- [Official Docs](https://nextjs.org/docs)
- [Learn Next.js](https://nextjs.org/learn)

### **Sanity**
- [Sanity Docs](https://www.sanity.io/docs)
- [GROQ Cheat Sheet](https://www.sanity.io/docs/query-cheat-sheet)

### **Supabase**
- [Supabase Docs](https://supabase.com/docs)
- [JavaScript Client](https://supabase.com/docs/reference/javascript)

### **Stripe**
- [Stripe Docs](https://stripe.com/docs)
- [Checkout Quickstart](https://stripe.com/docs/checkout/quickstart)

### **Tailwind**
- [Tailwind Docs](https://tailwindcss.com/docs)
- [shadcn/ui](https://ui.shadcn.com)

---

## ✅ Why This Stack Works for a Bakery

1. **Owner Friendly**
   - Sanity Studio = No coding required
   - Beautiful, intuitive UI
   - Mobile-friendly admin

2. **Customer Friendly**
   - Fast loading (ISR + CDN)
   - Smooth checkout (Stripe)
   - Mobile responsive
   - Modern, elegant design

3. **Developer Friendly**
   - TypeScript = Less bugs
   - Modern tools = Fast development
   - Good docs = Easy to maintain

4. **Budget Friendly**
   - $0-20/month hosting
   - Only pay Stripe fees on sales
   - No big upfront costs

5. **Reliable**
   - Proven technologies
   - Managed services (less maintenance)
   - Auto-scaling infrastructure

6. **Future-Proof**
   - Easy to add features
   - Can scale as business grows
   - Modern, maintained tech

---

**This stack = Build fast, deploy easily, scale smoothly. Perfect for a small bakery going online. 🍰**

