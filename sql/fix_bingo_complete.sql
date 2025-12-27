-- 1. Asegurar columnas necesarias
ALTER TABLE bingo_games ADD COLUMN IF NOT EXISTS ticket_price NUMERIC DEFAULT 10000;
ALTER TABLE bingo_games ADD COLUMN IF NOT EXISTS start_time TIMESTAMPTZ;
ALTER TABLE bingo_players ADD COLUMN IF NOT EXISTS payment_proof_url TEXT;

-- 2. Crear función de servicio
CREATE OR REPLACE FUNCTION public.create_game_service(p_service_type TEXT, p_name TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_cost NUMERIC;
  v_balance NUMERIC;
  v_game_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No autenticado');
  END IF;

  SELECT COALESCE(value::NUMERIC, 5000) INTO v_cost 
  FROM system_settings WHERE key = 'bingo_price';
  IF v_cost IS NULL THEN v_cost := 5000; END IF;

  SELECT balance INTO v_balance FROM wallets WHERE user_id = v_user_id;
  IF v_balance IS NULL OR v_balance < v_cost THEN
    RETURN jsonb_build_object('success', false, 'error', 'Saldo insuficiente');
  END IF;

  UPDATE wallets SET balance = balance - v_cost WHERE user_id = v_user_id;

  INSERT INTO bingo_games (name, status, owner_id)
  VALUES (p_name, 'WAITING', v_user_id)
  RETURNING id INTO v_game_id;

  RETURN jsonb_build_object('success', true, 'game_id', v_game_id);
END;
$$;
