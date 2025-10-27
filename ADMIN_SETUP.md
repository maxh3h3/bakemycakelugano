# 🔐 Admin Authentication Setup Guide

Complete guide for setting up the admin dashboard for Bake My Cake.

---

## 📋 Overview

The admin system uses **session-based authentication** with a hardcoded password stored in environment variables. No database operations are required for authentication - just password comparison and encrypted cookie storage.

### Features
- ✅ Simple login page with password field
- ✅ "Remember Me" checkbox (7 days vs 24 hours)
- ✅ Encrypted session cookies (httpOnly, secure)
- ✅ Server-side validation
- ✅ Protected admin routes with automatic redirect
- ✅ Orders dashboard with search & filtering
- ✅ Logout functionality

---

## 🚀 Quick Start

### 1. Add Environment Variables

Add these variables to your `.env.local` file:

```bash
# Admin Authentication
ADMIN_PASSWORD=your-chosen-password-here
SESSION_SECRET=your-long-random-string-for-encryption

# Make sure these are also set (from Supabase setup)
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-key
```

### 2. Generate Session Secret

⚠️ **IMPORTANT: Don't confuse these two:**

| Variable | Purpose | Length Requirement |
|----------|---------|-------------------|
| `ADMIN_PASSWORD` | What you type to login | **Any length** (e.g., 6+ chars is fine) |
| `SESSION_SECRET` | Encryption key for cookies | **Must be 32+ characters** (iron-session requirement) |

**Generate SESSION_SECRET:**

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

This will output something like: `a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6`

**Example `.env.local` file:**
```bash
# Your login password - can be short and memorable (6+ chars recommended)
ADMIN_PASSWORD=Cake123

# Encryption key - MUST be 32+ chars (auto-generated, never memorize this)
SESSION_SECRET=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 3. Test the Login

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Visit the admin login page:
   ```
   http://localhost:3000/en/admin/login
   ```
   (Or use `/it/admin/login` for Italian)

3. Enter your password (the one you set in `ADMIN_PASSWORD`)

4. Check "Remember me" if you want to stay logged in for 7 days

5. Click "Login" - you should be redirected to `/admin/orders`

---

## 🔒 Security Features

### Password Protection
- Password stored in environment variables only
- Never committed to git (`.env.local` is in `.gitignore`)
- Server-side validation only
- No password in URLs or client-side code

### Session Management
- Encrypted cookies using `iron-session`
- httpOnly flag (can't be accessed by JavaScript)
- Secure flag in production (HTTPS only)
- SameSite protection against CSRF
- Automatic expiration (7 days with "Remember me", 1 day without)

### Route Protection
- All `/admin/*` routes are protected (except `/admin/login`)
- Server-side session validation on every page load
- Automatic redirect to login if not authenticated
- Session destroyed on logout

---

## 📱 Using the Admin Dashboard

### Login Flow
1. Visit any `/en/admin/*` or `/it/admin/*` route
2. If not logged in → Redirected to `/[locale]/admin/login`
3. Enter password + optionally check "Remember me"
4. Successful login → Redirected to `/[locale]/admin/orders`

**Note:** All admin URLs include the locale prefix (`/en/` or `/it/`) because your site uses internationalization.

### Orders Dashboard (`/en/admin/orders`)

**Stats Cards:**
- Total Orders count
- Pending orders count
- Preparing orders count
- Completed orders count

**Search & Filter:**
- Search by customer name, email, or order ID
- Filter by status (all, pending, confirmed, preparing, ready, completed, cancelled)

**Orders Display:**
- Expandable order cards
- Click any order to see full details
- Each order shows:
  - Order ID and timestamp
  - Customer information
  - Delivery details
  - Payment status
  - All order items with images
  - Special instructions

**Mobile Responsive:**
- Table view on desktop
- Card view on mobile
- Touch-friendly interactions

### Logout
- Click "Logout" button in header
- Session destroyed
- Redirected to login page

---

## 🛠️ Technical Details

### File Structure
```
app/
  admin/
    login/
      page.tsx              # Login form page
    orders/
      page.tsx              # Orders dashboard (protected)
    layout.tsx              # Admin layout with session check
  api/admin/
    login/route.ts          # Login API endpoint
    logout/route.ts         # Logout API endpoint

components/admin/
  AdminHeader.tsx           # Header with logout button
  OrdersTable.tsx           # Orders display component

lib/auth/
  session.ts                # Session management utilities
```

### Session Cookie Structure
```typescript
{
  isAdmin: boolean          // True if authenticated
  rememberMe: boolean       // User's preference
  createdAt: number         // Timestamp
  expiresAt: number         // Expiration timestamp
}
```

### Database Queries
The orders page fetches data from Supabase:
```typescript
await supabaseAdmin
  .from('orders')
  .select('*, order_items(*)')
  .order('created_at', { ascending: false });
```

---

## 🔄 Password Management

### Changing the Password

1. Update `.env.local`:
   ```bash
   ADMIN_PASSWORD=NewPassword123
   ```

2. Restart your development server:
   ```bash
   npm run dev
   ```

3. Log out from admin dashboard

4. Log back in with new password

### For Production (Railway)

1. Go to your Railway project
2. Navigate to Variables tab
3. Add/update:
   - `ADMIN_PASSWORD` = your secure password
   - `SESSION_SECRET` = your generated secret
4. Redeploy your application

---

## 🚨 Important Security Notes

### DO NOT:
- ❌ Commit `.env.local` to git
- ❌ Share your `ADMIN_PASSWORD` publicly
- ❌ Use a simple password like "admin" or "password"
- ❌ Share your `SESSION_SECRET`
- ❌ Use the same password for multiple environments

### DO:
- ✅ Use a strong, unique password
- ✅ Keep `.env.local` in `.gitignore`
- ✅ Use different passwords for dev/staging/production
- ✅ Store production credentials securely (Railway/Vercel dashboard)
- ✅ Use HTTPS in production (automatic on Railway)

---

## 🐛 Troubleshooting

### "SESSION_SECRET must be at least 32 characters long" error
- This is about `SESSION_SECRET`, NOT your `ADMIN_PASSWORD`
- Generate a proper SESSION_SECRET with: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
- Copy the output to your `.env.local` as `SESSION_SECRET=...`
- Your `ADMIN_PASSWORD` can be any length (e.g., 6 characters is fine)
- Restart your dev server

### "Invalid password" error
- Check that `ADMIN_PASSWORD` is set in `.env.local`
- Ensure no extra spaces in the password
- Restart your dev server after changing `.env.local`

### "Missing Supabase environment variables" error
- Make sure `NEXT_PUBLIC_SUPABASE_URL` is set
- Make sure `SUPABASE_SERVICE_ROLE_KEY` is set
- Restart your dev server

### "Session expired" or keeps logging out
- Check that `SESSION_SECRET` is set and is 32+ characters
- Clear your browser cookies and try again

### Can't access `/admin/orders`
- Make sure you're logged in at `/admin/login` first
- Check browser console for errors
- Verify session cookie is being set (check DevTools → Application → Cookies)

### Orders not showing up
- Verify orders exist in Supabase database
- Check Supabase credentials are correct
- Look at server console for error messages

---

## 🎨 Customization

### Adding More Admin Pages

1. Create new page under `/app/admin/`:
   ```typescript
   // app/admin/analytics/page.tsx
   export default async function AnalyticsPage() {
     // Automatically protected by admin layout
     return <div>Analytics Dashboard</div>;
   }
   ```

2. Add link to `AdminHeader.tsx`:
   ```typescript
   <Link href="/admin/analytics">Analytics</Link>
   ```

### Changing Session Duration

Edit `lib/auth/session.ts`:
```typescript
// Change from 7 days to X days
const expirationDays = rememberMe ? 30 : 1; // 30 days if remembered
```

### Adding Multiple Admin Users

To add multiple users, you would need to:
1. Create a `admin_users` table in Supabase
2. Store hashed passwords (use bcrypt)
3. Update login logic to check against database

For now, the single-password approach is simplest for a bakery.

---

## 📊 Future Enhancements

Potential features you can add:
- [ ] Update order status from dashboard
- [ ] Print order details
- [ ] Export orders to CSV
- [ ] Sales analytics (daily/weekly/monthly)
- [ ] Popular products chart
- [ ] Email customer from dashboard
- [ ] Order notes/comments
- [ ] Multiple admin accounts
- [ ] Activity logs

---

## ✅ Production Checklist

Before deploying to production:

- [ ] Strong `ADMIN_PASSWORD` set in Railway
- [ ] Random `SESSION_SECRET` (32+ chars) set in Railway
- [ ] `.env.local` in `.gitignore`
- [ ] Test login flow
- [ ] Test logout flow
- [ ] Test session expiration
- [ ] Test orders dashboard
- [ ] Verify HTTPS is enabled
- [ ] Test on mobile devices
- [ ] Keep admin password secure (password manager)

---

## 🆘 Support

If you encounter issues:
1. Check the troubleshooting section above
2. Verify all environment variables are set correctly
3. Check browser and server console for errors
4. Review Railway logs (if deployed)

---

**Remember:** Keep your admin credentials secure and never commit them to version control!

🍰 Happy baking!

