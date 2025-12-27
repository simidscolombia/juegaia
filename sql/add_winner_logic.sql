-- Add winner_info to bingo_games
ALTER TABLE bingo_games ADD COLUMN IF NOT EXISTS winner_info JSONB;

-- Function to Reset the Game Round
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

  -- 2. Reset Winning Claims (Keep them PAID so they can play again)
  UPDATE bingo_players
  SET status = 'PAID'
  WHERE game_id = p_game_id AND status = 'WIN_CLAIMED';
END;
$$;
