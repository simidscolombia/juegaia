-- Allow all users to read bingo_players rows
-- This is necessary so players can see the "Public Claims Board" (who else claimed bingo)
-- and for the TV mode to potentially list them.

ALTER TABLE bingo_players ENABLE ROW LEVEL SECURITY;

-- Remove valid restrictive policies if they exist (safe drop)
DROP POLICY IF EXISTS "Players view own ticket" ON bingo_players;
DROP POLICY IF EXISTS "Public Read Players" ON bingo_players;

-- Add broad read policy (or scoped to game_id if we have game context, but 'true' is easiest for public games)
CREATE POLICY "Public Read Players" ON bingo_players FOR SELECT USING (true);
