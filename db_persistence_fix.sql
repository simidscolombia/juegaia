-- Add winner column to Raffles
ALTER TABLE raffles ADD COLUMN IF NOT EXISTS winner_number INTEGER;
ALTER TABLE raffles ADD COLUMN IF NOT EXISTS winner_ticket_id UUID; -- Optional reference to ticket

-- Allow Owners to UPDATE their raffles (to set the winner)
-- This policy might already exist ("Owner Upgrade Bingo" / "Owner Update Raffles"), 
-- but ensuring we don't block it.
-- We previously created "Owner Update Raffles".

-- For Bingo Player Deletion:
-- We need to ensure the owner can DELETE from bingo_players.
CREATE POLICY "Owner Delete Bingo Players" ON bingo_players FOR DELETE USING (
    (SELECT owner_id FROM bingo_games WHERE id = bingo_players.game_id) = auth.uid() OR
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
);
