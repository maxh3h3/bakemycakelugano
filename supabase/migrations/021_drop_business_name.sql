-- Migration: Drop business_name column from clients table
-- Date: 2026-01-16
-- Description: Simplify business clients by removing the business_name field

ALTER TABLE clients DROP COLUMN IF EXISTS business_name;
