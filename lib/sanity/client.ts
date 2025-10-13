import { createClient } from 'next-sanity';

// Validate required environment variables
const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || 'production';

if (!projectId) {
  console.error('❌ Missing NEXT_PUBLIC_SANITY_PROJECT_ID environment variable');
  throw new Error('Missing required Sanity configuration. Please check your environment variables.');
}

export const client = createClient({
  projectId,
  dataset,
  apiVersion: process.env.SANITY_API_VERSION || '2024-01-01',
  // Disable CDN for more reliable data fetching
  // CDN can cause issues if not properly configured in production
  useCdn: false,
  perspective: 'published',
  token: process.env.SANITY_API_TOKEN,
  stega: {
    enabled: false,
    studioUrl: '/studio',
  },
});

