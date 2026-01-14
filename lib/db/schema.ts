import { pgTable, text, uuid, timestamp, numeric, boolean, date, jsonb, integer } from 'drizzle-orm/pg-core';

// Clients table
export const clients = pgTable('clients', {
  id: uuid('id').defaultRandom().primaryKey(),
  
  // Basic information
  name: text('name').notNull(),
  
  // Contact methods (at least one required - enforced at application level)
  email: text('email'),
  phone: text('phone'),
  whatsapp: text('whatsapp'),
  instagramHandle: text('instagram_handle'),
  
  // Preferred contact method
  preferredContact: text('preferred_contact'),
  
  // Metadata for client relationship management
  firstOrderDate: date('first_order_date'),
  lastOrderDate: date('last_order_date'),
  totalOrders: integer('total_orders').default(0),
  totalSpent: numeric('total_spent', { precision: 10, scale: 2 }).default('0'),
  
  // Admin notes (internal only)
  notes: text('notes'),
  
  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// Orders table
export const orders = pgTable('orders', {
  id: uuid('id').defaultRandom().primaryKey(),
  
  // Client reference (replaces individual customer fields)
  clientId: uuid('client_id').references(() => clients.id, { onDelete: 'set null' }),
  
  // Stripe fields (optional for manual orders)
  stripeSessionId: text('stripe_session_id'),
  stripePaymentIntentId: text('stripe_payment_intent_id'),
  
  // Customer information (deprecated - kept for backward compatibility)
  customerEmail: text('customer_email'),
  customerName: text('customer_name').notNull(),
  customerPhone: text('customer_phone'),
  customerIgHandle: text('customer_ig_handle'),
  
  // Order details
  totalAmount: numeric('total_amount', { precision: 10, scale: 2 }).notNull(),
  currency: text('currency').default('CHF').notNull(),
  
  // Delivery information
  deliveryType: text('delivery_type'),
  deliveryDate: date('delivery_date'),
  deliveryTime: text('delivery_time'),
  deliveryAddress: jsonb('delivery_address').$type<{
    street: string;
    city: string;
    postalCode: string;
    country: string;
  } | null>(),
  
  // Additional details
  customerNotes: text('customer_notes'),
  
  // Production tracking
  orderNumber: text('order_number'),
  channel: text('channel').default('website'),
  createdByUserId: uuid('created_by_user_id'),
  
  // Payment tracking
  paid: boolean('paid').default(false),
  paymentMethod: text('payment_method'),
  
  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// Order items table
export const orderItems = pgTable('order_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  orderId: uuid('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  
  // Product information (product_id nullable for custom manual orders)
  productId: text('product_id'),
  productName: text('product_name').notNull(),
  productImageUrl: text('product_image_url'),
  
  // Pricing
  quantity: numeric('quantity', { precision: 10, scale: 2 }).notNull(),
  unitPrice: numeric('unit_price', { precision: 10, scale: 2 }).notNull(),
  subtotal: numeric('subtotal', { precision: 10, scale: 2 }).notNull(),
  
  // Product options
  selectedSize: text('selected_size'),
  sizeLabel: text('size_label'),
  selectedFlavour: text('selected_flavour'),
  flavourName: text('flavour_name'),
  
  // Production details
  productionStatus: text('production_status').default('new'),
  orderNumber: text('order_number'), // Denormalized from orders for production view
  deliveryType: text('delivery_type'), // Denormalized from orders for filtering immediate sales
  weightKg: numeric('weight_kg', { precision: 6, scale: 3 }),
  diameterCm: numeric('diameter_cm', { precision: 5, scale: 2 }),
  productCategory: text('product_category'),
  
  // Customer-facing decoration
  writingOnCake: text('writing_on_cake'),
  
  // Internal staff notes
  internalDecorationNotes: text('internal_decoration_notes'),
  staffNotes: text('staff_notes'),
  
  // Production tracking
  deliveryDate: date('delivery_date'),
  startedAt: timestamp('started_at', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  
  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// Checkout attempts table (for analytics)
export const checkoutAttempts = pgTable('checkout_attempts', {
  id: uuid('id').defaultRandom().primaryKey(),
  customerEmail: text('customer_email').notNull(),
  customerName: text('customer_name').notNull(),
  customerPhone: text('customer_phone'),
  cartItems: text('cart_items').notNull(), // JSON string
  totalAmount: numeric('total_amount', { precision: 10, scale: 2 }).notNull(),
  currency: text('currency').default('CHF').notNull(),
  deliveryType: text('delivery_type'),
  deliveryAddress: jsonb('delivery_address').$type<{
    street: string;
    city: string;
    postalCode: string;
    country: string;
  } | null>(),
  deliveryFee: numeric('delivery_fee', { precision: 10, scale: 2 }),
  specialInstructions: text('special_instructions'),
  locale: text('locale'),
  orderId: uuid('order_id'),
  converted: boolean('converted').default(false).notNull(),
  convertedAt: timestamp('converted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// Expenses table for accounting
export const expenses = pgTable('expenses', {
  id: uuid('id').defaultRandom().primaryKey(),
  
  // Expense details
  date: date('date').notNull(),
  category: text('category').notNull(), // ingredients, utilities, labor, supplies, marketing, rent, other
  amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
  currency: text('currency').default('CHF').notNull(),
  
  // Description and documentation
  description: text('description').notNull(),
  notes: text('notes'),
  receiptUrl: text('receipt_url'), // URL to receipt image in storage
  
  // Tracking
  createdByUserId: uuid('created_by_user_id'), // Admin who logged the expense
  
  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// Export types
export type Client = typeof clients.$inferSelect;
export type NewClient = typeof clients.$inferInsert;
export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;
export type OrderItem = typeof orderItems.$inferSelect;
export type NewOrderItem = typeof orderItems.$inferInsert;
export type CheckoutAttempt = typeof checkoutAttempts.$inferSelect;
export type NewCheckoutAttempt = typeof checkoutAttempts.$inferInsert;
export type Expense = typeof expenses.$inferSelect;
export type NewExpense = typeof expenses.$inferInsert;

