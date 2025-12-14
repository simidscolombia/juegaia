-- 1. Create System Settings Table (For Prices)
CREATE TABLE IF NOT EXISTS system_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    description TEXT
);

-- 2. Insert Default Prices (5,000 COP for Bingo, 2,000 for Raffle)
INSERT INTO system_settings (key, value, description) VALUES
    ('bingo_price', '5000', 'Cost to create a Bingo Game in Coins'),
    ('raffle_price', '2000', 'Cost to create a Raffle in Coins'),
    ('global_currency_name', 'JCoins', 'Name of the platform currency')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- 3. Enable RLS on Settings
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
-- Everyone can read prices (needed for UI to show cost)
CREATE POLICY "Read settings" ON system_settings FOR SELECT TO authenticated USING (true);
-- Only SuperAdmin can update (This policy relies on profiles.role)
CREATE POLICY "Admin update settings" ON system_settings FOR UPDATE TO authenticated 
    USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');


-- 4. Add Ownership to Games
-- Bingo
ALTER TABLE bingo_games ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id);
-- Raffles
ALTER TABLE raffles ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id);


-- 5. Update RLS Policies for Bingo Games
-- We drop existing restrictive policies if any to replace with SaaS logic
DROP POLICY IF EXISTS "Enable read access for all users" ON bingo_games;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON bingo_games;
DROP POLICY IF EXISTS "Enable update for users based on email" ON bingo_games;

-- New READ: Public (Lobby needs to see game details)
CREATE POLICY "Public Read Bingo" ON bingo_games FOR SELECT USING (true);

-- New INSERT: Authenticated users (But logic should ideally be via RPC to charge money. 
-- For now we allow insert, but the UI will use the RPC. 
-- Security Note: If we allow direct insert, they bypass payment. 
-- Ideally we DISABLE insert and use the RPC with security definer. 
-- But for MVP flexibility, we allow insert and trust the UI/RPC flow, or better:
-- We restrict INSERT to only be possible via the RPC (by making the policy 'false' or check a flag).
-- Let's stick to strict: Users cannot INSERT directly. Only via RPC (Security Definer).
CREATE POLICY "No Direct Insert Bingo" ON bingo_games FOR INSERT WITH CHECK (false); 
-- WAIT: If I set check false, normal insert fails. The RPC needs SECURITY DEFINER to bypass this. Correct.

-- New UPDATE/DELETE: Only Owner or SuperAdmin
CREATE POLICY "Owner Upgrade Bingo" ON bingo_games FOR UPDATE USING (
    auth.uid() = owner_id OR 
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
);

CREATE POLICY "Owner Delete Bingo" ON bingo_games FOR DELETE USING (
    auth.uid() = owner_id OR 
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
);


-- 6. Update RLS Policies for Raffles
DROP POLICY IF EXISTS "Public Read Raffles" ON raffles;
DROP POLICY IF EXISTS "Owner Write Raffles" ON raffles; -- hypothetical name

CREATE POLICY "Public Read Raffles" ON raffles FOR SELECT USING (true);
CREATE POLICY "No Direct Insert Raffles" ON raffles FOR INSERT WITH CHECK (false); 
CREATE POLICY "Owner Update Raffles" ON raffles FOR UPDATE USING (
    auth.uid() = owner_id OR 
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
);
CREATE POLICY "Owner Delete Raffles" ON raffles FOR DELETE USING (
    auth.uid() = owner_id OR 
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
);


-- 7. MIGRATION: Assign existing games to the SuperAdmin (You)
-- Replace with the SuperAdmin ID if known, or use a subquery if 'admin' role is set.
UPDATE bingo_games SET owner_id = (SELECT id FROM profiles WHERE role = 'admin' LIMIT 1) WHERE owner_id IS NULL;
UPDATE raffles SET owner_id = (SELECT id FROM profiles WHERE role = 'admin' LIMIT 1) WHERE owner_id IS NULL;
