-- Migration: Drop tax_id column from clients table
-- Date: 2026-01-16
-- Description: Simplify business clients by removing the tax_id field

ALTER TABLE clients DROP COLUMN IF EXISTS tax_id;
