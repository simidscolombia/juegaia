-- ⚠️ DANGER: THIS WILL ERASE ALL GAME AND FINANCIAL DATA ⚠️
-- Use this to "Start Fresh" (Production Ready)

-- 1. Transactions & Money
TRUNCATE TABLE transactions CASCADE;
TRUNCATE TABLE commissions CASCADE;

-- 2. Reset Wallets (Set all to 0)
UPDATE wallets SET balance = 0;

-- 3. Game Data (Bingos & Raffles)
TRUNCATE TABLE bingo_players CASCADE;
TRUNCATE TABLE bingo_games CASCADE;

TRUNCATE TABLE tickets CASCADE;
TRUNCATE TABLE raffles CASCADE;

-- 4. Profiles (Optional - Uncomment if you want to clear profiles, but NOT auth users)
-- TRUNCATE TABLE profiles CASCADE; 
-- If you truncate profiles, you must re-run the Admin Setup script immediately!

-- 5. Confirmation
SELECT 'System Reset Complete. Users kept, data wiped.' as status;
