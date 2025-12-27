CREATE OR REPLACE FUNCTION reset_game_round(p_game_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 1. Reset Game
  UPDATE bingo_games 
  SET called_numbers = '[]'::jsonb, 
      current_number = NULL,
      winner_info = NULL,
      status = 'PLAYING'
  WHERE id = p_game_id;

  -- 2. Reset Winning Claims
  UPDATE bingo_players
  SET status = 'PAID'
  WHERE game_id = p_game_id AND status = 'WIN_CLAIMED';

  -- 3. UNMARK ALL CARDS (Reset marks on all numbers except FREE)
  -- This rebuilds the JSON array setting "marked": false for every cell
  UPDATE bingo_players
  SET card_matrix = (
    SELECT jsonb_agg(
        CASE 
            WHEN (elem->>'number') = 'FREE' THEN elem -- Keep FREE space state
            ELSE elem || '{"marked": false}'::jsonb   -- Unmark others
        END
    )
    FROM jsonb_array_elements(card_matrix) AS elem
  )
  WHERE game_id = p_game_id;
END;
$$;
