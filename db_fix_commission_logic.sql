-- ==========================================
-- 1. ASEGURAR QUE LA FUNCIÓN EXISTE
-- ==========================================
CREATE OR REPLACE FUNCTION process_recharge_with_mlm(
    p_user_id UUID,
    p_amount NUMERIC,
    p_reference VARCHAR,
    p_wompi_id VARCHAR
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_upline_id UUID;
    v_commission NUMERIC;
    v_percentage NUMERIC;
    v_level INTEGER;
    v_current_user_id UUID := p_user_id;
BEGIN
    -- 1. Insert Transaction
    INSERT INTO transactions (user_id, amount, reference, status, wompi_id)
    VALUES (p_user_id, p_amount, p_reference, 'APPROVED', p_wompi_id);

    -- 2. Add Balance (Upsert)
    INSERT INTO wallets (user_id, balance, updated_at)
    VALUES (p_user_id, p_amount, now())
    ON CONFLICT (user_id) 
    DO UPDATE SET balance = wallets.balance + EXCLUDED.balance, updated_at = now();

    -- 3. MLM Loop (4 Levels)
    FOR v_level IN 1..4 LOOP
        -- Find Referrer
        SELECT referred_by INTO v_upline_id FROM profiles WHERE id = v_current_user_id;
        
        -- Exit if no referrer
        EXIT WHEN v_upline_id IS NULL;

        -- Define %
        IF v_level = 1 THEN v_percentage := 0.02;
        ELSIF v_level = 2 THEN v_percentage := 0.02;
        ELSIF v_level = 3 THEN v_percentage := 0.02;
        ELSIF v_level = 4 THEN v_percentage := 0.04;
        ELSE v_percentage := 0; 
        END IF;

        -- Calculate & Pay
        v_commission := p_amount * v_percentage;

        UPDATE wallets SET balance = balance + v_commission WHERE user_id = v_upline_id;

        INSERT INTO commissions (beneficiary_id, source_user_id, amount, percentage, level)
        VALUES (v_upline_id, p_user_id, v_commission, v_percentage * 100, v_level);

        -- Move up the ladder
        v_current_user_id := v_upline_id;
    END LOOP;

    RETURN json_build_object('success', true, 'message', 'Processed');
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;


-- ==========================================
-- 2. HABILITAR VISIBILIDAD (RLS)
-- ==========================================
ALTER TABLE commissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their commissions" ON commissions;
CREATE POLICY "Users can view their commissions" ON commissions
    FOR SELECT
    USING (auth.uid() = beneficiary_id);

GRANT SELECT ON commissions TO authenticated;
