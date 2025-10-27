# 🚀 Admin Quick Start

## TL;DR - Get Admin Working in 2 Minutes

### Step 1: Generate SESSION_SECRET

Run this in your terminal:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the output (something like `a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6...`)

### Step 2: Add to .env.local

Create/edit `.env.local` in your project root:

```bash
# Your login password (can be any length, e.g. 6 chars)
ADMIN_PASSWORD=Cake123

# Encryption key (MUST be 32+ chars - paste what you generated above)
SESSION_SECRET=paste-your-generated-secret-here
```

### Step 3: Restart & Test

```bash
npm run dev
```

Visit: `http://localhost:3000/admin/login`

---

## ⚠️ Important: Two Different Things!

| What | Purpose | Length |
|------|---------|--------|
| **ADMIN_PASSWORD** | Your login password (what you type) | Any length (6+ recommended) |
| **SESSION_SECRET** | Encryption key (for cookies) | MUST be 32+ characters |

**Think of it like:**
- `ADMIN_PASSWORD` = Your house key (short, memorable)
- `SESSION_SECRET` = The factory serial number (long, random, never see it again)

---

## 🎯 Where to Go

- **Login (English):** `http://localhost:3000/en/admin/login`
- **Login (Italian):** `http://localhost:3000/it/admin/login`
- **Orders Dashboard:** `http://localhost:3000/en/admin/orders`
- **Full Documentation:** See `ADMIN_SETUP.md`

**Note:** Your site uses internationalization (i18n), so admin URLs include the locale (`/en/` or `/it/`)

---

## 🐛 Common Issues

**Error: "SESSION_SECRET must be at least 32 characters"**
- Generate one with: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
- This is NOT about your ADMIN_PASSWORD (which can be short)

**Can't login / "Invalid password"**
- Check ADMIN_PASSWORD is set in `.env.local`
- Restart dev server after changing `.env.local`

---

That's it! 🍰

