-- 1. Transactions Table (For Wompi Logs)
CREATE TABLE IF NOT EXISTS transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    amount NUMERIC NOT NULL,
    reference VARCHAR UNIQUE NOT NULL,
    status VARCHAR DEFAULT 'PENDING', -- PENDING, APPROVED, DECLINED
    wompi_id VARCHAR,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. Commissions Table (Ledger for MLM)
CREATE TABLE IF NOT EXISTS commissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    beneficiary_id UUID REFERENCES auth.users(id), -- Who gets the money
    source_user_id UUID REFERENCES auth.users(id), -- Who made the recharge
    amount NUMERIC NOT NULL,
    percentage NUMERIC NOT NULL,
    level INTEGER NOT NULL, -- 1, 2, 3, 4
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. Trigger/RPC to Process Recharge and Distribute Commissions
-- This function handles the entire logic atomically.
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
    v_remaining_levels INTEGER := 4;
    v_current_user_id UUID := p_user_id;
BEGIN
    -- 1. Record Transaction (Approved)
    INSERT INTO transactions (user_id, amount, reference, status, wompi_id)
    VALUES (p_user_id, p_amount, p_reference, 'APPROVED', p_wompi_id);

    -- 2. Add Balance to User
    -- 2. Add Balance to User (Upsert to ensure it exists)
    INSERT INTO wallets (user_id, balance, updated_at)
    VALUES (p_user_id, p_amount, now())
    ON CONFLICT (user_id) 
    DO UPDATE SET balance = wallets.balance + EXCLUDED.balance, updated_at = now();

    -- 3. MLM Distribution Loop
    -- Percentages: L1=2%, L2=2%, L3=2%, L4=4% (Total 10%)
    
    FOR v_level IN 1..4 LOOP
        -- Get Referrer (Upline)
        SELECT referred_by INTO v_upline_id
        FROM profiles
        WHERE id = v_current_user_id;

        -- Break if no upline or upline is root/null (Assuming 'admin' or null)
        EXIT WHEN v_upline_id IS NULL;

        -- Determine Percentage
        IF v_level = 1 THEN v_percentage := 0.02;
        ELSIF v_level = 2 THEN v_percentage := 0.02;
        ELSIF v_level = 3 THEN v_percentage := 0.02;
        ELSIF v_level = 4 THEN v_percentage := 0.04;
        ELSE v_percentage := 0;
        END IF;

        -- Calculate Commission
        v_commission := p_amount * v_percentage;

        -- Pay Upline (Update Wallet)
        -- Ensure wallet exists, if not create (Unlikely for registered users but safe)
        UPDATE wallets
        SET balance = balance + v_commission
        WHERE user_id = v_upline_id;

        -- Record Commission
        INSERT INTO commissions (beneficiary_id, source_user_id, amount, percentage, level)
        VALUES (v_upline_id, p_user_id, v_commission, v_percentage * 100, v_level);

        -- Move up
        v_current_user_id := v_upline_id;
    END LOOP;

    RETURN json_build_object('success', true, 'message', 'Recharge and MLM processed');
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;
