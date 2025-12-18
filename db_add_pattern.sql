-- Add winning_pattern column to bingo_games to store the selected game pattern (e.g. 'FULL_HOUSE', 'X', 'L', or custom indices)
ALTER TABLE bingo_games ADD COLUMN winning_pattern JSONB DEFAULT NULL;
