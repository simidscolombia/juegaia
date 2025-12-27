-- Add missing configuration columns to bingo_games
ALTER TABLE bingo_games ADD COLUMN IF NOT EXISTS hints_enabled BOOLEAN DEFAULT TRUE;
ALTER TABLE bingo_games ADD COLUMN IF NOT EXISTS winning_pattern JSONB DEFAULT '[]'::jsonb;
ALTER TABLE bingo_games ADD COLUMN IF NOT EXISTS ticket_price NUMERIC DEFAULT 10000;

-- Ensure RLS allows update? (Usually owner policy covers all)
-- Check existing policies if needed, but 'Admin All' usually covers it.
