-- =========================================================
-- CORRECCIÓN DEFINITIVA DEL TRIGGER DE REGISTRO
-- Este script hace que el proceso sea "a prueba de fallos".
-- Si no encuentra al padrino, REGISTRA AL USUARIO IGUAL.
-- =========================================================

CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
DECLARE
    v_referrer_id UUID := NULL; -- Por defecto NULL (sin padrino)
    v_ref_code_input VARCHAR;
    v_admin_email VARCHAR := 'elkindanielcastillo@gmail.com';
BEGIN
    -------------------------------------------------------
    -- BLOQUE SEGURO: Intentar buscar padrino sin romper nada
    -------------------------------------------------------
    BEGIN
        -- 1. Obtener código del formulario
        v_ref_code_input := new.raw_user_meta_data->>'referral_code';
        
        -- 2. Buscar por código (si existe)
        IF v_ref_code_input IS NOT NULL AND length(v_ref_code_input) > 0 THEN
            SELECT id INTO v_referrer_id FROM profiles WHERE referral_code = v_ref_code_input LIMIT 1;
        END IF;

        -- 3. Si sigue siendo NULL, buscar SuperAdmin
        IF v_referrer_id IS NULL THEN
            SELECT id INTO v_referrer_id FROM profiles WHERE email = v_admin_email LIMIT 1;
        END IF;
        
        -- 4. Evitar auto-ref (si el admin se registra a sí mismo)
        IF v_referrer_id = new.id THEN
            v_referrer_id := NULL;
        END IF;

    EXCEPTION WHEN OTHERS THEN
        -- Si ALGO falla aquí (ej: permiso denegado, error de base de datos), 
        -- ignoramos el error y dejamos v_referrer_id en NULL para que el usuario se cree sí o sí.
        v_referrer_id := NULL; 
    END;

    -------------------------------------------------------
    -- INSERTAR EL PERFIL (Datos Básicos)
    -------------------------------------------------------
    INSERT INTO public.profiles (
        id, 
        email, 
        full_name, 
        role, 
        referral_code, 
        referred_by, 
        phone, 
        document_id
    )
    VALUES (
        new.id, 
        new.email, 
        COALESCE(new.raw_user_meta_data->>'full_name', 'Nuevo Usuario'),
        'player',
        upper(substring(md5(random()::text) from 1 for 8)), -- Código temporal si falla la generación compleja
        v_referrer_id,
        new.raw_user_meta_data->>'phone',
        new.raw_user_meta_data->>'document_id'
    );

    -------------------------------------------------------
    -- INSERTAR LA BILLETERA
    -------------------------------------------------------
    INSERT INTO public.wallets (user_id, balance) VALUES (new.id, 0);

    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
