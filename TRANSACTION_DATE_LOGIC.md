# Transaction Date Logic - Accounting Best Practices

## Overview

The system uses different date logic for financial transactions depending on the payment source, following standard accounting principles.

## Implementation Details

### 1. Manual Payments (mark-paid endpoint)
**Transaction date = Payment received date (TODAY)**

```typescript
// app/api/admin/orders/[id]/mark-paid/route.ts
createdAt: new Date().toISOString() // Uses current date/time
```

**Rationale:**
- ✅ Follows **cash accounting** principle
- ✅ Records revenue when payment actually received
- ✅ Accurate for tax reporting (money in bank = revenue)
- ✅ Handles delayed payments correctly
- ✅ Prevents backdating transactions

**Example scenarios:**
```
Order created: Jan 15
Customer pays: Jan 20
Transaction date: Jan 20 ✅ (cash received on Jan 20)

Order created: Dec 28, 2023
Customer pays: Jan 5, 2024
Transaction date: Jan 5, 2024 ✅ (affects correct tax year)
```

---

### 2. Stripe Payments (webhook endpoint)
**Transaction date = Order creation date**

```typescript
// app/api/webhooks/stripe/route.ts
createdAt: order.created_at // Uses order timestamp
```

**Rationale:**
- ✅ Payment happens within seconds of order creation
- ✅ Order date = Payment date for online transactions
- ✅ Maintains consistency between order and transaction
- ✅ Accurate for immediate payment scenarios

**Example scenario:**
```
Order created: Jan 15 10:30:00
Payment processed: Jan 15 10:30:03 (3 seconds later)
Transaction date: Jan 15 ✅ (essentially simultaneous)
```

---

## Accounting Principles

### Cash vs Accrual Accounting

| Method | When Revenue Recorded | Best For |
|--------|----------------------|----------|
| **Cash** (our approach) | When payment received | Small businesses, tax reporting, cash flow |
| **Accrual** | When order created | Large enterprises, GAAP compliance |

**Why cash accounting for a bakery:**
1. Revenue matches actual money in bank
2. Simpler tax reporting (cash basis)
3. Better cash flow visibility
4. Common practice for small food businesses
5. No "accounts receivable" complexity

---

## Edge Cases Handled

### Retroactive Payments
```
Old unpaid order: Oct 15, 2023
Marked as paid: Jan 20, 2024
Transaction date: Jan 20, 2024 ✅ (revenue in correct period)
```

### Multiple Payment Attempts
```
Order created: Jan 15
First attempt (failed): Jan 15
Marked as paid manually: Jan 18
Transaction date: Jan 18 ✅ (when actually paid)
```

### Delayed In-Store Payments
```
Phone order: Jan 10
Customer picks up and pays: Jan 12
Transaction date: Jan 12 ✅ (when cash received)
```

---

## Database Fields

Financial transactions store both dates:

```typescript
{
  date: '2024-01-20',           // Payment received date (for accounting)
  created_at: '2024-01-20T...',  // Record creation timestamp (for audit)
}
```

- `date`: Used for financial reports, revenue calculations, tax periods
- `created_at`: Used for audit trail, when record was logged

---

## Tax & Legal Considerations

### Switzerland Tax Reporting
- VAT reporting uses **cash basis** by default for small businesses
- Revenue recognized when payment received
- Matches our implementation ✅

### Audit Trail
- Order creation date: `orders.created_at`
- Payment received date: `financial_transactions.date`
- Transaction recorded date: `financial_transactions.created_at`
- Full paper trail maintained ✅

---

## Future Considerations

### If Switching to Accrual Accounting (unlikely for bakery):
```typescript
// Would need to change:
createdAt: order.created_at // Use order date instead of today
```

### If Adding Invoice System:
```typescript
// Would track:
- invoice_date: When invoice sent
- due_date: When payment expected  
- payment_date: When actually paid (current implementation)
```

---

## Related Files

- **Transaction creation:** `lib/accounting/transactions.ts`
- **Manual payment:** `app/api/admin/orders/[id]/mark-paid/route.ts`
- **Stripe payment:** `app/api/webhooks/stripe/route.ts`
- **Database schema:** `supabase/migrations/018_create_financial_transactions.sql`

---

## Testing Recommendations

Verify correct date logic:

1. **Test delayed payment:**
   - Create order on day 1
   - Mark paid on day 5
   - Check transaction has day 5 date ✅

2. **Test Stripe payment:**
   - Create order via Stripe
   - Check transaction has order creation date ✅

3. **Test year-end boundary:**
   - Create order Dec 30
   - Mark paid Jan 2
   - Verify transaction in new year ✅

4. **Check accounting reports:**
   - Monthly revenue should match actual payments received
   - Not when orders were created ✅
