
ALTER TABLE bingo_games ADD COLUMN IF NOT EXISTS ticket_price NUMERIC DEFAULT 10000;
ALTER TABLE bingo_games ADD COLUMN IF NOT EXISTS start_time TIMESTAMPTZ DEFAULT NOW();

-- Enable RLS just in case (already enabled, but good to be sure)
ALTER TABLE bingo_games ENABLE ROW LEVEL SECURITY;
