-- ================================================================
-- FIX: DROP AMBIGUOUS FUNCTIONS
-- ================================================================

-- El error "Could not choose the best candidate function" ocurre porque
-- existen dos definiciones de la misma función con tipos de datos ligeramente distintos
-- (una usa TEXT y otra VARCHAR, o se duplicó al hacer CREATE OR REPLACE).

-- Solución: Borrar TODAS las versiones de la función y volver a crear la DEFINITIVA.

DROP FUNCTION IF EXISTS public.create_game_service(text, text);
DROP FUNCTION IF EXISTS public.create_game_service(text, text, jsonb);
DROP FUNCTION IF EXISTS public.create_game_service(character varying, character varying);
DROP FUNCTION IF EXISTS public.create_game_service(character varying, character varying, jsonb);

-- Ahora sí, crear la versión limpia y única:

CREATE OR REPLACE FUNCTION public.create_game_service(
    p_service_type TEXT, 
    p_name TEXT,
    p_config JSONB DEFAULT '{}'::jsonb 
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_cost NUMERIC;
  v_balance NUMERIC;
  v_game_id UUID;
  v_raffle_id UUID;
  v_price_key TEXT;
  v_default_cost NUMERIC := 2000; 
BEGIN
  -- 1. Authentication Check
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No autenticado. Por favor inicia sesión.');
  END IF;

  -- 2. Determine Cost based on Service Type
  IF p_service_type = 'BINGO' THEN
      v_price_key := 'bingo_creation_price';
  ELSIF p_service_type = 'RAFFLE' THEN
      v_price_key := 'raffle_creation_price';
  ELSE
      RETURN jsonb_build_object('success', false, 'error', 'Tipo de servicio inválido: ' || p_service_type);
  END IF;

  -- Get cost 
  SELECT COALESCE(value::NUMERIC, v_default_cost) INTO v_cost 
  FROM system_settings WHERE key = v_price_key;
  IF v_cost IS NULL THEN v_cost := v_default_cost; END IF;

  -- 3. Check Balance
  SELECT balance INTO v_balance FROM wallets WHERE user_id = v_user_id;
  IF v_balance IS NULL THEN v_balance := 0; END IF;

  IF v_balance < v_cost THEN
    RETURN jsonb_build_object('success', false, 'error', 'Saldo insuficiente. Costo: $' || v_cost || ', Tu saldo: $' || v_balance);
  END IF;

  -- 4. Deduct Balance 
  UPDATE wallets SET balance = balance - v_cost WHERE user_id = v_user_id;

  -- 5. Create the Resource 
  IF p_service_type = 'BINGO' THEN
      INSERT INTO bingo_games (name, status, owner_id)
      VALUES (p_name, 'WAITING', v_user_id)
      RETURNING id INTO v_game_id;
      
      RETURN jsonb_build_object('success', true, 'game_id', v_game_id, 'message', 'Bingo creado exitosamente');

  ELSIF p_service_type = 'RAFFLE' THEN
      INSERT INTO raffles (
          name, owner_id, status, min_number, max_number, price, lottery_name, digits, image, reservation_minutes, draw_date, payment_info
      )
      VALUES (
          p_name, v_user_id, 'OPEN',
          COALESCE((p_config->>'min')::int, 0),
          COALESCE((p_config->>'max')::int, 999),
          COALESCE((p_config->>'price')::numeric, 10000),
          COALESCE(p_config->>'lottery', 'Manual'),
          COALESCE((p_config->>'digits')::int, 3),
          COALESCE(p_config->>'image', ''),
          COALESCE((p_config->>'minutes')::int, 15),
          (p_config->>'drawDate')::timestamp,
          COALESCE(p_config->>'paymentInfo', '')
      )
      RETURNING id INTO v_raffle_id;

      RETURN jsonb_build_object('success', true, 'game_id', v_raffle_id, 'message', 'Rifa creada exitosamente');
  END IF;

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;
