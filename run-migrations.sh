#!/bin/bash

# Script to run Supabase migrations
# Usage: ./run-migrations.sh

echo "🚀 Running Supabase Migrations..."
echo ""

# Check if SUPABASE_DB_URL is set
if [ -z "$SUPABASE_DB_URL" ]; then
  echo "⚠️  SUPABASE_DB_URL environment variable not set"
  echo ""
  echo "To use this script, set your database URL:"
  echo "export SUPABASE_DB_URL='postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres'"
  echo ""
  echo "Or use the Supabase Dashboard SQL Editor instead (easier)"
  exit 1
fi

# Run migration 010
echo "📦 Running migration 010: Create clients table..."
psql "$SUPABASE_DB_URL" -f supabase/migrations/010_create_clients_table.sql
if [ $? -eq 0 ]; then
  echo "✅ Migration 010 completed"
else
  echo "❌ Migration 010 failed"
  exit 1
fi

echo ""

# Run migration 011
echo "📦 Running migration 011: Migrate existing clients..."
psql "$SUPABASE_DB_URL" -f supabase/migrations/011_migrate_existing_clients.sql
if [ $? -eq 0 ]; then
  echo "✅ Migration 011 completed"
else
  echo "❌ Migration 011 failed"
  exit 1
fi

echo ""
echo "🎉 All migrations completed successfully!"
echo ""
echo "Next steps:"
echo "1. Restart your development server (npm run dev)"
echo "2. Try creating a new order in the admin panel"
echo "3. Check the Clients page to see migrated customers"
