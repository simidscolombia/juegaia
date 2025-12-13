-- 1. Fix Bingo Games Table
-- Add admin_whatsapp column if it doesn't exist
ALTER TABLE bingo_games ADD COLUMN IF NOT EXISTS admin_whatsapp VARCHAR;

-- 2. Fix Permissions (RLS) for Bingo Games
ALTER TABLE bingo_games ENABLE ROW LEVEL SECURITY;

-- Allow ALL operations for authenticated users (Admin)
-- (In a stricter system, we would check if auth.uid() = created_by)
CREATE POLICY "Allow full access to games for authenticated users" ON bingo_games
    FOR ALL
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- 3. Fix Permissions (RLS) for Bingo Players (Tickets)
ALTER TABLE bingo_players ENABLE ROW LEVEL SECURITY;

-- Allow ALL operations for authenticated users (Admin to approve)
CREATE POLICY "Allow full access to players for authenticated users" ON bingo_players
    FOR ALL
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- 4. Grant usage permissions just in case
GRANT ALL ON bingo_games TO authenticated;
GRANT ALL ON bingo_players TO authenticated;
