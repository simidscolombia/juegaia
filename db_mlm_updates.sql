-- ==========================================
-- MLM UPDATES: REFERRAL CODES & DEFAULT UPLINE
-- ==========================================

-- 1. ADD REFERRAL CODE COLUMN
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS referral_code VARCHAR UNIQUE;

-- 2. FUNCTION TO GENERATE UNIQUE CODES
CREATE OR REPLACE FUNCTION generate_unique_referral_code()
RETURNS VARCHAR AS $$
DECLARE
    chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    result VARCHAR := '';
    i INTEGER;
    exists_count INTEGER;
BEGIN
    LOOP
        result := '';
        FOR i IN 1..6 LOOP
            result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
        END LOOP;
        
        SELECT count(*) INTO exists_count FROM profiles WHERE referral_code = result;
        EXIT WHEN exists_count = 0;
    END LOOP;
    RETURN result;
END;
$$ LANGUAGE plpgsql;


-- 3. UPDATE HANDLE_NEW_USER TRIGGER
-- This handles the "Default to SuperAdmin" logic and "Assign by Code"
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
DECLARE
    v_referrer_id UUID;
    v_ref_code_input VARCHAR;
    v_admin_email VARCHAR := 'elkindanielcastillo@gmail.com';
BEGIN
    -- Get the referral code from metadata (passed from Registration Form)
    v_ref_code_input := new.raw_user_meta_data->>'referral_code';

    -- Strategy:
    -- 1. If code provided -> Find owner.
    -- 2. If NO code -> Find SuperAdmin.
    -- 3. If SuperAdmin not found (rare) -> NULL (Root node).

    IF v_ref_code_input IS NOT NULL AND length(v_ref_code_input) > 0 THEN
        SELECT id INTO v_referrer_id FROM profiles WHERE referral_code = v_ref_code_input;
    END IF;

    -- Fallback to SuperAdmin if no referrer found yet
    IF v_referrer_id IS NULL THEN
        SELECT id INTO v_referrer_id FROM profiles WHERE email = v_admin_email;
    END IF;

    -- Avoid self-referral (if admin signs up again?)
    IF v_referrer_id = new.id THEN
        v_referrer_id := NULL;
    END IF;

    -- Create Profile
    INSERT INTO public.profiles (
        id, 
        email, 
        full_name, 
        role, 
        referral_code, 
        referred_by
    )
    VALUES (
        new.id, 
        new.email, 
        new.raw_user_meta_data->>'full_name', 
        'player', -- Default role
        generate_unique_referral_code(), -- Generate THEIR code immediately
        v_referrer_id -- Assign the parent
    );

    -- Create Empty Wallet immediately
    INSERT INTO public.wallets (user_id, balance) VALUES (new.id, 0);

    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 4. BACKFILL REFERRAL CODES FOR EXISTING USERS
-- (Run this once safely)
DO $$
DECLARE 
    r RECORD;
BEGIN
    FOR r IN SELECT id FROM profiles WHERE referral_code IS NULL LOOP
        UPDATE profiles 
        SET referral_code = generate_unique_referral_code() 
        WHERE id = r.id;
    END LOOP;
END $$;
