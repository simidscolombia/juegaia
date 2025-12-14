-- Add phone column to bingo_players if it doesn't exist
ALTER TABLE bingo_players ADD COLUMN IF NOT EXISTS phone VARCHAR;

-- Add user_id column to link to registered users for the future
ALTER TABLE bingo_players ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Enable RLS (Should correspond to previous fix, just ensuring)
ALTER TABLE bingo_players ENABLE ROW LEVEL SECURITY;

-- Policy to allow anyone to insert (since Guest Storefront needs it)
-- Note: 'anon' role needs insert permission for the Storefront to work without login.
CREATE POLICY "Allow anon insert for tickets" ON bingo_players
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

GRANT ALL ON bingo_players TO anon;
GRANT ALL ON bingo_players TO authenticated;
