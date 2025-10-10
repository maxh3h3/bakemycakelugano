import { loadStripe, Stripe } from '@stripe/stripe-js';

let stripePromise: Promise<Stripe | null>;

// Client-side Stripe instance
export const getStripe = () => {
  if (!stripePromise) {
    const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    if (!key) {
      throw new Error('Missing NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY');
    }
    stripePromise = loadStripe(key);
  }
  return stripePromise;
};

