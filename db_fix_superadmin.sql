-- ==========================================
-- SUPER ADMIN PREMISSIONS FIX
-- ==========================================

-- 1. Helper function to check if current user is admin
-- (This creates a security definer function to avoid infinite recursion in policies)
CREATE OR REPLACE FUNCTION is_admin() 
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- TABLE: PROFILES
-- ==========================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Allow admins to do EVERYTHING on profiles
DROP POLICY IF EXISTS "Admins can do everything on profiles" ON profiles;
CREATE POLICY "Admins can do everything on profiles" ON profiles
    FOR ALL
    USING (is_admin());

-- Ensure basic visibility (Public read is already there, but ensuring it)
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
CREATE POLICY "Public profiles are viewable by everyone" ON profiles FOR SELECT USING (true);


-- ==========================================
-- TABLE: WALLETS
-- ==========================================
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can do everything on wallets" ON wallets;
CREATE POLICY "Admins can do everything on wallets" ON wallets
    FOR ALL
    USING (is_admin());

-- Keep user own access
DROP POLICY IF EXISTS "Users can view own wallet" ON wallets;
CREATE POLICY "Users can view own wallet" ON wallets
    FOR SELECT
    USING (auth.uid() = user_id);


-- ==========================================
-- TABLE: BINGO GAMES
-- ==========================================
ALTER TABLE bingo_games ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can do everything on bingo_games" ON bingo_games;
CREATE POLICY "Admins can do everything on bingo_games" ON bingo_games
    FOR ALL
    USING (is_admin());

-- Users see their own games
DROP POLICY IF EXISTS "Users can manage own games" ON bingo_games;
CREATE POLICY "Users can manage own games" ON bingo_games
    FOR ALL
    USING (auth.uid() = owner_id);


-- ==========================================
-- TABLE: RAFFLES
-- ==========================================
ALTER TABLE raffles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can do everything on raffles" ON raffles;
CREATE POLICY "Admins can do everything on raffles" ON raffles
    FOR ALL
    USING (is_admin());

-- Users see their own raffles
DROP POLICY IF EXISTS "Users can manage own raffles" ON raffles;
CREATE POLICY "Users can manage own raffles" ON raffles
    FOR ALL
    USING (auth.uid() = owner_id);


-- ==========================================
-- TABLE: BINGO PLAYERS (TICKETS)
-- ==========================================
ALTER TABLE bingo_players ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can do everything on bingo_players" ON bingo_players;
CREATE POLICY "Admins can do everything on bingo_players" ON bingo_players
    FOR ALL
    USING (is_admin());

-- Owners can manage (select/update/delete) tickets of their games
DROP POLICY IF EXISTS "Owners manage game tickets" ON bingo_players;
CREATE POLICY "Owners manage game tickets" ON bingo_players
    FOR ALL
    USING (
      EXISTS (SELECT 1 FROM bingo_games WHERE id = bingo_players.game_id AND owner_id = auth.uid())
    );

-- Public/Players can perhaps view (if needed for searching) - adjusting based on needs
-- Previously we had open access or specific access. 
-- For now, ensure Admins are covered.


-- ==========================================
-- TABLE: TICKETS (RAFFLE TICKETS)
-- ==========================================
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can do everything on raffle tickets" ON tickets;
CREATE POLICY "Admins can do everything on raffle tickets" ON tickets
    FOR ALL
    USING (is_admin());

-- Owners manage raffle tickets
DROP POLICY IF EXISTS "Owners manage raffle tickets" ON tickets;
CREATE POLICY "Owners manage raffle tickets" ON tickets
    FOR ALL
    USING (
      EXISTS (SELECT 1 FROM raffles WHERE id = tickets.raffle_id AND owner_id = auth.uid())
    );


-- ==========================================
-- TABLE: SYSTEM SETTINGS
-- ==========================================
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage settings" ON system_settings;
CREATE POLICY "Admins manage settings" ON system_settings
    FOR ALL
    USING (is_admin());

DROP POLICY IF EXISTS "Everyone view settings" ON system_settings;
CREATE POLICY "Everyone view settings" ON system_settings
    FOR SELECT
    USING (true);
