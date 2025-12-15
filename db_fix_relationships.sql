-- ==========================================
-- FIX RELATIONSHIPS FOR SUPABASE CLIENT
-- The JS client needs explicit FKs to 'profiles' to expand data easily
-- ==========================================

-- 1. FIX BINGO GAMES RELATIONSHIP
-- Drop referencing auth.users if exists and point to profiles
ALTER TABLE bingo_games 
DROP CONSTRAINT IF EXISTS bingo_games_owner_id_fkey;

-- Re-add constraint pointing to PROFILES
ALTER TABLE bingo_games 
ADD CONSTRAINT bingo_games_owner_id_fkey 
FOREIGN KEY (owner_id) 
REFERENCES profiles(id) 
ON DELETE CASCADE; -- If profile/user is deleted, game is deleted (or handle as needed)


-- 2. FIX RAFFLES RELATIONSHIP
ALTER TABLE raffles 
DROP CONSTRAINT IF EXISTS raffles_owner_id_fkey;

ALTER TABLE raffles 
ADD CONSTRAINT raffles_owner_id_fkey 
FOREIGN KEY (owner_id) 
REFERENCES profiles(id) 
ON DELETE CASCADE;


-- 3. FIX WALLETS RELATIONSHIP
-- Check existing constraint name usually "wallets_user_id_fkey"
ALTER TABLE wallets 
DROP CONSTRAINT IF EXISTS wallets_user_id_fkey;

ALTER TABLE wallets 
ADD CONSTRAINT wallets_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES profiles(id) 
ON DELETE CASCADE;


-- 4. REFRESH SCHEMA CACHE (METADATA)
-- Supabase sometimes caches things. Reloading the schema is forced by notifying pgrst.
NOTIFY pgrst, 'reload config';
