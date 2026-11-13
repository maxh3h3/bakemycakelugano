-- ============================================
-- ADD PRICE LIST TO CLIENTS
-- ============================================
-- Business clients (restaurants, cafés) order the same few positions at
-- agreed prices. Until now those positions lived hardcoded in
-- components/admin/QuickSaleModal.tsx. They now live on the client row and
-- the owner edits them from the client card.
--
-- Shape: [{ "name": "Matcha Tiramisu", "price": 3.5 }, ...]  (price in CHF)
-- A business client with at least one position shows up in the quick sale modal.

ALTER TABLE clients
ADD COLUMN IF NOT EXISTS price_list JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN clients.price_list IS
  'Agreed positions for business clients: [{name, price}] in CHF. Non-empty = client appears in the admin quick sale modal.';

-- Seed with the lists that were hardcoded in QuickSaleModal (same names + prices).
UPDATE clients SET price_list = '[
  {"name": "Matcha Cake", "price": 72},
  {"name": "Mango Cheesecake", "price": 30},
  {"name": "Pasticcini Drago", "price": 5}
]'::jsonb
WHERE id = '9323a8bb-6ec4-481c-b040-aa762dc626bd' AND price_list = '[]'::jsonb; -- Toku Ramen

UPDATE clients SET price_list = '[
  {"name": "Chocolate Cake", "price": 3.3},
  {"name": "Matcha Tiramisu", "price": 3.5}
]'::jsonb
WHERE id = '436d282e-5d77-4e70-b767-91fcbcf8a2b7' AND price_list = '[]'::jsonb; -- Noizu Ramen

UPDATE clients SET price_list = '[
  {"name": "Matcha Crepe Cake", "price": 40},
  {"name": "Japanese Cheesecake", "price": 30},
  {"name": "San Sebastian Cheesecake", "price": 40}
]'::jsonb
WHERE id = '380d7bbd-5fa3-459a-a76c-be035c777a09' AND price_list = '[]'::jsonb; -- Kohi House

-- ============================================
-- MIGRATION COMPLETE ✅
-- ============================================
