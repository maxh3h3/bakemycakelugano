import { pgTable, text, uuid, timestamp, numeric, boolean, date, jsonb } from 'drizzle-orm/pg-core';

// Orders table
export const orders = pgTable('orders', {
  id: uuid('id').defaultRandom().primaryKey(),
  
  // Stripe fields (optional for manual orders)
  stripeSessionId: text('stripe_session_id'),
  stripePaymentIntentId: text('stripe_payment_intent_id'),
  
  // Customer information
  customerEmail: text('customer_email'),
  customerName: text('customer_name').notNull(),
  customerPhone: text('customer_phone'),
  customerIgHandle: text('customer_ig_handle'),
  
  // Order details
  totalAmount: numeric('total_amount', { precision: 10, scale: 2 }).notNull(),
  currency: text('currency').default('CHF').notNull(),
  status: text('status').default('pending').notNull(),
  
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

// Export types
export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;
export type OrderItem = typeof orderItems.$inferSelect;
export type NewOrderItem = typeof orderItems.$inferInsert;
export type CheckoutAttempt = typeof checkoutAttempts.$inferSelect;
export type NewCheckoutAttempt = typeof checkoutAttempts.$inferInsert;

