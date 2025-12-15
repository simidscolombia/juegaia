-- ==========================================
-- RESCUE SCRIPT: FIX MISSING PROFILE
-- Run this if you can't login after registering
-- ==========================================

DO $$
DECLARE
    v_user_id UUID;
    v_email TEXT := 'tu_correo@gmail.com'; -- REEMPLAZA ESTO CON TU CORREO EXACTO
BEGIN
    -- 1. Find the User ID from auth.users (Supabase Internal Table)
    SELECT id INTO v_user_id FROM auth.users WHERE email = v_email;

    IF v_user_id IS NULL THEN
        RAISE NOTICE 'No se encontró el usuario en auth.users. ¿Seguro que te registraste con ese correo?';
        RETURN;
    END IF;

    -- 2. Check/Insert Profile
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = v_user_id) THEN
        INSERT INTO public.profiles (id, email, full_name, role, referral_code)
        VALUES (
            v_user_id, 
            v_email, 
            'Usuario Rescatado', 
            'admin', -- Asumimos admin para desbloquearte
            'RESCUE' || floor(random()*1000)::text
        );
        RAISE NOTICE 'Perfil creado exitosamente.';
    ELSE
        RAISE NOTICE 'El perfil ya existía.';
    END IF;

    -- 3. Check/Insert Wallet
    IF NOT EXISTS (SELECT 1 FROM public.wallets WHERE user_id = v_user_id) THEN
        INSERT INTO public.wallets (user_id, balance) VALUES (v_user_id, 0);
        RAISE NOTICE 'Billetera creada exitosamente.';
    ELSE
        RAISE NOTICE 'La billetera ya existía.';
    END IF;

END $$;
