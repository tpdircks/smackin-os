-- Smackin' OS inventory sync -- Adriana's Inventory 2026, as of 2026-09-28
-- Updates the 14 core finished-bag on-hand totals to match the sheet.
-- Run in Supabase SQL Editor (project otwjxqhhwljwfyqbfuxz). Review, then Run.
-- A "destructive operation" prompt appears at the end (for the duplicate cleanup) -- that's expected.

-- Single-lot bags: set on-hand to the new total  (current -> new)
update public.stock set qty=15000, updated_at=now() where item_id='BAG4-S01';   -- OG 4oz        13,100 -> 15,000
update public.stock set qty=40000, updated_at=now() where item_id='BAG4-S03';   -- BBQ 4oz       28,000 -> 40,000
update public.stock set qty=23600, updated_at=now() where item_id='BAG4-S08';   -- Ranch 4oz     24,000 -> 23,600
update public.stock set qty=8800,  updated_at=now() where item_id='BAG4-S10';   -- Lemon Pep 4oz  9,200 -> 8,800
update public.stock set qty=8800,  updated_at=now() where item_id='BAG4-S11';   -- SC&O 4oz       9,000 -> 8,800
update public.stock set qty=17000, updated_at=now() where item_id='BAG15-S01';  -- OG 1.5oz      17,250 -> 17,000
update public.stock set qty=17500, updated_at=now() where item_id='BAG15-S02';  -- CinChur 1.5oz 19,000 -> 17,500
update public.stock set qty=32500, updated_at=now() where item_id='BAG15-S03';  -- BBQ 1.5oz     32,750 -> 32,500
update public.stock set qty=5750,  updated_at=now() where item_id='BAG15-S05';  -- Dill 1.5oz     6,350 -> 5,750
update public.stock set qty=8250,  updated_at=now() where item_id='BAG15-S06';  -- Crack Pep 1.5oz 8,750 -> 8,250
update public.stock set qty=13500, updated_at=now() where item_id='BAG15-S09';  -- Maple BS 1.5oz 15,750 -> 13,500
update public.stock set qty=11250, updated_at=now() where item_id='BAG15-S10';  -- Lemon Pep 1.5oz 11,500 -> 11,250

-- Multi-lot bags (increases): add the difference so existing lots are preserved
insert into public.stock (item_id, location, lot, qty, updated_at) values
 ('BAG4-S02','RECEIVING','SYNC 09/28', 3900,  now()),   -- Cinnamon Churro 4oz  33,500 -> 37,400
 ('BAG4-S04','RECEIVING','SYNC 09/28', 10200, now());   -- Garlic Parmesan 4oz  20,000 -> 30,200

-- Housekeeping: remove the leftover duplicate Birthday Cake film item
delete from public.items where code='TMP-F4-BIRTHDAYCAKESUNFLOWER';
