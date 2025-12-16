
-- ==========================================================
-- DANGEROUS SCRIPT: WIPE ALL USERS EXCEPT ADMIN
-- Admin to Keep: elkindanielcastillo@gmail.com
-- ==========================================================

DO $$
DECLARE
    v_admin_email TEXT := 'elkindanielcastillo@gmail.com';
    v_admin_id UUID;
BEGIN
    -- 1. Find Admin ID
    SELECT id INTO v_admin_id FROM auth.users WHERE email = v_admin_email;

    IF v_admin_id IS NULL THEN
        RAISE EXCEPTION 'Admin user % not found! Aborting to prevent full wipe.', v_admin_email;
    END IF;

    RAISE NOTICE 'Preserving Admin ID: %', v_admin_id;

    -- 2. Delete Dependent Data first (to avoid FK violations if no cascade)
    
    -- Delete Commissions involving others
    DELETE FROM commissions 
    WHERE beneficiary_id != v_admin_id OR source_user_id != v_admin_id;

    -- Delete Transactions of others
    DELETE FROM transactions 
    WHERE user_id != v_admin_id;

    -- Delete Tickets of games owned by others OR bought by others
    -- (Actually, usually better to delete the Games of others, and cascade tickets if setup, but let's be explicit)
    DELETE FROM tickets 
    WHERE raffle_id IN (SELECT id FROM raffles WHERE owner_id != v_admin_id);

    DELETE FROM bingo_players 
    WHERE game_id IN (SELECT id FROM bingo_games WHERE owner_id != v_admin_id);

    -- Delete Games owned by others
    DELETE FROM raffles WHERE owner_id != v_admin_id;
    DELETE FROM bingo_games WHERE owner_id != v_admin_id;

    -- Delete Wallets of others
    DELETE FROM wallets WHERE user_id != v_admin_id;

    -- Delete Profiles of others
    DELETE FROM profiles WHERE id != v_admin_id;

    -- 3. Delete Users from Auth (The Big One)
    -- This works in Supabase SQL Editor which has superuser rights over auth schema usually.
    DELETE FROM auth.users 
    WHERE id != v_admin_id;

    RAISE NOTICE 'Database cleanup complete. Only % remains.', v_admin_email;

END $$;
