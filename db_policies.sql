-- Enable RLS on Wallets
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own wallet
CREATE POLICY "Users can view own wallet" ON wallets
    FOR SELECT
    USING (auth.uid() = user_id);

-- Check if table exists and grant permissions just in case
GRANT SELECT, INSERT, UPDATE ON wallets TO authenticated;
