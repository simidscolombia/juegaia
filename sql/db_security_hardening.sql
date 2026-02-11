-- ================================================================
-- SECURITY HARDENING: ROW LEVEL SECURITY (RLS) POLICIES
-- ================================================================

-- 0. Helper Function to Check Admin Status safely
-- This prevents recursion and allows cleaner policies.
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================================
-- 1. TRANSACTIONS TABLE
-- ================================================================
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can create own transactions" ON public.transactions;

-- Select: Users view only their own
CREATE POLICY "Users can view own transactions" ON public.transactions
    FOR SELECT
    USING (auth.uid() = user_id);

-- Insert: Users can create transactions (e.g., initiating a recharge)
-- They can only set their own user_id
CREATE POLICY "Users can create own transactions" ON public.transactions
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Update/Delete: FORBIDDEN for standard users (Immutable Ledger)
-- Admin or System (Service Role) can update via functions.

-- ================================================================
-- 2. COMMISSIONS TABLE
-- ================================================================
ALTER TABLE public.commissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own commissions" ON public.commissions;

-- Select: Users can see commissions they received (beneficiary) OR generated (source)
CREATE POLICY "Users can view own commissions" ON public.commissions
    FOR SELECT
    USING (auth.uid() = beneficiary_id OR auth.uid() = source_user_id);

-- Insert/Update/Delete: FORBIDDEN (System Generated Only via Triggers)

-- ================================================================
-- 3. PROFILES TABLE
-- ================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update everything" ON public.profiles;

-- Select: Public (Needed for referrals, leaderboards, checking upline)
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles
    FOR SELECT
    USING (true);

-- Update: Users can update their own profile
CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE
    USING (auth.uid() = id);

-- Update: Admins can update any profile
CREATE POLICY "Admins can update any profile" ON public.profiles
    FOR UPDATE
    USING (is_admin());

-- Insert: Handled by Trigger usually, but allow self-insert if needed for recovery
CREATE POLICY "Users can insert own profile" ON public.profiles
    FOR INSERT
    WITH CHECK (auth.uid() = id);

-- ================================================================
-- 4. BINGO GAMES TABLE
-- ================================================================
ALTER TABLE public.bingo_games ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public view bingo games" ON public.bingo_games;
DROP POLICY IF EXISTS "Admins manage bingo games" ON public.bingo_games;

-- Select: Public (Everyone sees the active games)
CREATE POLICY "Public view bingo games" ON public.bingo_games
    FOR SELECT
    USING (true);

-- Insert/Update/Delete: Only Admins
CREATE POLICY "Admins manage bingo games" ON public.bingo_games
    FOR ALL
    USING (is_admin())
    WITH CHECK (is_admin());

-- ================================================================
-- 5. BINGO PLAYERS (TICKETS) TABLE
-- ================================================================
ALTER TABLE public.bingo_players ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own tickets" ON public.bingo_players;
DROP POLICY IF EXISTS "Users buy own tickets" ON public.bingo_players;
DROP POLICY IF EXISTS "Admins manage all tickets" ON public.bingo_players;

-- Select: Users view their own tickets OR Public if looking at winners?
-- Sticking to own tickets for privacy, maybe allow public to see 'winner' status later.
CREATE POLICY "Users view own tickets" ON public.bingo_players
    FOR SELECT
    USING (auth.uid() = user_id);

-- Insert: Users buy tickets
CREATE POLICY "Users buy own tickets" ON public.bingo_players
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Update: Admins or System only (marking winners)
CREATE POLICY "Admins manage all tickets" ON public.bingo_players
    FOR UPDATE
    USING (is_admin());
