
-- ================================================================
-- FIX: REFERRAL LOGIC & PROFILE CREATION
-- ================================================================

-- 1. Ensure 'referral_code' column exists
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referral_code VARCHAR UNIQUE;
CREATE INDEX IF NOT EXISTS idx_profiles_refcode ON profiles(referral_code);

-- 2. Update the Trigger Function to handle Referrals and Wallet
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
DECLARE
  v_referrer_id UUID;
  v_new_code TEXT;
  v_given_code TEXT;
  v_base_name TEXT;
BEGIN
  -- Get the referral code passed during sign up
  v_given_code := new.raw_user_meta_data->>'referral_code';

  -- 1. Resolve Referrer (Upline)
  IF v_given_code IS NOT NULL AND v_given_code <> '' THEN
    SELECT id INTO v_referrer_id 
    FROM public.profiles 
    WHERE referral_code = v_given_code;
    
    -- If invalid code, v_referrer_id remains NULL (safe fallback)
  END IF;

  -- 2. Generate Confirmation Code / Referral Code for THIS new user
  -- Logic: First part of email + Random Number (e.g., 'juan123')
  v_base_name := split_part(new.email, '@', 1);
  -- Sanitize base name (alphanumeric only)
  v_base_name := regexp_replace(v_base_name, '[^a-zA-Z0-9]', '', 'g');
  
  -- Create unique code loop (unlikely collision but safe)
  LOOP
    v_new_code := v_base_name || floor(random() * 10000)::text;
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE referral_code = v_new_code) THEN
        EXIT;
    END IF;
  END LOOP;

  -- 3. Insert Profile
  INSERT INTO public.profiles (id, email, full_name, role, referral_code, referred_by)
  VALUES (
    new.id, 
    new.email, 
    COALESCE(new.raw_user_meta_data->>'full_name', 'Usuario Nuevo'), 
    'player', 
    v_new_code,
    v_referrer_id
  );

  -- 4. Create Wallet (Empty)
  INSERT INTO public.wallets (user_id, balance) 
  VALUES (new.id, 0)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 3. HELPER: Fix existing users manually (Since logic was broken)
-- Use: SELECT manual_link_referral('hijo@email.com', 'padre_codigo');

CREATE OR REPLACE FUNCTION manual_link_referral(p_child_email TEXT, p_parent_code TEXT)
RETURNS TEXT AS $$
DECLARE
  v_parent_id UUID;
  v_child_id UUID;
BEGIN
  -- Find Parent
  SELECT id INTO v_parent_id FROM profiles WHERE referral_code = p_parent_code;
  IF v_parent_id IS NULL THEN
    RETURN 'Error: Código del padre no encontrado';
  END IF;

  -- Find Child
  SELECT id INTO v_child_id FROM profiles WHERE email = p_child_email;
  IF v_child_id IS NULL THEN
    RETURN 'Error: Email del usuario (hijo) no encontrado';
  END IF;

  -- Update
  UPDATE profiles SET referred_by = v_parent_id WHERE id = v_child_id;
  
  RETURN 'Éxito: Usuario vinculado correctamente.';
END;
$$ LANGUAGE plpgsql;
