-- ==========================================
-- SCRIPT DE RESTAURACIÓN DE SUPERUSUARIO
-- Ejecuta esto en el Editor SQL de Supabase para arreglar tu cuenta.
-- ==========================================

DO $$
DECLARE
    v_user_id UUID;
    v_email TEXT := 'elkindanielcastillo@gmail.com'; -- TU CORREO
BEGIN
    -- 1. Buscar el ID del usuario en el sistema de autenticación
    SELECT id INTO v_user_id FROM auth.users WHERE email = v_email;

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'No se encontró el usuario % en auth.users. Por favor inicia sesión con Google primero.', v_email;
    END IF;

    -- 2. Asegurar que existe el Perfil y hacerlo ADMIN
    -- Usamos ON CONFLICT para actualizar si ya existe, o crear si no.
    INSERT INTO public.profiles (id, email, full_name, role, referral_code)
    VALUES (
        v_user_id, 
        v_email, 
        'Elkin Daniel Castillo', 
        'admin', -- ASIGNAR ROL DE ADMIN
        'SUPERADMIN' -- Referral code fijo para el jefe
    )
    ON CONFLICT (id) DO UPDATE 
    SET 
        role = 'admin',
        full_name = EXCLUDED.full_name;

    -- 3. Asegurar que tiene Billetera (y darle saldo de bienvenida/prueba si está en 0)
    INSERT INTO public.wallets (user_id, balance)
    VALUES (v_user_id, 1000000) -- Saldo inicial para pruebas
    ON CONFLICT (user_id) DO NOTHING;

    RAISE NOTICE 'Usuario % restaurado como ADMIN correctamente.', v_email;

END $$;
