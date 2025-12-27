-- 1. Create Profiles Table (Wallet)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID REFERENCES auth.users(id) NOT NULL PRIMARY KEY,
    credits NUMERIC DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
-- Only system allows update credits usually? Or Admin.
-- For now allow user to view.
-- We'll use RPC for deducting credits so Update policy isn't strictly needed for the user themselves.

-- 2. Trigger for New Users
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, credits)
  VALUES (new.id, 0)
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 3. Add Round Price to Game
ALTER TABLE bingo_games ADD COLUMN IF NOT EXISTS round_price NUMERIC DEFAULT 5000;

-- 4. Payment RPC
CREATE OR REPLACE FUNCTION pay_round_fee(p_player_id UUID, p_amount NUMERIC)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_credits NUMERIC;
BEGIN
    -- Get User ID associated with the player ticket
    SELECT user_id INTO v_user_id FROM bingo_players WHERE id = p_player_id;
    
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Ticket not linked to a user account';
    END IF;

    -- Check Credits
    -- Ensure profile exists
    INSERT INTO profiles (id, credits) VALUES (v_user_id, 0) ON CONFLICT (id) DO NOTHING;
    
    SELECT credits INTO v_credits FROM profiles WHERE id = v_user_id;
    
    IF v_credits IS NULL OR v_credits < p_amount THEN
        RETURN FALSE;
    END IF;

    -- Deduct
    UPDATE profiles SET credits = credits - p_amount WHERE id = v_user_id;
    
    -- Activate Ticket
    UPDATE bingo_players SET status = 'PAID' WHERE id = p_player_id;
    
    RETURN TRUE;
END;
$$;

-- 5. Updated Reset Function with Charge Option
CREATE OR REPLACE FUNCTION reset_game_round(p_game_id UUID, p_charge_next_round BOOLEAN DEFAULT FALSE)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 0. ARCHIVE CURRENT GAME
  INSERT INTO bingo_history (game_id, winner_info, called_numbers, played_at)
  SELECT id, winner_info, called_numbers, NOW()
  FROM bingo_games
  WHERE id = p_game_id AND (winner_info IS NOT NULL OR jsonb_array_length(called_numbers) > 0);

  -- 1. Reset Game
  UPDATE bingo_games 
  SET called_numbers = '[]'::jsonb, 
      current_number = NULL,
      winner_info = NULL,
      status = 'PLAYING'
  WHERE id = p_game_id;

  -- 2. Reset Players Status
  IF p_charge_next_round THEN
      -- Set active players to AWAITING_PAYMENT
      UPDATE bingo_players
      SET status = 'AWAITING_PAYMENT'
      WHERE game_id = p_game_id AND (status = 'PAID' OR status = 'WIN_CLAIMED');
  ELSE
      -- Just reset to PAID (Free round)
      UPDATE bingo_players
      SET status = 'PAID'
      WHERE game_id = p_game_id AND status = 'WIN_CLAIMED';
  END IF;

  -- 3. UNMARK ALL CARDS
  UPDATE bingo_players
  SET card_matrix = (
    SELECT jsonb_agg(
        CASE 
            WHEN (elem->>'number') = 'FREE' THEN elem 
            ELSE elem || '{"marked": false}'::jsonb
        END
    )
    FROM jsonb_array_elements(card_matrix) AS elem
  )
  WHERE game_id = p_game_id;
END;
$$;
