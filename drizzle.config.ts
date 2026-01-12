import type { Config } from 'drizzle-kit';

export default {
  schema: './lib/db/schema.ts',
  out: './lib/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  // We only use Drizzle for schema introspection, not for running migrations
  // Migrations are handled manually via Supabase SQL Editor
} satisfies Config;

