
-- Ensure PIN column exists in bingo_players
ALTER TABLE bingo_players ADD COLUMN IF NOT EXISTS pin VARCHAR(10);
-- Ensure Index exists
CREATE INDEX IF NOT EXISTS idx_bingo_players_pin ON bingo_players(pin);

-- Ensure Phone column exists (redundant check but safe)
ALTER TABLE bingo_players ADD COLUMN IF NOT EXISTS phone VARCHAR;
