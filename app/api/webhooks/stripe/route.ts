import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Stripe from 'stripe';
import { stripe } from '@/lib/stripe/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { resend, emailConfig } from '@/lib/resend/client';
import { generateCustomerConfirmationEmail } from '@/lib/resend/templates/customer-confirmation';
import { generateOwnerNotificationEmail } from '@/lib/resend/templates/owner-notification';
import { sendTelegramMessage } from '@/lib/telegram/client';
import { generateOrderNotificationMessage } from '@/lib/telegram/templates/order-notification';

// Disable body parsing, need raw body for webhook signature verification
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const body = await request.text();
  const headersList = await headers();
  const signature = headersList.get('stripe-signature');

  if (!signature) {
    return NextResponse.json(
      { error: 'No signature provided' },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    // Verify webhook signature
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    
    if (!webhookSecret) {
      console.error('STRIPE_WEBHOOK_SECRET is not set');
      // In development, you might want to skip verification
      if (process.env.NODE_ENV === 'development') {
        console.warn('⚠️  Skipping webhook signature verification in development');
        event = JSON.parse(body);
      } else {
        throw new Error('STRIPE_WEBHOOK_SECRET is not set');
      }
    } else {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    }
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json(
      { error: 'Webhook signature verification failed' },
      { status: 400 }
    );
  }

  // Handle the event
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutSessionCompleted(session);
        break;
      }

      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await handlePaymentIntentSucceeded(paymentIntent);
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log('Payment failed:', paymentIntent.id);
        // TODO: Handle payment failure (send email, update order status, etc.)
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Error handling webhook event:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  console.log('Checkout session completed:', session.id);

  // Extract metadata
  const metadata = session.metadata || {};
  const orderItems = JSON.parse(metadata.orderItems || '[]');
  const deliveryFee = parseFloat(metadata.deliveryFee || '0');
  const deliveryRequiresContact = metadata.deliveryRequiresContact === 'true';

  // Calculate total from order items
  const subtotal = orderItems.reduce((sum: number, item: any) => {
    return sum + (item.unitPrice * item.quantity);
  }, 0);
  const totalAmount = subtotal + deliveryFee;

  try {
    // Map Stripe payment_status to our database values
    // Stripe Checkout Session returns: 'paid', 'unpaid', 'no_payment_required'
    // Our DB expects: 'pending', 'processing', 'succeeded', 'failed', 'canceled'
    const mapPaymentStatus = (stripeStatus: string) => {
      switch (stripeStatus) {
        case 'paid':
          return 'succeeded';
        case 'unpaid':
          return 'pending';
        case 'no_payment_required':
          return 'succeeded';
        default:
          return 'pending';
      }
    };

    // Create order in Supabase
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert({
        stripe_session_id: session.id,
        stripe_payment_intent_id: session.payment_intent as string || null,
        stripe_payment_status: mapPaymentStatus(session.payment_status),
        customer_email: metadata.customerEmail,
        customer_name: metadata.customerName,
        customer_phone: metadata.customerPhone || null,
        total_amount: totalAmount,
        currency: 'chf',
        status: 'pending',
        delivery_type: metadata.deliveryType || null,
        delivery_date: metadata.deliveryDate || null,
        delivery_address: metadata.deliveryAddress || null,
        delivery_city: metadata.deliveryCity || null,
        delivery_postal_code: metadata.deliveryPostalCode || null,
        delivery_country: metadata.deliveryCountry || null,
        special_instructions: metadata.specialInstructions || null,
      } as any)
      .select()
      .single();

    if (orderError) {
      throw new Error(`Failed to create order: ${orderError.message}`);
    }

    console.log('Order created:', (order as any).id);

    // Create order items
    // Note: product_image_url is null since we don't store images in Stripe metadata
    // Images can be fetched from Sanity using product_id if needed for display
    const orderItemsData = orderItems.map((item: any) => ({
      order_id: (order as any).id,
      product_id: item.productId,
      product_name: item.productName,
      product_image_url: null, // Not stored in metadata to save space
      quantity: item.quantity,
      unit_price: item.unitPrice,
      subtotal: item.unitPrice * item.quantity,
      selected_size: item.selectedSize || null,
      size_label: item.sizeLabel || null,
      selected_flavour: item.selectedFlavour || null,
      flavour_name: item.flavourName || null,
    }));

    const { error: itemsError } = await supabaseAdmin
      .from('order_items')
      .insert(orderItemsData as any);

    if (itemsError) {
      throw new Error(`Failed to create order items: ${itemsError.message}`);
    }

    console.log(`Created ${orderItemsData.length} order items`);

    // Mark checkout attempt as converted
    try {
      const { error: attemptError } = await (supabaseAdmin
        .from('checkout_attempts') as any)
        .update({
          converted: true,
          order_id: (order as any).id,
          converted_at: new Date().toISOString(),
        })
        .eq('stripe_session_id', session.id);

      if (attemptError) {
        console.error('Failed to update checkout attempt:', attemptError);
        // Don't throw - order is already created, this is just analytics
      } else {
        console.log('Checkout attempt marked as converted:', session.id);
      }
    } catch (attemptError) {
      console.error('Error updating checkout attempt:', attemptError);
      // Don't throw - order creation succeeded, analytics update is not critical
    }

    // Send confirmation email to customer
    try {
      const customerEmail = generateCustomerConfirmationEmail({
        customerName: metadata.customerName,
        orderNumber: (order as any).id.slice(0, 8).toUpperCase(),
        orderItems: orderItemsData,
        totalAmount,
        deliveryType: metadata.deliveryType,
        deliveryDate: metadata.deliveryDate || null,
        deliveryAddress: metadata.deliveryAddress || null,
        deliveryCity: metadata.deliveryCity || null,
        deliveryPostalCode: metadata.deliveryPostalCode || null,
        deliveryCountry: metadata.deliveryCountry || null,
        deliveryFee,
        deliveryRequiresContact,
        specialInstructions: metadata.specialInstructions || null,
        locale: metadata.locale || 'it',
      });

      await resend.emails.send({
        from: emailConfig.from,
        to: metadata.customerEmail,
        subject: customerEmail.subject,
        html: customerEmail.html,
      });

      console.log('Customer confirmation email sent');
    } catch (emailError) {
      console.error('Failed to send customer confirmation email:', emailError);
      // Don't throw - order is already created, email is not critical
    }

    // Small delay to respect rate limits (500ms between emails)
    await new Promise(resolve => setTimeout(resolve, 500));

    // Send notification to bakery owners (both email addresses in one request)
    try {
      const ownerEmail = generateOwnerNotificationEmail({
        orderNumber: (order as any).id.slice(0, 8).toUpperCase(),
        customerName: metadata.customerName,
        customerEmail: metadata.customerEmail,
        customerPhone: metadata.customerPhone || null,
        orderItems: orderItemsData,
        totalAmount,
        deliveryType: metadata.deliveryType,
        deliveryDate: metadata.deliveryDate || null,
        deliveryAddress: metadata.deliveryAddress || null,
        deliveryCity: metadata.deliveryCity || null,
        deliveryPostalCode: metadata.deliveryPostalCode || null,
        deliveryCountry: metadata.deliveryCountry || null,
        specialInstructions: metadata.specialInstructions || null,
      });

      // Send ONE email to BOTH owner addresses (saves API requests)
      await resend.emails.send({
        from: emailConfig.from,
        to: emailConfig.ownerEmails, // Send to array of emails in single request
        subject: ownerEmail.subject,
        html: ownerEmail.html,
      });
      
      console.log(`Owner notification email sent to: ${emailConfig.ownerEmails.join(', ')}`);
    } catch (emailError) {
      console.error('Failed to send owner notification email:', emailError);
      // Don't throw - order is already created, email is not critical
    }

    // Send Telegram notification to owner
    try {
      const telegramMessage = generateOrderNotificationMessage({
        orderNumber: (order as any).id.slice(0, 8).toUpperCase(),
        customerName: metadata.customerName,
        customerEmail: metadata.customerEmail,
        customerPhone: metadata.customerPhone || null,
        orderItems: orderItemsData,
        totalAmount,
        deliveryType: metadata.deliveryType,
        deliveryDate: metadata.deliveryDate || null,
        deliveryAddress: metadata.deliveryAddress || null,
        deliveryCity: metadata.deliveryCity || null,
        deliveryPostalCode: metadata.deliveryPostalCode || null,
        deliveryCountry: metadata.deliveryCountry || null,
        specialInstructions: metadata.specialInstructions || null,
      });

      await sendTelegramMessage({
        text: telegramMessage,
        parse_mode: 'HTML',
      });

      console.log('Owner Telegram notification sent');
    } catch (telegramError) {
      console.error('Failed to send Telegram notification:', telegramError);
      // Don't throw - order is already created, Telegram is not critical
    }

  } catch (error) {
    console.error('Error creating order in database:', error);
    throw error;
  }
}

async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  console.log('Payment intent succeeded:', paymentIntent.id);

  try {
    // Update order status to 'succeeded' (matching DB constraint)
    const { error } = await (supabaseAdmin
      .from('orders') as any)
      .update({
        stripe_payment_status: 'succeeded',
        status: 'confirmed',  // Move to confirmed status when payment succeeds
        updated_at: new Date().toISOString(),
      })
      .eq('stripe_payment_intent_id', paymentIntent.id);

    if (error) {
      console.error('Failed to update order status:', error);
    } else {
      console.log('Order status updated to confirmed');
    }
  } catch (error) {
    console.error('Error updating order status:', error);
  }
}

