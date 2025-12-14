-- RPC: Create Game with Wallet Charge (SaaS Model)

CREATE OR REPLACE FUNCTION create_game_service(
    p_service_type VARCHAR, -- 'BINGO' or 'RAFFLE'
    p_name VARCHAR,
    p_config JSONB -- Extra config (Range, digits, etc)
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with privileges of creator (Admin) to bypass RLS on INSERT
AS $$
DECLARE
    v_user_id UUID;
    v_cost NUMERIC;
    v_setting_key VARCHAR;
    v_balance NUMERIC;
    v_new_game_id UUID;
BEGIN
    -- 1. Get Current User
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Not authenticated');
    END IF;

    -- 2. Determine Cost from Settings
    IF p_service_type = 'BINGO' THEN
        v_setting_key := 'bingo_price';
    ELSIF p_service_type = 'RAFFLE' THEN
        v_setting_key := 'raffle_price';
    ELSE
        RETURN json_build_object('success', false, 'error', 'Invalid service type');
    END IF;

    SELECT value::NUMERIC INTO v_cost FROM system_settings WHERE key = v_setting_key;
    
    -- Safety check if price missing
    IF v_cost IS NULL THEN v_cost := 999999; END IF; 

    -- 3. Check Wallet Balance
    SELECT balance INTO v_balance FROM wallets WHERE user_id = v_user_id;
    IF v_balance IS NULL OR v_balance < v_cost THEN
        RETURN json_build_object('success', false, 'error', 'Saldo insuficiente. Requiere: ' || v_cost);
    END IF;

    -- 4. Deduct Balance
    UPDATE wallets SET balance = balance - v_cost WHERE user_id = v_user_id;

    -- 5. Create Game Resource
    IF p_service_type = 'BINGO' THEN
        INSERT INTO bingo_games (name, owner_id, status, created_at)
        VALUES (p_name, v_user_id, 'WAITING', now())
        RETURNING id INTO v_new_game_id;
        
    ELSIF p_service_type = 'RAFFLE' THEN
        INSERT INTO raffles (
            name, owner_id, status, 
            min_number, max_number, price, 
            lottery_name, digits, reservation_minutes,
            image, payment_info, draw_date,
            created_at
        )
        VALUES (
            p_name, v_user_id, 'OPEN',
            (p_config->>'min')::int, (p_config->>'max')::int, (p_config->>'price')::numeric,
            p_config->>'lottery', (p_config->>'digits')::int, (p_config->>'minutes')::int,
            p_config->>'image', p_config->>'paymentInfo', 
            CASE WHEN p_config->>'drawDate' = '' THEN NULL ELSE (p_config->>'drawDate')::timestamp END,
            now()
        )
        RETURNING id INTO v_new_game_id;
    END IF;

    -- 6. Log Transaction (Optional but good for history)
    -- We could insert into 'transactions' with negative amount to track spending.
    INSERT INTO transactions (user_id, amount, reference, status, wompi_id)
    VALUES (v_user_id, -v_cost, 'SERVICE_' || p_service_type || '_' || v_new_game_id, 'APPROVED', 'INTERNAL_SPEND');

    RETURN json_build_object('success', true, 'game_id', v_new_game_id, 'cost_deducted', v_cost);

EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;
