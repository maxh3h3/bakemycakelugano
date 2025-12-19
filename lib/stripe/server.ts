import Stripe from 'stripe';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

if (!stripeSecretKey) {
  console.error('⚠️  STRIPE_SECRET_KEY environment variable is missing');
  // Don't throw during build time - allow pages to render
  // Only throw when actually trying to use Stripe
}

// Server-side Stripe instance
// Use this ONLY in API routes and server components
export const stripe = stripeSecretKey 
  ? new Stripe(stripeSecretKey, {
      apiVersion: '2025-10-29.clover',
      typescript: true,
    })
  : null as any; // Gracefully handle missing key

