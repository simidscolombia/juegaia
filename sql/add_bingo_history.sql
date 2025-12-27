-- Create History Table
CREATE TABLE IF NOT EXISTS bingo_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    game_id UUID REFERENCES bingo_games(id) NOT NULL,
    winner_info JSONB,
    called_numbers JSONB,
    played_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE bingo_history ENABLE ROW LEVEL SECURITY;

-- Allow read access to everyone (or just admin? Assuming admin for now)
CREATE POLICY "Admin Manage History" ON bingo_history 
FOR ALL USING (auth.uid() = (SELECT owner_id FROM bingo_games WHERE id = game_id));

-- Update Reset Function to Archive before Delete
CREATE OR REPLACE FUNCTION reset_game_round(p_game_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 0. ARCHIVE CURRENT GAME (If there is a winner or played data)
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

  -- 2. Reset Winning Claims
  UPDATE bingo_players
  SET status = 'PAID'
  WHERE game_id = p_game_id AND status = 'WIN_CLAIMED';

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
