-- Smackin OS — rename base seeds to match Adriana's Seed Inventory tab (Matt's request).
-- White = Low Salt (material #4523); Brown = Standard Salt / Processed (material #4524).
-- Extreme, 7% Salt, and Tote (#4305) are left unchanged (distinct salt tiers).
-- The display chip shows the trailing parentheses, so these read "Low Salt" / "Standard Salt".
-- Run in the Supabase SQL Editor (Inventory Project). Display-only: no rack/stock rows touched.

update items set name = 'Sunflower Seed - White (Low Salt)'      where id = 'SEED-WHITE';
update items set name = 'Sunflower Seed - Brown (Standard Salt)' where id = 'SEED-BROWN';

-- verify
select id, name from items where id in ('SEED-WHITE','SEED-BROWN') order by id;
